import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  FlatList, 
  View, 
  Text, 
  SafeAreaView, 
  useWindowDimensions,
  ActivityIndicator
} from 'react-native';
import { MOVIES, Movie } from '@/mocks/movies';
import { movieService } from '@/services/movieService';
import { MovieCard } from '@/components/features/user/movie-card';
import { FeaturedMovie } from '@/components/features/user/featured-movie';
import { PromoSlider } from '@/components/features/user/promo-slider';
import { SearchBar } from '@/components/layout/search-bar';
import { AppHeader } from '@/components/layout/app-header';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { session } = useAuth();
  const [search, setSearch] = useState('');
  const [movies, setMovies] = useState<Movie[]>(MOVIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      try {
        const data = await movieService.getAllMovies();
        if (data && Array.isArray(data)) {
          setMovies(data);
        }
      } catch (error) {
        console.warn('Backend connection failed, showing mock data:', error);
        // Giữ lại MOVIES mock làm fallback
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, []);

  const numColumns = width > 600 ? 4 : 2;

  const nowPlaying = movies.filter(m => m.status === 1);
  const upcoming = movies.filter(m => m.status !== 1);
  // "Hot" = đang chiếu, xếp theo rating giảm dần (BE chưa có field đánh dấu phim hot riêng).
  const hotMovies = [...nowPlaying].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 6);
  // Slide quảng cáo dùng banner của phim mới nhất (đang chiếu hoặc sắp chiếu), giống trang chủ web.
  const promoMovies = [...movies]
    .filter(m => (m.status === 1 || m.status === 2) && (m.banner || m.posterUrl))
    .sort((a, b) => String(b.releaseDate || '').localeCompare(String(a.releaseDate || '')))
    .slice(0, 8);

  const filteredMovies = movies.filter(m => 
    m.title.toLowerCase().includes(search.toLowerCase())
  );

  const renderHeader = () => (
    <View>
      <PromoSlider movies={promoMovies} />
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>🔥 Phim nổi bật</Text>
          <Text style={[styles.seeAll, { color: theme.tint }]}>Xem tất cả</Text>
        </View>
        <FlatList
          horizontal
          data={hotMovies}
          renderItem={({ item }) => <FeaturedMovie movie={item} />}
          keyExtractor={(item) => `hot-${item.id}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          snapToInterval={width * 0.75 + 15}
          decelerationRate="fast"
        />
      </View>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Đang chiếu</Text>
          <Text style={[styles.seeAll, { color: theme.tint }]}>Xem tất cả</Text>
        </View>
        <FlatList
          horizontal
          data={nowPlaying}
          renderItem={({ item }) => (
            <View style={{ width: width * 0.28 }}>
              <MovieCard movie={item} width="100%" />
            </View>
          )}
          keyExtractor={(item) => `now-${item.id}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
        />
      </View>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Sắp chiếu</Text>
        <Text style={[styles.seeAll, { color: theme.tint }]}>Xem tất cả</Text>
      </View>
    </View>
  );

  if (loading && search === '') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <AppHeader 
        title={session?.user?.fullname || session?.user?.email || 'Khách hàng'}
        subtitle="Xin chào," 
        rightElement={
          <View style={{ flex: 1, marginRight: 10, minWidth: width * 0.4 }}>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Tìm phim..." />
          </View>
        }
        showNotification={true}
      />

      <FlatList
        data={search === '' ? upcoming : filteredMovies}
        keyExtractor={(item) => `grid-${item.id}`}
        numColumns={numColumns}
        key={numColumns} // Buộc re-render khi số cột thay đổi (Responsive)
        renderItem={({ item }) => (
          <View style={[styles.gridItem, { maxWidth: `${100 / numColumns}%` }]}>
            <MovieCard movie={item} width="100%" />
          </View>
        )}
        ListHeaderComponent={search === '' ? renderHeader : null}
        ListHeaderComponentStyle={{ marginBottom: 15 }}
        contentContainerStyle={styles.mainList}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.columnWrapper}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainList: {
    paddingBottom: 40,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
  },
  horizontalList: {
    paddingLeft: 20,
    paddingRight: 20,
  },
  gridItem: {
    flex: 1,
    paddingHorizontal: 5,
  },
  columnWrapper: {
    paddingHorizontal: 15,
    justifyContent: 'flex-start',
  },
});
