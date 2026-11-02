import React from 'react';
import { View } from 'react-native';
import { Slot } from 'expo-router';
import { BottomTabBar } from '../../components/navigation/BottomTabBar';

export default function TabsLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
      <BottomTabBar />
    </View>
  );
}
