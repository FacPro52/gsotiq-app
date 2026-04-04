import React, { useState } from 'react';
import {
  View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
  TouchableOpacity, Modal,
} from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SECURITY_QUESTIONS } from '../../utils/theme';
import AppLogo from '../../components/AppLogo';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [name,             setName]             = useState('');
  const [email,            setEmail]            = useState('');
  const [password,         setPassword]         = useState('');
  const [confirmPassword,  setConfirmPassword]  = useState('');
  const [showPassword,     setShowPassword]     = useState(false);
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer,   setSecurityAnswer]   = useState('');
  const [pickerVisible,    setPickerVisible]    = useState(false);
  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState('');

  const handleRegister = async () => {
    setError('');
    if (!name || !email || !password) { setError('Please fill in all fields.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (!securityQuestion) { setError('Please select a security question.'); return; }
    if (!securityAnswer.trim()) { setError('Please enter an answer to your security question.'); return; }
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password, securityQuestion, securityAnswer);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Dark hero banner with logo */}
        <View style={styles.hero}>
          <AppLogo size="lg" />
          <Text variant="titleMedium" style={styles.heroTitle}>Create Account</Text>
          <Text variant="bodySmall" style={styles.heroSubtitle}>Start achieving your goals today</Text>
        </View>

        <View style={styles.formWrapper}>
        <View style={styles.form}>
          <TextInput label="Full Name" value={name} onChangeText={setName} mode="outlined"
            autoComplete="name" style={styles.input} left={<TextInput.Icon icon="account-outline" />} />
          <TextInput label="Email" value={email} onChangeText={setEmail} mode="outlined"
            keyboardType="email-address" autoCapitalize="none" autoComplete="email"
            multiline={false} numberOfLines={1}
            style={[styles.input, styles.singleLineInput]} left={<TextInput.Icon icon="email-outline" />} />
          <TextInput label="Password" value={password} onChangeText={setPassword} mode="outlined"
            secureTextEntry={!showPassword} style={styles.input}
            left={<TextInput.Icon icon="lock-outline" />}
            right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} onPress={() => setShowPassword(!showPassword)} />} />
          <TextInput label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword}
            mode="outlined" secureTextEntry={!showPassword} style={styles.input}
            left={<TextInput.Icon icon="lock-check-outline" />} />

          {/* Security question section */}
          <View style={styles.sectionDivider}>
            <MaterialCommunityIcons name="shield-account-outline" size={16} color={COLORS.primary} />
            <Text style={styles.sectionLabel}>Account Recovery</Text>
          </View>
          <Text style={styles.sectionHint}>
            Used to verify your identity if you ever forget your password.
          </Text>

          <TouchableOpacity
            style={[styles.pickerBtn, !securityQuestion && styles.pickerBtnEmpty]}
            onPress={() => setPickerVisible(true)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="help-circle-outline" size={20} color={COLORS.primary} />
            <Text style={[styles.pickerText, !securityQuestion && styles.pickerPlaceholder]} numberOfLines={2}>
              {securityQuestion || 'Select a security question…'}
            </Text>
            <MaterialCommunityIcons name="chevron-down" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>

          {!!securityQuestion && (
            <TextInput label="Your Answer" value={securityAnswer} onChangeText={setSecurityAnswer}
              mode="outlined" style={styles.input} autoCapitalize="none"
              left={<TextInput.Icon icon="shield-key-outline" />} />
          )}

          {!!error && <HelperText type="error" visible>{error}</HelperText>}

          <Button mode="contained" onPress={handleRegister} loading={loading} disabled={loading}
            style={styles.button} contentStyle={styles.buttonContent}>
            Create Account
          </Button>
          <Button mode="text" onPress={() => navigation.goBack()} style={styles.linkButton}>
            Already have an account? Sign in
          </Button>
        </View>
        </View>
      </ScrollView>

      {/* Security question picker */}
      <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPickerVisible(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text variant="titleMedium" style={styles.modalTitle}>Select a Security Question</Text>
            <ScrollView>
              {SECURITY_QUESTIONS.map((q) => (
                <TouchableOpacity key={q}
                  style={[styles.questionRow, securityQuestion === q && styles.questionRowSelected]}
                  onPress={() => { setSecurityQuestion(q); setPickerVisible(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.questionText, securityQuestion === q && styles.questionTextSelected]}>
                    {q}
                  </Text>
                  {securityQuestion === q && (
                    <MaterialCommunityIcons name="check-circle" size={18} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#000' },
  container: { flexGrow: 1 },
  hero: {
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 44,
    paddingBottom: 20,
  },
  heroTitle: { color: '#fff', fontWeight: '800', marginTop: 10, marginBottom: 2 },
  heroSubtitle: { color: 'rgba(255,255,255,0.65)', textAlign: 'center' },
  formWrapper: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 28,
    paddingHorizontal: 24,
    paddingBottom: 32,
    flex: 1,
    minHeight: 500,
  },
  form: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 24,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8,
  },
  input: { marginBottom: 12, backgroundColor: COLORS.surface },
  singleLineInput: { height: 56 },
  button: { marginTop: 8, backgroundColor: COLORS.primary },
  buttonContent: { paddingVertical: 6 },
  linkButton: { marginTop: 8 },
  sectionDivider: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8, marginBottom: 4, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  sectionHint: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 12, lineHeight: 18 },
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: COLORS.primary, borderRadius: 8,
    padding: 14, marginBottom: 12, backgroundColor: COLORS.surface,
  },
  pickerBtnEmpty: { borderColor: COLORS.border },
  pickerText: { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 20 },
  pickerPlaceholder: { color: COLORS.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 40, maxHeight: '70%',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border,
    alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: { fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  questionRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border + '60', gap: 10,
  },
  questionRowSelected: { backgroundColor: COLORS.primary + '0D' },
  questionText: { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 20 },
  questionTextSelected: { color: COLORS.primary, fontWeight: '600' },
});
