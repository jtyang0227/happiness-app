import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { photoApi } from '../services/api';
import GridSpanPicker from '../components/common/GridSpanPicker';
import { MOOD_COLORS, COLORS } from '../constants/colors';

const MOOD_OPTIONS = Object.entries(MOOD_COLORS).map(([key, val]) => ({
  key,
  label: val.label,
  dot: val.dot,
  bg: val.bg,
}));

const INITIAL_FORM = {
  title: '',
  imageUrl: '',
  description: '',
  gridColSpan: 6,
  colorMood: '',
};

export default function PhotoFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      setFetching(true);
      try {
        const all = await photoApi.getAll();
        const found = (Array.isArray(all) ? all : []).find(p => String(p.id) === String(id));
        if (found) {
          setForm({
            title: found.title || '',
            imageUrl: found.imageUrl || '',
            description: found.description || '',
            gridColSpan: found.gridColSpan || 6,
            colorMood: found.colorMood || '',
          });
        }
      } catch {
        setApiError('사진 정보를 불러오는데 실패했습니다.');
      } finally {
        setFetching(false);
      }
    })();
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
    setApiError('');
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = '제목을 입력해주세요.';
    if (!form.imageUrl.trim()) errs.imageUrl = '이미지 URL을 입력해주세요.';
    else if (!/^https?:\/\/.+/.test(form.imageUrl.trim())) errs.imageUrl = '올바른 URL을 입력해주세요.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setApiError('');
    try {
      const payload = {
        ...form,
        colorMood: form.colorMood || null,
      };
      if (isEdit) {
        await photoApi.update(id, payload);
      } else {
        await photoApi.create(payload);
      }
      navigate('/');
    } catch (err) {
      setApiError(err.message || '저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (hasError) => ({
    width: '100%',
    padding: '12px 16px',
    borderRadius: 10,
    border: `1.5px solid ${hasError ? COLORS.danger : COLORS.border}`,
    background: COLORS.white,
    color: COLORS.text,
    fontSize: 14,
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  });

  if (fetching) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ color: COLORS.textSecondary }}>불러오는 중...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 20px' }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: COLORS.textSecondary,
          fontSize: 14,
          fontWeight: 600,
          padding: '0 0 16px 0',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        ← 뒤로가기
      </button>

      <div
        style={{
          background: COLORS.white,
          borderRadius: 20,
          padding: 32,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        }}
      >
        <h2 style={{ fontSize: 22, fontWeight: 800, color: COLORS.text, marginBottom: 24 }}>
          {isEdit ? '사진 수정' : '사진 등록'}
        </h2>

        {apiError && (
          <div
            style={{
              background: '#fff0f0',
              border: `1px solid #ffcccc`,
              borderRadius: 8,
              padding: '10px 14px',
              color: COLORS.danger,
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Title */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 6 }}>
              제목 <span style={{ color: COLORS.danger }}>*</span>
            </label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="사진 제목"
              style={inputStyle(!!errors.title)}
            />
            {errors.title && <div style={{ color: COLORS.danger, fontSize: 12, marginTop: 4 }}>{errors.title}</div>}
          </div>

          {/* Image URL */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 6 }}>
              이미지 URL <span style={{ color: COLORS.danger }}>*</span>
            </label>
            <input
              type="url"
              name="imageUrl"
              value={form.imageUrl}
              onChange={handleChange}
              placeholder="https://..."
              style={inputStyle(!!errors.imageUrl)}
            />
            {errors.imageUrl && <div style={{ color: COLORS.danger, fontSize: 12, marginTop: 4 }}>{errors.imageUrl}</div>}
            {form.imageUrl && /^https?:\/\/.+/.test(form.imageUrl) && (
              <div style={{ marginTop: 10, borderRadius: 10, overflow: 'hidden', maxHeight: 180 }}>
                <img
                  src={form.imageUrl}
                  alt="미리보기"
                  style={{ width: '100%', objectFit: 'cover', maxHeight: 180 }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 6 }}>
              설명
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="사진에 대한 설명을 입력하세요..."
              rows={4}
              style={{ ...inputStyle(false), resize: 'vertical' }}
            />
          </div>

          {/* Color Mood */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 8 }}>
              색채 분위기
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, colorMood: '' }))}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  border: `1.5px solid ${!form.colorMood ? COLORS.primary : COLORS.border}`,
                  background: !form.colorMood ? '#eef0ff' : '#fff',
                  color: !form.colorMood ? COLORS.primary : COLORS.textSecondary,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                없음
              </button>
              {MOOD_OPTIONS.map(mood => {
                const selected = form.colorMood === mood.key;
                return (
                  <button
                    type="button"
                    key={mood.key}
                    onClick={() => setForm(prev => ({ ...prev, colorMood: mood.key }))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '6px 14px',
                      borderRadius: 20,
                      border: `1.5px solid ${selected ? mood.dot : COLORS.border}`,
                      background: selected ? mood.bg : '#fff',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                      color: COLORS.text,
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: mood.dot, display: 'inline-block' }} />
                    {mood.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid Span Picker */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 8 }}>
              갤러리 너비
            </label>
            <GridSpanPicker
              value={form.gridColSpan}
              onChange={val => setForm(prev => ({ ...prev, gridColSpan: val }))}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{
                flex: 1,
                padding: '13px',
                borderRadius: 10,
                border: `1.5px solid ${COLORS.border}`,
                background: '#fff',
                color: COLORS.textSecondary,
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 2,
                padding: '13px',
                borderRadius: 10,
                border: 'none',
                background: loading ? '#a0a8e8' : COLORS.primary,
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {loading ? '저장 중...' : isEdit ? '수정 완료' : '등록하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
