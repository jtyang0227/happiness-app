import React from 'react';
import { COLORS } from '../../constants/colors';

export default function StepWizard({ currentStep = 0, steps = [] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px 24px' }}>
      {steps.map((label, i) => (
        <React.Fragment key={i}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: i < currentStep ? COLORS.primary : i === currentStep ? COLORS.primary : COLORS.surface,
              border: `2px solid ${i <= currentStep ? COLORS.primary : COLORS.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700,
              color: i <= currentStep ? '#fff' : COLORS.textMuted,
              transition: 'all 0.3s',
            }}>
              {i < currentStep ? '✓' : i + 1}
            </div>
            <div style={{
              fontSize: 11,
              fontWeight: i === currentStep ? 700 : 400,
              color: i === currentStep ? COLORS.primary : i < currentStep ? COLORS.text : COLORS.textMuted,
              whiteSpace: 'nowrap',
              transition: 'color 0.3s',
            }}>
              {label}
            </div>
          </div>
          {i < steps.length - 1 && (
            <div style={{
              flex: 1, height: 2, margin: '0 6px',
              background: i < currentStep ? COLORS.primary : COLORS.border,
              marginBottom: 20, // offset for label row
              transition: 'background 0.3s',
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
