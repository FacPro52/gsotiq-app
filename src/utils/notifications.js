/**
 * GSOTiQ Notification System
 * ───────────────────────────
 * Local scheduled notifications for due-date reminders.
 * Requires: npx expo install expo-notifications
 *
 * Notification schedule per item (with a due date, not yet completed):
 *   • 9 AM — 3 days before due date
 *   • 9 AM — 1 day before  (tomorrow reminder)
 *   • 9 AM — day of due date
 *   • 9 AM — 1 day after   (overdue nudge)
 *
 * Each notification identifier = `${itemId}_${suffix}` so it can be
 * cancelled individually or all at once via cancelItemNotifications().
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ── Foreground handler ────────────────────────────────────────────────────────
// Show alerts even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ── Type display config ───────────────────────────────────────────────────────
const TYPE_CONFIG = {
  goal:      { label: 'Goal',      emoji: '🏁' },
  strategy:  { label: 'Strategy',  emoji: '♟️'  },
  objective: { label: 'Objective', emoji: '🎯' },
  tactic:    { label: 'Tactic',    emoji: '⚡' },
  task:      { label: 'Task',      emoji: '✅' },
};

const SUFFIXES = ['3d', '1d', 'today', 'overdue'];

// ── Permissions ───────────────────────────────────────────────────────────────

/**
 * Ask the user for notification permission (iOS prompt, Android auto-granted).
 * Safe to call multiple times — only shows the system prompt once.
 * Returns true if permission is granted.
 */
export async function requestNotificationPermissions() {
  if (Platform.OS === 'web') return false;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

// ── Single-item scheduling ────────────────────────────────────────────────────

/**
 * Schedule up to 4 reminders for an item with a due date.
 * Skips any trigger date that's already in the past.
 * Cancels any previously scheduled notifications for this item first.
 *
 * @param {object} item      – the GSOT item (must have .id, .title, .dueDate, .status)
 * @param {string} itemType  – 'goal' | 'strategy' | 'objective' | 'tactic' | 'task'
 */
export async function scheduleItemNotifications(item, itemType) {
  if (Platform.OS === 'web') return;
  if (!item?.dueDate || item.status === 'completed') {
    await cancelItemNotifications(item?.id);
    return;
  }

  // Always cancel first to avoid duplicate scheduling on edits
  await cancelItemNotifications(item.id);

  const tc        = TYPE_CONFIG[itemType] || TYPE_CONFIG.task;
  const now       = new Date();
  const shortName = item.title.length > 45
    ? item.title.slice(0, 42) + '…'
    : item.title;

  // Parse due date — treat as local midnight, set to 9 AM for trigger
  const [y, m, d] = (item.dueDate.split('T')[0]).split('-').map(Number);
  const due9am = new Date(y, m - 1, d, 9, 0, 0, 0);

  const attempts = [
    {
      suffix: '3d',
      date: offsetDays(due9am, -3),
      title: `${tc.emoji} Due in 3 days`,
      body:  `"${shortName}" is due in 3 days.`,
    },
    {
      suffix: '1d',
      date: offsetDays(due9am, -1),
      title: `${tc.emoji} Due tomorrow!`,
      body:  `"${shortName}" is due tomorrow.`,
    },
    {
      suffix: 'today',
      date: due9am,
      title: `${tc.emoji} Due today!`,
      body:  `"${shortName}" is due today — don't let it slip!`,
    },
    {
      suffix: 'overdue',
      date: offsetDays(due9am, 1),
      title: `⚠️ Overdue ${tc.label}`,
      body:  `"${shortName}" was due yesterday. Time to act!`,
    },
  ];

  await Promise.all(
    attempts.map(async ({ suffix, date, title, body }) => {
      if (date <= now) return; // skip past triggers
      try {
        await Notifications.scheduleNotificationAsync({
          identifier: `${item.id}_${suffix}`,
          content: {
            title,
            body,
            sound: true,
            data: {
              itemId:    item.id,
              itemType,
              itemTitle: item.title,
            },
          },
          trigger: { date },
        });
      } catch {
        // Best-effort — never crash over a notification
      }
    }),
  );
}

// ── Cancellation ──────────────────────────────────────────────────────────────

/**
 * Cancel all scheduled reminders for a specific item.
 * Call when an item is deleted or marked complete.
 */
export async function cancelItemNotifications(itemId) {
  if (Platform.OS === 'web' || !itemId) return;
  await Promise.all(
    SUFFIXES.map((s) =>
      Notifications.cancelScheduledNotificationAsync(`${itemId}_${s}`).catch(() => {}),
    ),
  );
}

// ── Bulk reschedule ───────────────────────────────────────────────────────────

/**
 * Wipe all scheduled notifications and rebuild from current data.
 * Called after every loadAll() so the schedule always matches reality.
 */
export async function rescheduleAllNotifications(goals, strategies, objectives, tactics, tasks) {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    const run = (items, type) =>
      Promise.all((items || []).map((item) => scheduleItemNotifications(item, type)));

    await Promise.all([
      run(goals,      'goal'),
      run(strategies, 'strategy'),
      run(objectives, 'objective'),
      run(tactics,    'tactic'),
      run(tasks,      'task'),
    ]);
  } catch {
    // Never let notification errors break the app
  }
}

// ── Notification tap handler ──────────────────────────────────────────────────

/**
 * Extract navigation target from a notification response.
 * Pass the result to navigateFromRoot() in AppNavigator.
 *
 * Returns { name, params } or null if the notification has no nav data.
 */
export function getNotificationNavTarget(response) {
  const data = response?.notification?.request?.content?.data;
  if (!data?.itemType || !data?.itemId) return null;

  switch (data.itemType) {
    case 'goal':
      return {
        name:   'GoalsTabs',
        params: { screen: 'GoalDetail', params: { goalId: data.itemId } },
      };
    case 'strategy':
      return {
        name:   'GoalsTabs',
        params: { screen: 'StrategyDetail', params: { strategyId: data.itemId, goalTitle: '' } },
      };
    case 'objective':
      return {
        name:   'GoalsTabs',
        params: { screen: 'ObjectiveDetail', params: { objectiveId: data.itemId, strategyTitle: '' } },
      };
    case 'tactic':
      return {
        name:   'GoalsTabs',
        params: { screen: 'TacticDetail', params: { tacticId: data.itemId, objectiveTitle: '' } },
      };
    case 'task':
      // Tasks live inside TacticDetail — navigate there using the tacticId stored in data
      if (data.tacticId) {
        return {
          name:   'GoalsTabs',
          params: { screen: 'TacticDetail', params: { tacticId: data.tacticId, objectiveTitle: '' } },
        };
      }
      return null;
    default:
      return null;
  }
}

// ── Utility ───────────────────────────────────────────────────────────────────

function offsetDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
