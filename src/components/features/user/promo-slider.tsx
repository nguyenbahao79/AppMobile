import React from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { PROMOTIONS } from '@/mocks/movies';

const { width } = Dimensions.get('window');

export function PromoSlider() {
  const renderItem = ({ item }: { item: typeof PROMOTIONS[0] }) => (
    <View style={styles.card}>
      <Image 
        source={{ uri: item.image }} 
        style={styles.image} 
        contentFit="cover"
        transition={500}
      />
      <View style={styles.overlay}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={PROMOTIONS}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
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
