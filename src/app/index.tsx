import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function IndexScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        if (user?.role === 'ADMIN') {
          router.replace('/(admin)/home' as any);
        } else {
          router.replace('/(tabs)/home');
        }
      } else {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, isLoading, user]);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#2563EB" />
    </View>
  );
}
