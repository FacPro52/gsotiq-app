/**
 * exportImport.js — GSOTiQ data portability helpers
 *
 * Export: bundles the current user's GSOT data as a JSON string and triggers
 *   - iOS/Android: the native Share sheet (user can email, AirDrop, save to Files, etc.)
 *   - Web: a file download in the browser
 *
 * Import: parses a previously-exported JSON string, validates it, then writes
 *   the records into AsyncStorage for the current user.
 *   Mode 'merge'   → adds records that don't already exist (by id)
 *   Mode 'replace' → clears all current user data first, then writes imported data
 */

import { Share, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  GOALS:       '@gsot_goals',
  STRATEGIES:  '@gsot_strategies',
  OBJECTIVES:  '@gsot_objectives',
  TACTICS:     '@gsot_tactics',
  TASKS:       '@gsot_tasks',
};

const EXPORT_VERSION = '1';
const APP_NAME       = 'GSOTiQ';

// ─── Export ──────────────────────────────────────────────────────────────────

/**
 * Build the export payload for a single user.
 * Returns the raw JSON string so the caller can share or download it.
 */
export async function buildExportJSON(user) {
  const [g, s, o, t, tk] = await Promise.all([
    AsyncStorage.getItem(KEYS.GOALS),
    AsyncStorage.getItem(KEYS.STRATEGIES),
    AsyncStorage.getItem(KEYS.OBJECTIVES),
    AsyncStorage.getItem(KEYS.TACTICS),
    AsyncStorage.getItem(KEYS.TASKS),
  ]);

  const goals      = (JSON.parse(g  || '[]')).filter(x => x.userId === user.id);
  const strategies = (JSON.parse(s  || '[]')).filter(x => x.userId === user.id);
  const objectives = (JSON.parse(o  || '[]')).filter(x => x.userId === user.id);
  const tactics    = (JSON.parse(t  || '[]')).filter(x => x.userId === user.id);
  const tasks      = (JSON.parse(tk || '[]')).filter(x => x.userId === user.id);

  const payload = {
    version:    EXPORT_VERSION,
    app:        APP_NAME,
    exportedAt: new Date().toISOString(),
    userId:     user.id,
    userName:   user.name || '',
    data: { goals, strategies, objectives, tactics, tasks },
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Export data:
 *   - Mobile: opens the native Share sheet with the JSON as a shared message.
 *   - Web:    triggers a .json file download in the browser.
 */
export async function exportData(user) {
  const json     = await buildExportJSON(user);
  const filename = `gsotiq-backup-${new Date().toISOString().slice(0, 10)}.json`;

  if (Platform.OS === 'web') {
    // Web: create a blob and click a temporary <a> link
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return { success: true };
  }

  // Mobile: use the built-in Share sheet
  try {
    const result = await Share.share({
      message: json,
      title:   filename,   // used by Android as a subject/title hint
    });
    return { success: result.action !== Share.dismissedAction };
  } catch (err) {
    Alert.alert('Export Failed', String(err?.message || err));
    return { success: false };
  }
}

// ─── Import ──────────────────────────────────────────────────────────────────

/**
 * Validate a parsed export payload.
 * Returns { valid: true, data } or { valid: false, error: string }.
 */
export function validateExport(parsed) {
  if (!parsed || typeof parsed !== 'object')
    return { valid: false, error: 'Not a valid GSOTiQ backup file.' };
  if (parsed.app !== APP_NAME)
    return { valid: false, error: 'This file was not exported from GSOTiQ.' };
  if (!parsed.data || typeof parsed.data !== 'object')
    return { valid: false, error: 'Backup file is missing data section.' };

  const { goals = [], strategies = [], objectives = [], tactics = [], tasks = [] } = parsed.data;
  return {
    valid: true,
    counts: {
      goals:      goals.length,
      strategies: strategies.length,
      objectives: objectives.length,
      tactics:    tactics.length,
      tasks:      tasks.length,
    },
    data: parsed.data,
    exportedAt: parsed.exportedAt,
    userName:   parsed.userName,
  };
}

/**
 * Import data from a JSON string into the current user's account.
 *
 * mode: 'merge'   — adds any records not already present (by id)
 *       'replace' — clears the current user's data first, then writes everything
 *
 * All imported records have their userId remapped to the current user's id,
 * so data transfers cleanly between accounts.
 */
export async function importData(jsonString, currentUser, mode = 'merge') {
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return { success: false, error: 'Invalid JSON — make sure you pasted the full export.' };
  }

  const validation = validateExport(parsed);
  if (!validation.valid) return { success: false, error: validation.error };

  const { goals: iGoals, strategies: iStrats, objectives: iObjs,
          tactics: iTactics, tasks: iTasks } = parsed.data;

  // Remap userId to current user on all records
  const remap = (arr) => arr.map(x => ({ ...x, userId: currentUser.id }));

  const [g, s, o, t, tk] = await Promise.all([
    AsyncStorage.getItem(KEYS.GOALS),
    AsyncStorage.getItem(KEYS.STRATEGIES),
    AsyncStorage.getItem(KEYS.OBJECTIVES),
    AsyncStorage.getItem(KEYS.TACTICS),
    AsyncStorage.getItem(KEYS.TASKS),
  ]);

  let goals      = JSON.parse(g  || '[]');
  let strategies = JSON.parse(s  || '[]');
  let objectives = JSON.parse(o  || '[]');
  let tactics    = JSON.parse(t  || '[]');
  let tasks      = JSON.parse(tk || '[]');

  if (mode === 'replace') {
    // Remove all existing records belonging to the current user
    goals      = goals     .filter(x => x.userId !== currentUser.id);
    strategies = strategies.filter(x => x.userId !== currentUser.id);
    objectives = objectives.filter(x => x.userId !== currentUser.id);
    tactics    = tactics   .filter(x => x.userId !== currentUser.id);
    tasks      = tasks     .filter(x => x.userId !== currentUser.id);

    goals      = [...goals,      ...remap(iGoals)];
    strategies = [...strategies, ...remap(iStrats)];
    objectives = [...objectives, ...remap(iObjs)];
    tactics    = [...tactics,    ...remap(iTactics)];
    tasks      = [...tasks,      ...remap(iTasks)];
  } else {
    // Merge: only add records whose id doesn't already exist
    const existingIds = (arr) => new Set(arr.map(x => x.id));
    const gIds  = existingIds(goals);
    const sIds  = existingIds(strategies);
    const oIds  = existingIds(objectives);
    const tIds  = existingIds(tactics);
    const tkIds = existingIds(tasks);

    goals      = [...goals,      ...remap(iGoals)   .filter(x => !gIds .has(x.id))];
    strategies = [...strategies, ...remap(iStrats)  .filter(x => !sIds .has(x.id))];
    objectives = [...objectives, ...remap(iObjs)    .filter(x => !oIds .has(x.id))];
    tactics    = [...tactics,    ...remap(iTactics)  .filter(x => !tIds .has(x.id))];
    tasks      = [...tasks,      ...remap(iTasks)    .filter(x => !tkIds.has(x.id))];
  }

  await Promise.all([
    AsyncStorage.setItem(KEYS.GOALS,      JSON.stringify(goals)),
    AsyncStorage.setItem(KEYS.STRATEGIES, JSON.stringify(strategies)),
    AsyncStorage.setItem(KEYS.OBJECTIVES, JSON.stringify(objectives)),
    AsyncStorage.setItem(KEYS.TACTICS,    JSON.stringify(tactics)),
    AsyncStorage.setItem(KEYS.TASKS,      JSON.stringify(tasks)),
  ]);

  return { success: true, counts: validation.counts };
}
