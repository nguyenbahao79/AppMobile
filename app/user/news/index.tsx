import React, { useCallback, useState, useMemo, useRef, useEffect } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  FlatList, ActivityIndicator, ScrollView, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Href, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { newsService, NewsItem } from '@/services/newsService';

const { width: SW } = Dimensions.get('window');
const SLIDE_W = SW - 40; // width mỗi slide (padding 20 mỗi bên)

const NAVY   = '#0d0d2b';
const CARD   = '#14143a';
const PURPLE = '#8b00ff';
const PINK   = '#ff2d78';
const YELLOW = '#d4ff00';
const WHITE  = '#f0f0ff';
const MUTED  = 'rgba(240,240,255,0.5)';
const BORDER = 'rgba(255,255,255,0.1)';

/* ── helpers ── */
function formatDate(value?: string): string | null {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString('vi-VN', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch { return null; }
}

function makeExcerpt(html: string, max = 110): string {
  if (!html?.trim()) return '';
  const plain = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length <= max ? plain : plain.slice(0, max).trimEnd() + '…';
}

/* ════════════════════════════════
   NEWS SLIDER  (auto-scroll + swipe)
════════════════════════════════ */
function NewsSlider({ news }: { news: NewsItem[] }) {
  const listRef  = useRef<FlatList>(null);
  const [current, setCurrent] = useState(0);
  const curRef   = useRef(0);

  useEffect(() => {
    if (news.length <= 1) return;
    const t = setInterval(() => {
      const next = (curRef.current + 1) % news.length;
      curRef.current = next;
      setCurrent(next);
      listRef.current?.scrollToIndex({ index: next, animated: true });
    }, 3500);
    return () => clearInterval(t);
  }, [news.length]);

  if (!news.length) return null;

  return (
    <View style={sl.wrap}>
      <FlatList
        ref={listRef}
        data={news}
        keyExtractor={(n) => String(n.id)}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SLIDE_W}
        decelerationRate="fast"
        contentContainerStyle={sl.listContent}
        getItemLayout={(_, i) => ({ length: SLIDE_W, offset: 20 + i * SLIDE_W, index: i })}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / SLIDE_W);
          curRef.current = idx;
          setCurrent(idx);
        }}
        renderItem={({ item }) => {
          const d = formatDate(item.createdAt);
          return (
            <TouchableOpacity
              style={sl.slide}
              activeOpacity={0.88}
              onPress={() => router.push(`/user/news/${item.id}` as Href)}
            >
              {item.image
                ? <Image source={item.image} style={sl.image} contentFit="cover" transition={300} />
                : <View style={[sl.image, sl.imgPlaceholder]}>
                    <Ionicons name="newspaper-outline" size={40} color={MUTED} />
                  </View>
              }
              {/* gradient overlay */}
              <View style={sl.overlay}>
                {d && (
                  <View style={sl.dateBadge}>
                    <Ionicons name="calendar-outline" size={11} color={YELLOW} />
                    <Text style={sl.dateText}>{d}</Text>
                  </View>
                )}
                <Text style={sl.slideTitle} numberOfLines={2}>{item.title}</Text>
                <View style={sl.readBtn}>
                  <Text style={sl.readBtnText}>Đọc bài viết</Text>
                  <Ionicons name="arrow-forward" size={12} color="#fff" />
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Dot indicators */}
      {news.length > 1 && (
        <View style={sl.dots}>
          {news.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                curRef.current = i;
                setCurrent(i);
                listRef.current?.scrollToIndex({ index: i, animated: true });
              }}
            >
              <View style={[sl.dot, i === current && sl.dotActive]} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const sl = StyleSheet.create({
  wrap: { marginBottom: 28 },
  listContent: { paddingHorizontal: 20 },
  slide: {
    width: SLIDE_W,
    height: 210,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  image: { width: '100%', height: '100%' },
  imgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  overlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(10,8,30,0.72)',
    padding: 16,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(212,255,0,0.12)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  dateText: { fontSize: 10, fontWeight: '700', color: YELLOW, letterSpacing: 0.4 },
  slideTitle: { fontSize: 15, fontWeight: '800', color: '#fff', lineHeight: 21, marginBottom: 10 },
  readBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: PURPLE,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  readBtnText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 12 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: 'rgba(255,255,255,0.2)' },
  dotActive: { width: 20, backgroundColor: YELLOW, borderRadius: 4 },
});

/* ════════════════════════════════
   ARTICLE CARD  (vertical — không bị bóp)
════════════════════════════════ */
function ArticleCard({ item }: { item: NewsItem }) {
  const d       = formatDate(item.createdAt);
  const excerpt = makeExcerpt(item.content || '');

  return (
    <TouchableOpacity
      style={ac.card}
      activeOpacity={0.85}
      onPress={() => router.push(`/user/news/${item.id}` as Href)}
    >
      {/* Image – 16:9 full width */}
      {item.image
        ? <Image source={item.image} style={ac.image} contentFit="cover" transition={300} />
        : <View style={[ac.image, ac.imgPlaceholder]}>
            <Ionicons name="newspaper-outline" size={32} color={MUTED} />
          </View>
      }

      {/* Content below image */}
      <View style={ac.body}>
        {d && (
          <View style={ac.metaRow}>
            <Ionicons name="calendar-outline" size={11} color={YELLOW} />
            <Text style={ac.metaText}>{d}</Text>
          </View>
        )}
        <Text style={ac.title} numberOfLines={2}>{item.title}</Text>
        {!!excerpt && <Text style={ac.excerpt} numberOfLines={2}>{excerpt}</Text>}
        <View style={ac.footer}>
          <Text style={ac.readMore}>Đọc thêm</Text>
          <Ionicons name="arrow-forward" size={12} color={PINK} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const ac = StyleSheet.create({
  card: {
    backgroundColor: CARD,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
  },
  /* Ảnh full-width, tỉ lệ 16:9 cố định — không bị bóp */
  image: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#1a1a3a',
  },
  imgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  body: { padding: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  metaText: { fontSize: 10, fontWeight: '700', color: YELLOW, letterSpacing: 0.3 },
  title: { fontSize: 15, fontWeight: '800', color: WHITE, lineHeight: 22, marginBottom: 7 },
  excerpt: { fontSize: 13, fontWeight: '500', color: MUTED, lineHeight: 19, marginBottom: 12 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' },
  readMore: { fontSize: 12, fontWeight: '800', color: PINK },
});

/* ════════════════════════════════
   MAIN SCREEN
════════════════════════════════ */
export default function NewsListScreen() {
  const [news, setNews]       = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      newsService.getNewsList()
        .then((data) => { if (!cancelled) setNews(data); })
        .catch(() => {})
        .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    }, [])
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return news;
    const q = search.toLowerCase();
    return news.filter((n) =>
      n.title?.toLowerCase().includes(q) ||
      (n.content || '').toLowerCase().includes(q)
    );
  }, [news, search]);

  const isSearching = search.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={18} color={WHITE} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Tin tức & Sự kiện</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 52 }}
      >
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={styles.eyeRow}>
            <Ionicons name="newspaper-outline" size={13} color={YELLOW} />
            <Text style={styles.eyeText}>TIN TỨC & SỰ KIỆN</Text>
          </View>
          <Text style={styles.heroTitle}>
            Bài viết <Text style={{ color: YELLOW }}>mới nhất</Text>
          </Text>
          <View style={styles.strip} />
          <Text style={styles.heroSub}>
            Cập nhật thông báo, ưu đãi và các hoạt động đang diễn ra tại rạp.
          </Text>
        </View>

        {/* ── Search ── */}
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color={MUTED} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo tiêu đề hoặc nội dung..."
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

        {/* ── Số lượng ── */}
        {!loading && (
          <View style={styles.countRow}>
            <Text style={styles.countText}>
              <Text style={{ color: YELLOW, fontWeight: '800' }}>{filtered.length}</Text>
              {' bài viết'}{isSearching ? ` cho "${search}"` : ''}
            </Text>
          </View>
        )}

        {/* ── Loading ── */}
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={YELLOW} />
            <Text style={styles.loadingText}>Đang tải tin tức…</Text>
          </View>
        )}

        {/* ── Empty ── */}
        {!loading && filtered.length === 0 && (
          <View style={styles.center}>
            <Ionicons name="newspaper-outline" size={56} color={MUTED} />
            <Text style={styles.emptyTitle}>Không tìm thấy bài viết</Text>
            <Text style={styles.emptyDesc}>
              {isSearching
                ? `Không có kết quả cho "${search}"`
                : 'Chưa có tin tức nào được đăng'}
            </Text>
          </View>
        )}

        {/* ── Slider (chỉ khi không tìm kiếm) ── */}
        {!loading && !isSearching && filtered.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <NewsSlider news={filtered} />
          </View>
        )}

        {/* ── Danh sách tất cả bài viết ── */}
        {!loading && filtered.length > 0 && (
          <View style={styles.listWrap}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>
                {isSearching ? 'Kết quả tìm kiếm' : 'Tất cả bài viết'}
              </Text>
              <Text style={styles.sectionCount}>{filtered.length} bài</Text>
            </View>

            {filtered.map((item) => (
              <ArticleCard key={item.id} item={item} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  topTitle: { fontSize: 16, fontWeight: 'bold', color: WHITE, letterSpacing: 0.5 },

  hero: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  eyeRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  eyeText: { fontSize: 11, fontWeight: '800', color: YELLOW, letterSpacing: 1.5 },
  heroTitle: { fontSize: 28, fontWeight: '900', color: WHITE, lineHeight: 34, marginBottom: 12 },
  strip: { width: 56, height: 3, backgroundColor: PURPLE, borderRadius: 2, marginBottom: 12 },
  heroSub: { fontSize: 13, fontWeight: '600', color: MUTED, lineHeight: 20 },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
    backgroundColor: CARD,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 10,
  },
  searchInput: { flex: 1, color: WHITE, fontSize: 14, padding: 0 },

  countRow: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 2 },
  countText: { fontSize: 13, fontWeight: '600', color: MUTED },

  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  loadingText: { color: MUTED, marginTop: 14, fontSize: 13 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: MUTED, marginTop: 16 },
  emptyDesc: {
    fontSize: 13, color: 'rgba(240,240,255,0.3)',
    marginTop: 8, textAlign: 'center', lineHeight: 20,
  },

  listWrap: { paddingHorizontal: 20, paddingTop: 4 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: WHITE },
  sectionCount: { fontSize: 13, fontWeight: '700', color: MUTED },
});
