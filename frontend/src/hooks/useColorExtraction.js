import { useState, useEffect, useRef } from 'react';

function kMeans(pixels, k = 5, iterations = 10) {
  // 초기 센트로이드: 균등 간격으로 샘플링
  let centroids = [];
  const step = Math.floor(pixels.length / k);
  for (let i = 0; i < k; i++) centroids.push([...pixels[i * step]]);

  for (let iter = 0; iter < iterations; iter++) {
    const clusters = Array.from({ length: k }, () => []);

    for (const px of pixels) {
      let minDist = Infinity, closest = 0;
      for (let c = 0; c < k; c++) {
        const d =
          (px[0] - centroids[c][0]) ** 2 +
          (px[1] - centroids[c][1]) ** 2 +
          (px[2] - centroids[c][2]) ** 2;
        if (d < minDist) { minDist = d; closest = c; }
      }
      clusters[closest].push(px);
    }

    centroids = clusters.map((cluster, ci) => {
      if (cluster.length === 0) return centroids[ci];
      const sum = cluster.reduce((a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], [0, 0, 0]);
      return sum.map(v => Math.round(v / cluster.length));
    });
  }

  return centroids;
}

function luminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function toHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

export default function useColorExtraction(imageUrl) {
  const [colors, setColors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cacheRef = useRef(new Map());

  useEffect(() => {
    if (!imageUrl) { setColors([]); return; }

    if (cacheRef.current.has(imageUrl)) {
      setColors(cacheRef.current.get(imageUrl));
      return;
    }

    setLoading(true);
    setError(null);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 200; canvas.height = 200;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 200, 200);
        const data = ctx.getImageData(0, 0, 200, 200).data;

        const pixels = [];
        for (let y = 0; y < 200; y += 10) {
          for (let x = 0; x < 200; x += 10) {
            const i = (y * 200 + x) * 4;
            if (data[i + 3] > 128) pixels.push([data[i], data[i + 1], data[i + 2]]);
          }
        }

        if (pixels.length === 0) { setColors([]); setLoading(false); return; }

        const centroids = kMeans(pixels, 5, 10);
        const sorted = centroids
          .sort((a, b) => luminance(...a) - luminance(...b))
          .map(([r, g, b]) => toHex(r, g, b));

        cacheRef.current.set(imageUrl, sorted);
        setColors(sorted);
      } catch (e) {
        setError('색상 추출 실패');
        setColors([]);
      } finally {
        setLoading(false);
      }
    };
    img.onerror = () => {
      setError('이미지 로드 실패');
      setColors([]);
      setLoading(false);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  return { colors, loading, error };
}
