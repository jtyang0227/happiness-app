import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { seriesApi, photoApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, MOOD_COLORS } from '../constants/colors';

/* ─── 시리즈 카드 ─────────────────────────────────────────── */
function SeriesCard({ series, onEdit, onDelete, onManagePhotos }) {
  return (
    <div style={{
      background: COLORS.surface, borderRadius: 16,
      overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
    }}>
      {/* 커버 */}
      <div style={{
        position: 'relative', aspectRatio: '16/9',
        background: COLORS.border, overflow: 'hidden',
        cursor: 'pointer',
      }} onClick={() => onManagePhotos(series)}>
        {series.coverImageUrl ? (
          <img
            src={series.coverImageUrl} alt={series.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `linear-gradient(135deg, ${COLORS.primaryLight}, ${COLORS.border})`,
            fontSize: 32, color: COLORS.primary,
          }}>
            ✦
          </div>
        )}
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
        <h3 style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>
          {series.title}
        </h3>
        {series.description && (
          <p style={{
            fontSize: 12, color: COLORS.textSecondary, lineHeight: 1.5, marginBottom: 8,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {series.description}
          </p>
        )}
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
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

/* ─── 시리즈 생성/수정 모달 ──────────────────────────────── */
function SeriesModal({ series, onClose, onSave, memberId }) {
  const [form, setForm] = useState({
    title: series?.title || '',
    description: series?.description || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      if (series) {
        await seriesApi.update(series.id, form);
      } else {
        await seriesApi.create({ ...form, memberId });
      }
      onSave();
    } catch {
      alert('저장에 실패했습니다.');
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
        width: '100%', maxWidth: 440, boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
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

          <div style={{ marginBottom: 24 }}>
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
              type="submit" disabled={loading || !form.title.trim()}
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

/* ─── 시리즈 사진 관리 모달 ──────────────────────────────── */
function PhotoPickerModal({ series, allPhotos, onClose, onSave }) {
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
                {allPhotos.map(photo => {
                  const selected = inSeriesIds.has(photo.id);
                  return (
                    <div
                      key={photo.id}
                      onClick={() => !saving && handleToggle(photo)}
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
                          background: 'rgba(91,110,245,0.3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
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
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                        padding: '8px 6px 5px',
                        fontSize: 10, color: '#fff', fontWeight: 600,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {photo.title || '제목 없음'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── 메인 페이지 ─────────────────────────────────────────── */
export default function SeriesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [seriesList, setSeriesList] = useState([]);
  const [allPhotos, setAllPhotos]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(null); // null | 'create' | { editing: series }
  const [photoPicker, setPhotoPicker] = useState(null); // null | series

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
            사진을 프로젝트/컬렉션으로 묶어 포트폴리오를 구성하세요
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
        <div style={{
          textAlign: 'center', padding: '80px 0',
          border: `2px dashed ${COLORS.border}`, borderRadius: 20,
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✦</div>
          <p style={{ color: COLORS.textSecondary, fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
            아직 시리즈가 없습니다
          </p>
          <p style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 20 }}>
            여러 사진을 하나의 프로젝트로 묶어 포트폴리오를 구성해 보세요
          </p>
          <button
            onClick={() => setModal('create')}
            style={{
              padding: '10px 24px', borderRadius: 10, border: 'none',
              background: COLORS.primary, color: '#fff',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            첫 번째 시리즈 만들기
          </button>
        </div>
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
        />
      )}
    </div>
  );
}
