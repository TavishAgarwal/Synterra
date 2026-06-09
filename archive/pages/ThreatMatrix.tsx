import React from 'react';
import { AppShell } from '../components/layout/AppShell';

const ThreatMatrix: React.FC = () => {
  return (
    <AppShell>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: 16,
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 48,
            fontWeight: 400,
            color: 'var(--color-text-primary)',
            margin: 0,
          }}
        >
          THREAT MATRIX
        </h1>
        <div
          style={{
            fontFamily: 'var(--font-data)',
            fontSize: 14,
            color: 'var(--color-text-dim)',
            letterSpacing: '0.1em',
          }}
        >
          MODULE UNDER CONSTRUCTION
        </div>
        <div
          style={{
            fontFamily: 'var(--font-data)',
            fontSize: 10,
            color: 'var(--color-text-ghost)',
            letterSpacing: '0.1em',
          }}
        >
          AWAITING CLEARANCE_LEVEL_5 AUTHORIZATION
        </div>
      </div>
    </AppShell>
  );
};

export default ThreatMatrix;
