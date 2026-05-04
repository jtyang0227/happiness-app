import { Platform } from 'react-native';

const BASE = Platform.OS === 'android'
  ? 'http://10.0.2.2:8080/api'
  : 'http://localhost:8080/api';

const request = async (path, { body, ...opts } = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
};

export const photoApi = {
  getAll:   ()         => request('/photos'),
  create:   (data)     => request('/photos',         { method: 'POST',   body: data }),
  update:   (id, data) => request(`/photos/${id}`,   { method: 'PUT',    body: data }),
  remove:   (id)       => request(`/photos/${id}`,   { method: 'DELETE' }),
  like:     (id)       => request(`/photos/${id}/like`,     { method: 'POST' }),
  favorite: (id)       => request(`/photos/${id}/favorite`, { method: 'POST' }),
};
