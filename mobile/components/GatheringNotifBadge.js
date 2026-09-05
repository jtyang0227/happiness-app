import React, { useEffect, useState } from 'react';
import { Alert, Linking, Text, TouchableOpacity, View } from 'react-native';
import { gatheringApi } from '../src/api/gatheringApi';

const WEB_NOTIFICATIONS_URL = __DEV__
  ? 'http://localhost:3000/gatherings/notifications'
  : 'https://app.example.com/gatherings/notifications';

const POLL_INTERVAL_MS = 30000;

export default function GatheringNotifBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    const load = () => {
      gatheringApi.getUnreadCount()
        .then(res => { if (mounted) setCount(res?.count || 0); })
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const handlePress = () => {
    Alert.alert(
      '모임 알림',
      '알림 목록은 웹에서 확인할 수 있습니다. 브라우저에서 여시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '웹으로 이동', onPress: () => Linking.openURL(WEB_NOTIFICATIONS_URL) },
      ]
    );
  };

  return (
    <TouchableOpacity onPress={handlePress} style={{ marginRight: 16, padding: 4 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <View>
        <Text style={{ fontSize: 20 }}>🔔</Text>
        {count > 0 && (
          <View style={{
            position: 'absolute', top: -4, right: -6,
            minWidth: 16, height: 16, borderRadius: 8,
            backgroundColor: '#F04452', alignItems: 'center', justifyContent: 'center',
            paddingHorizontal: 3,
          }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
              {count > 9 ? '9+' : count}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
