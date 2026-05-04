import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONT, RADIUS, SPACING } from '../constants/layout';

const TOTAL_COLS = 12;
const SCREEN_W  = Dimensions.get('window').width - SPACING.lg * 2;
const CELL_W    = (SCREEN_W - (TOTAL_COLS - 1)) / TOTAL_COLS; // 1px gaps

// 레이아웃 프리셋
const PRESETS = [
  { label: '좁게',   cols: 4  },
  { label: '보통',   cols: 6  },
  { label: '넓게',   cols: 9  },
  { label: '전체',   cols: 12 },
];

/**
 * GridSpanPicker
 *
 * 12컬럼 시각적 셀 + 프리셋 버튼으로 gridColSpan(1-12)을 선택합니다.
 * Props:
 *   value    – 현재 선택된 colSpan (1-12)
 *   onChange – (newColSpan: number) => void
 */
export default function GridSpanPicker({ value = 6, onChange }) {
  return (
    <View>
      {/* 12셀 탭 바 */}
      <View style={styles.cells}>
        {Array.from({ length: TOTAL_COLS }, (_, i) => {
          const col   = i + 1;
          const active = col <= value;
          return (
            <TouchableOpacity
              key={col}
              onPress={() => onChange(col)}
              style={[styles.cell, active && styles.cellActive]}
              activeOpacity={0.7}
            />
          );
        })}
      </View>

      {/* 선택 안내 */}
      <Text style={styles.hint}>
        {value} / {TOTAL_COLS} 컬럼&nbsp;
        <Text style={styles.hintSub}>({Math.round((value / TOTAL_COLS) * 100)}% 너비)</Text>
      </Text>

      {/* 프리셋 버튼 */}
      <View style={styles.presets}>
        {PRESETS.map(({ label, cols }) => (
          <TouchableOpacity
            key={cols}
            onPress={() => onChange(cols)}
            style={[styles.preset, value === cols && styles.presetActive]}
            activeOpacity={0.75}
          >
            <Text style={[styles.presetText, value === cols && styles.presetTextActive]}>
              {label}
            </Text>
            {/* 미니 너비 미리보기 */}
            <View style={styles.previewBar}>
              <View style={[styles.previewFill, { flex: cols }, value === cols && styles.previewFillActive]} />
              <View style={{ flex: TOTAL_COLS - cols }} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* 12셀 바 */
  cells: {
    flexDirection: 'row',
    gap: 1,
    height: 36,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  cell: {
    flex: 1,
    backgroundColor: COLORS.border,
    borderRadius: 2,
  },
  cellActive: {
    backgroundColor: COLORS.primary,
  },

  /* 안내 텍스트 */
  hint: {
    marginTop: SPACING.sm,
    fontSize: FONT.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  hintSub: {
    fontWeight: '400',
    color: COLORS.textMuted,
  },

  /* 프리셋 */
  presets: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  preset: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  presetActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#eef0fd',
  },
  presetText: {
    fontSize: FONT.sm,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 5,
  },
  presetTextActive: {
    color: COLORS.primary,
  },

  /* 미니 너비 미리보기 */
  previewBar: {
    flexDirection: 'row',
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    overflow: 'hidden',
  },
  previewFill: {
    backgroundColor: COLORS.borderLight,
    borderRadius: 2,
  },
  previewFillActive: {
    backgroundColor: COLORS.primary,
  },
});
