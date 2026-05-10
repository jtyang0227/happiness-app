/**
 * AppNavigator.js — 인증 상태 기반 네비게이션 (React Navigation 6)
 *
 * isInitialized: false → SplashScreen (SecureStore 로딩 중)
 * isAuthenticated: false → AuthStack (로그인/회원가입)
 * isAuthenticated: true  → MainStack (앱 메인)
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import useAuthStore from '../store/authStore';
import { useAuthBootstrap } from '../hooks/useAuthBootstrap';

// 기존 screens 재사용
import LoginScreen    from '../../screens/LoginScreen';
import SignUpScreen   from '../../screens/SignUpScreen';
import ExploreScreen  from '../../screens/ExploreScreen';
import GalleryScreen  from '../../screens/GalleryScreen';
import ListScreen     from '../../screens/ListScreen';
import ProfileScreen  from '../../screens/ProfileScreen';
import PhotoFormScreen   from '../../screens/PhotoFormScreen';
import PhotoDetailScreen from '../../screens/PhotoDetailScreen';
import PostDetailScreen  from '../../screens/PostDetailScreen';

const Stack = createNativeStackNavigator();

// ── Splash ──────────────────────────────────────────────────────────
function SplashScreen() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#5c5cff" />
      <Text style={styles.splashText}>Happiness</Text>
    </View>
  );
}

// ── Unauthorized ────────────────────────────────────────────────────
function UnauthorizedScreen({ navigation }) {
  return (
    <View style={styles.center}>
      <Text style={styles.errorTitle}>접근 권한이 없습니다</Text>
      <Text style={styles.backLink} onPress={() => navigation.goBack()}>
        이전으로 돌아가기
      </Text>
    </View>
  );
}

// ── Auth Stack ──────────────────────────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login"  component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
}

// ── Main Stack ──────────────────────────────────────────────────────
function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0a0a18' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="Explore"    component={ExploreScreen}    options={{ title: '탐색' }} />
      <Stack.Screen name="Gallery"    component={GalleryScreen}    options={{ title: '갤러리' }} />
      <Stack.Screen name="List"       component={ListScreen}       options={{ title: '목록' }} />
      <Stack.Screen name="Profile"    component={ProfileScreen}    options={{ title: '프로필' }} />
      <Stack.Screen name="PhotoForm"  component={PhotoFormScreen}  options={{ title: '사진 등록' }} />
      <Stack.Screen name="PhotoDetail"    component={PhotoDetailScreen}    options={{ headerShown: false }} />
      <Stack.Screen name="PostDetail"     component={PostDetailScreen}     options={{ headerShown: false }} />
      <Stack.Screen name="Unauthorized"   component={UnauthorizedScreen}   options={{ title: '' }} />
    </Stack.Navigator>
  );
}

// ── Root Navigator ──────────────────────────────────────────────────
export default function AppNavigator() {
  const { isAuthenticated, isInitialized } = useAuthStore();
  useAuthBootstrap();

  if (!isInitialized) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a18',
  },
  splashText: {
    marginTop: 16,
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 2,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  backLink: {
    color: '#5c5cff',
    fontSize: 14,
  },
});
