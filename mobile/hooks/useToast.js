import { useRef, useState } from 'react';
import { Animated } from 'react-native';

export function useToast() {
  const [message, setMessage] = useState('');
  const anim = useRef(new Animated.Value(0)).current;

  const show = (msg) => {
    setMessage(msg);
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(anim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  return { message, anim, show };
}
