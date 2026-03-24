import React from 'react';
import { View, StyleSheet, ScrollView, Pressable, SafeAreaView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack, Href } from 'expo-router';
import { MOVIES } from '@/mocks/movies';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/base/icon-symbol';
import { ThemedText } from '@/components/base/themed-text';
import { ThemedView } from '@/components/base/themed-view';

export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const movie = MOVIES.find((m) => m.id === id);
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

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
          source={movie.poster} 
          style={styles.image} 
          contentFit="cover"
          transition={500}
        />
        <View style={styles.content}>
          <ThemedText type="title" style={styles.title}>{movie.title}</ThemedText>
          <View style={styles.metaRow}>
            <ThemedText style={styles.genre}>{movie.genre}</ThemedText>
            <ThemedText style={styles.dot}>•</ThemedText>
            <ThemedText style={styles.duration}>{movie.duration}</ThemedText>
          </View>
          
          <View style={styles.ratingRow}>
            <IconSymbol name="star.fill" size={20} color="#FFD700" />
            <ThemedText style={styles.rating}>{movie.rating} / 5.0</ThemedText>
          </View>

          <ThemedText type="subtitle" style={styles.sectionTitle}>Mô tả phim</ThemedText>
          <ThemedText style={styles.description}>{movie.description}</ThemedText>

          <ThemedText type="subtitle" style={styles.sectionTitle}>Ngày khởi chiếu</ThemedText>
          <ThemedText style={styles.date}>{movie.releaseDate}</ThemedText>
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
  title: {
    fontSize: 28,
    lineHeight: 34,
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
