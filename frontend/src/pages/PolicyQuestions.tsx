import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { getCityById } from '../data/cityProfiles';
import { getPolicyById } from '../data/demoPolicies';
import type { PolicyCategory } from '../data/demoPolicies';
import { useSimulationContext } from '../context/SimulationContext';

interface WizardQuestion {
  id: string;
  text: string;
  options: string[];
}

const questionsByCategory: Record<PolicyCategory, WizardQuestion[]> = {
  TRANSPORT: [
    { id: 'q1', text: 'Who does this policy primarily affect?', options: ['All commuters', 'Only public transit users', 'Private vehicle owners', 'Specific income groups only'] },
    { id: 'q2', text: 'When does this take effect?', options: ['Immediately (no notice period)', '30 days notice', '90 days notice', 'Phased over 6 months'] },
    { id: 'q3', text: 'Is there any relief for low-income groups?', options: ['No exemptions — applies to everyone', 'Partial subsidy for BPL cardholders', 'Full exemption for BPL cardholders', 'Not decided yet'] },
    { id: 'q4', text: 'What is the primary goal of this policy?', options: ['Generate revenue', 'Reduce congestion', 'Environmental improvement', 'Public welfare'] },
  ],
  EXAMINATION: [
    { id: 'q1', text: 'Which students are primarily affected?', options: ['All students across all examinations', 'Competitive exam aspirants (NEET/JEE/UPSC)', 'School students (Class 9-12)', 'University students'] },
    { id: 'q2', text: 'What aspect of the examination is changing?', options: ['Examination format or mode', 'Fee structure', 'Security and integrity measures', 'Multiple aspects changing simultaneously'] },
    { id: 'q3', text: 'How much advance notice are students receiving?', options: ['Immediate — applies to next examination', '3 months notice', '6 months notice', 'Next academic year onward'] },
    { id: 'q4', text: 'Are coaching centres being officially informed?', options: ['Yes — formal communication sent', 'No — students and centres adapt independently', 'Partially informed', 'Unknown at this stage'] },
  ],
  ECONOMIC: [
    { id: 'q1', text: 'Which income group is most directly impacted?', options: ['All income groups equally', 'Low income groups primarily', 'Middle income groups primarily', 'High income / business owners primarily'] },
    { id: 'q2', text: 'Is this a permanent change or temporary?', options: ['Permanent policy change', 'Temporary measure (under 6 months)', 'Conditional on review', 'Duration not specified'] },
    { id: 'q3', text: 'Are compensatory measures announced alongside?', options: ['Yes — specific relief measures announced', 'No compensatory measures', 'Partial measures being planned', 'To be determined'] },
    { id: 'q4', text: 'What is the implementation timeline?', options: ['Immediate effect', 'From next financial quarter', 'From next financial year', 'Phased over 12-24 months'] },
  ],
  EMPLOYMENT: [
    { id: 'q1', text: 'Which sector of workers is affected?', options: ['Central government employees only', 'State government employees', 'Private sector employees', 'All sectors including informal'] },
    { id: 'q2', text: 'What notice period is given?', options: ['Immediate — effective today', 'Two weeks notice', 'One month notice', 'Three months notice'] },
    { id: 'q3', text: 'Are there flexibility provisions?', options: ['No flexibility — strict compliance required', 'Limited flexibility on case-by-case basis', 'Significant flexibility built in', 'Flexibility details to be announced'] },
    { id: 'q4', text: 'Who is the policy designed to benefit?', options: ['Government / public administration efficiency', 'Employers / organizations', 'Employees / workers', 'Economy broadly'] },
  ],
};

function fallbackCategory(text: string): PolicyCategory {
  const lower = text.toLowerCase();
  if (lower.includes('exam') || lower.includes('neet') || lower.includes('jee')) return 'EXAMINATION';
  if (lower.includes('wfh') || lower.includes('office') || lower.includes('employee')) return 'EMPLOYMENT';
  if (lower.includes('wage') || lower.includes('fuel') || lower.includes('price') || lower.includes('tax')) return 'ECONOMIC';
  return 'TRANSPORT';
}

export default function PolicyQuestions() {
  const { cityId, policyId } = useParams<{ cityId: string; policyId: string }>();
  const navigate = useNavigate();
  const {
    selectedPolicy,
    policyCategory,
    customPolicyText,
    questionAnswers,
    setSelectedPolicy,
    setQuestionAnswer,
    setStep,
  } = useSimulationContext();
  const [currentIndex, setCurrentIndex] = useState(0);
  const policy = selectedPolicy || getPolicyById(policyId || '');
  const category = policy?.category || policyCategory || fallbackCategory(policy?.fullText || customPolicyText);
  const questions = questionsByCategory[category];
  const current = questions[currentIndex];
  const selected = questionAnswers[current.id];
  const city = useMemo(() => getCityById(cityId || ''), [cityId]);

  useEffect(() => {
    setStep(1);
  }, [setStep]);

  useEffect(() => {
    if (policy && !selectedPolicy) setSelectedPolicy(policy);
    if (!city || (!policy && !customPolicyText)) navigate(city ? `/policy/${city.id}` : '/cities');
  }, [city, customPolicyText, navigate, policy, selectedPolicy, setSelectedPolicy]);

  const next = () => {
    if (!selected) return;
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((index) => index + 1);
      return;
    }
    navigate(`/simulate/${cityId}/${policyId || 'custom'}`);
  };

  if (!city) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ minHeight: 'calc(100vh - 40px)', display: 'grid', placeItems: 'center', padding: '48px 24px 80px' }}
    >
      <div style={{ maxWidth: 560, width: '100%' }}>
        <button
          className="no-print"
          onClick={() => navigate(`/policy/${cityId}`)}
          style={{ background: 'transparent', border: 0, fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--color-text-dim)', marginBottom: 22 }}
        >
          ← Change policy
        </button>

        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{ fontFamily: 'var(--font-data)', fontSize: 12, color: 'var(--color-text-dim)', marginBottom: 12 }}>
            Question {currentIndex + 1} of {questions.length}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
            {questions.map((question, index) => (
              <span
                key={question.id}
                style={{
                  width: 10,
                  height: 10,
                  border: '1px solid #00e5ff',
                  background: index <= currentIndex ? '#00e5ff' : 'transparent',
                  display: 'block',
                }}
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 400, lineHeight: 1.3, marginBottom: 32 }}>
              {current.text}
            </h1>
            {current.options.map((option, index) => {
              const letter = String.fromCharCode(65 + index);
              const isSelected = selected === letter;
              return (
                <button
                  key={option}
                  onClick={() => setQuestionAnswer(current.id, letter)}
                  style={{
                    width: '100%',
                    minHeight: 52,
                    background: isSelected ? '#00e5ff0a' : '#111318',
                    border: `1px solid ${isSelected ? '#00e5ff' : '#1e2d47'}`,
                    borderLeft: isSelected ? '3px solid #00e5ff' : '1px solid #1e2d47',
                    padding: '14px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 8,
                    color: isSelected ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    textAlign: 'left',
                    fontFamily: 'var(--font-body)',
                    fontSize: 15,
                    transition: 'all 150ms ease-out',
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      border: `1px solid ${isSelected ? '#00e5ff' : '#3b494c'}`,
                      background: isSelected ? '#00e5ff' : 'transparent',
                      color: '#0a0c10',
                      display: 'grid',
                      placeItems: 'center',
                      fontFamily: 'var(--font-data)',
                      fontSize: 11,
                      flexShrink: 0,
                    }}
                  >
                    {isSelected ? '✓' : ''}
                  </span>
                  {option}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>

        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          <button
            className="no-print"
            onClick={() => {
              if (currentIndex === 0) navigate(`/policy/${cityId}`);
              else setCurrentIndex((index) => index - 1);
            }}
            style={{ width: '30%', height: 48, background: 'transparent', border: '1px solid #1e2d47', color: 'var(--color-text-dim)', fontFamily: 'var(--font-data)', fontSize: 12 }}
          >
            ← Back
          </button>
          <button
            className="chamfered no-print"
            disabled={!selected}
            onClick={next}
            style={{
              width: '65%',
              height: 48,
              background: selected ? '#00e5ff' : '#1a1c20',
              border: 0,
              color: selected ? '#0a0c10' : 'var(--color-text-dim)',
              fontFamily: 'var(--font-data)',
              fontSize: 12,
              cursor: selected ? 'pointer' : 'not-allowed',
            }}
          >
            {currentIndex === questions.length - 1 ? 'Run Simulation →' : 'Next →'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
