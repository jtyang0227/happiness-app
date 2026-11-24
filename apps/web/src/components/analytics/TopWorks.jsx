import React from 'react';
import { Link } from 'react-router-dom';
import { COLORS } from '../../constants/colors';

/**
 * 많이 본 작업 — 작업 노트 페이지 조회수와 그 작업에서 온 문의 수 (작업 노트 P2).
 * 전환율 = 문의 / 조회. 조회가 0이면 "—".
 */
const NUM = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', padding: '8px 4px', whiteSpace: 'nowrap' };

export default function TopWorks({ works = [], profileName }) {
  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>많이 본 작업</div>
      <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 12 }}>작업 노트 페이지 조회와 그 페이지에서 온 문의</div>
      {works.length === 0 ? (
        <p style={{ fontSize: 13, color: COLORS.textMuted, textAlign: 'center', padding: '24px 0', margin: 0 }}>
          아직 작업 페이지 조회 기록이 없어요
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: COLORS.text }}>
            <thead>
              <tr style={{ color: COLORS.textMuted, fontSize: 11, borderBottom: `1px solid ${COLORS.border}` }}>
                <th scope="col" style={{ textAlign: 'left', padding: '6px 4px', fontWeight: 600 }}>작업</th>
                <th scope="col" style={{ ...NUM, fontWeight: 600 }}>조회</th>
                <th scope="col" style={{ ...NUM, fontWeight: 600 }}>문의</th>
                <th scope="col" style={{ ...NUM, fontWeight: 600 }}>전환</th>
              </tr>
            </thead>
            <tbody>
              {works.map((w, i) => {
                const rate = w.views > 0 ? `${((w.inquiries / w.views) * 100).toFixed(1)}%` : '—';
                const title = (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ width: 16, color: COLORS.textMuted, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                    <span style={{ width: 40, height: 30, borderRadius: 6, background: COLORS.surfaceDim, overflow: 'hidden', flexShrink: 0 }}>
                      {w.coverImageUrl && <img src={w.coverImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                    </span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.title}</span>
                  </span>
                );
                return (
                  <tr key={w.seriesId} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                    <td style={{ padding: '8px 4px', maxWidth: 220 }}>
                      {profileName
                        ? <Link to={`/portfolio/${profileName}/work/${w.seriesId}`} style={{ color: 'inherit', textDecoration: 'none' }}>{title}</Link>
                        : title}
                    </td>
                    <td style={NUM}>{w.views}</td>
                    <td style={NUM}>{w.inquiries}</td>
                    <td style={{ ...NUM, fontWeight: 700, color: w.inquiries > 0 ? COLORS.primary : COLORS.textMuted }}>{rate}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
