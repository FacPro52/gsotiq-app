import React, { useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { FAB, Searchbar, Menu, Text as PaperText } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGSOT } from '../../context/GSOTContext';
import { GSOT_CONFIG, COLORS } from '../../utils/theme';
import GSOTCard from '../../components/GSOTCard';
import EmptyState from '../../components/EmptyState';
import ItemFormModal from '../../components/ItemFormModal';
import { Text } from 'react-native';

const config = GSOT_CONFIG.goal;

const SORT_OPTIONS = [
  { value: 'created_desc', label: 'Newest first',   icon: 'sort-calendar-descending' },
  { value: 'created_asc',  label: 'Oldest first',   icon: 'sort-calendar-ascending'  },
  { value: 'title_asc',    label: 'Title A → Z',    icon: 'sort-alphabetical-ascending'  },
  { value: 'title_desc',   label: 'Title Z → A',    icon: 'sort-alphabetical-descending' },
  { value: 'priority',     label: 'Priority',        icon: 'sort-numeric-descending'  },
  { value: 'progress',     label: 'Progress',        icon: 'sort-numeric-ascending'   },
];

const PRIORITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };

export default function GoalsScreen({ navigation }) {
  const { goals, strategies, saveGoal, deleteGoal, getGoalProgress } = useGSOT();

  const [search,       setSearch]       = useState('');
  const [showAll,      setShowAll]      = useState(false);
  const [sortValue,    setSortValue]    = useState('created_desc');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem,  setEditingItem]  = useState(null);

  const handleQuickStatus = async (goal, newStatus) => {
    await saveGoal({ ...goal, status: newStatus });
  };
  const handleQuickPriority = async (goal, newPriority) => {
    await saveGoal({ ...goal, priority: newPriority });
  };

  const handleDelete = (goal) => {
    deleteGoal(goal.id);
  };

  const handleSave = async (data) => {
    await saveGoal({ ...editingItem, ...data });
    setModalVisible(false);
    setEditingItem(null);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setModalVisible(true);
  };

  const currentSort = SORT_OPTIONS.find((s) => s.value === sortValue);

  const filtered = useMemo(() => {
    let list = goals;

    // 1. Hide completed / cancelled unless showAll is on
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
    list = [...list].sort((a, b) => {
      switch (sortValue) {
        case 'title_asc':
          return a.title.localeCompare(b.title);
        case 'title_desc':
          return b.title.localeCompare(a.title);
        case 'priority':
          return (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2);
        case 'progress':
          return getGoalProgress(b.id) - getGoalProgress(a.id);
        case 'created_asc':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'created_desc':
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

    return list;
  }, [goals, search, showAll, sortValue]);

  const hiddenCount = goals.filter(
    (g) => g.status === 'completed' || g.status === 'cancelled'
  ).length;

  return (
    <View style={styles.container}>

      {/* ── Search bar ── */}
      <Searchbar
        placeholder="Search goals..."
        value={search}
        onChangeText={setSearch}
        style={styles.search}
        inputStyle={{ fontSize: 14 }}
      />

      {/* ── Filter / sort toolbar ── */}
      <View style={styles.toolbar}>

        {/* Show all toggle */}
        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => setShowAll((v) => !v)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, showAll && styles.checkboxChecked]}>
            {showAll && (
              <MaterialCommunityIcons name="check" size={12} color="#fff" />
            )}
          </View>
          <Text style={styles.toggleLabel}>
            Show completed / cancelled
            {!showAll && hiddenCount > 0 ? (
              <Text style={styles.hiddenBadge}> ({hiddenCount} hidden)</Text>
            ) : null}
          </Text>
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
                name={currentSort.icon}
                size={16}
                color={COLORS.primary}
              />
              <Text style={styles.sortBtnLabel}>{currentSort.label}</Text>
              <MaterialCommunityIcons name="chevron-down" size={14} color={COLORS.primary} />
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

      {/* ── List ── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const stratCount = strategies.filter((s) => s.goalId === item.id).length;
          return (
            <GSOTCard
              item={item}
              config={config}
              progress={getGoalProgress(item.id)}
              childCount={stratCount}
              childLabel={stratCount === 1 ? 'Strategy' : 'Strategies'}
              onStatusChange={handleQuickStatus}
              onPriorityChange={handleQuickPriority}
              onDelete={() => handleDelete(item)}
              onPress={() => navigation.navigate('GoalDetail', { goalId: item.id })}
              onLongPress={() =>
                Alert.alert(item.title, 'What do you want to do?', [
                  { text: 'Edit', onPress: () => openEdit(item) },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteGoal(item.id) },
                  { text: 'Cancel', style: 'cancel' },
                ])
              }
            />
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="flag-outline"
            title={search ? 'No matches' : showAll ? 'No Goals Yet' : 'No Active Goals'}
            subtitle={
              search
                ? 'Try a different search term.'
                : showAll
                ? 'Tap + to create your first goal.'
                : hiddenCount > 0
                ? 'All your goals are completed or cancelled. Check "Show completed / cancelled" to see them.'
                : 'Goals are broad primary outcomes you want to achieve. Tap + to create your first goal.'
            }
            actionLabel={search || (!showAll && hiddenCount > 0) ? undefined : 'Add Goal'}
            onAction={() => { setEditingItem(null); setModalVisible(true); }}
            color={config.color}
          />
        }
        contentContainerStyle={filtered.length === 0 ? styles.emptyList : styles.list}
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: config.color }]}
        color="#fff"
        onPress={() => { setEditingItem(null); setModalVisible(true); }}
      />

      <ItemFormModal
        visible={modalVisible}
        onDismiss={() => { setModalVisible(false); setEditingItem(null); }}
        onSave={handleSave}
        item={editingItem}
        config={config}
        showCategory
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  search: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: COLORS.surface,
    elevation: 1,
  },

  // Toolbar row
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '44',
    marginBottom: 4,
  },

  // Show-all checkbox + label
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
  },
  toggleLabel: {
    fontSize: 13,
    color: COLORS.text,
    flexShrink: 1,
  },
  hiddenBadge: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },

  // Sort button
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '14',
  },
  sortBtnLabel: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  menuItem: { fontSize: 14 },

  list:      { paddingBottom: 100 },
  emptyList: { flexGrow: 1 },
  fab:       { position: 'absolute', right: 16, bottom: 24 },
});
