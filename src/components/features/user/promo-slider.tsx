import React from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Link, Href } from 'expo-router';
import { Movie } from '@/mocks/movies';

const { width } = Dimensions.get('window');

interface PromoSliderProps {
  movies: Movie[];
}

export function PromoSlider({ movies }: PromoSliderProps) {
  if (!movies.length) return null;

  const renderItem = ({ item }: { item: Movie }) => (
    <Link href={`/user/movie/${item.id}` as Href} asChild>
      <Pressable style={styles.card}>
        <Image
          source={item.banner || item.posterUrl}
          style={styles.image}
          contentFit="cover"
          transition={500}
        />
        <View style={styles.overlay}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          {item.genre ? <Text style={styles.description} numberOfLines={1}>{item.genre}</Text> : null}
        </View>
      </Pressable>
    </Link>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={movies}
        renderItem={renderItem}
        keyExtractor={(item) => `promo-${item.id}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={width - 40}
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 15,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  card: {
    width: width - 40,
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 10,
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
  },
  title: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  description: {
    color: '#EEE',
    fontSize: 12,
    marginTop: 2,
  },
});
