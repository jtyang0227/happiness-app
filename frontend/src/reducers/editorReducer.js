import {
  DEFAULT_ADJUSTMENTS,
  DEFAULT_EFFECTS,
  DEFAULT_CHANNEL_CURVES,
  DEFAULT_HSL_ADJUSTMENTS,
  DEFAULT_COLOR_GRADING,
  DEFAULT_SHARPENING,
  DEFAULT_NOISE_REDUCTION,
} from '../hooks/useImageAdjustments';

export const DEFAULT_EDIT_STATE = {
  crop:        { x: 0, y: 0, w: 1, h: 1, ratio: null },
  rotate:      0,
  flip:        { h: false, v: false },
  adjustments: { ...DEFAULT_ADJUSTMENTS },
  effects:     { ...DEFAULT_EFFECTS },
  channelCurves: { ...DEFAULT_CHANNEL_CURVES },
  hslAdj:        { ...DEFAULT_HSL_ADJUSTMENTS },
  colorGrading:  JSON.parse(JSON.stringify(DEFAULT_COLOR_GRADING)),
  sharpening:    { ...DEFAULT_SHARPENING },
  noiseReduction: { ...DEFAULT_NOISE_REDUCTION },
  filter:      { name: 'none', intensity: 100 },
  overlays:    [],
};

function makeImageItem(file) {
  return {
    id:        crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
    name:      file.name,
    file,
    objectUrl: URL.createObjectURL(file),
    editState: JSON.parse(JSON.stringify(DEFAULT_EDIT_STATE)),
  };
}

const MAX_HISTORY = 50;

export const initialState = {
  images:      [],
  selectedId:  null,
  past:        [],
  future:      [],
  zoom:        1,
  panOffset:   { x: 0, y: 0 },
  activeTool:  'select',
  activeTab:   'adjust',
};

export function editorReducer(state, action) {
  switch (action.type) {

    case 'IMAGES_ADD': {
      const newItems = action.files
        .filter(f => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type))
        .slice(0, Math.max(0, 100 - state.images.length))
        .map(makeImageItem);
      if (newItems.length === 0) return state;
      const images = [...state.images, ...newItems];
      return {
        ...state,
        images,
        selectedId: state.selectedId ?? images[0].id,
        past: [], future: [],
      };
    }

    case 'IMAGES_REMOVE': {
      const img = state.images.find(i => i.id === action.id);
      if (img) URL.revokeObjectURL(img.objectUrl);
      const images = state.images.filter(i => i.id !== action.id);
      const selectedId = state.selectedId === action.id
        ? (images[0]?.id ?? null)
        : state.selectedId;
      return { ...state, images, selectedId, past: [], future: [] };
    }

    case 'IMAGES_REORDER': {
      return { ...state, images: action.images };
    }

    case 'IMAGE_SELECT':
      return { ...state, selectedId: action.id, past: [], future: [] };

    case 'EDIT_UPDATE': {
      const { id, patch } = action;
      const targetId = id ?? state.selectedId;
      const target = state.images.find(i => i.id === targetId);
      if (!target) return state;

      const prevEdit = target.editState;
      const nextEdit = deepMerge(prevEdit, patch);

      const past = [
        ...state.past.slice(-(MAX_HISTORY - 1)),
        { id: targetId, editState: prevEdit },
      ];

      return {
        ...state,
        images: state.images.map(i =>
          i.id === targetId ? { ...i, editState: nextEdit } : i
        ),
        past,
        future: [],
      };
    }

    case 'EDIT_RESET': {
      const targetId = action.id ?? state.selectedId;
      const fresh = JSON.parse(JSON.stringify(DEFAULT_EDIT_STATE));
      const target = state.images.find(i => i.id === targetId);
      if (!target) return state;
      const past = [
        ...state.past.slice(-(MAX_HISTORY - 1)),
        { id: targetId, editState: target.editState },
      ];
      return {
        ...state,
        images: state.images.map(i =>
          i.id === targetId ? { ...i, editState: fresh } : i
        ),
        past,
        future: [],
      };
    }

    case 'UNDO': {
      if (state.past.length === 0) return state;
      const past  = [...state.past];
      const entry = past.pop();
      const target = state.images.find(i => i.id === entry.id);
      if (!target) return { ...state, past };
      const future = [
        { id: entry.id, editState: target.editState },
        ...state.future,
      ];
      return {
        ...state,
        images: state.images.map(i =>
          i.id === entry.id ? { ...i, editState: entry.editState } : i
        ),
        past,
        future,
      };
    }

    case 'REDO': {
      if (state.future.length === 0) return state;
      const future = [...state.future];
      const entry  = future.shift();
      const target = state.images.find(i => i.id === entry.id);
      if (!target) return { ...state, future };
      const past = [
        ...state.past.slice(-(MAX_HISTORY - 1)),
        { id: entry.id, editState: target.editState },
      ];
      return {
        ...state,
        images: state.images.map(i =>
          i.id === entry.id ? { ...i, editState: entry.editState } : i
        ),
        past,
        future,
      };
    }

    case 'ZOOM_SET':
      return { ...state, zoom: Math.min(5, Math.max(0.1, action.zoom)) };

    case 'PAN_SET':
      return { ...state, panOffset: action.offset };

    case 'TOOL_SET':
      return { ...state, activeTool: action.tool };

    case 'TAB_SET':
      return { ...state, activeTab: action.tab };

    default:
      return state;
  }
}

function deepMerge(base, patch) {
  if (!patch || typeof patch !== 'object') return patch ?? base;
  const result = { ...base };
  for (const key of Object.keys(patch)) {
    const bv = base[key];
    const pv = patch[key];
    if (pv !== null && typeof pv === 'object' && !Array.isArray(pv) && typeof bv === 'object' && bv !== null) {
      result[key] = deepMerge(bv, pv);
    } else {
      result[key] = pv;
    }
  }
  return result;
}
