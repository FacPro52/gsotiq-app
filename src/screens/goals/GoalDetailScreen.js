import React, { useState } from 'react';
import { View, FlatList, StyleSheet, Alert, ScrollView } from 'react-native';
import { Text, FAB, ProgressBar, Chip, Button, Divider, Menu } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGSOT } from '../../context/GSOTContext';
import { GSOT_CONFIG, COLORS, STATUS_OPTIONS, PRIORITY_OPTIONS } from '../../utils/theme';
import GSOTCard from '../../components/GSOTCard';
import EmptyState from '../../components/EmptyState';
import ItemFormModal from '../../components/ItemFormModal';

const goalConfig = GSOT_CONFIG.goal;
const stratConfig = GSOT_CONFIG.strategy;

export default function GoalDetailScreen({ route, navigation }) {
  const { goalId } = route.params;
  const {
    goals, strategies, saveStrategy, deleteStrategy, saveGoal, deleteGoal,
    getGoalProgress, getStrategyProgress,
  } = useGSOT();

  const goal = goals.find((g) => g.id === goalId);
  const childStrategies = strategies.filter((s) => s.goalId === goalId);

  const [editGoalModal, setEditGoalModal] = useState(false);
  const [addStratModal, setAddStratModal] = useState(false);
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);

  const handleGoalStatusChange = async (newStatus) => {
    setStatusMenuVisible(false);
    if (newStatus !== goal.status) await saveGoal({ ...goal, status: newStatus });
  };

  const handleQuickStatus = async (strat, newStatus) => {
    await saveStrategy({ ...strat, status: newStatus });
  };
  const handleQuickPriority = async (strat, newPriority) => {
    await saveStrategy({ ...strat, priority: newPriority });
  };
  const [editingStrat, setEditingStrat] = useState(null);

  if (!goal) {
    return (
      <View style={styles.container}>
        <Text>Goal not found.</Text>
      </View>
    );
  }

  const progress = getGoalProgress(goalId);
  const statusOption   = STATUS_OPTIONS.find((s) => s.value === goal.status)     || STATUS_OPTIONS[0];
  const priorityOption = PRIORITY_OPTIONS.find((p) => p.value === goal.priority) || PRIORITY_OPTIONS[1]; // default medium

  return (
    <View style={styles.container}>
      {/* ── Sticky title strip ── */}
      <View style={styles.stickyHeader}>
        <View style={[styles.stickyColorBar, { backgroundColor: goalConfig.color }]} />
        <MaterialCommunityIcons name={goalConfig.icon} size={16} color={goalConfig.color} />
        <Text style={styles.stickyTitle} numberOfLines={2}>{goal.title}</Text>
      </View>
      <ScrollView>
        {/* Goal Header Card */}
        <View style={[styles.headerCard, { borderTopColor: goalConfig.color }]}>
          <View style={styles.headerTop}>
            <View style={[styles.iconCircle, { backgroundColor: goalConfig.color + '22' }]}>
              <MaterialCommunityIcons name={goalConfig.icon} size={22} color={goalConfig.color} />
            </View>
            <View style={styles.headerMeta}>
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
                    onPress={() => handleGoalStatusChange(s.value)}
                    title={s.label}
                    leadingIcon={goal.status === s.value ? 'check' : 'circle-outline'}
                    titleStyle={[{ fontSize: 14 }, goal.status === s.value && { color: s.color, fontWeight: '700' }]}
                  />
                ))}
              </Menu>
              <View style={[styles.priorityPill, { backgroundColor: priorityOption.color + '22' }]}>
                <MaterialCommunityIcons name={priorityOption.icon} size={11} color={priorityOption.color} />
                <Text style={[styles.priorityText, { color: priorityOption.color }]}>{priorityOption.label}</Text>
              </View>
              {goal.category && (
                <Text variant="labelSmall" style={styles.categoryText}>
                  {goal.category.charAt(0).toUpperCase() + goal.category.slice(1)}
                </Text>
              )}
            </View>
          </View>

          <Text variant="headlineSmall" style={styles.goalTitle}>{goal.title}</Text>
          {!!goal.description && (
            <Text variant="bodyMedium" style={styles.goalDesc}>{goal.description}</Text>
          )}

          {/* Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text variant="labelMedium" style={{ color: goalConfig.color, fontWeight: '700' }}>
                Overall Progress
              </Text>
              <Text variant="titleMedium" style={{ color: goalConfig.color, fontWeight: '800' }}>
                {progress}%
              </Text>
            </View>
            <ProgressBar
              progress={progress / 100}
              color={goalConfig.color}
              style={styles.progressBar}
            />
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text variant="titleLarge" style={[styles.statNum, { color: goalConfig.color }]}>
                {childStrategies.length}
              </Text>
              <Text variant="labelSmall" style={styles.statLabel}>Strategies</Text>
            </View>
            <Divider style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text variant="titleLarge" style={[styles.statNum, { color: goalConfig.color }]}>
                {childStrategies.filter((s) => s.status === 'completed').length}
              </Text>
              <Text variant="labelSmall" style={styles.statLabel}>Completed</Text>
            </View>
          </View>

          <View style={styles.headerBtns}>
            <Button
              mode="outlined"
              onPress={() => setEditGoalModal(true)}
              style={[styles.headerBtn, { flex: 2 }]}
              compact
            >
              Edit Goal
            </Button>
          </View>
        </View>

        {/* Strategies Section */}
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name={stratConfig.icon} size={18} color={stratConfig.color} />
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: stratConfig.color }]}>
            Strategies
          </Text>
          <Text variant="labelSmall" style={styles.sectionCount}>
            {childStrategies.length}
          </Text>
        </View>

        {childStrategies.length === 0 ? (
          <EmptyState
            icon="chess-knight"
            title="No Strategies Yet"
            subtitle="Add strategies that define the approach you'll take to achieve this goal."
            actionLabel="Add Strategy"
            onAction={() => { setEditingStrat(null); setAddStratModal(true); }}
            color={stratConfig.color}
          />
        ) : (
          childStrategies.map((strat) => (
            <GSOTCard
              key={strat.id}
              item={strat}
              config={stratConfig}
              progress={getStrategyProgress(strat.id)}
              onStatusChange={handleQuickStatus}
              onPriorityChange={handleQuickPriority}
              onPress={() =>
                navigation.navigate('StrategyDetail', {
                  strategyId: strat.id,
                  goalTitle:  goal.title,
                  goalId:     goalId,
                })
              }
              onDelete={() => deleteStrategy(strat.id)}
              onLongPress={() =>
                Alert.alert(strat.title, 'What would you like to do?', [
                  {
                    text: 'Edit',
                    onPress: () => {
                      setEditingStrat(strat);
                      setAddStratModal(true);
                    },
                  },
                  // Delete calls directly — no second Alert (chained Alerts are silently dropped on iOS)
                  { text: 'Delete', style: 'destructive', onPress: () => deleteStrategy(strat.id) },
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
        label="Add Strategy"
        style={[styles.fab, { backgroundColor: stratConfig.color }]}
        color="#fff"
        onPress={() => { setEditingStrat(null); setAddStratModal(true); }}
      />

      {/* Edit Goal Modal */}
      <ItemFormModal
        visible={editGoalModal}
        onDismiss={() => setEditGoalModal(false)}
        onSave={async (data) => { await saveGoal({ ...goal, ...data }); setEditGoalModal(false); }}
        item={goal}
        config={goalConfig}
        showCategory
      />

      {/* Add/Edit Strategy Modal */}
      <ItemFormModal
        visible={addStratModal}
        onDismiss={() => { setAddStratModal(false); setEditingStrat(null); }}
        onSave={async (data) => {
          await saveStrategy({ ...editingStrat, ...data, goalId });
          setAddStratModal(false);
          setEditingStrat(null);
        }}
        item={editingStrat}
        config={stratConfig}
        parentLabel={`Under Goal: ${goal.title}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  stickyHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    elevation: 3, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4,
  },
  stickyColorBar: { width: 3, height: 26, borderRadius: 2 },
  stickyTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.text },
  stickyStatusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, flexShrink: 0 },
  stickyStatusText: { fontSize: 10, fontWeight: '700' },
  headerCard: {
    backgroundColor: COLORS.surface,
    margin: 16,
    borderRadius: 16,
    padding: 16,
    borderTopWidth: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  categoryText: { color: COLORS.textSecondary },
  priorityPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  priorityText: { fontSize: 11, fontWeight: '700' },
  goalTitle: { color: COLORS.text, fontWeight: '800', marginBottom: 6 },
  goalDesc: { color: COLORS.textSecondary, lineHeight: 20, marginBottom: 16 },
  progressSection: { marginBottom: 16, marginRight: 28 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressBar: { height: 8, borderRadius: 4, marginRight: 16 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontWeight: '800' },
  statLabel: { color: COLORS.textSecondary, marginTop: 2 },
  statDivider: { width: 1, height: '100%' },
  editBtn:    { borderColor: COLORS.border },
  headerBtns: { flexDirection: 'row', gap: 8 },
  headerBtn:  { borderColor: COLORS.border },
  deleteBtn:  { borderColor: COLORS.error + '66' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  sectionTitle: { fontWeight: '700', flex: 1 },
  sectionCount: {
    backgroundColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  fab: { position: 'absolute', right: 16, bottom: 24 },
});
