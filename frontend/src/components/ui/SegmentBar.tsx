import React, { useState, useEffect } from 'react';

interface SegmentBarProps {
  value: number;
  variant?: 'primary' | 'warn' | 'alert';
  label?: string;
  className?: string;
}

const variantColorMap = {
  primary: 'var(--color-primary)',
  warn: 'var(--color-warn)',
  alert: 'var(--color-alert)',
};

const TOTAL_SEGMENTS = 40;

export const SegmentBar: React.FC<SegmentBarProps> = ({
  value,
  variant = 'primary',
  label,
  className = '',
}) => {
  const [animatedCount, setAnimatedCount] = useState(0);
  const filledCount = Math.round((value / 100) * TOTAL_SEGMENTS);
  const fillColor = variantColorMap[variant];

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current++;
      if (current >= filledCount) {
        setAnimatedCount(filledCount);
        clearInterval(interval);
      } else {
        setAnimatedCount(current);
      }
    }, 20);
    return () => clearInterval(interval);
  }, [filledCount]);

  return (
    <div className={className}>
      {label && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 6,
            fontFamily: 'var(--font-data)',
            fontSize: 12,
          }}
        >
          <span style={{ color: 'var(--color-text-dim)', letterSpacing: '0.05em' }}>{label}</span>
          <span style={{ color: 'var(--color-text-secondary)' }}>{Math.round(value)}%</span>
        </div>
      )}
      <div
        style={{
          display: 'flex',
          gap: 1,
          height: 8,
          width: '100%',
        }}
      >
        {Array.from({ length: TOTAL_SEGMENTS }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: '100%',
              background: i < animatedCount ? fillColor : 'var(--color-surface-high)',
              transition: 'background 50ms ease-out',
            }}
          />
        ))}
      </div>
    </div>
  );
};
