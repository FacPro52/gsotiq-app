import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, ProgressBar, Menu } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, STATUS_OPTIONS, PRIORITY_OPTIONS } from '../utils/theme';
import { TEMPLATE_CATEGORIES } from '../data/personalTemplates';

export default function GSOTCard({
  item,
  config,
  progress,
  onPress,
  onLongPress,
  childCount,
  childLabel,
  onStatusChange,
  onPriorityChange,
  onDelete,
}) {
  const [menuVisible,   setMenuVisible]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const statusOption   = STATUS_OPTIONS.find((s) => s.value === item.status)   || STATUS_OPTIONS[0];
  const priorityOption = PRIORITY_OPTIONS.find((p) => p.value === item.priority) || PRIORITY_OPTIONS[1];

  // Use the goal's category color (if any) for the left border accent and shadow
  const categoryColor = item.category
    ? (TEMPLATE_CATEGORIES.find((c) => c.id === item.category)?.color || null)
    : null;
  const accentColor = categoryColor || config.color;

  const handleStatusSelect = (newStatus) => {
    setMenuVisible(false);
    if (onStatusChange && newStatus !== item.status) onStatusChange(item, newStatus);
  };

  // ── Inline delete confirmation ──────────────────────────────────────────────
  if (confirmDelete) {
    return (
      <View style={styles.wrapper}>
        <View style={[styles.card, styles.confirmCard, { borderLeftColor: accentColor }]}>
          <MaterialCommunityIcons name="alert-circle-outline" size={20} color={COLORS.error} />
          <Text style={styles.confirmText} numberOfLines={2}>
            Delete "{item.title}"?{'\n'}
            <Text style={styles.confirmSub}>This will also remove all children.</Text>
          </Text>
          <View style={styles.confirmBtns}>
            <TouchableOpacity style={styles.btnNo} onPress={() => setConfirmDelete(false)}>
              <Text style={styles.btnNoText}>No</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnYes} onPress={() => { setConfirmDelete(false); onDelete && onDelete(); }}>
              <Text style={styles.btnYesText}>Yes, Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ── Status chip (shared between header and static display) ──────────────────
  const statusChip = onStatusChange ? (
    <Menu
      visible={menuVisible}
      onDismiss={() => setMenuVisible(false)}
      anchor={
        <TouchableOpacity
          onPress={() => setMenuVisible(true)}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <View style={[styles.statusChip, { backgroundColor: statusOption.color + '22' }]}>
            <Text style={[styles.statusText, { color: statusOption.color }]}>
              {statusOption.label}
            </Text>
            <MaterialCommunityIcons name="chevron-down" size={10} color={statusOption.color} />
          </View>
        </TouchableOpacity>
      }
    >
      {STATUS_OPTIONS.map((s) => (
        <Menu.Item
          key={s.value}
          onPress={() => handleStatusSelect(s.value)}
          title={s.label}
          leadingIcon={item.status === s.value ? 'check' : 'circle-outline'}
          titleStyle={[
            styles.menuItemText,
            item.status === s.value && { color: s.color, fontWeight: '700' },
          ]}
        />
      ))}
    </Menu>
  ) : (
    <View style={[styles.statusChip, { backgroundColor: statusOption.color + '22' }]}>
      <Text style={[styles.statusText, { color: statusOption.color }]}>
        {statusOption.label}
      </Text>
    </View>
  );

  // ── Normal card ─────────────────────────────────────────────────────────────
  return (
    <View style={styles.wrapper}>
      {/*
       * Flex ROW: contentZone (flex:1) for navigation + optional trashZone (fixed).
       * Status chip sits inline in the header row, right of the title text.
       * Trash button is in its own physically-separate column so taps never bleed
       * into the navigation touch target.
       */}
      <View style={[styles.card, { borderLeftColor: accentColor, shadowColor: accentColor }]}>

        {/* ── Content zone — navigation touch ── */}
        <TouchableOpacity
          style={styles.contentZone}
          onPress={onPress}
          onLongPress={onLongPress}
          activeOpacity={0.85}
        >
          {/* Header row: icon | title | status chip */}
          <View style={styles.headerRow}>
            <View style={[styles.iconCircle, { backgroundColor: config.color + '22' }]}>
              <MaterialCommunityIcons name={config.icon} size={18} color={config.color} />
            </View>
            <View style={styles.headerText}>
              <Text variant="titleSmall" style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
              {item.category ? (
                <Text variant="bodySmall" style={styles.category}>
                  {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Description */}
          {!!item.description && (
            <Text variant="bodySmall" style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          {/* Progress */}
          {progress !== undefined && (
            <View style={styles.progressRow}>
              <View style={styles.progressBarWrap}>
                <ProgressBar
                  progress={progress / 100}
                  color={config.color}
                  style={styles.progressBar}
                />
              </View>
              <Text variant="labelSmall" style={[styles.progressLabel, { color: config.color }]}>
                {progress}%
              </Text>
            </View>
          )}

          {/* Footer: status + priority + child count + due date */}
          <View style={styles.footer}>
            {/* Status chip */}
            {statusChip}

            {/* Priority badge */}
            <View style={[styles.priorityBadge, { backgroundColor: priorityOption.color + '1A' }]}>
              <MaterialCommunityIcons name={priorityOption.icon} size={11} color={priorityOption.color} />
              <Text style={[styles.priorityText, { color: priorityOption.color }]}>
                {priorityOption.label}
              </Text>
            </View>

            {childCount !== undefined && (
              <View style={styles.footerItem}>
                <MaterialCommunityIcons name="sitemap" size={12} color={COLORS.textSecondary} />
                <Text variant="labelSmall" style={styles.footerText}>
                  {childCount} {childLabel}
                </Text>
              </View>
            )}
            {item.dueDate && (
              <View style={styles.footerItem}>
                <MaterialCommunityIcons name="calendar-outline" size={12} color={COLORS.textSecondary} />
                <Text variant="labelSmall" style={styles.footerText}>{item.dueDate}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* ── Trash column — only shown when onDelete is provided ── */}
        {!!onDelete && (
          <View style={styles.trashZone}>
            <TouchableOpacity
              onPress={() => setConfirmDelete(true)}
              activeOpacity={0.6}
              style={styles.deleteBtn}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={18} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        )}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginVertical: 6,
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderLeftWidth: 4,
    flexDirection: 'row',
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    overflow: 'hidden',
  },

  // Content zone — navigation tap target
  contentZone: {
    flex: 1,
    padding: 14,
  },

  // Trash-only column
  trashZone: {
    width: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border + '55',
  },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.error + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header row
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  iconCircle: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  headerText: { flex: 1 },
  title:      { color: COLORS.text, fontWeight: '600', lineHeight: 18 },
  category:   { color: COLORS.textSecondary, marginTop: 2, fontSize: 11 },

  // Status chip
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText:   { fontSize: 10, fontWeight: '700' },
  menuItemText: { fontSize: 14 },

  // ── Inline confirmation ──
  confirmCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    backgroundColor: COLORS.error + '08',
    borderLeftColor: COLORS.error,
  },
  confirmText: {
    flex: 1,
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 13,
  },
  confirmSub: {
    color: COLORS.textSecondary,
    fontWeight: '400',
    fontSize: 11,
  },
  confirmBtns: { flexDirection: 'column', gap: 6 },
  btnNo: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  btnNoText:  { color: COLORS.textSecondary, fontWeight: '600', fontSize: 13 },
  btnYes: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.error,
    alignItems: 'center',
  },
  btnYesText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Body
  description:   { color: COLORS.textSecondary, marginBottom: 10, lineHeight: 18 },
  progressRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  progressBarWrap:{ flex: 1, marginRight: 8, overflow: 'hidden' },
  progressBar:    { width: '100%', height: 6, borderRadius: 3 },
  progressLabel: { fontWeight: '700', width: 32, textAlign: 'right' },

  // Footer
  footer:        { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 6, alignItems: 'center' },
  footerItem:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  footerText:    { color: COLORS.textSecondary },

  // Priority badge — in footer row
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  priorityText:  { fontSize: 10, fontWeight: '700' },
});
