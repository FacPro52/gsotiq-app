import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, Modal, ScrollView, KeyboardAvoidingView, Platform,
  TouchableOpacity, Text as RNText,
} from 'react-native';
import { Text, TextInput, Button, HelperText, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  COLORS, STATUS_OPTIONS, CATEGORY_OPTIONS,
  PRIORITY_OPTIONS, RECURRENCE_OPTIONS,
} from '../utils/theme';
import DatePickerField from './DatePickerField';

// Day-of-week labels (0=Sun … 6=Sat), starting Monday for display
const DOW_DISPLAY = [
  { idx: 1, short: 'M' },
  { idx: 2, short: 'T' },
  { idx: 3, short: 'W' },
  { idx: 4, short: 'T' },
  { idx: 5, short: 'F' },
  { idx: 6, short: 'S' },
  { idx: 0, short: 'S' },
];

// Recurrence types that need a day-of-week selector
const NEEDS_DOW  = new Set(['weekly', 'biweekly']);
// Recurrence types that need multi-day picker
const NEEDS_MULTI_DOW = new Set(['custom_days']);

export default function ItemFormModal({
  visible,
  onDismiss,
  onSave,
  item,
  config,
  parentLabel,
  showCategory,
  showMeasures,    // true for Objectives
  showRecurrence,  // true for Tasks
}) {
  const [title,               setTitle]             = useState('');
  const [description,         setDescription]       = useState('');
  const [measures,            setMeasures]          = useState('');
  const [status,              setStatus]            = useState('not_started');
  const [priority,            setPriority]          = useState('medium');
  const [category,            setCategory]          = useState('');
  const [dueDate,             setDueDate]           = useState('');
  const [recurrence,          setRecurrence]        = useState('none');
  // new recurrence fields
  const [recurrenceDays,      setRecurrenceDays]    = useState([]);   // day-of-week indices
  const [recurrenceEndType,   setRecurrenceEndType] = useState('never'); // 'never' | 'count' | 'date'
  const [recurrenceCount,     setRecurrenceCount]   = useState(5);
  const [recurrenceEndDate,   setRecurrenceEndDate] = useState('');
  const [error,               setError]             = useState('');
  const [saving,              setSaving]            = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle(item?.title              || '');
      setDescription(item?.description  || '');
      setMeasures(item?.measures        || '');
      setStatus(item?.status            || 'not_started');
      setPriority(item?.priority        || 'medium');
      setCategory(item?.category        || '');
      setDueDate(item?.dueDate          || '');
      setRecurrence(item?.recurrence    || 'none');
      setRecurrenceDays(item?.recurrenceDays    || []);
      setRecurrenceEndDate(item?.recurrenceEndDate || '');
      // restore end-type from saved data
      if (item?.recurrenceEndDate) {
        setRecurrenceEndType('date');
      } else if (item?.recurrenceCount > 0) {
        setRecurrenceEndType('count');
        setRecurrenceCount(item.recurrenceCount);
      } else {
        setRecurrenceEndType('never');
        setRecurrenceCount(5);
      }
      setError('');
    }
  }, [visible, item]);

  // When switching to a DOW-based recurrence, seed from dueDate if days empty
  const handleRecurrenceChange = (val) => {
    setRecurrence(val);
    if ((NEEDS_DOW.has(val) || NEEDS_MULTI_DOW.has(val)) && recurrenceDays.length === 0) {
      if (dueDate) {
        const [y, m, d] = dueDate.split('-').map(Number);
        const dow = new Date(y, m - 1, d).getDay();
        setRecurrenceDays([dow]);
      } else {
        setRecurrenceDays([1]); // default Monday
      }
    }
    if (val === 'none') {
      setRecurrenceEndType('never');
      setRecurrenceDays([]);
    }
  };

  const toggleDow = (idx, multiSelect) => {
    if (multiSelect) {
      setRecurrenceDays((prev) =>
        prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]
      );
    } else {
      setRecurrenceDays([idx]);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError(`Please enter a ${config.label.toLowerCase()} title.`);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(), description, measures,
        status, priority, category, dueDate, recurrence,
        recurrenceDays,
        recurrenceEndDate:  recurrenceEndType === 'date'  ? recurrenceEndDate : '',
        recurrenceCount:    recurrenceEndType === 'count' ? recurrenceCount   : 0,
      };
      await onSave(payload);
      onDismiss();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const isRecurring = recurrence !== 'none';

  return (
    <Modal
      visible={visible}
      onRequestClose={onDismiss}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          {/* Title bar */}
          <View style={[styles.titleBar, { backgroundColor: config.color }]}>
            <Text style={styles.titleBarText}>
              {item ? `Edit ${config.label}` : `New ${config.label}`}
            </Text>
            {parentLabel && (
              <Text style={styles.titleBarSub}>{parentLabel}</Text>
            )}
          </View>

          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">

            {/* ── Title ── */}
            <TextInput
              label={`${config.label} Title *`}
              value={title}
              onChangeText={setTitle}
              mode="outlined"
              multiline
              numberOfLines={2}
              style={[styles.input, styles.titleInput]}
            />

            {/* ── Description ── */}
            <TextInput
              label="Description"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
            />

            {/* ── Measures (Objectives only) ── */}
            {showMeasures && (
              <>
                <View style={styles.rowLabel}>
                  <MaterialCommunityIcons name="ruler" size={16} color={config.color} />
                  <Text variant="labelLarge" style={[styles.sectionLabel, { color: config.color, marginBottom: 0 }]}>
                    How Will You Measure Success?
                  </Text>
                </View>
                <TextInput
                  label="Measures / KPIs"
                  value={measures}
                  onChangeText={setMeasures}
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  style={styles.input}
                  placeholder="e.g. Weekly cardio minutes ≥150 for 8 consecutive weeks"
                />
              </>
            )}

            {/* ── Status ── */}
            <Text variant="labelLarge" style={styles.sectionLabel}>Status</Text>
            <View style={styles.chipRow}>
              {STATUS_OPTIONS.map((s) => (
                <Chip
                  key={s.value}
                  selected={status === s.value}
                  onPress={() => setStatus(s.value)}
                  style={[styles.chip, status === s.value && { backgroundColor: s.color + '33' }]}
                  textStyle={status === s.value ? { color: s.color, fontWeight: '700' } : {}}
                  compact
                >
                  {s.label}
                </Chip>
              ))}
            </View>

            {/* ── Priority ── */}
            <View style={styles.rowLabel}>
              <MaterialCommunityIcons name="flag-outline" size={16} color={config.color} />
              <Text variant="labelLarge" style={[styles.sectionLabel, { color: config.color, marginBottom: 0 }]}>
                Priority
              </Text>
            </View>
            <View style={styles.chipRow}>
              {PRIORITY_OPTIONS.map((p) => (
                <Chip
                  key={p.value}
                  selected={priority === p.value}
                  onPress={() => setPriority(p.value)}
                  style={[styles.chip, priority === p.value && { backgroundColor: p.color + '28' }]}
                  textStyle={priority === p.value ? { color: p.color, fontWeight: '700' } : {}}
                  icon={() => (
                    <MaterialCommunityIcons
                      name={p.icon}
                      size={14}
                      color={priority === p.value ? p.color : COLORS.textSecondary}
                    />
                  )}
                  compact
                >
                  {p.label}
                </Chip>
              ))}
            </View>

            {/* ── Category (Goals only) ── */}
            {showCategory && (
              <>
                <View style={styles.rowLabel}>
                  <MaterialCommunityIcons name="tag-outline" size={16} color={config.color} />
                  <Text variant="labelLarge" style={[styles.sectionLabel, { color: config.color, marginBottom: 0 }]}>
                    Category
                  </Text>
                </View>
                <View style={styles.chipRow}>
                  {CATEGORY_OPTIONS.map((c) => (
                    <Chip
                      key={c.value}
                      selected={category === c.value}
                      onPress={() => setCategory(category === c.value ? '' : c.value)}
                      style={[
                        styles.chip,
                        category === c.value && { backgroundColor: c.color + '28' },
                      ]}
                      textStyle={category === c.value ? { color: c.color, fontWeight: '700' } : {}}
                      icon={() => (
                        <MaterialCommunityIcons
                          name={c.icon}
                          size={14}
                          color={category === c.value ? c.color : COLORS.textSecondary}
                        />
                      )}
                      compact
                    >
                      {c.label}
                    </Chip>
                  ))}
                </View>
              </>
            )}

            {/* ── Due Date (calendar picker) ── */}
            <DatePickerField
              label="Due Date"
              value={dueDate}
              onChange={setDueDate}
              accentColor={config.color}
            />

            {/* ══════════════════════════════════════════════════════════════
                ── Recurrence (Tasks only) ──────────────────────────────── */}
            {showRecurrence && (
              <>
                {/* ── Repeat type ── */}
                <View style={styles.rowLabel}>
                  <MaterialCommunityIcons name="repeat" size={16} color={config.color} />
                  <Text variant="labelLarge" style={[styles.sectionLabel, { color: config.color, marginBottom: 0 }]}>
                    Repeat
                  </Text>
                </View>
                <View style={styles.chipRow}>
                  {RECURRENCE_OPTIONS.map((r) => (
                    <Chip
                      key={r.value}
                      selected={recurrence === r.value}
                      onPress={() => handleRecurrenceChange(r.value)}
                      style={[
                        styles.chip,
                        recurrence === r.value && { backgroundColor: r.color + '28' },
                      ]}
                      textStyle={recurrence === r.value ? { color: r.color, fontWeight: '700' } : {}}
                      icon={() => (
                        <MaterialCommunityIcons
                          name={r.icon}
                          size={14}
                          color={recurrence === r.value ? r.color : COLORS.textSecondary}
                        />
                      )}
                      compact
                    >
                      {r.label}
                    </Chip>
                  ))}
                </View>

                {/* ── Day-of-week selector (weekly / biweekly = single; custom = multi) ── */}
                {isRecurring && (NEEDS_DOW.has(recurrence) || NEEDS_MULTI_DOW.has(recurrence)) && (
                  <View style={styles.recurrenceBlock}>
                    <Text style={styles.recurrenceBlockLabel}>
                      {NEEDS_MULTI_DOW.has(recurrence) ? 'Repeat on (select multiple)' : 'Repeat on'}
                    </Text>
                    <View style={styles.dowRow}>
                      {DOW_DISPLAY.map(({ idx, short }) => {
                        const isSelected = recurrenceDays.includes(idx);
                        return (
                          <TouchableOpacity
                            key={idx}
                            style={[styles.dowBtn, isSelected && { backgroundColor: config.color }]}
                            onPress={() => toggleDow(idx, NEEDS_MULTI_DOW.has(recurrence))}
                            activeOpacity={0.75}
                          >
                            <RNText style={[styles.dowBtnText, isSelected && { color: '#fff' }]}>
                              {short}
                            </RNText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* ── End conditions ── */}
                {isRecurring && (
                  <View style={styles.recurrenceBlock}>
                    <Text style={styles.recurrenceBlockLabel}>Ends</Text>

                    {/* End-type selector row */}
                    <View style={styles.endTypeRow}>
                      {[
                        { value: 'never', label: 'Never' },
                        { value: 'count', label: 'After # times' },
                        { value: 'date',  label: 'On date' },
                      ].map((opt) => (
                        <TouchableOpacity
                          key={opt.value}
                          style={[
                            styles.endTypeBtn,
                            recurrenceEndType === opt.value && { backgroundColor: config.color, borderColor: config.color },
                          ]}
                          onPress={() => setRecurrenceEndType(opt.value)}
                          activeOpacity={0.75}
                        >
                          <RNText style={[
                            styles.endTypeBtnText,
                            recurrenceEndType === opt.value && { color: '#fff', fontWeight: '700' },
                          ]}>
                            {opt.label}
                          </RNText>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Count stepper */}
                    {recurrenceEndType === 'count' && (
                      <View style={styles.countRow}>
                        <TouchableOpacity
                          style={styles.stepBtn}
                          onPress={() => setRecurrenceCount((n) => Math.max(1, n - 1))}
                          activeOpacity={0.75}
                        >
                          <MaterialCommunityIcons name="minus" size={18} color={config.color} />
                        </TouchableOpacity>
                        <View style={styles.countDisplay}>
                          <RNText style={[styles.countNumber, { color: config.color }]}>{recurrenceCount}</RNText>
                          <RNText style={styles.countSub}>occurrence{recurrenceCount !== 1 ? 's' : ''}</RNText>
                        </View>
                        <TouchableOpacity
                          style={styles.stepBtn}
                          onPress={() => setRecurrenceCount((n) => n + 1)}
                          activeOpacity={0.75}
                        >
                          <MaterialCommunityIcons name="plus" size={18} color={config.color} />
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* End-by date picker */}
                    {recurrenceEndType === 'date' && (
                      <DatePickerField
                        label="End Date"
                        value={recurrenceEndDate}
                        onChange={setRecurrenceEndDate}
                        accentColor={config.color}
                      />
                    )}
                  </View>
                )}

                {/* ── Informational hint ── */}
                {isRecurring && (
                  <View style={styles.recurrenceHint}>
                    <MaterialCommunityIcons name="information-outline" size={14} color={COLORS.secondary} />
                    <Text style={styles.recurrenceHintText}>
                      When completed, this task automatically resets and schedules its next occurrence.
                    </Text>
                  </View>
                )}
              </>
            )}

            {!!error && <HelperText type="error" visible>{error}</HelperText>}

            <View style={styles.buttonRow}>
              <Button
                mode="outlined"
                onPress={onDismiss}
                style={styles.cancelBtn}
                contentStyle={styles.btnContent}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                loading={saving}
                disabled={saving}
                style={[styles.saveBtn, { backgroundColor: config.color }]}
                contentStyle={styles.btnContent}
              >
                {item ? 'Save Changes' : `Add ${config.label}`}
              </Button>
            </View>

          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  titleBar: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 20,
  },
  titleBarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  titleBarSub:  { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 },
  form:  { padding: 16, paddingBottom: 40 },
  input: { marginBottom: 14, backgroundColor: COLORS.surface },
  titleInput: { minHeight: 72 },

  rowLabel: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, marginBottom: 8, marginTop: 4,
  },
  sectionLabel: { color: COLORS.text, marginBottom: 8, marginTop: 4 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip:    { marginRight: 0 },

  // ── Recurrence sub-sections ──────────────────────────────────────────────
  recurrenceBlock: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recurrenceBlockLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },

  // Day-of-week buttons
  dowRow: { flexDirection: 'row', gap: 6 },
  dowBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.background,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  dowBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },

  // End-type buttons
  endTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  endTypeBtn: {
    flex: 1, paddingVertical: 7, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', backgroundColor: COLORS.background,
  },
  endTypeBtnText: { fontSize: 12, color: COLORS.textSecondary },

  // Count stepper
  countRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 20, marginTop: 4,
  },
  stepBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  countDisplay: { alignItems: 'center', minWidth: 60 },
  countNumber:  { fontSize: 28, fontWeight: '800', lineHeight: 32 },
  countSub:     { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

  // Hint
  recurrenceHint: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: COLORS.secondary + '12',
    borderRadius: 8, padding: 10, marginBottom: 16,
  },
  recurrenceHintText: {
    flex: 1, fontSize: 12, color: COLORS.secondary, lineHeight: 17,
  },

  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1 },
  saveBtn:   { flex: 2 },
  btnContent: { paddingVertical: 6 },
});
