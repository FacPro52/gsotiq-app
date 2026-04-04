/**
 * Recurrence helpers for recurring Tasks.
 *
 * A task carries:
 *   recurrence       : 'none' | 'daily' | 'weekdays' | 'weekly' | 'biweekly'
 *                      | 'monthly' | 'custom_days'
 *   recurrenceDays   : number[]  – day-of-week indices (0=Sun … 6=Sat)
 *                                   used by 'weekly', 'biweekly', and 'custom_days'
 *   recurrenceEndDate: 'YYYY-MM-DD' – stop recurring after this date (optional)
 *   recurrenceCount  : number    – max occurrences; 0 = unlimited (optional)
 *   completionCount  : number    – how many times the task has been completed
 *   dueDate          : 'YYYY-MM-DD'
 *   lastCompletedAt  : ISO string (set when task is completed)
 */

const DAY_NAMES      = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// ─── Formatting ──────────────────────────────────────────────────────────────

/** 'YYYY-MM-DD' → Date (local midnight) */
export function parseDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Date → 'YYYY-MM-DD' */
export function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 'YYYY-MM-DD' → human-readable e.g. "Mon, Jan 6" */
export function prettyDate(str) {
  if (!str) return '';
  const d = parseDate(str);
  if (!d) return str;
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

// ─── Core logic ───────────────────────────────────────────────────────────────

/**
 * Given the current dueDate string, a recurrence type, and optional recurrenceDays,
 * return the next due date string (after today or after the current dueDate,
 * whichever is later).
 *
 * @param {string}   currentDueDateStr   YYYY-MM-DD
 * @param {string}   recurrence          recurrence type key
 * @param {number[]} recurrenceDays      day-of-week indices (used by weekly/biweekly/custom_days)
 */
export function computeNextDueDate(currentDueDateStr, recurrence, recurrenceDays = []) {
  if (!recurrence || recurrence === 'none') return currentDueDateStr;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const anchor = currentDueDateStr ? parseDate(currentDueDateStr) : today;
  const start  = new Date(Math.max(today.getTime(), anchor.getTime()));
  start.setDate(start.getDate() + 1); // always advance at least 1 day

  switch (recurrence) {
    // ── Simple patterns ──────────────────────────────────────────────────────
    case 'daily':
      return formatDate(start);

    case 'weekdays': {
      const d = new Date(start);
      while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
      return formatDate(d);
    }

    // ── Weekly (single day-of-week) ──────────────────────────────────────────
    case 'weekly': {
      // prefer recurrenceDays[0] if set, otherwise fall back to anchor's day
      const targetDow = (recurrenceDays && recurrenceDays.length > 0)
        ? recurrenceDays[0]
        : anchor.getDay();
      const d = new Date(start);
      while (d.getDay() !== targetDow) d.setDate(d.getDate() + 1);
      return formatDate(d);
    }

    // ── Bi-weekly (every 2 weeks, same day-of-week) ──────────────────────────
    case 'biweekly': {
      const targetDow = (recurrenceDays && recurrenceDays.length > 0)
        ? recurrenceDays[0]
        : anchor.getDay();
      // First advance to next occurrence of that day
      const d = new Date(start);
      while (d.getDay() !== targetDow) d.setDate(d.getDate() + 1);
      // Now check if that's ≥ 14 days from anchor; if not, add another 7
      const daysDiff = Math.round((d - anchor) / 86400000);
      if (daysDiff < 14) d.setDate(d.getDate() + 7);
      return formatDate(d);
    }

    // ── Monthly (same day-of-month as anchor) ─────────────────────────────────
    case 'monthly': {
      const targetDay = anchor.getDate();
      const d = new Date(start);
      while (true) {
        const candidate = new Date(d.getFullYear(), d.getMonth(), targetDay);
        if (candidate >= start) return formatDate(candidate);
        d.setMonth(d.getMonth() + 1);
        d.setDate(1);
      }
    }

    // ── Custom days (multi-select days of week) ───────────────────────────────
    case 'custom_days': {
      const days = (recurrenceDays && recurrenceDays.length > 0)
        ? recurrenceDays.slice().sort((a, b) => a - b)
        : [1]; // default Monday
      const d = new Date(start);
      // Scan forward up to 8 days to find the next matching day-of-week
      for (let i = 0; i < 8; i++) {
        if (days.includes(d.getDay())) return formatDate(d);
        d.setDate(d.getDate() + 1);
      }
      return formatDate(start); // fallback (shouldn't happen)
    }

    default:
      return currentDueDateStr;
  }
}

/**
 * Check whether a recurring task's recurrence has expired.
 * Returns true if the task should stop recurring (become permanently completed).
 *
 * @param {{ recurrenceEndDate?: string, recurrenceCount?: number, completionCount?: number }} task
 */
export function isRecurrenceExpired(task) {
  // End-by-date check
  if (task.recurrenceEndDate) {
    const endDate = parseDate(task.recurrenceEndDate);
    const today   = new Date();
    today.setHours(0, 0, 0, 0);
    if (endDate < today) return true;
  }

  // Max-occurrences check
  if (task.recurrenceCount && task.recurrenceCount > 0) {
    const done = task.completionCount || 0;
    if (done >= task.recurrenceCount) return true;
  }

  return false;
}

/**
 * Return a human-readable recurrence description.
 * e.g. "Every weekday", "Every Monday", "Monthly on the 15th",
 *      "Every Mon, Wed & Fri"
 */
export function describeRecurrence(recurrence, dueDateStr, recurrenceDays = []) {
  if (!recurrence || recurrence === 'none') return null;
  const anchor = dueDateStr ? parseDate(dueDateStr) : new Date();

  switch (recurrence) {
    case 'daily':    return 'Every day';
    case 'weekdays': return 'Every weekday (Mon–Fri)';

    case 'weekly': {
      const dow = (recurrenceDays && recurrenceDays.length > 0)
        ? recurrenceDays[0]
        : anchor.getDay();
      return `Every ${DAY_NAMES_FULL[dow]}`;
    }

    case 'biweekly': {
      const dow = (recurrenceDays && recurrenceDays.length > 0)
        ? recurrenceDays[0]
        : anchor.getDay();
      return `Every other ${DAY_NAMES_FULL[dow]}`;
    }

    case 'monthly':
      return `Monthly on the ${ordinal(anchor.getDate())}`;

    case 'custom_days': {
      if (!recurrenceDays || recurrenceDays.length === 0) return 'Custom days';
      const sorted = [...recurrenceDays].sort((a, b) => a - b);
      const names  = sorted.map((d) => DAY_NAMES[d]);
      if (names.length === 1) return `Every ${DAY_NAMES_FULL[sorted[0]]}`;
      const last = names.pop();
      return `Every ${names.join(', ')} & ${last}`;
    }

    default: return null;
  }
}

/** Return true if a task is currently overdue */
export function isOverdue(dueDateStr) {
  if (!dueDateStr) return false;
  const d = parseDate(dueDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

/** Return true if a task is due today */
export function isDueToday(dueDateStr) {
  if (!dueDateStr) return false;
  return dueDateStr === formatDate(new Date());
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function ordinal(n) {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export { DAY_NAMES, DAY_NAMES_FULL };
