const MIN_ROW_HEIGHT = 150;
const MAX_ROW_HEIGHT = 500;

/**
 * "16:9" → 1.778, "4:3" → 1.333, "3:4" → 0.75, "1:1" → 1.0
 * 파싱 실패 시 기본값 4/3 반환
 */
export function parseAspectRatio(imageRatio) {
  if (!imageRatio) return 4 / 3;
  const parts = String(imageRatio).split(':');
  if (parts.length !== 2) return 4 / 3;
  const w = parseFloat(parts[0]);
  const h = parseFloat(parts[1]);
  if (!w || !h || h === 0) return 4 / 3;
  return w / h;
}

/**
 * Justified Row Layout 알고리즘
 *
 * 목표: 모든 행의 높이를 targetRowHeight에 맞추고,
 *       각 사진 너비를 aspect ratio 비례로 자동 결정한다.
 *
 * @param {Array}  photos          - photo 객체 배열 (imageRatio 또는 _ar 포함)
 * @param {number} containerWidth  - 컨테이너 픽셀 너비
 * @param {number} targetRowHeight - 목표 행 높이 (px), 기본 300
 * @param {number} gap             - 사진 사이·행 사이 간격 (px), 기본 4
 * @returns {Array} rows - [{ photos: [..., _displayWidth, _displayHeight], rowHeight, isLastRow? }]
 */
export function computeJustifiedLayout(
  photos,
  containerWidth,
  targetRowHeight = 300,
  gap = 4,
) {
  if (!photos || photos.length === 0 || containerWidth <= 0) return [];

  const rows = [];
  let currentRow = [];
  let currentAspectSum = 0;

  for (const photo of photos) {
    const ar = photo._ar ?? parseAspectRatio(photo.imageRatio);
    currentRow.push({ ...photo, _ar: ar });
    currentAspectSum += ar;

    // 이 행에 사진을 이 비율로 targetRowHeight 높이로 배치하면 몇 px 너비인지 계산
    const rowGaps = (currentRow.length - 1) * gap;
    const projectedWidth = currentAspectSum * targetRowHeight + rowGaps;

    if (projectedWidth >= containerWidth) {
      // 행 확정: 실제 높이를 containerWidth에 맞게 스케일 조정
      const scale = (containerWidth - rowGaps) / currentAspectSum;
      const rowHeight = Math.max(MIN_ROW_HEIGHT, Math.min(MAX_ROW_HEIGHT, scale));

      rows.push({
        photos: currentRow.map(p => ({
          ...p,
          _displayWidth: p._ar * rowHeight,
          _displayHeight: rowHeight,
        })),
        rowHeight,
      });

      currentRow = [];
      currentAspectSum = 0;
    }
  }

  // 마지막 행 — 좌측 정렬, targetRowHeight 초과 방지 (늘이지 않음)
  if (currentRow.length > 0) {
    const rowGaps = (currentRow.length - 1) * gap;
    const scale = Math.min(
      targetRowHeight,
      containerWidth > rowGaps ? (containerWidth - rowGaps) / currentAspectSum : targetRowHeight,
    );
    const rowHeight = Math.max(MIN_ROW_HEIGHT, Math.min(MAX_ROW_HEIGHT, scale));

    rows.push({
      photos: currentRow.map(p => ({
        ...p,
        _displayWidth: p._ar * rowHeight,
        _displayHeight: rowHeight,
      })),
      rowHeight,
      isLastRow: true,
    });
  }

  return rows;
}
