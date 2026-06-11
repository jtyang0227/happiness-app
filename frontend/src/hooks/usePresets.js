import { useState, useCallback } from 'react';

const STORAGE_KEY = 'happiness-photo-presets';
export const MAX_PRESETS = 5;

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(presets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

function deepCloneCurves(channelCurves) {
  return {
    rgb: channelCurves.rgb.map(p => ({ ...p })),
    r:   channelCurves.r.map(p => ({ ...p })),
    g:   channelCurves.g.map(p => ({ ...p })),
    b:   channelCurves.b.map(p => ({ ...p })),
  };
}

export function usePresets() {
  const [presets, setPresets] = useState(loadFromStorage);

  const mutate = useCallback((updater) => {
    setPresets(prev => {
      const next = updater(prev);
      saveToStorage(next);
      return next;
    });
  }, []);

  const addPreset = useCallback((name, adjustments, channelCurves, effects) => {
    mutate(prev => {
      if (prev.length >= MAX_PRESETS) return prev;
      const preset = {
        id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        name: name.trim() || `프리셋 ${prev.length + 1}`,
        createdAt: new Date().toISOString(),
        adjustments: { ...adjustments },
        channelCurves: deepCloneCurves(channelCurves),
        effects: { ...effects },
      };
      return [...prev, preset];
    });
  }, [mutate]);

  const removePreset = useCallback((id) => {
    mutate(prev => prev.filter(p => p.id !== id));
  }, [mutate]);

  const renamePreset = useCallback((id, name) => {
    if (!name.trim()) return;
    mutate(prev => prev.map(p => p.id === id ? { ...p, name: name.trim() } : p));
  }, [mutate]);

  return { presets, addPreset, removePreset, renamePreset };
}
