import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Text, FAB, ProgressBar, Chip, Button, Divider, Menu } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGSOT } from '../../context/GSOTContext';
import { GSOT_CONFIG, COLORS, STATUS_OPTIONS, PRIORITY_OPTIONS } from '../../utils/theme';
import GSOTCard from '../../components/GSOTCard';
import EmptyState from '../../components/EmptyState';
import ItemFormModal from '../../components/ItemFormModal';
import BreadcrumbBar from '../../components/BreadcrumbBar';

const stratConfig = GSOT_CONFIG.strategy;
const objConfig = GSOT_CONFIG.objective;

export default function StrategyDetailScreen({ route, navigation }) {
  const { strategyId, goalTitle, goalId = null } = route.params;
  const {
    strategies, objectives, saveObjective, deleteObjective, saveStrategy, deleteStrategy,
    getStrategyProgress, getObjectiveProgress,
  } = useGSOT();

  const strategy = strategies.find((s) => s.id === strategyId);
  const childObjectives = objectives.filter((o) => o.strategyId === strategyId);

  const [editStratModal, setEditStratModal] = useState(false);
  const [addObjModal, setAddObjModal] = useState(false);
  const [editingObj, setEditingObj] = useState(null);
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);

  const handleStratStatusChange = async (newStatus) => {
    setStatusMenuVisible(false);
    if (newStatus !== strategy.status) await saveStrategy({ ...strategy, status: newStatus });
  };

  const handleQuickStatus = async (obj, newStatus) => {
    await saveObjective({ ...obj, status: newStatus });
  };
  const handleQuickPriority = async (obj, newPriority) => {
    await saveObjective({ ...obj, priority: newPriority });
  };

  if (!strategy) return <View style={styles.container}><Text>Strategy not found.</Text></View>;

  const progress       = getStrategyProgress(strategyId);
  const statusOption   = STATUS_OPTIONS.find((s) => s.value === strategy.status)     || STATUS_OPTIONS[0];
  const priorityOption = PRIORITY_OPTIONS.find((p) => p.value === strategy.priority) || PRIORITY_OPTIONS[1];

  return (
    <View style={styles.container}>
      {/* ── Sticky title strip ── */}
      <View style={styles.stickyHeader}>
        <BreadcrumbBar segments={[
          goalId
            ? { label: goalTitle || 'Goal', onPress: () => navigation.push('GoalDetail', { goalId }) }
            : { label: goalTitle || 'Goal' },
        ]} />
        <View style={styles.stickyRow}>
          <View style={[styles.stickyColorBar, { backgroundColor: stratConfig.color }]} />
          <MaterialCommunityIcons name={stratConfig.icon} size={16} color={stratConfig.color} />
          <Text style={styles.stickyTitle} numberOfLines={2}>{strategy.title}</Text>
        </View>
      </View>
      <ScrollView>
        {/* Header */}
        <View style={[styles.headerCard, { borderTopColor: stratConfig.color }]}>
          <View style={styles.headerTop}>
            <View style={[styles.iconCircle, { backgroundColor: stratConfig.color + '22' }]}>
              <MaterialCommunityIcons name={stratConfig.icon} size={22} color={stratConfig.color} />
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
                    onPress={() => handleStratStatusChange(s.value)}
                    title={s.label}
                    leadingIcon={strategy.status === s.value ? 'check' : 'circle-outline'}
                    titleStyle={[{ fontSize: 14 }, strategy.status === s.value && { color: s.color, fontWeight: '700' }]}
                  />
                ))}
              </Menu>
              <View style={[styles.priorityPill, { backgroundColor: priorityOption.color + '22' }]}>
                <MaterialCommunityIcons name={priorityOption.icon} size={11} color={priorityOption.color} />
                <Text style={[styles.priorityText, { color: priorityOption.color }]}>{priorityOption.label}</Text>
              </View>
            </View>
          </View>

          <Text variant="headlineSmall" style={styles.title}>{strategy.title}</Text>
          {!!strategy.description && (
            <Text variant="bodyMedium" style={styles.desc}>{strategy.description}</Text>
          )}

          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text variant="labelMedium" style={{ color: stratConfig.color, fontWeight: '700' }}>
                Strategy Progress
              </Text>
              <Text variant="titleMedium" style={{ color: stratConfig.color, fontWeight: '800' }}>
                {progress}%
              </Text>
            </View>
            <ProgressBar progress={progress / 100} color={stratConfig.color} style={styles.progressBar} />
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text variant="titleLarge" style={[styles.statNum, { color: stratConfig.color }]}>
                {childObjectives.length}
              </Text>
              <Text variant="labelSmall" style={styles.statLabel}>Objectives</Text>
            </View>
            <Divider style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text variant="titleLarge" style={[styles.statNum, { color: stratConfig.color }]}>
                {childObjectives.filter((o) => o.status === 'completed').length}
              </Text>
              <Text variant="labelSmall" style={styles.statLabel}>Completed</Text>
            </View>
          </View>
          <View style={styles.headerBtns}>
            <Button
              mode="outlined"
              onPress={() => setEditStratModal(true)}
              style={[styles.headerBtn, { flex: 2 }]}
              compact
            >
              Edit Strategy
            </Button>
          </View>
        </View>

        {/* Objectives Section */}
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name={objConfig.icon} size={18} color={objConfig.color} />
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: objConfig.color }]}>
            Objectives
          </Text>
          <Text variant="labelSmall" style={styles.sectionCount}>{childObjectives.length}</Text>
        </View>

        {childObjectives.length === 0 ? (
          <EmptyState
            icon="target"
            title="No Objectives Yet"
            subtitle="Objectives are specific, measurable milestones that track progress toward this strategy."
            actionLabel="Add Objective"
            onAction={() => { setEditingObj(null); setAddObjModal(true); }}
            color={objConfig.color}
          />
        ) : (
          childObjectives.map((obj) => (
            <GSOTCard
              key={obj.id}
              item={obj}
              config={objConfig}
              progress={getObjectiveProgress(obj.id)}
              onStatusChange={handleQuickStatus}
              onPriorityChange={handleQuickPriority}
              onPress={() =>
                navigation.navigate('ObjectiveDetail', {
                  objectiveId:   obj.id,
                  strategyTitle: strategy.title,
                  strategyId:    strategyId,
                  goalTitle:     goalTitle,
                  goalId:        goalId,
                })
              }
              onDelete={() => deleteObjective(obj.id)}
              onLongPress={() =>
                Alert.alert(obj.title, 'What would you like to do?', [
                  { text: 'Edit', onPress: () => { setEditingObj(obj); setAddObjModal(true); } },
                  // Delete calls directly — no second Alert (chained Alerts are silently dropped on iOS)
                  { text: 'Delete', style: 'destructive', onPress: () => deleteObjective(obj.id) },
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
        label="Add Objective"
        style={[styles.fab, { backgroundColor: objConfig.color }]}
        color="#fff"
        onPress={() => { setEditingObj(null); setAddObjModal(true); }}
      />

      <ItemFormModal
        visible={editStratModal}
        onDismiss={() => setEditStratModal(false)}
        onSave={async (data) => { await saveStrategy({ ...strategy, ...data }); setEditStratModal(false); }}
        item={strategy}
        config={stratConfig}
      />

      <ItemFormModal
        visible={addObjModal}
        onDismiss={() => { setAddObjModal(false); setEditingObj(null); }}
        onSave={async (data) => {
          await saveObjective({ ...editingObj, ...data, strategyId });
          setAddObjModal(false);
          setEditingObj(null);
        }}
        item={editingObj}
        config={objConfig}
        parentLabel={`Under Strategy: ${strategy.title}`}
        showMeasures
      />
    </View>
  );
}

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
  title: { color: COLORS.text, fontWeight: '800', marginBottom: 6 },
  desc: { color: COLORS.textSecondary, lineHeight: 20, marginBottom: 16 },
  progressSection: { marginBottom: 16, marginRight: 28 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressBar: { height: 8, borderRadius: 4, marginRight: 16 },
  statsRow: { flexDirection: 'row', backgroundColor: COLORS.background, borderRadius: 10, padding: 12, marginBottom: 12 },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontWeight: '800' },
  statLabel: { color: COLORS.textSecondary, marginTop: 2 },
  statDivider: { width: 1, height: '100%' },
  editBtn:    { borderColor: COLORS.border },
  headerBtns: { flexDirection: 'row', gap: 8 },
  headerBtn:  { borderColor: COLORS.border },
  deleteBtn:  { borderColor: COLORS.error + '66' },
  priorityPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  priorityText: { fontSize: 11, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  sectionTitle: { fontWeight: '700', flex: 1 },
  sectionCount: { backgroundColor: COLORS.border, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, color: COLORS.textSecondary, fontWeight: '700' },
  fab: { position: 'absolute', right: 16, bottom: 24 },
});
