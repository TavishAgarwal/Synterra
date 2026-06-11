import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface ZoneComparisonItem {
  zone_id: string;
  zone_name: string;
  sentiment: number;
  protest_probability: number;
  modal_shift_pct: number;
  total_agents: number;
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
  zoneSummary: ZoneComparisonItem[];
}

function parseValue(val: string | number): number {
  if (typeof val === 'number') return val;
  const match = val.match(/([+-]?\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

export default function ComparisonDashboard() {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<SavedScenario[]>(() => {
    try {
      const stored = localStorage.getItem('sn-saved-scenarios');
      return stored ? (JSON.parse(stored) as SavedScenario[]) : [];
    } catch {
      return [];
    }
  });

  const [selectedIdA, setSelectedIdA] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('sn-saved-scenarios');
      if (stored) {
        const list = JSON.parse(stored) as SavedScenario[];
        if (list.length >= 2) return list[0].id;
      }
    } catch {
      /* ignore */
    }
    return '';
  });

  const [selectedIdB, setSelectedIdB] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('sn-saved-scenarios');
      if (stored) {
        const list = JSON.parse(stored) as SavedScenario[];
        if (list.length >= 2) return list[1].id;
      }
    } catch {
      /* ignore */
    }
    return '';
  });

  const scenarioA = useMemo(() => scenarios.find((s) => s.id === selectedIdA), [scenarios, selectedIdA]);
  const scenarioB = useMemo(() => scenarios.find((s) => s.id === selectedIdB), [scenarios, selectedIdB]);

  // Clean-up delete function
  const handleDeleteScenario = (id: string) => {
    const updated = scenarios.filter((s) => s.id !== id);
    localStorage.setItem('sn-saved-scenarios', JSON.stringify(updated));
    setScenarios(updated);
    if (updated.length >= 2) {
      if (selectedIdA === id) setSelectedIdA(updated[0].id);
      if (selectedIdB === id) setSelectedIdB(updated[1].id);
    }
  };

  // Comparison Metrics calculations
  const comparisonData = useMemo(() => {
    if (!scenarioA || !scenarioB) return [];

    const metrics = [
      { name: 'Policy Score', key: 'policyScore', type: 'higher', unit: '' },
      { name: 'Approval', key: 'approval', type: 'higher', unit: '' },
      { name: 'Protest Risk', key: 'protestRisk', type: 'lower', unit: '' },
      { name: 'Economic Impact', key: 'economicImpact', type: 'higher', unit: '' },
      { name: 'Employment', key: 'employmentChange', type: 'higher', unit: '' },
      { name: 'Confidence', key: 'confidence', type: 'higher', unit: '%' }
    ];

    return metrics.map((m) => {
      const valARaw = scenarioA[m.key as keyof SavedScenario] as string | number;
      const valBRaw = scenarioB[m.key as keyof SavedScenario] as string | number;
      const valAStr = String(valARaw) + m.unit;
      const valBStr = String(valBRaw) + m.unit;

      const numA = parseValue(valARaw);
      const numB = parseValue(valBRaw);

      let winner: 'A' | 'B' | '▬' = '▬';
      if (m.type === 'higher') {
        if (numB > numA) winner = 'B';
        else if (numA > numB) winner = 'A';
      } else {
        if (numB < numA) winner = 'B';
        else if (numA < numB) winner = 'A';
      }

      const diff = numB - numA;
      let diffIndicator = '▬';
      let diffColor = 'var(--sn-text-muted)';
      if (Math.abs(diff) > 0.01) {
        const isBetter = (m.type === 'higher' && diff > 0) || (m.type === 'lower' && diff < 0);
        diffColor = isBetter ? '#00c853' : '#ff3b30';
        diffIndicator = diff > 0 ? `▲ +${diff.toFixed(1)}` : `▼ ${diff.toFixed(1)}`;
      }

      return {
        metric: m.name,
        valA: valAStr,
        valB: valBStr,
        winner,
        diffIndicator,
        diffColor
      };
    });
  }, [scenarioA, scenarioB]);

  // dynamic advantages & tradeoffs winner summary
  const winnerSummary = useMemo(() => {
    if (!scenarioA || !scenarioB) return null;

    const scoreA = scenarioA.policyScore;
    const scoreB = scenarioB.policyScore;

    const advantages: string[] = [];
    const tradeoffs: string[] = [];

    if (scoreB > scoreA) advantages.push('Higher overall policy score');
    else if (scoreA > scoreB) tradeoffs.push('Lower overall policy score');

    const appA = parseValue(scenarioA.approval);
    const appB = parseValue(scenarioB.approval);
    if (appB > appA) advantages.push('Higher citizen approval');
    else if (appA > appB) tradeoffs.push('Lower citizen approval');

    const protA = parseValue(scenarioA.protestRisk);
    const protB = parseValue(scenarioB.protestRisk);
    if (protB < protA) advantages.push('Lower protest risk');
    else if (protA < protB) tradeoffs.push('Higher protest risk');

    const econA = parseValue(scenarioA.economicImpact);
    const econB = parseValue(scenarioB.economicImpact);
    if (econB > econA) advantages.push('Better economic impact profile');
    else if (econA > econB) tradeoffs.push('Weaker economic impact profile');

    const empA = parseValue(scenarioA.employmentChange);
    const empB = parseValue(scenarioB.employmentChange);
    if (empB > empA) advantages.push('Better employment indicators');
    else if (empA > empB) tradeoffs.push('Slightly lower employment outcomes');

    let winnerText = 'Scenario B performs better overall.';
    if (scoreA > scoreB) {
      winnerText = 'Scenario A performs better overall.';
      // Swap advantages and tradeoffs if A is the overall winner
      return {
        winnerName: scenarioA.scenarioName,
        winnerText,
        advantages: tradeoffs.map((s) => s.replace('Lower', 'Higher').replace('Higher', 'Lower').replace('Weaker', 'Better').replace('Slightly lower', 'Better')),
        tradeoffs: advantages.map((s) => s.replace('Higher', 'Lower').replace('Lower', 'Higher').replace('Better', 'Lower').replace('Better', 'Slightly lower'))
      };
    } else if (scoreA === scoreB) {
      winnerText = 'Both scenarios demonstrate comparable overall performance.';
    }

    return {
      winnerName: scoreB > scoreA ? scenarioB.scenarioName : (scoreA > scoreB ? scenarioA.scenarioName : 'None'),
      winnerText,
      advantages,
      tradeoffs: tradeoffs.length > 0 ? tradeoffs : ['None detected']
    };
  }, [scenarioA, scenarioB]);

  // Zone dynamic comparison derivation
  const zoneComparison = useMemo(() => {
    if (!scenarioA || !scenarioB || !scenarioA.zoneSummary || !scenarioB.zoneSummary) {
      return { improved: [], affected: [] };
    }

    const comparisonList = scenarioB.zoneSummary.map((zoneB) => {
      const zoneA = scenarioA.zoneSummary.find((z) => z.zone_id === zoneB.zone_id);
      if (!zoneA) return null;

      const appA = Math.max(0, Math.min(100, Math.round((zoneA.sentiment + 1) * 50)));
      const appB = Math.max(0, Math.min(100, Math.round((zoneB.sentiment + 1) * 50)));
      const approvalDiff = appB - appA;

      const protA = Math.max(0, Math.min(100, Math.round(zoneA.protest_probability * 100)));
      const protB = Math.max(0, Math.min(100, Math.round(zoneB.protest_probability * 100)));
      const protestDiff = protB - protA;

      const netBenefit = approvalDiff - protestDiff;

      return {
        id: zoneB.zone_id,
        name: zoneB.zone_name,
        approvalDiff,
        protestDiff,
        netBenefit
      };
    }).filter((x): x is NonNullable<typeof x> => x !== null);

    const improved = [...comparisonList]
      .sort((a, b) => b.netBenefit - a.netBenefit)
      .filter((z) => z.netBenefit > 1)
      .slice(0, 3);

    const affected = [...comparisonList]
      .sort((a, b) => a.netBenefit - b.netBenefit)
      .filter((z) => z.netBenefit < -1)
      .slice(0, 3);

    return { improved, affected };
  }, [scenarioA, scenarioB]);

  if (scenarios.length < 2) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 56px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--sn-bg-primary)',
        padding: '24px'
      }}>
        <div className="sn-card" style={{ maxWidth: '480px', width: '100%', textAlign: 'center', padding: '36px' }}>
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>⚠️</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', marginBottom: '12px' }}>
            Comparison Locked
          </h2>
          <p style={{ color: 'var(--sn-text-secondary)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
            Scenario side-by-side analysis requires at least two saved simulation runs in history. Run a policy simulation and click "Save Scenario" to begin.
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'var(--sn-accent-cyan)',
              color: '#0a0f1e',
              border: 0,
              padding: '12px 24px',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Run a Simulation
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        minHeight: 'calc(100vh - 56px)',
        padding: '40px 24px 80px',
        background: 'var(--sn-bg-primary)',
        display: 'flex',
        justifyContent: 'center'
      }}
    >
      <div style={{ maxWidth: 840, width: '100%' }}>
        
        {/* HEADER */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--sn-border)',
          paddingBottom: '20px',
          marginBottom: '32px'
        }}>
          <div>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--sn-accent-cyan)',
              letterSpacing: '0.15em',
              fontWeight: 600
            }}>
              A/B POLICY ANALYSIS
            </span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 500, margin: '6px 0 0' }}>
              Scenario Comparison
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 12 }} className="no-print">
            <button
              onClick={() => window.print()}
              style={{
                background: 'transparent',
                border: '1px solid var(--sn-border)',
                color: '#ffffff',
                padding: '10px 18px',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                cursor: 'pointer',
                borderRadius: '6px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--sn-accent-cyan)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--sn-border)'}
            >
              📊 Export Report
            </button>
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'var(--sn-accent-cyan)',
                border: 'none',
                color: '#0a0f1e',
                fontWeight: 600,
                padding: '10px 18px',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                cursor: 'pointer',
                borderRadius: '6px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#33edff'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--sn-accent-cyan)'}
            >
              Back to Simulators
            </button>
          </div>
        </div>

        {/* SELECTORS ROW */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 24,
          marginBottom: 32
        }} className="no-print">
          
          {/* Selector A */}
          <div style={{
            background: 'var(--sn-bg-card)',
            border: '1px solid var(--sn-border)',
            padding: 20,
            borderRadius: '10px'
          }}>
            <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--sn-text-secondary)', marginBottom: 8 }}>
              SELECT SCENARIO A (BASELINE)
            </label>
            <select
              value={selectedIdA}
              onChange={(e) => setSelectedIdA(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--sn-bg-primary)',
                border: '1px solid var(--sn-border)',
                color: '#ffffff',
                padding: '10px 12px',
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                outline: 'none',
                marginBottom: 12
              }}
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>{s.scenarioName}</option>
              ))}
            </select>
            <button
              onClick={() => handleDeleteScenario(selectedIdA)}
              style={{
                background: 'transparent',
                border: 0,
                color: '#ff3b30',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer'
              }}
            >
              🗑️ Delete Scenario A
            </button>
          </div>

          {/* Selector B */}
          <div style={{
            background: 'var(--sn-bg-card)',
            border: '1px solid var(--sn-border)',
            padding: 20,
            borderRadius: '10px'
          }}>
            <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--sn-text-secondary)', marginBottom: 8 }}>
              SELECT SCENARIO B (ALTERNATIVE)
            </label>
            <select
              value={selectedIdB}
              onChange={(e) => setSelectedIdB(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--sn-bg-primary)',
                border: '1px solid var(--sn-border)',
                color: '#ffffff',
                padding: '10px 12px',
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                outline: 'none',
                marginBottom: 12
              }}
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>{s.scenarioName}</option>
              ))}
            </select>
            <button
              onClick={() => handleDeleteScenario(selectedIdB)}
              style={{
                background: 'transparent',
                border: 0,
                color: '#ff3b30',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer'
              }}
            >
              🗑️ Delete Scenario B
            </button>
          </div>
        </div>

        {/* PRINT HEADINGS */}
        <div style={{ display: 'none' }} className="only-print">
          <div style={{ border: '1px solid #000', padding: 16, marginBottom: 24 }}>
            <h3>Comparison Report Summary</h3>
            <p><strong>Baseline (Scenario A):</strong> {scenarioA?.scenarioName} ({scenarioA?.policyName})</p>
            <p><strong>Alternative (Scenario B):</strong> {scenarioB?.scenarioName} ({scenarioB?.policyName})</p>
          </div>
        </div>

        {scenarioA && scenarioB && (
          <>
            {/* SCORE CARD COMPARISON BARS */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 24,
              marginBottom: 32
            }}>
              
              {/* Score A Card */}
              <div style={{
                background: 'var(--sn-bg-card)',
                border: '1px solid var(--sn-border)',
                padding: 24,
                borderRadius: '12px',
                textAlign: 'center',
                position: 'relative'
              }}>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--sn-text-secondary)', display: 'block', marginBottom: 8 }}>
                  SCENARIO A SCORE
                </span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 64, fontWeight: 800, color: '#e8edf5', lineHeight: 1 }}>
                  {scenarioA.policyScore}
                </span>
                <span style={{ color: 'var(--sn-text-muted)', fontSize: 18 }}>/100</span>
                <div style={{
                  height: 4,
                  background: '#1e2d47',
                  borderRadius: 2,
                  marginTop: 18,
                  overflow: 'hidden'
                }}>
                  <div style={{ width: `${scenarioA.policyScore}%`, height: '100%', background: 'var(--sn-text-secondary)' }} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--sn-text-secondary)', marginTop: 8, fontStyle: 'italic' }}>
                  {scenarioA.scenarioName}
                </div>
              </div>

              {/* Score B Card */}
              <div style={{
                background: 'var(--sn-bg-card)',
                border: '1px solid var(--sn-border)',
                padding: 24,
                borderRadius: '12px',
                textAlign: 'center',
                position: 'relative'
              }}>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--sn-accent-cyan)', display: 'block', marginBottom: 8 }}>
                  SCENARIO B SCORE
                </span>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 64,
                  fontWeight: 800,
                  color: scenarioB.policyScore > scenarioA.policyScore ? '#00c853' : (scenarioB.policyScore === scenarioA.policyScore ? '#ffffff' : '#ff3b30'),
                  lineHeight: 1
                }}>
                  {scenarioB.policyScore}
                </span>
                <span style={{ color: 'var(--sn-text-muted)', fontSize: 18 }}>/100</span>
                <div style={{
                  height: 4,
                  background: '#1e2d47',
                  borderRadius: 2,
                  marginTop: 18,
                  overflow: 'hidden'
                }}>
                  <div style={{ width: `${scenarioB.policyScore}%`, height: '100%', background: 'var(--sn-accent-cyan)' }} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--sn-accent-cyan)', marginTop: 8, fontStyle: 'italic' }}>
                  {scenarioB.scenarioName}
                </div>
              </div>
            </div>

            {/* WINNER SUMMARY CARD */}
            {winnerSummary && (
              <div style={{
                background: 'rgba(30, 144, 255, 0.04)',
                border: '1px solid var(--sn-border)',
                borderLeft: '4px solid var(--sn-accent-blue)',
                borderRadius: '4px 12px 12px 4px',
                padding: '24px 28px',
                marginBottom: '32px',
                boxShadow: '0 4px 25px rgba(0,0,0,0.25)'
              }}>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--sn-accent-blue)',
                  letterSpacing: '0.15em',
                  marginBottom: 12,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <span style={{ fontSize: 14 }}>🏆</span> WINNER EVALUATION SUMMARY
                </div>
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 18,
                  color: '#ffffff',
                  lineHeight: 1.5,
                  margin: '0 0 16px',
                  fontWeight: 600
                }}>
                  {winnerSummary.winnerText}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div>
                    <span style={{ fontSize: 11, color: '#00c853', fontFamily: 'var(--font-mono)', fontWeight: 700, display: 'block', marginBottom: 8 }}>
                      ADVANTAGES
                    </span>
                    <ul style={{ paddingLeft: 18, margin: 0, fontSize: 13, color: 'var(--sn-text-secondary)', lineHeight: 1.6 }}>
                      {winnerSummary.advantages.map((adv) => (
                        <li key={adv}>{adv}</li>
                      ))}
                      {winnerSummary.advantages.length === 0 && <li>None detected</li>}
                    </ul>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: '#ffb347', fontFamily: 'var(--font-mono)', fontWeight: 700, display: 'block', marginBottom: 8 }}>
                      TRADEOFFS / MONITOR
                    </span>
                    <ul style={{ paddingLeft: 18, margin: 0, fontSize: 13, color: 'var(--sn-text-secondary)', lineHeight: 1.6 }}>
                      {winnerSummary.tradeoffs.map((trade) => (
                        <li key={trade}>{trade}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* COMPARISON METRICS TABLE */}
            <div style={{ marginBottom: 40 }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--sn-text-secondary)',
                letterSpacing: '0.15em',
                marginBottom: '16px',
                fontWeight: 600
              }}>
                DETAILED METRIC COMPARISON
              </div>
              <div style={{ overflowX: 'auto', border: '1px solid var(--sn-border)', borderRadius: '10px', background: 'var(--sn-bg-card)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--sn-border)', background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '16px 20px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--sn-text-secondary)' }}>METRIC</th>
                      <th style={{ padding: '16px 20px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--sn-text-secondary)' }}>SCENARIO A (BASELINE)</th>
                      <th style={{ padding: '16px 20px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--sn-accent-cyan)' }}>SCENARIO B (ALT)</th>
                      <th style={{ padding: '16px 20px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--sn-text-secondary)', textAlign: 'center' }}>DIFFERENCE</th>
                      <th style={{ padding: '16px 20px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--sn-text-secondary)', textAlign: 'center' }}>BETTER</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map((row, idx) => (
                      <tr key={row.metric} style={{ borderBottom: idx === comparisonData.length - 1 ? 0 : '1px solid var(--sn-border)' }}>
                        <td style={{ padding: '16px 20px', fontWeight: 600, color: '#ffffff' }}>{row.metric}</td>
                        <td style={{ padding: '16px 20px', color: 'var(--sn-text-secondary)', fontFamily: 'var(--font-mono)' }}>{row.valA}</td>
                        <td style={{ padding: '16px 20px', color: '#ffffff', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{row.valB}</td>
                        <td style={{ padding: '16px 20px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, color: row.diffColor }}>
                          {row.diffIndicator}
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                          <span style={{
                            background: row.winner === 'B' ? 'rgba(0, 200, 83, 0.15)' : (row.winner === 'A' ? 'rgba(255, 255, 255, 0.05)' : 'transparent'),
                            border: `1px solid ${row.winner === 'B' ? '#00c853' : (row.winner === 'A' ? 'rgba(255, 255, 255, 0.2)' : 'transparent')}`,
                            color: row.winner === 'B' ? '#00c853' : (row.winner === 'A' ? '#ffffff' : 'var(--sn-text-muted)'),
                            padding: '3px 8px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: 12,
                            fontWeight: 'bold',
                            borderRadius: '4px'
                          }}>
                            {row.winner}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ZONE COMPARISON SECTION */}
            {(zoneComparison.improved.length > 0 || zoneComparison.affected.length > 0) && (
              <div style={{ marginBottom: 40 }}>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--sn-text-secondary)',
                  letterSpacing: '0.15em',
                  marginBottom: '16px',
                  fontWeight: 600
                }}>
                  GEOGRAPHIC IMPACT DIFF (ZONE ANALYSIS)
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  
                  {/* Most Improved Zones */}
                  <div style={{
                    background: 'var(--sn-bg-card)',
                    border: '1px solid var(--sn-border)',
                    borderRadius: '8px',
                    padding: 20
                  }}>
                    <span style={{ fontSize: 11, color: '#00c853', fontFamily: 'var(--font-mono)', fontWeight: 700, display: 'block', marginBottom: 12 }}>
                      ▲ MOST IMPROVED ZONES (B vs A)
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {zoneComparison.improved.map((zone) => (
                        <div key={zone.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: 6 }}>
                          <span style={{ color: '#ffffff', fontWeight: 500 }}>{zone.name}</span>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                            <span style={{ color: '#00c853', marginRight: 8 }}>Approval {zone.approvalDiff > 0 ? `+${zone.approvalDiff}%` : `${zone.approvalDiff}%`}</span>
                            <span style={{ color: zone.protestDiff < 0 ? '#00c853' : '#ff3b30' }}>Protest {zone.protestDiff > 0 ? `+${zone.protestDiff}%` : `${zone.protestDiff}%`}</span>
                          </div>
                        </div>
                      ))}
                      {zoneComparison.improved.length === 0 && <span style={{ color: 'var(--sn-text-muted)', fontSize: 12 }}>No significant improvement.</span>}
                    </div>
                  </div>

                  {/* Most Negatively Affected Zones */}
                  <div style={{
                    background: 'var(--sn-bg-card)',
                    border: '1px solid var(--sn-border)',
                    borderRadius: '8px',
                    padding: 20
                  }}>
                    <span style={{ fontSize: 11, color: '#ff3b30', fontFamily: 'var(--font-mono)', fontWeight: 700, display: 'block', marginBottom: 12 }}>
                      ▼ MOST NEGATIVELY AFFECTED ZONES (B vs A)
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {zoneComparison.affected.map((zone) => (
                        <div key={zone.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: 6 }}>
                          <span style={{ color: '#ffffff', fontWeight: 500 }}>{zone.name}</span>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                            <span style={{ color: zone.approvalDiff > 0 ? '#00c853' : '#ff3b30', marginRight: 8 }}>Approval {zone.approvalDiff > 0 ? `+${zone.approvalDiff}%` : `${zone.approvalDiff}%`}</span>
                            <span style={{ color: zone.protestDiff < 0 ? '#00c853' : '#ff3b30' }}>Protest {zone.protestDiff > 0 ? `+${zone.protestDiff}%` : `${zone.protestDiff}%`}</span>
                          </div>
                        </div>
                      ))}
                      {zoneComparison.affected.length === 0 && <span style={{ color: 'var(--sn-text-muted)', fontSize: 12 }}>No zones negatively affected.</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* CSS FOR PRINT MEDIA OVERRIDES */}
        <style>{`
          @media print {
            .no-print {
              display: none !important;
            }
            .only-print {
              display: block !important;
            }
            body {
              background: #ffffff !important;
              color: #000000 !important;
            }
            * {
              color: #000000 !important;
              background: transparent !important;
              box-shadow: none !important;
              border-color: #cccccc !important;
            }
            .sn-card, table {
              border: 1px solid #000000 !important;
            }
          }
        `}</style>
      </div>
    </motion.div>
  );
}
