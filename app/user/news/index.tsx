import React, { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, Pressable, SafeAreaView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Link, Href, useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/base/themed-text';
import { AppHeader } from '@/components/layout/app-header';
import { IconSymbol } from '@/components/base/icon-symbol';
import { newsService, NewsItem } from '@/services/newsService';

export default function NewsListScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const data = await newsService.getNewsList();
          if (!cancelled) setNews(data);
        } catch {
          // giữ danh sách cũ nếu lỗi mạng
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <AppHeader title="Tin tức & Sự kiện" showNotification={false} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.tint} />
        </View>
      ) : news.length === 0 ? (
        <View style={styles.center}>
          <IconSymbol name="newspaper.fill" size={64} color={theme.tabIconDefault + '40'} />
          <ThemedText style={styles.emptyText}>Chưa có tin tức nào</ThemedText>
        </View>
      ) : (
        <FlatList
          data={news}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Link href={`/user/news/${item.id}` as Href} asChild>
              <Pressable style={[styles.card, isDark && styles.cardDark]}>
                {item.image ? <Image source={item.image} style={styles.image} contentFit="cover" /> : null}
                <View style={styles.body}>
                  <ThemedText type="defaultSemiBold" numberOfLines={2}>{item.title}</ThemedText>
                  {item.createdAt ? <ThemedText style={styles.date}>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</ThemedText> : null}
                </View>
              </Pressable>
            </Link>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { marginTop: 16, fontSize: 16, opacity: 0.6, textAlign: 'center' },
  list: { padding: 20 },
  card: { borderRadius: 16, backgroundColor: '#FFFFFF', marginBottom: 16, overflow: 'hidden' },
  cardDark: { backgroundColor: '#1C1C1E' },
  image: { width: '100%', height: 160, backgroundColor: '#1C1C1E' },
  body: { padding: 14 },
  date: { fontSize: 12, opacity: 0.5, marginTop: 6 },
});
