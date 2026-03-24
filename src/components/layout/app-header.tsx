import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { IconSymbol } from '@/components/base/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showNotification?: boolean;
  rightElement?: React.ReactNode;
}

export function AppHeader({ title, subtitle, showNotification = true, rightElement }: AppHeaderProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.header}>
      <View>
        {subtitle && <Text style={[styles.subtitle, { color: theme.tabIconDefault }]}>{subtitle}</Text>}
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      </View>
      <View style={styles.rightSection}>
        {rightElement}
        {showNotification && (
          <Pressable style={styles.iconButton}>
            <IconSymbol name="bell.fill" size={24} color={theme.text} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginLeft: 15,
  },
});
