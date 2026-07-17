import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, SafeAreaView, Platform, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack, Href } from 'expo-router';
import { MOVIES, Movie } from '@/mocks/movies';
import { movieService } from '@/services/movieService';
import { meService, MovieReviewStatus } from '@/services/meService';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/base/icon-symbol';
import { ThemedText } from '@/components/base/themed-text';
import { ThemedView } from '@/components/base/themed-view';

export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { session } = useAuth();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const [isFavorite, setIsFavorite] = useState(false);
  const [favBusy, setFavBusy] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<MovieReviewStatus | null>(null);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const fetchMovieDetail = async () => {
      if (!id) return;
      try {
        const data = await movieService.getMovieDetail(id as string);
        if (data) {
          setMovie(data);
        }
      } catch (error) {
        console.warn('Backend not available, using mock data for detail:', error);
        const mockMovie = MOVIES.find((m) => m.id === id);
        if (mockMovie) setMovie(mockMovie);
      } finally {
        setLoading(false);
      }
    };

    fetchMovieDetail();
  }, [id]);

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
        const favorites = await meService.getFavorites();
        if (!cancelled) setIsFavorite(favorites.some((f) => Number(f.movieId) === movieId));
      } catch {
        if (!cancelled) setIsFavorite(false);
      }
      try {
        const status = await meService.getMovieReviewStatus(movieId);
        if (!cancelled) {
          setReviewStatus(status);
          if (status.review) {
            setMyRating(status.review.rating);
            setMyComment(status.review.comment || '');
          }
        }
      } catch {
        if (!cancelled) setReviewStatus(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, session?.user]);

  const toggleFavorite = async () => {
    const movieId = Number(id);
    if (!Number.isFinite(movieId) || movieId <= 0) return;
    if (!session?.user) {
      router.push('/(auth)/login' as Href);
      return;
    }
    setFavBusy(true);
    try {
      if (isFavorite) {
        await meService.removeFavorite(movieId);
        setIsFavorite(false);
      } else {
        await meService.addFavorite(movieId);
        setIsFavorite(true);
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thực hiện được thao tác.');
    } finally {
      setFavBusy(false);
    }
  };

  const submitReview = async () => {
    const movieId = Number(id);
    if (!Number.isFinite(movieId) || movieId <= 0) return;
    if (myRating < 1) {
      Alert.alert('Thông báo', 'Vui lòng chọn số sao đánh giá.');
      return;
    }
    setSubmittingReview(true);
    try {
      const review = await meService.submitReview(movieId, myRating, myComment.trim());
      setReviewStatus((prev) => (prev ? { ...prev, review } : prev));
      Alert.alert('Cảm ơn bạn!', 'Đánh giá của bạn đã được lưu.');
    } catch (error: any) {
      Alert.alert('Không lưu được đánh giá', error.message || 'Vui lòng thử lại sau.');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </ThemedView>
    );
  }

  if (!movie) {
    return (
      <ThemedView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ThemedText>Không tìm thấy phim</ThemedText>
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: movie.title, headerBackTitle: 'Quay lại' }} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <Image 
          source={movie.posterUrl || movie.poster} 
          style={styles.image} 
          contentFit="cover"
          transition={500}
        />
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <ThemedText type="title" style={[styles.title, { flex: 1 }]}>{movie.title}</ThemedText>
            <Pressable onPress={toggleFavorite} disabled={favBusy} hitSlop={10} style={styles.favButton}>
              <IconSymbol
                name={isFavorite ? 'heart.fill' : 'heart'}
                size={26}
                color={isFavorite ? '#FF3B30' : theme.tabIconDefault}
              />
            </Pressable>
          </View>
          <View style={styles.metaRow}>
            <ThemedText style={styles.genre}>{movie.genre}</ThemedText>
            <ThemedText style={styles.dot}>•</ThemedText>
            <ThemedText style={styles.duration}>{movie.duration} phút</ThemedText>
          </View>
          
          <View style={styles.ratingRow}>
            <IconSymbol name="star.fill" size={20} color="#FFD700" />
            <ThemedText style={styles.rating}>{movie.rating || 5.0} / 5.0</ThemedText>
          </View>

          <ThemedText type="subtitle" style={styles.sectionTitle}>Mô tả phim</ThemedText>
          <ThemedText style={styles.description}>{movie.description}</ThemedText>

          <ThemedText type="subtitle" style={styles.sectionTitle}>Ngày khởi chiếu</ThemedText>
          <ThemedText style={styles.date}>{movie.releaseDate}</ThemedText>

          {session?.user && reviewStatus?.canReview && (
            <>
              <ThemedText type="subtitle" style={styles.sectionTitle}>Đánh giá của bạn</ThemedText>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable key={star} onPress={() => setMyRating(star)} hitSlop={6}>
                    <IconSymbol
                      name="star.fill"
                      size={28}
                      color={star <= myRating ? '#FFD700' : (isDark ? '#3A3A3C' : '#E5E5EA')}
                      style={{ marginRight: 4 }}
                    />
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={myComment}
                onChangeText={setMyComment}
                placeholder="Chia sẻ cảm nhận của bạn (tối đa 150 ký tự)..."
                placeholderTextColor={theme.tabIconDefault}
                maxLength={150}
                multiline
                style={[styles.reviewInput, { color: theme.text, borderColor: isDark ? '#333' : '#eee' }]}
              />
              <Pressable
                style={({ pressed }) => [styles.reviewSubmitBtn, { backgroundColor: theme.tint, opacity: pressed || submittingReview ? 0.8 : 1 }]}
                onPress={submitReview}
                disabled={submittingReview}
              >
                <ThemedText style={styles.buttonText}>
                  {submittingReview ? 'Đang lưu...' : reviewStatus?.review ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}
                </ThemedText>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
      <ThemedView style={[styles.footer, { borderTopColor: isDark ? '#333' : '#eee' }]}>
        <Pressable 
          style={({ pressed }) => [
            styles.button, 
            { backgroundColor: theme.tint, opacity: pressed ? 0.8 : 1 }
          ]}
          onPress={() => router.push(`/user/booking/${movie.id}` as Href)}
        >
          <ThemedText style={styles.buttonText}>Đặt vé ngay</ThemedText>
        </Pressable>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: 450,
    backgroundColor: '#1C1C1E',
  },
  content: {
    padding: 20,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    backgroundColor: 'transparent',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  favButton: {
    marginLeft: 12,
    marginTop: 4,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  starRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  reviewInput: {
    minHeight: 70,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  reviewSubmitBtn: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  genre: {
    fontSize: 14,
    opacity: 0.6,
  },
  dot: {
    marginHorizontal: 8,
    fontSize: 18,
    opacity: 0.6,
  },
  duration: {
    fontSize: 14,
    opacity: 0.6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  rating: {
    marginLeft: 6,
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.7,
  },
  date: {
    fontSize: 15,
    opacity: 0.7,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 20 : 20,
  },
  button: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
