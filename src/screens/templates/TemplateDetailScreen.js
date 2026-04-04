import React, { useState } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import { Text, Button, Chip, Dialog, Portal, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getTemplateById, getCategoryById } from '../../data/personalTemplates';
import { useGSOT } from '../../context/GSOTContext';
import { COLORS, GSOT_CONFIG } from '../../utils/theme';

function StrategyPreview({ strategy, stratIndex }) {
  const [expanded, setExpanded] = useState(stratIndex === 0);
  return (
    <View style={styles.strategyBlock}>
      <TouchableOpacity
        style={styles.strategyHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.8}
      >
        <View style={[styles.levelBadge, { backgroundColor: GSOT_CONFIG.strategy.color }]}>
          <Text style={styles.levelBadgeText}>S{stratIndex + 1}</Text>
        </View>
        <Text variant="bodyMedium" style={styles.strategyTitle} numberOfLines={2}>
          {strategy.title}
        </Text>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={COLORS.textSecondary}
        />
      </TouchableOpacity>

      {expanded && strategy.objectives.map((obj, oi) => (
        <View key={oi} style={styles.objectiveBlock}>
          <View style={styles.objectiveHeader}>
            <View style={[styles.levelBadge, { backgroundColor: GSOT_CONFIG.objective.color }]}>
              <Text style={styles.levelBadgeText}>O{oi + 1}</Text>
            </View>
            <View style={styles.objectiveText}>
              <Text variant="bodySmall" style={styles.objectiveTitle}>{obj.title}</Text>
              {obj.measures && (
                <View style={styles.measureRow}>
                  <MaterialCommunityIcons name="ruler" size={11} color={GSOT_CONFIG.objective.color} />
                  <Text variant="labelSmall" style={styles.measureText} numberOfLines={2}>
                    {obj.measures}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {obj.tactics.map((tactic, ti) => (
            <View key={ti} style={styles.tacticBlock}>
              <View style={styles.tacticHeader}>
                <View style={[styles.levelBadge, { backgroundColor: GSOT_CONFIG.tactic.color }]}>
                  <Text style={styles.levelBadgeText}>T{ti + 1}</Text>
                </View>
                <Text variant="labelMedium" style={styles.tacticTitle} numberOfLines={2}>
                  {tactic.title}
                </Text>
              </View>
              {tactic.tasks.map((task, tki) => (
                <View key={tki} style={styles.taskItem}>
                  <MaterialCommunityIcons
                    name="checkbox-blank-circle-outline"
                    size={10}
                    color={GSOT_CONFIG.task.color}
                  />
                  <Text variant="labelSmall" style={styles.taskText}>{task.title}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export default function TemplateDetailScreen({ route, navigation }) {
  const { templateId } = route.params;
  const { importTemplate, goals } = useGSOT();
  const [importing, setImporting] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const template = getTemplateById(templateId);
  const category = template ? getCategoryById(template.categoryId) : null;

  if (!template) {
    return (
      <View style={styles.container}>
        <Text>Template not found.</Text>
      </View>
    );
  }

  const totalStrategies = template.strategies.length;
  const totalObjectives = template.strategies.reduce((a, s) => a + s.objectives.length, 0);
  const totalTactics = template.strategies.reduce(
    (a, s) => a + s.objectives.reduce((b, o) => b + o.tactics.length, 0), 0
  );
  const totalTasks = template.strategies.reduce(
    (a, s) =>
      a + s.objectives.reduce(
        (b, o) => b + o.tactics.reduce((c, t) => c + t.tasks.length, 0), 0
      ),
    0
  );

  const alreadyImported = goals.some((g) => g.templateId === templateId);

  const doImport = async () => {
    setConfirmVisible(false);
    setImporting(true);
    setErrorMsg('');
    try {
      await importTemplate(template);
      setSuccessVisible(true);
    } catch (e) {
      setErrorMsg(e.message || 'Something went wrong. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const goToGoals = () => {
    setSuccessVisible(false);
    // navigate() automatically bubbles up through all parent navigators,
    // so this works regardless of which tab or stack the user came from.
    navigation.navigate('GoalsTabs', { screen: 'GoalsList' });
  };

  const accentColor = category?.color || COLORS.primary;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={[styles.headerCard, { borderTopColor: accentColor }]}>
          <View style={styles.headerTop}>
            <View style={[styles.catIcon, { backgroundColor: accentColor + '18' }]}>
              <MaterialCommunityIcons
                name={category?.icon || 'flag'}
                size={24}
                color={accentColor}
              />
            </View>
            <Chip
              compact
              style={{ backgroundColor: accentColor + '22' }}
              textStyle={{ color: accentColor, fontWeight: '700', fontSize: 11 }}
            >
              {category?.label}
            </Chip>
          </View>

          <Text variant="headlineSmall" style={styles.templateTitle}>{template.title}</Text>
          <Text variant="bodyMedium" style={styles.templateDesc}>{template.description}</Text>

          {/* Stats */}
          <View style={styles.statsRow}>
            {[
              { icon: 'chess-knight', label: 'Strategies', value: totalStrategies, color: GSOT_CONFIG.strategy.color },
              { icon: 'target', label: 'Objectives', value: totalObjectives, color: GSOT_CONFIG.objective.color },
              { icon: 'tools', label: 'Tactics', value: totalTactics, color: GSOT_CONFIG.tactic.color },
              { icon: 'checkbox-marked-outline', label: 'Tasks', value: totalTasks, color: GSOT_CONFIG.task.color },
            ].map((stat) => (
              <View key={stat.label} style={styles.statItem}>
                <MaterialCommunityIcons name={stat.icon} size={16} color={stat.color} />
                <Text variant="titleMedium" style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text variant="labelSmall" style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Level legend */}
        <View style={styles.legend}>
          {[
            { code: 'S', label: 'Strategy', color: GSOT_CONFIG.strategy.color },
            { code: 'O', label: 'Objective', color: GSOT_CONFIG.objective.color },
            { code: 'T', label: 'Tactic', color: GSOT_CONFIG.tactic.color },
            { code: '●', label: 'Task', color: GSOT_CONFIG.task.color },
          ].map((item) => (
            <View key={item.code} style={styles.legendItem}>
              <View style={[styles.legendBadge, { backgroundColor: item.color }]}>
                <Text style={styles.legendCode}>{item.code}</Text>
              </View>
              <Text variant="labelSmall" style={styles.legendLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Error message */}
        {!!errorMsg && (
          <View style={styles.errorBanner}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color={COLORS.error} />
            <Text variant="bodySmall" style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Full hierarchy preview */}
        <Text variant="titleMedium" style={styles.previewTitle}>Full Template Preview</Text>
        <Text variant="bodySmall" style={styles.previewHint}>
          Tap each strategy to expand and see the full breakdown
        </Text>

        {template.strategies.map((strategy, si) => (
          <StrategyPreview key={si} strategy={strategy} stratIndex={si} />
        ))}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Sticky import button */}
      <View style={styles.importBar}>
        {alreadyImported && (
          <Text variant="labelSmall" style={styles.importedNote}>
            ✅ Already imported — you can add a second copy below
          </Text>
        )}
        <Button
          mode="contained"
          onPress={() => setConfirmVisible(true)}
          disabled={importing}
          style={[styles.importBtn, { backgroundColor: accentColor }]}
          contentStyle={{ paddingVertical: 6 }}
          icon="import"
        >
          {importing ? 'Importing…' : 'Add to My GSOT'}
        </Button>
      </View>

      {/* Confirm Dialog */}
      <Portal>
        <Dialog visible={confirmVisible} onDismiss={() => setConfirmVisible(false)}>
          <Dialog.Icon icon="import" color={accentColor} />
          <Dialog.Title style={{ textAlign: 'center' }}>Import Template?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ textAlign: 'center', color: COLORS.textSecondary }}>
              This will create {totalStrategies} strategies, {totalObjectives} objectives,
              {' '}{totalTactics} tactics, and {totalTasks} tasks — all linked and ready to customize.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmVisible(false)}>Cancel</Button>
            <Button
              mode="contained"
              onPress={doImport}
              style={{ backgroundColor: accentColor }}
            >
              Import
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Importing spinner */}
        <Dialog visible={importing} dismissable={false}>
          <Dialog.Content style={{ alignItems: 'center', gap: 16, paddingVertical: 24 }}>
            <ActivityIndicator size="large" color={accentColor} />
            <Text variant="bodyMedium">Building your GSOT hierarchy…</Text>
          </Dialog.Content>
        </Dialog>

        {/* Success Dialog */}
        <Dialog visible={successVisible} onDismiss={goToGoals}>
          <Dialog.Icon icon="check-circle-outline" color={COLORS.success} />
          <Dialog.Title style={{ textAlign: 'center' }}>Imported!</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ textAlign: 'center', color: COLORS.textSecondary }}>
              "{template.title}" has been added to your Goals with the full hierarchy ready to go.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSuccessVisible(false)}>Stay Here</Button>
            <Button
              mode="contained"
              onPress={goToGoals}
              style={{ backgroundColor: accentColor }}
            >
              Go to My Goals
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, flexDirection: 'column' },
  headerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderTopWidth: 4,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  catIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  templateTitle: { color: COLORS.text, fontWeight: '800', marginBottom: 8 },
  templateDesc: { color: COLORS.textSecondary, lineHeight: 20, marginBottom: 16 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontWeight: '800' },
  statLabel: { color: COLORS.textSecondary, textAlign: 'center' },
  legend: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendBadge: { width: 20, height: 20, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  legendCode: { color: '#fff', fontSize: 9, fontWeight: '800' },
  legendLabel: { color: COLORS.textSecondary },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.error + '18',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { color: COLORS.error, flex: 1 },
  previewTitle: { color: COLORS.text, fontWeight: '700', marginBottom: 4 },
  previewHint: { color: COLORS.textSecondary, marginBottom: 12 },
  strategyBlock: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  strategyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  strategyTitle: { flex: 1, color: COLORS.text, fontWeight: '600' },
  objectiveBlock: {
    backgroundColor: COLORS.background,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    padding: 10,
  },
  objectiveHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  objectiveText: { flex: 1 },
  objectiveTitle: { color: COLORS.text, fontWeight: '500', lineHeight: 18 },
  measureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 4 },
  measureText: { color: GSOT_CONFIG.objective.color, flex: 1, lineHeight: 15 },
  tacticBlock: {
    borderLeftWidth: 2,
    borderLeftColor: GSOT_CONFIG.tactic.color + '44',
    marginLeft: 10,
    paddingLeft: 10,
    marginBottom: 8,
  },
  tacticHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 4 },
  tacticTitle: { flex: 1, color: COLORS.text, fontWeight: '500' },
  taskItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 3, paddingLeft: 4 },
  taskText: { flex: 1, color: COLORS.textSecondary, lineHeight: 16 },
  levelBadge: {
    width: 20,
    height: 20,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  levelBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  importBar: {
    backgroundColor: COLORS.surface,
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 6,
  },
  importedNote: { color: COLORS.success, textAlign: 'center', fontWeight: '600' },
  importBtn: { borderRadius: 10 },
});
