import React from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ThemedText } from '@/components/base/themed-text';

interface AuthInputProps extends TextInputProps {
  label: string;
  error?: string;
}

export function AuthInput({ label, error, style, ...props }: AuthInputProps) {
  const color = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({ light: '#F5F5F5', dark: '#2C2C2E' }, 'background');
  const placeholderColor = useThemeColor({ light: '#8E8E93', dark: '#8E8E93' }, 'text');

  return (
    <View style={styles.container}>
      <ThemedText style={styles.label} type="defaultSemiBold">{label}</ThemedText>
      <TextInput
        style={[
          styles.input,
          { color, backgroundColor, borderColor: error ? '#FF3B30' : 'transparent' },
          style,
        ]}
        placeholderTextColor={placeholderColor}
        {...props}
      />
      {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
  },
  input: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
  },
});
