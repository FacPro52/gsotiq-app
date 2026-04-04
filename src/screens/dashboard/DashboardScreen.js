import React, { useState, useMemo, useLayoutEffect } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity,
  Modal, Pressable, ActivityIndicator, Platform, Text as RNText, Image,
} from 'react-native';
import { AppHeader } from '../../components/AppHeader';
import { Text, ProgressBar, TextInput, Searchbar, Menu } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useGSOT } from '../../context/GSOTContext';
import { COLORS, GSOT_CONFIG, PRIORITY_OPTIONS, STATUS_OPTIONS, CATEGORY_OPTIONS } from '../../utils/theme';
import {
  TEMPLATE_CATEGORIES,
  ALL_TEMPLATES,
} from '../../data/personalTemplates';
import ItemFormModal from '../../components/ItemFormModal';
import OnboardingTour from '../../components/OnboardingTour';
import { isDueToday, isOverdue, parseDate, prettyDate } from '../../utils/recurrence';

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

// ─── Action Required helpers ──────────────────────────────────────────────────
const _today = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const isDueSoon = (dueDateStr, days = 7) => {
  if (!dueDateStr) return false;
  const d = parseDate(dueDateStr);
  const t = _today();
  const cutoff = new Date(t);
  cutoff.setDate(cutoff.getDate() + days);
  return d >= t && d <= cutoff;
};

// ─── Action Row component ─────────────────────────────────────────────────────
function ActionRow({ item, typeLabel, typeColor, typeIcon, onPress }) {
  const overdue = isOverdue(item.dueDate);
  const accentColor = overdue ? COLORS.error : COLORS.warning;
  return (
    <TouchableOpacity style={arStyles.row} onPress={onPress} activeOpacity={0.8}>
      <View style={[arStyles.typeTag, { backgroundColor: typeColor + '18' }]}>
        <MaterialCommunityIcons name={typeIcon} size={12} color={typeColor} />
        <Text style={[arStyles.typeText, { color: typeColor }]}>{typeLabel}</Text>
      </View>
      <View style={arStyles.main}>
        <Text style={arStyles.title} numberOfLines={2}>{item.title}</Text>
        <View style={arStyles.meta}>
          <MaterialCommunityIcons
            name={overdue ? 'alert-circle-outline' : 'calendar-clock'}
            size={12} color={accentColor}
          />
          <Text style={[arStyles.date, { color: accentColor }]}>
            {overdue ? 'Overdue — ' : 'Due '}{prettyDate(item.dueDate)}
          </Text>
        </View>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );
}

const arStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  typeTag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, flexShrink: 0 },
  typeText: { fontSize: 10, fontWeight: '700' },
  main: { flex: 1 },
  title: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 3 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  date: { fontSize: 11, fontWeight: '600' },
});

const SORT_OPTIONS = [
  { value: 'priority',     label: 'Priority',      icon: 'sort-numeric-descending'       },
  { value: 'created_desc', label: 'Newest first',  icon: 'sort-calendar-descending'      },
  { value: 'created_asc',  label: 'Oldest first',  icon: 'sort-calendar-ascending'       },
  { value: 'title_asc',    label: 'Title A → Z',   icon: 'sort-alphabetical-ascending'   },
  { value: 'title_desc',   label: 'Title Z → A',   icon: 'sort-alphabetical-descending'  },
  { value: 'progress',     label: 'Progress',      icon: 'sort-numeric-ascending'        },
];

// ─── Goal Summary Card ────────────────────────────────────────────────────────
function GoalSummaryCard({ goal, strategies, objectives, tactics, tasks, onPress }) {
  // useNavigation gives us the DashboardStack navigator directly — more reliable
  // than the prop because it doesn't depend on prop-drilling staying in sync.
  const nav = useNavigation();
  const priorityOpt  = PRIORITY_OPTIONS.find((p) => p.value === goal.priority)   || PRIORITY_OPTIONS[1];
  const statusOpt    = STATUS_OPTIONS.find((s) => s.value === goal.status)        || STATUS_OPTIONS[0];
  const categoryOpt  = CATEGORY_OPTIONS.find((c) => c.value === goal.category);
  const categoryColor = categoryOpt ? categoryOpt.color : COLORS.goalColor;
  const [hierarchyExpanded, setHierarchyExpanded] = useState(false);

  // Build hierarchy counts + completed counts scoped to this goal
  const relStrats   = strategies.filter((s) => s.goalId === goal.id);
  const stratIds    = relStrats.map((s) => s.id);

  const relObjs     = objectives.filter((o) => stratIds.includes(o.strategyId));
  const objIds      = relObjs.map((o) => o.id);

  const relTacs     = tactics.filter((t) => objIds.includes(t.objectiveId));
  const tacIds      = relTacs.map((t) => t.id);

  const relTasks    = tasks.filter((t) => tacIds.includes(t.tacticId));

  // Pre-compute parent titles for detail screen params
  const firstStrat   = relStrats[0];
  const firstObj     = relObjs[0];
  const firstTac     = relTacs[0];
  const firstTacObj   = firstTac ? relObjs.find((o) => o.id === firstTac.objectiveId) : null;
  const firstObjStrat = firstObj ? relStrats.find((s) => s.id === firstObj.strategyId) : null;
  const firstTacStrat = firstTacObj ? relStrats.find((s) => s.id === firstTacObj.strategyId) : null;

  const counts = [
    {
      cfg:       GSOT_CONFIG.strategy,
      total:     relStrats.length,
      completed: relStrats.filter((s) => s.status === 'completed').length,
      onPress:   firstStrat
        ? () => nav.navigate('StrategyDetail', { strategyId: firstStrat.id, goalTitle: goal.title, goalId: goal.id })
        : null,
    },
    {
      cfg:       GSOT_CONFIG.objective,
      total:     relObjs.length,
      completed: relObjs.filter((o) => o.status === 'completed').length,
      onPress:   firstObj
        ? () => nav.navigate('ObjectiveDetail', {
            objectiveId:   firstObj.id,
            strategyTitle: firstObjStrat?.title ?? '',
            strategyId:    firstObjStrat?.id ?? null,
            goalTitle:     goal.title,
            goalId:        goal.id,
          })
        : null,
    },
    {
      cfg:       GSOT_CONFIG.tactic,
      total:     relTacs.length,
      completed: relTacs.filter((t) => t.status === 'completed').length,
      onPress:   firstTac
        ? () => nav.navigate('TacticDetail', {
            tacticId:       firstTac.id,
            objectiveTitle: firstTacObj?.title ?? '',
            objectiveId:    firstTacObj?.id ?? null,
            strategyTitle:  firstTacStrat?.title ?? '',
            strategyId:     firstTacStrat?.id ?? null,
            goalTitle:      goal.title,
            goalId:         goal.id,
          })
        : null,
    },
    {
      cfg:       GSOT_CONFIG.task,
      total:     relTasks.length,
      completed: relTasks.filter((t) => t.status === 'completed').length,
      onPress:   firstTac
        ? () => nav.navigate('TacticDetail', {
            tacticId:       firstTac.id,
            objectiveTitle: firstTacObj?.title ?? '',
            objectiveId:    firstTacObj?.id ?? null,
            strategyTitle:  firstTacStrat?.title ?? '',
            strategyId:     firstTacStrat?.id ?? null,
            goalTitle:      goal.title,
            goalId:         goal.id,
          })
        : null,
    },
  ];

  const tasksDone = relTasks.filter((t) => t.status === 'completed').length;
  const taskProgress = relTasks.length > 0 ? tasksDone / relTasks.length : 0;
  const progressPct = Math.round(taskProgress * 100);

  return (
    // ── Outer card: plain View so inner touchables never conflict with the header touchable ──
    <View style={[styles.goalCard, { borderLeftColor: categoryColor }]}>

      {/* ════ Tappable header → Goal Detail ════ */}
      <TouchableOpacity onPress={onPress} activeOpacity={0.82}>

        {/* Title row */}
        <View style={styles.goalTitleRow}>
          <Text variant="titleSmall" style={styles.goalTitle} numberOfLines={2}>
            {goal.title}
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.textSecondary} />
        </View>

        {/* Description */}
        {!!goal.description && (
          <Text variant="bodySmall" style={styles.goalDesc} numberOfLines={3}>
            {goal.description}
          </Text>
        )}

        {/* Meta row: status + priority + due date */}
        <View style={styles.metaRow}>
          <View style={[styles.statusPill, { backgroundColor: statusOpt.color + '22' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusOpt.color }]} />
            <Text style={[styles.statusText, { color: statusOpt.color }]}>{statusOpt.label}</Text>
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: priorityOpt.color + '22' }]}>
            <MaterialCommunityIcons name={priorityOpt.icon} size={12} color={priorityOpt.color} />
            <Text style={[styles.priorityText, { color: priorityOpt.color }]}>{priorityOpt.label}</Text>
          </View>
          {!!goal.dueDate && (
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="calendar-outline" size={12} color={COLORS.textSecondary} />
              <Text style={styles.metaText}>Due {new Date(goal.dueDate).toLocaleDateString()}</Text>
            </View>
          )}
        </View>

        {/* Progress bar */}
        <View style={styles.progressRow}>
          <View style={styles.progressBarWrap}>
            <ProgressBar progress={taskProgress} color={priorityOpt.color} style={styles.progressBar} />
          </View>
          <Text style={[styles.progressPct, { color: priorityOpt.color }]}>{progressPct}%</Text>
        </View>
        <Text style={styles.tasksCompleted}>{tasksDone} of {relTasks.length} tasks completed</Text>

      </TouchableOpacity>
      {/* ════ End tappable header ════ */}

      {/* Counts grid — outside header touchable so each tile gets its own press */}
      <View style={styles.countsGrid}>
        {counts.map(({ cfg, total, completed, onPress }) => {
          const pct = total > 0 ? completed / total : 0;
          return (
            <Pressable
              key={cfg.label}
              style={({ pressed }) => [
                styles.countCell,
                onPress && pressed && { opacity: 0.6 },
              ]}
              onPress={onPress ?? undefined}
              android_ripple={onPress ? { color: cfg.color + '33' } : null}
            >
              <View style={styles.countHeader}>
                <View style={[styles.countIcon, { backgroundColor: cfg.color + '18' }]}>
                  <MaterialCommunityIcons name={cfg.icon} size={12} color={cfg.color} />
                </View>
                <Text style={[styles.countLabel, { color: cfg.color }]}>{cfg.pluralLabel}</Text>
                {!!onPress && (
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={11}
                    color={cfg.color}
                    style={{ marginLeft: 'auto' }}
                  />
                )}
              </View>
              <Text style={styles.countFraction}>
                <Text style={{ color: cfg.color, fontWeight: '700' }}>{completed}</Text>
                <Text style={styles.countSlash}>/{total}</Text>
              </Text>
              <View style={styles.countBarWrap}>
                <ProgressBar progress={pct} color={cfg.color} style={styles.countBar} />
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* ════ GSOT hierarchy — outside the header touchable so rows get their own taps ════ */}
      {relStrats.length > 0 && (
        <View style={styles.hierarchySection}>

          {/* Toggle */}
          <TouchableOpacity
            style={styles.hierarchyToggle}
            onPress={() => setHierarchyExpanded((v) => !v)}
            activeOpacity={0.7}
          >
            <View style={styles.hierarchyDividerLine} />
            <Text style={styles.hierarchyToggleLabel}>Details</Text>
            <MaterialCommunityIcons
              name={hierarchyExpanded ? 'chevron-up' : 'chevron-down'}
              size={15}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>

          {hierarchyExpanded && relStrats.slice(0, 3).map((strat) => {
            const stratObjs = objectives.filter((o) => o.strategyId === strat.id);
            return (
              <View key={strat.id}>

                {/* Strategy → StrategyDetail */}
                <Pressable
                  style={({ pressed }) => [
                    styles.hierarchyRow, styles.hierarchyRowTo,
                    pressed && { opacity: 0.55 },
                  ]}
                  onPress={() => nav.navigate('StrategyDetail', { strategyId: strat.id, goalTitle: goal.title, goalId: goal.id })}
                  android_ripple={{ color: COLORS.strategyColor + '33' }}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <MaterialCommunityIcons name="chess-knight" size={13} color={COLORS.strategyColor} />
                  <Text style={[styles.hierarchyText, { color: COLORS.strategyColor }]} numberOfLines={2}>
                    {strat.title}
                  </Text>
                  <MaterialCommunityIcons name="chevron-right" size={14} color={COLORS.textSecondary} />
                </Pressable>

                {stratObjs.slice(0, 2).map((obj) => {
                  const objTacs = tactics.filter((t) => t.objectiveId === obj.id);
                  return (
                    <View key={obj.id}>

                      {/* Objective → ObjectiveDetail */}
                      <Pressable
                        style={({ pressed }) => [
                          styles.hierarchyRow, styles.hierarchyL2, styles.hierarchyRowTo,
                          pressed && { opacity: 0.55 },
                        ]}
                        onPress={() => nav.navigate('ObjectiveDetail', { objectiveId: obj.id, strategyTitle: strat.title, strategyId: strat.id, goalTitle: goal.title, goalId: goal.id })}
                        android_ripple={{ color: COLORS.objectiveColor + '33' }}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <MaterialCommunityIcons name="target" size={12} color={COLORS.objectiveColor} />
                        <Text style={[styles.hierarchyText, { color: COLORS.objectiveColor }]} numberOfLines={2}>
                          {obj.title}
                        </Text>
                        <MaterialCommunityIcons name="chevron-right" size={14} color={COLORS.textSecondary} />
                      </Pressable>

                      {objTacs.slice(0, 2).map((tac) => {
                        const tacTasks = tasks.filter((tk) => tk.tacticId === tac.id);
                        return (
                          <View key={tac.id}>

                            {/* Tactic → TacticDetail */}
                            <Pressable
                              style={({ pressed }) => [
                                styles.hierarchyRow, styles.hierarchyL3, styles.hierarchyRowTo,
                                pressed && { opacity: 0.55 },
                              ]}
                              onPress={() => nav.navigate('TacticDetail', { tacticId: tac.id, objectiveTitle: obj.title, objectiveId: obj.id, strategyTitle: strat.title, strategyId: strat.id, goalTitle: goal.title, goalId: goal.id })}
                              android_ripple={{ color: COLORS.tacticColor + '33' }}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <MaterialCommunityIcons name="tools" size={11} color={COLORS.tacticColor} />
                              <Text style={[styles.hierarchyText, { color: COLORS.tacticColor }]} numberOfLines={2}>
                                {tac.title}
                              </Text>
                              <MaterialCommunityIcons name="chevron-right" size={14} color={COLORS.textSecondary} />
                            </Pressable>

                            {/* Tasks → TacticDetail */}
                            {tacTasks.slice(0, 2).map((tk) => (
                              <Pressable
                                key={tk.id}
                                style={({ pressed }) => [
                                  styles.hierarchyRow, styles.hierarchyL4, styles.hierarchyRowTo,
                                  pressed && { opacity: 0.55 },
                                ]}
                                onPress={() => nav.navigate('TacticDetail', { tacticId: tac.id, objectiveTitle: obj.title, objectiveId: obj.id, strategyTitle: strat.title, strategyId: strat.id, goalTitle: goal.title, goalId: goal.id })}
                                android_ripple={{ color: COLORS.taskColor + '33' }}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                              >
                                <MaterialCommunityIcons
                                  name={tk.status === 'completed' ? 'checkbox-marked-outline' : 'checkbox-blank-outline'}
                                  size={11}
                                  color={COLORS.taskColor}
                                />
                                <Text
                                  style={[
                                    styles.hierarchyText,
                                    { color: COLORS.taskColor },
                                    tk.status === 'completed' && styles.hierarchyTextDone,
                                  ]}
                                  numberOfLines={2}
                                >
                                  {tk.title}
                                </Text>
                                <MaterialCommunityIcons name="chevron-right" size={14} color={COLORS.textSecondary} />
                              </Pressable>
                            ))}
                            {tacTasks.length > 2 && (
                              <Text style={[styles.hierarchyMore, { paddingLeft: 54 }]}>
                                +{tacTasks.length - 2} more tasks
                              </Text>
                            )}

                          </View>
                        );
                      })}
                      {objTacs.length > 2 && (
                        <Text style={[styles.hierarchyMore, { paddingLeft: 34 }]}>
                          +{objTacs.length - 2} more tactics
                        </Text>
                      )}
                    </View>
                  );
                })}
                {stratObjs.length > 2 && (
                  <Text style={[styles.hierarchyMore, { paddingLeft: 18 }]}>
                    +{stratObjs.length - 2} more objectives
                  </Text>
                )}
              </View>
            );
          })}
          {hierarchyExpanded && relStrats.length > 3 && (
            <Text style={styles.hierarchyMore}>+{relStrats.length - 3} more strategies</Text>
          )}
        </View>
      )}

    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const {
    goals, strategies, objectives, tactics, tasks,
    getDashboardStats, saveGoal, importTemplate,
  } = useGSOT();
  const stats = getDashboardStats();

  // ── Dynamic header: greeting + name on left, logo on right / centered ────────
  useLayoutEffect(() => {
    const h = new Date().getHours();
    const greet     = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    const firstName = user?.name?.split(' ')[0] || 'there';

    // AppHeader handles both mobile (logo right) and web (logo centered) layouts
    // via the `greeting` prop — no platform branching needed here.
    navigation.setOptions({
      header: () => (
        <AppHeader greeting={{ greet, firstName }} canGoBack={false} />
      ),
    });
  }, [navigation, user]);

  // ── Filter / sort state ─────────────────────────────────────────────────────
  const [search,       setSearch]       = useState('');
  const [showAll,      setShowAll]      = useState(false);
  const [sortValue,    setSortValue]    = useState('priority');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  // ── New-goal flow state ─────────────────────────────────────────────────────
  const [showChoiceModal, setShowChoiceModal]       = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showGoalForm, setShowGoalForm]             = useState(false);
  const [pickerCategoryId, setPickerCategoryId]     = useState(null); // null = category grid
  const [selectedTemplate, setSelectedTemplate]     = useState(null); // template to import
  const [importing, setImporting]                   = useState(false);

  // ── Derived data for template picker ───────────────────────────────────────
  const pickerTemplates = useMemo(() => {
    if (!pickerCategoryId) return [];
    return ALL_TEMPLATES.filter((t) => t.categoryId === pickerCategoryId);
  }, [pickerCategoryId]);

  const pickerCategory = useMemo(
    () => TEMPLATE_CATEGORIES.find((c) => c.id === pickerCategoryId) || null,
    [pickerCategoryId],
  );

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setShowTemplatePicker(false);
    setShowGoalForm(true);   // open goal form pre-filled
  };

  const handleGoalFormSave = async (formData) => {
    if (selectedTemplate) {
      // Import full hierarchy with custom goal overrides
      setImporting(true);
      try {
        await importTemplate(selectedTemplate, {
          title:       formData.title,
          description: formData.description,
          priority:    formData.priority,
          category:    formData.category,
          dueDate:     formData.dueDate,
        });
      } finally {
        setImporting(false);
        setSelectedTemplate(null);
      }
    } else {
      await saveGoal(formData);
    }
    setShowGoalForm(false);
  };

  const openBlankGoal = () => {
    setSelectedTemplate(null);
    setShowChoiceModal(false);
    setShowGoalForm(true);
  };

  const openTemplatePicker = () => {
    setPickerCategoryId(null);
    setShowChoiceModal(false);
    setShowTemplatePicker(true);
  };

  // ── Misc ───────────────────────────────────────────────────────────────────
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const overallPct = stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  const hiddenCount = goals.filter(
    (g) => g.status === 'completed' || g.status === 'cancelled'
  ).length;

  const filteredGoals = useMemo(() => {
    let list = goals;

    // 1. Hide completed / cancelled unless showAll
    if (!showAll) {
      list = list.filter((g) => g.status !== 'completed' && g.status !== 'cancelled');
    }

    // 2. Search
    const q = search.toLowerCase();
    if (q) {
      list = list.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          (g.description || '').toLowerCase().includes(q)
      );
    }

    // 3. Sort
    return [...list].sort((a, b) => {
      switch (sortValue) {
        case 'title_asc':    return a.title.localeCompare(b.title);
        case 'title_desc':   return b.title.localeCompare(a.title);
        case 'created_asc':  return new Date(a.createdAt) - new Date(b.createdAt);
        case 'created_desc': return new Date(b.createdAt) - new Date(a.createdAt);
        case 'progress': {
          const pa = tasks.filter((t) => {
            const tacIds = tactics.filter((tc) =>
              objectives.filter((o) =>
                strategies.filter((s) => s.goalId === a.id).map((s) => s.id).includes(o.strategyId)
              ).map((o) => o.id).includes(tc.objectiveId)
            ).map((tc) => tc.id);
            return tacIds.includes(t.tacticId);
          });
          const pb = tasks.filter((t) => {
            const tacIds = tactics.filter((tc) =>
              objectives.filter((o) =>
                strategies.filter((s) => s.goalId === b.id).map((s) => s.id).includes(o.strategyId)
              ).map((o) => o.id).includes(tc.objectiveId)
            ).map((tc) => tc.id);
            return tacIds.includes(t.tacticId);
          });
          const pctA = pa.length ? pa.filter((t) => t.status === 'completed').length / pa.length : 0;
          const pctB = pb.length ? pb.filter((t) => t.status === 'completed').length / pb.length : 0;
          return pctB - pctA;
        }
        case 'priority':
        default:
          return (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
      }
    });
  }, [goals, strategies, objectives, tactics, tasks, search, showAll, sortValue]);

  // GSOT_CONFIG for Goals
  const goalConfig = GSOT_CONFIG.goal;

  // ── Today's Focus ─────────────────────────────────────────────────────────
  const todayFocusItems = useMemo(() => {
    const items = [];
    const check = (arr, type, color, icon) => {
      arr.forEach((i) => {
        if (i.status === 'completed' || i.status === 'cancelled') return;
        const dueToday = i.dueDate && isDueToday(i.dueDate);
        const overdue = i.dueDate && isOverdue(i.dueDate);
        if (dueToday || overdue) {
          items.push({ ...i, _type: type, _color: color, _icon: icon, _overdue: overdue && !dueToday });
        }
      });
    };
    check(goals,       'goal',      COLORS.goalColor,      'flag');
    check(strategies,  'strategy',  COLORS.strategyColor,  'chess-knight');
    check(objectives,  'objective', COLORS.objectiveColor, 'target');
    check(tactics,     'tactic',    COLORS.tacticColor,    'tools');
    check(tasks,       'task',      COLORS.taskColor,      'checkbox-marked-outline');
    // Overdue first, then today's items
    return items.sort((a, b) => {
      if (a._overdue && !b._overdue) return -1;
      if (!a._overdue && b._overdue) return 1;
      return 0;
    });
  }, [goals, strategies, objectives, tactics, tasks]);

  const navigateTodayItem = (item) => {
    switch (item._type) {
      case 'goal':
        navigation.navigate('GoalDetail', { goalId: item.id });
        break;
      case 'strategy': {
        const stratGoal = goals.find((g) => g.id === item.goalId);
        navigation.navigate('StrategyDetail', {
          strategyId: item.id,
          goalTitle:  stratGoal?.title ?? '',
          goalId:     stratGoal?.id    ?? null,
        });
        break;
      }
      case 'objective': {
        const objStrat = strategies.find((s) => s.id === item.strategyId);
        const objGoal  = goals.find((g) => g.id === objStrat?.goalId);
        navigation.navigate('ObjectiveDetail', {
          objectiveId:   item.id,
          strategyTitle: objStrat?.title ?? '',
          strategyId:    objStrat?.id    ?? null,
          goalTitle:     objGoal?.title  ?? '',
          goalId:        objGoal?.id     ?? null,
        });
        break;
      }
      case 'tactic': {
        const tacObj   = objectives.find((o) => o.id === item.objectiveId);
        const tacStrat = strategies.find((s) => s.id === tacObj?.strategyId);
        const tacGoal  = goals.find((g) => g.id === tacStrat?.goalId);
        navigation.navigate('TacticDetail', {
          tacticId:       item.id,
          objectiveTitle: tacObj?.title   ?? '',
          objectiveId:    tacObj?.id      ?? null,
          strategyTitle:  tacStrat?.title ?? '',
          strategyId:     tacStrat?.id    ?? null,
          goalTitle:      tacGoal?.title  ?? '',
          goalId:         tacGoal?.id     ?? null,
        });
        break;
      }
      case 'task': {
        if (item.tacticId) {
          const taskTac   = tactics.find((t) => t.id === item.tacticId);
          const taskObj   = objectives.find((o) => o.id === taskTac?.objectiveId);
          const taskStrat = strategies.find((s) => s.id === taskObj?.strategyId);
          const taskGoal  = goals.find((g) => g.id === taskStrat?.goalId);
          navigation.navigate('TacticDetail', {
            tacticId:       item.tacticId,
            taskId:         item.id,
            objectiveTitle: taskObj?.title   ?? '',
            objectiveId:    taskObj?.id      ?? null,
            strategyTitle:  taskStrat?.title ?? '',
            strategyId:     taskStrat?.id    ?? null,
            goalTitle:      taskGoal?.title  ?? '',
            goalId:         taskGoal?.id     ?? null,
          });
        }
        break;
      }
      default:
        break;
    }
  };

  // ── Action Required ──────────────────────────────────────────────────────────
  const actionItems = useMemo(() => {
    const active = (i) => i.status !== 'completed' && i.status !== 'cancelled';
    return [
      ...goals.filter(active).filter((i) => i.dueDate && (isOverdue(i.dueDate) || isDueSoon(i.dueDate))).map((i) => ({ ...i, _type: 'goal' })),
      ...strategies.filter(active).filter((i) => i.dueDate && (isOverdue(i.dueDate) || isDueSoon(i.dueDate))).map((i) => ({ ...i, _type: 'strategy' })),
      ...objectives.filter(active).filter((i) => i.dueDate && (isOverdue(i.dueDate) || isDueSoon(i.dueDate))).map((i) => ({ ...i, _type: 'objective' })),
      ...tactics.filter(active).filter((i) => i.dueDate && (isOverdue(i.dueDate) || isDueSoon(i.dueDate))).map((i) => ({ ...i, _type: 'tactic' })),
      ...tasks.filter(active).filter((i) => i.dueDate && (isOverdue(i.dueDate) || isDueSoon(i.dueDate))).map((i) => ({ ...i, _type: 'task' })),
    ].sort((a, b) => {
      if (isOverdue(a.dueDate) && !isOverdue(b.dueDate)) return -1;
      if (!isOverdue(a.dueDate) && isOverdue(b.dueDate)) return 1;
      return a.dueDate.localeCompare(b.dueDate);
    });
  }, [goals, strategies, objectives, tactics, tasks]);

  const overdueCount = actionItems.filter((i) => isOverdue(i.dueDate)).length;

  const typeConfig = {
    goal:      { label: 'Goal',      color: COLORS.goalColor,      icon: GSOT_CONFIG.goal.icon },
    strategy:  { label: 'Strategy',  color: COLORS.strategyColor,  icon: GSOT_CONFIG.strategy.icon },
    objective: { label: 'Objective', color: COLORS.objectiveColor, icon: GSOT_CONFIG.objective.icon },
    tactic:    { label: 'Tactic',    color: COLORS.tacticColor,    icon: GSOT_CONFIG.tactic.icon },
    task:      { label: 'Task',      color: COLORS.taskColor,      icon: GSOT_CONFIG.task.icon },
  };

  return (
    <View style={{ flex: 1 }}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ── Overall Progress ── */}
      <View style={styles.overallCard}>
        <View style={styles.overallHeader}>
          <Text variant="titleMedium" style={styles.overallTitle}>Overall Progress</Text>
          <Text variant="headlineMedium" style={[styles.overallPct, { color: COLORS.primary }]}>
            {overallPct}%
          </Text>
        </View>
        <View style={styles.overallBarWrap}>
          <ProgressBar
            progress={overallPct / 100}
            color={COLORS.primary}
            style={styles.overallBar}
          />
        </View>
      </View>

      {/* ── Today's Focus ── */}
      <View style={styles.todayCard}>
        <View style={styles.todayHeader}>
          <MaterialCommunityIcons name="lightning-bolt" size={18} color={COLORS.accent} />
          <Text variant="titleSmall" style={styles.todayTitle}>Today's Focus</Text>
          {todayFocusItems.length > 0 && (
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>{todayFocusItems.length}</Text>
            </View>
          )}
        </View>
        {todayFocusItems.length === 0 ? (
          <View style={styles.todayEmpty}>
            <MaterialCommunityIcons name="check-circle-outline" size={28} color={COLORS.success} />
            <Text style={styles.todayEmptyText}>You're all caught up! Nothing overdue or due today.</Text>
          </View>
        ) : (
          <>
            {todayFocusItems.slice(0, 5).map((item, idx) => (
              <TouchableOpacity
                key={`today-${item._type}-${item.id}`}
                style={[styles.todayRow, idx === todayFocusItems.slice(0, 5).length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => navigateTodayItem(item)}
                activeOpacity={0.8}
              >
                <View style={[styles.todayTypeTag, { backgroundColor: item._color + '20' }]}>
                  <MaterialCommunityIcons name={item._icon} size={11} color={item._color} />
                </View>
                <View style={styles.todayItemMain}>
                  <Text style={styles.todayItemTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={[styles.todayItemSub, { color: item._overdue ? COLORS.error : COLORS.textSecondary }]}>
                    {item._overdue ? 'Overdue' : 'Due today'} · {item._type}
                  </Text>
                </View>
                {item._overdue && (
                  <MaterialCommunityIcons name="alert-circle-outline" size={15} color={COLORS.error} />
                )}
                <MaterialCommunityIcons name="chevron-right" size={15} color={COLORS.textSecondary} />
              </TouchableOpacity>
            ))}
            {todayFocusItems.length > 5 && (
              <Text style={styles.todayMore}>+{todayFocusItems.length - 5} more items</Text>
            )}
          </>
        )}
      </View>

      {/* ── Action Required ── */}
      <View style={styles.actionCard}>
        <View style={styles.actionCardHeader}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={18}
            color={overdueCount > 0 ? COLORS.error : COLORS.warning}
          />
          <Text variant="titleSmall" style={[styles.actionCardTitle, { color: overdueCount > 0 ? COLORS.error : COLORS.warning }]}>
            Action Required
          </Text>
          {actionItems.length > 0 && (
            <View style={[styles.actionCardBadge, { backgroundColor: (overdueCount > 0 ? COLORS.error : COLORS.warning) + '22' }]}>
              <Text style={[styles.actionCardBadgeText, { color: overdueCount > 0 ? COLORS.error : COLORS.warning }]}>
                {actionItems.length}
              </Text>
            </View>
          )}
        </View>

        {overdueCount > 0 && (
          <View style={styles.overdueAlert}>
            <MaterialCommunityIcons name="alert" size={14} color={COLORS.error} />
            <Text style={styles.overdueAlertText}>
              {overdueCount} {overdueCount === 1 ? 'item is' : 'items are'} overdue
            </Text>
          </View>
        )}

        {actionItems.length === 0 ? (
          <View style={styles.allClearRow}>
            <MaterialCommunityIcons name="check-circle-outline" size={26} color={COLORS.success} />
            <Text style={styles.allClearText}>All clear — nothing overdue or due within 7 days.</Text>
          </View>
        ) : (
          actionItems.map((item, idx) => {
            const tc = typeConfig[item._type] || typeConfig.task;
            return (
              <ActionRow
                key={`${item._type}-${item.id}-${idx}`}
                item={item}
                typeLabel={tc.label}
                typeColor={tc.color}
                typeIcon={tc.icon}
                onPress={() => navigateTodayItem(item)}
              />
            );
          })
        )}
      </View>

      {/* ── Summary header ── */}
      <View style={styles.sectionHeader}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Summary</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.newGoalBtn} onPress={() => setShowChoiceModal(true)}>
          <MaterialCommunityIcons name="plus" size={14} color="#fff" />
          <Text style={styles.newGoalBtnText}>New Goal</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search bar ── */}
      <Searchbar
        placeholder="Search goals..."
        value={search}
        onChangeText={setSearch}
        style={styles.dashSearch}
        inputStyle={{ fontSize: 13 }}
      />

      {/* ── Filter / sort toolbar ── */}
      <View style={styles.toolbar}>
        {/* Show-all checkbox */}
        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => setShowAll((v) => !v)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, showAll && styles.checkboxChecked]}>
            {showAll && <MaterialCommunityIcons name="check" size={11} color="#fff" />}
          </View>
          <RNText style={styles.toggleLabel}>
            Show completed / cancelled
            {!showAll && hiddenCount > 0
              ? <RNText style={styles.hiddenBadge}> ({hiddenCount} hidden)</RNText>
              : null}
          </RNText>
        </TouchableOpacity>

        {/* Sort picker */}
        <Menu
          visible={sortMenuOpen}
          onDismiss={() => setSortMenuOpen(false)}
          anchor={
            <TouchableOpacity
              style={styles.sortBtn}
              onPress={() => setSortMenuOpen(true)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={SORT_OPTIONS.find((s) => s.value === sortValue)?.icon}
                size={15}
                color={COLORS.primary}
              />
              <RNText style={styles.sortBtnLabel}>
                {SORT_OPTIONS.find((s) => s.value === sortValue)?.label}
              </RNText>
              <MaterialCommunityIcons name="chevron-down" size={13} color={COLORS.primary} />
            </TouchableOpacity>
          }
        >
          {SORT_OPTIONS.map((opt) => (
            <Menu.Item
              key={opt.value}
              onPress={() => { setSortValue(opt.value); setSortMenuOpen(false); }}
              title={opt.label}
              leadingIcon={sortValue === opt.value ? 'check' : opt.icon}
              titleStyle={[
                styles.menuItem,
                sortValue === opt.value && { color: COLORS.primary, fontWeight: '700' },
              ]}
            />
          ))}
        </Menu>
      </View>

      {/* ── Goal cards ── */}
      {filteredGoals.length === 0 ? (
        <View style={styles.emptyGoals}>
          <MaterialCommunityIcons name="flag-outline" size={36} color={COLORS.textSecondary} />
          <Text variant="bodyMedium" style={styles.emptyText}>
            {search
              ? 'No goals match your search'
              : !showAll && hiddenCount > 0
              ? 'All goals are completed or cancelled'
              : 'No goals yet'}
          </Text>
        </View>
      ) : (
        filteredGoals.map((goal) => (
          <GoalSummaryCard
            key={goal.id}
            goal={goal}
            strategies={strategies}
            objectives={objectives}
            tactics={tactics}
            tasks={tasks}
            onPress={() => navigation.navigate('GoalDetail', { goalId: goal.id })}
          />
        ))
      )}

      {/* ── Quick Start ── */}
      {stats.totalGoals === 0 && (
        <View style={styles.quickStartCard}>
          <MaterialCommunityIcons name="rocket-launch-outline" size={32} color={COLORS.accent} />
          <Text variant="titleMedium" style={styles.quickStartTitle}>Get Started</Text>
          <Text variant="bodyMedium" style={styles.quickStartText}>
            Create your first Goal to start building your GSOTiQ framework.
          </Text>
          <TouchableOpacity
            style={styles.quickStartBtn}
            onPress={() => navigation.navigate('GoalDetail', { goalId: null })}
          >
            <Text style={styles.quickStartBtnText}>Create Your First Goal →</Text>
          </TouchableOpacity>
        </View>
      )}

    </ScrollView>

    {/* ── FAB ── */}
    <TouchableOpacity style={styles.fab} onPress={() => setShowChoiceModal(true)}>
      <MaterialCommunityIcons name="plus" size={28} color="#fff" />
    </TouchableOpacity>

    {/* ══ Choice Modal ══════════════════════════════════════════════════════ */}
    <Modal visible={showChoiceModal} transparent animationType="fade" onRequestClose={() => setShowChoiceModal(false)}>
      <Pressable style={styles.overlay} onPress={() => setShowChoiceModal(false)}>
        <Pressable style={styles.choiceSheet} onPress={(e) => e.stopPropagation()}>
          <Text variant="titleLarge" style={styles.choiceTitle}>Create New Goal</Text>
          <Text variant="bodyMedium" style={styles.choiceSub}>Start from scratch or use a template</Text>

          <TouchableOpacity style={styles.choiceCard} onPress={openBlankGoal}>
            <View style={[styles.choiceIcon, { backgroundColor: COLORS.primary + '18' }]}>
              <MaterialCommunityIcons name="flag-plus-outline" size={28} color={COLORS.primary} />
            </View>
            <View style={styles.choiceText}>
              <Text variant="titleMedium" style={styles.choiceCardTitle}>Blank Goal</Text>
              <Text variant="bodySmall" style={styles.choiceCardSub}>Start with an empty goal and build your own strategy</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.choiceCard} onPress={openTemplatePicker}>
            <View style={[styles.choiceIcon, { backgroundColor: '#E67E22' + '18' }]}>
              <MaterialCommunityIcons name="file-document-multiple-outline" size={28} color="#E67E22" />
            </View>
            <View style={styles.choiceText}>
              <Text variant="titleMedium" style={styles.choiceCardTitle}>From Template</Text>
              <Text variant="bodySmall" style={styles.choiceCardSub}>Browse {ALL_TEMPLATES.length} expert-crafted templates across 10 categories</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.choiceCancel} onPress={() => setShowChoiceModal(false)}>
            <Text style={styles.choiceCancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>

    {/* ══ Template Picker Modal ═════════════════════════════════════════════ */}
    <Modal visible={showTemplatePicker} transparent animationType="slide" onRequestClose={() => setShowTemplatePicker(false)}>
      <View style={styles.pickerContainer}>
        {/* Header */}
        <View style={styles.pickerHeader}>
          {pickerCategoryId ? (
            <TouchableOpacity onPress={() => setPickerCategoryId(null)} style={styles.pickerBack}>
              <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} />
            </TouchableOpacity>
          ) : (
            <View style={styles.pickerBack} />
          )}
          <Text variant="titleMedium" style={styles.pickerTitle} numberOfLines={1}>
            {pickerCategory ? pickerCategory.label : 'Choose a Category'}
          </Text>
          <TouchableOpacity onPress={() => setShowTemplatePicker(false)} style={styles.pickerClose}>
            <MaterialCommunityIcons name="close" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.pickerContent}>
          {!pickerCategoryId ? (
            /* ── Category grid ── */
            <>
              <Text variant="bodySmall" style={styles.pickerHint}>
                Select a category to browse templates
              </Text>
              <View style={styles.catGrid}>
                {TEMPLATE_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={styles.catTile}
                    onPress={() => setPickerCategoryId(cat.id)}
                  >
                    <View style={[styles.catIconBox, { backgroundColor: cat.color + '18' }]}>
                      <MaterialCommunityIcons name={cat.icon} size={22} color={cat.color} />
                    </View>
                    <Text style={styles.catTileLabel} numberOfLines={2}>{cat.label}</Text>
                    <Text style={[styles.catTileCount, { color: cat.color }]}>
                      {cat.templateCount} templates
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.browseAllBtn}
                onPress={() => {
                  setShowTemplatePicker(false);
                  navigation.navigate('Library');
                }}
              >
                <MaterialCommunityIcons name="compass-outline" size={18} color={COLORS.primary} />
                <Text style={styles.browseAllText}>Browse Full Template Library</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            </>
          ) : (
            /* ── Template list for selected category ── */
            <>
              <Text variant="bodySmall" style={styles.pickerHint}>
                Tap a template to customize and import it
              </Text>
              {pickerTemplates.map((tmpl) => {
                const stratCount = (tmpl.strategies || []).length;
                const objCount   = (tmpl.strategies || []).reduce((n, s) => n + (s.objectives || []).length, 0);
                const tacCount   = (tmpl.strategies || []).reduce((n, s) =>
                  n + (s.objectives || []).reduce((m, o) => m + (o.tactics || []).length, 0), 0);
                const taskCount  = (tmpl.strategies || []).reduce((n, s) =>
                  n + (s.objectives || []).reduce((m, o) =>
                    m + (o.tactics || []).reduce((k, t) => k + (t.tasks || []).length, 0), 0), 0);

                return (
                  <TouchableOpacity
                    key={tmpl.id}
                    style={styles.tmplRow}
                    onPress={() => handleTemplateSelect(tmpl)}
                  >
                    <View style={styles.tmplMain}>
                      <Text style={styles.tmplTitle} numberOfLines={2}>{tmpl.title}</Text>
                      <Text style={styles.tmplDesc} numberOfLines={2}>{tmpl.description}</Text>
                      <View style={styles.tmplMeta}>
                        <View style={styles.tmplMetaChip}>
                          <MaterialCommunityIcons name={GSOT_CONFIG.strategy.icon} size={11} color={GSOT_CONFIG.strategy.color} />
                          <Text style={[styles.tmplMetaText, { color: GSOT_CONFIG.strategy.color }]}>{stratCount}</Text>
                        </View>
                        <View style={styles.tmplMetaChip}>
                          <MaterialCommunityIcons name={GSOT_CONFIG.objective.icon} size={11} color={GSOT_CONFIG.objective.color} />
                          <Text style={[styles.tmplMetaText, { color: GSOT_CONFIG.objective.color }]}>{objCount}</Text>
                        </View>
                        <View style={styles.tmplMetaChip}>
                          <MaterialCommunityIcons name={GSOT_CONFIG.tactic.icon} size={11} color={GSOT_CONFIG.tactic.color} />
                          <Text style={[styles.tmplMetaText, { color: GSOT_CONFIG.tactic.color }]}>{tacCount}</Text>
                        </View>
                        <View style={styles.tmplMetaChip}>
                          <MaterialCommunityIcons name={GSOT_CONFIG.task.icon} size={11} color={GSOT_CONFIG.task.color} />
                          <Text style={[styles.tmplMetaText, { color: GSOT_CONFIG.task.color }]}>{taskCount}</Text>
                        </View>
                      </View>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>

    {/* ══ Goal Form Modal (blank or pre-filled from template) ══════════════ */}
    <ItemFormModal
      visible={showGoalForm}
      onDismiss={() => { setShowGoalForm(false); setSelectedTemplate(null); }}
      onSave={handleGoalFormSave}
      item={selectedTemplate ? {
        title: selectedTemplate.title,
        description: selectedTemplate.description,
        priority: 'medium',
        status: 'not_started',
        category: selectedTemplate.categoryId || '',
      } : null}
      config={goalConfig}
      showCategory
    />

    {/* ── Importing overlay ── */}
    {importing && (
      <View style={styles.importingOverlay}>
        <View style={styles.importingCard}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.importingText}>Importing template…</Text>
        </View>
      </View>
    )}

    {/* Onboarding tour — auto-shows on first launch */}
    <OnboardingTour />

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content:   { padding: 16, paddingBottom: 40, flexDirection: 'column' },

  // Greeting
  greetingCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.primary, borderRadius: 16, padding: 20, marginBottom: 16,
  },
  greetingLeft: { flex: 1, marginRight: 12 },
  greetingText: { color: 'rgba(255,255,255,0.75)', marginBottom: 2 },
  greetingName: { color: '#fff', fontWeight: '800', flexShrink: 1 },
  greetingAppName: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginTop: 4 },

  // Overall progress
  overallCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 20,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4,
  },
  overallHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10, width: '100%',
  },
  overallTitle: { color: COLORS.text, fontWeight: '700', flex: 1 },
  overallPct:   { fontWeight: '800' },
  overallBarWrap:{ overflow: 'hidden', width: '100%' },
  overallBar:   { width: '100%', height: 10, borderRadius: 5 },

  // Today's Focus
  todayCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
  },
  // Action Required card
  actionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },
  actionCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  actionCardTitle: { fontWeight: '800', flex: 1 },
  actionCardBadge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  actionCardBadgeText: { fontSize: 11, fontWeight: '800' },
  overdueAlert: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.error + '12', borderRadius: 8,
    padding: 10, marginBottom: 12,
  },
  overdueAlertText: { color: COLORS.error, fontWeight: '700', fontSize: 13 },
  allClearRow: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  allClearText: { color: COLORS.textSecondary, textAlign: 'center', fontSize: 13 },
  todayHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  todayTitle: { fontWeight: '800', color: COLORS.text, flex: 1 },
  todayBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  todayBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  todayTypeTag: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  todayItemMain: { flex: 1 },
  todayItemTitle: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  todayItemSub: { fontSize: 10, marginTop: 1 },
  todayMore: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
  todayEmpty: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 4 },
  todayEmptyText: { flex: 1, fontSize: 13, color: COLORS.success, fontWeight: '500', lineHeight: 18 },

  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitle:  { color: COLORS.text, fontWeight: '700' },

  // Search + toolbar
  dashSearch: {
    marginBottom: 8,
    backgroundColor: COLORS.surface,
    elevation: 1,
    borderRadius: 10,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 2,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '44',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
  },
  checkbox: {
    width: 17,
    height: 17,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: COLORS.primary },
  toggleLabel: { fontSize: 12, color: COLORS.text, flexShrink: 1 },
  hiddenBadge: { color: COLORS.textSecondary, fontSize: 11 },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '14',
  },
  sortBtnLabel: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  menuItem: { fontSize: 14 },

  newGoalBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  newGoalBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  // Empty state
  emptyGoals: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText:  { color: COLORS.textSecondary },

  // Goal card
  goalCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 16,
    marginBottom: 12, borderLeftWidth: 4,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 5,
  },

  // Title row
  titleRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  goalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  titleWrap:    { flex: 1 },
  goalTitle:    { flex: 1, color: COLORS.text, fontWeight: '700', fontSize: 15, lineHeight: 20 },
  goalDesc:     { color: COLORS.textSecondary, lineHeight: 18, marginBottom: 10 },

  // Priority badge (sits in metaRow alongside status pill)
  priorityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, flexShrink: 0,
  },
  priorityText: { fontSize: 11, fontWeight: '700' },

  // Meta row (status + due date)
  metaRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusDot:  { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  metaItem:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:   { fontSize: 11, color: COLORS.textSecondary },

  // Progress bar
  progressRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  progressBarWrap:{ flex: 1, overflow: 'hidden' },
  progressBar:    { width: '100%', height: 7, borderRadius: 4 },
  progressPct:    { fontSize: 12, fontWeight: '700', width: 36, textAlign: 'right' },
  tasksCompleted: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 12 },

  // Counts grid — 2×2
  countsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  countCell: {
    flex: 1, minWidth: '44%',
    backgroundColor: COLORS.background, borderRadius: 10,
    padding: 10,
  },
  countHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  countIcon: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  countLabel:    { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  countFraction: { fontSize: 16, marginBottom: 6 },
  countSlash:    { color: COLORS.textSecondary, fontWeight: '400', fontSize: 14 },
  countBarWrap:  { overflow: 'hidden', width: '100%' },
  countBar:      { width: '100%', height: 4, borderRadius: 2 },

  // GSOT hierarchy quick-links
  hierarchySection: { marginTop: 12 },
  hierarchyToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6,
  },
  hierarchyDividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  hierarchyToggleLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600', letterSpacing: 0.3 },
  hierarchyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 5, paddingHorizontal: 4, borderRadius: 6,
  },
  hierarchyL2:      { paddingLeft: 20 },
  hierarchyL3:      { paddingLeft: 38 },
  hierarchyL4:      { paddingLeft: 54 },
  hierarchyText:    { flex: 1, fontSize: 12, fontWeight: '600' },
  hierarchyTextDone:{ textDecorationLine: 'line-through', opacity: 0.55 },
  hierarchyMore:    { fontSize: 11, color: COLORS.textSecondary, paddingVertical: 3, paddingLeft: 4 },

  // FAB
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6,
  },

  // Choice modal
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  choiceSheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36,
  },
  choiceTitle: { color: COLORS.text, fontWeight: '800', marginBottom: 4 },
  choiceSub:   { color: COLORS.textSecondary, marginBottom: 20 },
  choiceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.background, borderRadius: 14,
    padding: 16, marginBottom: 12,
  },
  choiceIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  choiceText: { flex: 1 },
  choiceCardTitle: { color: COLORS.text, fontWeight: '700', marginBottom: 2 },
  choiceCardSub:   { color: COLORS.textSecondary, lineHeight: 16 },
  choiceCancel: { alignItems: 'center', paddingTop: 8 },
  choiceCancelText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 15 },

  // Template picker modal
  pickerContainer: {
    flex: 1, backgroundColor: COLORS.surface,
    marginTop: 60, borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  pickerHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderColor: COLORS.border || '#eee',
  },
  pickerBack:  { width: 36, alignItems: 'flex-start' },
  pickerClose: { width: 36, alignItems: 'flex-end' },
  pickerTitle: { flex: 1, textAlign: 'center', fontWeight: '700', color: COLORS.text },
  pickerContent: { padding: 16, paddingBottom: 40 },
  pickerHint: { color: COLORS.textSecondary, marginBottom: 14 },

  // Category grid inside picker
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  catTile: {
    width: '47%', backgroundColor: COLORS.background,
    borderRadius: 14, padding: 14, alignItems: 'center', gap: 6,
  },
  catIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  catTileLabel: { color: COLORS.text, fontWeight: '700', fontSize: 12, textAlign: 'center' },
  catTileCount: { fontSize: 11, fontWeight: '600' },

  browseAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary + '12', borderRadius: 12,
    paddingVertical: 14, borderWidth: 1, borderColor: COLORS.primary + '30',
  },
  browseAllText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },

  // Template rows inside picker
  tmplRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.background, borderRadius: 12,
    padding: 14, marginBottom: 10,
  },
  tmplMain: { flex: 1 },
  tmplTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14, marginBottom: 3 },
  tmplDesc:  { color: COLORS.textSecondary, fontSize: 12, lineHeight: 16, marginBottom: 8 },
  tmplMeta:  { flexDirection: 'row', gap: 8 },
  tmplMetaChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tmplMetaText: { fontSize: 11, fontWeight: '600' },

  // Importing overlay
  importingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  importingCard: {
    backgroundColor: COLORS.surface, borderRadius: 16,
    padding: 28, alignItems: 'center', gap: 14,
  },
  importingText: { color: COLORS.text, fontWeight: '600', fontSize: 15 },

  // Quick start
  quickStartCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.accent + '44', borderStyle: 'dashed', marginTop: 8,
  },
  quickStartTitle:   { color: COLORS.text, fontWeight: '700', marginTop: 12, marginBottom: 8 },
  quickStartText:    { color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  quickStartBtn:     { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  quickStartBtnText: { color: '#fff', fontWeight: '700' },
});
