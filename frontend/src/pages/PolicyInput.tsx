import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getCityById } from '../data/cityProfiles';
import { demoPolicies } from '../data/demoPolicies';
import type { DemoPolicy, PolicyCategory } from '../data/demoPolicies';
import { useSimulationContext } from '../context/SimulationContext';

const transportPolicies = ['railway-fare-20', 'metro-free-women', 'odd-even', 'fuel-price-15'];
const examEmploymentPolicies = ['neet-online', 'exam-fee-waived-bpl', 'wfh-mandate-removed', 'mgnrega-wage-100'];

function detectCategory(text: string, selected?: DemoPolicy | null): PolicyCategory {
  if (selected) return selected.category;
  const lower = text.toLowerCase();
  if (lower.includes('exam') || lower.includes('neet') || lower.includes('jee') || lower.includes('student')) return 'EXAMINATION';
  if (lower.includes('wfh') || lower.includes('work from home') || lower.includes('office') || lower.includes('employee')) return 'EMPLOYMENT';
  if (lower.includes('wage') || lower.includes('fuel') || lower.includes('price') || lower.includes('tax') || lower.includes('subsidy')) return 'ECONOMIC';
  return 'TRANSPORT';
}

export default function PolicyInput() {
  const { cityId } = useParams<{ cityId: string }>();
  const navigate = useNavigate();
  const {
    selectedPolicy,
    customPolicyText,
    setSelectedCity,
    setSelectedPolicy,
    setCustomPolicyText,
    setPolicyCategory,
    setStep,
  } = useSimulationContext();
  const city = useMemo(() => getCityById(cityId || ''), [cityId]);
  const [policyText, setPolicyText] = useState(customPolicyText || selectedPolicy?.fullText || '');
  const [activePolicy, setActivePolicy] = useState<DemoPolicy | null>(selectedPolicy);

  useEffect(() => {
    setStep(1);
  }, [setStep]);

  useEffect(() => {
    if (!city) {
      navigate('/cities');
      return;
    }
    setSelectedCity(city);
  }, [city, navigate, setSelectedCity]);

  const canContinue = policyText.trim().length >= 10;
  const countColor = policyText.length >= 1950 ? '#ff0055' : policyText.length >= 1800 ? '#ffb347' : 'var(--color-text-dim)';

  const choosePolicy = (policy: DemoPolicy) => {
    setActivePolicy(policy);
    setPolicyText(policy.fullText);
    setSelectedPolicy(policy);
    setCustomPolicyText(policy.fullText);
    setPolicyCategory(policy.category);
  };

  const continueToQuestions = () => {
    if (!cityId || !canContinue) return;
    const category = detectCategory(policyText, activePolicy);
    const policyId = activePolicy?.id || 'custom';
    setSelectedPolicy(activePolicy);
    setCustomPolicyText(policyText);
    setPolicyCategory(category);
    setStep(1);
    navigate(`/questions/${cityId}/${policyId}`);
  };

  if (!city) return null;

  const renderPolicyGroup = (title: string, ids: string[]) => (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontFamily: 'var(--font-data)', fontSize: 10, color: 'var(--color-text-dim)', marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {ids.map((id) => {
          const policy = demoPolicies.find((item) => item.id === id);
          if (!policy) return null;
          const selected = activePolicy?.id === policy.id;
          return (
            <button
              key={policy.id}
              onClick={() => choosePolicy(policy)}
              style={{
                background: selected ? '#00e5ff15' : '#111318',
                border: `1px solid ${selected ? '#00e5ff' : '#1e2d47'}`,
                padding: '10px 18px',
                color: selected ? '#00e5ff' : 'var(--color-text-secondary)',
                fontFamily: 'var(--font-body)',
                fontSize: 13,
              }}
            >
              {policy.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ minHeight: 'calc(100vh - 40px)', display: 'grid', placeItems: 'start center', padding: '48px 24px 80px' }}
    >
      <div style={{ maxWidth: 640, width: '100%' }}>
        <button
          className="no-print"
          onClick={() => navigate('/cities')}
          style={{ background: 'transparent', border: 0, fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--color-text-dim)', marginBottom: 22 }}
        >
          ← {city.name}
        </button>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 400, marginBottom: 8 }}>
          What policy do you want to test?
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 15, lineHeight: 1.6, marginBottom: 28 }}>
          Type it as you would write a government order. Or choose a demo policy to see the platform in action.
        </p>

        <div style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--color-text-dim)' }}>DEMO POLICIES</div>
        {renderPolicyGroup('TRANSPORT', transportPolicies)}
        {renderPolicyGroup('EXAMINATION & EMPLOYMENT', examEmploymentPolicies)}

        <div style={{ marginTop: 28 }}>
          <label style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--color-text-dim)', display: 'block', marginBottom: 8 }}>
            YOUR POLICY
          </label>
          <textarea
            value={policyText}
            maxLength={2000}
            onChange={(event) => {
              setActivePolicy(null);
              setPolicyText(event.target.value);
              setCustomPolicyText(event.target.value);
            }}
            placeholder="e.g. Indian Railways increases all suburban fares by 20% effective from next month..."
            style={{
              width: '100%',
              minHeight: 120,
              background: '#070D1A',
              border: '1px solid #1e2d47',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: 15,
              padding: 16,
              resize: 'vertical',
              outline: 'none',
            }}
            onFocus={(event) => {
              event.currentTarget.style.borderColor = '#00e5ff';
              event.currentTarget.style.boxShadow = '0 0 8px rgba(0,229,255,0.15)';
            }}
            onBlur={(event) => {
              event.currentTarget.style.borderColor = '#1e2d47';
              event.currentTarget.style.boxShadow = 'none';
            }}
          />
          <div style={{ textAlign: 'right', fontFamily: 'var(--font-data)', fontSize: 10, color: countColor, marginTop: 6 }}>
            {policyText.length} / 2000
          </div>
        </div>

        <button
          className="chamfered no-print"
          onClick={continueToQuestions}
          disabled={!canContinue}
          style={{
            marginTop: 24,
            width: '100%',
            height: 56,
            background: canContinue ? '#00e5ff' : '#1a1c20',
            border: 0,
            color: canContinue ? '#0a0c10' : 'var(--color-text-dim)',
            fontFamily: 'var(--font-data)',
            fontSize: 13,
            cursor: canContinue ? 'pointer' : 'not-allowed',
          }}
        >
          {canContinue ? 'Continue to questions →' : 'Enter a policy to continue'}
        </button>
        <p style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: 'var(--color-text-dim)' }}>
          4 quick questions, then your simulation starts
        </p>
      </div>
    </motion.div>
  );
}
