/**
 * DatePickerField
 *
 * A self-contained date picker built entirely in React Native (no native
 * calendar libraries required).  Shows a tappable field; tapping opens a
 * modal with a month-grid calendar.
 *
 * Props:
 *   label      string   — field label
 *   value      string   — 'YYYY-MM-DD' or ''
 *   onChange   fn(str)  — called with 'YYYY-MM-DD' or '' (when cleared)
 *   accentColor string  — highlight color for selected day (defaults to COLORS.primary)
 *   style      object   — optional extra style on the outer container
 */

import React, { useState, useMemo } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, Pressable,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../utils/theme';
import { parseDate, formatDate } from '../utils/recurrence';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_HEADERS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

export default function DatePickerField({
  label = 'Due Date',
  value = '',
  onChange,
  accentColor,
  style,
}) {
  const accent = accentColor || COLORS.primary;

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [open, setOpen] = useState(false);

  // Viewing month/year (default = selected month or today)
  const today = new Date();
  const initDate = value ? parseDate(value) : null;
  const [viewYear,  setViewYear]  = useState((initDate || today).getFullYear());
  const [viewMonth, setViewMonth] = useState((initDate || today).getMonth());   // 0-11

  // ── Calendar grid ────────────────────────────────────────────────────────────
  const cells = useMemo(() => {
    // First day of the viewed month
    const first = new Date(viewYear, viewMonth, 1);
    const startDow = first.getDay(); // 0=Sun
    // Days in month
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const result = [];
    // Leading empty cells
    for (let i = 0; i < startDow; i++) result.push(null);
    // Day cells
    for (let d = 1; d <= daysInMonth; d++) result.push(d);
    return result;
  }, [viewYear, viewMonth]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const selectedDate = value ? parseDate(value) : null;

  const isSelected = (day) => {
    if (!selectedDate || !day) return false;
    return (
      selectedDate.getFullYear() === viewYear &&
      selectedDate.getMonth()    === viewMonth &&
      selectedDate.getDate()     === day
    );
  };

  const isToday = (day) => {
    if (!day) return false;
    return (
      today.getFullYear() === viewYear &&
      today.getMonth()    === viewMonth &&
      today.getDate()     === day
    );
  };

  const selectDay = (day) => {
    if (!day) return;
    const chosen = new Date(viewYear, viewMonth, day);
    onChange(formatDate(chosen));
    setOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const openPicker = () => {
    // Reset view to selected or today
    const base = value ? parseDate(value) : today;
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setOpen(true);
  };

  // ── Display value ─────────────────────────────────────────────────────────
  const displayValue = value
    ? parseDate(value).toLocaleDateString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
      })
    : '';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={style}>
      {/* Field trigger */}
      <TouchableOpacity
        style={styles.field}
        onPress={openPicker}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name="calendar-outline"
          size={18}
          color={value ? accent : COLORS.textSecondary}
          style={styles.fieldIcon}
        />
        <View style={styles.fieldText}>
          <Text style={styles.fieldLabel}>{label}</Text>
          <Text style={[styles.fieldValue, !value && styles.fieldPlaceholder]}>
            {displayValue || 'Tap to select a date'}
          </Text>
        </View>
        {value ? (
          <TouchableOpacity
            onPress={() => onChange('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons name="close-circle" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ) : (
          <MaterialCommunityIcons name="chevron-down" size={18} color={COLORS.textSecondary} />
        )}
      </TouchableOpacity>

      {/* Calendar modal */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.calCard} onPress={e => e.stopPropagation()}>

            {/* Month navigation */}
            <View style={styles.navRow}>
              <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
                <MaterialCommunityIcons name="chevron-left" size={22} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.monthLabel}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </Text>
              <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
                <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Day-of-week headers */}
            <View style={styles.dowRow}>
              {DAY_HEADERS.map(h => (
                <Text key={h} style={styles.dowCell}>{h}</Text>
              ))}
            </View>

            {/* Day grid */}
            <View style={styles.grid}>
              {cells.map((day, idx) => {
                const sel = isSelected(day);
                const tod = isToday(day);
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.dayCell,
                      sel  && [styles.dayCellSelected, { backgroundColor: accent }],
                      !sel && tod && styles.dayCellToday,
                      !day && styles.dayCellEmpty,
                    ]}
                    onPress={() => selectDay(day)}
                    disabled={!day}
                    activeOpacity={0.75}
                  >
                    <Text style={[
                      styles.dayText,
                      sel && styles.dayTextSelected,
                      !sel && tod && { color: accent, fontWeight: '700' },
                    ]}>
                      {day || ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => { onChange(''); setOpen(false); }}
              >
                <Text style={styles.clearBtnText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.todayBtn, { borderColor: accent }]}
                onPress={() => { onChange(formatDate(today)); setOpen(false); }}
              >
                <Text style={[styles.todayBtnText, { color: accent }]}>Today</Text>
              </TouchableOpacity>
            </View>

          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Field
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 14,
    gap: 10,
  },
  fieldIcon: { flexShrink: 0 },
  fieldText: { flex: 1 },
  fieldLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldValue: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  fieldPlaceholder: { color: COLORS.textSecondary, fontStyle: 'italic' },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  calCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },

  // Navigation
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navBtn: { padding: 4 },
  monthLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },

  // Day-of-week headers
  dowRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dowCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
  },
  dayCellEmpty: { opacity: 0 },
  dayCellSelected: {},
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  dayText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '800',
  },

  // Bottom actions
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  clearBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  clearBtnText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  todayBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  todayBtnText: {
    fontWeight: '700',
    fontSize: 14,
  },
});
