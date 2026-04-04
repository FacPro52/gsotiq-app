import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { PaperProvider } from 'react-native-paper';
import { AuthProvider } from './src/context/AuthContext';
import { GSOTProvider } from './src/context/GSOTContext';
import AppNavigator, { navigateFromRoot } from './src/navigation/AppNavigator';
import { lightTheme } from './src/utils/theme';
import {
  requestNotificationPermissions,
  getNotificationNavTarget,
} from './src/utils/notifications';

export default function App() {
  // ── Ask for notification permission once on first launch ──────────────────
  useEffect(() => {
    requestNotificationPermissions().catch(() => {});
  }, []);

  // ── Handle tapping a notification (even when app was backgrounded) ────────
  useEffect(() => {
    // Fired when the user taps a notification while the app is running
    const foregroundSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const target = getNotificationNavTarget(response);
      if (target) {
        // Small delay so the navigation container is fully ready
        setTimeout(() => navigateFromRoot(target.name, target.params), 500);
      }
    });

    // Check for a notification that launched the app from a cold start
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const target = getNotificationNavTarget(response);
      if (target) {
        setTimeout(() => navigateFromRoot(target.name, target.params), 1000);
      }
    });

    return () => foregroundSub.remove();
  }, []);

  return (
    <PaperProvider theme={lightTheme}>
      <AuthProvider>
        <GSOTProvider>
          <StatusBar style="light" />
          <AppNavigator />
        </GSOTProvider>
      </AuthProvider>
    </PaperProvider>
  );
}
