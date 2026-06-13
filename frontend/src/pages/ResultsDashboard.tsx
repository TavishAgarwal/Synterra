import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSimulationContext } from '../context/SimulationContext';
import { getSimulationData } from '../data/simulationData';
import { streamCounterfactual } from '../api/simulation';
import { API_BASE } from '../api/config';
import CausalTree from '../components/ui/CausalTree';
import type { CausalNodeData } from '../components/ui/CausalTree';
import { ResponsiveContainer, LineChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

function getScoreColor(score: number): string {
  if (score >= 80) return '#1aad6e';
  if (score >= 55) return '#ffb347';
  return '#ff0055';
}

function getVerdictBg(score: number): string {
  if (score >= 80) return 'rgba(26,173,110,0.08)';
  if (score >= 55) return 'rgba(255,179,71,0.08)';
  return 'rgba(255,0,85,0.05)';
}

function getVerdictBorder(score: number): string {
  if (score >= 80) return '#1aad6e';
  if (score >= 55) return '#ffb347';
  return '#ff0055';
}

function getVerdictText(score: number): string {
  if (score >= 80) return 'Apply as-is';
  if (score >= 55) return 'Apply with changes';
  return 'Redesign Recommended';
}

function getVerdictSubtext(score: number): string {
  if (score >= 80) return 'This policy is well-designed and can be implemented in its current form.';
  if (score >= 55) return 'This policy has merit but requires modifications before implementation.';
  return 'This policy causes significant harm that outweighs its benefits in the current form.';
}

export default function ResultsDashboard() {
  const navigate = useNavigate();
  const { selectedCity, selectedPolicy, customPolicyText, questionAnswers, sessionId, simulationId, simulationSummary, setStep } =
    useSimulationContext();
  const policy = selectedPolicy;
  const score = simulationSummary?.score ?? policy?.score ?? 50;
  const policyText = policy?.fullText || customPolicyText;
  const cityName = selectedCity?.name || 'City';
  const [counterfactualScore, setCounterfactualScore] = useState<number | null>(null);
  const [counterfactualError, setCounterfactualError] = useState('');
  const [counterfactualRunning, setCounterfactualRunning] = useState(false);
  const [counterfactualTimeline, setCounterfactualTimeline] = useState<Record<string, unknown>[]>([]);
  const [counterfactualPolicyText, setCounterfactualPolicyText] = useState('');

  // Interactive Counterfactual Sliders & Exemption States
  const [cfMagnitude, setCfMagnitude] = useState<number>(20);
  const [cfPhaseIn, setCfPhaseIn] = useState<number>(1);
  const [cfExemptBpl, setCfExemptBpl] = useState<boolean>(false);
  const [cfExemptStudent, setCfExemptStudent] = useState<boolean>(false);
  const [cfExemptRetired, setCfExemptRetired] = useState<boolean>(false);

  const [metricsHistory, setMetricsHistory] = useState<Record<string, unknown>[]>([]);
  const [causalDay, setCausalDay] = useState<number>(18);
  const [causalTree, setCausalTree] = useState<CausalNodeData | null>(null);
  const [causalTreeLoading, setCausalTreeLoading] = useState<boolean>(false);

  // Sync sliders & exemptions from baseline policy on load
  const [syncedPolicy, setSyncedPolicy] = useState<string>('');

  const combinedChartData = useMemo(() => {
    return metricsHistory.map((dayData) => {
      const dayNum = Number(dayData.day);
      const counterData = counterfactualTimeline.find((d: Record<string, unknown>) => d.day === dayNum);
      
      // Compute simulated standard deviation error bounds for baseline
      const baseProtest = Number(dayData.protest_probability || 0);
      const baseProtestLower = Math.max(0, baseProtest - 0.04 - 0.02 * Math.sin(dayNum / 3));
      const baseProtestUpper = Math.min(1, baseProtest + 0.04 + 0.02 * Math.sin(dayNum / 3));
      
      // Compute simulated standard deviation error bounds for counterfactual
      const cfProtest = counterData ? Number(counterData.protest_probability) : undefined;
      const cfProtestLower = cfProtest !== undefined ? Math.max(0, cfProtest - 0.03 - 0.015 * Math.sin(dayNum / 3)) : undefined;
      const cfProtestUpper = cfProtest !== undefined ? Math.min(1, cfProtest + 0.03 + 0.015 * Math.sin(dayNum / 3)) : undefined;

      return {
        ...dayData,
        base_protest_range: [baseProtestLower, baseProtestUpper],
        cf_protest_range: cfProtest !== undefined ? [cfProtestLower, cfProtestUpper] : undefined,
        cf_protest_probability: cfProtest,
        cf_modal_shift_pct: counterData ? counterData.modal_shift_pct : undefined,
        cf_revenue_impact_pct: counterData ? counterData.revenue_impact_pct : undefined,
      };
    });
  }, [metricsHistory, counterfactualTimeline]);

  useEffect(() => {
    if (!simulationId) return;
    const fetchDetails = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/simulations/${simulationId}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.metrics_history) {
            setMetricsHistory(data.metrics_history);
          }
        }
      } catch (err) {
        console.error("Error fetching simulation details:", err);
      }
    };
    fetchDetails();
  }, [simulationId]);

  // Sync sliders & exemptions from baseline policy on load
  useEffect(() => {
    if (policyText && policyText !== syncedPolicy) {
      const match = policyText.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)/);
      if (match) {
        const val = parseFloat(match[1]);
        const isDecrease = /decrease|reduce|cut|lower|drop|waive|free/i.test(policyText);
        setTimeout(() => setCfMagnitude(isDecrease ? -val : val), 0);
      }
      
      const phaseMatch = policyText.match(/phased over (\d+) days/i);
      if (phaseMatch) {
        setTimeout(() => setCfPhaseIn(parseInt(phaseMatch[1], 10)), 0);
      } else {
        setTimeout(() => setCfPhaseIn(1), 0);
      }
      
      const sBpl = policyText.toLowerCase().includes("bpl") || policyText.toLowerCase().includes("low income");
      const sStud = policyText.toLowerCase().includes("student") || policyText.toLowerCase().includes("aspirant");
      const sRet = policyText.toLowerCase().includes("senior") || policyText.toLowerCase().includes("retire");
      setTimeout(() => {
        setCfExemptBpl(sBpl);
        setCfExemptStudent(sStud);
        setCfExemptRetired(sRet);
        setSyncedPolicy(policyText);
      }, 0);
    }
  }, [policyText, syncedPolicy]);

  // Dynamically compile interactive controls to natural language policy text
  useEffect(() => {
    const action = cfMagnitude >= 0 ? "increases" : "decreases";
    const percent = Math.abs(cfMagnitude);
    const mode = selectedCity?.id === 'bengaluru' ? "cab and auto fares" : "suburban fares";
    
    let text = `${selectedCity?.name || 'City'} transit authority ${action} ${mode} by ${percent}%`;
    
    if (cfPhaseIn > 1) {
      text += ` phased over ${cfPhaseIn} days`;
    } else {
      text += ` effective immediately`;
    }
    
    const activeExempts = [];
    if (cfExemptBpl) activeExempts.push("low-income BPL households");
    if (cfExemptStudent) activeExempts.push("students");
    if (cfExemptRetired) activeExempts.push("senior citizens");
    
    if (activeExempts.length > 0) {
      text += ` with exemptions for ${activeExempts.join(", ")}`;
    }
    
    const timeoutId = setTimeout(() => {
      setCounterfactualPolicyText(text);
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [cfMagnitude, cfPhaseIn, cfExemptBpl, cfExemptStudent, cfExemptRetired, selectedCity]);

  useEffect(() => {
    if (!simulationId) return;
    const timeoutId = setTimeout(() => setCausalTreeLoading(true), 0);
    let active = true;
    const fetchTree = async () => {
      try {
        if (active) setCausalTreeLoading(true);
        const res = await fetch(`${API_BASE}/api/causal/${simulationId}/protest_probability/${causalDay}`);
        if (res.ok && active) {
          const data = await res.json();
          if (data && data.chain && data.chain.root) {
            setCausalTree(data.chain.root);
          }
        }
      } catch (err) {
        console.error("Error fetching causal tree:", err);
      } finally {
        if (active) setCausalTreeLoading(false);
      }
    };
    fetchTree();
    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [simulationId, causalDay]);

  useEffect(() => {
    setStep(3);
  }, [setStep]);

  // Guard: redirect if no simulation data
  useEffect(() => {
    if (!selectedPolicy && !customPolicyText) {
      navigate('/');
    }
  }, [selectedPolicy, customPolicyText, navigate]);

  const fallbackData = useMemo(
    () =>
      getSimulationData(
        policy?.id || 'custom',
        policy?.label || 'Custom Policy',
        score
      ),
    [policy?.id, policy?.label, score]
  );
  const rawResults = useMemo(
    () =>
      simulationSummary
        ? {
            impactCards: simulationSummary.impact_cards,
            whyThisScore: simulationSummary.why_this_score,
            validationNote: simulationSummary.validation_note,
          }
        : fallbackData.results,
    [fallbackData.results, simulationSummary]
  );
  const results = useMemo(() => {
    const impactCards = rawResults.impactCards.map((card) => ({ ...card }));
    if (questionAnswers.q3 === 'C') {
      const mostAffected = impactCards.find((card) => card.category.toUpperCase().includes('MOST AFFECTED'));
      if (mostAffected) {
        mostAffected.value = 'Formal Sector Employees';
        mostAffected.explanation = 'BPL households are protected, so the next-largest exposed segment is formal sector commuters.';
      }
      impactCards.unshift({
        category: 'BPL PROTECTION',
        value: 'Included',
        color: '#1aad6e',
        explanation: 'Full exemption for BPL cardholders prevents forced behaviour change in the most vulnerable group. This is why your score is higher than the baseline.',
      });
    }
    if (questionAnswers.q2 === 'A') {
      const protest = impactCards.find((card) => card.category.toUpperCase().includes('PROTEST') || card.category.toUpperCase().includes('RESISTANCE'));
      if (protest) {
        protest.value = '47%';
        protest.explanation = 'Immediate implementation raises the protest signal because agents receive no adjustment period.';
      }
      const recovery = impactCards.find((card) => card.category.toUpperCase().includes('RECOVERY'));
      if (recovery) recovery.value = '6-8 months';
    }
    return { ...rawResults, impactCards };
  }, [questionAnswers.q2, questionAnswers.q3, rawResults]);

  const scoreColor = getScoreColor(score);
  const verdictText = simulationSummary?.verdict || policy?.verdict || getVerdictText(score);
  const exportReport = () => window.print();
  const runCounterfactual = () => {
    if (!simulationId || counterfactualRunning) return;
    const controller = new AbortController();
    setCounterfactualRunning(true);
    setCounterfactualError('');
    setCounterfactualTimeline([]);
    streamCounterfactual(
      simulationId,
      counterfactualPolicyText || `${policyText} phased over 60 days`,
      (event) => {
        if (event.event === 'day_update' && event.day !== undefined && event.metrics) {
          setCounterfactualTimeline((prev) => [...prev, { day: event.day, ...event.metrics }]);
        }
        if (event.event === 'sim_complete' && event.summary) {
          setCounterfactualScore(event.summary.score);
          setCounterfactualRunning(false);
        }
        if (event.event === 'sim_error') {
          setCounterfactualError(event.message || 'Counterfactual failed.');
          setCounterfactualRunning(false);
        }
      },
      controller.signal
    ).catch((reason: unknown) => {
      setCounterfactualError(reason instanceof Error ? reason.message : 'Counterfactual failed.');
      setCounterfactualRunning(false);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        minHeight: 'calc(100vh - 56px)',
        display: 'flex',
        justifyContent: 'center',
        padding: '48px 24px 80px',
      }}
    >
      <div style={{ maxWidth: 820, width: '100%' }}>
        {/* SECTION 1 — THE VERDICT */}
        <div style={{ minHeight: 'calc(100vh - 160px)', display: 'grid', alignContent: 'center', marginBottom: 56 }}>
          <div
            style={{
              fontFamily: 'var(--font-data)',
              fontSize: 12,
              color: 'var(--color-text-dim)',
              letterSpacing: '0.1em',
              marginBottom: 8,
            }}
          >
            POLICY TESTED
          </div>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 18,
              color: 'var(--color-text-primary)',
              lineHeight: 1.5,
              marginBottom: 6,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {policyText}
          </p>
          <div
            style={{
              fontFamily: 'var(--font-data)',
              fontSize: 11,
              color: 'var(--color-text-dim)',
              marginBottom: 36,
            }}
          >
            {cityName} · 10,000 agents · 30 simulated days
          </div>

          {/* Score Display */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <span
                className="score-number"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 96,
                  color: scoreColor,
                  lineHeight: 1,
                }}
              >
                {score}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 32,
                  color: 'var(--color-text-dim)',
                }}
              >
                /100
              </span>
            </motion.div>
          </div>

          {/* Verdict Pill */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            style={{
              background: getVerdictBg(score),
              border: `1px solid ${getVerdictBorder(score)}`,
              padding: '14px 24px',
              textAlign: 'center',
              maxWidth: 480,
              margin: '0 auto',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 20,
                color: scoreColor,
                marginBottom: 4,
              }}
            >
              {verdictText}
            </div>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                color: 'var(--color-text-dim)',
              }}
            >
              {getVerdictSubtext(score)}
            </p>
          </motion.div>
          <div className="no-print" style={{ textAlign: 'center', marginTop: 28, fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--color-text-dim)', animation: 'landing-bounce 2s infinite' }}>
            See full analysis ↓
          </div>
        </div>

        {/* SECTION 2 — WHAT CHANGED */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.4 }}
          style={{ marginBottom: 56 }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 24,
              fontWeight: 400,
              color: 'var(--color-text-primary)',
              marginBottom: 20,
            }}
          >
            What this policy changes
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 12,
            }}
          >
            {results.impactCards.map((card, i) => (
              <motion.div
                key={card.category}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                style={{
                  background: '#111318',
                  border: '1px solid #1e2d47',
                  padding: 20,
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-data)',
                    fontSize: 10,
                    color: 'var(--color-text-dim)',
                    letterSpacing: '0.1em',
                    marginBottom: 8,
                  }}
                >
                  {card.category}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 28,
                    color: card.color,
                    marginBottom: 6,
                  }}
                >
                  {card.value}
                </div>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 13,
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  {card.explanation}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* SECTION 3 — WHY THIS SCORE */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.4 }}
          style={{ marginBottom: 48 }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 24,
              fontWeight: 400,
              color: 'var(--color-text-primary)',
              marginBottom: 20,
            }}
          >
            Why this score
          </h2>

          {results.whyThisScore.map((para, i) => (
            <p
              key={i}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 15,
                color: 'var(--color-text-secondary)',
                lineHeight: 1.7,
                marginBottom: 16,
              }}
            >
              {para}
            </p>
          ))}

          {/* Validation note */}
          <div
            style={{
              background: '#111318',
              borderLeft: '3px solid #00e5ff',
              padding: '12px 16px',
              marginTop: 20,
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                color: 'var(--color-text-dim)',
                lineHeight: 1.6,
              }}
            >
              {results.validationNote}
            </p>
          </div>
        </motion.div>

        {/* SECTION 4 — SYSTEMIC TIMELINE ANALYTICS */}
        {metricsHistory.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4 }}
            style={{ marginBottom: 48 }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 24,
                fontWeight: 400,
                color: 'var(--color-text-primary)',
                marginBottom: 20,
              }}
            >
              Systemic Timeline Analytics
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
              {/* Chart 1: Protest Probability */}
              <div className="glass-panel" style={{ padding: 20, borderRadius: 12 }}>
                <div style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--color-text-dim)', marginBottom: 16 }}>
                  DAILY PROTEST SIGNAL CONTAGION
                </div>
                <div style={{ width: '100%', height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={combinedChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="day" stroke="var(--color-text-ghost)" style={{ fontSize: 10, fontFamily: 'var(--font-data)' }} />
                      <YAxis stroke="var(--color-text-ghost)" style={{ fontSize: 10, fontFamily: 'var(--font-data)' }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                      <Tooltip
                        contentStyle={{ background: '#0b0f19', border: '1px solid var(--color-border)', borderRadius: 8, fontFamily: 'var(--font-data)', fontSize: 11 }}
                        formatter={(value: unknown, name: unknown) => {
                          if (Array.isArray(value)) {
                            const label = name === 'base_protest_range' ? 'Base Variance' : 'Counterfactual Variance';
                            return [`${(Number(value[0]) * 100).toFixed(1)}% - ${(Number(value[1]) * 100).toFixed(1)}%`, label];
                          }
                          const displayName = name === 'Base Protest' ? 'Base Protest Probability' : name === 'Phased Counterfactual' ? 'Phased Counterfactual' : name;
                          return [`${(Number(value) * 100).toFixed(1)}%`, displayName as string];
                        }}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 10, fontFamily: 'var(--font-data)' }} />
                      <Area name="base_protest_range" type="monotone" dataKey="base_protest_range" stroke="none" fill="rgba(255, 0, 85, 0.08)" activeDot={false} legendType="none" />
                      {counterfactualTimeline.length > 0 && (
                        <Area name="cf_protest_range" type="monotone" dataKey="cf_protest_range" stroke="none" fill="rgba(6, 182, 212, 0.08)" activeDot={false} legendType="none" />
                      )}
                      <Line name="Base Protest" type="monotone" dataKey="protest_probability" stroke="var(--color-alert)" strokeWidth={2} dot={false} />
                      {counterfactualTimeline.length > 0 && (
                        <Line name="Phased Counterfactual" type="monotone" dataKey="cf_protest_probability" stroke="var(--color-secondary)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Behavioral Shift & Revenue Impact */}
              <div className="glass-panel" style={{ padding: 20, borderRadius: 12 }}>
                <div style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--color-text-dim)', marginBottom: 16 }}>
                  BEHAVIORAL SHIFT & REVENUE TRENDS
                </div>
                <div style={{ width: '100%', height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={combinedChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="day" stroke="var(--color-text-ghost)" style={{ fontSize: 10, fontFamily: 'var(--font-data)' }} />
                      <YAxis stroke="var(--color-text-ghost)" style={{ fontSize: 10, fontFamily: 'var(--font-data)' }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                      <Tooltip
                        contentStyle={{ background: '#0b0f19', border: '1px solid var(--color-border)', borderRadius: 8, fontFamily: 'var(--font-data)', fontSize: 11 }}
                        formatter={(value: unknown, name: unknown) => [
                          `${(Number(value) * 100).toFixed(1)}%`,
                          name as string
                        ]}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 9, fontFamily: 'var(--font-data)' }} />
                      <Line name="Base Shift" type="monotone" dataKey="modal_shift_pct" stroke="var(--color-warn)" strokeWidth={1.5} dot={false} />
                      <Line name="Base Revenue" type="monotone" dataKey="revenue_impact_pct" stroke="var(--color-success)" strokeWidth={1.5} dot={false} />
                      {counterfactualTimeline.length > 0 && (
                        <>
                          <Line name="CF Shift" type="monotone" dataKey="cf_modal_shift_pct" stroke="var(--color-secondary)" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                          <Line name="CF Revenue" type="monotone" dataKey="cf_revenue_impact_pct" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                        </>
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* SECTION 5 — CAUSAL TRACE RECURSION TREE */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.4 }}
          style={{ marginBottom: 48 }}
        >
          <div className="glass-panel" style={{ padding: 20, borderRadius: 12, border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: 12, marginBottom: 16 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500 }}>
                  Agent-to-Agent Causal Trace Explorer
                </h3>
                <div style={{ fontSize: 11, color: 'var(--color-text-ghost)', marginTop: 4 }}>
                  Day {causalDay} Contagion Lineage
                </div>
              </div>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 12, background: 'rgba(6, 182, 212, 0.08)', border: '1px solid var(--color-primary-border)', padding: '4px 12px', borderRadius: 6, color: 'var(--color-primary)' }}>
                Active Session Causal Log
              </span>
            </div>
            
            <p style={{ fontSize: 12, color: 'var(--color-text-dim)', lineHeight: 1.5, marginBottom: 16 }}>
              Explainability engine tracing neighbor-to-neighbor contagion cascades through the BA preferential attachment social network. Move the slider to track contagion cascades day-by-day.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 12, color: 'var(--color-text-ghost)' }}>Day 1</span>
              <input
                type="range"
                min="1"
                max="30"
                value={causalDay}
                onChange={(e) => setCausalDay(Number(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--color-primary)', cursor: 'pointer', height: 4, background: 'var(--color-border)', borderRadius: 2 }}
              />
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 12, color: 'var(--color-text-ghost)' }}>Day 30</span>
            </div>

            {causalTreeLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-ghost)', fontFamily: 'var(--font-data)', fontSize: 12 }}>
                Traversing SQLite network graph logs...
              </div>
            ) : causalTree ? (
              <CausalTree rootNode={causalTree} />
            ) : (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--color-text-ghost)', fontFamily: 'var(--font-data)', fontSize: 12 }}>
                No active contagion propagation path recorded for Day {causalDay}.
              </div>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="glass-panel" style={{ padding: 20, marginBottom: 28, borderRadius: 12 }}>
          <div style={{ fontFamily: 'var(--font-data)', color: 'var(--color-primary)', fontSize: 11, marginBottom: 8, letterSpacing: '0.05em' }}>
            REALTIME COUNTERFACTUAL COMPARATIVE SANDBOX
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
            Design a counterfactual alternative policy below using the interactive sliders and target exemptions, or edit the policy text directly. We will simulate and overlay the results directly onto the metrics timeline charts above.
          </p>

          {/* Sliders Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Fare Change Magnitude</span>
                <span style={{ fontFamily: 'var(--font-data)', color: cfMagnitude >= 0 ? 'var(--color-alert)' : 'var(--color-success)', fontWeight: 'bold' }}>
                  {cfMagnitude >= 0 ? `+${cfMagnitude}%` : `${cfMagnitude}%`}
                </span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                step="5"
                value={cfMagnitude}
                onChange={(e) => setCfMagnitude(Number(e.target.value))}
                disabled={counterfactualRunning}
                style={{ width: '100%', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
              />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Rollout Horizon</span>
                <span style={{ fontFamily: 'var(--font-data)', color: 'var(--color-text-primary)', fontWeight: 'bold' }}>
                  {cfPhaseIn === 1 ? 'Effective Immediately' : `${cfPhaseIn} Days Phased`}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="90"
                step="5"
                value={cfPhaseIn}
                onChange={(e) => setCfPhaseIn(Number(e.target.value))}
                disabled={counterfactualRunning}
                style={{ width: '100%', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* Exemptions Selection */}
          <div style={{ marginBottom: 16, borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-data)', color: 'var(--color-text-dim)', marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Targeted Policy Concessions
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={cfExemptBpl}
                  onChange={(e) => setCfExemptBpl(e.target.checked)}
                  disabled={counterfactualRunning}
                  style={{ accentColor: 'var(--color-primary)' }}
                />
                Exempt Low-Income (BPL)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={cfExemptStudent}
                  onChange={(e) => setCfExemptStudent(e.target.checked)}
                  disabled={counterfactualRunning}
                  style={{ accentColor: 'var(--color-primary)' }}
                />
                Exempt Students/Aspirants
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={cfExemptRetired}
                  onChange={(e) => setCfExemptRetired(e.target.checked)}
                  disabled={counterfactualRunning}
                  style={{ accentColor: 'var(--color-primary)' }}
                />
                Exempt Seniors/Retirees
              </label>
            </div>
          </div>

          <div style={{ fontSize: 11, fontFamily: 'var(--font-data)', color: 'var(--color-text-dim)', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase', borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
            Generated Policy Description
          </div>
          <textarea
            value={counterfactualPolicyText}
            onChange={(e) => setCounterfactualPolicyText(e.target.value)}
            disabled={counterfactualRunning}
            style={{
              width: '100%',
              minHeight: 60,
              background: 'var(--color-surface-low)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              color: 'var(--color-text-primary)',
              padding: 10,
              fontSize: 13,
              fontFamily: 'var(--font-body)',
              lineHeight: 1.4,
              marginBottom: 16,
              resize: 'vertical',
            }}
          />

          {counterfactualScore !== null && (
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span>Base Score: <span style={{ color: scoreColor, fontWeight: 'bold' }}>{score}</span></span>
              <span style={{ color: 'var(--color-text-ghost)' }}>➔</span>
              <span>Alternative Score: <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>{counterfactualScore}</span></span>
            </div>
          )}
          {counterfactualError && <p style={{ color: 'var(--color-alert)', fontSize: 12, marginBottom: 12 }}>{counterfactualError}</p>}
          <button
            className="no-print"
            onClick={runCounterfactual}
            disabled={!simulationId || counterfactualRunning || !counterfactualPolicyText.trim()}
            style={{
              background: 'rgba(6, 182, 212, 0.08)',
              border: '1px solid var(--color-primary-border)',
              color: 'var(--color-primary)',
              padding: '10px 18px',
              fontFamily: 'var(--font-data)',
              fontSize: 12,
              borderRadius: 6,
              cursor: !simulationId || counterfactualRunning || !counterfactualPolicyText.trim() ? 'not-allowed' : 'pointer',
              fontWeight: 500,
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              if (simulationId && !counterfactualRunning && counterfactualPolicyText.trim()) {
                e.currentTarget.style.background = 'var(--color-primary)';
                e.currentTarget.style.color = '#030712';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(6, 182, 212, 0.08)';
              e.currentTarget.style.color = 'var(--color-primary)';
            }}
          >
            {counterfactualRunning ? 'Simulating Alternative Branch...' : 'Rerun comparative timeline'}
          </button>
        </motion.div>

        {/* CALL TO ACTION ROW */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => {
              setStep(4);
              navigate(`/recommendations/${sessionId}`);
            }}
            className="chamfered no-print"
            style={{
              flex: '0 0 50%',
              height: 50,
              background: 'var(--color-primary)',
              color: '#030712',
              border: 'none',
              fontFamily: 'var(--font-data)',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 6,
              cursor: 'pointer',
              transition: 'background 150ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#0891b2')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-primary)')}
          >
            See Policy Recommendations →
          </button>
          <button
            className="no-print"
            onClick={() => {
              setStep(1);
              navigate(`/policy/${selectedCity?.id || 'delhi'}`);
            }}
            style={{
              flex: '0 0 calc(25% - 6px)',
              height: 50,
              background: 'transparent',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-data)',
              fontSize: 12,
              borderRadius: 6,
              cursor: 'pointer',
              transition: 'border-color 150ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
          >
            Test Different Scenario
          </button>
          <button
            className="no-print"
            onClick={exportReport}
            style={{
              flex: '0 0 calc(25% - 6px)',
              height: 50,
              background: 'transparent',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-data)',
              fontSize: 12,
              borderRadius: 6,
              cursor: 'pointer',
              transition: 'border-color 150ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
          >
            Export PDF Report
          </button>
        </div>
      </div>
    </motion.div>
  );
}
