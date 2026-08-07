import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, SafeAreaView,
  ActivityIndicator, Alert, RefreshControl, Platform, TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { Link, Href, useFocusEffect, router } from 'expo-router';
import { IconSymbol } from '@/components/base/icon-symbol';
import { meService, FavoriteMovie } from '@/services/meService';

/* ── Theme ───────────────────────────────────────────────────────── */
const C = {
  bg:      '#0f102a',
  card:    '#141632',
  border:  'rgba(255,255,255,0.07)',
  purple:  '#7b1fa2',
  pink:    '#e91e8c',
  yellow:  '#d4e219',
  text:    '#FFFFFF',
  muted:   'rgba(255,255,255,0.45)',
  divider: 'rgba(255,255,255,0.06)',
  red:     '#e57373',
} as const;

const cardShadow = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12 },
  android: { elevation: 7 },
}) ?? {};

/* ── Helpers ─────────────────────────────────────────────────────── */
function StarRating({ rating }: { rating: number }) {
  return (
    <View style={s.ratingBadge}>
      <IconSymbol name="star.fill" size={9} color={C.yellow} />
      <Text style={s.ratingText}>{rating.toFixed(1)}</Text>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={s.emptyWrap}>
      <View style={s.emptyIcon}>
        <IconSymbol name="heart.slash.fill" size={42} color={C.pink + '60'} />
      </View>
      <Text style={s.emptyTitle}>Chưa có phim yêu thích</Text>
      <Text style={s.emptySub}>Nhấn vào biểu tượng ♥ trên bất kỳ phim nào để lưu vào đây.</Text>
      <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/user/(tabs)/' as Href)} activeOpacity={0.85}>
        <Text style={s.emptyBtnText}>Khám phá phim ngay</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ── Main Screen ─────────────────────────────────────────────────── */
export default function FavoritesScreen() {
  const [favorites,  setFavorites]  = useState<FavoriteMovie[]>([]);
  const [loading,    setLoading]    = useState(true);
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

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleRemove = (movie: FavoriteMovie) => {
    Alert.alert(
      'Bỏ yêu thích',
      `Bỏ "${movie.title}" khỏi danh sách yêu thích?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Bỏ thích', style: 'destructive',
          onPress: async () => {
            try {
              await meService.removeFavorite(movie.movieId);
              setFavorites(prev => prev.filter(f => f.movieId !== movie.movieId));
            } catch (err: any) {
              Alert.alert('Lỗi', err.message || 'Không thực hiện được thao tác.');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: FavoriteMovie }) => (
    <View style={s.movieCard}>
      <Link href={`/user/movie/${item.movieId}` as Href} asChild>
        <Pressable style={{ flex: 1 }}>
          <Image source={item.poster} style={s.poster} contentFit="cover" />
          {item.review?.rating != null && <StarRating rating={item.review.rating} />}
          <View style={s.movieInfo}>
            <Text style={s.movieTitle} numberOfLines={2}>{item.title}</Text>
            {item.duration ? (
              <Text style={s.movieDuration}>{item.duration} phút</Text>
            ) : null}
          </View>
        </Pressable>
      </Link>
      <TouchableOpacity
        style={s.heartBtn}
        onPress={() => handleRemove(item)}
        hitSlop={8}
        activeOpacity={0.7}
      >
        <IconSymbol name="heart.fill" size={18} color={C.red} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
          <IconSymbol name="chevron.left" size={20} color={C.text} />
        </Pressable>
        <Text style={s.headerTitle}>
          PHIM <Text style={{ color: C.pink }}>YÊU THÍCH</Text>
        </Text>
        {favorites.length > 0 ? (
          <View style={s.countBadge}>
            <Text style={s.countText}>{favorites.length}</Text>
          </View>
        ) : <View style={{ width: 40 }} />}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.purple} />
        </View>
      ) : favorites.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={item => String(item.movieId)}
          numColumns={2}
          contentContainerStyle={s.grid}
          columnWrapperStyle={s.row}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.purple}
              colors={[C.purple]}
              progressBackgroundColor={C.card}
            />
          }
          ListHeaderComponent={
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>DANH SÁCH <Text style={{ color: C.yellow }}>YÊU THÍCH</Text></Text>
              <Text style={s.sectionSub}>{favorites.length} phim đã lưu</Text>
            </View>
          }
          renderItem={renderItem}
        />
      )}
    </SafeAreaView>
  );
}

/* ── Styles ──────────────────────────────────────────────────────── */
const CARD_W = '48%';

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.divider,
  },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: C.text, letterSpacing: 1 },
  countBadge: {
    width: 40, height: 28, borderRadius: 10,
    backgroundColor: C.purple + '33',
    justifyContent: 'center', alignItems: 'center',
  },
  countText: { fontSize: 13, fontWeight: '700', color: C.purple },

  /* Section header */
  sectionHeader: { paddingHorizontal: 4, paddingTop: 4, paddingBottom: 12 },
  sectionTitle:  { fontSize: 13, fontWeight: '800', color: C.text, letterSpacing: 1, textTransform: 'uppercase' },
  sectionSub:    { fontSize: 12, color: C.muted, marginTop: 3 },

  /* Grid */
  grid: { padding: 16, paddingBottom: 32 },
  row:  { justifyContent: 'space-between', marginBottom: 14 },

  /* Movie card */
  movieCard: {
    width: CARD_W,
    borderRadius: 16,
    backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border,
    overflow: 'hidden',
    ...cardShadow,
  },
  poster: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: C.card,
  },
  ratingBadge: {
    position: 'absolute', top: 8, left: 8,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 7, paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: { fontSize: 10, fontWeight: '700', color: C.yellow },
  heartBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center',
  },
  movieInfo: { padding: 10, paddingTop: 8 },
  movieTitle:    { fontSize: 12, fontWeight: '700', color: C.text, lineHeight: 16 },
  movieDuration: { fontSize: 10, color: C.muted, marginTop: 4 },

  /* Empty state */
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: C.pink + '15',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 8 },
  emptySub:   { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn: {
    paddingHorizontal: 28, paddingVertical: 13,
    borderRadius: 14, backgroundColor: C.purple,
    ...Platform.select({
      ios:     { shadowColor: C.purple, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
