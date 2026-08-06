import React, { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, Pressable, SafeAreaView, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { Link, Href, useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/base/themed-text';
import { AppHeader } from '@/components/layout/app-header';
import { IconSymbol } from '@/components/base/icon-symbol';
import { meService, FavoriteMovie } from '@/services/meService';

export default function FavoritesScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [favorites, setFavorites] = useState<FavoriteMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await meService.getFavorites();
      setFavorites(data);
    } catch {
      // giữ danh sách cũ nếu lỗi mạng
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleRemove = (movie: FavoriteMovie) => {
    Alert.alert('Bỏ yêu thích', `Bỏ "${movie.title}" khỏi danh sách yêu thích?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Bỏ thích',
        style: 'destructive',
        onPress: async () => {
          try {
            await meService.removeFavorite(movie.movieId);
            setFavorites((prev) => prev.filter((f) => f.movieId !== movie.movieId));
          } catch (error: any) {
            Alert.alert('Lỗi', error.message || 'Không thực hiện được thao tác.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <AppHeader title="Phim yêu thích" showNotification={false} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.tint} />
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.center}>
          <IconSymbol name="heart" size={64} color={theme.tabIconDefault + '40'} />
          <ThemedText style={styles.emptyText}>Bạn chưa yêu thích phim nào</ThemedText>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => String(item.movieId)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" colors={['#FFFFFF']} progressBackgroundColor="#1C1C1E" />
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Link href={`/user/movie/${item.movieId}` as Href} asChild>
                <Pressable style={styles.rowMain}>
                  <Image source={item.poster} style={styles.poster} contentFit="cover" />
                  <View style={styles.info}>
                    <ThemedText type="defaultSemiBold" numberOfLines={2}>{item.title}</ThemedText>
                    {item.duration ? <ThemedText style={styles.duration}>{item.duration} phút</ThemedText> : null}
                  </View>
                </Pressable>
              </Link>
              <Pressable onPress={() => handleRemove(item)} hitSlop={10} style={styles.removeBtn}>
                <IconSymbol name="heart.fill" size={22} color="#FF3B30" />
              </Pressable>
            </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#00000005',
    borderRadius: 16,
    padding: 10,
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  poster: { width: 56, height: 80, borderRadius: 10, backgroundColor: '#1C1C1E' },
  info: { flex: 1, marginLeft: 12 },
  duration: { fontSize: 12, opacity: 0.5, marginTop: 4 },
  removeBtn: { padding: 8 },
});
