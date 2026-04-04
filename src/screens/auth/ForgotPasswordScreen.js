import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getUsers } from '../../utils/storage';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../utils/theme';
import AppLogo from '../../components/AppLogo';

// Three-step flow:
//   Step 1 — enter email  →  account found
//   Step 2 — answer security question  →  answer verified
//   Step 3 — set new password  →  saved

export default function ForgotPasswordScreen({ navigation }) {
  const { changePassword } = useAuth();
  const [step,            setStep]            = useState(1);
  const [email,           setEmail]           = useState('');
  const [securityAnswer,  setSecurityAnswer]  = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew,         setShowNew]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');
  const [success,         setSuccess]         = useState(false);
  const [foundUser,       setFoundUser]       = useState(null);

  // ── Step 1: verify email exists ─────────────────────────────────────────────
  const handleLookup = async () => {
    setError('');
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setLoading(true);
    try {
      const users = await getUsers();
      const found = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!found) {
        setError('No account found with that email address.');
      } else {
        setFoundUser(found);
        setStep(2);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify security answer ─────────────────────────────────────────
  const handleVerifyAnswer = () => {
    setError('');
    if (!securityAnswer.trim()) { setError('Please enter your answer.'); return; }

    // Legacy accounts with no security question: require full name instead
    if (!foundUser.securityQuestion) {
      if (securityAnswer.trim().toLowerCase() !== (foundUser.name || '').toLowerCase()) {
        setError('Incorrect answer. Please try again.');
        return;
      }
      setStep(3);
      return;
    }

    const stored = (foundUser.securityAnswer || '').trim().toLowerCase();
    const given  = securityAnswer.trim().toLowerCase();
    if (given !== stored) {
      setError('Incorrect answer. Please try again.');
      return;
    }
    setStep(3);
  };

  // ── Step 3: save new password ───────────────────────────────────────────────
  const handleReset = async () => {
    setError('');
    if (!newPassword) { setError('Please enter a new password.'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await changePassword(foundUser.id, newPassword);
      setSuccess(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success ─────────────────────────────────────────────────────────────────
  if (success) {
    return (
      <View style={styles.flex}>
        <View style={styles.successContainer}>
          <MaterialCommunityIcons name="check-circle-outline" size={72} color="#4CAF50" />
          <Text variant="headlineSmall" style={styles.successTitle}>Password Reset!</Text>
          <Text variant="bodyMedium" style={styles.successSub}>
            Your password has been updated. You can now sign in with your new password.
          </Text>
          <Button mode="contained" onPress={() => navigation.navigate('Login')}
            style={styles.button} contentStyle={styles.buttonContent}>
            Back to Sign In
          </Button>
        </View>
      </View>
    );
  }

  // Step indicator dots
  const StepDots = () => (
    <View style={styles.stepRow}>
      {[1, 2, 3].map((s, i) => (
        <React.Fragment key={s}>
          {i > 0 && <View style={[styles.stepLine, step > i && styles.stepLineActive]} />}
          <View style={[styles.stepDot, step >= s && styles.stepDotActive]}>
            {step > s ? (
              <MaterialCommunityIcons name="check" size={10} color="#fff" />
            ) : (
              <Text style={styles.stepNum}>{s}</Text>
            )}
          </View>
        </React.Fragment>
      ))}
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Dark hero banner with logo */}
        <View style={styles.hero}>
          <AppLogo size="lg" />
        </View>

        <View style={styles.formWrapper}>
        <View style={styles.form}>
          <StepDots />

          {/* ── Step 1: Email ── */}
          {step === 1 && (
            <>
              <Text variant="titleLarge" style={styles.formTitle}>Forgot Password</Text>
              <Text style={styles.formSub}>Enter the email address you registered with.</Text>
              <TextInput label="Email Address" value={email}
                onChangeText={(t) => { setEmail(t); setError(''); }}
                mode="outlined" keyboardType="email-address" autoCapitalize="none"
                autoComplete="email" multiline={false} numberOfLines={1}
                style={[styles.input, styles.singleLineInput]}
                left={<TextInput.Icon icon="email-outline" />} />
              {!!error && <HelperText type="error" visible>{error}</HelperText>}
              <Button mode="contained" onPress={handleLookup} loading={loading} disabled={loading}
                style={styles.button} contentStyle={styles.buttonContent}>
                Find My Account
              </Button>
            </>
          )}

          {/* ── Step 2: Security question ── */}
          {step === 2 && (
            <>
              <Text variant="titleLarge" style={styles.formTitle}>Verify Identity</Text>
              {foundUser?.securityQuestion ? (
                <>
                  <Text style={styles.formSub}>Answer your security question to continue.</Text>
                  <View style={styles.questionBox}>
                    <MaterialCommunityIcons name="shield-account-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.questionText}>{foundUser.securityQuestion}</Text>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.formSub}>
                    Your account predates security questions. Enter the full name on your account to continue.
                  </Text>
                  <View style={styles.questionBox}>
                    <MaterialCommunityIcons name="account-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.questionText}>What is the full name on your account?</Text>
                  </View>
                </>
              )}
              <TextInput label="Your Answer" value={securityAnswer}
                onChangeText={(t) => { setSecurityAnswer(t); setError(''); }}
                mode="outlined" autoCapitalize="none" style={styles.input}
                left={<TextInput.Icon icon="shield-key-outline" />} />
              {!!error && <HelperText type="error" visible>{error}</HelperText>}
              <Button mode="contained" onPress={handleVerifyAnswer}
                style={styles.button} contentStyle={styles.buttonContent}>
                Verify Answer
              </Button>
              <Button mode="text" onPress={() => { setStep(1); setError(''); setSecurityAnswer(''); }}
                style={styles.linkButton}>
                Use a different email
              </Button>
            </>
          )}

          {/* ── Step 3: New password ── */}
          {step === 3 && (
            <>
              <Text variant="titleLarge" style={styles.formTitle}>Set New Password</Text>
              <Text style={styles.formSub}>
                Choose a strong new password for{' '}
                <Text style={{ fontWeight: '700', color: COLORS.primary }}>{email}</Text>
              </Text>
              <TextInput label="New Password" value={newPassword}
                onChangeText={(t) => { setNewPassword(t); setError(''); }}
                mode="outlined" secureTextEntry={!showNew} style={styles.input}
                left={<TextInput.Icon icon="lock-outline" />}
                right={<TextInput.Icon icon={showNew ? 'eye-off' : 'eye'} onPress={() => setShowNew((v) => !v)} />} />
              <TextInput label="Confirm New Password" value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); setError(''); }}
                mode="outlined" secureTextEntry={!showConfirm} style={styles.input}
                left={<TextInput.Icon icon="lock-check-outline" />}
                right={<TextInput.Icon icon={showConfirm ? 'eye-off' : 'eye'} onPress={() => setShowConfirm((v) => !v)} />} />
              {!!error && <HelperText type="error" visible>{error}</HelperText>}
              <Button mode="contained" onPress={handleReset} loading={loading} disabled={loading}
                style={styles.button} contentStyle={styles.buttonContent}>
                Reset Password
              </Button>
            </>
          )}

          <Button mode="text" onPress={() => navigation.navigate('Login')} style={styles.linkButton}>
            Back to Sign In
          </Button>
        </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#000' },
  container: { flexGrow: 1 },
  hero: {
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 44,
    paddingBottom: 20,
  },
  formWrapper: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 28,
    paddingHorizontal: 24,
    paddingBottom: 32,
    flex: 1,
    minHeight: 440,
  },
  form: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 24,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  stepDot: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: COLORS.primary },
  stepNum: { fontSize: 11, fontWeight: '700', color: '#fff' },
  stepLine: { flex: 1, height: 2, backgroundColor: COLORS.border, marginHorizontal: 4 },
  stepLineActive: { backgroundColor: COLORS.primary },
  formTitle: { marginBottom: 6, color: COLORS.text, fontWeight: '700' },
  formSub: { color: COLORS.textSecondary, marginBottom: 16, lineHeight: 20, fontSize: 14 },
  questionBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: COLORS.primary + '10', borderRadius: 10,
    padding: 14, marginBottom: 14,
  },
  questionText: { flex: 1, color: COLORS.primary, fontWeight: '600', fontSize: 14, lineHeight: 20 },
  input: { marginBottom: 12, backgroundColor: COLORS.surface },
  singleLineInput: { height: 56 },
  button: { marginTop: 8, backgroundColor: COLORS.primary },
  buttonContent: { paddingVertical: 6 },
  linkButton: { marginTop: 6 },
  successContainer: { flex: 1, padding: 32, justifyContent: 'center', alignItems: 'center' },
  successTitle: { fontWeight: '700', color: COLORS.text, marginTop: 16, marginBottom: 12, textAlign: 'center' },
  successSub: { color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
});
