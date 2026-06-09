import React, { useState, useEffect } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { GlassPanel } from '../components/ui/GlassPanel';
import { DataChip } from '../components/ui/DataChip';
import { MetricCard } from '../components/ui/MetricCard';
import { hindcastData } from '../data/mockValidation';

const HindcastValidation: React.FC = () => {
  // Countdown timer: T-MINUS 04:12:00
  const [countdown, setCountdown] = useState(4 * 3600 + 12 * 60);
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatCountdown = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <AppShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Top section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-data)',
                fontSize: 10,
                color: 'var(--color-text-dim)',
                letterSpacing: '0.1em',
                marginBottom: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ color: 'var(--color-text-dim)' }}>■</span>
              SYS.VAL.MODULE_ACTIVE
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 48,
                fontWeight: 400,
                color: 'var(--color-text-primary)',
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              HINDCAST VALIDATION
            </h1>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontFamily: 'var(--font-data)',
                fontSize: 10,
                color: 'var(--color-text-dim)',
                letterSpacing: '0.1em',
              }}
            >
              LAST COMPILE
            </div>
            <div
              style={{
                fontFamily: 'var(--font-data)',
                fontSize: 14,
                color: 'var(--color-primary)',
                marginTop: 2,
              }}
            >
              T-MINUS {formatCountdown(countdown)}
            </div>
          </div>
        </div>

        {/* Three metric cards */}
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <MetricCard
              label="GLOBAL PREDICTIVE ACCURACY"
              value={hindcastData.globalAccuracy}
              unit="%"
              decimals={1}
              variant="primary"
              delta="+1.4%"
              showBar
              barValue={hindcastData.globalAccuracy}
            />
          </div>
          <div style={{ flex: 1 }}>
            <MetricCard
              label="MEAN SQUARED ERROR (MSE)"
              value={hindcastData.mse}
              unit="△"
              decimals={2}
              variant="warn"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: 10, color: 'var(--color-text-dim)', letterSpacing: '0.1em' }}>
                  THRESHOLD: 0.15
                </span>
                <DataChip label="NOMINAL" variant="stable" />
              </div>
            </MetricCard>
          </div>
          <div style={{ flex: 1 }}>
            <MetricCard
              label="POPULATION ENTITIES ANALYZED"
              value={14.2}
              unit="MILLION"
              decimals={1}
              variant="default"
            >
              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 8, height: 8, background: 'var(--color-primary)' }} />
                  <span style={{ fontFamily: 'var(--font-data)', fontSize: 10, color: 'var(--color-text-dim)' }}>CORE</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 8, height: 8, background: 'var(--color-secondary)' }} />
                  <span style={{ fontFamily: 'var(--font-data)', fontSize: 10, color: 'var(--color-text-dim)' }}>PERIPHERY</span>
                </div>
              </div>
            </MetricCard>
          </div>
        </div>

        {/* Main content: divergence + methodology */}
        <div style={{ display: 'flex', gap: 16 }}>
          {/* Divergence Matrix - 70% */}
          <div style={{ flex: '0 0 70%' }}>
            <GlassPanel
              title="EMPIRICAL DIVERGENCE MATRIX"
              variant="serif"
              headerRight={
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: 'var(--font-data)', fontSize: 10, color: 'var(--color-text-dim)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 10, height: 10, border: '1px solid var(--color-text-dim)', background: 'var(--color-surface-bright)' }} />
                    <span>ACTUAL</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 12, height: 1, background: 'var(--color-text-dim)' }} />
                    <span>PREDICTED</span>
                  </div>
                </div>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
                {hindcastData.divergenceMatrix.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      height: 48,
                    }}
                  >
                    {/* Label */}
                    <div
                      style={{
                        fontFamily: 'var(--font-data)',
                        fontSize: 11,
                        color: 'var(--color-text-dim)',
                        width: 200,
                        flexShrink: 0,
                        letterSpacing: '0.05em',
                      }}
                    >
                      {item.label}
                    </div>

                    {/* Bar */}
                    <div style={{ flex: 1, position: 'relative', height: 20 }}>
                      {/* Background track */}
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'var(--color-surface-high)',
                        }}
                      />
                      {/* Filled bar (predicted) */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          bottom: 0,
                          width: `${item.predicted}%`,
                          background: 'var(--color-surface-bright)',
                        }}
                      />
                      {/* Actual marker line */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          bottom: 0,
                          left: `${item.actual}%`,
                          width: 2,
                          background: 'var(--color-primary)',
                        }}
                      />
                    </div>

                    {/* Delta */}
                    <div
                      style={{
                        fontFamily: 'var(--font-data)',
                        fontSize: 12,
                        color: item.delta > 0 ? 'var(--color-success)' : 'var(--color-alert)',
                        width: 50,
                        textAlign: 'right',
                        flexShrink: 0,
                      }}
                    >
                      {item.delta > 0 ? '+' : ''}{item.delta.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            </GlassPanel>
          </div>

          {/* Validation Methodology - 30% */}
          <div style={{ flex: '0 0 30%', minWidth: 0 }}>
            <GlassPanel title="VALIDATION METHODOLOGY" variant="serif">
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 16,
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.6,
                  marginBottom: 16,
                }}
              >
                {hindcastData.methodology.description}
              </p>
              {hindcastData.methodology.items.map((item, i) => (
                <div key={i}>
                  {i > 0 && (
                    <div style={{ borderTop: '1px solid var(--color-border-dim)', margin: '12px 0' }} />
                  )}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span
                      style={{
                        color: 'var(--color-primary)',
                        fontSize: 18,
                        flexShrink: 0,
                        lineHeight: 1.2,
                      }}
                    >
                      {item.icon}
                    </span>
                    <div>
                      <div
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: 16,
                          color: 'var(--color-text-primary)',
                          marginBottom: 4,
                        }}
                      >
                        {item.title}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: 14,
                          color: 'var(--color-text-secondary)',
                          lineHeight: 1.6,
                        }}
                      >
                        {item.description}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </GlassPanel>
          </div>
        </div>

        {/* Hindcast Execution Roadmap */}
        <GlassPanel
          title="HINDCAST EXECUTION ROADMAP"
          variant="mono"
          headerRight={
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 10, color: 'var(--color-text-dim)', letterSpacing: '0.1em' }}>
              SYS.LOG.TIMELINE
            </span>
          }
        >
          <div style={{ padding: '24px 16px' }}>
            {/* Timeline line */}
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  top: 6,
                  left: 0,
                  right: 0,
                  height: 1,
                  background: 'var(--color-primary-border)',
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                {hindcastData.roadmap.map((phase, i) => {
                  const isComplete = phase.status === 'complete';
                  const isActive = phase.status === 'active';
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          border: '1px solid var(--color-primary)',
                          background: isComplete || isActive ? 'var(--color-primary)' : 'transparent',
                          position: 'relative',
                          ...(isActive
                            ? {
                                boxShadow:
                                  '0 0 8px rgba(0, 229, 255, 0.3), 0 0 2px rgba(0, 229, 255, 0.6)',
                              }
                            : {}),
                        }}
                      />
                      <div
                        style={{
                          fontFamily: 'var(--font-data)',
                          fontSize: 10,
                          color: isActive ? 'var(--color-primary)' : 'var(--color-text-dim)',
                          textAlign: 'center',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {phase.label}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-data)',
                          fontSize: 10,
                          color: 'var(--color-text-ghost)',
                        }}
                      >
                        {phase.date}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>
    </AppShell>
  );
};

export default HindcastValidation;
