import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet, ScrollView, View, Text, TouchableOpacity, FlatList,
  Dimensions, ActivityIndicator, TextInput, RefreshControl, Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { movieService } from '@/services/movieService';
import { newsService, NewsItem } from '@/services/newsService';
import { Movie } from '@/mocks/movies';
import { useAuth } from '@/context/AuthContext';

const { width: SW } = Dimensions.get('window');

const NAVY   = '#0d0d2b';
const CARD   = '#14143a';
const PURPLE = '#8b00ff';
const PINK   = '#ff2d78';
const YELLOW = '#d4ff00';
const WHITE  = '#f0f0ff';
const MUTED  = 'rgba(240,240,255,0.5)';
const BORDER = 'rgba(255,255,255,0.1)';

/* ─────────────────────────────── Section header ── */
function SectionHeader({ pre, accent, onSeeAll }: { pre: string; accent: string; onSeeAll?: () => void }) {
  return (
    <View style={sh.row}>
      <View>
        <Text style={sh.title}>
          {pre} <Text style={{ color: YELLOW }}>{accent}</Text>
        </Text>
        <View style={sh.bar} />
      </View>
      {onSeeAll && (
        <TouchableOpacity style={sh.btn} onPress={onSeeAll}>
          <Text style={sh.btnText}>Xem tất cả →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
const sh = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, marginBottom: 14 },
  title: { fontSize: 20, fontWeight: 'bold', color: WHITE, letterSpacing: 1 },
  bar: { width: 44, height: 3, backgroundColor: PURPLE, borderRadius: 2, marginTop: 6 },
  btn: { borderWidth: 1, borderColor: 'rgba(212,255,0,0.3)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(212,255,0,0.05)', marginTop: 4 },
  btnText: { fontSize: 11, fontWeight: '800', color: YELLOW, letterSpacing: 0.5 },
});

/* ─────────────────────────────── News slider ── */
function NewsSlider({ news }: { news: NewsItem[] }) {
  const listRef = useRef<FlatList>(null);
  const [current, setCurrent] = useState(0);
  const currentRef = useRef(0);

  useEffect(() => {
    if (news.length <= 1) return;
    const t = setInterval(() => {
      const next = (currentRef.current + 1) % news.length;
      currentRef.current = next;
      setCurrent(next);
      listRef.current?.scrollToIndex({ index: next, animated: true });
    }, 3500);
    return () => clearInterval(t);
  }, [news.length]);

  if (!news.length) return null;

  return (
    <View style={ns.wrap}>
      <View style={ns.headerRow}>
        <Text style={ns.label}>TIN TỨC & SỰ KIỆN</Text>
        <TouchableOpacity onPress={() => router.push('/user/news' as Href)}>
          <Text style={ns.more}>Xem tất cả →</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={news}
        keyExtractor={(item) => String(item.id)}
        horizontal
        pagingEnabled={false}
        snapToInterval={SW - 28}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={ns.content}
        getItemLayout={(_, i) => ({ length: SW - 28, offset: 20 + i * (SW - 28), index: i })}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / (SW - 28));
          currentRef.current = idx;
          setCurrent(idx);
        }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={ns.slide}
            activeOpacity={0.88}
            onPress={() => router.push(`/user/news/${item.id}` as Href)}
          >
            {item.image
              ? <Image source={item.image} style={ns.image} contentFit="cover" />
              : <View style={[ns.image, ns.imgPlaceholder]}>
                  <Ionicons name="newspaper-outline" size={40} color={MUTED} />
                </View>
            }
            <View style={ns.overlay}>
              <View style={ns.badge}>
                <Text style={ns.badgeText}>TIN TỨC</Text>
              </View>
              <Text style={ns.slideTitle} numberOfLines={2}>{item.title}</Text>
              {item.createdAt && (
                <Text style={ns.slideDate}>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
      />

      {news.length > 1 && (
        <View style={ns.dots}>
          {news.map((_, i) => (
            <View key={i} style={[ns.dot, i === current && ns.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}
const ns = StyleSheet.create({
  wrap: { marginBottom: 28 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  label: { fontSize: 11, fontWeight: '800', color: PINK, letterSpacing: 1.5 },
  more: { fontSize: 11, fontWeight: '700', color: YELLOW },
  content: { paddingHorizontal: 20 },
  slide: { width: SW - 40, height: 185, borderRadius: 16, overflow: 'hidden', backgroundColor: CARD, marginRight: 12 },
  image: { width: '100%', height: '100%' },
  imgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  overlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.52)', padding: 14 },
  badge: { backgroundColor: PINK, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 7 },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  slideTitle: { fontSize: 15, fontWeight: 'bold', color: '#fff', lineHeight: 21 },
  slideDate: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: 10, gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  dotActive: { width: 18, backgroundColor: YELLOW },
});

/* ─────────────────────────────── Movie card ── */
function HomeMovieCard({ movie, showBuyBtn }: { movie: Movie; showBuyBtn: boolean }) {
  return (
    <View style={mc.outer}>
      <TouchableOpacity
        style={mc.card}
        activeOpacity={0.88}
        onPress={() => router.push(`/user/movie/${movie.id}` as Href)}
      >
        <View style={mc.imageWrap}>
          <Image
            source={movie.posterUrl || movie.poster}
            style={mc.image}
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
          />
          <View style={[mc.badge, movie.status === 1 ? { backgroundColor: PINK } : { backgroundColor: PURPLE }]}>
            <Text style={mc.badgeText}>{movie.status === 1 ? 'ĐANG CHIẾU' : 'SẮP CHIẾU'}</Text>
          </View>
        </View>

        <View style={mc.info}>
          <Text style={mc.title} numberOfLines={2}>{movie.title}</Text>
          <View style={mc.genreRow}>
            {!!movie.genre && (
              <Text style={mc.genreChip} numberOfLines={1}>{movie.genre.split(' • ')[0]}</Text>
            )}
            {!!movie.duration && (
              <Text style={mc.durationText}>{movie.duration}m</Text>
            )}
          </View>
          <View style={mc.ratingRow}>
            <Ionicons name="star" size={11} color={movie.rating > 0 ? '#FFD700' : 'rgba(255,255,255,0.2)'} />
            <Text style={[mc.ratingText, movie.rating === 0 && { color: 'rgba(255,255,255,0.3)' }]}>
              {movie.rating > 0 ? movie.rating.toFixed(1) : '—'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {showBuyBtn && (
        <TouchableOpacity
          style={mc.buyBtn}
          activeOpacity={0.85}
          onPress={() => router.push(`/user/booking/${movie.id}` as Href)}
        >
          <Ionicons name="ticket-outline" size={12} color="#fff" />
          <Text style={mc.buyText}>ĐẶT VÉ NGAY</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
const mc = StyleSheet.create({
  outer: { flex: 1, margin: 8 },
  card: { backgroundColor: CARD, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
  imageWrap: { width: '100%', aspectRatio: 2 / 3, backgroundColor: '#1a1a3a', position: 'relative' },
  image: { width: '100%', height: '100%' },
  badge: { position: 'absolute', top: 8, left: 8, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 },
  badgeText: { fontSize: 8, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  info: { padding: 10 },
  title: { fontSize: 12, fontWeight: 'bold', color: WHITE, lineHeight: 17, height: 34 },
  genreRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5, height: 18 },
  genreChip: { fontSize: 9, fontWeight: '700', color: PURPLE, backgroundColor: PURPLE + '22', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  durationText: { fontSize: 9, color: MUTED },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  ratingText: { fontSize: 10, fontWeight: '700', color: '#FFD700' },
  buyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 6, backgroundColor: PURPLE, borderRadius: 8, paddingVertical: 8 },
  buyText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.8 },
});

/* ─────────────────────────────── 2-column movie grid ── */
function MovieGrid({ movies, showBuyBtn }: { movies: Movie[]; showBuyBtn: boolean }) {
  const rows: Movie[][] = [];
  for (let i = 0; i < movies.length; i += 2) rows.push(movies.slice(i, i + 2));
  return (
    <View style={{ paddingHorizontal: 14 }}>
      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row' }}>
          {row.map((m) => (
            <View key={m.id} style={{ flex: 1 }}>
              <HomeMovieCard movie={m} showBuyBtn={showBuyBtn} />
            </View>
          ))}
          {row.length < 2 && <View style={{ flex: 1, margin: 6 }} />}
        </View>
      ))}
    </View>
  );
}

/* ─────────────────────────────── Review card ── */
type Review = { reviewId?: number; rating: number; comment?: string; userName?: string; userAvatar?: string; createdAt?: string };

function ReviewCard({ review }: { review: Review }) {
  const initial = (review.userName || '?').charAt(0).toUpperCase();
  return (
    <View style={rv.card}>
      <View style={rv.header}>
        {review.userAvatar
          ? <Image source={review.userAvatar} style={rv.avatar} contentFit="cover" />
          : (
            <View style={rv.avatarCircle}>
              <Text style={rv.avatarText}>{initial}</Text>
            </View>
          )
        }
        <View style={{ flex: 1 }}>
          <Text style={rv.name}>{review.userName || 'Người dùng'}</Text>
          <View style={rv.starsRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Ionicons key={s} name="star" size={11} color={s <= review.rating ? '#FFD700' : 'rgba(255,255,255,0.15)'} />
            ))}
            {review.createdAt && (
              <Text style={rv.date}>{new Date(review.createdAt).toLocaleDateString('vi-VN')}</Text>
            )}
          </View>
        </View>
      </View>
      {!!review.comment && <Text style={rv.comment} numberOfLines={3}>{review.comment}</Text>}
    </View>
  );
}
const rv = StyleSheet.create({
  card: { backgroundColor: CARD, borderRadius: 12, padding: 14, marginHorizontal: 20, marginBottom: 12, borderWidth: 1, borderColor: BORDER },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  avatar: { width: 38, height: 38, borderRadius: 19 },
  avatarCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
  name: { fontSize: 13, fontWeight: '700', color: WHITE },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 3 },
  date: { fontSize: 10, color: MUTED, marginLeft: 8 },
  comment: { fontSize: 13, color: MUTED, lineHeight: 19 },
});

/* ─────────────────────────────── Reviews section ── */
function ReviewsSection({ movies }: { movies: Movie[] }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [busy, setBusy] = useState(false);

  const fetchReviews = useCallback(async (idx: number) => {
    const movie = movies[idx];
    if (!movie) return;
    setBusy(true);
    setReviews([]);
    try {
      const data = await movieService.getMovieReviews(movie.id);
      setReviews((data as Review[]).slice(0, 10));
    } catch {
      setReviews([]);
    } finally {
      setBusy(false);
    }
  }, [movies]);

  useEffect(() => {
    if (movies.length) fetchReviews(0);
  }, [movies, fetchReviews]);

  const handleTabPress = (i: number) => {
    setSelectedIdx(i);
    fetchReviews(i);
  };

  if (!movies.length) return null;

  return (
    <View style={styles.section}>
      <SectionHeader pre="BÌNH LUẬN &" accent="ĐÁNH GIÁ" />

      {/* Movie tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8, marginBottom: 16 }}
      >
        {movies.map((m, i) => (
          <TouchableOpacity
            key={m.id}
            style={[rvs.tab, i === selectedIdx && rvs.tabActive]}
            onPress={() => handleTabPress(i)}
          >
            <Text style={[rvs.tabText, i === selectedIdx && rvs.tabTextActive]} numberOfLines={1}>
              {m.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {busy
        ? <ActivityIndicator color={YELLOW} style={{ marginVertical: 24 }} />
        : reviews.length === 0
          ? (
            <View style={rvs.empty}>
              <Ionicons name="chatbubbles-outline" size={40} color={MUTED} />
              <Text style={rvs.emptyText}>Chưa có bình luận nào</Text>
            </View>
          )
          : reviews.map((r, i) => <ReviewCard key={r.reviewId ?? i} review={r} />)
      }
    </View>
  );
}
const rvs = StyleSheet.create({
  tab: { borderWidth: 1, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,0.04)', maxWidth: 160 },
  tabActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  tabText: { fontSize: 12, fontWeight: '600', color: MUTED },
  tabTextActive: { color: '#fff' },
  empty: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { color: MUTED, fontSize: 13, marginTop: 10 },
});

/* ─────────────────────────────── Search results ── */
function SearchResults({ movies, query, genre }: { movies: Movie[]; query: string; genre: string | null }) {
  const results = movies
    .filter((m) => m.title.toLowerCase().includes(query.toLowerCase()))
    .filter((m) => !genre || m.genre.includes(genre));
  return (
    <View style={styles.section}>
      <Text style={sr.hint}>{results.length} kết quả cho "{query}"</Text>
      <MovieGrid movies={results} showBuyBtn />
    </View>
  );
}
const sr = StyleSheet.create({
  hint: { color: MUTED, fontSize: 13, paddingHorizontal: 20, marginBottom: 12 },
});

/* ─────────────────────────────── Genre modal styles ── */
const gm = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: '#141632',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    paddingTop: 12,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16, fontWeight: '800', color: '#fff',
    paddingHorizontal: 20, marginBottom: 12,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: 20,
    marginBottom: 4,
  },
  item: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  itemText: { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
});

/* ─────────────────────────────── Home screen ── */
export default function HomeScreen() {
  const { session } = useAuth();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [showGenreModal, setShowGenreModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [moviesData, newsData] = await Promise.all([
        movieService.getAllMovies(),
        newsService.getNewsList(),
      ]);
      setMovies(moviesData);
      setNews(newsData);
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchData().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const genres = useMemo(() => {
    const set = new Set<string>();
    movies.forEach((m) => {
      if (m.genre) m.genre.split(' • ').forEach((g) => g.trim() && set.add(g.trim()));
    });
    return Array.from(set).sort();
  }, [movies]);

  const nowPlaying = useMemo(
    () => movies.filter((m) => m.status === 1 && (!selectedGenre || m.genre.includes(selectedGenre))).slice(0, 8),
    [movies, selectedGenre]
  );
  const comingSoon = useMemo(
    () => movies.filter((m) => m.status !== 1 && (!selectedGenre || m.genre.includes(selectedGenre))).slice(0, 8),
    [movies, selectedGenre]
  );
  const reviewMovies = nowPlaying.slice(0, 5);
  const userName = session?.user?.fullname?.split(' ').pop() || 'bạn';
  const isSearching = search.trim().length > 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={YELLOW} />
          <Text style={{ color: MUTED, marginTop: 14, fontSize: 13 }}>Đang tải dữ liệu…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Xin chào,</Text>
          <Text style={styles.userName}>{userName}</Text>
        </View>
        <TouchableOpacity style={styles.notifBtn} onPress={() => {}}>
          <Ionicons name="notifications-outline" size={22} color={WHITE} />
        </TouchableOpacity>
      </View>

      {/* Search + Filter */}
      <View style={styles.searchArea}>
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={16} color={MUTED} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm phim..."
            placeholderTextColor="rgba(240,240,255,0.3)"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            allowFontScaling={false}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={MUTED} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, !!selectedGenre && styles.filterBtnActive]}
          onPress={() => setShowGenreModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="options-outline" size={19} color={selectedGenre ? YELLOW : WHITE} />
          {!!selectedGenre && <View style={styles.filterDot} />}
        </TouchableOpacity>
      </View>

      {/* Genre modal */}
      <Modal
        visible={showGenreModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGenreModal(false)}
      >
        <TouchableOpacity
          style={gm.backdrop}
          activeOpacity={1}
          onPress={() => setShowGenreModal(false)}
        />
        <View style={gm.sheet}>
          <View style={gm.handle} />
          <Text style={gm.title}>Lọc theo <Text style={{ color: YELLOW }}>thể loại</Text></Text>

          <TouchableOpacity
            style={gm.item}
            onPress={() => { setSelectedGenre(null); setShowGenreModal(false); }}
            activeOpacity={0.75}
          >
            <Text style={[gm.itemText, !selectedGenre && { color: YELLOW, fontWeight: '700' }]}>Tất cả thể loại</Text>
            {!selectedGenre && <Ionicons name="checkmark-circle" size={18} color={YELLOW} />}
          </TouchableOpacity>

          <View style={gm.divider} />

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
            {genres.map((g) => (
              <TouchableOpacity
                key={g}
                style={gm.item}
                onPress={() => { setSelectedGenre(g); setShowGenreModal(false); }}
                activeOpacity={0.75}
              >
                <Text style={[gm.itemText, selectedGenre === g && { color: YELLOW, fontWeight: '700' }]}>{g}</Text>
                {selectedGenre === g && <Ionicons name="checkmark-circle" size={18} color={YELLOW} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" colors={['#FFFFFF']} />
        }
      >
        {isSearching ? (
          <SearchResults movies={movies} query={search} genre={selectedGenre} />
        ) : (
          <>
            {/* News slider */}
            <View style={{ marginTop: 16 }}>
              <NewsSlider news={news} />
            </View>

            {/* Now Playing */}
            {nowPlaying.length > 0 && (
              <View style={styles.section}>
                <SectionHeader pre="PHIM" accent="ĐANG CHIẾU" />
                <MovieGrid movies={nowPlaying} showBuyBtn />
              </View>
            )}

            {/* Coming Soon */}
            {comingSoon.length > 0 && (
              <View style={styles.section}>
                <SectionHeader pre="PHIM" accent="SẮP CHIẾU" />
                <MovieGrid movies={comingSoon} showBuyBtn={false} />
              </View>
            )}

            {/* Reviews */}
            <ReviewsSection movies={reviewMovies} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NAVY,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  greeting: {
    fontSize: 12,
    fontWeight: '600',
    color: MUTED,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: WHITE,
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  searchArea: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 4,
    gap: 8,
  },
  searchRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: WHITE,
    fontSize: 14,
    padding: 0,
  },
  filterBtn: {
    width: 44, height: 44,
    borderRadius: 12,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  filterBtnActive: {
    borderColor: YELLOW,
    backgroundColor: YELLOW + '18',
  },
  filterDot: {
    position: 'absolute',
    top: 8, right: 8,
    width: 7, height: 7,
    borderRadius: 4,
    backgroundColor: YELLOW,
  },
  section: {
    marginBottom: 28,
  },
});
