import React, { useState } from 'react';
import { COLORS } from '../../constants/colors';

// Security: only allow digits and hyphens in phone
const sanitizePhone = (v) => v.replace(/[^0-9-]/g, '');

// Basic email format validation
const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export default function BookingForm({ onBack, onSubmit, submitting }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', memo: '' });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    let sanitized = value;
    if (name === 'phone') sanitized = sanitizePhone(value);
    setForm(prev => ({ ...prev, [name]: sanitized }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = '이름을 입력해주세요.';
    if (form.email && !isValidEmail(form.email)) errs.email = '올바른 이메일 형식을 입력해주세요.';
    if (form.phone && !/^[0-9-]{9,14}$/.test(form.phone)) errs.phone = '올바른 연락처를 입력해주세요.';
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit(form);
  };

  const inputStyle = (hasErr) => ({
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 14px',
    borderRadius: 12,
    border: `1.5px solid ${hasErr ? COLORS.danger : COLORS.border}`,
    fontSize: 14,
    color: COLORS.text,
    background: COLORS.surface,
    outline: 'none',
    fontFamily: 'inherit',
  });

  const fields = [
    { key: 'name',  label: '이름 *',   placeholder: '홍길동',               type: 'text' },
    { key: 'phone', label: '연락처',    placeholder: '010-1234-5678',         type: 'tel' },
    { key: 'email', label: '이메일',    placeholder: 'example@email.com',      type: 'email' },
  ];

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h3 style={{ fontSize: 17, fontWeight: 800, color: COLORS.text, margin: '0 0 20px', textAlign: 'center' }}>
        예약자 정보
      </h3>

      {fields.map(f => (
        <div key={f.key} style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, display: 'block', marginBottom: 6 }}>
            {f.label}
          </label>
          <input
            type={f.type}
            name={f.key}
            value={form[f.key]}
            onChange={handleChange}
            placeholder={f.placeholder}
            style={inputStyle(!!errors[f.key])}
          />
          {errors[f.key] && <div style={{ fontSize: 12, color: COLORS.danger, marginTop: 4 }}>{errors[f.key]}</div>}
        </div>
      ))}

      <div style={{ marginBottom: 28 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, display: 'block', marginBottom: 6 }}>
          메모
        </label>
        <textarea
          name="memo"
          value={form.memo}
          onChange={handleChange}
          placeholder="촬영 장소, 컨셉, 요청 사항 등을 적어주세요."
          rows={4}
          style={{ ...inputStyle(false), resize: 'vertical', lineHeight: 1.6 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          style={{
            flex: 1, padding: '13px 0', borderRadius: 12,
            border: `1.5px solid ${COLORS.border}`, background: COLORS.surface,
            color: COLORS.text, fontSize: 14, fontWeight: 600,
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          이전
        </button>
        <button
          type="submit"
          disabled={submitting}
          style={{
            flex: 2, padding: '13px 0', borderRadius: 12,
            border: 'none',
            background: submitting ? COLORS.border : COLORS.primary,
            color: submitting ? COLORS.textMuted : '#fff',
            fontSize: 14, fontWeight: 700,
            cursor: submitting ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {submitting ? '전송 중...' : '예약 요청하기'}
        </button>
      </div>
    </form>
  );
}
