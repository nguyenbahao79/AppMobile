import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  SafeAreaView, Platform, ActivityIndicator, Alert,
  TextInput, StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MOVIES, Movie } from '@/mocks/movies';
import { movieService } from '@/services/movieService';
import { meService, MovieReviewStatus } from '@/services/meService';
import { useAuth } from '@/context/AuthContext';

// ─── Theme ───────────────────────────────────────────────────────────────────
const NAVY   = '#0d0d2b';
const CARD   = '#14143a';
const PURPLE = '#8b00ff';
const PINK   = '#ff2d78';
const YELLOW = '#d4ff00';
const WHITE  = '#f0f0ff';
const MUTED  = 'rgba(240,240,255,0.5)';
const BORDER = 'rgba(255,255,255,0.08)';

// ─── Types ────────────────────────────────────────────────────────────────────
type Review = {
  userAvatar?: string;
  userName?: string;
  rating: number;
  comment?: string;
  createdAt?: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getInitial(name?: string) {
  return String(name || '?').trim().split(/\s+/).filter(Boolean).pop()?.[0]?.toUpperCase() || '?';
}

function fmtDate(val?: string) {
  if (!val) return null;
  try { return new Date(val).toLocaleDateString('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' }); }
  catch { return null; }
}

function htmlToPlainText(html: string): string {
  if (!html?.trim()) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
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

// ─── Sub-components ──────────────────────────────────────────────────────────

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons key={s} name="star" size={size} color={s <= Math.round(rating) ? YELLOW : 'rgba(255,255,255,0.15)'} />
      ))}
    </View>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const initial = getInitial(review.userName);
  const date    = fmtDate(review.createdAt);
  return (
    <View style={rc.card}>
      <View style={rc.header}>
        {review.userAvatar
          ? <Image source={review.userAvatar} style={rc.avatar} contentFit="cover" />
          : (
            <View style={rc.avatarCircle}>
              <Text style={rc.avatarText}>{initial}</Text>
            </View>
          )
        }
        <View style={{ flex: 1 }}>
          <Text style={rc.name}>{review.userName || 'Người dùng'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
            <StarRow rating={review.rating} size={11} />
            {date && <Text style={rc.date}>{date}</Text>}
          </View>
        </View>
        <Text style={[rc.score, { color: YELLOW }]}>{review.rating.toFixed(1)}</Text>
      </View>
      {!!review.comment && <Text style={rc.comment}>{review.comment}</Text>}
    </View>
  );
}
const rc = StyleSheet.create({
  card:        { backgroundColor: CARD, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: BORDER },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  avatar:      { width: 38, height: 38, borderRadius: 19 },
  avatarCircle:{ width: 38, height: 38, borderRadius: 19, backgroundColor: PURPLE + 'AA', alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontSize: 15, fontWeight: 'bold', color: '#fff' },
  name:        { fontSize: 13, fontWeight: '700', color: WHITE },
  date:        { fontSize: 10, color: MUTED },
  comment:     { fontSize: 13, color: MUTED, lineHeight: 19 },
  score:       { fontSize: 16, fontWeight: '800' },
});

// ─── Main component ───────────────────────────────────────────────────────────
export default function MovieDetailScreen() {
  const { id }    = useLocalSearchParams();
  const router    = useRouter();
  const { session } = useAuth();

  const [movie,            setMovie]            = useState<Movie | null>(null);
  const [loading,          setLoading]          = useState(true);
  const [isFavorite,       setIsFavorite]       = useState(false);
  const [favBusy,          setFavBusy]          = useState(false);
  const [reviewStatus,     setReviewStatus]     = useState<MovieReviewStatus | null>(null);
  const [reviews,          setReviews]          = useState<Review[]>([]);
  const [myRating,         setMyRating]         = useState(0);
  const [myComment,        setMyComment]        = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewsLoading,   setReviewsLoading]   = useState(false);

  // ── Fetch movie detail ────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    movieService.getMovieDetail(id as string)
      .then((data) => { if (data) setMovie(data); })
      .catch(() => {
        const mock = MOVIES.find((m) => m.id === id);
        if (mock) setMovie(mock);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // ── Fetch reviews list ────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setReviewsLoading(true);
    movieService.getMovieReviews(id as string)
      .then((data) => setReviews((data as Review[]).slice(0, 20)))
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false));
  }, [id]);

  // ── Fetch user's favorite + review status ─────────────────────────────────
  useEffect(() => {
    const movieId = Number(id);
    if (!session?.user || !Number.isFinite(movieId) || movieId <= 0) {
      setIsFavorite(false);
      setReviewStatus(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const favs = await meService.getFavorites();
        if (!cancelled) setIsFavorite(favs.some((f) => Number(f.movieId) === movieId));
      } catch { if (!cancelled) setIsFavorite(false); }
      try {
        const status = await meService.getMovieReviewStatus(movieId);
        if (!cancelled) {
          setReviewStatus(status);
          if (status.review) {
            setMyRating(status.review.rating);
            setMyComment(status.review.comment || '');
          }
        }
      } catch { if (!cancelled) setReviewStatus(null); }
    })();
    return () => { cancelled = true; };
  }, [id, session?.user]);

  // ── Toggle favorite ───────────────────────────────────────────────────────
  const toggleFavorite = useCallback(async () => {
    const movieId = Number(id);
    if (!Number.isFinite(movieId) || movieId <= 0) return;
    if (!session?.user) { router.push('/(auth)/login' as Href); return; }
    setFavBusy(true);
    try {
      if (isFavorite) { await meService.removeFavorite(movieId); setIsFavorite(false); }
      else            { await meService.addFavorite(movieId);    setIsFavorite(true);  }
    } catch (e: any) { Alert.alert('Lỗi', e.message || 'Không thực hiện được thao tác.'); }
    finally { setFavBusy(false); }
  }, [id, isFavorite, session?.user, router]);

  // ── Submit review ─────────────────────────────────────────────────────────
  const submitReview = useCallback(async () => {
    const movieId = Number(id);
    if (!Number.isFinite(movieId) || movieId <= 0) return;
    if (myRating < 1) { Alert.alert('Thông báo', 'Vui lòng chọn số sao đánh giá.'); return; }
    setSubmittingReview(true);
    try {
      const review = await meService.submitReview(movieId, myRating, myComment.trim());
      setReviewStatus((prev) => (prev ? { ...prev, review } : prev));
      // Refresh reviews list
      const data = await movieService.getMovieReviews(id as string);
      setReviews((data as Review[]).slice(0, 20));
      Alert.alert('Cảm ơn bạn!', 'Đánh giá của bạn đã được lưu.');
    } catch (e: any) { Alert.alert('Không lưu được đánh giá', e.message || 'Vui lòng thử lại sau.'); }
    finally { setSubmittingReview(false); }
  }, [id, myRating, myComment]);

  // ── Loading / Error states ────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[s.fill, s.center, { backgroundColor: NAVY }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={YELLOW} />
      </View>
    );
  }

  if (!movie) {
    return (
      <View style={[s.fill, s.center, { backgroundColor: NAVY }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: MUTED, fontSize: 16 }}>Không tìm thấy phim</Text>
      </View>
    );
  }

  const avgRating   = movie.rating ?? 0;
  const isNowPlaying = movie.status === 1;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>

        {/* ── Poster ── */}
        <View style={s.posterWrap}>
          <Image
            source={movie.posterUrl || movie.poster}
            style={s.poster}
            contentFit="cover"
            transition={400}
          />
          {/* Dark overlay at bottom of poster */}
          <View style={s.posterOverlay} />

          {/* Back button */}
          <Pressable style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>

          {/* Favorite button */}
          <Pressable style={s.favBtn} onPress={toggleFavorite} disabled={favBusy}>
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={22}
              color={isFavorite ? PINK : '#fff'}
            />
          </Pressable>

          {/* Status badge */}
          <View style={[s.statusBadge, { backgroundColor: isNowPlaying ? PINK : PURPLE }]}>
            <Text style={s.statusText}>{isNowPlaying ? 'ĐANG CHIẾU' : 'SẮP CHIẾU'}</Text>
          </View>
        </View>

        {/* ── Content ── */}
        <View style={s.content}>

          {/* Accent strip */}
          <View style={s.accentRow}>
            <View style={[s.accentBar, { backgroundColor: PURPLE }]} />
            <View style={[s.accentBar, { backgroundColor: PINK }]} />
            <View style={[s.accentBar, { backgroundColor: YELLOW }]} />
          </View>

          {/* Title */}
          <Text style={s.title}>{movie.title}</Text>

          {/* Meta chips */}
          <View style={s.chipRow}>
            {movie.genre && (
              <View style={s.chip}>
                <Ionicons name="film-outline" size={11} color={YELLOW} />
                <Text style={s.chipText}>{movie.genre}</Text>
              </View>
            )}
            {movie.duration && (
              <View style={s.chip}>
                <Ionicons name="time-outline" size={11} color={YELLOW} />
                <Text style={s.chipText}>{movie.duration} phút</Text>
              </View>
            )}
            {movie.releaseDate && (
              <View style={s.chip}>
                <Ionicons name="calendar-outline" size={11} color={YELLOW} />
                <Text style={s.chipText}>{movie.releaseDate}</Text>
              </View>
            )}
          </View>

          {/* Rating */}
          <View style={s.ratingBlock}>
            <StarRow rating={avgRating} size={18} />
            <Text style={s.ratingScore}>{avgRating.toFixed(1)}</Text>
            <Text style={s.ratingMax}> / 5.0</Text>
            {reviews.length > 0 && (
              <Text style={s.reviewCount}>  ({reviews.length} đánh giá)</Text>
            )}
          </View>

          {/* Divider */}
          <View style={s.divider} />

          {/* Description */}
          <Text style={s.sectionLabel}>Nội dung</Text>
          <Text style={s.description}>{htmlToPlainText(movie.description || '') || 'Chưa có mô tả.'}</Text>

          {/* Divider */}
          <View style={s.divider} />

          {/* Reviews section */}
          <View style={s.reviewsHeader}>
            <Text style={s.sectionLabel}>Đánh giá & Bình luận</Text>
            {reviews.length > 0 && (
              <View style={s.avgBadge}>
                <Ionicons name="star" size={13} color={YELLOW} />
                <Text style={s.avgText}>{avgRating.toFixed(1)}</Text>
              </View>
            )}
          </View>

          {/* My review form */}
          {session?.user && reviewStatus?.canReview && (
            <View style={s.reviewForm}>
              <Text style={s.reviewFormTitle}>
                {reviewStatus.review ? 'Cập nhật đánh giá của bạn' : 'Viết đánh giá'}
              </Text>

              {/* Star selector */}
              <View style={s.starSelector}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable key={star} onPress={() => setMyRating(star)} hitSlop={6}>
                    <Ionicons
                      name={star <= myRating ? 'star' : 'star-outline'}
                      size={30}
                      color={star <= myRating ? YELLOW : 'rgba(255,255,255,0.2)'}
                    />
                  </Pressable>
                ))}
              </View>

              <TextInput
                value={myComment}
                onChangeText={setMyComment}
                placeholder="Chia sẻ cảm nhận của bạn..."
                placeholderTextColor={MUTED}
                maxLength={150}
                multiline
                style={s.reviewInput}
              />
              <View style={s.charRow}>
                <Text style={s.charCount}>{myComment.length}/150</Text>
              </View>

              <Pressable
                style={({ pressed }) => [s.submitBtn, pressed && { opacity: 0.75 }]}
                onPress={submitReview}
                disabled={submittingReview}
              >
                <Ionicons name="send" size={14} color="#fff" />
                <Text style={s.submitText}>
                  {submittingReview ? 'Đang lưu...' : reviewStatus.review ? 'Cập nhật' : 'Gửi đánh giá'}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Reviews list */}
          {reviewsLoading ? (
            <ActivityIndicator color={PURPLE} style={{ marginVertical: 20 }} />
          ) : reviews.length === 0 ? (
            <View style={s.emptyReviews}>
              <Ionicons name="chatbubble-outline" size={36} color="rgba(255,255,255,0.15)" />
              <Text style={s.emptyReviewsText}>Chưa có đánh giá nào</Text>
            </View>
          ) : (
            reviews.map((r, i) => <ReviewCard key={i} review={r} />)
          )}

        </View>
      </ScrollView>

      {/* ── Footer ── */}
      {isNowPlaying && (
        <View style={s.footer}>
          <Pressable
            style={({ pressed }) => [s.bookBtn, pressed && { opacity: 0.8 }]}
            onPress={() => router.push(`/user/booking/${movie.id}` as Href)}
          >
            <Ionicons name="ticket-outline" size={18} color="#fff" />
            <Text style={s.bookText}>Đặt vé ngay</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: NAVY },
  fill:     { flex: 1, backgroundColor: NAVY },
  center:   { alignItems: 'center', justifyContent: 'center' },

  // Poster
  posterWrap:    { width: '100%', height: 360, position: 'relative' },
  poster:        { width: '100%', height: '100%', backgroundColor: CARD },
  posterOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 120,
    backgroundColor: 'rgba(13,13,43,0.85)',
  },
  backBtn: {
    position: 'absolute', top: Platform.OS === 'ios' ? 16 : 12, left: 16,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  favBtn: {
    position: 'absolute', top: Platform.OS === 'ios' ? 16 : 12, right: 16,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  statusBadge: {
    position: 'absolute', bottom: 16, left: 16,
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4,
  },
  statusText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.8 },

  // Content
  content: {
    backgroundColor: NAVY,
    marginTop: -2,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },

  accentRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  accentBar: { height: 4, flex: 1, borderRadius: 2 },

  title: {
    fontSize: 24, fontWeight: '800', color: WHITE,
    lineHeight: 30, marginBottom: 14, letterSpacing: 0.3,
  },

  chipRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: CARD, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: BORDER,
  },
  chipText: { fontSize: 11, fontWeight: '600', color: WHITE },

  ratingBlock: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  ratingScore: { fontSize: 18, fontWeight: '800', color: YELLOW, marginLeft: 10 },
  ratingMax:   { fontSize: 13, color: MUTED },
  reviewCount: { fontSize: 12, color: MUTED },

  divider: { height: 1, backgroundColor: BORDER, marginVertical: 20 },

  sectionLabel: {
    fontSize: 13, fontWeight: '800', color: PURPLE,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
  },
  description: { fontSize: 14, color: MUTED, lineHeight: 22 },

  // Reviews
  reviewsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  avgBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: CARD, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: BORDER,
  },
  avgText: { fontSize: 13, fontWeight: '800', color: YELLOW },

  // Review form
  reviewForm: {
    backgroundColor: CARD, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: BORDER, marginBottom: 16,
  },
  reviewFormTitle: { fontSize: 13, fontWeight: '700', color: WHITE, marginBottom: 12 },
  starSelector: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  reviewInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    padding: 12, color: WHITE, fontSize: 13,
    minHeight: 80, textAlignVertical: 'top',
    marginBottom: 4,
  },
  charRow:   { alignItems: 'flex-end', marginBottom: 12 },
  charCount: { fontSize: 11, color: MUTED },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: PURPLE, borderRadius: 12,
    paddingVertical: 12,
  },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  emptyReviews:     { alignItems: 'center', paddingVertical: 32 },
  emptyReviewsText: { color: MUTED, fontSize: 14, marginTop: 10 },

  // Footer
  footer: {
    backgroundColor: NAVY, paddingHorizontal: 20,
    paddingVertical: 14, paddingBottom: Platform.OS === 'ios' ? 20 : 14,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: PURPLE, borderRadius: 14,
    paddingVertical: 15,
  },
  bookText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
});
