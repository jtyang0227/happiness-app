import { useState, useEffect, useCallback } from 'react';
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

  // 콜백 ref — 컨테이너는 로딩이 끝난 뒤에야 그려지므로, 마운트 시점 한 번만 보는 useRef + [] effect로는
  // ResizeObserver가 영영 붙지 않아 초기값(창 너비)이 그대로 쓰였다(패딩만큼 행이 넘쳐 가로 스크롤).
  const [node, setNode] = useState(null);
  const containerRef = useCallback(el => setNode(el), []);
  const [containerWidth, setContainerWidth] = useState(
    () => (typeof window !== 'undefined' ? window.innerWidth : 1200),
  );
  const [layout, setLayout] = useState([]);

  // ResizeObserver — 컨테이너 콘텐츠 너비(패딩 제외) 감지. 처음 관찰할 때도 한 번 호출된다.
  useEffect(() => {
    if (!node) return undefined;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

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
