import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getCityById } from '../data/cityProfiles';
import { getPolicyById } from '../data/demoPolicies';
import type { AgentFeedEntry } from '../data/simulationData';
import { streamSimulation } from '../api/simulation';
import type { SimulationMetrics } from '../api/simulation';
import { useSimulationContext } from '../context/SimulationContext';
import { useTypewriter } from '../hooks/useTypewriter';

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
  const [alerts, setAlerts] = useState<string[]>([]);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState('');
  const [runKey, setRunKey] = useState(0);
  const [showPersonalizedEntry, setShowPersonalizedEntry] = useState(false);
  const [govAlertStarted, setGovAlertStarted] = useState(false);
  const [govRecommendationVisible, setGovRecommendationVisible] = useState(false);
  const [decisionCount, setDecisionCount] = useState(4847);
  const [broadcastCount, setBroadcastCount] = useState(23);
  const personalizedEntry = useMemo(() => firstPolicyEntry(policyText || ''), [policyText]);
  const visibleFeed = showPersonalizedEntry ? [personalizedEntry, ...feed] : feed;
  const govTitle = govAlertStarted ? 'GOVERNMENT AGENT — AUTONOMOUS ALERT FIRED' : 'GOVERNMENT AGENT · AUTONOMOUS MONITOR';
  const govBody = govAlertStarted
    ? `Protest probability in ${city?.name || 'selected zone'} has exceeded 35% threshold. Generating autonomous recommendation...`
    : alerts[0] || 'Monitoring computed protest, modal-shift, revenue, and equity thresholds.';
  const typedGovTitle = useTypewriter(govTitle, 30, govAlertStarted ? 300 : 0);
  const typedGovBody = useTypewriter(govBody, 30, govAlertStarted ? 2000 : 0);

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
            setGovAlertStarted((started) => started || true);
          }
          if (event.metrics) setMetrics(event.metrics);
          if (event.agent_feed) setFeed(event.agent_feed);
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
      style={{ minHeight: 'calc(100vh - 56px)', padding: '40px 24px 80px' }}
    >
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontFamily: 'var(--font-data)', color: '#00e5ff', fontSize: 11, letterSpacing: '0.1em' }}>
            REAL ENGINE · SSE STREAM · SEED 42
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 400, margin: '10px 0 6px' }}>
            {complete ? 'Simulation complete' : 'Simulation running'}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {city.name} · {policy?.label || 'Custom policy'} · {metrics?.total_agents || 10000} computed agents
          </p>
        </div>

        {error ? (
          <div style={{ border: '1px solid #ff0055', background: '#16070c', padding: 24, textAlign: 'center' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', color: '#ff0055', marginBottom: 8 }}>Simulation unavailable</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 18 }}>{error}</p>
            <button onClick={retry} className="chamfered" style={{ background: '#00e5ff', border: 0, padding: '12px 24px' }}>
              Retry simulation
            </button>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 32 }}>Day </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 72, color: '#00e5ff' }}>{day}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--color-text-dim)' }}> / 30</span>
              <div style={{ height: 8, background: '#1a1c20', marginTop: 14 }}>
                <div style={{ width: `${(day / 30) * 100}%`, height: '100%', background: '#00e5ff', transition: 'width 150ms' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
              {[
                ['MODAL SHIFT', metrics ? `${(metrics.modal_shift_pct * 100).toFixed(1)}%` : '...'],
                ['PROTEST SIGNAL', metrics ? `${(metrics.protest_probability * 100).toFixed(1)}%` : '...'],
                ['REVENUE IMPACT', metrics ? `${(metrics.revenue_impact_pct * 100).toFixed(1)}%` : '...'],
              ].map(([label, value]) => (
                <div key={label} style={{ background: '#111318', border: '1px solid #1e2d47', padding: 16 }}>
                  <div style={{ fontFamily: 'var(--font-data)', fontSize: 10, color: 'var(--color-text-dim)' }}>{label}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginTop: 5 }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ border: '1px solid #1e2d47', background: '#111318', marginBottom: 20 }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e2d47', fontFamily: 'var(--font-data)', fontSize: 11 }}>
                LIVE COMPUTED AGENT DECISIONS
              </div>
              {visibleFeed.length === 0 && <div style={{ padding: 20, color: 'var(--color-text-dim)' }}>Spawning agents and building social network...</div>}
              {visibleFeed.slice(0, 7).map((entry) => (
                <div key={`${entry.name}-${entry.decision}`} style={{ display: 'grid', gridTemplateColumns: '190px 1fr 100px', gap: 12, padding: '11px 16px', borderBottom: '1px solid #1e2d47' }}>
                  <span style={{ fontFamily: 'var(--font-data)', fontSize: 11 }}>{entry.name}</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{entry.decision}</span>
                  <span style={{ color: typeColors[entry.type] }}>{entry.type}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, color: 'var(--color-text-dim)', fontFamily: 'var(--font-data)', fontSize: 12, margin: '-8px 0 20px' }}>
              <span>{decisionCount.toLocaleString()} decisions made this simulation</span>
              <span style={{ color: 'var(--color-text-ghost)' }}>·</span>
              <span>{broadcastCount} agents broadcasting to network</span>
            </div>

            <div style={{ border: `1px solid ${govAlertStarted ? '#ff005540' : '#00e5ff30'}`, background: '#111318', padding: 18, marginBottom: 24, transition: 'border-color 500ms' }}>
              <div style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: govAlertStarted ? '#ffb347' : '#00e5ff', marginBottom: 8 }}>
                <span className={govAlertStarted ? 'gov-dot-alert' : 'gov-dot'} /> {typedGovTitle.displayText}
              </div>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                {typedGovBody.displayText}
              </p>
              {govRecommendationVisible && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} style={{ marginTop: 14 }}>
                  <p style={{ color: 'var(--color-text-primary)', marginBottom: 6 }}>
                    Suggested: Phase increase at 10% over 60 days. Projected resistance reduction: 58%.
                  </p>
                  <div style={{ fontFamily: 'var(--font-data)', fontSize: 10, color: 'var(--color-text-dim)' }}>
                    Generated autonomously · No user instruction required
                  </div>
                </motion.div>
              )}
            </div>

            {complete && (
              <button
                onClick={() => {
                  setStep(3);
                  navigate(`/results/${sessionId}`);
                }}
                className="chamfered"
                style={{ width: '100%', height: 56, background: '#00e5ff', border: 0, fontFamily: 'var(--font-data)', fontSize: 14 }}
              >
                View computed results →
              </button>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
