import React, { useState, useRef } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import { Text, Button, TextInput, Divider, Dialog, Portal, HelperText } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { SECURITY_QUESTIONS } from '../../utils/theme';
import { useGSOT } from '../../context/GSOTContext';
import { COLORS, GSOT_CONFIG } from '../../utils/theme';
import { validateExport } from '../../utils/exportImport';

export default function ProfileScreen() {
  const { user, logout, updateProfile } = useAuth();
  const { getDashboardStats, exportData, importData } = useGSOT();
  const stats = getDashboardStats();

  const [editMode,            setEditMode]            = useState(false);
  const [name,                setName]                = useState(user?.name || '');
  const [saving,              setSaving]              = useState(false);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);

  // Export / Import state
  const [exporting,          setExporting]          = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importText,         setImportText]         = useState('');
  const [importMode,         setImportMode]         = useState('merge'); // 'merge' | 'replace'
  const [importPreview,      setImportPreview]      = useState(null);   // validated counts
  const [importError,        setImportError]        = useState('');
  const [importing,          setImporting]          = useState(false);
  const [importSuccess,      setImportSuccess]      = useState(false);
  const fileInputRef = useRef(null); // web only

  // Security question state
  const [secEditMode,     setSecEditMode]     = useState(false);
  const [secQuestion,     setSecQuestion]     = useState(user?.securityQuestion || '');
  const [secAnswer,       setSecAnswer]       = useState('');
  const [secPickerVisible,setSecPickerVisible]= useState(false);
  const [secSaving,       setSecSaving]       = useState(false);
  const [secError,        setSecError]        = useState('');
  const [secSuccess,      setSecSuccess]      = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await updateProfile({ name: name.trim() });
    setSaving(false);
    setEditMode(false);
  };

  const handleSaveSecurity = async () => {
    setSecError('');
    if (!secQuestion) { setSecError('Please select a security question.'); return; }
    if (!secAnswer.trim()) { setSecError('Please enter your answer.'); return; }
    setSecSaving(true);
    await updateProfile({
      securityQuestion: secQuestion,
      securityAnswer: secAnswer.trim().toLowerCase(),
    });
    setSecSaving(false);
    setSecAnswer('');
    setSecEditMode(false);
    setSecSuccess(true);
    setTimeout(() => setSecSuccess(false), 3000);
  };

  // ── Export handlers ─────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    await exportData();
    setExporting(false);
  };

  // ── Import handlers ─────────────────────────────────────────────────────────
  const openImportModal = () => {
    setImportText('');
    setImportPreview(null);
    setImportError('');
    setImportSuccess(false);
    setImportMode('merge');
    setImportModalVisible(true);
  };

  const handleImportTextChange = (text) => {
    setImportText(text);
    setImportError('');
    setImportPreview(null);
    if (!text.trim()) return;
    try {
      const parsed = JSON.parse(text);
      const result = validateExport(parsed);
      if (result.valid) {
        setImportPreview(result);
      } else {
        setImportError(result.error);
      }
    } catch {
      setImportError('Could not parse — paste the full exported text.');
    }
  };

  // Web: read file into text area
  const handleWebFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => handleImportTextChange(ev.target.result);
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importPreview) return;
    setImporting(true);
    const result = await importData(importText, importMode);
    setImporting(false);
    if (result.success) {
      setImportSuccess(true);
      setTimeout(() => {
        setImportModalVisible(false);
        setImportSuccess(false);
      }, 2000);
    } else {
      setImportError(result.error || 'Import failed.');
    }
  };

  return (
    <View style={styles.flex}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Avatar & Name */}
        <View style={styles.avatarCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.name || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfoBlock}>
            {editMode ? (
              <View style={styles.editRow}>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  mode="outlined"
                  dense
                  style={styles.nameInput}
                  autoFocus
                />
                <Button mode="contained" onPress={handleSave} loading={saving} compact style={{ backgroundColor: COLORS.primary }}>
                  Save
                </Button>
                <Button mode="text" onPress={() => setEditMode(false)} compact>Cancel</Button>
              </View>
            ) : (
              <View style={styles.nameRow}>
                <Text variant="headlineSmall" style={styles.userName} numberOfLines={1}>{user?.name}</Text>
                <MaterialCommunityIcons
                  name="pencil-outline"
                  size={18}
                  color={COLORS.textSecondary}
                  onPress={() => setEditMode(true)}
                />
              </View>
            )}
            <View style={styles.emailWrap}>
              <Text variant="bodyMedium" style={styles.userEmail} numberOfLines={1} ellipsizeMode="middle">{user?.email}</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <Text variant="titleMedium" style={styles.sectionTitle}>Your GSOT Stats</Text>
        <View style={styles.statsCard}>
          {[
            { key: 'goal', count: stats.totalGoals, completed: stats.completedGoals },
            { key: 'strategy', count: stats.totalStrategies },
            { key: 'objective', count: stats.totalObjectives },
            { key: 'tactic', count: stats.totalTactics },
            { key: 'task', count: stats.totalTasks, completed: stats.completedTasks },
          ].map((item, idx) => {
            const cfg = GSOT_CONFIG[item.key];
            return (
              <React.Fragment key={item.key}>
                {idx > 0 && <Divider />}
                <View style={styles.statRow}>
                  <View style={[styles.statIcon, { backgroundColor: cfg.color + '18' }]}>
                    <MaterialCommunityIcons name={cfg.icon} size={16} color={cfg.color} />
                  </View>
                  <Text variant="bodyMedium" style={styles.statLabel}>{cfg.pluralLabel}</Text>
                  <Text variant="titleMedium" style={[styles.statCount, { color: cfg.color }]}>
                    {item.completed !== undefined ? `${item.completed}/${item.count}` : item.count}
                  </Text>
                </View>
              </React.Fragment>
            );
          })}
        </View>

        {/* About */}
        <Text variant="titleMedium" style={styles.sectionTitle}>About GSOT</Text>
        <View style={styles.aboutCard}>
          {[
            { letter: 'G', label: 'Goal', desc: 'Broad primary outcome you want to achieve', color: GSOT_CONFIG.goal.color },
            { letter: 'S', label: 'Strategy', desc: 'The approach you will take to reach the goal', color: GSOT_CONFIG.strategy.color },
            { letter: 'O', label: 'Objective', desc: 'Specific, measurable milestone tied to a strategy', color: GSOT_CONFIG.objective.color },
            { letter: 'T', label: 'Tactic', desc: 'Specific action taken to achieve an objective', color: GSOT_CONFIG.tactic.color },
          ].map((item) => (
            <View key={item.letter} style={styles.aboutRow}>
              <View style={[styles.letterBadge, { backgroundColor: item.color }]}>
                <Text style={styles.letterText}>{item.letter}</Text>
              </View>
              <View style={styles.aboutText}>
                <Text variant="bodyMedium" style={styles.aboutLabel}>{item.label}</Text>
                <Text variant="bodySmall" style={styles.aboutDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Security Question */}
        <Text variant="titleMedium" style={styles.sectionTitle}>Account Security</Text>
        <View style={styles.statsCard}>
          <View style={styles.secHeader}>
            <MaterialCommunityIcons name="shield-account-outline" size={20} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.secLabel}>Password Recovery Question</Text>
              {user?.securityQuestion ? (
                <Text style={styles.secValue} numberOfLines={2}>{user.securityQuestion}</Text>
              ) : (
                <Text style={styles.secMissing}>Not set — required for password recovery</Text>
              )}
            </View>
            <TouchableOpacity onPress={() => { setSecEditMode((v) => !v); setSecError(''); setSecAnswer(''); }}>
              <MaterialCommunityIcons
                name={secEditMode ? 'close' : 'pencil-outline'}
                size={18} color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {secSuccess && (
            <View style={styles.secSuccessRow}>
              <MaterialCommunityIcons name="check-circle-outline" size={15} color="#4CAF50" />
              <Text style={styles.secSuccessText}>Security question updated!</Text>
            </View>
          )}

          {secEditMode && (
            <View style={styles.secForm}>
              <TouchableOpacity
                style={[styles.pickerBtn, !secQuestion && styles.pickerBtnEmpty]}
                onPress={() => setSecPickerVisible(true)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="help-circle-outline" size={18} color={COLORS.primary} />
                <Text style={[styles.pickerText, !secQuestion && styles.pickerPlaceholder]} numberOfLines={2}>
                  {secQuestion || 'Select a security question…'}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>

              <TextInput
                label="Your Answer"
                value={secAnswer}
                onChangeText={(t) => { setSecAnswer(t); setSecError(''); }}
                mode="outlined"
                autoCapitalize="none"
                dense
                style={{ marginBottom: 8, backgroundColor: COLORS.surface }}
                left={<TextInput.Icon icon="shield-key-outline" />}
              />

              {!!secError && <HelperText type="error" visible>{secError}</HelperText>}

              <Button
                mode="contained"
                onPress={handleSaveSecurity}
                loading={secSaving}
                disabled={secSaving}
                compact
                style={{ backgroundColor: COLORS.primary, marginTop: 4 }}
              >
                Save Security Question
              </Button>
            </View>
          )}
        </View>

        {/* ── Export / Import ─────────────────────────────────── */}
        <Text variant="titleMedium" style={styles.sectionTitle}>Data Portability</Text>
        <View style={styles.statsCard}>
          {/* Export row */}
          <TouchableOpacity style={styles.portRow} onPress={handleExport} activeOpacity={0.7} disabled={exporting}>
            <View style={[styles.portIcon, { backgroundColor: COLORS.primary + '18' }]}>
              <MaterialCommunityIcons name="export-variant" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.portText}>
              <Text style={styles.portTitle}>Export my data</Text>
              <Text style={styles.portDesc}>
                {Platform.OS === 'web'
                  ? 'Download a backup .json file to your computer'
                  : 'Share your data via email, AirDrop, or Files app'}
              </Text>
            </View>
            {exporting
              ? <MaterialCommunityIcons name="loading" size={20} color={COLORS.textSecondary} />
              : <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textSecondary} />}
          </TouchableOpacity>

          <Divider />

          {/* Import row */}
          <TouchableOpacity style={styles.portRow} onPress={openImportModal} activeOpacity={0.7}>
            <View style={[styles.portIcon, { backgroundColor: COLORS.secondary + '18' }]}>
              <MaterialCommunityIcons name="import" size={20} color={COLORS.secondary} />
            </View>
            <View style={styles.portText}>
              <Text style={styles.portTitle}>Import data</Text>
              <Text style={styles.portDesc}>
                {Platform.OS === 'web'
                  ? 'Load a .json backup file or paste exported text'
                  : 'Paste exported text to restore or sync data'}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <Button
          mode="outlined"
          onPress={() => setLogoutDialogVisible(true)}
          style={styles.logoutBtn}
          textColor={COLORS.error}
          contentStyle={{ paddingVertical: 4 }}
          icon="logout"
        >
          Sign Out
        </Button>
      </ScrollView>

      {/* Security question picker modal */}
      <Modal
        visible={secPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSecPickerVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSecPickerVisible(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text variant="titleMedium" style={{ fontWeight: '700', color: COLORS.text, marginBottom: 12 }}>
              Select a Security Question
            </Text>
            <ScrollView>
              {SECURITY_QUESTIONS.map((q) => (
                <TouchableOpacity
                  key={q}
                  style={[styles.questionRow, secQuestion === q && styles.questionRowSelected]}
                  onPress={() => { setSecQuestion(q); setSecPickerVisible(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.questionText, secQuestion === q && { color: COLORS.primary, fontWeight: '600' }]}>
                    {q}
                  </Text>
                  {secQuestion === q && (
                    <MaterialCommunityIcons name="check-circle" size={18} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Import modal ────────────────────────────────────────────────── */}
      <Modal
        visible={importModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setImportModalVisible(false)}
      >
        <View style={styles.importModal}>
          {/* Header */}
          <View style={[styles.importHeader, { backgroundColor: COLORS.primary }]}>
            <Text style={styles.importHeaderTitle}>Import Data</Text>
            <TouchableOpacity onPress={() => setImportModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialCommunityIcons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.importBody} keyboardShouldPersistTaps="handled">
            {importSuccess ? (
              <View style={styles.importSuccessBox}>
                <MaterialCommunityIcons name="check-circle-outline" size={48} color="#4CAF50" />
                <Text style={styles.importSuccessText}>Import successful!</Text>
              </View>
            ) : (
              <>
                {/* Web file picker */}
                {Platform.OS === 'web' && (
                  <View style={styles.importSection}>
                    <Button
                      mode="outlined"
                      icon="file-upload-outline"
                      onPress={() => fileInputRef.current?.click()}
                      style={{ borderColor: COLORS.primary }}
                      textColor={COLORS.primary}
                    >
                      Choose .json file
                    </Button>
                    {/* Hidden file input — web only */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,application/json"
                      style={{ display: 'none' }}
                      onChange={handleWebFileChange}
                    />
                    <Text style={styles.importOrText}>— or paste below —</Text>
                  </View>
                )}

                {/* Paste area */}
                <View style={styles.importSection}>
                  <Text style={styles.importLabel}>
                    {Platform.OS === 'web'
                      ? 'Paste exported JSON text:'
                      : 'Paste the exported text from another device:'}
                  </Text>
                  <TextInput
                    mode="outlined"
                    multiline
                    numberOfLines={8}
                    value={importText}
                    onChangeText={handleImportTextChange}
                    placeholder='{"version":"1","app":"GSOTiQ",...}'
                    style={styles.importTextArea}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {!!importError && (
                    <HelperText type="error" visible>{importError}</HelperText>
                  )}
                </View>

                {/* Preview */}
                {importPreview && (
                  <View style={styles.importPreviewBox}>
                    <Text style={styles.importPreviewTitle}>
                      Ready to import{importPreview.userName ? ` from ${importPreview.userName}` : ''}
                    </Text>
                    {Object.entries(importPreview.counts).map(([key, count]) => (
                      <Text key={key} style={styles.importPreviewRow}>
                        • {count} {key}
                      </Text>
                    ))}

                    {/* Mode selector */}
                    <Text style={[styles.importLabel, { marginTop: 14 }]}>Import mode:</Text>
                    {[
                      { value: 'merge',   label: 'Merge',   desc: 'Add new items without removing existing data' },
                      { value: 'replace', label: 'Replace', desc: 'Clear all my current data and load the backup' },
                    ].map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.modeRow, importMode === opt.value && styles.modeRowSelected]}
                        onPress={() => setImportMode(opt.value)}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons
                          name={importMode === opt.value ? 'radiobox-marked' : 'radiobox-blank'}
                          size={20}
                          color={importMode === opt.value ? COLORS.primary : COLORS.textSecondary}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.modeLabel}>{opt.label}</Text>
                          <Text style={styles.modeDesc}>{opt.desc}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}

                    <Button
                      mode="contained"
                      onPress={handleImport}
                      loading={importing}
                      disabled={importing}
                      style={{ backgroundColor: importMode === 'replace' ? COLORS.error : COLORS.primary, marginTop: 16 }}
                      contentStyle={{ paddingVertical: 4 }}
                      icon={importMode === 'replace' ? 'alert' : 'import'}
                    >
                      {importMode === 'replace' ? 'Replace & Import' : 'Merge & Import'}
                    </Button>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Sign-out confirmation dialog — uses Portal so it works on web */}
      <Portal>
        <Dialog
          visible={logoutDialogVisible}
          onDismiss={() => setLogoutDialogVisible(false)}
        >
          <Dialog.Icon icon="logout" color={COLORS.error} />
          <Dialog.Title style={styles.dialogTitle}>Sign Out?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogBody}>
              You'll need to sign back in to access your GSOT data.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLogoutDialogVisible(false)}>Cancel</Button>
            <Button
              mode="contained"
              onPress={() => { setLogoutDialogVisible(false); logout(); }}
              buttonColor={COLORS.error}
            >
              Sign Out
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, flexDirection: 'column' },
  avatarCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    alignSelf: 'center',
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  userInfoBlock: {},
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 },
  userName: { color: COLORS.text, fontWeight: '700', flexShrink: 1, textAlign: 'center' },
  emailWrap: { overflow: 'hidden' },
  userEmail: { color: COLORS.textSecondary, textAlign: 'center' },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  nameInput: { flex: 1, backgroundColor: COLORS.surface },
  sectionTitle: { color: COLORS.text, fontWeight: '700', marginBottom: 10 },
  statsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  statRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  statIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  statLabel: { flex: 1, color: COLORS.text },
  statCount: { fontWeight: '700' },
  aboutCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    gap: 14,
  },
  aboutRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  letterBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  letterText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  aboutText: { flex: 1 },
  aboutLabel: { color: COLORS.text, fontWeight: '600' },
  aboutDesc: { color: COLORS.textSecondary, lineHeight: 18, marginTop: 2 },
  logoutBtn: { borderColor: COLORS.error + '66' },

  // Data portability card
  portRow:   { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  portIcon:  { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  portText:  { flex: 1 },
  portTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  portDesc:  { fontSize: 12, color: COLORS.textSecondary, lineHeight: 16 },

  // Import modal
  importModal:       { flex: 1, backgroundColor: COLORS.background },
  importHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  importHeaderTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  importBody:        { flex: 1, padding: 16 },
  importSection:     { marginBottom: 16 },
  importOrText:      { textAlign: 'center', color: COLORS.textSecondary, marginVertical: 10, fontSize: 13 },
  importLabel:       { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  importTextArea:    { backgroundColor: COLORS.surface, fontFamily: 'monospace', fontSize: 12, minHeight: 140 },
  importPreviewBox:  { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 24, borderWidth: 1, borderColor: COLORS.primary + '40' },
  importPreviewTitle:{ fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  importPreviewRow:  { fontSize: 13, color: COLORS.textSecondary, marginBottom: 2 },
  importSuccessBox:  { alignItems: 'center', paddingVertical: 60, gap: 16 },
  importSuccessText: { fontSize: 18, fontWeight: '700', color: '#4CAF50' },
  modeRow:           { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 10, borderRadius: 8, marginBottom: 6, backgroundColor: COLORS.background },
  modeRowSelected:   { backgroundColor: COLORS.primary + '10', borderWidth: 1, borderColor: COLORS.primary + '40' },
  modeLabel:         { fontSize: 14, fontWeight: '600', color: COLORS.text },
  modeDesc:          { fontSize: 12, color: COLORS.textSecondary, lineHeight: 16, marginTop: 2 },

  // Security question
  secHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 4 },
  secLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  secValue: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  secMissing: { fontSize: 12, color: COLORS.error, lineHeight: 18 },
  secSuccessRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  secSuccessText: { fontSize: 13, color: '#4CAF50', fontWeight: '600' },
  secForm: { marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border + '60', paddingTop: 12 },
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: COLORS.primary, borderRadius: 8,
    padding: 12, marginBottom: 10, backgroundColor: COLORS.surface,
  },
  pickerBtnEmpty: { borderColor: COLORS.border },
  pickerText: { flex: 1, fontSize: 13, color: COLORS.text, lineHeight: 18 },
  pickerPlaceholder: { color: COLORS.textSecondary },

  // Question picker modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 40, maxHeight: '70%',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border,
    alignSelf: 'center', marginBottom: 16,
  },
  questionRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border + '60', gap: 10,
  },
  questionRowSelected: { backgroundColor: COLORS.primary + '0D' },
  questionText: { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 20 },
  dialogTitle: { textAlign: 'center' },
  dialogBody: { textAlign: 'center', color: COLORS.textSecondary },
});
