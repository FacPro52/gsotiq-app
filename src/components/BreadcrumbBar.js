/**
 * BreadcrumbBar — tappable hierarchy breadcrumb
 *
 * Renders a row of labelled segments separated by › chevrons.
 * Each segment with an onPress handler becomes a tappable link.
 * The last segment (current screen) is always non-interactive and bold.
 * Long-pressing any segment shows a tooltip with the full untruncated label.
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../utils/theme';

/** Truncate a label to at most `n` characters, appending … if needed. */
const trunc = (str = '', n = 50) =>
  str.length > n ? str.slice(0, n) + '…' : str;

export default function BreadcrumbBar({ segments = [] }) {
  const [tooltip, setTooltip] = useState(null); // full label string or null

  if (!segments.length) return null;

  const showTooltip = (label) => {
    setTooltip(label);
    setTimeout(() => setTooltip(null), 2000);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        {segments.map((seg, i) => {
          const isLast  = i === segments.length - 1;
          const display = trunc(seg.label);
          return (
            <React.Fragment key={i}>
              {/* Separator chevron (not before first item) */}
              {i > 0 && (
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={12}
                  color={COLORS.textSecondary}
                  style={styles.chevron}
                />
              )}

              {/* Tappable segment or plain label */}
              {!isLast && seg.onPress ? (
                <Pressable
                  onPress={seg.onPress}
                  onLongPress={() => showTooltip(seg.label)}
                  style={({ pressed }) => [styles.segWrap, pressed && styles.pressed]}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Text style={styles.link}>{display}</Text>
                </Pressable>
              ) : (
                <Text
                  style={[styles.label, isLast && styles.current, styles.segWrap]}
                  onLongPress={() => showTooltip(seg.label)}
                >
                  {display}
                </Text>
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Tooltip bubble — appears below the bar on long press */}
      {tooltip ? (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipText}>{tooltip}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  chevron: {
    marginHorizontal: 1,
    flexShrink: 0,
  },
  segWrap: {
    flexShrink: 1,
    minWidth: 0,
  },
  link: {
    fontSize: 13,
    color: COLORS.secondary,
    fontWeight: '600',
    textDecorationLine: 'underline',
    textDecorationColor: COLORS.secondary + '66',
  },
  label: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  current: {
    color: COLORS.text,
    fontWeight: '700',
    textDecorationLine: 'none',
  },
  pressed: {
    opacity: 0.5,
  },
  tooltip: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.text,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    maxWidth: '90%',
  },
  tooltipText: {
    color: COLORS.surface,
    fontSize: 12,
    fontWeight: '500',
  },
});
