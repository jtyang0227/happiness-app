import { useState, useEffect, useRef } from 'react';
import { computeJustifiedLayout } from '../utils/layoutAlgorithms';

/**
 * 갤러리 레이아웃 훅 — Justified Row Layout 계산 + ResizeObserver 통합
 *
 * @param {Array}  photos  - 사진 배열
 * @param {Object} options
 *   mode            'justified' | 'masonry' | 'list'  (기본 'justified')
 *   targetRowHeight  목표 행 높이 px (기본 300)
 *   gap              사진 사이 간격 px (기본 4)
 *
 * @returns {{ containerRef, layout }}
 *   containerRef — 갤러리 컨테이너 엘리먼트에 붙일 ref
 *   layout       — Justified 모드일 때 rows 배열, 나머지 모드는 []
 */
export function useGalleryLayout(photos, options = {}) {
  const { mode = 'justified', targetRowHeight = 300, gap = 4 } = options;

  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(
    () => (typeof window !== 'undefined' ? window.innerWidth : 1200),
  );
  const [layout, setLayout] = useState([]);

  // ResizeObserver — 컨테이너 너비 감지
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    setContainerWidth(el.offsetWidth);

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []); // eslint-disable-line

  // 레이아웃 재계산
  useEffect(() => {
    if (mode === 'justified' && containerWidth > 0) {
      setLayout(computeJustifiedLayout(photos, containerWidth, targetRowHeight, gap));
    } else {
      setLayout([]);
    }
  }, [photos, mode, containerWidth, targetRowHeight, gap]);

  return { containerRef, layout };
}
