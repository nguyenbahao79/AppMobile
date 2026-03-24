import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Link, Href } from 'expo-router';
import { Movie } from '@/mocks/movies';

const { width } = Dimensions.get('window');

interface FeaturedMovieProps {
  movie: Movie;
}

export function FeaturedMovie({ movie }: FeaturedMovieProps) {
  return (
    <Link href={`/user/movie/${movie.id}` as Href} asChild>
      <Pressable style={styles.container}>
        <Image 
          source={movie.backdrop} 
          style={styles.image} 
          contentFit="cover"
          transition={500}
        />
        <View style={styles.overlay}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Hot</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>{movie.title}</Text>
          <Text style={styles.genre} numberOfLines={1}>{movie.genre}</Text>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: {
    width: width * 0.7, // Giảm chiều rộng xuống 70% màn hình
    height: 180, // Giảm chiều cao xuống mức vừa phải, tránh bị phóng to quá đà
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    backgroundColor: '#2C2C2E',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.6)', // Tăng độ đậm để text rõ hơn trên nền ảnh nhỏ
  },
  badge: {
    backgroundColor: '#E50914',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  genre: {
    color: '#CCC',
    fontSize: 11,
    marginTop: 2,
  },
});
