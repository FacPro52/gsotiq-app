import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../utils/theme';
import { AppHeader } from '../components/AppHeader';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Main Screens
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import ProfileScreen from '../screens/dashboard/ProfileScreen';
import GoalsScreen from '../screens/goals/GoalsScreen';
import GoalDetailScreen from '../screens/goals/GoalDetailScreen';
import StrategyDetailScreen from '../screens/strategies/StrategyDetailScreen';
import ObjectiveDetailScreen from '../screens/objectives/ObjectiveDetailScreen';
import TacticDetailScreen from '../screens/tactics/TacticDetailScreen';

// Template Screens
import TemplatesScreen from '../screens/templates/TemplatesScreen';
import TemplateDetailScreen from '../screens/templates/TemplateDetailScreen';

// Help Screen
import HelpScreen from '../screens/help/HelpScreen';

// Reports Screen
import ReportsScreen from '../screens/reports/ReportsScreen';

// Calendar Screen
import CalendarScreen from '../screens/reports/CalendarScreen';

// ── Root-level navigation ref ─────────────────────────────────────────────────
export const navigationRef = createNavigationContainerRef();

export function navigateFromRoot(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

/**
 * Minimal screenOptions for every Stack.Navigator.
 * The native header is completely replaced by AppHeader via the `header` prop
 * on each screen, so most of these only matter as fallbacks.
 */
const NAV_HEADER = {
  headerShadowVisible:   false,
  headerBackTitleVisible: false,
};

// ── Dashboard Stack ───────────────────────────────────────────────────────────
// Gets its own stack so tapping a hierarchy row is a plain same-stack navigate.
// DashboardScreen sets its own `header` dynamically via useLayoutEffect.
function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={NAV_HEADER}>
      <Stack.Screen
        name="DashboardHome"
        component={DashboardScreen}
        // header is set dynamically inside DashboardScreen via useLayoutEffect
      />
      <Stack.Screen
        name="GoalDetail"
        component={GoalDetailScreen}
        options={({ navigation }) => ({
          header: () => (
            <AppHeader
              icon="flag"
              title="Goal"
              color={COLORS.goalColor}
              backIcon="view-dashboard-outline"
              backColor={COLORS.goalColor}
              onBack={() => navigation.goBack()}
              canGoBack
            />
          ),
        })}
      />
      <Stack.Screen
        name="StrategyDetail"
        component={StrategyDetailScreen}
        options={({ navigation }) => ({
          header: () => (
            <AppHeader
              icon="chess-knight"
              title="Strategy"
              color={COLORS.strategyColor}
              backIcon="flag"
              backColor={COLORS.goalColor}
              onBack={() => navigation.goBack()}
              canGoBack
            />
          ),
        })}
      />
      <Stack.Screen
        name="ObjectiveDetail"
        component={ObjectiveDetailScreen}
        options={({ navigation }) => ({
          header: () => (
            <AppHeader
              icon="bullseye-arrow"
              title="Objective"
              color={COLORS.objectiveColor}
              backIcon="chess-knight"
              backColor={COLORS.strategyColor}
              onBack={() => navigation.goBack()}
              canGoBack
            />
          ),
        })}
      />
      <Stack.Screen
        name="TacticDetail"
        component={TacticDetailScreen}
        options={({ navigation }) => ({
          header: () => (
            <AppHeader
              icon="lightning-bolt"
              title="Tactic"
              color={COLORS.tacticColor}
              backIcon="bullseye-arrow"
              backColor={COLORS.objectiveColor}
              onBack={() => navigation.goBack()}
              canGoBack
            />
          ),
        })}
      />
    </Stack.Navigator>
  );
}

// ── Goals Stack ───────────────────────────────────────────────────────────────
function GoalsStack() {
  return (
    <Stack.Navigator screenOptions={NAV_HEADER}>
      <Stack.Screen
        name="GoalsList"
        component={GoalsScreen}
        options={() => ({
          header: () => (
            <AppHeader
              icon="flag-outline"
              title="My Goals"
              color={COLORS.primary || '#0F2548'}
              canGoBack={false}
            />
          ),
        })}
      />
      <Stack.Screen
        name="GoalDetail"
        component={GoalDetailScreen}
        options={({ navigation }) => ({
          header: () => (
            <AppHeader
              icon="flag"
              title="Goal"
              color={COLORS.goalColor}
              backIcon="flag-outline"
              backColor={COLORS.goalColor}
              onBack={() => navigation.goBack()}
              canGoBack
            />
          ),
        })}
      />
      <Stack.Screen
        name="StrategyDetail"
        component={StrategyDetailScreen}
        options={({ navigation }) => ({
          header: () => (
            <AppHeader
              icon="chess-knight"
              title="Strategy"
              color={COLORS.strategyColor}
              backIcon="flag"
              backColor={COLORS.goalColor}
              onBack={() => navigation.goBack()}
              canGoBack
            />
          ),
        })}
      />
      <Stack.Screen
        name="ObjectiveDetail"
        component={ObjectiveDetailScreen}
        options={({ navigation }) => ({
          header: () => (
            <AppHeader
              icon="bullseye-arrow"
              title="Objective"
              color={COLORS.objectiveColor}
              backIcon="chess-knight"
              backColor={COLORS.strategyColor}
              onBack={() => navigation.goBack()}
              canGoBack
            />
          ),
        })}
      />
      <Stack.Screen
        name="TacticDetail"
        component={TacticDetailScreen}
        options={({ navigation }) => ({
          header: () => (
            <AppHeader
              icon="lightning-bolt"
              title="Tactic"
              color={COLORS.tacticColor}
              backIcon="bullseye-arrow"
              backColor={COLORS.objectiveColor}
              onBack={() => navigation.goBack()}
              canGoBack
            />
          ),
        })}
      />
    </Stack.Navigator>
  );
}

// ── Templates Stack ───────────────────────────────────────────────────────────
function TemplatesStack() {
  return (
    <Stack.Navigator screenOptions={NAV_HEADER}>
      <Stack.Screen
        name="TemplatesList"
        component={TemplatesScreen}
        options={() => ({
          header: () => (
            <AppHeader
              icon="book-open-outline"
              title="Template Library"
              color="#0F2548"
              canGoBack={false}
            />
          ),
        })}
      />
      <Stack.Screen
        name="TemplateDetail"
        component={TemplateDetailScreen}
        options={({ navigation }) => ({
          header: () => (
            <AppHeader
              icon="file-document-outline"
              title="Template"
              color="#0F2548"
              backIcon="book-open-outline"
              backColor="#0F2548"
              onBack={() => navigation.goBack()}
              canGoBack
            />
          ),
        })}
      />
    </Stack.Navigator>
  );
}

// ── Main Tab Navigator ────────────────────────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        // Tab-level header is only used for Calendar/Reports/Help/Profile.
        // Dashboard, Goals, Library have headerShown: false (their stacks handle it).
        headerShown: true,
        tabBarActiveTintColor:       '#F39C12',
        tabBarInactiveTintColor:     COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor:  '#0F2548',
          borderTopColor:   '#F39C12',
          borderTopWidth:   2,
          paddingBottom:    10,
          paddingHorizontal: 8,
          height:           72,
        },
        tabBarLabelStyle:            { fontSize: 10, fontWeight: '700' },
        tabBarActiveBackgroundColor: 'rgba(243,156,18,0.08)',
        tabBarIconStyle:             { marginBottom: -2 },
        tabBarItemStyle:             { paddingVertical: 4, borderRadius: 8 },
      }}
    >
      {/* Dashboard — headerShown false; DashboardStack renders its own AppHeader */}
      <Tab.Screen
        name="Dashboard"
        component={DashboardStack}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard-outline" color={color} size={size} />
          ),
          tabBarLabel: 'Home',
        }}
      />

      {/* Goals — headerShown false; GoalsStack renders its own AppHeader */}
      <Tab.Screen
        name="GoalsTabs"
        component={GoalsStack}
        options={{
          headerShown: false,
          tabBarLabel: 'Goals',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="flag-outline" color={color} size={size} />
          ),
        }}
      />

      {/* Library — headerShown false; TemplatesStack renders its own AppHeader */}
      <Tab.Screen
        name="Library"
        component={TemplatesStack}
        options={{
          headerShown: false,
          tabBarLabel: 'Library',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="book-open-outline" color={color} size={size} />
          ),
        }}
      />

      {/* Calendar — fully custom AppHeader replaces tab navigator's native header */}
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          header: () => (
            <AppHeader icon="calendar-month-outline" title="Calendar" color="#0F2548" canGoBack={false} />
          ),
          tabBarLabel: 'Calendar',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-month-outline" color={color} size={size} />
          ),
        }}
      />

      {/* Reports */}
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          header: () => (
            <AppHeader icon="chart-bar" title="Reports" color="#0F2548" canGoBack={false} />
          ),
          tabBarLabel: 'Reports',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-bar" color={color} size={size} />
          ),
        }}
      />

      {/* Help */}
      <Tab.Screen
        name="Help"
        component={HelpScreen}
        options={{
          header: () => (
            <AppHeader icon="help-circle-outline" title="Help" color="#0F2548" canGoBack={false} />
          ),
          tabBarLabel: 'Help',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="help-circle-outline" color={color} size={size} />
          ),
        }}
      />

      {/* Profile */}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          header: () => (
            <AppHeader icon="account-circle-outline" title="Profile" color="#0F2548" canGoBack={false} />
          ),
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-circle-outline" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ── Auth Stack ────────────────────────────────────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function AppNavigator() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return (
    <NavigationContainer ref={navigationRef}>
      {user ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}
