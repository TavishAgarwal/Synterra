import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSimulationContext } from '../context/SimulationContext';
import { getSimulationData } from '../data/simulationData';

function getScoreColor(score: number): string {
  if (score >= 80) return '#1aad6e';
  if (score >= 55) return '#ffb347';
  return '#ff0055';
}

export default function Recommendations() {
  const navigate = useNavigate();
  const { selectedCity, selectedPolicy, customPolicyText, questionAnswers, simulationSummary, setStep, reset } =
    useSimulationContext();

  useEffect(() => {
    setStep(4);
  }, [setStep]);

  // Guard
  useEffect(() => {
    if (!selectedPolicy && !customPolicyText) {
      navigate('/');
    }
  }, [selectedPolicy, customPolicyText, navigate]);

  const policy = selectedPolicy;
  const score = simulationSummary?.score ?? policy?.score ?? 50;
  const fallbackData = getSimulationData(
    policy?.id || 'custom',
    policy?.label || 'Custom Policy',
    score
  );

  const { necessary, improvements, excellence, revisedScore, goldScore } =
    simulationSummary?.recommendations ?? fallbackData.recommendations;

  const withImplementedNotes = (items: typeof necessary) =>
    items.map((item) => {
      const title = item.title.toLowerCase();
      if ((title.includes('bpl') || title.includes('exempt')) && questionAnswers.q3 === 'C') {
        return {
          ...item,
          alreadyImplemented: true,
          implementedNote: 'Already included in your policy — this contributed +12 pts to your score.',
        };
      }
      if ((title.includes('phase') || title.includes('implementation')) && questionAnswers.q2 === 'D') {
        return {
          ...item,
          alreadyImplemented: true,
          implementedNote: 'Your phased timeline already addresses this — this contributed +8 pts to your score.',
        };
      }
      return { ...item, alreadyImplemented: false, implementedNote: '' };
    });

  const visibleNecessary = withImplementedNotes(necessary);
  const visibleImprovements = withImplementedNotes(improvements);
  const visibleExcellence = withImplementedNotes(excellence);

  const renderItem = (
    item: { title: string; scoreDelta: number; explanation: string; affects: string; alreadyImplemented?: boolean; implementedNote?: string },
    borderColor: string,
    bgColor: string,
    deltaColor: string,
    index: number
  ) => (
    <motion.div
      key={item.title}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: index * 0.06 }}
      style={{
        background: item.alreadyImplemented ? '#071510' : bgColor,
        borderLeft: `3px solid ${borderColor}`,
        padding: '16px 20px',
        marginBottom: 8,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            color: 'var(--color-text-primary)',
          }}
        >
          {item.title}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-data)',
            fontSize: 12,
            color: deltaColor,
            flexShrink: 0,
            marginLeft: 12,
          }}
        >
          {item.alreadyImplemented ? 'DONE' : `+${item.scoreDelta} pts`}
        </span>
      </div>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          color: 'var(--color-text-secondary)',
          lineHeight: 1.6,
          marginBottom: 8,
        }}
      >
        {item.alreadyImplemented ? item.implementedNote : item.explanation}
      </p>
      <div
        style={{
          fontFamily: 'var(--font-data)',
          fontSize: 10,
          color: 'var(--color-text-dim)',
          letterSpacing: '0.04em',
        }}
      >
        {item.alreadyImplemented ? 'Already implemented' : `Affects: ${item.affects}`}
      </div>
    </motion.div>
  );

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
        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 32,
              fontWeight: 400,
              color: 'var(--color-text-primary)',
              marginBottom: 8,
            }}
          >
            How to make this policy work
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 16,
              color: 'var(--color-text-secondary)',
              lineHeight: 1.5,
            }}
          >
            Listed in order of impact. Each change shows its effect on the score.
          </p>
        </div>

        {/* TIER 1 — NECESSARY */}
        {necessary.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <div
              style={{
                fontFamily: 'var(--font-data)',
                fontSize: 11,
                color: '#ff0055',
                letterSpacing: '0.08em',
                marginBottom: 12,
              }}
            >
              NECESSARY — Policy fails without these
            </div>
            {visibleNecessary.map((item, i) =>
              renderItem(item, '#ff0055', '#0d0608', '#ff0055', i)
            )}
          </div>
        )}

        {/* TIER 2 — IMPROVEMENTS */}
        <div style={{ marginBottom: 36 }}>
          <div
            style={{
              fontFamily: 'var(--font-data)',
              fontSize: 11,
              color: '#ffb347',
              letterSpacing: '0.08em',
              marginBottom: 12,
            }}
          >
            IMPROVEMENTS — Takes the policy from good to better
          </div>
          {visibleImprovements.map((item, i) =>
            renderItem(item, '#ffb347', '#111318', '#ffb347', i)
          )}
        </div>

        {/* TIER 3 — EXCELLENCE */}
        <div style={{ marginBottom: 40 }}>
          <div
            style={{
              fontFamily: 'var(--font-data)',
              fontSize: 11,
              color: '#00e5ff',
              letterSpacing: '0.08em',
              marginBottom: 12,
            }}
          >
            EXCELLENCE — The gold standard version of this policy
          </div>
          {visibleExcellence.map((item, i) =>
            renderItem(item, '#00e5ff', '#111318', '#00e5ff', i)
          )}
        </div>

        {/* REVISED SCORE BOX */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          style={{
            background: '#111318',
            border: '1px solid #1e2d47',
            padding: 24,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 20,
              flexWrap: 'wrap',
            }}
          >
            {/* Current */}
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: 'var(--font-data)',
                  fontSize: 10,
                  color: 'var(--color-text-dim)',
                  letterSpacing: '0.1em',
                  marginBottom: 6,
                }}
              >
                CURRENT POLICY
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 36,
                  color: getScoreColor(score),
                }}
              >
                {score}/100
              </span>
            </div>

            <span
              style={{
                fontFamily: 'var(--font-data)',
                fontSize: 24,
                color: 'var(--color-text-dim)',
              }}
            >
              →
            </span>

            {/* With all changes */}
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: 'var(--font-data)',
                  fontSize: 10,
                  color: 'var(--color-text-dim)',
                  letterSpacing: '0.1em',
                  marginBottom: 6,
                }}
              >
                WITH ALL CHANGES
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 36,
                  color: getScoreColor(revisedScore),
                }}
              >
                {revisedScore}/100
              </span>
            </div>

            <span
              style={{
                fontFamily: 'var(--font-data)',
                fontSize: 24,
                color: 'var(--color-text-dim)',
              }}
            >
              →
            </span>

            {/* Gold standard */}
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: 'var(--font-data)',
                  fontSize: 10,
                  color: 'var(--color-text-dim)',
                  letterSpacing: '0.1em',
                  marginBottom: 6,
                }}
              >
                GOLD STANDARD
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 36,
                  color: getScoreColor(goldScore),
                }}
              >
                {goldScore}/100
              </span>
            </div>
          </div>

          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              color: 'var(--color-text-secondary)',
              textAlign: 'center',
              marginTop: 16,
              lineHeight: 1.6,
            }}
          >
            {necessary.length > 0
              ? `Implementing the necessary changes alone raises the score by ${necessary.reduce((a, b) => a + b.scoreDelta, 0)} points. The full gold standard version achieves ${goldScore}/100 — a policy that generates revenue while protecting vulnerable populations.`
              : `With all improvements applied, the policy reaches ${goldScore}/100 — an optimised version with maximum public benefit and minimum disruption.`}
          </p>
        </motion.div>

        {/* FINAL BUTTONS */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={() => {
              setStep(1);
              navigate(`/policy/${selectedCity?.id || 'delhi'}`);
            }}
            style={{
              height: 48,
              padding: '0 24px',
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
            Test another policy in {selectedCity?.name || 'this city'}
          </button>
          <button
            onClick={() => {
              setStep(0);
              navigate('/cities');
            }}
            style={{
              height: 48,
              padding: '0 24px',
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
            Try a different city
          </button>
          <button
            onClick={() => {
              reset();
              navigate('/');
            }}
            style={{
              background: 'none',
              border: 'none',
              fontFamily: 'var(--font-data)',
              fontSize: 11,
              color: 'var(--color-text-dim)',
              cursor: 'pointer',
              padding: '0 8px',
            }}
          >
            Start over
          </button>
        </div>
      </div>
    </motion.div>
  );
}
