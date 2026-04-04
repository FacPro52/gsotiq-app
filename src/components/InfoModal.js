import React, { useState } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../utils/theme';

/**
 * InfoModal — a small ⓘ button that opens a contextual help modal.
 *
 * Props:
 *   title       — Modal heading
 *   description — Main explanation text
 *   tips        — Optional string[] of bullet tips
 *   icon        — MaterialCommunityIcons name for the header badge
 *   color       — Accent color for the badge and tips
 *   style       — Extra style for the trigger button wrapper
 */
export default function InfoModal({ title, description, tips, icon, color, style }) {
  const [visible, setVisible] = useState(false);
  const accentColor = color || COLORS.primary;

  return (
    <>
      {/* Trigger button */}
      <TouchableOpacity
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={[styles.triggerBtn, style]}
      >
        <MaterialCommunityIcons
          name="information-outline"
          size={20}
          color={accentColor}
        />
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            {/* Header badge */}
            <View style={[styles.iconBadge, { backgroundColor: accentColor + '22' }]}>
              <MaterialCommunityIcons
                name={icon || 'help-circle-outline'}
                size={32}
                color={accentColor}
              />
            </View>

            <Text variant="titleLarge" style={styles.title}>{title}</Text>

            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              <Text variant="bodyMedium" style={styles.description}>{description}</Text>

              {tips && tips.length > 0 && (
                <View style={styles.tipsSection}>
                  <Text variant="labelMedium" style={[styles.tipsHeading, { color: accentColor }]}>
                    Tips
                  </Text>
                  {tips.map((tip, i) => (
                    <View key={i} style={styles.tipRow}>
                      <View style={[styles.tipDot, { backgroundColor: accentColor }]} />
                      <Text variant="bodySmall" style={styles.tipText}>{tip}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.gotItBtn, { backgroundColor: accentColor }]}
              onPress={() => setVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.gotItText}>Got it</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  triggerBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    maxHeight: '75%',
    alignItems: 'center',
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    width: '100%',
    marginBottom: 20,
  },
  description: {
    color: COLORS.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
  },
  tipsSection: {
    marginTop: 18,
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
  },
  tipsHeading: {
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    flexShrink: 0,
  },
  tipText: {
    flex: 1,
    color: COLORS.text,
    lineHeight: 19,
  },
  gotItBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  gotItText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
