import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { COLORS } from '../constants/colors';
import { bookingApi } from '../services/bookingApi';
import StepWizard from '../components/booking/StepWizard';
import ShootTypeSelector from '../components/booking/ShootTypeSelector';
import BookingCalendar from '../components/booking/BookingCalendar';
import TimeSlotPicker from '../components/booking/TimeSlotPicker';
import BookingForm from '../components/booking/BookingForm';

const STEPS = ['촬영 종류', '날짜 · 시간', '정보 입력'];

export default function BookingPage() {
  const { profileName } = useParams();
  const [step, setStep] = useState(0);
  const [shootType, setShootType] = useState('');
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availability, setAvailability] = useState(null);
  const [availLoading, setAvailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Load availability when month changes (step 1)
  useEffect(() => {
    if (step !== 1) return;
    setAvailLoading(true);
    bookingApi.getAvailability(profileName, year, month)
      .then(data => setAvailability(data))
      .catch(() => setAvailability({ availableDates: [], bookedSlots: {} }))
      .finally(() => setAvailLoading(false));
  }, [profileName, year, month, step]);

  const handlePrevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
    setSelectedDate('');
    setSelectedTime('');
  };

  const handleNextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
    setSelectedDate('');
    setSelectedTime('');
  };

  const handleSelectDate = (date) => {
    // Security: validate date is in the future (not today or past)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(date);
    selected.setHours(0, 0, 0, 0);
    if (selected <= today) return; // silently block past/today
    setSelectedDate(date);
    setSelectedTime('');
  };

  const handleStep1Next = () => {
    if (!shootType) { setError('촬영 종류를 선택해주세요.'); return; }
    setError('');
    setStep(1);
  };

  const handleStep2Next = () => {
    if (!selectedDate) { setError('날짜를 선택해주세요.'); return; }
    if (!selectedTime) { setError('시간을 선택해주세요.'); return; }
    setError('');
    setStep(2);
  };

  const handleSubmit = async (formData) => {
    setSubmitting(true);
    setError('');
    try {
      await bookingApi.createBooking(profileName, {
        shootType,
        date: selectedDate,
        time: selectedTime,
        ...formData,
      });
      setSuccess(true);
    } catch (err) {
      setError(err?.response?.data?.message || '예약 요청에 실패했습니다. 다시 시도해주세요.');
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>📅</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: COLORS.text, margin: '0 0 12px' }}>
          예약 요청이 전송되었습니다
        </h2>
        <p style={{ fontSize: 14, color: COLORS.textSecondary, margin: '0 0 8px', lineHeight: 1.7 }}>
          작가의 승인 후 확정됩니다.
        </p>
        <p style={{ fontSize: 13, color: COLORS.textMuted, margin: 0, lineHeight: 1.7 }}>
          예약 확인은 입력하신 연락처 또는 이메일로 안내드립니다.
        </p>
      </div>
    );
  }

  const availableDatesSet = new Set(
    (availability?.availableDates || [])
      .filter(d => {
        // Only future dates
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dt = new Date(d);
        dt.setHours(0, 0, 0, 0);
        return dt > today;
      })
  );
  const bookedSlotsMap = availability?.bookedSlots || {};
  const availableSlots = availability?.timeSlots || [];
  const bookedForDate = selectedDate ? (bookedSlotsMap[selectedDate] || []) : [];

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 0 40px' }}>
        {/* Header */}
        <div style={{ padding: '24px 20px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 }}>@{profileName}</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: COLORS.text, margin: '0 0 8px' }}>촬영 예약</h1>
        </div>

        <StepWizard currentStep={step} steps={STEPS} />

        <div style={{ background: COLORS.surface, margin: '0 16px', borderRadius: 20, border: `1px solid ${COLORS.border}`, padding: '24px 20px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          {/* Step 0: Shoot type */}
          {step === 0 && (
            <div>
              <ShootTypeSelector selected={shootType} onSelect={v => { setShootType(v); setError(''); }} />
              {error && <div style={{ fontSize: 13, color: COLORS.danger, marginTop: 12, textAlign: 'center' }}>{error}</div>}
              <button
                onClick={handleStep1Next}
                style={{ width: '100%', marginTop: 24, padding: '13px 0', borderRadius: 12, border: 'none', background: COLORS.primary, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
              >
                다음
              </button>
            </div>
          )}

          {/* Step 1: Date + Time */}
          {step === 1 && (
            <div>
              {availLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: COLORS.textMuted, fontSize: 13 }}>
                  가용 일정 로딩 중...
                </div>
              ) : (
                <>
                  <BookingCalendar
                    year={year}
                    month={month}
                    onPrevMonth={handlePrevMonth}
                    onNextMonth={handleNextMonth}
                    availableDates={availableDatesSet}
                    bookedSlots={bookedSlotsMap}
                    selectedDate={selectedDate}
                    onSelectDate={handleSelectDate}
                  />
                  {selectedDate && (
                    <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${COLORS.border}` }}>
                      <TimeSlotPicker
                        slots={availableSlots}
                        bookedSlots={bookedForDate}
                        selectedTime={selectedTime}
                        onSelect={t => { setSelectedTime(t); setError(''); }}
                      />
                    </div>
                  )}
                </>
              )}
              {error && <div style={{ fontSize: 13, color: COLORS.danger, marginTop: 12, textAlign: 'center' }}>{error}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button onClick={() => { setStep(0); setError(''); }} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: `1.5px solid ${COLORS.border}`, background: COLORS.surface, color: COLORS.text, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>이전</button>
                <button onClick={handleStep2Next} style={{ flex: 2, padding: '12px 0', borderRadius: 12, border: 'none', background: COLORS.primary, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>다음</button>
              </div>
            </div>
          )}

          {/* Step 2: Contact form */}
          {step === 2 && (
            <div>
              {/* Summary */}
              <div style={{ background: COLORS.bg, borderRadius: 12, padding: '12px 14px', marginBottom: 20, fontSize: 13, color: COLORS.text }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                  <span style={{ color: COLORS.textMuted }}>촬영 종류</span>
                  <span style={{ fontWeight: 700 }}>{shootType}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ color: COLORS.textMuted }}>일시</span>
                  <span style={{ fontWeight: 700 }}>{selectedDate} {selectedTime}</span>
                </div>
              </div>
              {error && <div style={{ fontSize: 13, color: COLORS.danger, marginBottom: 12, textAlign: 'center' }}>{error}</div>}
              <BookingForm
                onBack={() => { setStep(1); setError(''); }}
                onSubmit={handleSubmit}
                submitting={submitting}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
