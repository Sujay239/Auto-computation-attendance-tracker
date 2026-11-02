import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';

interface EmptyStateProps {
  iconName?: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  iconName = 'file-tray-outline',
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <View className="items-center justify-center p-8 text-center my-6">
      <View className="w-16 h-16 rounded-2xl bg-slate-100 items-center justify-center mb-4 border border-slate-200/80">
        <Ionicons name={iconName} size={30} color="#64748B" />
      </View>
      <Text className="text-base font-bold text-slate-800 mb-1 text-center">
        {title}
      </Text>
      <Text className="text-xs text-slate-400 text-center max-w-[260px] leading-relaxed mb-4">
        {description}
      </Text>
      {actionLabel && onAction && (
        <Button label={actionLabel} variant="outline" size="sm" onPress={onAction} />
      )}
    </View>
  );
};

