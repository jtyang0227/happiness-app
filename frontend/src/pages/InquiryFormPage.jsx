import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { inquiryApi } from '../services/api';
import { COLORS } from '../constants/colors';

const SHOOT_TYPES = [
  { value: '결혼식', label: '결혼식' },
  { value: '제품촬영', label: '제품 촬영' },
  { value: '인물/프로필', label: '인물 / 프로필' },
  { value: '풍경', label: '풍경 / 여행' },
  { value: '행사/이벤트', label: '행사 / 이벤트' },
  { value: '가족', label: '가족' },
  { value: '기타', label: '기타' },
];

const INITIAL = {
  senderName: '', senderEmail: '', shootType: '',
  shootDate: '', budget: '', message: '',
};

export default function InquiryFormPage() {
  const { profileName } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // memberId는 쿼리 파라미터로 전달
  const memberId = new URLSearchParams(window.location.search).get('memberId');

  const validate = () => {
    const e = {};
    if (!form.senderName.trim()) e.senderName = '이름을 입력해주세요.';
    if (!form.senderEmail.trim()) e.senderEmail = '이메일을 입력해주세요.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.senderEmail)) e.senderEmail = '이메일 형식이 올바르지 않습니다.';
    if (!form.message.trim()) e.message = '메시지를 입력해주세요.';
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    setErrors(p => ({ ...p, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await inquiryApi.send({ ...form, receiverMemberId: memberId ? Number(memberId) : null });
      setDone(true);
    } catch (err) {
      setErrors({ _api: err?.response?.data?.message || '전송에 실패했습니다. 다시 시도해주세요.' });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (hasError) => ({
    width: '100%', padding: '11px 14px', borderRadius: 10,
    border: `1.5px solid ${hasError ? COLORS.danger : COLORS.border}`,
    fontSize: 14, color: COLORS.text, outline: 'none',
    background: COLORS.surface, fontFamily: 'inherit',
  });

  if (done) {
    return (
      <div style={{
        minHeight: '100vh', background: COLORS.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16, padding: 24,
      }}>
        <div style={{ fontSize: 48 }}>✉️</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: COLORS.text }}>문의가 접수되었습니다!</h2>
        <p style={{ color: COLORS.textSecondary, fontSize: 14, textAlign: 'center' }}>
          작가님이 확인 후 <strong>{form.senderEmail}</strong>로 연락드릴 예정입니다.
        </p>
        <button
          onClick={() => navigate(-1)}
          style={{
            padding: '10px 24px', borderRadius: 10, border: 'none',
            background: COLORS.primary, color: '#fff', fontWeight: 700, cursor: 'pointer',
          }}
        >
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, padding: '32px 20px 60px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        {/* 헤더 */}
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: COLORS.textSecondary, fontSize: 14, fontWeight: 600,
            padding: '0 0 20px', display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          ← 포트폴리오로
        </button>

        <div style={{ background: COLORS.surface, borderRadius: 20, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: COLORS.text, marginBottom: 6 }}>
              촬영 문의하기
            </h1>
            <p style={{ color: COLORS.textSecondary, fontSize: 14 }}>
              {profileName ? `@${profileName}` : '작가'}님께 촬영 문의를 보내세요
            </p>
          </div>

          {errors._api && (
            <div style={{
              background: '#fff0f0', border: `1px solid ${COLORS.danger}`,
              borderRadius: 8, padding: '10px 14px', color: COLORS.danger,
              fontSize: 13, marginBottom: 16,
            }}>
              {errors._api}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* 이름 */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 6 }}>
                이름 <span style={{ color: COLORS.danger }}>*</span>
              </label>
              <input name="senderName" value={form.senderName} onChange={handleChange}
                placeholder="홍길동" style={inputStyle(!!errors.senderName)} />
              {errors.senderName && <p style={{ color: COLORS.danger, fontSize: 12, marginTop: 4 }}>{errors.senderName}</p>}
            </div>

            {/* 이메일 */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 6 }}>
                이메일 <span style={{ color: COLORS.danger }}>*</span>
              </label>
              <input name="senderEmail" type="email" value={form.senderEmail} onChange={handleChange}
                placeholder="your@email.com" style={inputStyle(!!errors.senderEmail)} />
              {errors.senderEmail && <p style={{ color: COLORS.danger, fontSize: 12, marginTop: 4 }}>{errors.senderEmail}</p>}
            </div>

            {/* 촬영 종류 */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 6 }}>
                촬영 종류
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SHOOT_TYPES.map(t => (
                  <button
                    key={t.value} type="button"
                    onClick={() => setForm(p => ({ ...p, shootType: t.value }))}
                    style={{
                      padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 13,
                      border: `1.5px solid ${form.shootType === t.value ? COLORS.primary : COLORS.border}`,
                      background: form.shootType === t.value ? COLORS.primaryLight : '#fff',
                      color: form.shootType === t.value ? COLORS.primary : COLORS.textSecondary,
                      fontWeight: form.shootType === t.value ? 700 : 500,
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 날짜 + 예산 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 6 }}>
                  희망 날짜
                </label>
                <input name="shootDate" value={form.shootDate} onChange={handleChange}
                  placeholder="예: 2024년 3월" style={inputStyle(false)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 6 }}>
                  예산 (참고)
                </label>
                <input name="budget" value={form.budget} onChange={handleChange}
                  placeholder="예: 30~50만원" style={inputStyle(false)} />
              </div>
            </div>

            {/* 메시지 */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 6 }}>
                메시지 <span style={{ color: COLORS.danger }}>*</span>
              </label>
              <textarea
                name="message" value={form.message} onChange={handleChange}
                placeholder="촬영 목적, 장소, 인원 등 원하시는 내용을 자유롭게 적어주세요."
                rows={5}
                style={{ ...inputStyle(!!errors.message), resize: 'vertical' }}
              />
              {errors.message && <p style={{ color: COLORS.danger, fontSize: 12, marginTop: 4 }}>{errors.message}</p>}
            </div>

            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                background: loading ? '#a0a8e8' : COLORS.primary,
                color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? '전송 중...' : '문의 보내기'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
