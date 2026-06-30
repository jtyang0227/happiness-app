import React, { useState, useEffect } from 'react';
import { testimonialApi, pressApi, pricingApi, brandApi } from '../../services/portfolioApi';
import { COLORS } from '../../constants/colors';

const SECTION_TABS = [
  { key: 'testimonials', label: '추천사' },
  { key: 'press',        label: '언론/수상' },
  { key: 'pricing',      label: '패키지' },
  { key: 'brands',       label: '클라이언트' },
];

const cardStyle = {
  background: COLORS.bg, borderRadius: 12, padding: '16px',
  border: `1px solid ${COLORS.border}`, marginBottom: 10,
  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
};

const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: `1.5px solid ${COLORS.border}`, background: COLORS.surface,
  color: COLORS.text, fontSize: 13, outline: 'none', boxSizing: 'border-box',
  marginBottom: 8, fontFamily: 'inherit',
};

const smallBtn = (danger) => ({
  padding: '5px 12px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 700,
  background: danger ? '#fef2f2' : COLORS.primaryLight,
  color: danger ? COLORS.danger : COLORS.primary, cursor: 'pointer',
});

/* ─── 추천사 관리 ─── */
function TestimonialsManager() {
  const [items, setItems] = useState([]);
  const [form, setForm]   = useState({ clientName: '', clientRole: '', content: '', shootDate: '' });
  const [loading, setLoading] = useState(false);
  const [adding, setAdding]   = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // 내 추천사는 memberId 없이 profileName으로 조회해야 하나
        // 서버에서는 /member/:id로만 공개 — 일단 authApi로 memberId 가져오는 방식 없으니
        // 비워두고 추가/삭제만 가능하게 처리
      } catch {}
    })();
  }, []);

  const handleAdd = async () => {
    if (!form.clientName.trim() || !form.content.trim()) return;
    setLoading(true);
    try {
      const created = await testimonialApi.create(form);
      setItems(p => [created, ...p]);
      setForm({ clientName: '', clientRole: '', content: '', shootDate: '' });
      setAdding(false);
    } catch {} finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    try {
      await testimonialApi.remove(id);
      setItems(p => p.filter(x => x.id !== id));
    } catch {}
  };

  return (
    <div>
      {items.map(t => (
        <div key={t.id} style={cardStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{t.clientName}</div>
            {t.clientRole && <div style={{ fontSize: 11, color: COLORS.textMuted }}>{t.clientRole}</div>}
            <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 6, lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              "{t.content}"
            </div>
          </div>
          <button onClick={() => handleDelete(t.id)} style={smallBtn(true)}>삭제</button>
        </div>
      ))}
      {!adding ? (
        <button onClick={() => setAdding(true)} style={{ ...smallBtn(false), width: '100%', padding: '10px', marginTop: 4 }}>
          + 추천사 추가
        </button>
      ) : (
        <div style={{ background: COLORS.surface, borderRadius: 12, padding: 16, border: `1px solid ${COLORS.border}`, marginTop: 4 }}>
          <input placeholder="고객 이름 *" value={form.clientName} onChange={e => setForm(p => ({ ...p, clientName: e.target.value }))} style={inputStyle} />
          <input placeholder="직함 / 역할 (선택)" value={form.clientRole} onChange={e => setForm(p => ({ ...p, clientRole: e.target.value }))} style={inputStyle} />
          <textarea placeholder="추천사 내용 *" value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
          <input placeholder="촬영 날짜 (예: 2025.03)" value={form.shootDate} onChange={e => setForm(p => ({ ...p, shootDate: e.target.value }))} style={inputStyle} />
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={() => setAdding(false)} style={{ ...smallBtn(false), flex: 1, background: COLORS.bg, color: COLORS.textSecondary }}>취소</button>
            <button onClick={handleAdd} disabled={loading} style={{ ...smallBtn(false), flex: 1, opacity: loading ? 0.7 : 1 }}>
              {loading ? '저장 중...' : '추가'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── 언론/수상 관리 ─── */
function PressAchievementsManager() {
  const [pressItems, setPressItems]  = useState([]);
  const [achieves, setAchieves]      = useState([]);
  const [subTab, setSubTab]          = useState('press');
  const [addingPress, setAddingPress] = useState(false);
  const [addingAch, setAddingAch]    = useState(false);
  const [pressForm, setPressForm]    = useState({ publication: '', title: '', url: '', publishedDate: '' });
  const [achForm, setAchForm]        = useState({ type: 'AWARD', title: '', organizer: '', location: '', yearMonth: '' });
  const [loading, setLoading]        = useState(false);

  const handleAddPress = async () => {
    if (!pressForm.publication.trim()) return;
    setLoading(true);
    try {
      const created = await pressApi.createPress(pressForm);
      setPressItems(p => [created, ...p]);
      setPressForm({ publication: '', title: '', url: '', publishedDate: '' });
      setAddingPress(false);
    } catch {} finally { setLoading(false); }
  };

  const handleDeletePress = async (id) => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    try { await pressApi.deletePress(id); setPressItems(p => p.filter(x => x.id !== id)); } catch {}
  };

  const handleAddAch = async () => {
    if (!achForm.title.trim()) return;
    setLoading(true);
    try {
      const created = await pressApi.createAchievement(achForm);
      setAchieves(p => [created, ...p]);
      setAchForm({ type: 'AWARD', title: '', organizer: '', location: '', yearMonth: '' });
      setAddingAch(false);
    } catch {} finally { setLoading(false); }
  };

  const handleDeleteAch = async (id) => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    try { await pressApi.deleteAchievement(id); setAchieves(p => p.filter(x => x.id !== id)); } catch {}
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {['press', 'achievements'].map(t => (
          <button key={t} onClick={() => setSubTab(t)} style={{
            padding: '5px 14px', borderRadius: 16, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            border: `1.5px solid ${subTab === t ? COLORS.primary : COLORS.border}`,
            background: subTab === t ? COLORS.primaryLight : 'transparent',
            color: subTab === t ? COLORS.primary : COLORS.textSecondary,
          }}>
            {t === 'press' ? '언론 소개' : '수상·전시'}
          </button>
        ))}
      </div>

      {subTab === 'press' ? (
        <>
          {pressItems.map(p => (
            <div key={p.id} style={cardStyle}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{p.publication}</div>
                {p.title && <div style={{ fontSize: 11, color: COLORS.textMuted }}>{p.title}</div>}
                {p.publishedDate && <div style={{ fontSize: 11, color: COLORS.textMuted }}>{p.publishedDate}</div>}
              </div>
              <button onClick={() => handleDeletePress(p.id)} style={smallBtn(true)}>삭제</button>
            </div>
          ))}
          {!addingPress ? (
            <button onClick={() => setAddingPress(true)} style={{ ...smallBtn(false), width: '100%', padding: '10px', marginTop: 4 }}>+ 언론 추가</button>
          ) : (
            <div style={{ background: COLORS.surface, borderRadius: 12, padding: 16, border: `1px solid ${COLORS.border}`, marginTop: 4 }}>
              <input placeholder="매체명 * (예: Vogue Korea)" value={pressForm.publication} onChange={e => setPressForm(p => ({ ...p, publication: e.target.value }))} style={inputStyle} />
              <input placeholder="기사 제목 (선택)" value={pressForm.title} onChange={e => setPressForm(p => ({ ...p, title: e.target.value }))} style={inputStyle} />
              <input placeholder="기사 URL (선택)" value={pressForm.url} onChange={e => setPressForm(p => ({ ...p, url: e.target.value }))} style={inputStyle} />
              <input placeholder="게재 날짜 (예: 2025.03)" value={pressForm.publishedDate} onChange={e => setPressForm(p => ({ ...p, publishedDate: e.target.value }))} style={inputStyle} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setAddingPress(false)} style={{ ...smallBtn(false), flex: 1, background: COLORS.bg, color: COLORS.textSecondary }}>취소</button>
                <button onClick={handleAddPress} disabled={loading} style={{ ...smallBtn(false), flex: 1 }}>추가</button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {achieves.map(a => (
            <div key={a.id} style={cardStyle}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: COLORS.primary, fontWeight: 700, marginBottom: 2 }}>{a.type} {a.yearMonth && `· ${a.yearMonth}`}</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{a.title}</div>
                {a.organizer && <div style={{ fontSize: 11, color: COLORS.textMuted }}>{a.organizer}</div>}
              </div>
              <button onClick={() => handleDeleteAch(a.id)} style={smallBtn(true)}>삭제</button>
            </div>
          ))}
          {!addingAch ? (
            <button onClick={() => setAddingAch(true)} style={{ ...smallBtn(false), width: '100%', padding: '10px', marginTop: 4 }}>+ 수상/전시 추가</button>
          ) : (
            <div style={{ background: COLORS.surface, borderRadius: 12, padding: 16, border: `1px solid ${COLORS.border}`, marginTop: 4 }}>
              <select value={achForm.type} onChange={e => setAchForm(p => ({ ...p, type: e.target.value }))} style={{ ...inputStyle, appearance: 'none' }}>
                <option value="AWARD">수상</option>
                <option value="EXHIBITION">전시</option>
                <option value="PUBLICATION">출판</option>
              </select>
              <input placeholder="제목 *" value={achForm.title} onChange={e => setAchForm(p => ({ ...p, title: e.target.value }))} style={inputStyle} />
              <input placeholder="주최기관 (선택)" value={achForm.organizer} onChange={e => setAchForm(p => ({ ...p, organizer: e.target.value }))} style={inputStyle} />
              <input placeholder="연도.월 (예: 2025.05)" value={achForm.yearMonth} onChange={e => setAchForm(p => ({ ...p, yearMonth: e.target.value }))} style={inputStyle} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setAddingAch(false)} style={{ ...smallBtn(false), flex: 1, background: COLORS.bg, color: COLORS.textSecondary }}>취소</button>
                <button onClick={handleAddAch} disabled={loading} style={{ ...smallBtn(false), flex: 1 }}>추가</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── 가격 패키지 관리 ─── */
function PricingManager() {
  const [items, setItems]   = useState([]);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', priceLabel: '', description: '', features: '', featured: false });

  useEffect(() => {
    pricingApi.myList().then(setItems).catch(() => {});
  }, []);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const created = await pricingApi.create({ ...form, active: true });
      setItems(p => [...p, created]);
      setForm({ name: '', priceLabel: '', description: '', features: '', featured: false });
      setAdding(false);
    } catch {} finally { setLoading(false); }
  };

  const handleToggleActive = async (item) => {
    try {
      const updated = await pricingApi.update(item.id, { active: !item.active });
      setItems(p => p.map(x => x.id === item.id ? { ...x, ...updated } : x));
    } catch {}
  };

  const handleDelete = async (id) => {
    if (!window.confirm('패키지를 삭제하시겠습니까?')) return;
    try { await pricingApi.remove(id); setItems(p => p.filter(x => x.id !== id)); } catch {}
  };

  return (
    <div>
      {items.map(pkg => (
        <div key={pkg.id} style={{ ...cardStyle, opacity: pkg.active ? 1 : 0.5 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{pkg.name}</span>
              {pkg.featured && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: COLORS.primaryLight, color: COLORS.primary, fontWeight: 700 }}>추천</span>}
              {!pkg.active && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: '#fef2f2', color: COLORS.danger, fontWeight: 700 }}>비활성</span>}
            </div>
            {pkg.priceLabel && <div style={{ fontSize: 12, color: COLORS.textMuted }}>{pkg.priceLabel}</div>}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => handleToggleActive(pkg)} style={smallBtn(false)}>{pkg.active ? '비활성화' : '활성화'}</button>
            <button onClick={() => handleDelete(pkg.id)} style={smallBtn(true)}>삭제</button>
          </div>
        </div>
      ))}
      {!adding ? (
        <button onClick={() => setAdding(true)} style={{ ...smallBtn(false), width: '100%', padding: '10px', marginTop: 4 }}>+ 패키지 추가</button>
      ) : (
        <div style={{ background: COLORS.surface, borderRadius: 12, padding: 16, border: `1px solid ${COLORS.border}`, marginTop: 4 }}>
          <input placeholder="패키지 이름 * (예: 기본 스냅)" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={inputStyle} />
          <input placeholder="가격 레이블 (예: 30만원~, 문의 필요)" value={form.priceLabel} onChange={e => setForm(p => ({ ...p, priceLabel: e.target.value }))} style={inputStyle} />
          <textarea placeholder="패키지 설명" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          <textarea placeholder={'포함 사항 (줄바꿈으로 구분)\n예:\n보정 사진 50장\n고화질 원본 제공'} value={form.features} onChange={e => setForm(p => ({ ...p, features: e.target.value }))} rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: COLORS.text, marginBottom: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.featured} onChange={e => setForm(p => ({ ...p, featured: e.target.checked }))} style={{ width: 16, height: 16 }} />
            추천 패키지로 표시
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setAdding(false)} style={{ ...smallBtn(false), flex: 1, background: COLORS.bg, color: COLORS.textSecondary }}>취소</button>
            <button onClick={handleAdd} disabled={loading} style={{ ...smallBtn(false), flex: 1 }}>추가</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── 클라이언트 브랜드 관리 ─── */
function BrandsManager() {
  const [items, setItems]   = useState([]);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm]     = useState({ name: '', logoUrl: '' });

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const created = await brandApi.create(form);
      setItems(p => [...p, created]);
      setForm({ name: '', logoUrl: '' });
      setAdding(false);
    } catch {} finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    try { await brandApi.remove(id); setItems(p => p.filter(x => x.id !== id)); } catch {}
  };

  return (
    <div>
      <p style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 12, lineHeight: 1.6 }}>
        함께 작업한 브랜드를 등록하면 포트폴리오에 로고 월(Logo Wall)이 표시됩니다.
      </p>
      {items.map(b => (
        <div key={b.id} style={cardStyle}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{b.name}</div>
            {b.logoUrl && <div style={{ fontSize: 11, color: COLORS.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{b.logoUrl}</div>}
          </div>
          <button onClick={() => handleDelete(b.id)} style={smallBtn(true)}>삭제</button>
        </div>
      ))}
      {!adding ? (
        <button onClick={() => setAdding(true)} style={{ ...smallBtn(false), width: '100%', padding: '10px', marginTop: 4 }}>+ 브랜드 추가</button>
      ) : (
        <div style={{ background: COLORS.surface, borderRadius: 12, padding: 16, border: `1px solid ${COLORS.border}`, marginTop: 4 }}>
          <input placeholder="브랜드 이름 *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={inputStyle} />
          <input placeholder="로고 이미지 URL (선택)" value={form.logoUrl} onChange={e => setForm(p => ({ ...p, logoUrl: e.target.value }))} style={inputStyle} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setAdding(false)} style={{ ...smallBtn(false), flex: 1, background: COLORS.bg, color: COLORS.textSecondary }}>취소</button>
            <button onClick={handleAdd} disabled={loading} style={{ ...smallBtn(false), flex: 1 }}>추가</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── 메인 컴포넌트 ─── */
export default function PortfolioContentManager() {
  const [activeSection, setActiveSection] = useState('testimonials');

  return (
    <div>
      {/* 섹션 탭 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {SECTION_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveSection(t.key)}
            style={{
              padding: '6px 14px', borderRadius: 16, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              border: `1.5px solid ${activeSection === t.key ? COLORS.primary : COLORS.border}`,
              background: activeSection === t.key ? COLORS.primaryLight : 'transparent',
              color: activeSection === t.key ? COLORS.primary : COLORS.textSecondary,
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeSection === 'testimonials' && <TestimonialsManager />}
      {activeSection === 'press'        && <PressAchievementsManager />}
      {activeSection === 'pricing'      && <PricingManager />}
      {activeSection === 'brands'       && <BrandsManager />}
    </div>
  );
}
