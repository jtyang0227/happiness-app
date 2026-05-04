import { useState, useEffect } from 'react';
import { photoApi } from '../services/api';

export function usePhotos() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const json = await photoApi.getAll();
      setPhotos(json.data || []);
    } catch {
      // backend may not be running in dev
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPhotos(); }, []);

  const updatePhoto = (updated) =>
    setPhotos(cur => cur.map(p => p.id === updated.id ? updated : p));

  const removePhoto = (id) =>
    setPhotos(cur => cur.filter(p => p.id !== id));

  return { photos, loading, refetch: fetchPhotos, updatePhoto, removePhoto };
}
