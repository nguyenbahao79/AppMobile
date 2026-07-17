import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/base/themed-text';
import { ThemedView } from '@/components/base/themed-view';
import { newsService, NewsItem } from '@/services/newsService';

export default function NewsDetailScreen() {
  const { id } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [item, setItem] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await newsService.getNewsDetail(id as string);
        if (!cancelled) setItem(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </ThemedView>
    );
  }

  if (!item) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ThemedText>Không tìm thấy tin tức</ThemedText>
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: 'Chi tiết tin', headerBackTitle: 'Quay lại' }} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {item.image ? <Image source={item.image} style={styles.image} contentFit="cover" /> : null}
        <View style={styles.content}>
          <ThemedText type="title" style={styles.title}>{item.title}</ThemedText>
          {item.createdAt ? (
            <ThemedText style={styles.date}>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</ThemedText>
          ) : null}
          <ThemedText style={styles.body}>{item.content}</ThemedText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: 220, backgroundColor: '#1C1C1E' },
  content: { padding: 20 },
  title: { fontSize: 22, lineHeight: 28, marginBottom: 8 },
  date: { fontSize: 12, opacity: 0.5, marginBottom: 16 },
  body: { fontSize: 15, lineHeight: 23, opacity: 0.8 },
});
