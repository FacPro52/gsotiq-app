import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../utils/theme';

export default function EmptyState({ icon, title, subtitle, actionLabel, onAction, color }) {
  return (
    <View style={styles.container}>
      <View style={[styles.iconBox, { backgroundColor: (color || COLORS.primary) + '18' }]}>
        <MaterialCommunityIcons
          name={icon || 'inbox-outline'}
          size={48}
          color={color || COLORS.primary}
        />
      </View>
      <Text variant="titleMedium" style={styles.title}>{title}</Text>
      {!!subtitle && (
        <Text variant="bodyMedium" style={styles.subtitle}>{subtitle}</Text>
      )}
      {!!actionLabel && (
        <Button
          mode="contained"
          onPress={onAction}
          style={[styles.button, { backgroundColor: color || COLORS.primary }]}
          contentStyle={{ paddingHorizontal: 8, paddingVertical: 6 }}
        >
          {actionLabel}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    color: COLORS.text,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  button: { borderRadius: 8 },
});
