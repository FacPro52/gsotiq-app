/**
 * AppLogo — GSOTiQ brand mark
 *
 * For xl / lg sizes: renders the actual GSOTiQ logo image.
 * For md / sm  sizes: renders the compact coloured-bar badge (no image needed).
 *
 * Props:
 *   size        — 'xl' | 'lg' | 'md' | 'sm'   (default 'lg')
 *   showTitle   — ignored for xl/lg (image already includes wordmark)
 *   variant     — 'dark' | 'light'  — only affects md/sm badge text
 */

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../utils/theme';

// ── Actual logo image ────────────────────────────────────────────────────────
// Place the GSOTiQ logo PNG at:  assets/gsotiq-logo.png
// (Save the file the user uploaded to that path in the project folder)
const LOGO_SOURCE = require('../../assets/gsotiq-logo.png');

// Image dimensions (width × height) for each size — maintain logo's aspect ratio
const IMG_SIZES = {
  xl:  { width: 340, height: 200 },
  lg:  { width: 260, height: 155 },
};

// ── Badge sizes (md / sm only) ───────────────────────────────────────────────
const BADGE_SIZES = {
  md:  { box: 60, radius: 14, bars: 7, barGap: 3, iq: 8 },
  sm:  { box: 44, radius: 10, bars: 5, barGap: 2, iq: 0 },
};

// G → S → O → T ascending bar heights (as fraction of box)
const BAR_FRACS  = [0.54, 0.40, 0.28, 0.18];
const BAR_COLORS = [
  COLORS.goalColor,
  COLORS.strategyColor,
  COLORS.objectiveColor,
  COLORS.tacticColor,
];

const BRAND_PRIMARY = COLORS.primary;
const BRAND_ACCENT  = COLORS.accent;

export default function AppLogo({ size = 'lg', showTitle = false, variant = 'dark' }) {
  // ── Large sizes: use the actual logo image ─────────────────────────────────
  if (size === 'xl' || size === 'lg') {
    const dims = IMG_SIZES[size];
    return (
      <Image
        source={LOGO_SOURCE}
        style={{ width: dims.width, height: dims.height }}
        resizeMode="contain"
      />
    );
  }

  // ── Small sizes: use the compact bar-chart badge ───────────────────────────
  const s = BADGE_SIZES[size] || BADGE_SIZES.md;
  const barsW = 4 * s.bars + 3 * s.barGap;

  return (
    <View style={[
      styles.badge,
      { width: s.box, height: s.box, borderRadius: s.radius },
    ]}>
      <View style={[styles.gloss, { borderRadius: s.radius }]} />
      <View style={[styles.bars, { width: barsW, gap: s.barGap }]}>
        {BAR_FRACS.map((frac, i) => (
          <View
            key={i}
            style={{
              width:        s.bars,
              height:       Math.round(s.box * frac),
              borderRadius: Math.round(s.bars * 0.45),
              backgroundColor: BAR_COLORS[i],
              opacity: 0.95,
            }}
          />
        ))}
      </View>
      {s.iq > 0 && (
        <View style={[styles.iqChip, { bottom: s.box * 0.07, right: s.box * 0.07 }]}>
          <Text style={[styles.iqChipText, { fontSize: s.iq }]}>iQ</Text>
        </View>
      )}
      <View style={[
        styles.ring,
        { width: s.box - 5, height: s.box - 5, borderRadius: s.radius - 1.5 },
      ]} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: BRAND_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    elevation: 10,
    shadowColor: BRAND_PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.40,
    shadowRadius: 14,
  },
  gloss: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.06)',
    transform: [{ rotate: '-30deg' }, { scaleX: 2 }],
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  iqChip: {
    position: 'absolute',
    backgroundColor: BRAND_ACCENT,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  iqChipText: {
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
});
