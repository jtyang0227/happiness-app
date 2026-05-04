import React, { useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, View } from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

import Header from '../components/Header';
import TabBar from '../components/TabBar';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { usePhotos } from '../hooks/usePhotos';
import { useAuth } from '../store/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ExploreScreen from '../screens/ExploreScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import GalleryScreen from '../screens/GalleryScreen';
import ListScreen from '../screens/ListScreen';
import PhotoDetailScreen from '../screens/PhotoDetailScreen';
import PhotoFormScreen from '../screens/PhotoFormScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { COLORS } from '../constants/colors';

// ── 미인증 화면 ────────────────────────────────────────────────
function AuthNavigator() {
  const [authScreen, setAuthScreen] = useState('login');
  if (authScreen === 'signup') {
    return <SignUpScreen onGoLogin={() => setAuthScreen('login')} />;
  }
  return <LoginScreen onGoSignUp={() => setAuthScreen('signup')} />;
}

// ── 메인 앱 ────────────────────────────────────────────────────
function MainNavigator() {
  const [screen, setScreen] = useState('explore');
  const [selectedPost, setSelectedPost] = useState(null);
  const [likedPosts, setLikedPosts] = useState(new Set());
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
      case 'profile':
        return <ProfileScreen />;
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

// ── 루트: 인증 상태에 따라 분기 ──────────────────────────────────
export default function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return isAuthenticated ? <MainNavigator /> : <AuthNavigator />;
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.bg },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a1a' },
});
