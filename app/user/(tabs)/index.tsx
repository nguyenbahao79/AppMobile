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
import { movieService } from '@/api/movieService';
import { MovieCard } from '@/components/features/user/movie-card';
import { FeaturedMovie } from '@/components/features/user/featured-movie';
import { PromoSlider } from '@/components/features/user/promo-slider';
import { SearchBar } from '@/components/layout/search-bar';
import { AppHeader } from '@/components/layout/app-header';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [search, setSearch] = useState('');
  const [movies, setMovies] = useState<Movie[]>(MOVIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const data = await movieService.getMovies();
        if (data && data.length > 0) {
          setMovies(data);
        }
      } catch (error) {
        console.warn('Backend not available, using mock data:', error);
        // Fallback to MOVIES which is already set in initial state
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, []);

  const numColumns = width > 600 ? 4 : 3;

  const hotMovies = movies.filter(m => m.isHot);
  const nowPlaying = movies.filter(m => m.isNowPlaying);
  const upcoming = movies.filter(m => !m.isNowPlaying);

  const filteredMovies = movies.filter(m => 
    m.title.toLowerCase().includes(search.toLowerCase())
  );

  const renderHeader = () => (
    <View>
      <PromoSlider />

      {/* Hot Movies Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>🔥 Hot Movies</Text>
          <Text style={[styles.seeAll, { color: theme.tint }]}>See All</Text>
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

      {/* Now Playing Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Now Playing</Text>
          <Text style={[styles.seeAll, { color: theme.tint }]}>See All</Text>
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

      {/* Upcoming Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Upcoming</Text>
        <Text style={[styles.seeAll, { color: theme.tint }]}>See All</Text>
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
        title="John Doe" 
        subtitle="Welcome back," 
        rightElement={
          <View style={{ flex: 1, marginRight: 10, minWidth: width * 0.4 }}>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search movies..." />
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
          <View style={styles.gridItem}>
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
    maxWidth: '33.33%', // Đảm bảo không bị giãn quá rộng trên mobile
    paddingHorizontal: 5,
  },
  columnWrapper: {
    paddingHorizontal: 15,
    justifyContent: 'flex-start',
  },
});
