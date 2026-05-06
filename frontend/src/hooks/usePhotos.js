import { useState, useEffect, useCallback } from 'react';
import { photoApi } from '../services/api';

export function usePhotos() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await photoApi.getAll();
      // backend returns { status, data: [...] }
      const list = res?.data ?? (Array.isArray(res) ? res : []);
      setPhotos(list);
    } catch (err) {
      setError(err.message || '사진을 불러오는데 실패했습니다.');
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const createPhoto = useCallback(async (data) => {
    const res = await photoApi.create(data);
    const created = res?.data ?? res;
    if (created?.id) setPhotos(prev => [created, ...prev]);
    return created;
  }, []);

  const updatePhoto = useCallback(async (id, data) => {
    const res = await photoApi.update(id, data);
    const updated = res?.data ?? res;
    if (updated?.id) setPhotos(prev => prev.map(p => p.id === id ? updated : p));
    return updated;
  }, []);

  const removePhoto = useCallback(async (id) => {
    await photoApi.remove(id);
    setPhotos(prev => prev.filter(p => String(p.id) !== String(id)));
  }, []);

  return { photos, loading, error, refetch: fetchPhotos, createPhoto, updatePhoto, removePhoto };
}
