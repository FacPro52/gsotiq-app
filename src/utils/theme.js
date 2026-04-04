import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

export const COLORS = {
  primary: '#1A3C6E',       // Deep navy - main brand color
  secondary: '#2E86C1',     // Bright blue
  accent: '#F39C12',        // Gold/amber accent
  success: '#27AE60',       // Green
  warning: '#E67E22',       // Orange
  error: '#E74C3C',         // Red
  background: '#F4F6F9',    // Light gray background
  surface: '#FFFFFF',       // White
  text: '#1C2833',          // Dark text
  textSecondary: '#717D7E', // Gray text
  border: '#D5D8DC',        // Light border
  // GSOT Level Colors
  goalColor: '#1A3C6E',     // Navy for Goals
  strategyColor: '#2471A3', // Blue for Strategies
  objectiveColor: '#1E8449', // Green for Objectives
  tacticColor: '#7D6608',   // Gold for Tactics
  taskColor: '#6C3483',     // Purple for Tasks
};

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: COLORS.primary,
    secondary: COLORS.secondary,
    background: COLORS.background,
    surface: COLORS.surface,
    error: COLORS.error,
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: COLORS.secondary,
    secondary: COLORS.accent,
  },
};

export const GSOT_CONFIG = {
  goal: {
    label: 'Goal',
    pluralLabel: 'Goals',
    color: COLORS.goalColor,
    icon: 'flag',
    description: 'Broad primary outcome you want to achieve',
    level: 1,
  },
  strategy: {
    label: 'Strategy',
    pluralLabel: 'Strategies',
    color: COLORS.strategyColor,
    icon: 'chess-knight',
    description: 'Approach you will take to reach the goal',
    level: 2,
  },
  objective: {
    label: 'Objective',
    pluralLabel: 'Objectives',
    color: COLORS.objectiveColor,
    icon: 'target',
    description: 'Specific measurable milestone tied to a strategy',
    level: 3,
  },
  tactic: {
    label: 'Tactic',
    pluralLabel: 'Tactics',
    color: COLORS.tacticColor,
    icon: 'tools',
    description: 'Specific action taken to achieve an objective',
    level: 4,
  },
  task: {
    label: 'Task',
    pluralLabel: 'Tasks',
    color: COLORS.taskColor,
    icon: 'checkbox-marked-outline',
    description: 'Concrete work item to accomplish a tactic',
    level: 5,
  },
};

export const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started', color: COLORS.textSecondary },
  { value: 'in_progress', label: 'In Progress', color: COLORS.secondary },
  { value: 'completed', label: 'Completed', color: COLORS.success },
  { value: 'on_hold', label: 'On Hold', color: COLORS.warning },
  { value: 'cancelled', label: 'Cancelled', color: COLORS.error },
];

export const PRIORITY_OPTIONS = [
  { value: 'low',      label: 'Low',      color: '#717D7E', icon: 'arrow-down-circle-outline' },
  { value: 'medium',   label: 'Medium',   color: '#2E86C1', icon: 'minus-circle-outline'      },
  { value: 'high',     label: 'High',     color: '#E67E22', icon: 'arrow-up-circle-outline'   },
  { value: 'critical', label: 'Critical', color: '#E74C3C', icon: 'alert-circle-outline'      },
];

export const RECURRENCE_OPTIONS = [
  { value: 'none',        label: 'None',        icon: 'close-circle-outline',    color: '#717D7E' },
  { value: 'daily',       label: 'Daily',       icon: 'calendar-today',          color: '#2E86C1' },
  { value: 'weekdays',    label: 'Weekdays',    icon: 'calendar-week',           color: '#1E8449' },
  { value: 'weekly',      label: 'Weekly',      icon: 'calendar-refresh-outline',color: '#7D6608' },
  { value: 'biweekly',    label: 'Bi-weekly',   icon: 'calendar-arrow-right',    color: '#D35400' },
  { value: 'monthly',     label: 'Monthly',     icon: 'calendar-month-outline',  color: '#8E44AD' },
  { value: 'custom_days', label: 'Custom Days', icon: 'calendar-check-outline',  color: '#B7470A' },
];

export const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What was the name of your elementary school?",
  "What is your mother's maiden name?",
  "What was the make of your first car?",
  "What is your oldest sibling's middle name?",
  "What street did you grow up on?",
  "What was the name of your childhood best friend?",
  "What is the name of the town where you went to high school?",
  "What was your childhood nickname?",
];

export const CATEGORY_OPTIONS = [
  { value: 'health_wellness',    label: 'Health & Wellness',      icon: 'heart-pulse',            color: '#C0392B' },
  { value: 'career_professional',label: 'Career & Professional',  icon: 'briefcase-outline',      color: '#1A5276' },
  { value: 'financial',          label: 'Financial Independence', icon: 'chart-line',             color: '#1E8449' },
  { value: 'personal_growth',    label: 'Personal Growth',        icon: 'head-lightbulb-outline', color: '#7D3C98' },
  { value: 'education_learning', label: 'Education & Learning',   icon: 'school-outline',         color: '#117A65' },
  { value: 'relationships',      label: 'Relationships & Social', icon: 'account-heart-outline',  color: '#B7470A' },
  { value: 'home_lifestyle',     label: 'Home & Lifestyle',       icon: 'home-heart-outline',     color: '#E67E22' },
  { value: 'creativity_arts',    label: 'Creativity & Arts',      icon: 'palette-outline',        color: '#8E44AD' },
  { value: 'travel_adventure',   label: 'Travel & Adventure',     icon: 'airplane-takeoff',       color: '#2980B9' },
  { value: 'entrepreneurship',   label: 'Entrepreneurship',       icon: 'rocket-launch-outline',  color: '#D35400' },
];
