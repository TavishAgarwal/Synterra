import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const navLinks = [
  { label: 'STRATEGY', path: '/mission-control', matchPaths: ['/mission-control', '/simulate'] },
  { label: 'ASSETS', path: '/geo-synthesis', matchPaths: ['/geo-synthesis'] },
  { label: 'NETWORK', path: '/geo-synthesis', matchPaths: [] },
  { label: 'LOGS', path: '/hindcast-validation', matchPaths: ['/hindcast-validation'] },
];

export const TopNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (link: typeof navLinks[0]) => {
    return link.matchPaths.some(p => location.pathname.startsWith(p));
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 48,
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border-dim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 100,
      }}
    >
      {/* Left: Logo */}
      <div
        style={{
          fontFamily: 'var(--font-data)',
          fontSize: 16,
          letterSpacing: '0.15em',
          color: 'var(--color-primary)',
          cursor: 'crosshair',
          display: 'flex',
          alignItems: 'center',
        }}
        onClick={() => navigate('/mission-control')}
      >
        SYNTHETIC_NATION
        <span className="cursor-blink" style={{ color: 'var(--color-primary)', marginLeft: 1 }}>_</span>
      </div>

      {/* Center: Nav links */}
      <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
        {navLinks.map((link) => {
          const active = isActive(link);
          return (
            <div
              key={link.label}
              onClick={() => navigate(link.path)}
              style={{
                fontFamily: 'var(--font-data)',
                fontSize: 12,
                letterSpacing: '0.1em',
                color: active ? 'var(--color-primary)' : 'var(--color-text-dim)',
                cursor: 'crosshair',
                paddingBottom: 4,
                borderBottom: active ? '2px solid var(--color-primary)' : '2px solid transparent',
                transition: 'color 150ms, border-color 150ms',
                height: 48,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {link.label}
            </div>
          );
        })}
      </div>

      {/* Right: Search + icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Search input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            border: '1px solid var(--color-border)',
            padding: '4px 8px',
            background: 'transparent',
            minWidth: 140,
          }}
        >
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 12, color: 'var(--color-primary)' }}>&gt;</span>
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 12, color: 'var(--color-text-ghost)' }}>QUERY...</span>
          <span className="cursor-blink" style={{ fontFamily: 'var(--font-data)', fontSize: 12, color: 'var(--color-primary)' }}>█</span>
        </div>

        {/* Monitor icon */}
        <div
          className="glow-hover"
          style={{
            width: 32,
            height: 32,
            border: '1px solid var(--color-border-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-dim)',
            fontSize: 14,
            cursor: 'crosshair',
            transition: 'border-color 150ms, color 150ms',
          }}
        >
          ⊡
        </div>

        {/* Settings icon */}
        <div
          className="glow-hover"
          style={{
            width: 32,
            height: 32,
            border: '1px solid var(--color-border-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-dim)',
            fontSize: 14,
            cursor: 'crosshair',
            transition: 'border-color 150ms, color 150ms',
          }}
        >
          ⚙
        </div>
      </div>
    </div>
  );
};
