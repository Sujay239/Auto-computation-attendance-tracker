import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  View,
  TouchableOpacityProps,
} from 'react-native';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'destructive'
  | 'ghost';

export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  iconPosition = 'left',
  disabled,
  className = '',
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          container: 'bg-blue-600 active:bg-blue-700 border-transparent shadow-sm shadow-blue-500/20',
          text: 'text-white font-semibold',
          spinnerColor: '#ffffff',
        };
      case 'secondary':
        return {
          container: 'bg-slate-100 active:bg-slate-200 border-transparent',
          text: 'text-slate-900 font-semibold',
          spinnerColor: '#0F172A',
        };
      case 'outline':
        return {
          container: 'bg-white active:bg-slate-50 border-slate-300',
          text: 'text-slate-800 font-medium',
          spinnerColor: '#2563EB',
        };
      case 'destructive':
        return {
          container: 'bg-rose-600 active:bg-rose-700 border-transparent shadow-sm shadow-rose-500/20',
          text: 'text-white font-semibold',
          spinnerColor: '#ffffff',
        };
      case 'ghost':
        return {
          container: 'bg-transparent active:bg-slate-100 border-transparent',
          text: 'text-slate-700 font-medium',
          spinnerColor: '#2563EB',
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'py-2 px-3 rounded-xl min-h-[36px]',
          text: 'text-xs',
        };
      case 'lg':
        return {
          container: 'py-3.5 px-6 rounded-2xl min-h-[52px]',
          text: 'text-base font-bold',
        };
      case 'md':
      default:
        return {
          container: 'py-2.5 px-4 rounded-xl min-h-[44px]',
          text: 'text-sm font-semibold',
        };
    }
  };

  const vStyles = getVariantStyles();
  const sStyles = getSizeStyles();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || isLoading}
      className={`flex-row items-center justify-center border ${vStyles.container} ${sStyles.container} ${
        disabled ? 'opacity-50' : ''
      } ${className}`}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={vStyles.spinnerColor} />
      ) : (
        <View className="flex-row items-center justify-center gap-2">
          {icon && iconPosition === 'left' && <View>{icon}</View>}
          <Text className={`${vStyles.text} ${sStyles.text}`}>{label}</Text>
          {icon && iconPosition === 'right' && <View>{icon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

