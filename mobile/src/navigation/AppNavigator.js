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
import FindAccountScreen from '../../screens/FindAccountScreen';
import ExploreScreen     from '../../screens/ExploreScreen';
import GalleryScreen     from '../../screens/GalleryScreen';
import PhotoFormScreen   from '../../screens/PhotoFormScreen';
import FeedScreen        from '../../screens/FeedScreen';
import ProfileScreen     from '../../screens/ProfileScreen';
import PhotoDetailScreen from '../../screens/PhotoDetailScreen';
import SeriesScreen      from '../../screens/SeriesScreen';
import LegalScreen       from '../../screens/LegalScreen';
import MeetsScreen       from '../../screens/MeetsScreen';
import MeetDetailScreen  from '../../screens/MeetDetailScreen';
import PortfolioSlideshowScreen from '../../screens/PortfolioSlideshowScreen';
import GatheringsScreen             from '../../screens/GatheringsScreen';
import GatheringDetailScreen        from '../../screens/GatheringDetailScreen';
import GatheringInstagramShareScreen from '../../screens/GatheringInstagramShareScreen';
import BookingScreen     from '../../screens/BookingScreen';
import DeliveryScreen    from '../../screens/DeliveryScreen';
import AvailabilitySettingsScreen from '../../screens/AvailabilitySettingsScreen';
import ScheduleScreen from '../../screens/ScheduleScreen';
import BlockedUsersScreen from '../../screens/BlockedUsersScreen';
import GatheringNotifBadge from '../../components/GatheringNotifBadge';
import { StatusBar } from 'expo-status-bar';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// 헤더·탭바는 본문과 같은 밝은 Toss 서페이스(흰 바탕 + 회색 구분선). 예전 남색 헤더는 밝은 본문과 따로 놀았다.
// 어두운 화면은 사진 뷰어·슬라이드쇼·로그인 계열만(CLAUDE.md "다크 예외 영역").
const HEADER = {
  headerShown: true,
  headerStyle: { backgroundColor: COLORS.white },
  headerTintColor: COLORS.textPrimary,
  headerTitleStyle: { fontWeight: '700', fontSize: FONT.lg, color: COLORS.textPrimary },
  headerShadowVisible: true,
};

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
    <View style={styles.tabIconWrap} accessibilityLabel={label}>
      <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>{icon}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

// ── Main Tabs ────────────────────────────────────────────────────────
function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        ...HEADER,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.border,
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
          title: '둘러보기',
          tabBarIcon: ({ focused }) => <TabIcon icon="🔍" label="둘러보기" focused={focused} />,
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
      <Stack.Screen name="FindAccount" component={FindAccountScreen} />
      <Stack.Screen name="Legal"  component={LegalScreen}
        options={{ ...HEADER, title: '법적 고지' }} />
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
        options={{ ...HEADER, title: '사진 등록' }} />
      <Stack.Screen name="Series"      component={SeriesScreen}
        options={{ ...HEADER, title: '시리즈' }} />
      <Stack.Screen name="Meets"       component={MeetsScreen}
        options={{ ...HEADER, title: '약속' }} />
      <Stack.Screen name="MeetDetail"  component={MeetDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Booking"     component={BookingScreen}    options={{ ...HEADER, title: '예약 관리' }} />
      <Stack.Screen name="AvailabilitySettings" component={AvailabilitySettingsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Schedule"    component={ScheduleScreen}   options={{ ...HEADER, title: '통합 일정' }} />
      <Stack.Screen name="Delivery"    component={DeliveryScreen}   options={{ ...HEADER, title: '납품 관리' }} />
      <Stack.Screen name="PortfolioSlideshow" component={PortfolioSlideshowScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Gatherings"  component={GatheringsScreen}
        options={{ ...HEADER, title: '사진 모임',
          headerRight: () => <GatheringNotifBadge /> }} />
      <Stack.Screen name="GatheringDetail" component={GatheringDetailScreen}
        options={{ ...HEADER, title: '모임 상세' }} />
      <Stack.Screen name="GatheringInstagramShare" component={GatheringInstagramShareScreen}
        options={{ ...HEADER, title: 'Instagram Story 공유' }} />
      <Stack.Screen name="Legal"       component={LegalScreen}
        options={{ ...HEADER, title: '법적 고지' }} />
      <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen}
        options={{ ...HEADER, title: '차단한 사용자' }} />
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
      {/* 로그인 계열은 어두운 화면 → 흰 글자, 로그인 후는 밝은 헤더 → 검은 글자 (슬라이드쇼는 화면 안에서 다시 흰 글자) */}
      <StatusBar style={isAuthenticated ? 'dark' : 'light'} />
      {isAuthenticated ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg,   // splash.png와 같은 바탕
  },
  splashText: {
    marginTop: 16, fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: 1,
  },

  // 아이콘 칸이 좁아 라벨이 한 글자씩 줄바꿈되던 문제("둘러/보기") — 폭을 주고 한 줄로
  tabIconWrap: { alignItems: 'center', justifyContent: 'center', minWidth: 64 },
  tabIcon:      { fontSize: 20, opacity: 0.55 },
  tabIconFocused: { opacity: 1 },
  tabLabel:     { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  tabLabelFocused: { color: COLORS.primary, fontWeight: '700' },

  addTabWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    marginTop: -12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },   // 중립 그림자만(브랜드색 그림자 금지)
    shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
  },
  addTabIcon: { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 32 },
});
