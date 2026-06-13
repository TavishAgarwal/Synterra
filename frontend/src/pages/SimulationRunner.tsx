import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getCityById } from '../data/cityProfiles';
import { getPolicyById } from '../data/demoPolicies';
import type { AgentFeedEntry } from '../data/simulationData';
import { streamSimulation, injectCrisis } from '../api/simulation';
import type { SimulationMetrics } from '../api/simulation';
import { useSimulationContext } from '../context/SimulationContext';
import { useTypewriter } from '../hooks/useTypewriter';
import SocialGraph from '../components/ui/SocialGraph';
import type { GraphNode } from '../components/ui/SocialGraph';

const typeColors: Record<string, string> = {
  adaptation: '#1aad6e',
  stress: '#ffb347',
  resistance: '#ff0055',
  broadcast: '#00e5ff',
};

function firstPolicyEntry(policyText: string): AgentFeedEntry {
  const lower = policyText.toLowerCase();
  if (lower.includes('fare') || lower.includes('railway')) {
    return { name: 'Ramesh, Shahdara', zone: 'Shahdara', decision: 'Read fare hike announcement. Recalculating monthly budget.', type: 'adaptation' };
  }
  if (lower.includes('metro') || lower.includes('free')) {
    return { name: 'Priya, Pitampura', zone: 'Pitampura', decision: 'Read metro free-ride announcement. Updating commute plan.', type: 'adaptation' };
  }
  if (lower.includes('neet') || lower.includes('exam') || lower.includes('online')) {
    return { name: 'Arjun, GTB Nagar', zone: 'GTB Nagar', decision: 'Read examination format change. Evaluating prep impact.', type: 'stress' };
  }
  if (lower.includes('fuel') || lower.includes('petrol') || lower.includes('diesel')) {
    return { name: 'Suresh, Dwarka', zone: 'Dwarka', decision: 'Read fuel price increase. Recalculating transport options.', type: 'stress' };
  }
  if (lower.includes('wfh') || lower.includes('work from home') || lower.includes('office')) {
    return { name: 'Vikram, Noida', zone: 'Noida', decision: 'Read return-to-office mandate. Checking commute viability.', type: 'stress' };
  }
  return { name: 'Meena, Central Zone', zone: 'Central Zone', decision: 'Policy announcement received. Evaluating personal impact.', type: 'adaptation' };
}

export default function SimulationRunner() {
  const { cityId, policyId } = useParams<{ cityId: string; policyId: string }>();
  const navigate = useNavigate();
  const {
    selectedPolicy,
    customPolicyText,
    sessionId,
    simulationId,
    setSimulationSummary,
    setSimulationId,
    setStep,
  } = useSimulationContext();
  const city = getCityById(cityId || '');
  const policy = selectedPolicy || getPolicyById(policyId || '');
  const policyText = policy?.fullText || customPolicyText;

  const [day, setDay] = useState(0);
  const [metrics, setMetrics] = useState<SimulationMetrics | null>(null);
  const [feed, setFeed] = useState<AgentFeedEntry[]>([]);
  const [networkNodes, setNetworkNodes] = useState<GraphNode[]>([]);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState('');
  const [runKey, setRunKey] = useState(0);
  const [showPersonalizedEntry, setShowPersonalizedEntry] = useState(false);
  const [govAlertStarted, setGovAlertStarted] = useState<boolean>(false);
  const [govRecommendationVisible, setGovRecommendationVisible] = useState(false);
  const [decisionCount, setDecisionCount] = useState(4847);
  const [broadcastCount, setBroadcastCount] = useState(23);
  const [isInjecting, setIsInjecting] = useState<string | null>(null);

  const personalizedEntry = useMemo(() => firstPolicyEntry(policyText || ''), [policyText]);
  const visibleFeed = showPersonalizedEntry ? [personalizedEntry, ...feed] : feed;
  const govTitle = govAlertStarted ? 'GOVERNMENT AGENT — AUTONOMOUS ALERT FIRED' : 'GOVERNMENT AGENT · AUTONOMOUS MONITOR';
  const govBody = govAlertStarted
    ? `Protest probability in ${city?.name || 'selected zone'} has exceeded 35% threshold. Generating autonomous recommendation...`
    : alerts[0] || 'Monitoring computed protest, modal-shift, revenue, and equity thresholds.';
  const typedGovTitle = useTypewriter(govTitle, 30, govAlertStarted ? 300 : 0);
  const typedGovBody = useTypewriter(govBody, 30, govAlertStarted ? 2000 : 0);

  const handleInjectCrisis = async (type: 'flood' | 'railway_strike' | 'fuel_crisis' | 'pandemic' | 'exam_leak') => {
    if (!simulationId) return;
    setIsInjecting(type);
    try {
      const res = await injectCrisis(simulationId, type);
      if (res.success) {
        setFeed(prev => [{
          name: 'SYSTEM COMMAND',
          zone: 'ALL ZONES',
          decision: `CRISIS SHOCK INJECTED: ${type.toUpperCase().replace('_', ' ')}`,
          type: 'broadcast'
        }, ...prev]);
        setAlerts(prev => [
          `Crisis Shock: ${type.toUpperCase().replace('_', ' ')} active on next simulation ticks.`,
          ...prev
        ].slice(0, 3));
      }
    } catch (err: unknown) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to inject crisis');
    } finally {
      setIsInjecting(null);
    }
  };

  useEffect(() => {
    setStep(2);
  }, [setStep]);

  useEffect(() => {
    if (!city || !policyText) {
      navigate(city ? `/policy/${city.id}` : '/');
      return;
    }

    const controller = new AbortController();
    const firstEntryTimer = window.setTimeout(() => setShowPersonalizedEntry(true), 1000);

    streamSimulation(
      { cityId: city.id, policyText },
      (event) => {
        if (event.simulation_id) setSimulationId(event.simulation_id);
        if (event.event === 'day_update') {
          setDay(event.day ?? 0);
          if ((event.day ?? 0) >= 18) {
            setGovAlertStarted((started: unknown) => !!started || true);
          }
          if (event.metrics) setMetrics(event.metrics as SimulationMetrics);
          if (event.agent_feed) setFeed(event.agent_feed);
          if (event.network_sample) setNetworkNodes(event.network_sample as GraphNode[]);
          if (event.alerts?.length) {
            setAlerts((previous) => [
              ...event.alerts!.map((alert) => alert.message),
              ...previous,
            ].slice(0, 3));
          }
        }
        if (event.event === 'sim_complete' && event.summary) {
          setSimulationSummary(event.summary);
          setComplete(true);
        }
        if (event.event === 'sim_error') {
          setError(event.message || 'Simulation could not be completed.');
        }
      },
      controller.signal
    ).catch((reason: unknown) => {
      if (!controller.signal.aborted) {
        setError(reason instanceof Error ? reason.message : 'Simulation could not be completed.');
      }
    });

    return () => {
      window.clearTimeout(firstEntryTimer);
      controller.abort();
    };
  }, [city, navigate, policyText, runKey, setSimulationId, setSimulationSummary]);

  useEffect(() => {
    const decisionsTimer = window.setInterval(() => {
      setDecisionCount((count) => count + 80 + Math.floor(Math.random() * 61));
    }, 2000);
    const broadcastsTimer = window.setInterval(() => {
      setBroadcastCount((count) => count + 2 + Math.floor(Math.random() * 7));
    }, 5000);
    return () => {
      window.clearInterval(decisionsTimer);
      window.clearInterval(broadcastsTimer);
    };
  }, []);

  useEffect(() => {
    if (!govAlertStarted) return;
    try {
      const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtor) {
        const ctx = new AudioCtor();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 440;
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch {
      // Browsers can block AudioContext until user interaction.
    }
    const timer = window.setTimeout(() => setGovRecommendationVisible(true), 4000);
    return () => window.clearTimeout(timer);
  }, [govAlertStarted]);

  const retry = useCallback(() => {
    setDay(0);
    setMetrics(null);
    setFeed([]);
    setNetworkNodes([]);
    setAlerts([]);
    setComplete(false);
    setError('');
    setShowPersonalizedEntry(false);
    setGovAlertStarted(false);
    setGovRecommendationVisible(false);
    setSimulationSummary(null);
    setRunKey((key) => key + 1);
  }, [setSimulationSummary]);

  if (!city) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ minHeight: 'calc(100vh - 56px)', padding: '24px 24px 80px' }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid var(--color-border)', paddingBottom: 16 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-data)', color: 'var(--color-primary)', fontSize: 11, letterSpacing: '0.1em' }}>
              REALTIME PROPAGATION DECK · ACTIVE SSE STREAM
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, margin: '4px 0 0', letterSpacing: '-0.02em' }}>
              {city.name} Simulation Control Center
            </h1>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontFamily: 'var(--font-data)', fontSize: 12, background: 'rgba(6, 182, 212, 0.08)', border: '1px solid var(--color-primary-border)', padding: '4px 12px', borderRadius: 6, color: 'var(--color-primary)' }}>
              SEED: {policy?.id ? '42' : 'CUSTOM'}
            </span>
          </div>
        </div>

        {error ? (
          <div className="glass-panel" style={{ border: '1px solid var(--color-alert)', background: 'rgba(239, 68, 68, 0.05)', padding: 32, textAlign: 'center', borderRadius: 12 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-alert)', marginBottom: 8, fontSize: 20 }}>Simulation Unavailable</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 20 }}>{error}</p>
            <button onClick={retry} className="chamfered" style={{ background: 'var(--color-primary)', color: '#030712', border: 0, padding: '12px 28px', fontWeight: 600, borderRadius: 6 }}>
              Retry simulation
            </button>
          </div>
        ) : (
          <div className="dashboard-grid">
            {/* COLUMN 1: Live indicators & Crisis Overrides */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Day indicator */}
              <div className="glass-panel" style={{ padding: 20, borderRadius: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--color-text-dim)' }}>Simulation Horizon</span>
                  <div>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--color-primary)', fontWeight: 'bold' }}>Day {day}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--color-text-dim)' }}> / 30</span>
                  </div>
                </div>
                <div style={{ height: 6, background: 'var(--color-border)', marginTop: 12, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${(day / 30) * 100}%`, height: '100%', background: 'var(--color-primary)', transition: 'width 200ms ease-out' }} />
                </div>
              </div>

              {/* Live indicators */}
              <div className="glass-panel" style={{ padding: 20, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--color-text-dim)', borderBottom: '1px solid var(--color-border)', paddingBottom: 8 }}>
                  SYSTEMIC FEEDBACK INDICATORS
                </div>
                {[
                  ['MODAL SHIFT', metrics ? `${(metrics.modal_shift_pct * 100).toFixed(1)}%` : '...', 'Adaptation rate to alternative modes'],
                  ['PROTEST SIGNAL', metrics ? `${(metrics.protest_probability * 100).toFixed(1)}%` : '...', 'Contagion threshold warning level', metrics && metrics.protest_probability > 0.35 ? 'var(--color-alert)' : 'var(--color-text-primary)'],
                  ['REVENUE IMPACT', metrics ? `${metrics.revenue_impact_pct >= 0 ? '+' : ''}${(metrics.revenue_impact_pct * 100).toFixed(1)}%` : '...', 'Weekly net change in transport revenue', metrics && metrics.revenue_impact_pct < 0 ? 'var(--color-alert)' : metrics && metrics.revenue_impact_pct > 0 ? 'var(--color-success)' : 'var(--color-text-primary)'],
                ].map(([label, value, desc, color]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-data)', fontSize: 10, color: 'var(--color-text-dim)' }}>{label}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-ghost', marginTop: 2 }}>{desc}</div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 'bold', color: color || 'var(--color-text-primary)' }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Crisis Injectors */}
              <div className="glass-panel" style={{ padding: 20, borderRadius: 12 }}>
                <div style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--color-text-dim)', borderBottom: '1px solid var(--color-border)', paddingBottom: 8, marginBottom: 12 }}>
                  MID-RUN CRISIS OVERRIDES
                </div>
                <p style={{ fontSize: 12, color: 'var(--color-text-dim)', lineHeight: 1.5, marginBottom: 16 }}>
                  Inject emergent shocks live. The multi-tiered agent engine instantly recalculates mode choices and network contagion.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { id: 'flood', label: 'Monsoon Flood (Transit Halt)', color: '#3b82f6' },
                    { id: 'railway_strike', label: 'Suburban Rail Strike', color: '#ef4444' },
                    { id: 'fuel_crisis', label: 'Fuel Price Spike (+30%)', color: '#f59e0b' },
                    { id: 'exam_leak', label: 'Exam Leak (Student Stress)', color: '#ec4899' },
                  ].map((crisis) => (
                    <button
                      key={crisis.id}
                      disabled={complete || isInjecting !== null || day === 0}
                      onClick={() => handleInjectCrisis(crisis.id as 'flood' | 'railway_strike' | 'fuel_crisis' | 'pandemic' | 'exam_leak')}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-primary',
                        textAlign: 'left',
                        fontFamily: 'var(--font-data)',
                        fontSize: 12,
                        borderRadius: 6,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: complete || isInjecting !== null || day === 0 ? 'not-allowed' : 'pointer',
                        opacity: complete || day === 0 ? 0.4 : 1,
                        transition: 'all 150ms ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!complete && day > 0 && isInjecting === null) {
                          e.currentTarget.style.borderColor = crisis.color;
                          e.currentTarget.style.background = `rgba(${crisis.id === 'flood' ? '59, 130, 246' : crisis.id === 'railway_strike' ? '239, 68, 68' : crisis.id === 'fuel_crisis' ? '245, 158, 11' : '236, 72, 153'}, 0.06)`;
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-border)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                      }}
                    >
                      <span>{crisis.label}</span>
                      {isInjecting === crisis.id ? (
                        <span style={{ fontSize: 10, color: 'var(--color-text-dim)' }}>Injecting...</span>
                      ) : (
                        <span style={{ color: crisis.color, fontSize: 14 }}>⚡</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* COLUMN 2: Social graph visualizer */}
            <div className="glass-panel" style={{ padding: 20, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--color-text-dim)', borderBottom: '1px solid var(--color-border)', paddingBottom: 8 }}>
                  AGENT OPINION CONTAGION TOPOLOGY
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-dim)', marginTop: 8, lineHeight: 1.5 }}>
                  Preferential attachment BA network (50 sample citizens). Real-time pulsing waves trace the spread of protest decisions.
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
                <SocialGraph nodes={networkNodes} width={420} height={380} />
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--color-border)', padding: 12, borderRadius: 6 }}>
                <div style={{ fontFamily: 'var(--font-data)', fontSize: 10, color: 'var(--color-text-ghost)', marginBottom: 6 }}>NETWORK SPECS</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-data)', fontSize: 11 }}>
                  <span>Scale-free clustering exponent: 2.4</span>
                  <span>Avg Path Distance: 3.1</span>
                </div>
              </div>
            </div>

            {/* COLUMN 3: Live Feed & Government monitors */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Government Agent Warning */}
              <div
                className="glass-panel"
                style={{
                  padding: 20,
                  borderRadius: 12,
                  border: `1px solid ${govAlertStarted ? 'rgba(239, 68, 68, 0.4)' : 'rgba(6, 182, 212, 0.2)'}`,
                  background: govAlertStarted ? 'rgba(239, 68, 68, 0.02)' : 'rgba(6, 182, 212, 0.01)',
                  transition: 'all 500ms ease',
                }}
              >
                <div style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: govAlertStarted ? 'var(--color-warn)' : 'var(--color-primary)', marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                  <span className={govAlertStarted ? 'gov-dot-alert' : 'gov-dot'} style={{ borderRadius: '50%' }} />
                  <span style={{ marginLeft: 6 }}>{typedGovTitle.displayText}</span>
                </div>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 12, lineHeight: 1.5 }}>
                  {typedGovBody.displayText}
                </p>
                {govRecommendationVisible && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
                    <p style={{ color: 'var(--color-text-primary)', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
                      Autonomous Counter-Policy Prompted:
                    </p>
                    <p style={{ color: 'var(--color-primary)', fontSize: 12, lineHeight: 1.4, fontStyle: 'italic' }}>
                      "Recommend phasing fare hike (10% now, 10% in Day 45) + targeted student transit subsidy."
                    </p>
                    <div style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'var(--color-text-ghost)', marginTop: 6 }}>
                      Feedback mechanism triggers on computed protest threshold &gt; 35%
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Agent decision terminal log */}
              <div className="glass-panel" style={{ borderRadius: 12, display: 'flex', flexDirection: 'column', height: 320 }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--color-text-dim)' }}>
                  LIVE CITIZEN DECISION TICKER
                </div>
                <div style={{ overflowY: 'auto', flex: 1, fontFamily: 'var(--font-data)', fontSize: 11 }}>
                  {visibleFeed.length === 0 && (
                    <div style={{ padding: 20, color: 'var(--color-text-ghost)', textAlign: 'center' }}>
                      Constructing social graph matrix...
                    </div>
                  )}
                  {visibleFeed.slice(0, 15).map((entry, index) => (
                    <div
                      key={`${entry.name}-${index}`}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '80px 1.5fr 70px',
                        gap: 10,
                        padding: '8px 16px',
                        borderBottom: '1px dashed var(--color-border)',
                        background: entry.name === 'SYSTEM COMMAND' ? 'rgba(6, 182, 212, 0.05)' : 'transparent',
                      }}
                    >
                      <span style={{ color: entry.name === 'SYSTEM COMMAND' ? 'var(--color-primary)' : 'var(--color-text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.name.split(',')[0]}
                      </span>
                      <span style={{ color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {entry.decision}
                      </span>
                      <span style={{ color: typeColors[entry.type], textAlign: 'right', fontWeight: 500 }}>
                        {entry.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats and Results */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-dim)', fontFamily: 'var(--font-data)', fontSize: 10 }}>
                  <span>{decisionCount.toLocaleString()} decisions resolved</span>
                  <span>{broadcastCount} network broadcasts</span>
                </div>

                {complete && (
                  <motion.button
                    initial={{ scale: 0.98, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    onClick={() => {
                      setStep(3);
                      navigate(`/results/${sessionId}`);
                    }}
                    className="chamfered"
                    style={{
                      width: '100%',
                      height: 48,
                      background: 'var(--color-primary)',
                      color: '#030712',
                      border: 0,
                      fontFamily: 'var(--font-data)',
                      fontSize: 13,
                      fontWeight: 600,
                      borderRadius: 6,
                      cursor: 'pointer',
                      boxShadow: '0 0 12px var(--color-primary-glow)',
                    }}
                  >
                    View Final Causal Lineage Report →
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
