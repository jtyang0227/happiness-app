import React, { useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

import Header from '../components/Header';
import TabBar from '../components/TabBar';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { usePhotos } from '../hooks/usePhotos';

import ExploreScreen from '../screens/ExploreScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import GalleryScreen from '../screens/GalleryScreen';
import ListScreen from '../screens/ListScreen';
import PhotoDetailScreen from '../screens/PhotoDetailScreen';
import PhotoFormScreen from '../screens/PhotoFormScreen';
import { COLORS } from '../constants/colors';

// screen: explore | postDetail | gallery | list | photoDetail | form
export default function AppNavigator() {
  const [screen, setScreen] = useState('explore');

  // Explore state
  const [selectedPost, setSelectedPost] = useState(null);
  const [likedPosts, setLikedPosts] = useState(new Set());

  // Gallery/Photos state
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [formMode, setFormMode] = useState('new');

  const { message: toastMsg, anim: toastAnim, show: showToast } = useToast();
  const { photos, loading, refetch, updatePhoto, removePhoto } = usePhotos();

  const navigate = (to) => setScreen(to);

  const openPhotoForm = (mode, photo = null) => {
    setFormMode(mode);
    if (mode === 'edit' && photo) setSelectedPhoto(photo);
    navigate('form');
  };

  const handleLikePost = (post) => {
    const next = new Set(likedPosts);
    if (next.has(post.id)) {
      next.delete(post.id);
      showToast('좋아요를 취소했습니다.');
    } else {
      next.add(post.id);
      showToast('좋아요를 눌렀습니다. 💗');
    }
    setLikedPosts(next);
  };

  const activeTab =
    screen === 'postDetail'  ? 'explore'  :
    screen === 'photoDetail' ? 'gallery'  :
    screen === 'form'        ? 'add'      :
    screen;

  const renderScreen = () => {
    switch (screen) {
      case 'postDetail':
        return (
          <PostDetailScreen
            post={selectedPost}
            liked={likedPosts.has(selectedPost?.id)}
            onBack={() => navigate('explore')}
            onLike={() => handleLikePost(selectedPost)}
            onShare={() => showToast(`"${selectedPost?.title}" 공유했습니다! ↗`)}
            onCommentSubmit={() => showToast('댓글이 작성되었습니다.')}
          />
        );
      case 'gallery':
        return (
          <GalleryScreen
            photos={photos}
            loading={loading}
            onPhotoPress={(photo) => { setSelectedPhoto(photo); navigate('photoDetail'); }}
          />
        );
      case 'list':
        return (
          <ListScreen
            photos={photos}
            onPhotoPress={(photo) => { setSelectedPhoto(photo); navigate('photoDetail'); }}
          />
        );
      case 'photoDetail':
        return (
          <PhotoDetailScreen
            photo={selectedPhoto}
            onBack={() => navigate('gallery')}
            onPhotoUpdated={(updated, action) => {
              if (action === 'edit') {
                openPhotoForm('edit', updated);
              } else {
                setSelectedPhoto(updated);
                updatePhoto(updated);
              }
            }}
            onPhotoDeleted={(id) => { removePhoto(id); navigate('gallery'); }}
            showToast={showToast}
          />
        );
      case 'form':
        return (
          <PhotoFormScreen
            mode={formMode}
            photo={formMode === 'edit' ? selectedPhoto : null}
            onSaved={() => { refetch(); navigate('gallery'); }}
            onCancel={() => navigate('gallery')}
            showToast={showToast}
          />
        );
      default:
        return (
          <ExploreScreen
            likedPosts={likedPosts}
            onPostPress={(post) => { setSelectedPost(post); navigate('postDetail'); }}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style="dark" />
      <Header onLogoPress={() => navigate('explore')} />
      <TabBar
        active={activeTab}
        onTabPress={(tab) => tab === 'add' ? openPhotoForm('new') : navigate(tab)}
      />
      {renderScreen()}
      <Toast message={toastMsg} anim={toastAnim} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
});
