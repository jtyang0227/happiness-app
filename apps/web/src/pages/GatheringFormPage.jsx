import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { COLORS } from '../constants/colors';
import gatheringApi from '../services/gatheringApi';
import { spotApi } from '../services/spotApi';
import { SpotPickerSheet } from '../components/spot/PhotoSpotSection';

/* 태블릿(768px) 이상에서 좌: 기본 정보 / 우: 장소·일정·참여 정보·이미지
 * 2컬럼으로 전환 (DESIGN_PROMPT_tablet-layouts.md C-4). 모바일은 기존
 * 단일 컬럼 순서(기본정보→장소→일정→참여정보→이미지) 그대로 유지. */
const GFORM_LAYOUT_CSS = `
  .gform-container { max-width: 640px; }
  .gform-columns { display: flex; flex-direction: column; gap: 20px; }
  .gform-left, .gform-right { display: flex; flex-direction: column; gap: 20px; }
  @media (min-width: 768px) {
    .gform-container { max-width: 900px; }
    .gform-columns { flex-direction: row; align-items: flex-start; }
    .gform-left, .gform-right { flex: 1; min-width: 0; }
  }
  .gform-chip-btn { height: 34px; min-width: 34px; padding: 0 12px; border-radius: 999px; border: 1px solid ${COLORS.border};
    background: ${COLORS.surface}; color: ${COLORS.textSecondary}; font-size: 13px; font-weight: 600; cursor: pointer; }
  .gform-chip-btn:hover { background: ${COLORS.surfaceDim}; }
  .gform-chip-btn:focus-visible { outline: 2px solid ${COLORS.primary}; outline-offset: 2px; }
`;

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
  const [searchParams] = useSearchParams();
  const routerLocation = useLocation();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(routerLocation.state?.pollError || '');

  // 출사 스팟 + 배지 + 장소 투표 (ANALYSIS_chulsa P1)
  const [spot, setSpot] = useState(null);             // { id, name, region }
  const [picker, setPicker] = useState(null);         // 'spot' | 'poll' | null
  const [beginnerFriendly, setBeginnerFriendly] = useState(false);
  const [portraitConsentRule, setPortraitConsentRule] = useState(true);
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollOptions, setPollOptions] = useState([{ label: '' }, { label: '' }]);   // [{ label, spotId? }]
  const [pollLocked, setPollLocked] = useState(false);  // 이미 표가 있으면 후보를 바꿀 수 없다
  const [hadPoll, setHadPoll] = useState(false);
  const initialPollRef = useRef('[]');   // 바뀌었을 때만 저장(마감된 모임 수정 시 불필요한 400 방지)

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
        setBeginnerFriendly(!!g.beginnerFriendly);
        setPortraitConsentRule(!!g.portraitConsentRule);
        if (g.spotId) setSpot({ id: g.spotId, name: g.spotName, region: g.spotRegion });
        return gatheringApi.getPlacePoll(id).then(poll => {
          if (poll?.options?.length) {
            setPollEnabled(true); setHadPoll(true);
            setPollOptions(poll.options.map(o => ({ label: o.label, spotId: o.spotId })));
            initialPollRef.current = JSON.stringify(poll.options.map(o => ({ label: o.label, spotId: o.spotId || null })));
            setPollLocked(poll.totalVotes > 0);
          }
        }).catch(() => {});
      })
      .catch(() => setApiError('모임 정보를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const setField = (key) => (val) => setForm(prev => ({ ...prev, [key]: val }));

  // 스팟 상세의 "이 스팟으로 모임 만들기"(?spotId=)로 들어오면 스팟·장소를 미리 채운다
  useEffect(() => {
    const sid = searchParams.get('spotId');
    if (isEdit || !sid) return;
    spotApi.get(sid).then(sp => {
      setSpot({ id: sp.id, name: sp.name, region: sp.region });
      setForm(prev => ({ ...prev, location: prev.location || sp.name, locationIntro: prev.locationIntro || sp.tips || '' }));
    }).catch(() => {});
  }, [isEdit, searchParams]);

  const pickSpot = (sp) => {
    setPicker(null);
    if (picker === 'poll') {
      setPollOptions(prev => {
        const empty = prev.findIndex(o => !o.label.trim() && !o.spotId);
        const row = { label: sp.name, spotId: sp.id };
        if (empty >= 0) return prev.map((o, i) => (i === empty ? row : o));
        return prev.length < 5 ? [...prev, row] : prev;
      });
      return;
    }
    setSpot({ id: sp.id, name: sp.name, region: sp.region });
    setForm(prev => ({ ...prev, location: prev.location.trim() ? prev.location : sp.name }));
  };

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
    if (pollEnabled && !pollLocked) {
      const filled = pollOptions.filter(o => o.label.trim() || o.spotId);
      if (filled.length < 2 || filled.length > 5) errs.poll = '장소 후보는 2~5개를 채워 주세요.';
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
      spotId: spot ? spot.id : (isEdit ? 0 : undefined),   // 수정에서 0 = 스팟 연결 해제
      beginnerFriendly,
      portraitConsentRule,
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
      // 장소 투표는 모임 저장 뒤 따로 저장한다 — 실패하면 수정 화면에서 다시 시도할 수 있게 남긴다
      const opts = pollEnabled
        ? pollOptions.filter(o => o.label.trim() || o.spotId).map(o => ({ label: o.label.trim(), spotId: o.spotId || null }))
        : [];
      if (newId && !pollLocked && (pollEnabled || hadPoll) && JSON.stringify(opts) !== initialPollRef.current) {
        try {
          await gatheringApi.setPlacePoll(newId, opts);
        } catch (pollErr) {
          const msg = `모임은 저장됐지만 장소 투표를 저장하지 못했어요: ${pollErr?.response?.data?.message || '잠시 후 다시 시도해 주세요.'}`;
          if (isEdit) { setApiError(msg); return; }
          navigate(`/gatherings/${newId}/edit`, { replace: true, state: { pollError: msg } });
          return;
        }
      }
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
      <style>{GFORM_LAYOUT_CSS}</style>
      <div className="gform-container" style={{ margin: '0 auto', padding: '24px 20px' }}>

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
          <div className="gform-columns">

            {/* 좌: 기본 정보 */}
            <div className="gform-left">
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
            </div>

            {/* 우: 장소·일정·참여 정보·이미지 */}
            <div className="gform-right">
              <SectionCard title="장소">
                <Field label="장소" required error={errors.location}>
                  <TextInput value={form.location} onChange={setField('location')} placeholder="예: 서울 홍대 걷고 싶은 거리" />
                </Field>
                <Field label="장소 소개">
                  <TextareaInput value={form.locationIntro} onChange={setField('locationIntro')} placeholder="장소의 특징이나 접근 방법을 알려주세요" rows={2} />
                </Field>
                <Field label="출사 스팟 (선택)">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {spot ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, background: COLORS.primaryLight, color: COLORS.primaryDark, fontSize: 14, fontWeight: 600 }}>
                        📍 {spot.name}{spot.region ? ` · ${spot.region}` : ''}
                      </span>
                    ) : (
                      <span style={{ fontSize: 13, color: COLORS.textMuted }}>스팟을 고르면 지도와 길찾기가 모임에 함께 보여요</span>
                    )}
                    <button type="button" className="gform-chip-btn" onClick={() => setPicker('spot')}>{spot ? '바꾸기' : '스팟 고르기'}</button>
                    {spot && <button type="button" className="gform-chip-btn" onClick={() => setSpot(null)}>빼기</button>}
                  </div>
                </Field>
                <div style={{ borderTop: `1px solid ${COLORS.borderLight}`, paddingTop: 14 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: COLORS.text, cursor: pollLocked ? 'default' : 'pointer' }}>
                    <input type="checkbox" checked={pollEnabled} disabled={pollLocked} onChange={e => setPollEnabled(e.target.checked)} style={{ width: 18, height: 18 }} />
                    장소 투표 열기
                  </label>
                  <p style={{ margin: '4px 0 0 26px', fontSize: 12, color: COLORS.textMuted }}>
                    참여 신청한 사람이 후보 중에서 골라요. 모집이 마감되면 표를 가장 많이 받은 곳이 장소가 돼요.
                  </p>
                  {pollEnabled && (
                    <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                      {pollLocked && <div role="status" style={{ fontSize: 13, color: COLORS.textSecondary }}>이미 투표가 시작돼 후보를 바꿀 수 없어요.</div>}
                      {pollOptions.map((o, i) => (
                        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span aria-hidden="true" style={{ width: 20, fontSize: 13, color: COLORS.textMuted }}>{o.spotId ? '📍' : `${i + 1}.`}</span>
                          <input aria-label={`장소 후보 ${i + 1}`} value={o.label} disabled={pollLocked} maxLength={100}
                            onChange={e => setPollOptions(prev => prev.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                            placeholder="예: 응봉산 팔각정" style={{ ...inputStyle, flex: 1 }} />
                          {!pollLocked && pollOptions.length > 2 && (
                            <button type="button" className="gform-chip-btn" aria-label={`후보 ${i + 1} 빼기`}
                              onClick={() => setPollOptions(prev => prev.filter((_, j) => j !== i))}>✕</button>
                          )}
                        </div>
                      ))}
                      {!pollLocked && pollOptions.length < 5 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button type="button" className="gform-chip-btn" onClick={() => setPollOptions(prev => [...prev, { label: '' }])}>＋ 후보 추가</button>
                          <button type="button" className="gform-chip-btn" onClick={() => setPicker('poll')}>📍 스팟에서 추가</button>
                        </div>
                      )}
                      {errors.poll && <span role="alert" style={{ fontSize: 12, color: COLORS.danger }}>{errors.poll}</span>}
                    </div>
                  )}
                </div>
              </SectionCard>

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
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: COLORS.text, cursor: 'pointer' }}>
                  <input type="checkbox" checked={beginnerFriendly} onChange={e => setBeginnerFriendly(e.target.checked)} style={{ width: 18, height: 18 }} />
                  🌱 초보 환영
                </label>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14, color: COLORS.text, cursor: 'pointer' }}>
                  <input type="checkbox" checked={portraitConsentRule} onChange={e => setPortraitConsentRule(e.target.checked)} style={{ width: 18, height: 18, marginTop: 1 }} />
                  <span>🤝 인물 촬영 동의 안내 표시<br /><span style={{ fontSize: 12, color: COLORS.textMuted }}>"사람을 찍을 땐 먼저 동의를 받아 주세요" 문구가 모임에 고정돼요</span></span>
                </label>
              </SectionCard>

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
            </div>
          </div>

          {picker && <SpotPickerSheet onClose={() => setPicker(null)} onPick={pickSpot} />}

          {/* 저장 버튼 */}
          <div style={{ marginTop: 20 }}>
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
