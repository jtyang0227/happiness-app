import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { seriesApi, photoApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, MOOD_COLORS } from '../constants/colors';
import MagazineViewer from '../components/magazine/MagazineViewer';
import PhotoModal from '../components/photo/PhotoModal';
import DotEmptyState from '../components/common/DotEmptyState';
import { SHOOT_TYPES } from '../constants/shootTypes';

const SHOT_ON_RE = /^\d{4}\.(0[1-9]|1[0-2])$/;

/* ─── 시리즈 카드 ───────────────────────────────── */
function SeriesCard({ series, onEdit, onDelete, onManagePhotos, onMagazineView, workPath, onTogglePin }) {
  return (
    <div style={{
      background: COLORS.surface,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 20,
      overflow: 'hidden',
      transition: 'transform 0.22s ease, box-shadow 0.22s ease',
    }}>
      {/* 커버 — 사진 3장 이상이면 Cosmos 스타일 콜라주(좌측 큰 이미지 + 우측 2분할) */}
      <div style={{
        position: 'relative', height: 150,
        background: COLORS.border, overflow: 'hidden',
        cursor: 'pointer',
      }} onClick={() => onManagePhotos(series)}>
        {(() => {
          const imgs = (series.previewPhotos?.length ? series.previewPhotos : [series.coverImageUrl]).filter(Boolean);
          if (imgs.length === 0) {
            return (
              <div style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `linear-gradient(135deg, ${COLORS.primaryLight}, ${COLORS.border})`,
                fontSize: 32, color: COLORS.primary,
              }}>✦</div>
            );
          }
          if (imgs.length === 1) {
            return <img src={imgs[0]} alt={series.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none'; }} />;
          }
          return (
            <div style={{ display: 'flex', gap: 2, height: '100%' }}>
              <div style={{ flex: 1.5, height: '100%' }}>
                <img src={imgs[0]} alt={series.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none'; }} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <img src={imgs[1]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none'; }} />
                </div>
                {imgs[2] && (
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <img src={imgs[2]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none'; }} />
                  </div>
                )}
              </div>
            </div>
          );
        })()}
        <div style={{
          position: 'absolute', bottom: 8, right: 8,
          background: 'rgba(0,0,0,0.55)', borderRadius: 8,
          padding: '3px 9px', fontSize: 11, fontWeight: 700, color: '#fff',
        }}>
          {series.photoCount ?? 0}장
        </div>
      </div>

      {/* 정보 */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, margin: 0 }}>
            {series.title}
          </h3>
          <button
            onClick={() => onTogglePin(series)}
            aria-pressed={!!series.pinned}
            title={series.pinned ? '대표 작업 해제' : '포트폴리오 상단에 대표 작업으로 고정 (작가당 1개)'}
            style={{
              flexShrink: 0, padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              border: `1px solid ${series.pinned ? COLORS.primary : COLORS.border}`,
              background: series.pinned ? COLORS.primaryLight : COLORS.surface,
              color: series.pinned ? COLORS.primary : COLORS.textMuted,
            }}
          >
            📌 {series.pinned ? '대표 작업' : '대표로'}
          </button>
        </div>
        {series.description && (
          <p style={{
            fontSize: 12, color: COLORS.textSecondary, lineHeight: 1.5, marginBottom: 8,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {series.description}
          </p>
        )}
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => onManagePhotos(series)}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: `1px solid ${COLORS.primary}`, background: COLORS.primaryLight,
              color: COLORS.primary, cursor: 'pointer',
            }}
          >
            사진 관리
          </button>
          <button
            onClick={() => onMagazineView(series)}
            style={{
              padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: `1px solid ${COLORS.border}`, background: COLORS.surfaceDim,
              color: COLORS.textSecondary, cursor: 'pointer',
            }}
          >
            ⊟ 매거진
          </button>
          {workPath && (
            <button
              onClick={() => window.open(workPath, '_blank', 'noopener')}
              title="포트폴리오에 공개되는 작업 노트 페이지를 새 탭에서 열기"
              style={{
                padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: `1px solid ${COLORS.border}`, background: COLORS.surfaceDim,
                color: COLORS.textSecondary, cursor: 'pointer',
              }}
            >
              ↗ 작업 페이지
            </button>
          )}
          <button
            onClick={() => onEdit(series)}
            style={{
              padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: `1px solid ${COLORS.border}`, background: COLORS.surface,
              color: COLORS.textSecondary, cursor: 'pointer',
            }}
          >
            수정
          </button>
          <button
            onClick={() => onDelete(series)}
            style={{
              padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: `1px solid ${COLORS.danger}`, background: '#fff0f0',
              color: COLORS.danger, cursor: 'pointer',
            }}
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}

/* 함께한 사람 역할 제안 — 자유 입력이 기본, 자주 쓰는 역할만 datalist로 */
const CREDIT_ROLES = ['헤어', '메이크업', '스타일링', '모델', '어시스턴트', '플로리스트', '장소', '기획', '보정'];
const CREDIT_INPUT = {
  minWidth: 0, padding: '9px 10px', borderRadius: 10, border: `1.5px solid ${COLORS.border}`,
  fontSize: 13, color: COLORS.text, outline: 'none',
};

/* ─── 시리즈 생성/수정 모달 ────────────────────── */
function SeriesModal({ series, onClose, onSave, memberId }) {
  const [form, setForm] = useState({
    title: series?.title || '',
    description: series?.description || '',
    // 작업 노트 — 빈 문자열은 서버에서 "비우기"로 처리된다
    shootType: series?.shootType || '',
    clientLabel: series?.clientLabel || '',
    shotOn: series?.shotOn || '',
    story: series?.story || '',
    // 함께한 사람 — 저장할 때 목록 전체를 보낸다(서버가 통째로 교체, 빈 줄은 무시)
    credits: (series?.credits || []).map(c => ({ role: c.role || '', name: c.name || '', profileName: c.profileName || '' })),
  });
  const [loading, setLoading] = useState(false);
  const shotOnInvalid = form.shotOn.trim() !== '' && !SHOT_ON_RE.test(form.shotOn.trim());
  // 한 칸만 채운 줄(역할만/이름만)은 서버가 400으로 거절하므로 미리 막는다
  const creditIncomplete = form.credits.some(c => (c.role.trim() || c.name.trim() || c.profileName.trim()) && !(c.role.trim() && c.name.trim()));
  const setCredit = (i, key, value) =>
    setForm(p => ({ ...p, credits: p.credits.map((c, j) => (j === i ? { ...c, [key]: value } : c)) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || shotOnInvalid || creditIncomplete) return;
    setLoading(true);
    try {
      if (series) {
        await seriesApi.update(series.id, form);
      } else {
        await seriesApi.create({ ...form, memberId });
      }
      onSave();
    } catch (err) {
      alert(err?.response?.data?.message || '저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: COLORS.surface, borderRadius: 20, padding: 28,
        width: '100%', maxWidth: 480, boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
        maxHeight: 'calc(100vh - 40px)', overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: COLORS.text, marginBottom: 20 }}>
          {series ? '시리즈 수정' : '새 시리즈 만들기'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 6 }}>
              시리즈 이름 <span style={{ color: COLORS.danger }}>*</span>
            </label>
            <input
              type="text" value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="예: 도시의 빛 2024"
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 10,
                border: `1.5px solid ${COLORS.border}`, fontSize: 14,
                color: COLORS.text, outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 6 }}>
              설명 (선택)
            </label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="시리즈에 대한 간단한 소개..."
              rows={3}
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 10,
                border: `1.5px solid ${COLORS.border}`, fontSize: 14,
                color: COLORS.text, outline: 'none', resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* ── 작업 노트 — 포트폴리오 작업 페이지(/portfolio/:profileName/work/:id)에 보인다 ── */}
          <fieldset style={{ border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: '14px 16px 4px', margin: '0 0 24px' }}>
            <legend style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, padding: '0 6px' }}>
              작업 노트 <span style={{ fontWeight: 500, color: COLORS.textMuted }}>· 모두 선택</span>
            </legend>
            <p style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.6, margin: '0 0 12px' }}>
              어떤 일이었는지 적어두면 포트폴리오에서 이 시리즈가 하나의 작업 사례로 소개되고,
              방문자가 같은 유형으로 바로 문의할 수 있어요.
            </p>

            <div style={{ marginBottom: 14 }}>
              <span id="series-shoot-type" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 6 }}>
                촬영 유형
              </span>
              <div role="radiogroup" aria-labelledby="series-shoot-type" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {SHOOT_TYPES.map(t => {
                  const active = form.shootType === t.value;
                  return (
                    <button
                      key={t.value} type="button" role="radio" aria-checked={active}
                      onClick={() => setForm(p => ({ ...p, shootType: active ? '' : t.value }))}
                      style={{
                        padding: '6px 12px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
                        border: `1.5px solid ${active ? COLORS.primary : COLORS.border}`,
                        background: active ? COLORS.primaryLight : COLORS.surface,
                        color: active ? COLORS.primary : COLORS.textSecondary,
                        fontWeight: active ? 700 : 500,
                      }}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
              <div style={{ flex: '2 1 180px' }}>
                <label htmlFor="series-client" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 6 }}>
                  클라이언트
                </label>
                <input
                  id="series-client" type="text" value={form.clientLabel} maxLength={100}
                  onChange={e => setForm(p => ({ ...p, clientLabel: e.target.value }))}
                  placeholder="예: OO 브랜드, 개인 의뢰"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${COLORS.border}`, fontSize: 14, color: COLORS.text, outline: 'none' }}
                />
              </div>
              <div style={{ flex: '1 1 110px' }}>
                <label htmlFor="series-shot-on" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 6 }}>
                  작업 시기
                </label>
                <input
                  id="series-shot-on" type="text" inputMode="numeric" value={form.shotOn} maxLength={7}
                  onChange={e => setForm(p => ({ ...p, shotOn: e.target.value }))}
                  placeholder="2026.05"
                  aria-invalid={shotOnInvalid}
                  aria-describedby={shotOnInvalid ? 'series-shot-on-error' : undefined}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${shotOnInvalid ? COLORS.danger : COLORS.border}`, fontSize: 14, color: COLORS.text, outline: 'none' }}
                />
                {shotOnInvalid && (
                  <span id="series-shot-on-error" role="alert" style={{ display: 'block', fontSize: 11, color: COLORS.danger, marginTop: 4 }}>
                    YYYY.MM 형식으로 입력해주세요
                  </span>
                )}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label htmlFor="series-story" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 6 }}>
                작업 이야기 <span style={{ fontWeight: 500, color: COLORS.textMuted }}>{form.story.length}/3000</span>
              </label>
              <textarea
                id="series-story" value={form.story} maxLength={3000}
                onChange={e => setForm(p => ({ ...p, story: e.target.value }))}
                placeholder="누구와, 무엇을, 왜 이렇게 찍었는지 짧게 남겨보세요."
                rows={4}
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 10,
                  border: `1.5px solid ${COLORS.border}`, fontSize: 14, lineHeight: 1.6,
                  color: COLORS.text, outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                }}
              />
            </div>
          </fieldset>

          {/* ── 함께한 사람 — 작업 페이지 "함께한 사람"에 보인다. @프로필명이 공개 회원이면 그 포트폴리오로 연결 ── */}
          <fieldset style={{ border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: '14px 16px 12px', margin: '0 0 24px' }}>
            <legend style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, padding: '0 6px' }}>
              함께한 사람 <span style={{ fontWeight: 500, color: COLORS.textMuted }}>· 선택</span>
            </legend>
            <datalist id="credit-roles">
              {CREDIT_ROLES.map(r => <option key={r} value={r} />)}
            </datalist>
            {form.credits.map((c, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '0.9fr 1fr 1fr auto', gap: 6, marginBottom: 8 }}>
                <input list="credit-roles" value={c.role} maxLength={20} placeholder="역할" aria-label={`${i + 1}번째 역할`}
                  onChange={e => setCredit(i, 'role', e.target.value)} style={CREDIT_INPUT} />
                <input value={c.name} maxLength={40} placeholder="이름" aria-label={`${i + 1}번째 이름`}
                  onChange={e => setCredit(i, 'name', e.target.value)} style={CREDIT_INPUT} />
                <input value={c.profileName} maxLength={31} placeholder="@프로필명 (선택)" aria-label={`${i + 1}번째 프로필명`}
                  onChange={e => setCredit(i, 'profileName', e.target.value)} style={CREDIT_INPUT} />
                <button type="button" onClick={() => setForm(p => ({ ...p, credits: p.credits.filter((_, j) => j !== i) }))}
                  aria-label={`${i + 1}번째 사람 삭제`}
                  style={{ border: 'none', background: 'transparent', color: COLORS.textMuted, cursor: 'pointer', fontSize: 14, padding: '0 6px' }}>✕</button>
              </div>
            ))}
            {creditIncomplete && (
              <div role="alert" style={{ fontSize: 11, color: COLORS.danger, marginBottom: 8 }}>역할과 이름을 모두 적어 주세요</div>
            )}
            {form.credits.length < 20 && (
              <button type="button" onClick={() => setForm(p => ({ ...p, credits: [...p.credits, { role: '', name: '', profileName: '' }] }))}
                style={{ border: `1px dashed ${COLORS.border}`, background: COLORS.surface, color: COLORS.textSecondary,
                  borderRadius: 10, padding: '8px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%' }}>
                + 함께한 사람 추가
              </button>
            )}
          </fieldset>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button" onClick={onClose}
              style={{
                flex: 1, padding: '12px', borderRadius: 10,
                border: `1.5px solid ${COLORS.border}`, background: '#fff',
                color: COLORS.textSecondary, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              취소
            </button>
            <button
              type="submit" disabled={loading || !form.title.trim() || shotOnInvalid || creditIncomplete}
              style={{
                flex: 2, padding: '12px', borderRadius: 10, border: 'none',
                background: loading ? '#a0a8e8' : COLORS.primary,
                color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? '저장 중...' : series ? '수정 완료' : '만들기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── 피커 사진 셀 (hover → 미리보기 버튼) ───────────── */
function PickerPhotoCell({ photo, selected, saving, onToggle, onPreview }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => !saving && onToggle(photo)}
      style={{
        position: 'relative', aspectRatio: '1',
        borderRadius: 10, overflow: 'hidden',
        cursor: saving ? 'not-allowed' : 'pointer',
        border: `2.5px solid ${selected ? COLORS.primary : 'transparent'}`,
        boxShadow: selected ? `0 0 0 2px ${COLORS.primaryLight}` : 'none',
        transition: 'all 0.15s',
      }}
    >
      <img
        src={photo.thumbnailUrl || photo.imageUrl}
        alt={photo.title}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      {selected && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(49, 130, 246, 0.30)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: COLORS.primary, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 800,
          }}>
            ✓
          </div>
        </div>
      )}
      {hovered && (
        <button
          onClick={e => { e.stopPropagation(); onPreview(photo); }}
          style={{
            position: 'absolute', top: 5, right: 5,
            background: 'rgba(0,0,0,0.72)', border: 'none',
            borderRadius: 6, padding: '3px 8px',
            fontSize: 11, color: '#fff', cursor: 'pointer',
            fontWeight: 600, zIndex: 2,
          }}
        >
          👁
        </button>
      )}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
        padding: '8px 6px 5px',
        fontSize: 10, color: '#fff', fontWeight: 600,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        pointerEvents: 'none',
      }}>
        {photo.title || '제목 없음'}
      </div>
    </div>
  );
}

/* ─── 시리즈 사진 관리 모달 ────────────────────── */
function PhotoPickerModal({ series, allPhotos, onClose, onSave, onPreview }) {
  const [seriesDetail, setSeriesDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    seriesApi.getOne(series.id)
      .then(setSeriesDetail)
      .catch(() => setSeriesDetail({ ...series, photos: [] }))
      .finally(() => setLoading(false));
  }, [series.id]);

  const inSeriesIds = new Set((seriesDetail?.photos || []).map(p => p.id));

  const handleToggle = async (photo) => {
    setSaving(true);
    try {
      if (inSeriesIds.has(photo.id)) {
        await seriesApi.removePhoto(series.id, photo.id);
        setSeriesDetail(prev => ({
          ...prev,
          photos: prev.photos.filter(p => p.id !== photo.id),
          photoCount: (prev.photoCount || 1) - 1,
        }));
      } else {
        await seriesApi.addPhoto(series.id, photo.id);
        setSeriesDetail(prev => ({
          ...prev,
          photos: [...(prev.photos || []), photo],
          photoCount: (prev.photoCount || 0) + 1,
        }));
      }
    } catch (err) {
      if (err?.response?.status === 409) {
        alert('이미 추가된 사진입니다.');
      } else {
        alert('오류가 발생했습니다.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1001,
      background: 'rgba(0,0,0,0.6)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: COLORS.surface, borderRadius: 20, padding: 24,
        width: '100%', maxWidth: 640, maxHeight: '80vh',
        display: 'flex', flexDirection: 'column', boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: COLORS.text }}>
              "{series.title}" 사진 관리
            </h2>
            <p style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
              클릭으로 시리즈에 추가/제거
            </p>
          </div>
          <button
            onClick={onSave}
            style={{
              padding: '8px 20px', borderRadius: 10, border: 'none',
              background: COLORS.primary, color: '#fff', fontSize: 14,
              fontWeight: 700, cursor: 'pointer',
            }}
          >
            완료
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: COLORS.textMuted }}>불러오는 중...</div>
        ) : (
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {allPhotos.length === 0 ? (
              <div style={{ textAlign: 'center', color: COLORS.textMuted, padding: '40px 0' }}>
                등록된 사진이 없습니다.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                {allPhotos.map(photo => (
                  <PickerPhotoCell
                    key={photo.id}
                    photo={photo}
                    selected={inSeriesIds.has(photo.id)}
                    saving={saving}
                    onToggle={handleToggle}
                    onPreview={onPreview}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── 메인 페이지 ────────────────────────── */
export default function SeriesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [seriesList, setSeriesList] = useState([]);
  const [allPhotos, setAllPhotos]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(null); // null | 'create' | { editing: series }
  const [photoPicker, setPhotoPicker] = useState(null); // null | series
  const [magazineTarget, setMagazineTarget] = useState(null); // { series, photos }
  const [previewPhoto, setPreviewPhoto] = useState(null);

  const handleMagazineView = useCallback(async (series) => {
    try {
      const detail = await seriesApi.getOne(series.id);
      const photos = Array.isArray(detail?.photos) ? detail.photos : [];
      setMagazineTarget({ series, photos: photos.length > 0 ? photos : allPhotos.slice(0, 10) });
    } catch {
      setMagazineTarget({ series, photos: allPhotos.slice(0, 10) });
    }
  }, [allPhotos]);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [sRes, pRes] = await Promise.all([
        seriesApi.getByMember(user.id),
        photoApi.getByMember(user.id),
      ]);
      setSeriesList(Array.isArray(sRes) ? sRes : sRes?.data ?? []);
      const pList = Array.isArray(pRes) ? pRes : pRes?.data ?? [];
      setAllPhotos(pList);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 대표 작업은 작가당 1개 — 서버가 다른 작업의 고정을 풀어주므로 화면도 같은 규칙으로 갱신
  const handleTogglePin = async (series) => {
    const next = !series.pinned;
    try {
      await seriesApi.update(series.id, { pinned: next });
      setSeriesList(prev => prev.map(s => ({ ...s, pinned: s.id === series.id ? next : (next ? false : s.pinned) })));
    } catch (e) {
      alert(e?.response?.data?.message || '대표 작업 설정에 실패했습니다.');
    }
  };

  const handleDelete = async (series) => {
    if (!window.confirm(`"${series.title}" 시리즈를 삭제하시겠습니까?\n사진은 삭제되지 않습니다.`)) return;
    try {
      await seriesApi.remove(series.id);
      setSeriesList(prev => prev.filter(s => s.id !== series.id));
    } catch {
      alert('삭제에 실패했습니다.');
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px 48px' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: COLORS.text, marginBottom: 4 }}>
            시리즈
          </h1>
          <p style={{ color: COLORS.textSecondary, fontSize: 14 }}>
            사진을 프로젝트/컴렝션으로 묶어 포트폴리오를 구성하세요
          </p>
        </div>
        <button
          onClick={() => setModal('create')}
          style={{
            padding: '10px 20px', borderRadius: 10, border: 'none',
            background: COLORS.primary, color: '#fff',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          + 새 시리즈
        </button>
      </div>

      {/* 포트폴리오 공유 링크 */}
      {user?.profileName && (
        <div style={{
          background: COLORS.primaryLight, borderRadius: 12, padding: '12px 16px',
          marginBottom: 24, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 12,
        }}>
          <span style={{ fontSize: 13, color: COLORS.primary, fontWeight: 600 }}>
            포트폴리오 공개 주소
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <code style={{ fontSize: 12, color: COLORS.primary, background: '#fff', padding: '3px 8px', borderRadius: 6 }}>
              /portfolio/{user.profileName}
            </code>
            <button
              onClick={() => navigate(`/portfolio/${user.profileName}`)}
              style={{
                padding: '5px 12px', borderRadius: 8, border: 'none',
                background: COLORS.primary, color: '#fff',
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}
            >
              보기
            </button>
          </div>
        </div>
      )}

      {/* 콘텐츠 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: COLORS.textMuted }}>
          불러오는 중...
        </div>
      ) : seriesList.length === 0 ? (
        <DotEmptyState
          icon="🗂️"
          title="시리즈가 없어요"
          description="여러 사진을 하나의 프로젝트로 묶어 포트폴리오를 구성해 보세요."
          actionLabel="첫 번째 시리즈 만들기"
          onAction={() => setModal('create')}
          theme="light"
          style={{ minHeight: '50vh' }}
        />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 20,
        }}>
          {seriesList.map(series => (
            <SeriesCard
              key={series.id}
              series={series}
              onEdit={(s) => setModal({ editing: s })}
              onDelete={handleDelete}
              onManagePhotos={(s) => setPhotoPicker(s)}
              onMagazineView={handleMagazineView}
              workPath={user?.profileName ? `/portfolio/${user.profileName}/work/${series.id}` : null}
              onTogglePin={handleTogglePin}
            />
          ))}
        </div>
      )}

      {/* 시리즈 생성/수정 모달 */}
      {modal && (
        <SeriesModal
          series={modal === 'create' ? null : modal.editing}
          memberId={user?.id}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); fetchData(); }}
        />
      )}

      {/* 사진 선택 모달 */}
      {photoPicker && (
        <PhotoPickerModal
          series={photoPicker}
          allPhotos={allPhotos}
          onClose={() => setPhotoPicker(null)}
          onSave={() => { setPhotoPicker(null); fetchData(); }}
          onPreview={setPreviewPhoto}
        />
      )}

      {/* 사진 미리보기 모달 */}
      {previewPhoto && (
        <PhotoModal
          photo={previewPhoto}
          onClose={() => setPreviewPhoto(null)}
          onUpdated={updated => {
            setAllPhotos(ps => ps.map(p => p.id === updated.id ? updated : p));
            setPreviewPhoto(updated);
          }}
        />
      )}

      {/* 매거진 뷰어 */}
      {magazineTarget && magazineTarget.photos.length > 0 && (
        <MagazineViewer
          photos={magazineTarget.photos}
          title={magazineTarget.series.title}
          onClose={() => setMagazineTarget(null)}
        />
      )}
    </div>
  );
}
