import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Crypto from 'expo-crypto';
import { getUsers, saveUser, getCurrentUser, setCurrentUser } from '../utils/storage';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// ── Password hashing ──────────────────────────────────────────────────────────
// SHA-256 via expo-crypto (bundled with Expo SDK — no extra install needed).
// Passwords are stored as 64-char hex digests; never in plain text.

async function hashPassword(plain) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    plain,
  );
}

// Detect whether a stored password is already a SHA-256 hex digest.
// A raw digest is always exactly 64 lowercase hex characters.
const isHashed = (pw) => /^[0-9a-f]{64}$/.test(pw ?? '');

// ── Provider ──────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const saved = await getCurrentUser();
      if (saved) setUser(saved);
      setLoading(false);
    })();
  }, []);

  // ── login ─────────────────────────────────────────────────────────────────
  // Supports a seamless migration: if an existing account still has a plain-
  // text password (created before this change), the login succeeds and the
  // stored password is silently upgraded to a hash in the same call.
  const login = async (email, password) => {
    const users = await getUsers();
    const found = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );
    if (!found) throw new Error('Invalid email or password.');

    let authenticated = false;

    if (isHashed(found.password)) {
      // Normal path — compare hash to hash
      const hashed = await hashPassword(password);
      authenticated = hashed === found.password;
    } else {
      // Legacy plain-text path — compare directly, then upgrade on success
      authenticated = found.password === password;
      if (authenticated) {
        const upgraded = { ...found, password: await hashPassword(password) };
        await saveUser(upgraded);
        Object.assign(found, upgraded); // mutate local ref so setUser gets the upgraded copy
      }
    }

    if (!authenticated) throw new Error('Invalid email or password.');
    await setCurrentUser(found);
    setUser(found);
    return found;
  };

  // ── register ──────────────────────────────────────────────────────────────
  const register = async (
    name,
    email,
    password,
    securityQuestion = null,
    securityAnswer   = null,
  ) => {
    const users  = await getUsers();
    const exists = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );
    if (exists) throw new Error('An account with this email already exists.');

    const newUser = {
      id:               `user_${Date.now()}`,
      name,
      email:            email.toLowerCase(),
      password:         await hashPassword(password),   // ← hashed
      securityQuestion,
      securityAnswer:   securityAnswer
        ? securityAnswer.trim().toLowerCase()
        : null,
      createdAt: new Date().toISOString(),
    };
    await saveUser(newUser);
    await setCurrentUser(newUser);
    setUser(newUser);
    return newUser;
  };

  // ── logout ────────────────────────────────────────────────────────────────
  const logout = async () => {
    await setCurrentUser(null);
    setUser(null);
  };

  // ── updateProfile ─────────────────────────────────────────────────────────
  // General-purpose profile updates (name, security question, etc.).
  // Does NOT accept a raw `password` field — use changePassword() instead.
  const updateProfile = async (updates) => {
    const { password: _ignored, ...safeUpdates } = updates;
    const updated = { ...user, ...safeUpdates };
    await saveUser(updated);
    await setCurrentUser(updated);
    setUser(updated);
  };

  // ── changePassword ────────────────────────────────────────────────────────
  // Used by ForgotPasswordScreen and any future change-password flow.
  // Hashes the new password before saving.
  const changePassword = async (userId, newPlainPassword) => {
    const users   = await getUsers();
    const target  = users.find((u) => u.id === userId);
    if (!target) throw new Error('User not found.');
    const updated = { ...target, password: await hashPassword(newPlainPassword) };
    await saveUser(updated);
    // If this is the currently logged-in user, refresh their session too
    if (user?.id === userId) {
      await setCurrentUser(updated);
      setUser(updated);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, updateProfile, changePassword }}
    >
      {children}
    </AuthContext.Provider>
  );
};
