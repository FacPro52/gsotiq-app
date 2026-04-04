import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Text, Searchbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  TEMPLATE_CATEGORIES,
  ALL_TEMPLATES,
  getTemplatesByCategory,
  searchTemplates,
} from '../../data/personalTemplates';
import { COLORS } from '../../utils/theme';

// Pre-compute counts so CategoryCard never needs to recompute
const CATEGORY_COUNTS = Object.fromEntries(
  TEMPLATE_CATEGORIES.map((c) => [c.id, getTemplatesByCategory(c.id).length])
);

// ─── Category card (main grid) ───────────────────────────────────────────────
function CategoryCard({ category, onPress }) {
  const count = CATEGORY_COUNTS[category.id] ?? 0;
  return (
    <TouchableOpacity
      style={[styles.catCard, { borderTopColor: category.color }]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={[styles.catIcon, { backgroundColor: category.color + '18' }]}>
        <MaterialCommunityIcons name={category.icon} size={26} color={category.color} />
      </View>
      <Text variant="titleSmall" style={styles.catLabel} numberOfLines={2}>
        {category.label}
      </Text>
      <Text variant="bodySmall" style={styles.catDesc} numberOfLines={2}>
        {category.description}
      </Text>
      <View style={styles.catFooter}>
        <MaterialCommunityIcons name="flag-outline" size={12} color={category.color} />
        <Text variant="labelSmall" style={[styles.catCount, { color: category.color }]}>
          {count} {count === 1 ? 'template' : 'templates'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Template row ─────────────────────────────────────────────────────────────
function TemplateRow({ template, onPress }) {
  const cat = TEMPLATE_CATEGORIES.find((c) => c.id === template.categoryId);
  const stratCount = template.strategies.length;
  const objCount = template.strategies.reduce((a, s) => a + s.objectives.length, 0);
  const tacticCount = template.strategies.reduce(
    (a, s) => a + s.objectives.reduce((b, o) => b + o.tactics.length, 0), 0
  );
  return (
    <Pressable style={({ pressed }) => [styles.templateRow, pressed && { opacity: 0.75 }]} onPress={onPress}>
      <View style={[styles.templateAccent, { backgroundColor: cat?.color || COLORS.primary }]} />
      <View style={styles.templateContent}>
        <Text variant="titleSmall" style={styles.templateTitle} numberOfLines={2}>
          {template.title}
        </Text>
        <Text variant="bodySmall" style={styles.templateDesc} numberOfLines={2}>
          {template.description}
        </Text>
        <View style={styles.templateMeta}>
          {[
            { label: `${stratCount} strategies`, icon: 'chess-knight' },
            { label: `${objCount} objectives`, icon: 'target' },
            { label: `${tacticCount} tactics`, icon: 'tools' },
          ].map((item) => (
            <View key={item.label} style={styles.metaChip}>
              <MaterialCommunityIcons name={item.icon} size={11} color={COLORS.textSecondary} />
              <Text variant="labelSmall" style={styles.metaText}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textSecondary} />
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { id: 'category', label: 'By Category' },
  { id: 'az', label: 'A → Z' },
  { id: 'za', label: 'Z → A' },
];

function sortTemplates(templates, sortId) {
  if (sortId === 'az') return [...templates].sort((a, b) => a.title.localeCompare(b.title));
  if (sortId === 'za') return [...templates].sort((a, b) => b.title.localeCompare(a.title));
  // 'category': group by category order, then by title within each group
  const catOrder = Object.fromEntries(TEMPLATE_CATEGORIES.map((c, i) => [c.id, i]));
  return [...templates].sort((a, b) => {
    const catDiff = (catOrder[a.categoryId] ?? 99) - (catOrder[b.categoryId] ?? 99);
    return catDiff !== 0 ? catDiff : a.title.localeCompare(b.title);
  });
}

export default function TemplatesScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [sortId, setSortId] = useState('category');
  const scrollRef = useRef(null);

  const isSearching = search.trim().length > 0;

  const isCategoryView = !isSearching && selectedCategory !== null;
  const isMainView = !isSearching && selectedCategory === null;

  // Derive a stable key for each mode so the ScrollView remounts (and resets
  // scroll to 0) any time the mode changes. This is more reliable than calling
  // scrollTo on React Native Web.
  const scrollKey = isSearching ? 'search' : isCategoryView ? `cat-${selectedCategory}` : 'main';

  const activeCat = selectedCategory
    ? TEMPLATE_CATEGORIES.find((c) => c.id === selectedCategory)
    : null;

  const searchResults = useMemo(
    () => (isSearching ? searchTemplates(search) : []),
    [search, isSearching]
  );

  const categoryTemplates = useMemo(
    () => (selectedCategory ? getTemplatesByCategory(selectedCategory) : []),
    [selectedCategory]
  );

  return (
    <View style={styles.container}>
      {/* ── Search bar (always pinned at top) ── */}
      <Searchbar
        mode="bar"
        placeholder="Search templates…"
        value={search}
        onChangeText={(t) => {
          setSearch(t);
          setSelectedCategory(null);
        }}
        onClearIconPress={() => {
          setSearch('');
          setSelectedCategory(null);
        }}
        style={styles.search}
        inputStyle={{ fontSize: 14 }}
      />

      <ScrollView
        key={scrollKey}
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >

        {/* ══ EXACTLY ONE SECTION RENDERS AT A TIME ══ */}
        {isSearching ? (

          /* ── Search results ── */
          <>
            <Text variant="bodySmall" style={styles.searchLabel}>
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{search.trim()}"
            </Text>
            {searchResults.length === 0 ? (
              <View style={styles.empty}>
                <MaterialCommunityIcons name="book-search-outline" size={40} color={COLORS.textSecondary} />
                <Text variant="bodyMedium" style={styles.emptyText}>No templates found</Text>
              </View>
            ) : (
              searchResults.map((item) => (
                <TemplateRow
                  key={item.id}
                  template={item}
                  onPress={() => navigation.push('TemplateDetail', { templateId: item.id })}
                />
              ))
            )}
          </>

        ) : isCategoryView && activeCat ? (

          /* ── Category detail ── */
          <>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setSelectedCategory(null)}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons name="arrow-left" size={18} color={COLORS.primary} />
              <Text style={styles.backText}>Template Library</Text>
            </TouchableOpacity>

            <View style={[styles.catDetailHeader, { borderLeftColor: activeCat.color }]}>
              <View style={[styles.catDetailIcon, { backgroundColor: activeCat.color + '18' }]}>
                <MaterialCommunityIcons name={activeCat.icon} size={24} color={activeCat.color} />
              </View>
              <View style={styles.catDetailInfo}>
                <Text variant="titleLarge" style={[styles.catDetailTitle, { color: activeCat.color }]}>
                  {activeCat.label}
                </Text>
                <Text variant="bodySmall" style={styles.catDetailDesc}>
                  {activeCat.description}
                </Text>
                <Text variant="labelSmall" style={[styles.catDetailCount, { color: activeCat.color }]}>
                  {categoryTemplates.length} template{categoryTemplates.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>

            {categoryTemplates.map((item) => (
              <TemplateRow
                key={item.id}
                template={item}
                onPress={() => navigation.push('TemplateDetail', { templateId: item.id })}
              />
            ))}
          </>

        ) : (

          /* ── Main view: browse grid + all templates ── */
          <>
            <Text variant="titleMedium" style={styles.sectionTitle}>Browse by Category</Text>
            <View style={styles.catGrid}>
              {TEMPLATE_CATEGORIES.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  onPress={() => setSelectedCategory(cat.id)}
                />
              ))}
            </View>

            <View style={styles.allHeader}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { paddingTop: 0 }]}>All Templates ({ALL_TEMPLATES.length})</Text>
              <View style={styles.sortRow}>
                {SORT_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.sortBtn, sortId === opt.id && styles.sortBtnActive]}
                    onPress={() => setSortId(opt.id)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.sortBtnText, sortId === opt.id && styles.sortBtnTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {sortTemplates(ALL_TEMPLATES, sortId).map((item) => (
              <TemplateRow
                key={item.id}
                template={item}
                onPress={() => navigation.push('TemplateDetail', { templateId: item.id })}
              />
            ))}
          </>

        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  search: { margin: 16, marginBottom: 8, backgroundColor: COLORS.surface, elevation: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },

  // Section headings
  sectionTitle: { color: COLORS.text, fontWeight: '700', paddingTop: 12, paddingBottom: 8 },

  // Category grid
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  catCard: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    borderTopWidth: 3,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  catIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  catLabel: { color: COLORS.text, fontWeight: '700', marginBottom: 4 },
  catDesc: { color: COLORS.textSecondary, lineHeight: 16, marginBottom: 8 },
  catFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  catCount: { fontWeight: '600' },

  // Back button
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    marginBottom: 4,
  },
  backText: { color: COLORS.primary, fontWeight: '600', fontSize: 15 },

  // Category detail header
  catDetailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  catDetailIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  catDetailInfo: { flex: 1 },
  catDetailTitle: { fontWeight: '800', marginBottom: 4 },
  catDetailDesc: { color: COLORS.textSecondary, lineHeight: 18, marginBottom: 6 },
  catDetailCount: { fontWeight: '600' },

  // Template rows
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  templateAccent: { width: 4, alignSelf: 'stretch' },
  templateContent: { flex: 1, padding: 12 },
  templateTitle: { color: COLORS.text, fontWeight: '600', marginBottom: 4 },
  templateDesc: { color: COLORS.textSecondary, lineHeight: 17, marginBottom: 8 },
  templateMeta: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { color: COLORS.textSecondary },

  // Sort bar
  allHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12 },
  sortRow: { flexDirection: 'row', gap: 6 },
  sortBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  sortBtnActive: { backgroundColor: COLORS.primary + '18', borderColor: COLORS.primary },
  sortBtnText: { fontSize: 12, color: COLORS.textSecondary },
  sortBtnTextActive: { color: COLORS.primary, fontWeight: '700' },

  // Search / empty states
  searchLabel: { color: COLORS.textSecondary, paddingTop: 4, paddingBottom: 8 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: COLORS.textSecondary },
});
