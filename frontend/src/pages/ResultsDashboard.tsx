import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSimulationContext } from '../context/SimulationContext';
import { getSimulationData } from '../data/simulationData';
import { streamCounterfactual } from '../api/simulation';

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
  const [counterfactualScore, setCounterfactualScore] = useState<number | null>(null);
  const [counterfactualError, setCounterfactualError] = useState('');
  const [counterfactualRunning, setCounterfactualRunning] = useState(false);

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

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} style={{ background: '#111318', border: '1px solid #1e2d47', padding: 20, marginBottom: 28 }}>
          <div style={{ fontFamily: 'var(--font-data)', color: '#00e5ff', fontSize: 11, marginBottom: 8 }}>
            REAL COUNTERFACTUAL BRANCH
          </div>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 14 }}>
            Rerun this policy with a 60-day phased rollout and a different seed.
          </p>
          {counterfactualScore !== null && (
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 14 }}>
              Current {score}/100 → Phased alternative <span style={{ color: '#1aad6e' }}>{counterfactualScore}/100</span>
            </p>
          )}
          {counterfactualError && <p style={{ color: '#ff0055', marginBottom: 12 }}>{counterfactualError}</p>}
          <button className="no-print" onClick={runCounterfactual} disabled={!simulationId || counterfactualRunning} style={{ background: '#00e5ff', border: 0, padding: '11px 18px' }}>
            {counterfactualRunning ? 'Computing alternative...' : 'Run phased counterfactual'}
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
              height: 56,
              background: '#00e5ff',
              color: '#0a0c10',
              border: 'none',
              fontFamily: 'var(--font-data)',
              fontSize: 14,
              letterSpacing: '0.04em',
              cursor: 'pointer',
              transition: 'background 150ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#00d4f0')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#00e5ff')}
          >
            See Recommendations →
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
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-data)',
              fontSize: 12,
              cursor: 'pointer',
              transition: 'border-color 150ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#00e5ff')}
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
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-data)',
              fontSize: 12,
              cursor: 'pointer',
              transition: 'border-color 150ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#00e5ff')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1e2d47')}
          >
            Export report
          </button>
        </div>
      </div>
    </motion.div>
  );
}
