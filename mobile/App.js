import React, { useEffect, useState } from 'react';
import { Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, FlatList, Image, Alert, KeyboardAvoidingView } from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

const API_BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8080/api' : 'http://localhost:8080/api';
const emptyForm = { title: '', imageUrl: '', description: '' };

export default function App() {
  const [screen, setScreen] = useState('gallery');
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formMode, setFormMode] = useState('new');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/photos`);
      const json = await response.json();
      setPhotos(json.data || []);
    } catch (error) {
      Alert.alert('오류', '사진 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const openDetail = (photo) => {
    setSelectedPhoto(photo);
    setScreen('detail');
  };

  const openForm = (mode, photo = null) => {
    setFormMode(mode);
    if (mode === 'edit' && photo) {
      setForm({
        title: photo.title,
        imageUrl: photo.imageUrl,
        description: photo.description || '',
      });
      setSelectedPhoto(photo);
    } else {
      setForm(emptyForm);
      setSelectedPhoto(null);
    }
    setScreen('form');
  };

  const handleSavePhoto = async () => {
    if (!form.title.trim()) {
      Alert.alert('검증 오류', '제목을 입력해주세요.');
      return;
    }
    if (!form.imageUrl.trim()) {
      Alert.alert('검증 오류', '이미지 URL을 입력해주세요.');
      return;
    }

    const url = formMode === 'edit' && selectedPhoto ? `${API_BASE_URL}/photos/${selectedPhoto.id}` : `${API_BASE_URL}/photos`;
    const method = formMode === 'edit' && selectedPhoto ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await response.json();
      if (response.ok) {
        Alert.alert('성공', formMode === 'edit' ? '사진이 수정되었습니다.' : '사진이 등록되었습니다.');
        fetchPhotos();
        setScreen('gallery');
      } else {
        Alert.alert('오류', json.message || '사진 저장 중 오류가 발생했습니다.');
      }
    } catch (error) {
      Alert.alert('오류', '사진 저장 중 오류가 발생했습니다.');
    }
  };

  const handleAction = async (photo, action) => {
    const url = `${API_BASE_URL}/photos/${photo.id}/${action}`;
    try {
      const response = await fetch(url, { method: 'POST' });
      const json = await response.json();
      if (response.ok) {
        const updated = json.data;
        setSelectedPhoto(updated);
        setPhotos((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        Alert.alert('오류', json.message || '조작 중 오류가 발생했습니다.');
      }
    } catch (error) {
      Alert.alert('오류', '서버와 연결할 수 없습니다.');
    }
  };

  const handleDelete = async () => {
    if (!selectedPhoto) {
      return;
    }
    Alert.alert('삭제 확인', '이 사진을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await fetch(`${API_BASE_URL}/photos/${selectedPhoto.id}`, { method: 'DELETE' });
            const json = await response.json();
            if (response.ok) {
              Alert.alert('삭제됨', '사진이 삭제되었습니다.');
              fetchPhotos();
              setScreen('gallery');
            } else {
              Alert.alert('오류', json.message || '삭제 중 오류가 발생했습니다.');
            }
          } catch (error) {
            Alert.alert('오류', '서버와 연결할 수 없습니다.');
          }
        },
      },
    ]);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Happiness Photo Gallery</Text>
      <View style={styles.tabRow}>
        <TouchableOpacity style={styles.tabButton} onPress={() => setScreen('gallery')}>
          <Text style={styles.tabText}>갤러리</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabButton} onPress={() => setScreen('list')}>
          <Text style={styles.tabText}>목록</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabButton} onPress={() => openForm('new')}>
          <Text style={styles.tabText}>등록</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderGallery = () => {
    if (loading && photos.length === 0) {
      return <Text style={styles.message}>로딩 중...</Text>;
    }
    if (photos.length === 0) {
      return <Text style={styles.message}>등록된 사진이 없습니다. 새 사진을 등록해보세요.</Text>;
    }
    return (
      <FlatList
        data={photos}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openDetail(item)}>
            <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardMeta}>💗 {item.likes || 0}   ⭐ {item.favorites || 0}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    );
  };

  const renderList = () => {
    if (photos.length === 0) {
      return <Text style={styles.message}>등록된 사진이 없습니다.</Text>;
    }
    return (
      <ScrollView contentContainerStyle={styles.listContainer}>
        {photos.map((photo) => (
          <TouchableOpacity key={photo.id} style={styles.listItem} onPress={() => openDetail(photo)}>
            <Image source={{ uri: photo.imageUrl }} style={styles.listImage} />
            <View style={styles.listInfo}>
              <Text style={styles.listTitle}>{photo.title}</Text>
              <Text style={styles.listDescription} numberOfLines={2}>{photo.description || '설명 없음'}</Text>
              <Text style={styles.listMeta}>💗 {photo.likes || 0}   ⭐ {photo.favorites || 0}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderDetail = () => {
    if (!selectedPhoto) {
      return <Text style={styles.message}>사진을 선택해주세요.</Text>;
    }
    return (
      <ScrollView contentContainerStyle={styles.detailContainer}>
        <Image source={{ uri: selectedPhoto.imageUrl }} style={styles.detailImage} />
        <Text style={styles.detailTitle}>{selectedPhoto.title}</Text>
        <Text style={styles.detailDescription}>{selectedPhoto.description || '설명이 없습니다.'}</Text>
        <Text style={styles.detailMeta}>등록일: {new Date(selectedPhoto.createdAt).toLocaleDateString()}</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleAction(selectedPhoto, 'like')}>
            <Text style={styles.actionText}>좋아요 💗</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleAction(selectedPhoto, 'favorite')}>
            <Text style={styles.actionText}>찜 ⭐</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.editButton} onPress={() => openForm('edit', selectedPhoto)}>
            <Text style={styles.actionText}>수정</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.actionText}>삭제</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderForm = () => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.formWrap}>
      <ScrollView contentContainerStyle={styles.formContainer}>
        <Text style={styles.formTitle}>{formMode === 'edit' ? '사진 수정' : '새 사진 등록'}</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>제목</Text>
          <TextInput style={styles.input} placeholder="제목을 입력하세요" value={form.title} onChangeText={(text) => setForm({ ...form, title: text })} />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>이미지 URL</Text>
          <TextInput style={styles.input} placeholder="https://..." value={form.imageUrl} onChangeText={(text) => setForm({ ...form, imageUrl: text })} autoCapitalize="none" />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>설명</Text>
          <TextInput style={[styles.input, styles.textArea]} placeholder="간단한 설명을 입력하세요" value={form.description} onChangeText={(text) => setForm({ ...form, description: text })} multiline />
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSavePhoto}>
            <Text style={styles.actionText}>{formMode === 'edit' ? '저장' : '등록'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setScreen('gallery')}>
            <Text style={styles.actionText}>취소</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderScreen = () => {
    switch (screen) {
      case 'list':
        return renderList();
      case 'detail':
        return renderDetail();
      case 'form':
        return renderForm();
      case 'gallery':
      default:
        return renderGallery();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style="dark" />
      {renderHeader()}
      {renderScreen()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7fb',
  },
  header: {
    paddingTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e3e6ef',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tabButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#5b6ef5',
    alignItems: 'center',
  },
  tabText: {
    color: '#fff',
    fontWeight: '600',
  },
  listContainer: {
    padding: 12,
  },
  card: {
    flex: 1,
    margin: 6,
    borderRadius: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
    elevation: 2,
  },
  cardImage: {
    width: '100%',
    height: 140,
  },
  cardBody: {
    padding: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardMeta: {
    color: '#666',
  },
  message: {
    marginTop: 32,
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
  },
  listImage: {
    width: 110,
    height: 110,
  },
  listInfo: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  listDescription: {
    color: '#666',
    marginVertical: 6,
  },
  listMeta: {
    color: '#888',
    fontSize: 13,
  },
  detailContainer: {
    padding: 16,
  },
  detailImage: {
    width: '100%',
    height: 260,
    borderRadius: 18,
    marginBottom: 16,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  detailDescription: {
    color: '#4f4f4f',
    lineHeight: 22,
    marginBottom: 12,
  },
  detailMeta: {
    color: '#888',
    marginBottom: 18,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#5b6ef5',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#34c759',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#ff3b30',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#5b6ef5',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#a9a9ac',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  actionText: {
    color: '#fff',
    fontWeight: '700',
  },
  formWrap: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
});
