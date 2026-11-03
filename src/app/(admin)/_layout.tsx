import React from 'react';
import { View } from 'react-native';
import { Slot } from 'expo-router';
import { AdminBottomTabBar } from '../../components/navigation/AdminBottomTabBar';

export default function AdminLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
      <AdminBottomTabBar />
    </View>
  );
}

