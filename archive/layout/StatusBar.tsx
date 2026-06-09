import React, { useState, useEffect } from 'react';

export const StatusBar: React.FC = () => {
  // Start at 142:09:12 = 511752 seconds
  const [uptimeSeconds, setUptimeSeconds] = useState(511752);
  const [coreTemp, setCoreTemp] = useState(32.4);

  useEffect(() => {
    const uptimeInterval = setInterval(() => {
      setUptimeSeconds(prev => prev + 1);
    }, 1000);

    const tempInterval = setInterval(() => {
      setCoreTemp(prev => {
        const delta = (Math.random() - 0.5) * 0.2;
        return Math.round((prev + delta) * 10) / 10;
      });
    }, 3000);

    return () => {
      clearInterval(uptimeInterval);
      clearInterval(tempInterval);
    };
  }, []);

  const formatUptime = (totalSeconds: number): string => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(3, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 32,
        background: 'var(--color-void)',
        borderTop: '1px solid var(--color-border-dim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 100,
        fontFamily: 'var(--font-data)',
        fontSize: 10,
        color: 'var(--color-text-dim)',
        letterSpacing: '0.05em',
      }}
    >
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span>SYS_UPTIME: {formatUptime(uptimeSeconds)}</span>
        <span style={{ margin: '0 8px' }}>|</span>
        <span>CORE_TEMP: {coreTemp.toFixed(1)}C</span>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span>ENCRYPTION_ACTIVE</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 6,
              height: 6,
              background: 'var(--color-success)',
              flexShrink: 0,
            }}
          />
          <span>STABLE_CONX</span>
        </div>
      </div>
    </div>
  );
};
