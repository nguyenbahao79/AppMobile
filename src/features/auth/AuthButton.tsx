import React from 'react';
import { StyleSheet, TouchableOpacity, TouchableOpacityProps, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/base/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

interface AuthButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
}

export function AuthButton({ title, loading, disabled, style, ...props }: AuthButtonProps) {
  const tintColor = useThemeColor({}, 'tint');
  const textColor = '#FFFFFF';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: tintColor, opacity: (disabled || loading) ? 0.7 : 1 },
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <ThemedText style={[styles.text, { color: textColor }]} type="defaultSemiBold">
          {title}
        </ThemedText>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
  },
  text: {
    fontSize: 18,
  },
});
