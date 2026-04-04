import React, { useState, useRef, useEffect } from 'react';
import {
  View, StyleSheet, Alert, ScrollView, TouchableOpacity,
  Linking, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Text, FAB, ProgressBar, Chip, Button, Menu, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGSOT } from '../../context/GSOTContext';
import { GSOT_CONFIG, COLORS, STATUS_OPTIONS, PRIORITY_OPTIONS, RECURRENCE_OPTIONS } from '../../utils/theme';
import EmptyState from '../../components/EmptyState';
import ItemFormModal from '../../components/ItemFormModal';
import BreadcrumbBar from '../../components/BreadcrumbBar';
import {
  computeNextDueDate,
  describeRecurrence,
  isRecurrenceExpired,
  isOverdue,
  isDueToday,
  prettyDate,
} from '../../utils/recurrence';

const tacticConfig = GSOT_CONFIG.tactic;
const taskConfig   = GSOT_CONFIG.task;

// Link Add/Edit Modal
function LinkModal({ visible, onDismiss, onSave, editLink, contextLabel }) {
  const [title, setTitle] = useState('');
  const [url,   setUrl]   = useState('');
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (visible) {
      setTitle(editLink ? editLink.title : '');
      setUrl(editLink ? editLink.url : '');
      setError('');
    }
  }, [visible, editLink]);

  const handleSave = () => {
    if (!url.trim()) { setError('Please enter a URL.'); return; }
    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl;
    onSave({ title: title.trim() || finalUrl, url: finalUrl });
  };

  return (
    <Modal visible={visible} onRequestClose={onDismiss} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={linkStyles.container}>
          <View style={[linkStyles.titleBar, { backgroundColor: tacticConfig.color }]}>
            <Text style={linkStyles.titleBarText}>{editLink ? 'Edit Link' : 'Add Reference Link'}</Text>
            {!!contextLabel && (
              <View style={linkStyles.contextRow}>
                <MaterialCommunityIcons name="link-variant" size={13} color="rgba(255,255,255,0.75)" />
                <Text style={linkStyles.contextText} numberOfLines={2}>{contextLabel}</Text>
              </View>
            )}
          </View>
          <View style={linkStyles.form}>
            <TextInput
              label="Link Title"
              value={title}
              onChangeText={setTitle}
              mode="outlined"
              style={linkStyles.input}
              placeholder="e.g. How to do a proper squat"
            />
            <TextInput
              label="URL *"
              value={url}
              onChangeText={(t) => { setUrl(t); setError(''); }}
              mode="outlined"
              style={linkStyles.input}
              placeholder="e.g. https://www.example.com"
              autoCapitalize="none"
              keyboardType="url"
            />
            {!!error && <Text style={linkStyles.error}>{error}</Text>}
            <View style={linkStyles.btnRow}>
              <Button mode="outlined" onPress={onDismiss} style={{ flex: 1 }} contentStyle={{ paddingVertical: 4 }}>Cancel</Button>
              <Button mode="contained" onPress={handleSave} style={[{ flex: 2 }, { backgroundColor: tacticConfig.color }]} contentStyle={{ paddingVertical: 4 }}>
                {editLink ? 'Save Changes' : 'Add Link'}
              </Button>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const linkStyles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.background },
  titleBar:     { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  titleBarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  contextRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 6 },
  contextText:  { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '500', flex: 1 },
  form:         { padding: 16, gap: 4 },
  input:        { marginBottom: 12, backgroundColor: COLORS.surface },
  error:        { color: COLORS.error, fontSize: 12, marginBottom: 8 },
  btnRow:       { flexDirection: 'row', gap: 12, marginTop: 8 },
});

// Tactic Links Section (shown in header card)
function LinksSection({ links, accentColor, onAdd, onEdit, onDelete, onOpen, recordLabel }) {
  const safeLinks = links || [];
  return (
    <View style={lsStyles.wrapper}>
      <View style={lsStyles.header}>
        <MaterialCommunityIcons name="link-variant" size={15} color={accentColor} />
        <View style={{ flex: 1 }}>
          <Text style={[lsStyles.headerText, { color: accentColor }]}>Reference Links</Text>
          {!!recordLabel && (
            <Text style={lsStyles.recordLabel} numberOfLines={1}>{recordLabel}</Text>
          )}
        </View>
        <TouchableOpacity style={lsStyles.addBtn} onPress={onAdd} activeOpacity={0.7}>
          <MaterialCommunityIcons name="plus-circle-outline" size={17} color={accentColor} />
          <Text style={[lsStyles.addText, { color: accentColor }]}>Add</Text>
        </TouchableOpacity>
      </View>
      {safeLinks.map((link, idx) => (
        <View key={idx} style={lsStyles.linkRow}>
          <TouchableOpacity style={lsStyles.linkMain} onPress={() => onOpen(link.url)} activeOpacity={0.7}>
            <MaterialCommunityIcons name="web" size={14} color={COLORS.primary} />
            <Text style={lsStyles.linkTitle} numberOfLines={1}>{link.title || link.url}</Text>
            <MaterialCommunityIcons name="open-in-new" size={13} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onEdit(idx, link)} hitSlop={{ top: 8, bottom: 8, left: 6, right: 4 }}>
            <MaterialCommunityIcons name="pencil-outline" size={15} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(idx)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 6 }}>
            <MaterialCommunityIcons name="close-circle-outline" size={15} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const lsStyles = StyleSheet.create({
  wrapper:      { backgroundColor: COLORS.background, borderRadius: 10, padding: 10, marginTop: 4, marginBottom: 12 },
  header:       { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 6 },
  headerText:   { fontWeight: '700', fontSize: 12 },
  recordLabel:  { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  addBtn:       { flexDirection: 'row', alignItems: 'center', gap: 3 },
  addText:      { fontSize: 12, fontWeight: '600' },
  linkRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5, borderTopWidth: 1, borderTopColor: COLORS.border + '60' },
  linkMain:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  linkTitle:  { flex: 1, color: COLORS.primary, fontSize: 13, textDecorationLine: 'underline' },
});

// Task Links Row (compact, collapsible)
function TaskLinksRow({ links, onAdd, onEdit, onDelete, taskTitle }) {
  const [expanded, setExpanded] = useState(false);
  const safeLinks = links || [];

  const openUrl = (url) => {
    Linking.openURL(url).catch(() => Alert.alert('Cannot open URL', url));
  };

  if (safeLinks.length === 0) {
    return (
      <TouchableOpacity style={tlStyles.addRowInline} onPress={onAdd} activeOpacity={0.7}>
        <MaterialCommunityIcons name="link-plus" size={12} color={COLORS.primary} />
        <Text style={tlStyles.addText}>Add link</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={tlStyles.wrapper}>
      <TouchableOpacity style={tlStyles.toggleRow} onPress={() => setExpanded(v => !v)} activeOpacity={0.7}>
        <MaterialCommunityIcons name="link-variant" size={12} color={COLORS.primary} />
        <Text style={tlStyles.toggleText}>{safeLinks.length} link{safeLinks.length !== 1 ? 's' : ''}</Text>
        <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={12} color={COLORS.primary} />
      </TouchableOpacity>
      {expanded && (
        <View style={tlStyles.linkList}>
          {!!taskTitle && (
            <Text style={tlStyles.taskLabel} numberOfLines={1}>
              Task: {taskTitle}
            </Text>
          )}
          {safeLinks.map((link, idx) => (
            <View key={idx} style={tlStyles.linkRow}>
              <TouchableOpacity style={tlStyles.linkMain} onPress={() => openUrl(link.url)} activeOpacity={0.7}>
                <MaterialCommunityIcons name="web" size={12} color={COLORS.primary} />
                <Text style={tlStyles.linkTitle} numberOfLines={1}>{link.title || link.url}</Text>
                <MaterialCommunityIcons name="open-in-new" size={11} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onEdit(idx, link)} hitSlop={{ top: 6, bottom: 6, left: 4, right: 2 }}>
                <MaterialCommunityIcons name="pencil-outline" size={13} color={COLORS.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDelete(idx)} hitSlop={{ top: 6, bottom: 6, left: 2, right: 4 }}>
                <MaterialCommunityIcons name="close-circle-outline" size={13} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={tlStyles.addRow} onPress={onAdd} activeOpacity={0.7}>
            <MaterialCommunityIcons name="plus" size={12} color={COLORS.primary} />
            <Text style={tlStyles.addText}>Add another link</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const tlStyles = StyleSheet.create({
  wrapper:      { marginTop: 4 },
  toggleRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  toggleText:   { color: COLORS.primary, fontSize: 11, fontWeight: '600' },
  linkList:     { marginTop: 4, gap: 2 },
  taskLabel:    { fontSize: 11, color: COLORS.textSecondary, fontStyle: 'italic', marginBottom: 4, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border + '60' },
  linkRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
  linkMain:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkTitle:    { flex: 1, color: COLORS.primary, fontSize: 12, textDecorationLine: 'underline' },
  addRow:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 4 },
  addRowInline: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  addText:      { color: COLORS.primary, fontSize: 11, fontWeight: '600' },
});

// Main Screen
export default function TacticDetailScreen({ route, navigation }) {
  const { tacticId, taskId: focusTaskId = null, objectiveTitle, objectiveId = null, strategyTitle = '', strategyId = null, goalTitle = '', goalId = null } = route.params;
  const { tactics, tasks, saveTactic, saveTask, deleteTask, deleteTactic, getTacticProgress } = useGSOT();

  const tactic     = tactics.find((t) => t.id === tacticId);
  const childTasks = tasks.filter((t) => t.tacticId === tacticId);

  // Scroll-to-task support
  const scrollViewRef   = useRef(null);
  const taskListOffset  = useRef(0);
  const taskOffsets     = useRef({});

  useEffect(() => {
    if (!focusTaskId) return;
    const timer = setTimeout(() => {
      const taskY = taskOffsets.current[focusTaskId];
      if (taskY !== undefined && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          y: taskListOffset.current + taskY - 16,
          animated: true,
        });
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [focusTaskId, childTasks.length]);

  const [editTacticModal,     setEditTacticModal]     = useState(false);
  const [addTaskModal,        setAddTaskModal]         = useState(false);
  const [editingTask,         setEditingTask]          = useState(null);
  const [statusMenuVisible,   setStatusMenuVisible]    = useState(false);
  const [pendingDeleteTaskId, setPendingDeleteTaskId]  = useState(null);
  const [linkModalVisible,    setLinkModalVisible]     = useState(false);
  const [linkTarget,          setLinkTarget]           = useState(null);
  const [editLinkIdx,         setEditLinkIdx]          = useState(null);
  const [editLinkValue,       setEditLinkValue]        = useState(null);

  const handleTacticStatusChange = async (newStatus) => {
    setStatusMenuVisible(false);
    if (newStatus !== tactic.status) await saveTactic({ ...tactic, status: newStatus });
  };

  if (!tactic) return <View style={styles.container}><Text>Tactic not found.</Text></View>;

  const progress       = getTacticProgress(tacticId);
  const statusOption   = STATUS_OPTIONS.find((s) => s.value === tactic.status)     || STATUS_OPTIONS[0];
  const priorityOption = PRIORITY_OPTIONS.find((p) => p.value === tactic.priority) || PRIORITY_OPTIONS[1];
  const completedTasks = childTasks.filter((t) => t.status === 'completed').length;

  const toggleTask = async (task) => {
    const isCompleting = task.status !== 'completed';
    if (isCompleting && task.recurrence && task.recurrence !== 'none') {
      const newCount = (task.completionCount || 0) + 1;
      const updatedTask = { ...task, completionCount: newCount, lastCompletedAt: new Date().toISOString() };
      if (isRecurrenceExpired(updatedTask)) {
        // Recurrence has reached its limit — mark permanently completed
        await saveTask({ ...updatedTask, status: 'completed' });
      } else {
        const nextDue = computeNextDueDate(task.dueDate, task.recurrence, task.recurrenceDays || []);
        await saveTask({ ...updatedTask, status: 'not_started', dueDate: nextDue });
      }
    } else {
      await saveTask({ ...task, status: isCompleting ? 'completed' : 'not_started' });
    }
  };

  const confirmDeleteTactic = () => {
    Alert.alert('Delete Tactic', `Delete "${tactic.title}" and all its tasks? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteTactic(tactic.id).then(() => navigation.goBack()); } },
    ]);
  };

  const openEditTask    = (task) => { setEditingTask(task); setAddTaskModal(true); };
  const onTaskLongPress = (task) => {
    Alert.alert(task.title, 'What would you like to do?', [
      { text: 'Edit', onPress: () => openEditTask(task) },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTask(task.id) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const openAddLink  = (type, taskId = null) => { setLinkTarget({ type, taskId }); setEditLinkIdx(null); setEditLinkValue(null); setLinkModalVisible(true); };
  const openEditLink = (type, idx, link, taskId = null) => { setLinkTarget({ type, taskId }); setEditLinkIdx(idx); setEditLinkValue(link); setLinkModalVisible(true); };

  const handleSaveLink = async ({ title, url }) => {
    setLinkModalVisible(false);
    if (!linkTarget) return;
    if (linkTarget.type === 'tactic') {
      const links = [...(tactic.links || [])];
      if (editLinkIdx !== null) links[editLinkIdx] = { title, url }; else links.push({ title, url });
      await saveTactic({ ...tactic, links });
    } else {
      const task = tasks.find((t) => t.id === linkTarget.taskId);
      if (!task) return;
      const links = [...(task.links || [])];
      if (editLinkIdx !== null) links[editLinkIdx] = { title, url }; else links.push({ title, url });
      await saveTask({ ...task, links });
    }
  };

  const handleDeleteTacticLink = async (idx) => {
    const links = [...(tactic.links || [])]; links.splice(idx, 1);
    await saveTactic({ ...tactic, links });
  };

  const handleDeleteTaskLink = async (task, idx) => {
    const links = [...(task.links || [])]; links.splice(idx, 1);
    await saveTask({ ...task, links });
  };

  const openUrl = (url) => Linking.openURL(url).catch(() => Alert.alert('Cannot Open URL', 'The link could not be opened.'));

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
          objectiveId
            ? { label: objectiveTitle || 'Objective', onPress: () => navigation.push('ObjectiveDetail', { objectiveId, objectiveTitle, strategyTitle, strategyId, goalTitle, goalId }) }
            : { label: objectiveTitle || 'Objective' },
        ].filter(s => s.label)} />
        <View style={styles.stickyRow}>
          <View style={[styles.stickyColorBar, { backgroundColor: tacticConfig.color }]} />
          <MaterialCommunityIcons name={tacticConfig.icon} size={16} color={tacticConfig.color} />
          <Text style={styles.stickyTitle} numberOfLines={2}>{tactic.title}</Text>
        </View>
      </View>
      <ScrollView ref={scrollViewRef}>
        <View style={[styles.headerCard, { borderTopColor: tacticConfig.color }]}>
<View style={styles.headerTop}>
            <View style={[styles.iconCircle, { backgroundColor: tacticConfig.color + '22' }]}>
              <MaterialCommunityIcons name={tacticConfig.icon} size={22} color={tacticConfig.color} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Menu
                visible={statusMenuVisible}
                onDismiss={() => setStatusMenuVisible(false)}
                anchor={
                  <Chip compact onPress={() => setStatusMenuVisible(true)}
                    style={{ backgroundColor: statusOption.color + '22' }}
                    textStyle={{ color: statusOption.color, fontSize: 11, fontWeight: '700' }}
                    icon={() => <MaterialCommunityIcons name="chevron-down" size={12} color={statusOption.color} />}
                  >{statusOption.label}</Chip>
                }
              >
                {STATUS_OPTIONS.map((s) => (
                  <Menu.Item key={s.value} onPress={() => handleTacticStatusChange(s.value)} title={s.label}
                    leadingIcon={tactic.status === s.value ? 'check' : 'circle-outline'}
                    titleStyle={[{ fontSize: 14 }, tactic.status === s.value && { color: s.color, fontWeight: '700' }]}
                  />
                ))}
              </Menu>
              <View style={[styles.priorityPill, { backgroundColor: priorityOption.color + '22' }]}>
                <MaterialCommunityIcons name={priorityOption.icon} size={11} color={priorityOption.color} />
                <Text style={[styles.priorityText, { color: priorityOption.color }]}>{priorityOption.label}</Text>
              </View>
            </View>
          </View>

          <Text variant="headlineSmall" style={styles.title}>{tactic.title}</Text>
          {!!tactic.description && <Text variant="bodyMedium" style={styles.desc}>{tactic.description}</Text>}

          <LinksSection
            links={tactic.links || []}
            accentColor={tacticConfig.color}
            recordLabel={`Tactic: ${tactic.title}`}
            onAdd={() => openAddLink('tactic')}
            onEdit={(idx, link) => openEditLink('tactic', idx, link)}
            onDelete={handleDeleteTacticLink}
            onOpen={openUrl}
          />

          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text variant="labelMedium" style={{ color: tacticConfig.color, fontWeight: '700' }}>Task Completion</Text>
              <Text variant="titleMedium" style={{ color: tacticConfig.color, fontWeight: '800' }}>{completedTasks}/{childTasks.length}</Text>
            </View>
            <View style={styles.progressBarWrap}>
              <ProgressBar progress={progress / 100} color={tacticConfig.color} style={styles.progressBar} />
            </View>
          </View>

          <View style={styles.headerBtns}>
            <Button mode="outlined" onPress={() => setEditTacticModal(true)} style={[styles.headerBtn, { flex: 2 }]} compact>Edit Tactic</Button>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name={taskConfig.icon} size={18} color={taskConfig.color} />
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: taskConfig.color }]}>Tasks</Text>
          <Text variant="labelSmall" style={styles.sectionCount}>{childTasks.length}</Text>
        </View>

        {childTasks.length === 0 ? (
          <EmptyState icon="checkbox-marked-outline" title="No Tasks Yet"
            subtitle="Break this tactic into specific, actionable tasks you can check off as you go."
            actionLabel="Add Task" onAction={() => { setEditingTask(null); setAddTaskModal(true); }}
            color={taskConfig.color}
          />
        ) : (
          <View
            style={styles.taskList}
            onLayout={(e) => { taskListOffset.current = e.nativeEvent.layout.y; }}
          >
            {childTasks.map((task) => {
              const overdue     = task.dueDate && isOverdue(task.dueDate) && task.status !== 'completed';
              const dueToday    = task.dueDate && isDueToday(task.dueDate);
              const recurring   = task.recurrence && task.recurrence !== 'none';
              const recurrOpt   = recurring ? RECURRENCE_OPTIONS.find((r) => r.value === task.recurrence) : null;
              const taskLinks   = task.links || [];
              const taskStatus  = STATUS_OPTIONS.find((s) => s.value === task.status)     || STATUS_OPTIONS[0];
              const taskPriority = PRIORITY_OPTIONS.find((p) => p.value === task.priority) || PRIORITY_OPTIONS[1];

              if (pendingDeleteTaskId === task.id) {
                return (
                  <View key={task.id} style={[styles.taskRow, styles.taskRowConfirm]}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={18} color={COLORS.error} />
                    <Text style={styles.confirmText} numberOfLines={1}>Delete "{task.title}"?</Text>
                    <TouchableOpacity style={styles.confirmBtnNo} onPress={() => setPendingDeleteTaskId(null)}>
                      <Text style={styles.confirmBtnNoText}>No</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.confirmBtnYes} onPress={() => { setPendingDeleteTaskId(null); deleteTask(task.id); }}>
                      <Text style={styles.confirmBtnYesText}>Yes, Delete</Text>
                    </TouchableOpacity>
                  </View>
                );
              }

              return (
                <View
                  key={task.id}
                  onLayout={(e) => { taskOffsets.current[task.id] = e.nativeEvent.layout.y; }}
                  style={[
                    styles.taskRow,
                    task.status === 'completed' && styles.taskRowCompleted,
                    overdue && styles.taskRowOverdue,
                    task.id === focusTaskId && styles.taskRowHighlighted,
                  ]}
                >
                  {/* Checkbox */}
                  <TouchableOpacity
                    style={[styles.checkCircle,
                      task.status === 'completed' && { backgroundColor: taskConfig.color, borderColor: taskConfig.color },
                      recurring && task.status !== 'completed' && { borderColor: recurrOpt && recurrOpt.color, borderWidth: 2 },
                    ]}
                    onPress={() => toggleTask(task)} activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
                  >
                    {task.status === 'completed' ? (
                      <MaterialCommunityIcons name="check" size={14} color="#fff" />
                    ) : recurring ? (
                      <MaterialCommunityIcons name="repeat" size={12} color={recurrOpt && recurrOpt.color} />
                    ) : null}
                  </TouchableOpacity>

                  {/* Main content — title, description, badge row, links */}
                  <TouchableOpacity style={styles.taskContent} onPress={() => openEditTask(task)} onLongPress={() => onTaskLongPress(task)} activeOpacity={0.6}>
                    <Text variant="bodyMedium" style={[styles.taskTitle, task.status === 'completed' && styles.taskTitleCompleted]}>{task.title}</Text>
                    {!!task.description && <Text variant="bodySmall" style={styles.taskDesc} numberOfLines={2}>{task.description}</Text>}

                    {/* Badge row: status · priority · due date · recurrence */}
                    <View style={styles.taskBadgeRow}>
                      <View style={[styles.taskStatusPill, { backgroundColor: taskStatus.color + '20' }]}>
                        <Text style={[styles.taskStatusText, { color: taskStatus.color }]}>{taskStatus.label}</Text>
                      </View>
                      <View style={[styles.taskPriorityPill, { backgroundColor: taskPriority.color + '1A' }]}>
                        <MaterialCommunityIcons name={taskPriority.icon} size={11} color={taskPriority.color} />
                        <Text style={[styles.taskPriorityText, { color: taskPriority.color }]}>{taskPriority.label}</Text>
                      </View>
                      {recurring && (
                        <View style={[styles.recurBadge, { backgroundColor: recurrOpt.color + '18' }]}>
                          <MaterialCommunityIcons name="repeat" size={13} color={recurrOpt.color} />
                        </View>
                      )}
                      {task.dueDate && (
                        <View style={styles.taskMeta}>
                          <MaterialCommunityIcons name="calendar-outline" size={12} color={overdue ? COLORS.error : dueToday ? COLORS.warning : COLORS.textSecondary} />
                          <Text style={[styles.taskMetaText, overdue && { color: COLORS.error, fontWeight: '700' }, dueToday && { color: COLORS.warning, fontWeight: '700' }]}>
                            {overdue ? 'Overdue · ' : dueToday ? 'Due today · ' : ''}{prettyDate(task.dueDate)}
                          </Text>
                        </View>
                      )}
                    </View>

                    {recurring && (
                      <View style={styles.taskMeta}>
                        <MaterialCommunityIcons name={recurrOpt.icon} size={12} color={recurrOpt.color} />
                        <Text style={[styles.taskMetaText, { color: recurrOpt.color }]}>{describeRecurrence(task.recurrence, task.dueDate, task.recurrenceDays || [])}</Text>
                      </View>
                    )}
                    <TaskLinksRow
                      links={taskLinks}
                      taskTitle={task.title}
                      onAdd={() => openAddLink('task', task.id)}
                      onEdit={(idx, link) => openEditLink('task', idx, link, task.id)}
                      onDelete={(idx) => handleDeleteTaskLink(task, idx)}
                    />
                  </TouchableOpacity>

                  {/* Action icons — slim column on the right */}
                  <View style={styles.taskActions}>
                    <TouchableOpacity onPress={() => openEditTask(task)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }} style={styles.editIconBtn}>
                      <MaterialCommunityIcons name="pencil-outline" size={16} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setPendingDeleteTaskId(task.id)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }} style={styles.deleteIconBtn}>
                      <MaterialCommunityIcons name="trash-can-outline" size={16} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <FAB icon="plus" label="Add Task" style={[styles.fab, { backgroundColor: taskConfig.color }]} color="#fff"
        onPress={() => { setEditingTask(null); setAddTaskModal(true); }}
      />

      <ItemFormModal visible={editTacticModal} onDismiss={() => setEditTacticModal(false)}
        onSave={async (data) => { await saveTactic({ ...tactic, ...data }); setEditTacticModal(false); }}
        item={tactic} config={tacticConfig}
      />

      <ItemFormModal visible={addTaskModal}
        onDismiss={() => { setAddTaskModal(false); setEditingTask(null); }}
        onSave={async (data) => { await saveTask({ ...editingTask, ...data, tacticId }); setAddTaskModal(false); setEditingTask(null); }}
        item={editingTask} config={taskConfig} parentLabel={'Under Tactic: ' + tactic.title} showRecurrence
      />

      <LinkModal
        visible={linkModalVisible}
        onDismiss={() => setLinkModalVisible(false)}
        onSave={handleSaveLink}
        editLink={editLinkValue}
        contextLabel={
          linkTarget?.type === 'tactic'
            ? `Tactic: ${tactic.title}`
            : linkTarget?.taskId
              ? `Task: ${tasks.find((t) => t.id === linkTarget.taskId)?.title ?? 'Task'}`
              : ''
        }
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
  headerCard: { backgroundColor: COLORS.surface, margin: 16, borderRadius: 16, padding: 16, borderTopWidth: 4, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  breadcrumb:  { color: COLORS.textSecondary, marginBottom: 10 },
  headerTop:   { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  iconCircle:  { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title:       { color: COLORS.text, fontWeight: '800', marginBottom: 6 },
  desc:        { color: COLORS.textSecondary, lineHeight: 20, marginBottom: 8 },
  progressSection:  { marginBottom: 16, marginRight: 28 },
  progressHeader:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressBarWrap:  { overflow: 'hidden', marginRight: 16 },
  progressBar:      { width: '100%', height: 8, borderRadius: 4 },
  headerBtns:  { flexDirection: 'row', gap: 8 },
  headerBtn:   { borderColor: COLORS.border },
  priorityPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  priorityText: { fontSize: 11, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  sectionTitle: { fontWeight: '700', flex: 1 },
  sectionCount: { backgroundColor: COLORS.border, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, color: COLORS.textSecondary, fontWeight: '700' },
  taskList: { marginHorizontal: 16, gap: 2 },
  taskRow:          { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, marginBottom: 6, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
  taskRowCompleted:    { opacity: 0.6 },
  taskRowOverdue:      { borderLeftWidth: 3, borderLeftColor: COLORS.error },
  taskRowHighlighted:  { borderWidth: 2, borderColor: COLORS.accent, backgroundColor: COLORS.accent + '12', borderRadius: 10 },
  taskRowConfirm:   { backgroundColor: COLORS.error + '08', borderLeftWidth: 3, borderLeftColor: COLORS.error, gap: 8, alignItems: 'center' },
  confirmText:       { flex: 1, color: COLORS.text, fontWeight: '600', fontSize: 13 },
  confirmBtnNo:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  confirmBtnNoText:  { color: COLORS.textSecondary, fontWeight: '600', fontSize: 12 },
  confirmBtnYes:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.error },
  confirmBtnYesText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  checkCircle:       { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0, marginTop: 2 },
  taskContent:       { flex: 1 },
  taskActions:       { flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 8, marginTop: 2 },
  editIconBtn:       { padding: 4 },
  deleteIconBtn:     { padding: 4, borderRadius: 6, backgroundColor: COLORS.error + '15' },
  taskTitle:          { color: COLORS.text, fontWeight: '500' },
  taskTitleCompleted: { textDecorationLine: 'line-through', color: COLORS.textSecondary },
  taskDesc:          { color: COLORS.textSecondary, marginTop: 2 },
  taskBadgeRow:      { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  taskMeta:          { flexDirection: 'row', alignItems: 'center', gap: 4 },
  taskMetaText:      { color: COLORS.textSecondary, fontSize: 11 },
  recurBadge:        { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  taskStatusPill:    { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  taskStatusText:    { fontSize: 10, fontWeight: '700' },
  taskPriorityPill:  { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  taskPriorityText:  { fontSize: 10, fontWeight: '700' },
  fab: { position: 'absolute', right: 16, bottom: 24 },
});
