import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import PostCard from '../components/PostCard';
import { mockPosts } from '../services/mockData';

export default function ExploreScreen({ likedPosts, onPostPress }) {
  return (
    <FlatList
      data={mockPosts}
      keyExtractor={item => item.id}
      numColumns={2}
      contentContainerStyle={styles.container}
      renderItem={({ item }) => (
        <PostCard
          post={item}
          liked={likedPosts.has(item.id)}
          onPress={() => onPostPress(item)}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: 12 },
});
