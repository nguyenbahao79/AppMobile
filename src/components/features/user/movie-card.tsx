import React from 'react';
import { View, Text, StyleSheet, Pressable, DimensionValue } from 'react-native';
import { Image } from 'expo-image';
import { Link, Href } from 'expo-router';
import { Movie } from '@/mocks/movies';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface MovieCardProps {
  movie: Movie;
  width?: DimensionValue;
}

export function MovieCard({ movie, width = '31%' }: MovieCardProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <Link href={`/user/movie/${movie.id}` as Href} asChild>
      <Pressable style={[styles.card, { width }]}>
        <View style={styles.imageContainer}>
          <Image 
            source={movie.poster} 
            style={styles.image} 
            contentFit="cover" // Để ảnh lấp đầy khung mà không có khoảng trống
            transition={300}
            cachePolicy="memory-disk"
          />
        </View>
        <View style={styles.info}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{movie.title}</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.rating}>⭐ {movie.rating}</Text>
            <Text style={[styles.duration, { color: theme.tabIconDefault }]}>{movie.duration.split(' ')[0]}m</Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'transparent',
    borderRadius: 8, // Góc bo nhỏ hơn cho thẻ nhỏ
    overflow: 'hidden',
    marginBottom: 12,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 2/3,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1C1C1E',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  info: {
    paddingVertical: 4,
    height: 38, // Rút gọn tối đa chiều cao phần chữ
  },
  title: {
    fontSize: 11, // Chữ nhỏ tinh tế cho mobile
    fontWeight: '500',
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 1,
  },
  rating: {
    fontSize: 9,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  duration: {
    fontSize: 9,
  },
});
