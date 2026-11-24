import React from 'react';

// 새 보안 아키텍처: Zustand authStore + SecureStore 기반 AppNavigator
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './store/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
