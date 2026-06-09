import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface SideNavProps {
  showInitiateButton?: boolean;
  onInitiate?: () => void;
}

const navItems = [
  { icon: '◉', label: 'MISSION CONTROL', path: '/mission-control' },
  { icon: '◎', label: 'GEO-SYNTHESIS', path: '/geo-synthesis' },
  { icon: '◈', label: 'THREAT MATRIX', path: '/threat-matrix' },
];

export const SideNav: React.FC<SideNavProps> = ({ showInitiateButton = false, onInitiate }) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div
      style={{
        position: 'fixed',
        top: 48,
        left: 0,
        bottom: 32,
        width: 240,
        background: 'var(--color-surface-low)',
        borderRight: '1px solid var(--color-border-dim)',
        zIndex: 99,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Operator block */}
      <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            border: '1px solid var(--color-primary-border)',
            background: 'var(--color-surface-container)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-data)',
            fontSize: 14,
            color: 'var(--color-text-dim)',
            flexShrink: 0,
          }}
        >
          ⊙
        </div>
        <div>
          <div
            style={{
              fontFamily: 'var(--font-data)',
              fontSize: 14,
              color: 'var(--color-primary)',
              lineHeight: 1.2,
            }}
          >
            OPERATOR_01
          </div>
          <div
            style={{
              fontFamily: 'var(--font-data)',
              fontSize: 10,
              color: 'var(--color-text-dim)',
              letterSpacing: '0.1em',
              lineHeight: 1.2,
              marginTop: 2,
            }}
          >
            SECTOR_ALPHA
          </div>
        </div>
      </div>

      {/* Nav items */}
      <div style={{ flex: 1, paddingTop: 8 }}>
        {navItems.map((item) => {
          const active = location.pathname.startsWith(item.path) ||
            (item.path === '/mission-control' && location.pathname.startsWith('/simulate'));
          return (
            <div
              key={item.label}
              onClick={() => navigate(item.path)}
              style={{
                height: 48,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                paddingLeft: active ? 13 : 16,
                cursor: 'crosshair',
                background: active ? 'var(--color-surface-container)' : 'transparent',
                borderLeft: active ? '3px solid var(--color-primary)' : '3px solid transparent',
                color: active ? 'var(--color-primary)' : 'var(--color-text-dim)',
                fontFamily: 'var(--font-data)',
                fontSize: 12,
                letterSpacing: '0.05em',
                transition: 'background 150ms, color 150ms, border-color 150ms',
              }}
            >
              <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>

      {/* Initiate button */}
      {showInitiateButton && (
        <div style={{ padding: 16 }}>
          <button
            onClick={onInitiate}
            style={{
              width: '100%',
              height: 48,
              background: 'transparent',
              border: '1px solid var(--color-primary)',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-data)',
              fontSize: 12,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'crosshair',
              clipPath:
                'polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)',
              transition: 'background 150ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-primary-glow)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            INITIATE_PROTOCOL
          </button>
        </div>
      )}
    </div>
  );
};
