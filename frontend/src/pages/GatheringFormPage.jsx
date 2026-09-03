import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { COLORS } from '../constants/colors';
import gatheringApi from '../services/gatheringApi';

/* ── 유틸: ISO LocalDateTime ↔ datetime-local input ───────
 * datetime-local: "2026-09-20T18:00"
 * 백엔드: "2026-09-20T18:00:00"
 */
function toInputValue(iso) {
  if (!iso) return '';
  // 초 단위 이하 제거
  return iso.slice(0, 16);
}
function toApiValue(inputVal) {
  if (!inputVal) return '';
  return inputVal + ':00';
}

/* ── 폼 필드 공통 스타일 ─────────────────────────────────── */
function Field({ label, required, children, error }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.textSecondary }}>
        {label}{required && <span style={{ color: COLORS.danger, marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && <span style={{ fontSize: 12, color: COLORS.danger }}>{error}</span>}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 12px',
  border: `1px solid ${COLORS.border}`, borderRadius: 10,
  fontSize: 14, color: COLORS.text,
  background: COLORS.surface,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};

function TextInput({ value, onChange, placeholder, onFocus, onBlur }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      onFocus={onFocus}
      onBlur={onBlur}
      style={inputStyle}
    />
  );
}

function TextareaInput({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
    />
  );
}

function DateTimeInput({ value, onChange }) {
  return (
    <input
      type="datetime-local"
      value={value}
      onChange={e => onChange(e.target.value)}
      style={inputStyle}
    />
  );
}

function NumberInput({ value, onChange, min = 1, max = 9999 }) {
  return (
    <input
      type="number"
      value={value}
      onChange={e => onChange(e.target.value)}
      min={min}
      max={max}
      style={{ ...inputStyle, maxWidth: 160 }}
    />
  );
}

/* ── GatheringFormPage ─────────────────────────────────── */
export default function GatheringFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');

  // 폼 상태
  const [form, setForm] = useState({
    title: '',
    description: '',
    detailDescription: '',
    location: '',
    locationIntro: '',
    startDateTime: '',
    endDateTime: '',
    recruitmentEndDateTime: '',
    maxParticipants: '8',
    fee: '',
    shootTheme: '',
    preparationNote: '',
    thumbnailUrl: '',
    referenceImageUrl: '',
    hashtags: '',
  });

  // 수정 시 기존 데이터 로드
  useEffect(() => {
    if (!isEdit) return;
    gatheringApi.getDetail(id)
      .then(data => {
        const g = data.data || data;
        setForm({
          title: g.title || '',
          description: g.description || '',
          detailDescription: g.detailDescription || '',
          location: g.location || '',
          locationIntro: g.locationIntro || '',
          startDateTime: toInputValue(g.startDateTime),
          endDateTime: toInputValue(g.endDateTime),
          recruitmentEndDateTime: toInputValue(g.recruitmentEndDateTime),
          maxParticipants: String(g.maxParticipants || '8'),
          fee: g.fee || '',
          shootTheme: g.shootTheme || '',
          preparationNote: g.preparationNote || '',
          thumbnailUrl: g.thumbnailUrl || '',
          referenceImageUrl: g.referenceImageUrl || '',
          hashtags: g.hashtags || '',
        });
      })
      .catch(() => setApiError('모임 정보를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const setField = (key) => (val) => setForm(prev => ({ ...prev, [key]: val }));

  /* ── 유효성 검사 ──────────────────────────────────── */
  function validate() {
    const errs = {};
    if (!form.title.trim()) errs.title = '모임 제목을 입력해주세요.';
    if (!form.location.trim()) errs.location = '장소를 입력해주세요.';
    const maxP = parseInt(form.maxParticipants, 10);
    if (!form.maxParticipants || isNaN(maxP) || maxP < 1) {
      errs.maxParticipants = '최대 참여 인원은 1명 이상이어야 합니다.';
    }
    if (!form.startDateTime) errs.startDateTime = '시작 일시를 입력해주세요.';
    if (!form.endDateTime) errs.endDateTime = '종료 일시를 입력해주세요.';
    if (!form.recruitmentEndDateTime) errs.recruitmentEndDateTime = '모집 마감 일시를 입력해주세요.';

    if (form.startDateTime && form.endDateTime) {
      if (new Date(form.startDateTime) >= new Date(form.endDateTime)) {
        errs.endDateTime = '종료 일시는 시작 일시보다 늦어야 합니다.';
      }
    }
    if (form.recruitmentEndDateTime && form.startDateTime) {
      if (new Date(form.recruitmentEndDateTime) >= new Date(form.startDateTime)) {
        errs.recruitmentEndDateTime = '모집 마감 일시는 시작 일시보다 앞서야 합니다.';
      }
    }
    return errs;
  }

  /* ── 제출 ─────────────────────────────────────────── */
  async function handleSubmit(e) {
    e.preventDefault();
    setApiError('');
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      detailDescription: form.detailDescription.trim() || undefined,
      location: form.location.trim(),
      locationIntro: form.locationIntro.trim() || undefined,
      startDateTime: toApiValue(form.startDateTime),
      endDateTime: toApiValue(form.endDateTime),
      recruitmentEndDateTime: toApiValue(form.recruitmentEndDateTime),
      maxParticipants: parseInt(form.maxParticipants, 10),
      fee: form.fee.trim() || undefined,
      shootTheme: form.shootTheme.trim() || undefined,
      preparationNote: form.preparationNote.trim() || undefined,
      thumbnailUrl: form.thumbnailUrl.trim() || undefined,
      referenceImageUrl: form.referenceImageUrl.trim() || undefined,
      hashtags: form.hashtags.trim() || undefined,
    };

    setSaving(true);
    try {
      let result;
      if (isEdit) {
        result = await gatheringApi.update(id, payload);
      } else {
        result = await gatheringApi.create(payload);
      }
      const newId = result?.id || result?.data?.id || id;
      navigate(newId ? `/gatherings/${newId}` : '/gatherings');
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || '저장 중 오류가 발생했습니다.';
      setApiError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: COLORS.textMuted, fontSize: 14 }}>불러오는 중...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, paddingBottom: 80 }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 20px' }}>

        {/* 뒤로가기 + 제목 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 20, color: COLORS.textSecondary, padding: 4, lineHeight: 1,
            }}
            aria-label="뒤로가기"
          >
            ←
          </button>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: COLORS.text }}>
            {isEdit ? '모임 수정' : '새 모임 만들기'}
          </h1>
        </div>

        {/* API 에러 */}
        {apiError && (
          <div style={{
            padding: '12px 16px', borderRadius: 10,
            background: COLORS.dangerTonal, color: COLORS.danger,
            fontSize: 14, marginBottom: 20,
          }}>
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* 기본 정보 섹션 */}
            <SectionCard title="기본 정보">
              <Field label="모임 제목" required error={errors.title}>
                <TextInput value={form.title} onChange={setField('title')} placeholder="모임 제목을 입력하세요" />
              </Field>
              <Field label="모임 소개">
                <TextareaInput value={form.description} onChange={setField('description')} placeholder="모임을 소개해주세요" rows={3} />
              </Field>
              <Field label="모임 상세 설명">
                <TextareaInput value={form.detailDescription} onChange={setField('detailDescription')} placeholder="자세한 진행 방식, 준비물 등을 알려주세요" rows={4} />
              </Field>
              <Field label="촬영 테마">
                <TextInput value={form.shootTheme} onChange={setField('shootTheme')} placeholder="예: 도심 야경, 자연 인물, 패션" />
              </Field>
            </SectionCard>

            {/* 장소 섹션 */}
            <SectionCard title="장소">
              <Field label="장소" required error={errors.location}>
                <TextInput value={form.location} onChange={setField('location')} placeholder="예: 서울 홍대 걷고 싶은 거리" />
              </Field>
              <Field label="장소 소개">
                <TextareaInput value={form.locationIntro} onChange={setField('locationIntro')} placeholder="장소의 특징이나 접근 방법을 알려주세요" rows={2} />
              </Field>
            </SectionCard>

            {/* 일정 섹션 */}
            <SectionCard title="일정">
              <Field label="시작 일시" required error={errors.startDateTime}>
                <DateTimeInput value={form.startDateTime} onChange={setField('startDateTime')} />
              </Field>
              <Field label="종료 일시" required error={errors.endDateTime}>
                <DateTimeInput value={form.endDateTime} onChange={setField('endDateTime')} />
              </Field>
              <Field label="모집 마감 일시" required error={errors.recruitmentEndDateTime}>
                <DateTimeInput value={form.recruitmentEndDateTime} onChange={setField('recruitmentEndDateTime')} />
                <span style={{ fontSize: 12, color: COLORS.textMuted }}>시작 일시 이전이어야 합니다</span>
              </Field>
            </SectionCard>

            {/* 참여 정보 섹션 */}
            <SectionCard title="참여 정보">
              <Field label="최대 참여 인원" required error={errors.maxParticipants}>
                <NumberInput value={form.maxParticipants} onChange={setField('maxParticipants')} min={1} max={500} />
              </Field>
              <Field label="참가비">
                <TextInput value={form.fee} onChange={setField('fee')} placeholder="예: 무료, 5,000원" />
              </Field>
              <Field label="준비 안내">
                <TextareaInput value={form.preparationNote} onChange={setField('preparationNote')} placeholder="참가자가 준비해야 할 사항을 알려주세요" rows={2} />
              </Field>
            </SectionCard>

            {/* 미디어 섹션 */}
            <SectionCard title="이미지">
              <Field label="썸네일 이미지 URL">
                <TextInput value={form.thumbnailUrl} onChange={setField('thumbnailUrl')} placeholder="https://..." />
              </Field>
              <Field label="참고 이미지 URL">
                <TextInput value={form.referenceImageUrl} onChange={setField('referenceImageUrl')} placeholder="https://..." />
              </Field>
              <Field label="해시태그">
                <TextInput value={form.hashtags} onChange={setField('hashtags')} placeholder="#서울촬영 #인물사진 #주말모임" />
              </Field>
            </SectionCard>

            {/* 저장 버튼 */}
            <SubmitButton saving={saving} isEdit={isEdit} />
          </div>
        </form>
      </div>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div style={{
      background: COLORS.surface,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 16, padding: '20px 20px 16px',
    }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: COLORS.textSecondary, letterSpacing: '0.02em' }}>
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {children}
      </div>
    </div>
  );
}

function SubmitButton({ saving, isEdit }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="submit"
      disabled={saving}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', padding: '14px',
        background: saving ? COLORS.textHint : (hovered ? COLORS.primaryDark : COLORS.primary),
        color: '#fff', border: 'none', borderRadius: 12,
        fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: saving ? 'none' : (hovered ? '0 4px 14px rgba(49,130,246,0.30)' : '0 2px 8px rgba(49,130,246,0.18)'),
      }}
    >
      {saving ? '저장 중...' : (isEdit ? '수정 완료' : '모임 만들기')}
    </button>
  );
}
