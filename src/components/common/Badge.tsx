import React from 'react';
import { View, Text } from 'react-native';

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'purple';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'md',
  icon,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          container: 'bg-emerald-50 border-emerald-200/90',
          text: 'text-emerald-700',
          dot: 'bg-emerald-500',
        };
      case 'warning':
        return {
          container: 'bg-amber-50 border-amber-200/90',
          text: 'text-amber-800',
          dot: 'bg-amber-500',
        };
      case 'danger':
        return {
          container: 'bg-rose-50 border-rose-200/90',
          text: 'text-rose-700',
          dot: 'bg-rose-500',
        };
      case 'info':
        return {
          container: 'bg-blue-50 border-blue-200/90',
          text: 'text-blue-700',
          dot: 'bg-blue-500',
        };
      case 'purple':
        return {
          container: 'bg-purple-50 border-purple-200/90',
          text: 'text-purple-700',
          dot: 'bg-purple-500',
        };
      case 'neutral':
      default:
        return {
          container: 'bg-slate-100 border-slate-200',
          text: 'text-slate-700',
          dot: 'bg-slate-400',
        };
    }
  };

  const styles = getVariantStyles();
  const sizeClasses =
    size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <View
      className={`flex-row items-center self-start rounded-full border ${styles.container} ${sizeClasses}`}
    >
      {icon ? (
        <View className="mr-1">{icon}</View>
      ) : (
        <View className={`w-1.5 h-1.5 rounded-full mr-1.5 ${styles.dot}`} />
      )}
      <Text className={`font-semibold tracking-wide ${styles.text}`}>
        {label}
      </Text>
    </View>
  );
};
