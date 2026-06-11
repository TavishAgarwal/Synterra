import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSimulationContext } from '../context/SimulationContext';
import { getSimulationData, type ResultsImpactCard } from '../data/simulationData';
import { streamCounterfactual } from '../api/simulation';
import HeatmapPanel from '../components/ui/HeatmapPanel';

function getScoreColor(score: number): string {
  if (score >= 80) return '#00c853'; // --sn-confirm-green
  if (score >= 55) return '#ff9500'; // --sn-alert-amber
  return '#ff3b30'; // --sn-alert-red
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

// Custom hook/component to count up a number inside a string
function AnimatedMetricValue({ value, color }: { value: string | number; color?: string }) {
  const valueStr = String(value);
  const match = useMemo(() => valueStr.match(/([+-]?\d+(?:\.\d+)?)/), [valueStr]);

  // Compute the starting state correctly during rendering to avoid calling setState synchronously in useEffect
  const initialValue = useMemo(() => {
    if (!match) return valueStr;
    const numStr = match[1];
    const startStr = valueStr.substring(0, match.index);
    const endStr = valueStr.substring(match.index! + numStr.length);
    const numStrZero = numStr.includes('.') ? '0.' + '0'.repeat((numStr.split('.')[1] || '').length) : '0';
    const sign = numStr.startsWith('+') ? '+' : '';
    return startStr + sign + numStrZero + endStr;
  }, [valueStr, match]);

  const [displayValue, setDisplayValue] = useState(initialValue);
  const [prevInitialValue, setPrevInitialValue] = useState(initialValue);

  if (initialValue !== prevInitialValue) {
    setPrevInitialValue(initialValue);
    setDisplayValue(initialValue);
  }

  useEffect(() => {
    if (!match) return;

    const numStr = match[1];
    const targetNum = parseFloat(numStr);
    const startStr = valueStr.substring(0, match.index);
    const endStr = valueStr.substring(match.index! + numStr.length);

    const startNum = 0;
    const duration = 1000;
    const startTime = Date.now();

    const timer = setInterval(() => {
      const timePassed = Date.now() - startTime;
      const progress = Math.min(timePassed / duration, 1);
      const easedProgress = progress * (2 - progress); // easeOutQuad
      const current = startNum + (targetNum - startNum) * easedProgress;

      const decimalPlaces = numStr.includes('.') ? (numStr.split('.')[1] || '').length : 0;
      const formattedNum = current.toFixed(decimalPlaces);
      const sign = (targetNum >= 0 && numStr.startsWith('+')) ? '+' : '';
      const displayFormatted = sign + formattedNum;

      setDisplayValue(startStr + displayFormatted + endStr);

      if (progress >= 1) {
        clearInterval(timer);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [valueStr, match]);

  return <span style={{ color }}>{displayValue}</span>;
}

// Simple CountUp helper for raw numbers
function CountUp({ to, duration = 1000 }: { to: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const end = to;
    if (end === 0) {
      return;
    }

    const startTime = Date.now();

    const timer = setInterval(() => {
      const timePassed = Date.now() - startTime;
      const progress = Math.min(timePassed / duration, 1);
      const easedProgress = progress * (2 - progress); // easeOutQuad
      const current = Math.round(end * easedProgress);

      setCount(current);

      if (progress >= 1) {
        clearInterval(timer);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [to, duration]);

  return <>{count}</>;
}

interface TempZone {
  zone_id?: string;
  zone_name?: string;
  category?: string;
  value?: string;
  metrics?: {
    sentiment: number;
    protest_probability: number;
    modal_shift_pct: number;
  };
  total_agents?: number;
}

interface SavedScenario {
  id: string;
  scenarioName: string;
  city: string;
  policyName: string;
  timestamp: number;
  policyScore: number;
  approval: string;
  protestRisk: string;
  employmentChange: string;
  economicImpact: string;
  stressIndex: string;
  recommendation: string;
  confidence: number;
  zoneSummary: Array<{
    zone_id: string;
    zone_name: string;
    sentiment: number;
    protest_probability: number;
    modal_shift_pct: number;
    total_agents: number;
  }>;
}

export default function ResultsDashboard() {
  const navigate = useNavigate();
  const { selectedCity, selectedPolicy, customPolicyText, questionAnswers, sessionId, simulationId, simulationSummary, setStep } =
    useSimulationContext();
  const [counterfactualScore, setCounterfactualScore] = useState<number | null>(null);
  const [counterfactualError, setCounterfactualError] = useState('');
  const [counterfactualRunning, setCounterfactualRunning] = useState(false);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [customScenarioName, setCustomScenarioName] = useState('');
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>(() => {
    try {
      const stored = localStorage.getItem('sn-saved-scenarios');
      return stored ? (JSON.parse(stored) as SavedScenario[]) : [];
    } catch {
      return [];
    }
  });
  const [showSavedSuccess, setShowSavedSuccess] = useState(false);

  useEffect(() => {
    setStep(3);
  }, [setStep]);

  // Guard: redirect if no simulation data
  useEffect(() => {
    if (!selectedPolicy && !customPolicyText) {
      navigate('/');
    }
  }, [selectedPolicy, customPolicyText, navigate]);

  const policy = selectedPolicy;
  const score = simulationSummary?.score ?? policy?.score ?? 50;
  const policyText = policy?.fullText || customPolicyText;
  const cityName = selectedCity?.name || 'City';
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
        color: '#00c853',
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

  const outcomeConfig = useMemo(() => {
    const confidence = Math.max(10, Math.min(99, Math.round(score * 1.05 + (100 - score) * 0.1)));
    if (score >= 70) {
      return {
        bgStart: 'rgba(0, 200, 83, 0.1)',
        bgEnd: 'rgba(0, 200, 83, 0.02)',
        border: '#00c853',
        color: '#00c853',
        icon: '🟢',
        status: 'RECOMMENDED',
        confidence,
        explanation: 'Projected positive impact with manageable risk. The policy adaptation indicators demonstrate stability.',
        risk: 'Low',
        riskColor: '#00c853',
        shadowColor: 'rgba(0, 200, 83, 0.12)'
      };
    } else if (score >= 50) {
      return {
        bgStart: 'rgba(255, 149, 0, 0.1)',
        bgEnd: 'rgba(255, 149, 0, 0.02)',
        border: '#ff9500',
        color: '#ff9500',
        icon: '🟡',
        status: 'REVIEW REQUIRED',
        confidence,
        explanation: 'Mixed outcomes detected. Social friction and stress trigger warning levels. Restructuring recommended.',
        risk: 'Medium',
        riskColor: '#ff9500',
        shadowColor: 'rgba(255, 149, 0, 0.12)'
      };
    } else {
      return {
        bgStart: 'rgba(255, 59, 48, 0.1)',
        bgEnd: 'rgba(255, 59, 48, 0.02)',
        border: '#ff3b30',
        color: '#ff3b30',
        icon: '🔴',
        status: 'NOT RECOMMENDED',
        confidence,
        explanation: 'Critical social resistance and economic cascade risks detected. Immediate redesign required.',
        risk: 'High Risk',
        riskColor: '#ff3b30',
        shadowColor: 'rgba(255, 59, 48, 0.12)'
      };
    }
  }, [score]);

  const lastMetrics = results.impactCards || [];
  const protestVal = lastMetrics.find((c: ResultsImpactCard) => c.category.toUpperCase().includes('PROTEST') || c.category.toUpperCase().includes('RESISTANCE'))?.value || `${(score < 55 ? 38 : 12)}%`;
  const revenueVal = lastMetrics.find((c: ResultsImpactCard) => c.category.toUpperCase().includes('REVENUE'))?.value || `+₹180 Cr/mo`;

  // Parse or extract economic value for the KPI grid
  const econMetric = lastMetrics.find((c: ResultsImpactCard) =>
    c.category.toUpperCase() === 'ECONOMIC IMPACT' ||
    c.category.toUpperCase() === 'ECONOMIC EFFECT' ||
    c.category.toUpperCase().includes('ECONOMIC')
  );
  const econVal = econMetric ? econMetric.value : revenueVal;
  const econColor = econMetric?.color || '#00c853';

  // Construct 5 primary KPI cards
  const kpis = useMemo(() => [
    { label: 'Policy Score', value: `${score} / 100`, color: scoreColor },
    { label: 'Approval', value: `${Math.round(score * 0.8 + 10)}%`, color: scoreColor },
    { label: 'Economic Impact', value: econVal, color: econColor },
    { label: 'Public Stress', value: protestVal, color: score < 55 ? '#ff3b30' : '#ff9500' },
    { label: 'Confidence', value: `${outcomeConfig.confidence}%`, color: '#00d4ff' }
  ], [score, scoreColor, econVal, econColor, protestVal, outcomeConfig.confidence]);

  const defaultScenarioName = useMemo(() => {
    const policyLabel = policy?.label || 'Custom Policy';
    return `${cityName} · ${policyLabel} (Score ${score})`;
  }, [cityName, policy, score]);

  const handleSaveScenario = () => {
    const finalName = customScenarioName.trim() || defaultScenarioName;
    const newScenario = {
      id: simulationId || `scenario-${Date.now()}`,
      scenarioName: finalName,
      city: cityName,
      policyName: policy?.label || 'Custom Policy',
      timestamp: Date.now(),
      policyScore: score,
      approval: `${Math.round(score * 0.8 + 10)}%`,
      protestRisk: protestVal,
      employmentChange: `${(score >= 80 ? '+2.1%' : score >= 55 ? '-0.8%' : '-4.3%')}`,
      economicImpact: econVal,
      stressIndex: protestVal,
      recommendation: outcomeConfig.status,
      confidence: outcomeConfig.confidence,
      zoneSummary: (simulationSummary?.zones || results.impactCards || []).map((z: TempZone) => ({
        zone_id: z.zone_id || z.category || `zone-${Math.random().toString(36).substring(2, 6)}`,
        zone_name: z.zone_name || z.category || 'Zone',
        sentiment: z.metrics?.sentiment ?? (z.value?.includes('%') ? parseFloat(z.value) / 100 * 2 - 1 : 0),
        protest_probability: z.metrics?.protest_probability ?? (z.value?.includes('%') ? parseFloat(z.value) / 100 : 0.2),
        modal_shift_pct: z.metrics?.modal_shift_pct ?? 0.15,
        total_agents: z.total_agents ?? 1000
      }))
    };

    const updated = [newScenario, ...savedScenarios.filter((s: SavedScenario) => s.id !== newScenario.id)];
    localStorage.setItem('sn-saved-scenarios', JSON.stringify(updated));
    setSavedScenarios(updated);
    setIsSaveModalOpen(false);
    setShowSavedSuccess(true);
    setTimeout(() => setShowSavedSuccess(false), 3000);
  };

  const exportReport = () => window.print();

  const runCounterfactual = () => {
    if (!simulationId || counterfactualRunning) return;
    const controller = new AbortController();
    setCounterfactualRunning(true);
    setCounterfactualError('');
    streamCounterfactual(
      simulationId,
      `${policyText} phased over 60 days`,
      (event) => {
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
        background: 'var(--sn-bg-primary)',
      }}
    >
      <div style={{ maxWidth: 820, width: '100%' }}>
        
        {/* COMPUTED RESULTS HEADER CARD */}
        <div style={{
          background: 'linear-gradient(135deg, var(--sn-bg-secondary), var(--sn-bg-card))',
          border: '1px solid var(--sn-border)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}>
          {/* Cyber Grid/Scanline effects */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03))',
            backgroundSize: '100% 4px, 6px 100%',
            pointerEvents: 'none',
            opacity: 0.3
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.2em',
              color: 'var(--sn-accent-cyan)',
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: '6px',
              fontWeight: 600
            }}>
              Simulation Complete
            </span>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 24,
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '0.04em',
              margin: 0,
            }}>
              COMPUTED POLICY RESULTS
            </h1>
          </div>
          {/* Status light */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 1 }}>
            <span className="status-dot status-live" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--sn-text-secondary)', letterSpacing: '0.05em' }}>
              SECURE LINK ACTIVE
            </span>
          </div>
        </div>

        {/* SCENARIO ACTIONS BAR */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--sn-border)',
          borderRadius: '8px',
          padding: '12px 18px',
          marginBottom: '32px',
          gap: 12,
          flexWrap: 'wrap',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, color: 'var(--sn-text-secondary)' }}>
              Scenario Comparison:
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '2px 8px',
              borderRadius: '4px',
              color: '#ffffff',
              fontWeight: 600
            }}>
              {savedScenarios.length} saved
            </span>
          </div>

          <div style={{ display: 'flex', gap: 12, marginLeft: 'auto' }}>
            <button
              onClick={() => {
                setCustomScenarioName(defaultScenarioName);
                setIsSaveModalOpen(true);
              }}
              style={{
                background: 'transparent',
                border: '1px solid var(--sn-border)',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: '6px',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--sn-accent-cyan)';
                e.currentTarget.style.color = 'var(--sn-accent-cyan)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--sn-border)';
                e.currentTarget.style.color = '#ffffff';
              }}
            >
              💾 Save Scenario
            </button>
            
            {savedScenarios.length >= 2 && (
              <button
                onClick={() => navigate('/compare')}
                style={{
                  background: 'var(--sn-accent-cyan)',
                  border: '1px solid var(--sn-accent-cyan)',
                  color: '#0a0f1e',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 2px 8px rgba(0, 229, 255, 0.2)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#33edff';
                  e.currentTarget.style.borderColor = '#33edff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--sn-accent-cyan)';
                  e.currentTarget.style.borderColor = 'var(--sn-accent-cyan)';
                }}
              >
                📊 Compare Scenarios ({savedScenarios.length}) &rarr;
              </button>
            )}
          </div>
        </div>

        {/* SAVE SUCCESS BANNER */}
        {showSavedSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              background: 'rgba(0, 200, 83, 0.1)',
              border: '1px solid var(--sn-confirm-green)',
              borderRadius: '8px',
              padding: '12px 18px',
              marginBottom: '24px',
              color: '#ffffff',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'var(--font-mono)'
            }}
          >
            <span style={{ fontSize: 16 }}>🟢</span> Scenario saved successfully! Compare it with other runs.
          </motion.div>
        )}

        {/* 1. OUTCOME BANNER */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          style={{
            background: `linear-gradient(135deg, ${outcomeConfig.bgStart}, ${outcomeConfig.bgEnd})`,
            border: `2px solid ${outcomeConfig.border}`,
            borderRadius: '12px',
            padding: '28px',
            marginBottom: '32px',
            boxShadow: `0 0 30px ${outcomeConfig.shadowColor}`,
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 28 }}>{outcomeConfig.icon}</span>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: 24,
                fontWeight: 800,
                color: outcomeConfig.color,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                textShadow: `0 0 10px ${outcomeConfig.border}40`
              }}>
                {outcomeConfig.status}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                color: 'var(--sn-text-secondary)',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--sn-border)',
                padding: '6px 12px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                Confidence: <span style={{ color: '#ffffff', fontWeight: 700 }}><CountUp to={outcomeConfig.confidence} />%</span>
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                color: 'var(--sn-text-secondary)',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--sn-border)',
                padding: '6px 12px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                Risk: <span style={{ color: outcomeConfig.riskColor, fontWeight: 700 }}>{outcomeConfig.risk}</span>
              </div>
            </div>
          </div>

          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 15,
            color: 'var(--sn-text-primary)',
            lineHeight: 1.6,
            marginTop: '16px',
            marginBottom: 0,
            fontWeight: 500
          }}>
            {outcomeConfig.explanation}
          </p>
        </motion.div>

        {/* 2. POLICY SCORE DISPLAY */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{
            marginBottom: '32px',
            background: 'var(--sn-bg-secondary)',
            border: '1px solid var(--sn-border)',
            borderRadius: '12px',
            padding: '32px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}
        >
          <div style={{
            position: 'absolute',
            top: 0, right: 0,
            width: '150px', height: '100%',
            background: `radial-gradient(circle at 100% 50%, ${scoreColor}12, transparent)`,
            pointerEvents: 'none'
          }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '32px', alignItems: 'center' }}>
            {/* Massive visual score */}
            <div style={{
              textAlign: 'center',
              borderRight: '1px solid var(--sn-border)',
              paddingRight: '36px',
              display: 'flex',
              alignItems: 'baseline',
              gap: 2
            }}>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: 84,
                fontWeight: 800,
                color: scoreColor,
                lineHeight: 1,
                textShadow: `0 0 20px ${scoreColor}20`
              }}>
                <CountUp to={score} />
              </span>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: 28,
                fontWeight: 600,
                color: 'var(--sn-text-muted)',
              }}>
                /100
              </span>
            </div>

            <div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--sn-accent-cyan)',
                letterSpacing: '0.15em',
                marginBottom: 8,
                fontWeight: 600
              }}>
                TESTED POLICY FRAMEWORK
              </div>
              <p style={{
                fontFamily: 'var(--font-body)',
                fontSize: 18,
                fontWeight: 500,
                color: '#ffffff',
                lineHeight: 1.5,
                marginBottom: 8,
              }}>
                "{policyText}"
              </p>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--sn-text-secondary)',
              }}>
                {cityName} &middot; 10,000 agents &middot; 30 simulated days &middot; <span style={{ color: scoreColor, fontWeight: 600 }}>{verdictText}</span>
              </div>
              <p style={{
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                color: 'var(--sn-text-secondary)',
                lineHeight: 1.5,
                marginTop: 8,
                marginBottom: 0
              }}>
                {getVerdictSubtext(score)}
              </p>
            </div>
          </div>
        </motion.div>

        {/* 3. EXECUTIVE SUMMARY */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          style={{
            marginBottom: '32px',
            background: 'rgba(30, 144, 255, 0.04)',
            border: '1px solid var(--sn-border)',
            borderLeft: '4px solid var(--sn-accent-blue)',
            borderRadius: '4px 12px 12px 4px',
            padding: '24px 28px',
            boxShadow: '0 4px 25px rgba(0,0,0,0.25)'
          }}
        >
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--sn-accent-blue)',
            letterSpacing: '0.15em',
            marginBottom: 10,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <span style={{ fontSize: 14 }}>📋</span> EXECUTIVE SUMMARY
          </div>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 16,
            color: '#ffffff',
            lineHeight: 1.65,
            margin: 0,
            fontWeight: 400
          }}>
            {results.whyThisScore && results.whyThisScore[0] ? results.whyThisScore[0] : "The policy produces moderate economic benefits but increases resistance in several administrative zones. Gradual rollout is recommended."}
          </p>
        </motion.div>

        {/* 3b. ADDITIONAL DIAGNOSTICS & DETAILS */}
        {results.whyThisScore && results.whyThisScore.length > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{
              background: 'rgba(255,255,255,0.01)',
              border: '1px dashed var(--sn-border)',
              borderRadius: '8px',
              padding: '20px 24px',
              marginBottom: '32px'
            }}
          >
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--sn-text-muted)',
              letterSpacing: '0.1em',
              marginBottom: '12px',
              fontWeight: 600
            }}>
              ADDITIONAL DIAGNOSTICS
            </div>
            {results.whyThisScore.slice(1).map((para, i) => (
              <p
                key={i}
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  color: 'var(--sn-text-secondary)',
                  lineHeight: 1.6,
                  marginBottom: i === results.whyThisScore.length - 2 ? 0 : 12,
                }}
              >
                {para}
              </p>
            ))}
            {results.validationNote && (
              <div style={{
                borderTop: '1px solid rgba(255,255,255,0.05)',
                paddingTop: '12px',
                marginTop: '12px',
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                color: 'var(--sn-text-muted)',
                fontStyle: 'italic'
              }}>
                💡 {results.validationNote}
              </div>
            )}
          </motion.div>
        )}

        {/* 4. KPI METRICS */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--sn-text-secondary)',
            letterSpacing: '0.15em',
            marginBottom: '16px',
            fontWeight: 600
          }}>
            PRIMARY KPI METRICS
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '16px'
          }}>
            {kpis.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 + i * 0.05 }}
                style={{
                  background: 'var(--sn-bg-card)',
                  border: '1px solid var(--sn-border)',
                  borderRadius: '10px',
                  padding: '24px 20px',
                  textAlign: 'center',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '120px',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--sn-text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  display: 'block',
                  marginBottom: '12px'
                }}>
                  {item.label}
                </span>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 30,
                  fontWeight: 700,
                  display: 'block',
                  lineHeight: 1.2
                }}>
                  <AnimatedMetricValue value={item.value} color={item.color} />
                </span>
                {/* Decorative glow bottom line */}
                <div style={{
                  position: 'absolute',
                  bottom: 0, left: 0, right: 0,
                  height: '3px',
                  background: item.color,
                  opacity: 0.8
                }} />
              </motion.div>
            ))}
          </div>

          {/* Detailed Impact Breakdown */}
          <div style={{ marginTop: '24px' }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--sn-text-muted)',
              letterSpacing: '0.1em',
              marginBottom: '14px',
              fontWeight: 600
            }}>
              IMPACT VECTOR DETAILS
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '12px'
            }}>
              {results.impactCards.map((card, i) => (
                <motion.div
                  key={card.category}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  style={{
                    background: '#111318',
                    border: '1px solid #1e2d47',
                    borderRadius: '8px',
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      color: 'var(--sn-text-secondary)',
                      letterSpacing: '0.05em',
                      marginBottom: '6px',
                      textTransform: 'uppercase'
                    }}>
                      {card.category}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 22,
                      fontWeight: 700,
                      color: card.color,
                      marginBottom: '6px'
                    }}>
                      {card.value}
                    </div>
                  </div>
                  <p style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 13,
                    color: 'var(--sn-text-secondary)',
                    lineHeight: 1.45,
                    margin: 0
                  }}>
                    {card.explanation}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* 5. ZONE ANALYSIS */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--sn-text-secondary)',
            letterSpacing: '0.15em',
            marginBottom: '16px',
            fontWeight: 600
          }}>
            GEOGRAPHIC ZONE ANALYSIS
          </div>
          <HeatmapPanel
            zones={simulationSummary?.zones}
            zoneTimeline={simulationSummary?.zone_timeline}
            cityId={selectedCity?.id || 'DEL'}
          />
        </div>

        {/* 6. RECOMMENDATIONS SECTION */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--sn-text-secondary)',
            letterSpacing: '0.15em',
            marginBottom: '16px',
            fontWeight: 600
          }}>
            GOVERNMENT ADVISORY & RECOMMENDATIONS
          </div>

          {/* Government Agent Recommendation Card */}
          {score < 80 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              style={{
                background: 'rgba(255, 149, 0, 0.04)',
                border: '1px solid rgba(255, 149, 0, 0.2)',
                borderLeft: '4px solid var(--sn-alert-amber)',
                borderRadius: '8px',
                padding: '24px',
                marginBottom: '24px',
                boxShadow: '0 4px 20px rgba(255, 149, 0, 0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 20, color: 'var(--sn-alert-amber)' }}>⚠️</span>
                <h4 style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--sn-alert-amber)',
                  letterSpacing: '0.08em',
                  margin: 0
                }}>
                  GOVERNMENT RECOMMENDATION
                </h4>
              </div>
              <p style={{ color: '#ffffff', fontSize: 16, fontWeight: 600, marginBottom: 10 }}>
                Phase implementation over 60 days.
              </p>
              <p style={{ color: 'var(--sn-text-secondary)', fontSize: 14, lineHeight: 1.5, marginBottom: 14 }}>
                Gradually roll out this policy in incremental stages. spreding implementation over a 60-day phased schedule is projected to give agents an adjustment period and dramatically reduce friction.
              </p>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid rgba(255, 149, 0, 0.15)',
                paddingTop: '12px',
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                color: 'var(--sn-text-secondary)'
              }}>
                <span>Projected resistance reduction: <span style={{ color: '#00c853', fontWeight: 700 }}>58%</span></span>
                <span>Security Advisory: Action Advised</span>
              </div>
            </motion.div>
          )}

          {/* Phased Rollout / Counterfactual Branch */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            style={{
              background: 'var(--sn-bg-card)',
              border: '1px solid var(--sn-border)',
              borderRadius: '8px',
              padding: '24px',
              marginBottom: '32px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
            }}
          >
            <div style={{
              fontFamily: 'var(--font-mono)',
              color: 'var(--sn-accent-cyan)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.1em',
              marginBottom: 8
            }}>
              REAL COUNTERFACTUAL BRANCH
            </div>
            <p style={{ color: 'var(--sn-text-secondary)', fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>
              Rerun this policy with a 60-day phased rollout to test the Government Agent's recommendations.
            </p>
            {counterfactualScore !== null && (
              <div style={{
                background: 'rgba(0,0,0,0.2)',
                padding: '12px 16px',
                borderRadius: '6px',
                marginBottom: 14,
                border: '1px solid var(--sn-border)'
              }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, margin: 0, color: '#ffffff' }}>
                  Current {score}/100 &rarr; Phased alternative: <span style={{ color: '#00c853', fontWeight: 700 }}>{counterfactualScore}/100</span>
                </p>
              </div>
            )}
            {counterfactualError && (
              <p style={{ color: '#ff0055', fontSize: 13, marginBottom: 12 }}>
                {counterfactualError}
              </p>
            )}
            <button
              className="no-print"
              onClick={runCounterfactual}
              disabled={!simulationId || counterfactualRunning}
              style={{
                background: 'var(--sn-accent-cyan)',
                color: '#0a0f1e',
                border: 0,
                fontWeight: 600,
                padding: '12px 20px',
                borderRadius: '8px',
                cursor: (!simulationId || counterfactualRunning) ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(0, 212, 255, 0.2)'
              }}
              onMouseEnter={(e) => {
                if (!counterfactualRunning && simulationId) {
                  e.currentTarget.style.background = '#00b8e6';
                  e.currentTarget.style.boxShadow = '0 4px 18px rgba(0, 212, 255, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!counterfactualRunning && simulationId) {
                  e.currentTarget.style.background = 'var(--sn-accent-cyan)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 212, 255, 0.2)';
                }
              }}
            >
              {counterfactualRunning ? 'Computing alternative...' : 'Run phased counterfactual'}
            </button>
          </motion.div>
        </div>

        {/* CALL TO ACTION ROW */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => {
              setStep(4);
              navigate(`/recommendations/${sessionId}`);
            }}
            className="no-print"
            style={{
              flex: '0 0 50%',
              height: 56,
              background: '#00e5ff',
              color: '#050811',
              border: '2px solid #00e5ff',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: '0.05em',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: 1,
              clipPath: 'polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)',
              boxShadow: '0 4px 12px rgba(0, 229, 255, 0.15)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              outline: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#33edff';
              e.currentTarget.style.borderColor = '#ffffff';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 229, 255, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#00e5ff';
              e.currentTarget.style.borderColor = '#00e5ff';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 229, 255, 0.15)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.97)';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 229, 255, 0.1)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = '2px solid #ffffff';
              e.currentTarget.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
          >
            <span style={{ fontSize: 16 }}>📊</span>
            <span>See Recommendations &rarr;</span>
          </button>
          <button
            className="no-print"
            onClick={() => {
              setStep(1);
              navigate(`/policy/${selectedCity?.id || 'delhi'}`);
            }}
            style={{
              flex: '0 0 calc(25% - 6px)',
              height: 56,
              background: 'transparent',
              border: '1px solid #1e2d47',
              color: 'var(--sn-text-secondary)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              cursor: 'pointer',
              transition: 'border-color 150ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--sn-accent-cyan)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1e2d47')}
          >
            Test a different policy
          </button>
          <button
            className="no-print"
            onClick={exportReport}
            style={{
              flex: '0 0 calc(25% - 6px)',
              height: 56,
              background: 'transparent',
              border: '1px solid #1e2d47',
              color: 'var(--sn-text-secondary)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              cursor: 'pointer',
              transition: 'border-color 150ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--sn-accent-cyan)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1e2d47')}
          >
            Export report
          </button>
        </div>
      </div>

      {/* SAVE SCENARIO MODAL OVERLAY */}
      {isSaveModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5, 8, 16, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(8px)'
        }}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              width: '100%',
              maxWidth: '480px',
              background: 'var(--sn-bg-secondary)',
              border: '1px solid var(--sn-border)',
              borderRadius: '12px',
              padding: '28px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
            }}
          >
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20,
              color: '#ffffff',
              marginBottom: '16px',
              fontWeight: 600
            }}>
              Save Current Scenario
            </h3>
            
            <p style={{
              fontSize: 14,
              color: 'var(--sn-text-secondary)',
              lineHeight: 1.5,
              marginBottom: '20px'
            }}>
              Saving this scenario allows you to compare it side-by-side with other policy runs. Give it a descriptive name:
            </p>

            <input
              type="text"
              value={customScenarioName}
              onChange={(e) => setCustomScenarioName(e.target.value)}
              placeholder={defaultScenarioName}
              style={{
                width: '100%',
                background: 'var(--sn-bg-primary)',
                border: '1px solid var(--sn-border)',
                borderRadius: '6px',
                color: '#ffffff',
                padding: '12px 16px',
                fontSize: 14,
                fontFamily: 'var(--font-mono)',
                marginBottom: '24px',
                outline: 'none',
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--sn-accent-cyan)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--sn-border)'}
            />

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsSaveModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--sn-border)',
                  color: 'var(--sn-text-secondary)',
                  padding: '10px 18px',
                  borderRadius: '6px',
                  fontSize: 13,
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#ffffff'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--sn-border)'}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveScenario}
                style={{
                  background: 'var(--sn-accent-cyan)',
                  border: 'none',
                  color: '#0a0f1e',
                  fontWeight: 600,
                  padding: '10px 18px',
                  borderRadius: '6px',
                  fontSize: 13,
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#33edff'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--sn-accent-cyan)'}
              >
                Save Scenario
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
