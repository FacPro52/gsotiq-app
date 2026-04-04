import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Pressable,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../utils/theme';

const { width: SCREEN_W } = Dimensions.get('window');

const ONBOARDING_KEY = 'gsot_onboarding_seen_v1';

const SLIDES = [
  {
    icon: 'compass-outline',
    color: '#2980B9',
    title: 'Welcome to GSOT',
    body: 'GSOT helps you achieve anything by breaking big ambitions into structured, actionable steps.\n\nGoals → Strategies → Objectives → Tactics → Tasks',
    highlight: null,
  },
  {
    icon: 'flag-outline',
    color: '#2E86C1',
    title: 'Goals',
    body: 'A Goal is your big-picture destination — the high-level outcome you want to achieve.\n\nExample: "Run a marathon by end of year" or "Launch a side business."',
    highlight: 'Big picture. Where are you going?',
  },
  {
    icon: 'chess-knight',
    color: '#1E8449',
    title: 'Strategies',
    body: "Strategies are the major approaches or themes you'll use to reach your Goal.\n\nExample: \"Build endurance through consistent training\" or \"Validate a product idea.\"",
    highlight: "The how. What's your game plan?",
  },
  {
    icon: 'target',
    color: '#7D3C98',
    title: 'Objectives',
    body: "Objectives are specific, measurable milestones within a Strategy. They tell you when you're on track.\n\nExample: \"Run 5 km without stopping\" or \"Get 10 paying customers.\"",
    highlight: 'Measurable checkpoints. How will you know?',
  },
  {
    icon: 'tools',
    color: '#D35400',
    title: 'Tactics & Tasks',
    body: 'Tactics are the specific activities or habits under each Objective. Tasks break tactics into day-to-day actions you can check off.\n\nThis is where the real work happens.',
    highlight: 'Daily actions. What will you do today?',
  },
  {
    icon: 'rocket-launch-outline',
    color: COLORS.primary,
    title: 'Ready to Go!',
    body: 'Start by creating your first Goal. Tap the + button on the Dashboard or in the My Goals tab.\n\nYou can also explore our Template Library for ready-made goal plans.',
    highlight: null,
  },
];

export default function OnboardingTour({ forceShow = false, onDone }) {
  const [visible, setVisible]     = useState(false);
  const [slideIdx, setSlideIdx]   = useState(0);

  useEffect(() => {
    (async () => {
      if (forceShow) { setVisible(true); return; }
      const seen = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (!seen) setVisible(true);
    })();
  }, [forceShow]);

  const dismiss = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setVisible(false);
    onDone?.();
  };

  const next = () => {
    if (slideIdx < SLIDES.length - 1) setSlideIdx((i) => i + 1);
    else dismiss();
  };

  const prev = () => {
    if (slideIdx > 0) setSlideIdx((i) => i - 1);
  };

  const slide = SLIDES[slideIdx];
  const isLast = slideIdx === SLIDES.length - 1;
  const isFirst = slideIdx === 0;

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Skip button */}
          {!isLast && (
            <TouchableOpacity style={styles.skipBtn} onPress={dismiss} activeOpacity={0.7}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          )}

          {/* Icon badge */}
          <View style={[styles.iconBadge, { backgroundColor: slide.color + '22' }]}>
            <MaterialCommunityIcons name={slide.icon} size={40} color={slide.color} />
          </View>

          {/* Title */}
          <Text variant="headlineSmall" style={styles.title}>{slide.title}</Text>

          {/* Highlight pill */}
          {slide.highlight && (
            <View style={[styles.highlightPill, { backgroundColor: slide.color + '18', borderColor: slide.color + '44' }]}>
              <Text style={[styles.highlightText, { color: slide.color }]}>{slide.highlight}</Text>
            </View>
          )}

          {/* Body */}
          <Text variant="bodyMedium" style={styles.body}>{slide.body}</Text>

          {/* Dot indicators */}
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === slideIdx
                    ? { backgroundColor: slide.color, width: 20 }
                    : { backgroundColor: COLORS.border },
                ]}
              />
            ))}
          </View>

          {/* Navigation buttons */}
          <View style={styles.navRow}>
            {!isFirst ? (
              <TouchableOpacity style={styles.prevBtn} onPress={prev} activeOpacity={0.7}>
                <MaterialCommunityIcons name="arrow-left" size={18} color={COLORS.textSecondary} />
                <Text style={styles.prevText}>Back</Text>
              </TouchableOpacity>
            ) : <View style={{ flex: 1 }} />}

            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: slide.color }]}
              onPress={next}
              activeOpacity={0.85}
            >
              <Text style={styles.nextText}>{isLast ? "Let's Go!" : 'Next'}</Text>
              {!isLast && (
                <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  skipBtn: {
    alignSelf: 'flex-end',
    marginBottom: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  skipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  iconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  highlightPill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 12,
  },
  highlightText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    color: COLORS.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 24,
    alignItems: 'center',
  },
  dot: {
    height: 6,
    borderRadius: 3,
    width: 6,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  prevBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
  },
  prevText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 15,
  },
  nextBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  nextText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
