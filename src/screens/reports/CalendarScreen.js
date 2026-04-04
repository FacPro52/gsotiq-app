import React, { useState, useMemo } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGSOT } from '../../context/GSOTContext';
import { COLORS } from '../../utils/theme';
import { isOverdue, formatDate } from '../../utils/recurrence';

// ─── Constants ─────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TYPE_CONFIG = {
  goal:      { label: 'Goal',      color: COLORS.goalColor,      icon: 'flag' },
  strategy:  { label: 'Strategy',  color: COLORS.strategyColor,  icon: 'chess-knight' },
  objective: { label: 'Objective', color: COLORS.objectiveColor, icon: 'target' },
  tactic:    { label: 'Tactic',    color: COLORS.tacticColor,    icon: 'tools' },
  task:      { label: 'Task',      color: COLORS.taskColor,      icon: 'checkbox-marked-outline' },
};

// Max inline entries shown per cell before "+N more"
const MAX_CELL_ENTRIES = 3;

// ─── Helpers ────────────────────────────────────────────────────────────────────

const toDateKey = (dateStr) => dateStr ? dateStr.split('T')[0] : null;

const makeDayKey = (year, month, day) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

// ─── Sub-components ────────────────────────────────────────────────────────────

function ItemRow({ item, onPress }) {
  const tc = TYPE_CONFIG[item._type] || TYPE_CONFIG.task;
  const completed = item.status === 'completed';
  const overdue = item.dueDate && isOverdue(item.dueDate) && !completed;
  return (
    <TouchableOpacity style={styles.itemRow} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.itemTypeTag, { backgroundColor: tc.color + '20' }]}>
        <MaterialCommunityIcons name={tc.icon} size={11} color={tc.color} />
        <Text style={[styles.itemTypeText, { color: tc.color }]}>{tc.label}</Text>
      </View>
      <View style={styles.itemMain}>
        <Text style={[styles.itemTitle, completed && styles.itemTitleDone]} numberOfLines={2}>
          {item.title}
        </Text>
        {overdue && <Text style={styles.overdueText}>Overdue</Text>}
      </View>
      {completed ? (
        <MaterialCommunityIcons name="check-circle" size={16} color={COLORS.success} />
      ) : (
        <MaterialCommunityIcons name="chevron-right" size={16} color={COLORS.textSecondary} />
      )}
    </TouchableOpacity>
  );
}

// Small inline entry pill shown inside each calendar day cell
function CellEntry({ item, onPress }) {
  const tc = TYPE_CONFIG[item._type] || TYPE_CONFIG.task;
  const overdue = item.dueDate && isOverdue(item.dueDate) && item.status !== 'completed';
  const color = overdue ? COLORS.error : tc.color;
  return (
    <TouchableOpacity
      style={[styles.cellEntry, { backgroundColor: color + '22' }]}
      onPress={onPress}
      activeOpacity={0.65}
    >
      <MaterialCommunityIcons
        name={tc.icon}
        size={7}
        color={color}
        style={{ flexShrink: 0 }}
      />
      <Text
        style={[styles.cellEntryText, { color }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {item.title}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────────

export default function CalendarScreen({ navigation }) {
  const { goals, strategies, objectives, tactics, tasks } = useGSOT();
  const { width: screenWidth } = useWindowDimensions();

  const todayDate = new Date();
  const todayKey  = formatDate(todayDate);

  const [year,        setYear]        = useState(todayDate.getFullYear());
  const [month,       setMonth]       = useState(todayDate.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);

  // Cap calendar card width on wide screens (desktop/tablet)
  const isWide    = screenWidth > 600;
  const calWidth  = isWide ? Math.min(screenWidth * 0.6875, 700) : screenWidth - 32;

  // ── Build a date → items map ──────────────────────────────────────────────
  const itemsByDate = useMemo(() => {
    const map = {};
    const add = (item, type) => {
      const key = toDateKey(item.dueDate);
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push({ ...item, _type: type });
    };
    goals.forEach((g)      => add(g, 'goal'));
    strategies.forEach((s) => add(s, 'strategy'));
    objectives.forEach((o) => add(o, 'objective'));
    tactics.forEach((t)    => add(t, 'tactic'));
    tasks.forEach((t)      => add(t, 'task'));
    return map;
  }, [goals, strategies, objectives, tactics, tasks]);

  // ── Calendar grid ──────────────────────────────────────────────────────────
  const calGrid = useMemo(() => {
    const firstDow    = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = Array(firstDow).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  // Items due this month (for upcoming list)
  const monthItems = useMemo(() => {
    const result = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const key = makeDayKey(year, month, d);
      (itemsByDate[key] || []).forEach((item) => result.push({ ...item, _dayKey: key, _day: d }));
    }
    return result;
  }, [itemsByDate, year, month]);

  const prevMonth = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
    setSelectedDay(null);
  };
  const goToToday = () => {
    setYear(todayDate.getFullYear());
    setMonth(todayDate.getMonth());
    setSelectedDay(null);
  };

  const selectedKey   = selectedDay ? makeDayKey(year, month, selectedDay) : null;
  const selectedItems = selectedKey ? (itemsByDate[selectedKey] || []) : [];

  const navigateToItem = (item) => {
    setSelectedDay(null);
    switch (item._type) {
      case 'goal':
        navigation.navigate('GoalsTabs', { screen: 'GoalDetail', params: { goalId: item.id } }); break;
      case 'strategy':
        navigation.navigate('GoalsTabs', { screen: 'StrategyDetail', params: { strategyId: item.id, goalTitle: '' } }); break;
      case 'objective':
        navigation.navigate('GoalsTabs', { screen: 'ObjectiveDetail', params: { objectiveId: item.id, strategyTitle: '' } }); break;
      case 'tactic':
        navigation.navigate('GoalsTabs', { screen: 'TacticDetail', params: { tacticId: item.id, objectiveTitle: '' } }); break;
      default: break;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[
        styles.scroll,
        isWide && styles.scrollWide,
      ]}>

        {/* ── Month navigation ─────────────────────────────────────────── */}
        <View style={[styles.monthNavCard, isWide && { width: calWidth, alignSelf: 'center' }]}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn} hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}>
            <MaterialCommunityIcons name="chevron-left" size={28} color={COLORS.primary} />
          </TouchableOpacity>
          <View style={styles.monthCenter}>
            <Text variant="titleLarge" style={styles.monthText}>
              {MONTH_NAMES[month]} {year}
            </Text>
            <Text style={styles.monthSub}>
              {monthItems.length} item{monthItems.length !== 1 ? 's' : ''} due this month
            </Text>
          </View>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn} hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}>
            <MaterialCommunityIcons name="chevron-right" size={28} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* ── Today button ─────────────────────────────────────────────── */}
        {(year !== todayDate.getFullYear() || month !== todayDate.getMonth()) && (
          <TouchableOpacity style={styles.todayBtn} onPress={goToToday} activeOpacity={0.8}>
            <MaterialCommunityIcons name="calendar-today" size={14} color={COLORS.primary} />
            <Text style={styles.todayBtnText}>Back to Today</Text>
          </TouchableOpacity>
        )}

        {/* ── Calendar grid ─────────────────────────────────────────────── */}
        <View style={[styles.calCard, isWide && { width: calWidth, alignSelf: 'center' }]}>
          {/* Day of week headers */}
          <View style={styles.dowRow}>
            {DAY_ABBR.map((d) => (
              <Text key={d} style={styles.dowText}>{d}</Text>
            ))}
          </View>

          {/* Day cells */}
          <View style={styles.grid}>
            {calGrid.map((day, idx) => {
              if (!day) return <View key={`empty-${idx}`} style={styles.emptyCell} />;
              const key      = makeDayKey(year, month, day);
              const items    = itemsByDate[key] || [];
              const isToday  = key === todayKey;
              const isSel    = day === selectedDay;
              const overflow = items.length > MAX_CELL_ENTRIES ? items.length - MAX_CELL_ENTRIES : 0;
              const visible  = items.slice(0, MAX_CELL_ENTRIES);

              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.cell,
                    isToday && styles.todayCell,
                    isSel   && styles.selectedCell,
                  ]}
                  onPress={() => setSelectedDay(day === selectedDay ? null : day)}
                  activeOpacity={0.7}
                >
                  {/* Date number */}
                  <Text style={[
                    styles.dayNum,
                    isToday && styles.todayNum,
                    isSel   && styles.selectedNum,
                  ]}>
                    {day}
                  </Text>

                  {/* Inline entry pills */}
                  {visible.map((item, i) => (
                    <CellEntry
                      key={`${item._type}-${item.id}-${i}`}
                      item={item}
                      onPress={() => navigateToItem(item)}
                    />
                  ))}

                  {/* Overflow badge */}
                  {overflow > 0 && (
                    <Text style={styles.overflowText}>+{overflow}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Color legend ─────────────────────────────────────────────── */}
        <View style={[styles.legendCard, isWide && { width: calWidth, alignSelf: 'center' }]}>
          {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
            <View key={type} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: cfg.color }]} />
              <Text style={styles.legendLabel}>{cfg.label}</Text>
            </View>
          ))}
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.error, borderRadius: 3 }]} />
            <Text style={styles.legendLabel}>Overdue</Text>
          </View>
        </View>

        {/* ── Selected day detail ───────────────────────────────────────── */}
        {selectedDay !== null && (
          <View style={[styles.detailCard, isWide && { width: calWidth, alignSelf: 'center' }]}>
            <View style={styles.detailHeader}>
              <MaterialCommunityIcons name="calendar-check-outline" size={18} color={COLORS.primary} />
              <Text variant="titleMedium" style={styles.detailTitle}>
                {MONTH_NAMES[month]} {selectedDay}
              </Text>
            </View>
            {selectedItems.length === 0 ? (
              <Text style={styles.emptyText}>Nothing due on this day.</Text>
            ) : (
              selectedItems.map((item, idx) => (
                <ItemRow
                  key={`${item._type}-${item.id}-${idx}`}
                  item={item}
                  onPress={() => navigateToItem(item)}
                />
              ))
            )}
          </View>
        )}

        {/* ── Upcoming this month ───────────────────────────────────────── */}
        <View style={[styles.upcomingCard, isWide && { width: calWidth, alignSelf: 'center' }]}>
          <View style={styles.upcomingHeader}>
            <MaterialCommunityIcons name="calendar-month-outline" size={18} color={COLORS.primary} />
            <Text variant="titleMedium" style={styles.upcomingTitle}>
              Upcoming in {MONTH_NAMES[month]}
            </Text>
          </View>

          {monthItems.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={40} color={COLORS.border} />
              <Text style={styles.emptyStateText}>No due dates set for this month.</Text>
              <Text style={styles.emptyStateHint}>
                Add due dates to your goals, tactics, and tasks to see them on the calendar.
              </Text>
            </View>
          ) : (
            monthItems.slice(0, 30).map((item, idx) => {
              const tc        = TYPE_CONFIG[item._type] || TYPE_CONFIG.task;
              const completed = item.status === 'completed';
              const overdue   = item.dueDate && isOverdue(item.dueDate) && !completed;
              return (
                <TouchableOpacity
                  key={`upcoming-${item._type}-${item.id}-${idx}`}
                  style={styles.upcomingRow}
                  onPress={() => navigateToItem(item)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.dayBadge, { backgroundColor: tc.color }]}>
                    <Text style={styles.dayBadgeNum}>{item._day}</Text>
                  </View>
                  <View style={styles.upcomingMain}>
                    <Text
                      style={[styles.upcomingItemTitle, completed && styles.itemTitleDone]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <View style={styles.upcomingMeta}>
                      <MaterialCommunityIcons name={tc.icon} size={10} color={tc.color} />
                      <Text style={[styles.upcomingType, { color: tc.color }]}>{tc.label}</Text>
                      {overdue && <Text style={styles.overdueText}>· Overdue</Text>}
                    </View>
                  </View>
                  {completed ? (
                    <MaterialCommunityIcons name="check-circle" size={18} color={COLORS.success} />
                  ) : (
                    <MaterialCommunityIcons name="chevron-right" size={16} color={COLORS.textSecondary} />
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const CARD = {
  backgroundColor: COLORS.surface,
  borderRadius: 16,
  marginHorizontal: 16,
  marginTop: 12,
  elevation: 2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.07,
  shadowRadius: 6,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll:     { paddingTop: 8 },
  scrollWide: { alignItems: 'stretch' },

  // Month nav
  monthNavCard: {
    ...CARD,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  navBtn:      { padding: 4 },
  monthCenter: { flex: 1, alignItems: 'center' },
  monthText:   { fontWeight: '800', color: COLORS.primary },
  monthSub:    { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

  // Today button
  todayBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'center', marginTop: 8,
    paddingHorizontal: 12, paddingVertical: 5,
    backgroundColor: COLORS.primary + '15', borderRadius: 20,
  },
  todayBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },

  // Calendar card
  calCard:  { ...CARD, padding: 10 },
  dowRow:   { flexDirection: 'row', marginBottom: 4 },
  dowText:  {
    flex: 1, textAlign: 'center', fontSize: 10,
    fontWeight: '700', color: COLORS.textSecondary, paddingBottom: 4,
  },

  grid:      { flexDirection: 'row', flexWrap: 'wrap' },
  emptyCell: { width: '14.28%', minHeight: 44 },

  cell: {
    width: '14.28%',
    minHeight: 44,
    alignItems: 'stretch',       // entries fill cell width
    justifyContent: 'flex-start',
    paddingTop: 4,
    paddingHorizontal: 2,
    paddingBottom: 4,
    borderRadius: 6,
    position: 'relative',
  },
  todayCell:   { backgroundColor: COLORS.primary + '15' },
  selectedCell: {
    backgroundColor: COLORS.primary + '20',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  dayNum:      { fontSize: 12, fontWeight: '500', color: COLORS.text, textAlign: 'center', marginBottom: 2 },
  todayNum:    { color: COLORS.primary, fontWeight: '800' },
  selectedNum: { color: COLORS.primary, fontWeight: '700' },

  // Inline entry pill inside each cell
  cellEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: 3,
    paddingHorizontal: 2,
    paddingVertical: 1,
    marginBottom: 1,
    overflow: 'hidden',
  },
  cellEntryText: {
    fontSize: 8,
    fontWeight: '600',
    flexShrink: 1,
    lineHeight: 10,
  },

  overflowText: {
    fontSize: 8,
    color: COLORS.textSecondary,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 1,
  },

  // Legend
  legendCard: {
    ...CARD,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:   { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600' },

  // Selected day detail
  detailCard:   { ...CARD, padding: 16 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  detailTitle:  { fontWeight: '800', color: COLORS.primary },

  // Item row (selected day + upcoming)
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  itemTypeTag: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, flexShrink: 0,
  },
  itemTypeText: { fontSize: 9, fontWeight: '700' },
  itemMain:     { flex: 1 },
  itemTitle:    { fontSize: 13, fontWeight: '600', color: COLORS.text },
  itemTitleDone:{ textDecorationLine: 'line-through', color: COLORS.textSecondary },
  overdueText:  { fontSize: 10, color: COLORS.error, fontWeight: '700', marginTop: 2 },

  // Upcoming
  upcomingCard:   { ...CARD, padding: 16 },
  upcomingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  upcomingTitle:  { fontWeight: '800', color: COLORS.text },
  upcomingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  dayBadge: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  dayBadgeNum:       { color: '#fff', fontWeight: '800', fontSize: 13 },
  upcomingMain:      { flex: 1 },
  upcomingItemTitle: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
  upcomingMeta:      { flexDirection: 'row', alignItems: 'center', gap: 3 },
  upcomingType:      { fontSize: 10, fontWeight: '700' },

  // Empty states
  emptyText: {
    color: COLORS.textSecondary, fontSize: 13,
    fontStyle: 'italic', paddingVertical: 10, textAlign: 'center',
  },
  emptyState:     { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyStateText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 14 },
  emptyStateHint: {
    color: COLORS.textSecondary, fontSize: 12,
    textAlign: 'center', lineHeight: 18, paddingHorizontal: 8,
  },
});
