import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
  containerClassName?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  iconName,
  isPassword = false,
  containerClassName = '',
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className={`w-full mb-3.5 ${containerClassName}`}>
      {label && (
        <Text className="text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
          {label}
        </Text>
      )}

      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderColor: error ? '#EF4444' : isFocused ? '#2563EB' : '#CBD5E1',
          borderWidth: isFocused ? 1.5 : 1,
          minHeight: 50,
        }}
        className="flex-row items-center rounded-xl px-3.5"
      >
        {iconName && (
          <Ionicons
            name={iconName}
            size={19}
            color={error ? '#EF4444' : isFocused ? '#2563EB' : '#64748B'}
            style={{ marginRight: 10 }}
          />
        )}

        <TextInput
          style={{
            flex: 1,
            fontSize: 15,
            color: '#0F172A',
            paddingVertical: Platform.OS === 'ios' ? 12 : 8,
            textAlignVertical: 'center',
            includeFontPadding: false,
          }}
          placeholderTextColor="#94A3B8"
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {isPassword && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowPassword(!showPassword)}
            className="p-2"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#64748B"
            />
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <Text className="text-xs text-rose-600 mt-1 font-semibold">{error}</Text>
      ) : hint ? (
        <Text className="text-xs text-slate-400 mt-1">{hint}</Text>
      ) : null}
    </View>
  );
};
