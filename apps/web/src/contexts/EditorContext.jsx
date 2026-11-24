import React, { createContext, useContext, useReducer, useMemo, useEffect } from 'react';
import { editorReducer, initialState, DEFAULT_EDIT_STATE } from '../reducers/editorReducer';

const EditorContext = createContext(null);

export function EditorProvider({ children }) {
  const [state, dispatch] = useReducer(editorReducer, initialState);

  // Revoke all objectUrls on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      state.images.forEach(img => {
        if (img.objectUrl) URL.revokeObjectURL(img.objectUrl);
      });
    };
  }, []); // runs only on unmount

  const currentImage = useMemo(
    () => state.images.find(img => img.id === state.selectedId) ?? null,
    [state.images, state.selectedId]
  );

  const currentEditState = currentImage?.editState ?? DEFAULT_EDIT_STATE;
  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const value = useMemo(() => ({
    state,
    dispatch,
    currentImage,
    currentEditState,
    canUndo,
    canRedo,
  }), [state, currentImage, currentEditState, canUndo, canRedo]);

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor must be used within EditorProvider');
  return ctx;
}
