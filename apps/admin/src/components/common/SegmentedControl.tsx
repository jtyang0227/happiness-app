import React from 'react';
const SegmentedControl = ({ options, value, onChange, ariaLabel }: { options?: any; value?: any; onChange?: (...args: any[]) => any; ariaLabel?: any }) => (
  <div className="segmented" role="tablist" aria-label={ariaLabel}>
    {options.map(o => (
      <button
        key={o.value}
        type="button"
        role="tab"
        aria-selected={value === o.value}
        className={`segmented-item${value === o.value ? ' active' : ''}`}
        onClick={() => onChange(o.value)}
      >
        {o.label}
        {o.count != null && <span className="segmented-count">{o.count}</span>}
      </button>
    ))}
  </div>
);

export default SegmentedControl;
