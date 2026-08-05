import React, { useEffect, useState } from 'react';
import {
  StyleSheet, ScrollView, View, Text, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { newsService, NewsItem } from '@/services/newsService';

const NAVY   = '#0d0d2b';
const CARD   = '#14143a';
const PURPLE = '#8b00ff';
const PINK   = '#ff2d78';
const YELLOW = '#d4ff00';
const WHITE  = '#f0f0ff';
const MUTED  = 'rgba(240,240,255,0.5)';
const BORDER = 'rgba(255,255,255,0.1)';

function formatDate(value?: string): string | null {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString('vi-VN', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch {
    return null;
  }
}

function stripHtml(html: string): string {
  if (!html?.trim()) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*/gi, '\n\n')
    .replace(/<\/h[1-6]>\s*/gi, '\n\n')
    .replace(/<h[1-6][^>]*>/gi, '')
    .replace(/<\/li>\s*/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/ul>|<\/ol>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractImages(html: string): string[] {
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    if (match[1]) results.push(match[1]);
  }
  return results;
}

export default function NewsDetailScreen() {
  const { id } = useLocalSearchParams();
  const [item, setItem] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await newsService.getNewsDetail(id as string);
        if (!cancelled) setItem(data);
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Không tải được tin tức');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  /* ── Loading ── */
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color={WHITE} />
            <Text style={styles.backBtnText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={YELLOW} />
          <Text style={styles.loadingText}>Đang tải…</Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ── Error / Not found ── */
  if (error || !item) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color={WHITE} />
            <Text style={styles.backBtnText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <Ionicons name="newspaper-outline" size={52} color={MUTED} />
          <Text style={styles.errorText}>{error || 'Không tìm thấy tin tức'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
            <Text style={styles.retryBtnText}>Quay lại danh sách</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const dateLabel  = formatDate(item.createdAt);
  const bodyText   = stripHtml(item.content || '');
  const extraImgs  = extractImages(item.content || '');

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Fixed top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={18} color={WHITE} />
          <Text style={styles.backBtnText}>Quay lại</Text>
        </TouchableOpacity>
        <View style={styles.topBadge}>
          <Ionicons name="newspaper-outline" size={13} color={PINK} />
          <Text style={styles.topBadgeText}>TIN TỨC</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

        {/* Banner */}
        {item.image ? (
          <Image
            source={item.image}
            style={styles.banner}
            contentFit="cover"
            transition={400}
          />
        ) : (
          <View style={styles.bannerEmpty}>
            <Ionicons name="newspaper-outline" size={52} color={MUTED} />
          </View>
        )}

        {/* Card content */}
        <View style={styles.card}>

          {/* Strip */}
          <View style={styles.strip} />

          {/* Title */}
          <Text style={styles.title}>{item.title}</Text>

          {/* Date badge */}
          {dateLabel && (
            <View style={styles.dateBadge}>
              <Ionicons name="calendar-outline" size={13} color={YELLOW} />
              <Text style={styles.dateText}>{dateLabel}</Text>
            </View>
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Body text */}
          {!!bodyText && (
            <Text style={styles.body}>{bodyText}</Text>
          )}

          {/* Images embedded in content */}
          {extraImgs.map((src, i) => (
            <Image
              key={i}
              source={src}
              style={styles.inlineImage}
              contentFit="cover"
              transition={300}
            />
          ))}

          {/* Bottom navigation */}
          <TouchableOpacity
            style={styles.moreBtn}
            onPress={() => router.push('/user/news' as any)}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back-outline" size={16} color={WHITE} />
            <Text style={styles.moreBtnText}>Xem tất cả tin tức</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NAVY,
  },

  /* Top bar */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: NAVY,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderWidth: 1.5,
    borderColor: BORDER,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: WHITE,
  },
  topBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,45,120,0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,45,120,0.2)',
  },
  topBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: PINK,
    letterSpacing: 1,
  },

  /* States */
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    color: MUTED,
    marginTop: 14,
    fontSize: 13,
  },
  errorText: {
    color: MUTED,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 22,
  },
  retryBtn: {
    marginTop: 22,
    backgroundColor: PURPLE,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 28,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  /* Banner */
  banner: {
    width: '100%',
    height: 230,
    backgroundColor: CARD,
  },
  bannerEmpty: {
    width: '100%',
    height: 200,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Content card */
  card: {
    margin: 16,
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(212,255,0,0.12)',
    padding: 24,
    marginTop: -24,
  },

  strip: {
    width: 56,
    height: 3,
    backgroundColor: PURPLE,
    borderRadius: 2,
    marginBottom: 18,
  },

  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: WHITE,
    lineHeight: 30,
    letterSpacing: 0.5,
    marginBottom: 16,
    textTransform: 'uppercase',
  },

  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(212,255,0,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(212,255,0,0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 20,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '700',
    color: YELLOW,
    letterSpacing: 0.5,
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(212,255,0,0.1)',
    marginBottom: 20,
  },

  body: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 26,
    color: 'rgba(240,240,255,0.75)',
  },

  inlineImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginTop: 20,
    backgroundColor: CARD,
  },

  moreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    borderColor: BORDER,
  },
  moreBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: WHITE,
  },
});
