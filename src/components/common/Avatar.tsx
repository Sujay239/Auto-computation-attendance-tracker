import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
  showStatusDot?: boolean;
  statusColor?: string;
  fallbackBg?: string;
  fallbackTextColor?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  uri,
  name = 'Staff Member',
  size = 46,
  showStatusDot = true,
  statusColor = '#10B981', // emerald-500 active indicator
  fallbackBg,
  fallbackTextColor,
}) => {
  const [hasError, setHasError] = useState(false);

  // Reset error state if the uri prop updates or reloads
  useEffect(() => {
    setHasError(false);
  }, [uri]);

  const cleanUri =
    uri && typeof uri === 'string' && uri.trim() !== '' && uri.trim() !== 'null' && uri.trim() !== 'undefined'
      ? uri.trim()
      : null;

  const hasValidUri = Boolean(
    cleanUri &&
      cleanUri.length > 10 &&
      (cleanUri.startsWith('http://') ||
        cleanUri.startsWith('https://') ||
        cleanUri.startsWith('data:image/') ||
        cleanUri.startsWith('file://'))
  );

  const getInitials = (fullName: string) => {
    if (!fullName) return 'EM';
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
    }
    return (fullName.slice(0, 2) || 'EM').toUpperCase();
  };

  const initials = getInitials(name);
  const fontSize = Math.max(Math.round(size * 0.38), 11);
  const dotSize = Math.max(Math.round(size * 0.28), 10);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {hasValidUri && !hasError ? (
        <Image
          source={{ uri: cleanUri! }}
          style={[
            styles.image,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
          onError={() => setHasError(true)}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: fallbackBg || '#2563EB',
              borderColor: fallbackBg ? '#C7D2FE' : '#93C5FD',
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize, color: fallbackTextColor || '#FFFFFF' }]}>
            {initials}
          </Text>
        </View>
      )}

      {showStatusDot && (
        <View
          style={[
            styles.statusDot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: statusColor,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#E2E8F0',
  },
  fallback: {
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
