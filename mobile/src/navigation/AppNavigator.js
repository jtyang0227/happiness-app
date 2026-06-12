import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, ActivityIndicator, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useAuthStore from '../store/authStore';
import { useAuthBootstrap } from '../hooks/useAuthBootstrap';
import { COLORS } from '../../constants/colors';
import { FONT } from '../../constants/layout';

import LoginScreen       from '../../screens/LoginScreen';
import SignUpScreen      from '../../screens/SignUpScreen';
import ExploreScreen     from '../../screens/ExploreScreen';
import GalleryScreen     from '../../screens/GalleryScreen';
import PhotoFormScreen   from '../../screens/PhotoFormScreen';
import FeedScreen        from '../../screens/FeedScreen';
import ProfileScreen     from '../../screens/ProfileScreen';
import PhotoDetailScreen from '../../screens/PhotoDetailScreen';
import SeriesScreen      from '../../screens/SeriesScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// ── Splash ──────────────────────────────────────────────────────────
function SplashScreen() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.splashText}>Happiness</Text>
    </View>
  );
}

// ── Tab icon helper ──────────────────────────────────────────────────
function TabIcon({ icon, label, focused }) {
  return (
    <View style={styles.tabIconWrap}>
      <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>{icon}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>
    </View>
  );
}

// ── Main Tabs ────────────────────────────────────────────────────────
function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle:     { backgroundColor: '#0a0a18' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700', fontSize: FONT.lg },
        tabBarStyle: {
          backgroundColor: '#0a0a18',
          borderTopColor: '#1e1e3a',
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="ExploreTab"
        component={ExploreScreen}
        options={{
          title: '탐색',
          tabBarIcon: ({ focused }) => <TabIcon icon="🔍" label="탐색" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="GalleryTab"
        component={GalleryScreen}
        options={{
          title: '갤러리',
          tabBarIcon: ({ focused }) => <TabIcon icon="🖼️" label="갤러리" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="PhotoFormTab"
        component={PhotoFormScreen}
        options={{
          title: '등록',
          tabBarIcon: ({ focused }) => (
            <View style={styles.addTabWrap}>
              <Text style={styles.addTabIcon}>＋</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="FeedTab"
        component={FeedScreen}
        options={{
          title: '피드',
          tabBarIcon: ({ focused }) => <TabIcon icon="📰" label="피드" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: '프로필',
          tabBarIcon: ({ focused }) => <TabIcon icon="👤" label="프로필" focused={focused} />,
        }}
      />
    </Tab.Navigator>
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

// ── Main Stack (tabs + modal screens) ──────────────────────────────
function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main"        component={MainTabs}         options={{ headerShown: false }} />
      <Stack.Screen name="PhotoDetail" component={PhotoDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PhotoForm"   component={PhotoFormScreen}
        options={{ headerShown: true, headerStyle: { backgroundColor: '#0a0a18' },
          headerTintColor: '#fff', title: '사진 등록' }} />
      <Stack.Screen name="Series"      component={SeriesScreen}
        options={{ headerShown: true, headerStyle: { backgroundColor: '#0a0a18' },
          headerTintColor: '#fff', title: '시리즈' }} />
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
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a18',
  },
  splashText: {
    marginTop: 16, fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: 2,
  },

  tabIconWrap: { alignItems: 'center', justifyContent: 'center' },
  tabIcon:      { fontSize: 20, opacity: 0.5 },
  tabIconFocused: { opacity: 1 },
  tabLabel:     { fontSize: 10, color: '#888', marginTop: 2 },
  tabLabelFocused: { color: COLORS.primary, fontWeight: '700' },

  addTabWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    marginTop: -12,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  addTabIcon: { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 32 },
});
