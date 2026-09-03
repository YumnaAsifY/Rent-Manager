import { View, Text, Image, StyleSheet, Dimensions, StatusBar } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';

import { useAuth } from '@/context/AuthContext';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [minimumDelayElapsed, setMinimumDelayElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinimumDelayElapsed(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoading && minimumDelayElapsed) {
      router.replace(user ? '/home' : '/login');
    }
  }, [isLoading, minimumDelayElapsed, router, user]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a237e" />
      
      <View style={styles.content}>
        <Image
          source={require('@/assets/images/splash-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        
        <Text style={styles.appName}>RENT MANAGER</Text>
        
        <View style={styles.loadingContainer}>
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotMiddle]} />
          <View style={[styles.dot, styles.dotLast]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: width * 0.8,
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 3,
    marginBottom: 40,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotMiddle: {
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  dotLast: {
    backgroundColor: '#ffffff',
  },
});