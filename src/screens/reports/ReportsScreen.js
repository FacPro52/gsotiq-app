import React, { useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGSOT } from '../../context/GSOTContext';
import {
  COLORS,
  GSOT_CONFIG,
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  CATEGORY_OPTIONS,
} from '../../utils/theme';
import { parseDate, prettyDate, isOverdue, formatDate } from '../../utils/recurrence';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const isDueSoon = (dueDateStr, days = 7) => {
  if (!dueDateStr) return false;
  const d = parseDate(dueDateStr);
  const t = today();
  const cutoff = new Date(t);
  cutoff.setDate(cutoff.getDate() + days);
  return d >= t && d <= cutoff;
};

const pct = (num, den) => (den === 0 ? 0 : Math.round((num / den) * 100));

const statusColor = (val) =>
  (STATUS_OPTIONS.find((s) => s.value === val) || STATUS_OPTIONS[0]).color;

const priorityColor = (val) =>
  (PRIORITY_OPTIONS.find((p) => p.value === val) || PRIORITY_OPTIONS[1]).color;

const priorityIcon = (val) =>
  (PRIORITY_OPTIONS.find((p) => p.value === val) || PRIORITY_OPTIONS[1]).icon;

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title, color, count }) {
  return (
    <View style={styles.sectionHeader}>
      <MaterialCommunityIcons name={icon} size={20} color={color} />
      <Text variant="titleMedium" style={[styles.sectionTitle, { color }]}>
        {title}
      </Text>
      {count !== undefined && (
        <View style={[styles.sectionBadge, { backgroundColor: color + '22' }]}>
          <Text style={[styles.sectionBadgeText, { color }]}>{count}</Text>
        </View>
      )}
    </View>
  );
}

/** Single metric tile used in the scorecard row */
function MetricTile({ label, value, icon, color, sub }) {
  return (
    <View style={[styles.metricTile, { borderTopColor: color }]}>
      <MaterialCommunityIcons name={icon} size={22} color={color} style={{ marginBottom: 6 }} />
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      {!!sub && <Text style={styles.metricSub}>{sub}</Text>}
    </View>
  );
}

/** Horizontal proportional bar for status breakdown */
function StatusBar({ counts, total }) {
  if (total === 0) {
    return (
      <View style={styles.statusBarEmpty}>
        <Text style={styles.emptyText}>No items yet</Text>
      </View>
    );
  }
  return (
    <View style={styles.statusBarTrack}>
      {STATUS_OPTIONS.map((s) => {
        const n = counts[s.value] || 0;
        if (n === 0) return null;
        const w = pct(n, total);
        return (
          <View
            key={s.value}
            style={[styles.statusBarSegment, { width: `${w}%`, backgroundColor: s.color }]}
          />
        );
      })}
    </View>
  );
}

/** Legend row for status bar */
function StatusLegend({ counts, total }) {
  return (
    <View style={styles.legendRow}>
      {STATUS_OPTIONS.map((s) => {
        const n = counts[s.value] || 0;
        if (n === 0) return null;
        return (
          <View key={s.value} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: s.color }]} />
            <Text style={styles.legendText}>{s.label}</Text>
            <Text style={[styles.legendCount, { color: s.color }]}>{n}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** Horizontal priority mini-bar for a single level */
function PriorityBar({ counts, total }) {
  if (total === 0) return null;
  return (
    <View style={styles.priorityRow}>
      {PRIORITY_OPTIONS.slice().reverse().map((p) => {
        const n = counts[p.value] || 0;
        if (n === 0) return null;
        return (
          <View key={p.value} style={styles.priorityItem}>
            <MaterialCommunityIcons name={p.icon} size={14} color={p.color} />
            <Text style={[styles.priorityCount, { color: p.color }]}>{n}</Text>
            <Text style={styles.priorityLabel}>{p.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** A single action-required row (overdue or due soon) */
function ActionRow({ item, typeLabel, typeColor, typeIcon, onPress }) {
  const overdue = isOverdue(item.dueDate);
  const accentColor = overdue ? COLORS.error : COLORS.warning;
  return (
    <TouchableOpacity style={styles.actionRow} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.actionTypeTag, { backgroundColor: typeColor + '18' }]}>
        <MaterialCommunityIcons name={typeIcon} size={12} color={typeColor} />
        <Text style={[styles.actionTypeText, { color: typeColor }]}>{typeLabel}</Text>
      </View>
      <View style={styles.actionMain}>
        <Text style={styles.actionTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.actionMeta}>
          <MaterialCommunityIcons
            name={overdue ? 'alert-circle-outline' : 'calendar-clock'}
            size={12}
            color={accentColor}
          />
          <Text style={[styles.actionDate, { color: accentColor }]}>
            {overdue ? 'Overdue — ' : 'Due '}{prettyDate(item.dueDate)}
          </Text>
        </View>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );
}

// ─── Period helpers ────────────────────────────────────────────────────────────

const PERIODS = [
  { value: 'week',  label: 'Week',  days: 7   },
  { value: 'month', label: 'Month', days: 30  },
  { value: 'year',  label: 'Year',  days: 365 },
  { value: 'all',   label: 'All',   days: null },
];

/** Returns ISO date string N days ago */
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

/** Count consecutive days (backwards from today/yesterday) that have completions */
const computeStreak = (allItems) => {
  const completedDates = new Set(
    allItems
      .filter((i) => i.status === 'completed' && i.updatedAt)
      .map((i) => i.updatedAt.split('T')[0])
  );
  if (completedDates.size === 0) return 0;

  let streak = 0;
  const todayStr = formatDate(new Date());
  let check = new Date();

  // If nothing completed today, start from yesterday
  if (!completedDates.has(todayStr)) check.setDate(check.getDate() - 1);

  for (let i = 0; i < 365; i++) {
    const key = formatDate(check);
    if (completedDates.has(key)) {
      streak++;
      check.setDate(check.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
};

// ─── Sub-component: Period selector ────────────────────────────────────────────

function PeriodBar({ period, onChange }) {
  return (
    <View style={styles.periodBar}>
      {PERIODS.map((p) => (
        <TouchableOpacity
          key={p.value}
          style={[styles.periodChip, period === p.value && styles.periodChipActive]}
          onPress={() => onChange(p.value)}
          activeOpacity={0.7}
        >
          <Text style={[styles.periodChipText, period === p.value && styles.periodChipTextActive]}>
            {p.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Sub-component: Streak + Velocity card ─────────────────────────────────────

function ActivityCard({ allItems, period, navigation }) {
  const periodDays = PERIODS.find((p) => p.value === period)?.days;

  const streak = useMemo(() => computeStreak(allItems), [allItems]);

  const { thisCount, priorCount, recentItems } = useMemo(() => {
    const completed = allItems.filter((i) => i.status === 'completed' && i.updatedAt);
    const cutoff = periodDays ? daysAgo(periodDays) : null;
    const priorCutoff = periodDays ? daysAgo(periodDays * 2) : null;

    const thisItems = cutoff
      ? completed.filter((i) => i.updatedAt >= cutoff)
      : completed;
    const priorItems = (cutoff && priorCutoff)
      ? completed.filter((i) => i.updatedAt >= priorCutoff && i.updatedAt < cutoff)
      : [];

    // Sort recent by updatedAt desc
    const recentSorted = [...thisItems].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    return {
      thisCount: thisItems.length,
      priorCount: priorItems.length,
      recentItems: recentSorted.slice(0, 8),
    };
  }, [allItems, periodDays]);

  const delta = thisCount - priorCount;
  const deltaColor = delta >= 0 ? COLORS.success : COLORS.error;
  const deltaIcon = delta >= 0 ? 'trending-up' : 'trending-down';

  const typeLabel = (item) => {
    if (item.id?.startsWith('goal_'))      return { label: 'Goal',      color: COLORS.goalColor,      icon: 'flag',                    _type: 'goal'      };
    if (item.id?.startsWith('strategy_'))  return { label: 'Strategy',  color: COLORS.strategyColor,  icon: 'chess-knight',            _type: 'strategy'  };
    if (item.id?.startsWith('objective_')) return { label: 'Objective', color: COLORS.objectiveColor, icon: 'target',                  _type: 'objective' };
    if (item.id?.startsWith('tactic_'))    return { label: 'Tactic',    color: COLORS.tacticColor,    icon: 'tools',                   _type: 'tactic'    };
    return                                        { label: 'Task',      color: COLORS.taskColor,      icon: 'checkbox-marked-outline', _type: 'task'      };
  };

  const navigateToItem = (item) => {
    if (!navigation) return;
    const tc = typeLabel(item);
    switch (tc._type) {
      case 'goal':
        navigation.navigate('GoalsTabs', { screen: 'GoalDetail', params: { goalId: item.id } });
        break;
      case 'strategy':
        navigation.navigate('GoalsTabs', { screen: 'StrategyDetail', params: { strategyId: item.id, goalTitle: '' } });
        break;
      case 'objective':
        navigation.navigate('GoalsTabs', { screen: 'ObjectiveDetail', params: { objectiveId: item.id, strategyTitle: '' } });
        break;
      case 'tactic':
        navigation.navigate('GoalsTabs', { screen: 'TacticDetail', params: { tacticId: item.id, objectiveTitle: '' } });
        break;
      case 'task':
        if (item.tacticId) {
          navigation.navigate('GoalsTabs', { screen: 'TacticDetail', params: { tacticId: item.tacticId, objectiveTitle: '' } });
        }
        break;
      default:
        break;
    }
  };

  return (
    <View style={styles.card}>
      <SectionHeader icon="lightning-bolt-outline" title="Activity & Momentum" color={COLORS.secondary} />

      {/* Streak + Velocity row */}
      <View style={styles.activityRow}>
        {/* Streak tile */}
        <View style={[styles.activityTile, { borderTopColor: COLORS.accent }]}>
          <MaterialCommunityIcons name="fire" size={24} color={COLORS.accent} />
          <Text style={[styles.activityValue, { color: COLORS.accent }]}>{streak}</Text>
          <Text style={styles.activityLabel}>Day Streak</Text>
          <Text style={styles.activitySub}>consecutive days</Text>
        </View>

        {/* This period completions tile */}
        <View style={[styles.activityTile, { borderTopColor: COLORS.success }]}>
          <MaterialCommunityIcons name="check-circle-outline" size={24} color={COLORS.success} />
          <Text style={[styles.activityValue, { color: COLORS.success }]}>{thisCount}</Text>
          <Text style={styles.activityLabel}>
            {period === 'all' ? 'Total Done' : `This ${PERIODS.find((p) => p.value === period)?.label}`}
          </Text>
          <Text style={styles.activitySub}>completed</Text>
        </View>

        {/* Velocity vs prior period */}
        {period !== 'all' && (
          <View style={[styles.activityTile, { borderTopColor: deltaColor }]}>
            <MaterialCommunityIcons name={deltaIcon} size={24} color={deltaColor} />
            <Text style={[styles.activityValue, { color: deltaColor }]}>
              {delta >= 0 ? '+' : ''}{delta}
            </Text>
            <Text style={styles.activityLabel}>vs Prior</Text>
            <Text style={styles.activitySub}>{priorCount} last period</Text>
          </View>
        )}
      </View>

      {/* Recent completions list */}
      {recentItems.length > 0 && (
        <View style={styles.recentList}>
          <Text style={styles.recentListTitle}>
            Recently Completed {period !== 'all' ? `(This ${PERIODS.find((p) => p.value === period)?.label})` : ''}
          </Text>
          {recentItems.map((item, idx) => {
            const tc = typeLabel(item);
            const dateStr = item.updatedAt ? new Date(item.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
            return (
              <TouchableOpacity
                key={`recent-${item.id}-${idx}`}
                style={styles.recentRow}
                onPress={() => navigateToItem(item)}
                activeOpacity={0.75}
              >
                <View style={[styles.recentTypeTag, { backgroundColor: tc.color + '18' }]}>
                  <MaterialCommunityIcons name={tc.icon} size={10} color={tc.color} />
                  <Text style={[styles.recentTypeText, { color: tc.color }]}>{tc.label}</Text>
                </View>
                <Text style={styles.recentTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.recentDate}>{dateStr}</Text>
                <MaterialCommunityIcons name="chevron-right" size={14} color={COLORS.textSecondary} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {recentItems.length === 0 && (
        <Text style={styles.emptyText}>
          No completions yet {period !== 'all' ? 'this period' : ''}. Complete your first goal or task to start building momentum!
        </Text>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ReportsScreen({ navigation }) {
  const { goals, strategies, objectives, tactics, tasks,
          getGoalProgress, getStrategyProgress, getObjectiveProgress, getTacticProgress } = useGSOT();

  const [expandedGoal, setExpandedGoal] = useState(null);
  const [period, setPeriod] = useState('month');

  // ── Derived stats ────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const countStatuses = (arr) => {
      const c = {};
      STATUS_OPTIONS.forEach((s) => { c[s.value] = 0; });
      arr.forEach((i) => { if (c[i.status] !== undefined) c[i.status]++; });
      return c;
    };
    const countPriorities = (arr) => {
      const c = {};
      PRIORITY_OPTIONS.forEach((p) => { c[p.value] = 0; });
      arr.forEach((i) => { if (c[i.priority] !== undefined) c[i.priority]++; });
      return c;
    };

    const allItems = [...goals, ...strategies, ...objectives, ...tactics];

    const totalCompleted = allItems.filter((i) => i.status === 'completed').length;
    const totalActive    = allItems.filter((i) => i.status === 'in_progress').length;
    const tasksComplete  = tasks.filter((t) => t.status === 'completed').length;

    // Status breakdown per level
    const goalStatuses      = countStatuses(goals);
    const stratStatuses     = countStatuses(strategies);
    const objStatuses       = countStatuses(objectives);
    const tacticStatuses    = countStatuses(tactics);

    // Priority breakdown per level
    const goalPriorities    = countPriorities(goals);
    const stratPriorities   = countPriorities(strategies);
    const objPriorities     = countPriorities(objectives);
    const tacticPriorities  = countPriorities(tactics);

    // Category distribution for goals
    const categoryMap = {};
    CATEGORY_OPTIONS.forEach((c) => { categoryMap[c.value] = 0; });
    goals.forEach((g) => {
      if (g.category && categoryMap[g.category] !== undefined) categoryMap[g.category]++;
      else if (g.category) categoryMap[g.category] = (categoryMap[g.category] || 0) + 1;
    });

    // Action required: overdue OR due within 7 days, not completed
    const active = (i) => i.status !== 'completed' && i.status !== 'cancelled';
    const actionItems = [
      ...goals.filter(active).filter((i) => i.dueDate && (isOverdue(i.dueDate) || isDueSoon(i.dueDate)))
        .map((i) => ({ ...i, _type: 'goal' })),
      ...strategies.filter(active).filter((i) => i.dueDate && (isOverdue(i.dueDate) || isDueSoon(i.dueDate)))
        .map((i) => ({ ...i, _type: 'strategy' })),
      ...objectives.filter(active).filter((i) => i.dueDate && (isOverdue(i.dueDate) || isDueSoon(i.dueDate)))
        .map((i) => ({ ...i, _type: 'objective' })),
      ...tactics.filter(active).filter((i) => i.dueDate && (isOverdue(i.dueDate) || isDueSoon(i.dueDate)))
        .map((i) => ({ ...i, _type: 'tactic' })),
      ...tasks.filter(active).filter((i) => i.dueDate && (isOverdue(i.dueDate) || isDueSoon(i.dueDate)))
        .map((i) => ({ ...i, _type: 'task' })),
    ].sort((a, b) => {
      // Overdue first, then soonest due
      if (isOverdue(a.dueDate) && !isOverdue(b.dueDate)) return -1;
      if (!isOverdue(a.dueDate) && isOverdue(b.dueDate)) return 1;
      return a.dueDate.localeCompare(b.dueDate);
    });

    const overdueCount = actionItems.filter((i) => isOverdue(i.dueDate)).length;
    const dueSoonCount = actionItems.length - overdueCount;

    return {
      totalGoals: goals.length,
      totalCompleted,
      totalActive,
      tasksComplete,
      totalTasks: tasks.length,
      allItems,
      goalStatuses, stratStatuses, objStatuses, tacticStatuses,
      goalPriorities, stratPriorities, objPriorities, tacticPriorities,
      categoryMap,
      actionItems,
      overdueCount,
      dueSoonCount,
    };
  }, [goals, strategies, objectives, tactics, tasks]);

  // ── Goal progress list (sorted by progress ascending — struggling goals first) ──
  const goalRows = useMemo(() =>
    [...goals]
      .map((g) => ({
        ...g,
        progress: getGoalProgress(g.id),
        stratCount: strategies.filter((s) => s.goalId === g.id).length,
        objCount:   objectives.filter((o) =>
          strategies.filter((s) => s.goalId === g.id).map((s) => s.id).includes(o.strategyId)
        ).length,
      }))
      .sort((a, b) => a.progress - b.progress),
    [goals, strategies, objectives, getGoalProgress]
  );

  // ── Navigate to item's detail screen ────────────────────────────────────────
  const navigateToItem = (item) => {
    switch (item._type) {
      case 'goal':
        navigation.navigate('GoalsTabs', { screen: 'GoalDetail', params: { goalId: item.id } });
        break;
      case 'strategy': {
        const g = goals.find((gl) => gl.id === item.goalId);
        navigation.navigate('GoalsTabs', {
          screen: 'StrategyDetail',
          params: { strategyId: item.id, goalTitle: g?.title || 'Goal' },
        });
        break;
      }
      case 'objective': {
        const s = strategies.find((st) => st.id === item.strategyId);
        navigation.navigate('GoalsTabs', {
          screen: 'ObjectiveDetail',
          params: { objectiveId: item.id, strategyTitle: s?.title || 'Strategy' },
        });
        break;
      }
      case 'tactic':
      case 'task': {
        const obj = objectives.find((o) => o.id === item.objectiveId)
          || tactics.find((t) => t.id === item.tacticId)
            && objectives.find((o) => o.id === tactics.find((t) => t.id === item.tacticId)?.objectiveId);
        const tac = tactics.find((t) => t.id === item.tacticId);
        if (tac) {
          const parentObj = objectives.find((o) => o.id === tac.objectiveId);
          navigation.navigate('GoalsTabs', {
            screen: 'TacticDetail',
            params: { tacticId: tac.id, objectiveTitle: parentObj?.title || 'Objective' },
          });
        }
        break;
      }
    }
  };

  const typeConfig = {
    goal:      { label: 'Goal',      color: COLORS.goalColor,      icon: GSOT_CONFIG.goal.icon },
    strategy:  { label: 'Strategy',  color: COLORS.strategyColor,  icon: GSOT_CONFIG.strategy.icon },
    objective: { label: 'Objective', color: COLORS.objectiveColor, icon: GSOT_CONFIG.objective.icon },
    tactic:    { label: 'Tactic',    color: COLORS.tacticColor,    icon: GSOT_CONFIG.tactic.icon },
    task:      { label: 'Task',      color: COLORS.taskColor,      icon: GSOT_CONFIG.task.icon },
  };

  const hasData = goals.length > 0;

  const allItemsForActivity = useMemo(() => [
    ...goals, ...strategies, ...objectives, ...tactics, ...tasks,
  ], [goals, strategies, objectives, tactics, tasks]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Period selector ──────────────────────────────────────────────── */}
        <PeriodBar period={period} onChange={setPeriod} />

        {/* ── Activity & Momentum ──────────────────────────────────────────── */}
        <ActivityCard allItems={allItemsForActivity} period={period} navigation={navigation} />

        <Divider style={styles.divider} />

        {/* ── Scorecard ───────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <SectionHeader icon="chart-bar" title="Scorecard" color={COLORS.primary} />
          <View style={styles.metricsRow}>
            <MetricTile
              label="Goals"
              value={stats.totalGoals}
              icon="flag-outline"
              color={COLORS.goalColor}
              sub={`${stats.goalStatuses.completed || 0} done`}
            />
            <MetricTile
              label="Active"
              value={stats.totalActive}
              icon="lightning-bolt-outline"
              color={COLORS.secondary}
              sub="in progress"
            />
            <MetricTile
              label="Tasks Done"
              value={stats.tasksComplete}
              icon="checkbox-marked-outline"
              color={COLORS.success}
              sub={`of ${stats.totalTasks}`}
            />
            <MetricTile
              label="Completed"
              value={`${pct(stats.totalCompleted, stats.allItems.length)}%`}
              icon="trophy-outline"
              color={COLORS.accent}
              sub="overall"
            />
          </View>

          {/* Completion funnel */}
          {hasData && (
            <View style={styles.funnel}>
              {[
                { cfg: GSOT_CONFIG.goal,      arr: goals,       prog: null },
                { cfg: GSOT_CONFIG.strategy,  arr: strategies,  prog: null },
                { cfg: GSOT_CONFIG.objective, arr: objectives,  prog: null },
                { cfg: GSOT_CONFIG.tactic,    arr: tactics,     prog: null },
                { cfg: GSOT_CONFIG.task,      arr: tasks,       prog: null },
              ].map(({ cfg, arr }) => {
                const done = arr.filter((i) => i.status === 'completed').length;
                const rate = pct(done, arr.length);
                return (
                  <View key={cfg.label} style={styles.funnelRow}>
                    <MaterialCommunityIcons name={cfg.icon} size={14} color={cfg.color} style={styles.funnelIcon} />
                    <Text style={[styles.funnelLabel, { color: cfg.color }]}>{cfg.pluralLabel}</Text>
                    <View style={styles.funnelBarTrack}>
                      <View style={[styles.funnelBarFill, { width: `${rate}%`, backgroundColor: cfg.color }]} />
                    </View>
                    <Text style={[styles.funnelRate, { color: cfg.color }]}>{rate}%</Text>
                    <Text style={styles.funnelCounts}>{done}/{arr.length}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <Divider style={styles.divider} />

        {/* ── Goal Progress ───────────────────────────────────────────────── */}
        <View style={styles.card}>
          <SectionHeader
            icon={GSOT_CONFIG.goal.icon}
            title="Goal Progress"
            color={COLORS.goalColor}
            count={goals.length}
          />

          {goalRows.length === 0 ? (
            <Text style={styles.emptyText}>No goals yet. Create your first goal to see progress here.</Text>
          ) : (
            goalRows.map((g) => {
              const statusOpt = STATUS_OPTIONS.find((s) => s.value === g.status) || STATUS_OPTIONS[0];
              const isExpanded = expandedGoal === g.id;
              return (
                <TouchableOpacity
                  key={g.id}
                  style={styles.goalRow}
                  onPress={() => navigation.navigate('GoalsTabs', { screen: 'GoalDetail', params: { goalId: g.id } })}
                  onLongPress={() => setExpandedGoal(isExpanded ? null : g.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.goalRowTop}>
                    <View style={[styles.goalColorBar, { backgroundColor: statusOpt.color }]} />
                    <View style={styles.goalRowMain}>
                      <View style={styles.goalRowHeader}>
                        <Text style={styles.goalTitle} numberOfLines={1}>{g.title}</Text>
                        <Text style={[styles.goalPct, { color: COLORS.goalColor }]}>{g.progress}%</Text>
                      </View>
                      <View style={styles.goalProgressTrack}>
                        <View style={[styles.goalProgressFill, { width: `${g.progress}%`, backgroundColor: COLORS.goalColor }]} />
                      </View>
                      <View style={styles.goalRowMeta}>
                        <View style={[styles.statusPill, { backgroundColor: statusOpt.color + '22' }]}>
                          <View style={[styles.statusDot, { backgroundColor: statusOpt.color }]} />
                          <Text style={[styles.statusPillText, { color: statusOpt.color }]}>{statusOpt.label}</Text>
                        </View>
                        <Text style={styles.goalMetaText}>{g.stratCount} {g.stratCount === 1 ? 'Strategy' : 'Strategies'}</Text>
                        {g.priority && (
                          <MaterialCommunityIcons name={priorityIcon(g.priority)} size={13} color={priorityColor(g.priority)} />
                        )}
                      </View>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.textSecondary} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <Divider style={styles.divider} />

        {/* ── Status Breakdown ────────────────────────────────────────────── */}
        <View style={styles.card}>
          <SectionHeader icon="chart-pie" title="Status Breakdown" color={COLORS.secondary} />

          {[
            { cfg: GSOT_CONFIG.goal,      counts: stats.goalStatuses,   total: goals.length },
            { cfg: GSOT_CONFIG.strategy,  counts: stats.stratStatuses,  total: strategies.length },
            { cfg: GSOT_CONFIG.objective, counts: stats.objStatuses,    total: objectives.length },
            { cfg: GSOT_CONFIG.tactic,    counts: stats.tacticStatuses, total: tactics.length },
          ].map(({ cfg, counts, total }) => (
            <View key={cfg.label} style={styles.breakdownBlock}>
              <View style={styles.breakdownHeader}>
                <MaterialCommunityIcons name={cfg.icon} size={15} color={cfg.color} />
                <Text style={[styles.breakdownLevel, { color: cfg.color }]}>{cfg.pluralLabel}</Text>
                <Text style={styles.breakdownTotal}>{total} total</Text>
              </View>
              <StatusBar counts={counts} total={total} />
              <StatusLegend counts={counts} total={total} />
            </View>
          ))}
        </View>

        <Divider style={styles.divider} />

        {/* ── Priority Distribution ────────────────────────────────────────── */}
        <View style={styles.card}>
          <SectionHeader icon="arrow-up-circle-outline" title="Priority Distribution" color={COLORS.warning} />

          {[
            { cfg: GSOT_CONFIG.goal,      counts: stats.goalPriorities,   total: goals.length },
            { cfg: GSOT_CONFIG.strategy,  counts: stats.stratPriorities,  total: strategies.length },
            { cfg: GSOT_CONFIG.objective, counts: stats.objPriorities,    total: objectives.length },
            { cfg: GSOT_CONFIG.tactic,    counts: stats.tacticPriorities, total: tactics.length },
          ].map(({ cfg, counts, total }) => (
            <View key={cfg.label} style={styles.priorityBlock}>
              <View style={styles.breakdownHeader}>
                <MaterialCommunityIcons name={cfg.icon} size={15} color={cfg.color} />
                <Text style={[styles.breakdownLevel, { color: cfg.color }]}>{cfg.pluralLabel}</Text>
              </View>
              {total === 0
                ? <Text style={styles.emptyText}>None yet</Text>
                : <PriorityBar counts={counts} total={total} />}
            </View>
          ))}
        </View>

        <Divider style={styles.divider} />

        {/* ── Goals by Category ───────────────────────────────────────────── */}
        {goals.length > 0 && (
          <>
            <View style={styles.card}>
              <SectionHeader icon="shape-outline" title="Goals by Category" color={COLORS.taskColor} />
              {CATEGORY_OPTIONS.filter((c) => (stats.categoryMap[c.value] || 0) > 0).map((c) => {
                const n = stats.categoryMap[c.value] || 0;
                const barW = pct(n, goals.length);
                return (
                  <View key={c.value} style={styles.catRow}>
                    <MaterialCommunityIcons name={c.icon} size={16} color={c.color} style={styles.catIcon} />
                    <Text style={styles.catLabel} numberOfLines={1}>{c.label}</Text>
                    <View style={styles.catBarTrack}>
                      <View style={[styles.catBarFill, { width: `${barW}%`, backgroundColor: c.color }]} />
                    </View>
                    <Text style={[styles.catCount, { color: c.color }]}>{n}</Text>
                  </View>
                );
              })}
              {CATEGORY_OPTIONS.filter((c) => (stats.categoryMap[c.value] || 0) > 0).length === 0 && (
                <Text style={styles.emptyText}>No category data yet. Add categories when creating goals.</Text>
              )}
            </View>
            <Divider style={styles.divider} />
          </>
        )}

        {/* ── Action Required ──────────────────────────────────────────────── */}
        <View style={styles.card}>
          <SectionHeader
            icon="alert-circle-outline"
            title="Action Required"
            color={stats.overdueCount > 0 ? COLORS.error : COLORS.warning}
            count={stats.actionItems.length}
          />

          {stats.overdueCount > 0 && (
            <View style={styles.overdueAlert}>
              <MaterialCommunityIcons name="alert" size={15} color={COLORS.error} />
              <Text style={styles.overdueAlertText}>
                {stats.overdueCount} {stats.overdueCount === 1 ? 'item is' : 'items are'} overdue
              </Text>
            </View>
          )}

          {stats.actionItems.length === 0 ? (
            <View style={styles.allClearRow}>
              <MaterialCommunityIcons name="check-circle-outline" size={28} color={COLORS.success} />
              <Text style={styles.allClearText}>All clear — nothing overdue or due within 7 days.</Text>
            </View>
          ) : (
            stats.actionItems.map((item, idx) => {
              const tc = typeConfig[item._type] || typeConfig.task;
              return (
                <ActionRow
                  key={`${item._type}-${item.id}-${idx}`}
                  item={item}
                  typeLabel={tc.label}
                  typeColor={tc.color}
                  typeIcon={tc.icon}
                  onPress={() => navigateToItem(item)}
                />
              );
            })
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 40 },

  card: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
  },
  divider: { marginTop: 4, marginHorizontal: 16 },

  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle:  { fontWeight: '800', flex: 1 },
  sectionBadge:  { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  sectionBadgeText: { fontSize: 12, fontWeight: '700' },

  // Metric tiles
  metricsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  metricTile: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderTopWidth: 3,
  },
  metricValue: { fontSize: 20, fontWeight: '900', lineHeight: 24 },
  metricLabel: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600', textAlign: 'center', marginTop: 2 },
  metricSub:   { fontSize: 9,  color: COLORS.textSecondary, textAlign: 'center', marginTop: 1 },

  // Funnel
  funnel: { gap: 8 },
  funnelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  funnelIcon: { flexShrink: 0 },
  funnelLabel: { width: 74, fontSize: 11, fontWeight: '700' },
  funnelBarTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: COLORS.border },
  funnelBarFill:  { height: 8, borderRadius: 4, minWidth: 4 },
  funnelRate: { width: 30, fontSize: 11, fontWeight: '700', textAlign: 'right' },
  funnelCounts: { width: 36, fontSize: 10, color: COLORS.textSecondary, textAlign: 'right' },

  // Goal progress rows
  goalRow: {
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  goalRowTop: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10 },
  goalColorBar: { width: 3, borderRadius: 2, alignSelf: 'stretch', flexShrink: 0 },
  goalRowMain: { flex: 1 },
  goalRowHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  goalTitle: { fontWeight: '700', color: COLORS.text, fontSize: 13, flex: 1, marginRight: 8 },
  goalPct:   { fontWeight: '800', fontSize: 13, flexShrink: 0, marginRight: 12 },
  goalProgressTrack: { height: 6, borderRadius: 3, backgroundColor: COLORS.border, marginBottom: 6, marginRight: 28 },
  goalProgressFill:  { height: 6, borderRadius: 3 },
  goalRowMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  statusDot:  { width: 5, height: 5, borderRadius: 3 },
  statusPillText: { fontSize: 10, fontWeight: '700' },
  goalMetaText: { fontSize: 10, color: COLORS.textSecondary },

  // Status breakdown
  breakdownBlock: { marginBottom: 16 },
  breakdownHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  breakdownLevel: { fontWeight: '700', fontSize: 12, flex: 1 },
  breakdownTotal: { fontSize: 11, color: COLORS.textSecondary },
  statusBarTrack: { height: 14, borderRadius: 7, backgroundColor: COLORS.border, flexDirection: 'row', overflow: 'hidden', marginBottom: 6 },
  statusBarSegment: { height: 14 },
  statusBarEmpty: { height: 14, borderRadius: 7, backgroundColor: COLORS.border, marginBottom: 6, justifyContent: 'center', alignItems: 'center' },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 10, color: COLORS.textSecondary },
  legendCount: { fontSize: 10, fontWeight: '700' },

  // Priority
  priorityBlock: { marginBottom: 14 },
  priorityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingLeft: 4 },
  priorityItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priorityCount: { fontSize: 13, fontWeight: '800' },
  priorityLabel: { fontSize: 11, color: COLORS.textSecondary },

  // Category
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  catIcon: { flexShrink: 0 },
  catLabel: { width: 130, fontSize: 11, color: COLORS.text, fontWeight: '600' },
  catBarTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: COLORS.border },
  catBarFill:  { height: 8, borderRadius: 4, minWidth: 4 },
  catCount: { width: 20, fontWeight: '800', fontSize: 12, textAlign: 'right' },

  // Action required
  overdueAlert: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.error + '12', borderRadius: 8,
    padding: 10, marginBottom: 12,
  },
  overdueAlertText: { color: COLORS.error, fontWeight: '700', fontSize: 13 },
  allClearRow: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  allClearText: { color: COLORS.textSecondary, textAlign: 'center', fontSize: 13 },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  actionTypeTag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, flexShrink: 0 },
  actionTypeText: { fontSize: 10, fontWeight: '700' },
  actionMain: { flex: 1 },
  actionTitle: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 3 },
  actionMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionDate: { fontSize: 11, fontWeight: '600' },

  emptyText: { color: COLORS.textSecondary, fontSize: 12, fontStyle: 'italic', paddingVertical: 8 },

  // Period selector
  periodBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 4,
    gap: 2,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  periodChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 9,
    alignItems: 'center',
  },
  periodChipActive: { backgroundColor: COLORS.primary },
  periodChipText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  periodChipTextActive: { color: '#fff' },

  // Activity card
  activityRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  activityTile: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderTopWidth: 3,
  },
  activityValue: { fontSize: 22, fontWeight: '900', lineHeight: 26, marginTop: 4 },
  activityLabel: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  activitySub: { fontSize: 9, color: COLORS.textSecondary, textAlign: 'center', marginTop: 1 },

  // Recent completions
  recentList: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  recentListTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '80',
  },
  recentTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 5,
    flexShrink: 0,
  },
  recentTypeText: { fontSize: 9, fontWeight: '700' },
  recentTitle: { flex: 1, fontSize: 12, fontWeight: '600', color: COLORS.text },
  recentDate: { fontSize: 10, color: COLORS.textSecondary, flexShrink: 0 },
});
