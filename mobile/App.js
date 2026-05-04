import React from 'react';
import { SafeAreaView, StyleSheet, Text } from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './store/AuthContext';
import AppNavigator from './navigation/AppNavigator';
import LoginScreen from './screens/LoginScreen';
import { COLORS } from './constants/colors';

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <SafeAreaView style={styles.splash}>
        <ExpoStatusBar style="light" />
        <Text style={styles.splashIcon}>✦</Text>
        <Text style={styles.splashLogo}>Cosmos</Text>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <ExpoStatusBar style="light" />
        <LoginScreen />
      </>
    );
  }

  return <AppNavigator />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: COLORS.darkDeep,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashIcon: { fontSize: 52, color: COLORS.accent, marginBottom: 12 },
  splashLogo: { fontSize: 36, fontWeight: '800', color: COLORS.white, letterSpacing: 3 },
});
