import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { IconSymbol } from '@/components/base/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChangeText, placeholder = "Search..." }: SearchBarProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.searchContainer, { backgroundColor: colorScheme === 'dark' ? '#333' : '#F0F0F0' }]}>
      <IconSymbol name="magnifyingglass" size={20} color={theme.tabIconDefault} />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={theme.tabIconDefault}
        style={[styles.searchInput, { color: theme.text }]}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    height: 40,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
});
