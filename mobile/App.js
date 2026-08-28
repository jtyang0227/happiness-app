import React from 'react';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

// 새 보안 아키텍처: Zustand authStore + SecureStore 기반 AppNavigator
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './store/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <ExpoStatusBar style="light" />
      <AppNavigator />
    </AuthProvider>
  );
}
