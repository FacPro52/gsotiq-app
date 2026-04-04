import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../utils/theme';
import OnboardingTour from '../../components/OnboardingTour';

// ─── Data ─────────────────────────────────────────────────────────────────────

const GSOT_LEVELS = [
  {
    icon: 'flag-outline',
    color: '#2E86C1',
    level: 'Goal',
    tagline: 'Where are you going?',
    description:
      'A Goal is the highest-level outcome you want to achieve. It defines your destination and should be meaningful, inspiring, and tied to a life area you care about.',
    examples: [
      'Run a marathon by December',
      'Achieve financial independence by age 45',
      'Launch a successful online business',
      'Build a deeper mindfulness practice',
    ],
    tips: [
      'Limit yourself to 3–5 active goals at a time to stay focused.',
      'Write goals in positive, outcome-focused language.',
      'Attach a due date to create urgency.',
      'Link each goal to a life category (Health, Career, etc.) for clarity.',
    ],
  },
  {
    icon: 'chess-knight',
    color: '#1E8449',
    level: 'Strategy',
    tagline: "What's your game plan?",
    description:
      'A Strategy is a major approach or theme that advances your Goal. It describes HOW you will pursue the goal — a coherent direction that groups related efforts.',
    examples: [
      'Build endurance through progressive training',
      'Reduce expenses and grow passive income streams',
      'Validate the product before full launch',
      'Establish a daily meditation and journaling habit',
    ],
    tips: [
      'A goal typically has 2–5 strategies.',
      'Strategies should be distinct and non-overlapping.',
      'Think of strategies as "pillars" that support your goal.',
      'Review strategies monthly to check they\'re still relevant.',
    ],
  },
  {
    icon: 'target',
    color: '#7D3C98',
    level: 'Objective',
    tagline: 'How will you know you\'re on track?',
    description:
      'Objectives are specific, measurable milestones within a Strategy. They mark concrete progress checkpoints and make it easy to track whether your strategy is working.',
    examples: [
      'Run 10 km continuously by end of month 2',
      'Reduce monthly expenses by $500',
      'Get 10 people to sign up for the beta',
      'Meditate for 20+ minutes 5 days a week for 30 days',
    ],
    tips: [
      'Objectives should be measurable — include numbers where possible.',
      'Each objective should have a clear success condition.',
      'Use the "Measures / KPIs" field to define how you\'ll measure success.',
      'Aim for 2–4 objectives per strategy.',
    ],
  },
  {
    icon: 'tools',
    color: '#D35400',
    level: 'Tactic',
    tagline: 'What specific actions will you take?',
    description:
      'Tactics are specific, recurring activities or habits that move you toward an Objective. They represent the regular "doing" work — the disciplines you practise to make progress.',
    examples: [
      'Weekly long run every Sunday morning',
      'Track all expenses in a budget spreadsheet',
      'Send 5 outreach emails to potential beta users per week',
      'Morning 15-minute guided meditation using an app',
    ],
    tips: [
      'Tactics should be concrete and actionable — not vague.',
      'Assign a cadence (weekly, daily, etc.) to recurring tactics.',
      'Use tactics to build habits, not just complete one-off tasks.',
      'Keep the number of active tactics manageable — quality over quantity.',
    ],
  },
  {
    icon: 'checkbox-marked-outline',
    color: '#5D6D7E',
    level: 'Task',
    tagline: 'What will you do today?',
    description:
      'Tasks are individual, actionable to-dos within a Tactic. They break the tactic down into concrete steps you can check off. Tasks can have due dates and can recur daily, weekly, or monthly.',
    examples: [
      'Register for the city marathon',
      'Review last month\'s credit card statement',
      'Draft email template for beta outreach',
      'Download a meditation app and set a morning reminder',
    ],
    tips: [
      'Use recurring tasks for habits you want to track consistently.',
      'Assign due dates to avoid tasks falling through the cracks.',
      'Keep individual tasks small and completable in one sitting.',
      'Tap a task\'s check circle to mark it complete.',
    ],
  },
];

const FAQS = [
  {
    q: 'How is GSOT different from a regular to-do list?',
    a: 'A to-do list tells you WHAT to do. GSOT also tells you WHY — every task connects to a tactic, which connects to an objective, strategy, and goal. This context keeps you motivated and focused on what actually matters.',
  },
  {
    q: 'How many goals should I have?',
    a: 'We recommend 3–5 active goals at a time. Fewer goals means more focus, better consistency, and higher completion rates. You can always archive completed goals and add new ones.',
  },
  {
    q: 'What if I don\'t know my strategies yet?',
    a: 'Start with the goal and a couple of obvious strategies. You don\'t need everything planned from the start — you can refine strategies as you learn what works. Use the Template Library for inspiration.',
  },
  {
    q: 'How do I use Templates?',
    a: 'Visit the Library tab to browse templates by life category. Each template is a pre-built Goal with strategies, objectives, and tactics. Tap "Use Template" to import it, then customise the title, description, and dates to make it your own.',
  },
  {
    q: 'What does the progress percentage mean?',
    a: 'Progress rolls up from Tasks → Tactics → Objectives → Strategies → Goal. If 50% of your tasks are completed, your tactic shows 50%, which averages up through the hierarchy to your goal\'s overall progress.',
  },
  {
    q: 'How do recurring tasks work?',
    a: 'When you mark a recurring task as complete, it automatically resets with the next scheduled due date (e.g. "next Monday" for weekly tasks). This lets you track habits without creating new tasks each time.',
  },
  {
    q: 'Can I change an item\'s priority without opening it?',
    a: 'Yes! On any Goal, Strategy, Objective, or Tactic card, tap the priority badge (e.g. "Medium") in the card footer to get a quick picker. The change saves immediately.',
  },
  {
    q: 'How do I delete a Goal?',
    a: 'Open the Goal detail screen and tap the Delete button at the bottom of the header card. You can also tap the trash icon on each Goal tile in the My Goals list. Deleting a goal permanently removes all its linked Strategies, Objectives, Tactics, and Tasks.',
  },
];

const TIPS = [
  {
    icon: 'calendar-check-outline',
    title: 'Weekly Review',
    tip: 'Spend 15 minutes every Sunday reviewing your goals. Check what\'s on track, update statuses, and plan the week ahead.',
  },
  {
    icon: 'star-outline',
    title: 'Start Small',
    tip: 'If a goal feels overwhelming, break it into smaller strategies and objectives. Small wins build momentum.',
  },
  {
    icon: 'trending-up',
    title: 'Progress Over Perfection',
    tip: 'Mark items "In Progress" rather than leaving them "Not Started". Visible progress is motivating.',
  },
  {
    icon: 'lightbulb-on-outline',
    title: 'Use Templates',
    tip: 'The Template Library has 50+ proven goal structures across all life areas. Use them as a starting point.',
  },
  {
    icon: 'repeat',
    title: 'Build Habits',
    tip: 'Use recurring tasks for daily or weekly habits. The app automatically advances the due date when you check them off.',
  },
  {
    icon: 'clipboard-check-outline',
    title: 'Keep Tactics Actionable',
    tip: 'Tactics should be concrete enough that you know exactly what to do. Vague tactics don\'t get done.',
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function LevelCard({ item }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={[styles.levelCard, { borderLeftColor: item.color }]}
      onPress={() => setExpanded((e) => !e)}
      activeOpacity={0.85}
    >
      <View style={styles.levelHeader}>
        <View style={[styles.levelIcon, { backgroundColor: item.color + '22' }]}>
          <MaterialCommunityIcons name={item.icon} size={22} color={item.color} />
        </View>
        <View style={styles.levelHeaderText}>
          <Text variant="titleMedium" style={[styles.levelTitle, { color: item.color }]}>
            {item.level}
          </Text>
          <Text variant="bodySmall" style={styles.levelTagline}>{item.tagline}</Text>
        </View>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={COLORS.textSecondary}
        />
      </View>

      {expanded && (
        <View style={styles.levelBody}>
          <Text variant="bodyMedium" style={styles.levelDesc}>{item.description}</Text>

          <Text variant="labelMedium" style={[styles.subHeading, { color: item.color }]}>Examples</Text>
          {item.examples.map((ex, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={[styles.bullet, { backgroundColor: item.color }]} />
              <Text variant="bodySmall" style={styles.bulletText}>{ex}</Text>
            </View>
          ))}

          <Text variant="labelMedium" style={[styles.subHeading, { color: item.color }]}>Tips</Text>
          {item.tips.map((tip, i) => (
            <View key={i} style={styles.bulletRow}>
              <MaterialCommunityIcons name="check-circle-outline" size={14} color={item.color} style={{ marginTop: 2 }} />
              <Text variant="bodySmall" style={styles.bulletText}>{tip}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

function FaqItem({ item }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={styles.faqItem}
      onPress={() => setExpanded((e) => !e)}
      activeOpacity={0.85}
    >
      <View style={styles.faqHeader}>
        <Text variant="bodyMedium" style={styles.faqQ}>{item.q}</Text>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={COLORS.textSecondary}
        />
      </View>
      {expanded && (
        <Text variant="bodySmall" style={styles.faqA}>{item.a}</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HelpScreen() {
  const [tourVisible, setTourVisible] = useState(false);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero banner */}
        <View style={styles.heroBanner}>
          <MaterialCommunityIcons name="help-circle-outline" size={40} color={COLORS.primary} />
          <Text variant="headlineSmall" style={styles.heroTitle}>Help & Guide</Text>
          <Text variant="bodyMedium" style={styles.heroSub}>
            Everything you need to master the GSOT framework and get the most out of this app.
          </Text>
          <TouchableOpacity
            style={styles.tourBtn}
            onPress={() => setTourVisible(true)}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="play-circle-outline" size={18} color="#fff" />
            <Text style={styles.tourBtnText}>Replay Onboarding Tour</Text>
          </TouchableOpacity>
        </View>

        {/* GSOT Levels */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>The GSOT Framework</Text>
          <Text variant="bodySmall" style={styles.sectionSub}>
            Tap any level to expand its full guide with examples and tips.
          </Text>
          {GSOT_LEVELS.map((item) => (
            <LevelCard key={item.level} item={item} />
          ))}
        </View>

        <Divider style={styles.divider} />

        {/* Best Practice Tips */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Best Practices</Text>
          <View style={styles.tipsGrid}>
            {TIPS.map((tip, i) => (
              <View key={i} style={styles.tipCard}>
                <MaterialCommunityIcons name={tip.icon} size={26} color={COLORS.primary} style={{ marginBottom: 6 }} />
                <Text variant="labelLarge" style={styles.tipTitle}>{tip.title}</Text>
                <Text variant="bodySmall" style={styles.tipBody}>{tip.tip}</Text>
              </View>
            ))}
          </View>
        </View>

        <Divider style={styles.divider} />

        {/* FAQs */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {FAQS.map((faq, i) => (
            <FaqItem key={i} item={faq} />
          ))}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Onboarding tour — force show when triggered from button */}
      {tourVisible && (
        <OnboardingTour forceShow={true} onDone={() => setTourVisible(false)} />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 40 },

  heroBanner: {
    backgroundColor: COLORS.surface,
    margin: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  heroTitle: {
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 10,
    marginBottom: 6,
  },
  heroSub: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  tourBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  tourBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: {
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
    marginTop: 16,
  },
  sectionSub: {
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  divider: { marginVertical: 8, marginHorizontal: 16 },

  // Level cards
  levelCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderLeftWidth: 4,
    marginBottom: 10,
    padding: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  levelHeaderText: { flex: 1 },
  levelTitle: { fontWeight: '800' },
  levelTagline: { color: COLORS.textSecondary, marginTop: 1 },
  levelBody: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border },
  levelDesc: { color: COLORS.textSecondary, lineHeight: 20, marginBottom: 14 },
  subHeading: { fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 6, flexShrink: 0 },
  bulletText: { flex: 1, color: COLORS.text, lineHeight: 18 },

  // Tips grid
  tipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  tipCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    width: '47%',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  tipTitle: {
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  tipBody: {
    color: COLORS.textSecondary,
    lineHeight: 17,
  },

  // FAQs
  faqItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  faqQ: {
    flex: 1,
    color: COLORS.text,
    fontWeight: '600',
    lineHeight: 20,
  },
  faqA: {
    color: COLORS.textSecondary,
    marginTop: 10,
    lineHeight: 20,
  },
});
