import React, { useState, useMemo } from 'react';
import {
  View, StyleSheet, Alert, ScrollView, TouchableOpacity,
  Modal, TextInput as RNTextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Text, FAB, ProgressBar, Chip, Button, Divider, Menu } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGSOT } from '../../context/GSOTContext';
import { GSOT_CONFIG, COLORS, STATUS_OPTIONS, PRIORITY_OPTIONS } from '../../utils/theme';
import GSOTCard from '../../components/GSOTCard';
import EmptyState from '../../components/EmptyState';
import ItemFormModal from '../../components/ItemFormModal';
import BreadcrumbBar from '../../components/BreadcrumbBar';

const objConfig   = GSOT_CONFIG.objective;
const tacticConfig = GSOT_CONFIG.tactic;

// ─── Unit options ─────────────────────────────────────────────────────────────
const UNIT_OPTIONS = [
  { value: '%',    label: 'Percent (%)' },
  { value: '#',    label: 'Count (#)'   },
  { value: '$',    label: 'Dollar ($)'  },
  { value: 'hrs',  label: 'Hours'       },
  { value: 'pts',  label: 'Points'      },
  { value: 'x',    label: 'Times (x)'   },
  { value: 'custom', label: 'Custom…'  },
];

// ─── Metric helpers ───────────────────────────────────────────────────────────
function metricProgress(m) {
  if (!m.target || m.target === 0) return 0;
  return Math.min(1, (m.current || 0) / m.target);
}

function metricLabel(m) {
  const unit = m.unit === 'custom' ? (m.customUnit || '') : m.unit;
  const cur  = m.current || 0;
  const tgt  = m.target  || 0;
  if (m.unit === '$') return `$${cur} / $${tgt}`;
  if (m.unit === '%') return `${cur}% / ${tgt}%`;
  return `${cur} / ${tgt}${unit ? ' ' + unit : ''}`;
}

// ─── Metric Modal ─────────────────────────────────────────────────────────────
function MetricModal({ visible, metric, tasks, onSave, onDismiss }) {
  const [name,       setName]       = useState('');
  const [target,     setTarget]     = useState('');
  const [unit,       setUnit]       = useState('%');
  const [customUnit, setCustomUnit] = useState('');
  const [current,    setCurrent]    = useState('0');
  const [linkedIds,  setLinkedIds]  = useState([]);
  const [unitMenuOpen, setUnitMenuOpen] = useState(false);

  // Seed from metric when opening
  React.useEffect(() => {
    if (visible) {
      setName(metric?.name      || '');
      setTarget(String(metric?.target  ?? ''));
      setUnit(metric?.unit       || '%');
      setCustomUnit(metric?.customUnit || '');
      setCurrent(String(metric?.current ?? 0));
      setLinkedIds(metric?.linkedTaskIds || []);
    }
  }, [visible, metric]);

  const toggleTask = (taskId) => {
    setLinkedIds((ids) =>
      ids.includes(taskId) ? ids.filter((id) => id !== taskId) : [...ids, taskId]
    );
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a name for this metric.');
      return;
    }
    const t = parseFloat(target);
    const c = parseFloat(current);
    if (isNaN(t) || t <= 0) {
      Alert.alert('Invalid target', 'Please enter a positive number for the target.');
      return;
    }
    onSave({
      id:           metric?.id || `metric_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name:         name.trim(),
      target:       t,
      unit,
      customUnit:   unit === 'custom' ? customUnit.trim() : '',
      current:      isNaN(c) ? 0 : Math.min(c, t),
      linkedTaskIds: linkedIds,
    });
  };

  const unitDisplay = unit === 'custom'
    ? (customUnit || 'Custom')
    : UNIT_OPTIONS.find((u) => u.value === unit)?.label || unit;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={mStyles.overlay}
      >
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onDismiss} />
        <View style={mStyles.sheet}>
          <View style={mStyles.handle} />
          <Text style={mStyles.title}>{metric ? 'Edit Metric' : 'Add Metric'}</Text>

          {/* Name */}
          <Text style={mStyles.label}>Metric Name *</Text>
          <RNTextInput
            style={mStyles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Revenue, Leads, Completion Rate"
            placeholderTextColor={COLORS.textSecondary}
          />

          {/* Target + Unit */}
          <View style={mStyles.row}>
            <View style={{ flex: 1 }}>
              <Text style={mStyles.label}>Target *</Text>
              <RNTextInput
                style={mStyles.input}
                value={target}
                onChangeText={setTarget}
                keyboardType="decimal-pad"
                placeholder="100"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={mStyles.label}>Unit</Text>
              <Menu
                visible={unitMenuOpen}
                onDismiss={() => setUnitMenuOpen(false)}
                anchor={
                  <TouchableOpacity
                    style={[mStyles.input, mStyles.unitBtn]}
                    onPress={() => setUnitMenuOpen(true)}
                  >
                    <Text style={{ color: COLORS.text, flex: 1 }}>{unitDisplay}</Text>
                    <MaterialCommunityIcons name="chevron-down" size={16} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                }
              >
                {UNIT_OPTIONS.map((u) => (
                  <Menu.Item
                    key={u.value}
                    title={u.label}
                    onPress={() => { setUnit(u.value); setUnitMenuOpen(false); }}
                    leadingIcon={unit === u.value ? 'check' : 'circle-outline'}
                    titleStyle={unit === u.value ? { color: objConfig.color, fontWeight: '700' } : undefined}
                  />
                ))}
              </Menu>
            </View>
          </View>

          {/* Custom unit field */}
          {unit === 'custom' && (
            <>
              <Text style={mStyles.label}>Custom Unit Label</Text>
              <RNTextInput
                style={mStyles.input}
                value={customUnit}
                onChangeText={setCustomUnit}
                placeholder="e.g. kg, km, sessions"
                placeholderTextColor={COLORS.textSecondary}
              />
            </>
          )}

          {/* Current value */}
          <Text style={mStyles.label}>Current Value</Text>
          <RNTextInput
            style={mStyles.input}
            value={current}
            onChangeText={setCurrent}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={COLORS.textSecondary}
          />

          {/* Link tasks */}
          {tasks.length > 0 && (
            <>
              <Text style={[mStyles.label, { marginTop: 6 }]}>Link Tactic Tasks (optional)</Text>
              <Text style={mStyles.hint}>Check tasks that contribute to this metric</Text>
              <View style={mStyles.taskList}>
                {tasks.map((t) => {
                  const linked = linkedIds.includes(t.id);
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[mStyles.taskRow, linked && mStyles.taskRowLinked]}
                      onPress={() => toggleTask(t.id)}
                    >
                      <MaterialCommunityIcons
                        name={linked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                        size={18}
                        color={linked ? objConfig.color : COLORS.textSecondary}
                      />
                      <Text style={[mStyles.taskTitle, linked && { color: objConfig.color }]} numberOfLines={2}>
                        {t.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* Buttons */}
          <View style={mStyles.btnRow}>
            <Button mode="outlined" onPress={onDismiss} style={{ flex: 1 }}>Cancel</Button>
            <View style={{ width: 10 }} />
            <Button
              mode="contained"
              onPress={handleSave}
              style={[{ flex: 1 }, { backgroundColor: objConfig.color }]}
            >
              {metric ? 'Save' : 'Add'}
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Log Progress Modal ────────────────────────────────────────────────────────
function LogProgressModal({ visible, metric, onSave, onDismiss }) {
  const [value, setValue] = useState('');

  React.useEffect(() => {
    if (visible) setValue(String(metric?.current ?? 0));
  }, [visible, metric]);

  const unit    = metric?.unit === 'custom' ? (metric?.customUnit || '') : (metric?.unit || '');
  const pct     = metric ? Math.round(metricProgress({ ...metric, current: parseFloat(value) || 0 }) * 100) : 0;

  const handleSave = () => {
    const v = parseFloat(value);
    if (isNaN(v) || v < 0) {
      Alert.alert('Invalid value', 'Please enter a valid number.');
      return;
    }
    onSave(Math.min(v, metric.target));
  };

  if (!metric) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={mStyles.overlay}
      >
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onDismiss} />
        <View style={[mStyles.sheet, { paddingBottom: 28 }]}>
          <View style={mStyles.handle} />
          <Text style={mStyles.title}>Log Progress</Text>
          <Text style={mStyles.metricNameBig}>{metric.name}</Text>

          <Text style={mStyles.label}>Current Value{unit ? ` (${unit})` : ''}</Text>
          <RNTextInput
            style={mStyles.input}
            value={value}
            onChangeText={setValue}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={COLORS.textSecondary}
            autoFocus
          />

          <Text style={mStyles.hint}>
            Target: {metric.target}{unit ? ' ' + unit : ''}  ·  Progress: {pct}%
          </Text>
          <ProgressBar
            progress={Math.min(1, (parseFloat(value) || 0) / (metric.target || 1))}
            color={objConfig.color}
            style={{ height: 7, borderRadius: 4, marginVertical: 10 }}
          />

          <View style={mStyles.btnRow}>
            <Button mode="outlined" onPress={onDismiss} style={{ flex: 1 }}>Cancel</Button>
            <View style={{ width: 10 }} />
            <Button
              mode="contained"
              onPress={handleSave}
              style={[{ flex: 1 }, { backgroundColor: objConfig.color }]}
            >
              Save Progress
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({ metric, linkedTasks, onEdit, onDelete, onLog }) {
  const pct      = Math.round(metricProgress(metric) * 100);
  const progress = metricProgress(metric);
  const barColor = pct >= 100 ? COLORS.success : objConfig.color;

  return (
    <View style={mStyles.metricCard}>
      <View style={mStyles.metricCardHeader}>
        <MaterialCommunityIcons name="chart-line" size={15} color={objConfig.color} />
        <Text style={mStyles.metricName} numberOfLines={1}>{metric.name}</Text>
        <View style={mStyles.metricActions}>
          <TouchableOpacity onPress={onLog} style={mStyles.metricActionBtn}>
            <MaterialCommunityIcons name="plus-circle-outline" size={18} color={objConfig.color} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onEdit} style={mStyles.metricActionBtn}>
            <MaterialCommunityIcons name="pencil-outline" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={mStyles.metricActionBtn}>
            <MaterialCommunityIcons name="trash-can-outline" size={16} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={mStyles.metricValueRow}>
        <Text style={[mStyles.metricPct, { color: barColor }]}>{pct}%</Text>
        <Text style={mStyles.metricLabel}>{metricLabel(metric)}</Text>
      </View>

      <View style={{ overflow: 'hidden', borderRadius: 4 }}>
        <ProgressBar progress={progress} color={barColor} style={{ height: 8, borderRadius: 4 }} />
      </View>

      {linkedTasks.length > 0 && (
        <View style={mStyles.metricLinkedTasks}>
          <MaterialCommunityIcons name="link-variant" size={11} color={COLORS.textSecondary} />
          <Text style={mStyles.metricLinkedText} numberOfLines={1}>
            {linkedTasks.map((t) => t.title).join(' · ')}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ObjectiveDetailScreen({ route, navigation }) {
  const { objectiveId, strategyTitle, strategyId = null, goalTitle = '', goalId = null } = route.params;
  const {
    objectives, tactics, tasks, saveObjective, saveTactic, deleteTactic, deleteObjective,
    getObjectiveProgress, getTacticProgress,
  } = useGSOT();

  const objective    = objectives.find((o) => o.id === objectiveId);
  const childTactics = tactics.filter((t) => t.objectiveId === objectiveId);

  // Collect all tasks under this objective's tactics
  const tacticIds    = childTactics.map((t) => t.id);
  const childTasks   = useMemo(
    () => (tasks || []).filter((t) => tacticIds.includes(t.tacticId)),
    [tasks, tacticIds]
  );

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [editObjModal,    setEditObjModal]    = useState(false);
  const [addTacticModal,  setAddTacticModal]  = useState(false);
  const [editingTactic,   setEditingTactic]   = useState(null);
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);

  // ── Metrics state ────────────────────────────────────────────────────────────
  const [metricModalOpen, setMetricModalOpen] = useState(false);
  const [editingMetric,   setEditingMetric]   = useState(null);
  const [logMetric,       setLogMetric]       = useState(null);

  // Metrics live on the objective object (stored via saveObjective)
  const metrics = useMemo(
    () => (objective?.metrics || []),
    [objective]
  );

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleObjStatusChange = async (newStatus) => {
    setStatusMenuVisible(false);
    if (newStatus !== objective.status) await saveObjective({ ...objective, status: newStatus });
  };

  const handleQuickStatus = async (tactic, newStatus) => {
    await saveTactic({ ...tactic, status: newStatus });
  };
  const handleQuickPriority = async (tactic, newPriority) => {
    await saveTactic({ ...tactic, priority: newPriority });
  };

  // Metric CRUD
  const handleMetricSave = async (metricData) => {
    const existing = metrics.find((m) => m.id === metricData.id);
    const updated  = existing
      ? metrics.map((m) => (m.id === metricData.id ? metricData : m))
      : [...metrics, metricData];
    await saveObjective({ ...objective, metrics: updated });
    setMetricModalOpen(false);
    setEditingMetric(null);
  };

  const handleMetricDelete = (metricId) => {
    Alert.alert('Delete Metric', 'Remove this metric from the objective?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const updated = metrics.filter((m) => m.id !== metricId);
          await saveObjective({ ...objective, metrics: updated });
        },
      },
    ]);
  };

  const handleLogProgress = async (metricId, newValue) => {
    const updated = metrics.map((m) =>
      m.id === metricId ? { ...m, current: newValue } : m
    );
    await saveObjective({ ...objective, metrics: updated });
    setLogMetric(null);
  };

  if (!objective) return <View style={styles.container}><Text>Objective not found.</Text></View>;

  const progress     = getObjectiveProgress(objectiveId);
  const statusOption   = STATUS_OPTIONS.find((s) => s.value === objective.status)       || STATUS_OPTIONS[0];
  const priorityOption = PRIORITY_OPTIONS.find((p) => p.value === objective.priority)   || PRIORITY_OPTIONS[1];

  return (
    <View style={styles.container}>
      {/* ── Sticky title strip ── */}
      <View style={styles.stickyHeader}>
        <BreadcrumbBar segments={[
          goalId
            ? { label: goalTitle || 'Goal', onPress: () => navigation.push('GoalDetail', { goalId }) }
            : { label: goalTitle || 'Goal' },
          strategyId
            ? { label: strategyTitle || 'Strategy', onPress: () => navigation.push('StrategyDetail', { strategyId, goalTitle, goalId }) }
            : { label: strategyTitle || 'Strategy' },
        ].filter(s => s.label)} />
        <View style={styles.stickyRow}>
          <View style={[styles.stickyColorBar, { backgroundColor: objConfig.color }]} />
          <MaterialCommunityIcons name={objConfig.icon} size={16} color={objConfig.color} />
          <Text style={styles.stickyTitle} numberOfLines={2}>{objective.title}</Text>
        </View>
      </View>

      <ScrollView>
        {/* ── Header card ── */}
        <View style={[styles.headerCard, { borderTopColor: objConfig.color }]}>
          <View style={styles.headerTop}>
            <View style={[styles.iconCircle, { backgroundColor: objConfig.color + '22' }]}>
              <MaterialCommunityIcons name={objConfig.icon} size={22} color={objConfig.color} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Menu
                visible={statusMenuVisible}
                onDismiss={() => setStatusMenuVisible(false)}
                anchor={
                  <Chip
                    compact
                    onPress={() => setStatusMenuVisible(true)}
                    style={{ backgroundColor: statusOption.color + '22' }}
                    textStyle={{ color: statusOption.color, fontSize: 11, fontWeight: '700' }}
                    icon={() => <MaterialCommunityIcons name="chevron-down" size={12} color={statusOption.color} />}
                  >
                    {statusOption.label}
                  </Chip>
                }
              >
                {STATUS_OPTIONS.map((s) => (
                  <Menu.Item
                    key={s.value}
                    onPress={() => handleObjStatusChange(s.value)}
                    title={s.label}
                    leadingIcon={objective.status === s.value ? 'check' : 'circle-outline'}
                    titleStyle={[{ fontSize: 14 }, objective.status === s.value && { color: s.color, fontWeight: '700' }]}
                  />
                ))}
              </Menu>
              <View style={[styles.priorityPill, { backgroundColor: priorityOption.color + '22' }]}>
                <MaterialCommunityIcons name={priorityOption.icon} size={11} color={priorityOption.color} />
                <Text style={[styles.priorityText, { color: priorityOption.color }]}>{priorityOption.label}</Text>
              </View>
            </View>
          </View>
          <Text variant="headlineSmall" style={styles.title}>{objective.title}</Text>
          {!!objective.description && (
            <Text variant="bodyMedium" style={styles.desc}>{objective.description}</Text>
          )}
          {!!objective.measures && (
            <View style={styles.measuresCard}>
              <MaterialCommunityIcons name="ruler" size={14} color={objConfig.color} />
              <View style={{ flex: 1 }}>
                <Text variant="labelSmall" style={{ color: objConfig.color, fontWeight: '700', marginBottom: 2 }}>
                  Measures / KPIs
                </Text>
                <Text variant="bodySmall" style={{ color: COLORS.text, lineHeight: 17 }}>
                  {objective.measures}
                </Text>
              </View>
            </View>
          )}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text variant="labelMedium" style={{ color: objConfig.color, fontWeight: '700' }}>Tactic Progress</Text>
              <Text variant="titleMedium" style={{ color: objConfig.color, fontWeight: '800' }}>{progress}%</Text>
            </View>
            <ProgressBar progress={progress / 100} color={objConfig.color} style={styles.progressBar} />
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text variant="titleLarge" style={[styles.statNum, { color: objConfig.color }]}>{childTactics.length}</Text>
              <Text variant="labelSmall" style={styles.statLabel}>Tactics</Text>
            </View>
            <Divider style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text variant="titleLarge" style={[styles.statNum, { color: objConfig.color }]}>
                {childTactics.filter((t) => t.status === 'completed').length}
              </Text>
              <Text variant="labelSmall" style={styles.statLabel}>Completed</Text>
            </View>
            <Divider style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text variant="titleLarge" style={[styles.statNum, { color: objConfig.color }]}>{metrics.length}</Text>
              <Text variant="labelSmall" style={styles.statLabel}>Metrics</Text>
            </View>
          </View>
          <View style={styles.headerBtns}>
            <Button
              mode="outlined"
              onPress={() => setEditObjModal(true)}
              style={[styles.headerBtn, { flex: 2 }]}
              compact
            >
              Edit Objective
            </Button>
          </View>
        </View>

        {/* ══ Metrics Section ══════════════════════════════════════════════════ */}
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="chart-line" size={18} color={objConfig.color} />
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: objConfig.color }]}>Metrics</Text>
          <Text variant="labelSmall" style={styles.sectionCount}>{metrics.length}</Text>
          <TouchableOpacity
            style={[styles.addMetricBtn, { backgroundColor: objConfig.color }]}
            onPress={() => { setEditingMetric(null); setMetricModalOpen(true); }}
          >
            <MaterialCommunityIcons name="plus" size={13} color="#fff" />
            <Text style={styles.addMetricBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {metrics.length === 0 ? (
          <View style={mStyles.metricsEmpty}>
            <MaterialCommunityIcons name="chart-line-variant" size={28} color={COLORS.textSecondary} />
            <Text style={mStyles.metricsEmptyTitle}>No Metrics Yet</Text>
            <Text style={mStyles.metricsEmptyText}>
              Add specific, measurable targets to track progress on this objective.
            </Text>
            <TouchableOpacity
              style={[mStyles.metricsEmptyBtn, { backgroundColor: objConfig.color }]}
              onPress={() => { setEditingMetric(null); setMetricModalOpen(true); }}
            >
              <MaterialCommunityIcons name="plus" size={16} color="#fff" />
              <Text style={mStyles.metricsEmptyBtnText}>Add First Metric</Text>
            </TouchableOpacity>
          </View>
        ) : (
          metrics.map((m) => {
            const linked = childTasks.filter((t) => (m.linkedTaskIds || []).includes(t.id));
            return (
              <MetricCard
                key={m.id}
                metric={m}
                linkedTasks={linked}
                onEdit={() => { setEditingMetric(m); setMetricModalOpen(true); }}
                onDelete={() => handleMetricDelete(m.id)}
                onLog={() => setLogMetric(m)}
              />
            );
          })
        )}

        {/* ══ Tactics Section ══════════════════════════════════════════════════ */}
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name={tacticConfig.icon} size={18} color={tacticConfig.color} />
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: tacticConfig.color }]}>Tactics</Text>
          <Text variant="labelSmall" style={styles.sectionCount}>{childTactics.length}</Text>
        </View>

        {childTactics.length === 0 ? (
          <EmptyState
            icon="tools"
            title="No Tactics Yet"
            subtitle="Tactics are specific actions you take to achieve this objective."
            actionLabel="Add Tactic"
            onAction={() => { setEditingTactic(null); setAddTacticModal(true); }}
            color={tacticConfig.color}
          />
        ) : (
          childTactics.map((tactic) => (
            <GSOTCard
              key={tactic.id}
              item={tactic}
              config={tacticConfig}
              progress={getTacticProgress(tactic.id)}
              onStatusChange={handleQuickStatus}
              onPriorityChange={handleQuickPriority}
              onPress={() =>
                navigation.navigate('TacticDetail', {
                  tacticId:       tactic.id,
                  objectiveTitle: objective.title,
                  objectiveId:    objectiveId,
                  strategyTitle:  strategyTitle,
                  strategyId:     strategyId,
                  goalTitle:      goalTitle,
                  goalId:         goalId,
                })
              }
              onDelete={() => deleteTactic(tactic.id)}
              onLongPress={() =>
                Alert.alert(tactic.title, 'What would you like to do?', [
                  { text: 'Edit', onPress: () => { setEditingTactic(tactic); setAddTacticModal(true); } },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteTactic(tactic.id) },
                  { text: 'Cancel', style: 'cancel' },
                ])
              }
            />
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <FAB
        icon="plus"
        label="Add Tactic"
        style={[styles.fab, { backgroundColor: tacticConfig.color }]}
        color="#fff"
        onPress={() => { setEditingTactic(null); setAddTacticModal(true); }}
      />

      {/* ── Modals ── */}
      <ItemFormModal
        visible={editObjModal}
        onDismiss={() => setEditObjModal(false)}
        onSave={async (data) => { await saveObjective({ ...objective, ...data }); setEditObjModal(false); }}
        item={objective}
        config={objConfig}
        showMeasures
      />

      <ItemFormModal
        visible={addTacticModal}
        onDismiss={() => { setAddTacticModal(false); setEditingTactic(null); }}
        onSave={async (data) => {
          await saveTactic({ ...editingTactic, ...data, objectiveId });
          setAddTacticModal(false);
          setEditingTactic(null);
        }}
        item={editingTactic}
        config={tacticConfig}
        parentLabel={`Under Objective: ${objective.title}`}
      />

      <MetricModal
        visible={metricModalOpen}
        metric={editingMetric}
        tasks={childTasks}
        onSave={handleMetricSave}
        onDismiss={() => { setMetricModalOpen(false); setEditingMetric(null); }}
      />

      <LogProgressModal
        visible={!!logMetric}
        metric={logMetric}
        onSave={(val) => handleLogProgress(logMetric.id, val)}
        onDismiss={() => setLogMetric(null)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  stickyHeader: {
    flexDirection: 'column',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12, paddingTop: 6, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    elevation: 3, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4,
  },
  stickyBreadcrumb: {
    fontSize: 13, color: COLORS.textSecondary, letterSpacing: 0.2, marginBottom: 4,
  },
  stickyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stickyColorBar: { width: 3, height: 26, borderRadius: 2 },
  stickyTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.text },
  stickyStatusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, flexShrink: 0 },
  stickyStatusText: { fontSize: 10, fontWeight: '700' },
  headerCard: {
    backgroundColor: COLORS.surface, margin: 16, borderRadius: 16,
    padding: 16, borderTopWidth: 4, elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8,
  },
  breadcrumb: { color: COLORS.textSecondary, marginBottom: 10 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  priorityPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  priorityText: { fontSize: 11, fontWeight: '700' },
  title: { color: COLORS.text, fontWeight: '800', marginBottom: 6 },
  desc: { color: COLORS.textSecondary, lineHeight: 20, marginBottom: 16 },
  progressSection: { marginBottom: 16, marginRight: 28 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressBar: { height: 8, borderRadius: 4, marginRight: 16 },
  statsRow: {
    flexDirection: 'row', backgroundColor: COLORS.background,
    borderRadius: 10, padding: 12, marginBottom: 12,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontWeight: '800' },
  statLabel: { color: COLORS.textSecondary, marginTop: 2 },
  statDivider: { width: 1, height: '100%' },
  measuresCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: COLORS.background, borderRadius: 8, padding: 10, marginBottom: 14,
  },
  headerBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  headerBtn: { borderColor: COLORS.border },
  fab: {
    position: 'absolute', margin: 16, right: 0, bottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 16, marginTop: 16, marginBottom: 4,
  },
  sectionTitle: { fontWeight: '700', flex: 1 },
  sectionCount: {
    color: COLORS.textSecondary,
    backgroundColor: COLORS.background,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
    fontSize: 11, fontWeight: '600',
  },
  addMetricBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8,
  },
  addMetricBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});

// ─── Metric & Modal Styles ────────────────────────────────────────────────────
const mStyles = StyleSheet.create({
  // Metric card
  metricCard: {
    backgroundColor: COLORS.surface, marginHorizontal: 16, marginBottom: 10,
    borderRadius: 12, padding: 14, borderLeftWidth: 3, borderLeftColor: objConfig.color,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 4,
  },
  metricCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  metricName: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.text },
  metricActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  metricActionBtn: { padding: 4 },
  metricValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 6 },
  metricPct: { fontSize: 22, fontWeight: '800' },
  metricLabel: { fontSize: 12, color: COLORS.textSecondary, flex: 1 },
  metricLinkedTasks: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  metricLinkedText: { fontSize: 10, color: COLORS.textSecondary, flex: 1, fontStyle: 'italic' },

  // Empty metrics state
  metricsEmpty: {
    alignItems: 'center', paddingVertical: 24, paddingHorizontal: 32,
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: COLORS.surface, borderRadius: 12,
  },
  metricsEmptyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginTop: 10, marginBottom: 4 },
  metricsEmptyText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 18, marginBottom: 14 },
  metricsEmptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  metricsEmptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Modal overlay + sheet
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36,
    maxHeight: '90%',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 14 },
  metricNameBig: { fontSize: 15, fontWeight: '700', color: objConfig.color, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 4 },
  hint: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 9,
    fontSize: 14, color: COLORS.text, backgroundColor: COLORS.background,
    marginBottom: 12,
  },
  unitBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  taskList: { marginBottom: 12, gap: 6 },
  taskRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    padding: 8, borderRadius: 8, backgroundColor: COLORS.background,
  },
  taskRowLinked: { backgroundColor: objConfig.color + '12' },
  taskTitle: { flex: 1, fontSize: 13, color: COLORS.text, lineHeight: 18 },
  btnRow: { flexDirection: 'row', marginTop: 8 },
});
