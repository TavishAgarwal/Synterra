import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cityProfiles, getCityById } from '../data/cityProfiles';
import { useSimulationContext } from '../context/SimulationContext';
import { API_BASE } from '../api/config';
import type { SimulationSummary } from '../api/simulation';

export default function CitySelector() {
  const navigate = useNavigate();
  const { setSelectedCity, setStep, setSimulationId, setSimulationSummary } = useSimulationContext();
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [inspectorCityId, setInspectorCityId] = useState<string>('delhi');
  const [pastRuns, setPastRuns] = useState<{status: string; city_id: string; simulation_id: string; summary: SimulationSummary; created_at: string; policy_text: string; verdict: string; score: number}[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchRuns = async () => {
      try {
        setLoadingRuns(true);
        const res = await fetch(`${API_BASE}/api/simulations`);
        if (!active) return;
        if (!res.ok) throw new Error('Failed to load past runs');
        const data = await res.json();
        if (active && data && data.simulations) {
          // Only show completed/error runs
          setPastRuns(data.simulations.filter((r: {status: string}) => r.status === 'complete'));
        }
      } catch (err) {
        if (active) console.error(err);
      } finally {
        if (active) setLoadingRuns(false);
      }
    };
    fetchRuns();
    return () => { active = false; };
  }, []);

  const handleCityClick = (cityId: string) => {
    const city = cityProfiles.find((item) => item.id === cityId);
    if (!city) return;
    setSelectedCity(city);
    setStep(1);
    navigate(`/policy/${city.id}`);
  };

  const handlePastRunClick = (run: {city_id: string; simulation_id: string; summary: SimulationSummary}) => {
    const city = getCityById(run.city_id);
    if (city) setSelectedCity(city);
    setSimulationId(run.simulation_id);
    setSimulationSummary(run.summary);
    setStep(3);
    navigate(`/results/${run.simulation_id}`);
  };

  const inspectorCity = cityProfiles.find((c) => c.id === inspectorCityId) || cityProfiles[0];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        minHeight: 'calc(100vh - 40px)',
        background: 'var(--color-void)',
        display: 'flex',
        justifyContent: 'center',
        padding: '48px 24px 80px',
      }}
    >
      <div style={{ maxWidth: 960, width: '100%' }}>
        <div className="glass-panel" style={{ borderLeft: '3px solid var(--color-primary)', padding: '16px 20px', marginBottom: 32, borderRadius: '0 8px 8px 0' }}>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Describe a policy. We simulate how 10,000 autonomous AI agents react to it — each with their own personality vector, budget constraints, and NetworkX social connections. You get a detailed causal lineage, a verdict score, and policy recommendations in about 1 minute.
          </p>
        </div>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, marginBottom: 10, letterSpacing: '-0.02em' }}>
            Select City Horizon to Model
          </h1>
          <p style={{ color: 'var(--color-text-dim)', fontSize: 14, lineHeight: 1.6, maxWidth: 640 }}>
            Each municipal zone contains customized transit mode splits, income deciles, and geographic constraints mapped to real-world Indian metropolises.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 24, marginBottom: 48 }}>
          {/* Left Column: 2-column City Selection Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16, alignContent: 'start' }}>
            {cityProfiles.map((city) => {
              const isHovered = hoveredCity === city.id;
              const isInspected = inspectorCityId === city.id;
              return (
                <button
                  key={city.id}
                  onClick={() => handleCityClick(city.id)}
                  onMouseEnter={() => {
                    setHoveredCity(city.id);
                    setInspectorCityId(city.id);
                  }}
                  onMouseLeave={() => setHoveredCity(null)}
                  style={{
                    background: 'var(--color-surface)',
                    border: `1px solid ${isInspected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    borderLeft: isInspected ? '3px solid var(--color-primary)' : '1px solid var(--color-border)',
                    padding: 20,
                    textAlign: 'left',
                    borderRadius: 8,
                    cursor: 'pointer',
                    boxShadow: isInspected ? '0 0 10px rgba(6, 182, 212, 0.15)' : 'none',
                    transition: 'all 150ms ease-out',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                      {city.name}
                    </span>
                    <span style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--color-text-dim)' }}>
                      {city.population}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12 }}>{city.state}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                    {city.pills.map((pill) => (
                      <span
                        key={pill}
                        style={{ background: 'var(--color-surface-low)', border: '1px solid var(--color-border)', padding: '3px 8px', borderRadius: 4, fontFamily: 'var(--font-data)', fontSize: 9, color: 'var(--color-text-secondary)' }}
                      >
                        {pill}
                      </span>
                    ))}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--color-text-dim)', lineHeight: 1.5, marginBottom: 16 }}>
                    {city.description}
                  </p>
                  <span style={{ fontFamily: 'var(--font-data)', fontSize: 12, color: 'var(--color-primary)', fontWeight: 500, textDecoration: isHovered ? 'underline' : 'none' }}>
                    Initialize scenario →
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Column: Dynamic Demographic Inspector Panel */}
          <div className="glass-panel" style={{ padding: 24, borderRadius: 12, border: '1px solid var(--color-border)', height: 'fit-content', position: 'sticky', top: 24 }}>
            <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 12, marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-data)', fontSize: 10, color: 'var(--color-primary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                Demographic Inspector
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {inspectorCity.name} Metrics
              </h3>
              <p style={{ fontSize: 12, color: 'var(--color-text-ghost)', margin: 0 }}>
                {inspectorCity.state} · {inspectorCity.population} Population
              </p>
            </div>

            {/* Commuter Archetypes Breakdown */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--color-text-dim)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12 }}>
                Commuter Archetypes Share
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {inspectorCity.archetypes.map((arch) => (
                  <div key={arch.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{arch.name}</span>
                      <span style={{ fontFamily: 'var(--font-data)', color: 'var(--color-text-primary)' }}>{arch.percent}%</span>
                    </div>
                    <div style={{ width: '100%', height: 6, background: '#111318', border: '1px solid var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${arch.percent}%`, height: '100%', background: arch.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* City Sensitivities */}
            <div style={{ marginBottom: 20, borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
              <h4 style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--color-text-dim)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
                Simulated Sensitivities
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {inspectorCity.sensitivities.map((s, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                    <span style={{ color: 'var(--color-primary)', fontSize: 14, lineHeight: 1 }}>•</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Past Interventions */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
              <h4 style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--color-text-dim)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
                Historical Reference Policies
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {inspectorCity.pastPolicies.map((p, idx) => (
                  <div key={idx} style={{ padding: '8px 12px', background: 'var(--color-surface-low)', border: '1px solid var(--color-border)', borderRadius: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 2 }}>
                      <span>{p.name}</span>
                      <span style={{ fontFamily: 'var(--font-data)', color: 'var(--color-text-ghost)', fontSize: 11 }}>{p.year}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-warn)' }}>
                      Outcome: {p.outcome}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SQLite Past Runs */}
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 32 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, marginBottom: 8, letterSpacing: '-0.01em' }}>
            Historical Simulation Logs
          </h2>
          <p style={{ color: 'var(--color-text-dim)', fontSize: 13, marginBottom: 20 }}>
            Query persistent SQLite records of completed counterfactual and baseline simulations.
          </p>

          {loadingRuns ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-ghost)', fontFamily: 'var(--font-data)', fontSize: 12 }}>
              Loading logs from sqlite_db...
            </div>
          ) : pastRuns.length === 0 ? (
            <div className="glass-panel" style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-dim)', borderRadius: 8 }}>
              No completed simulation logs found in the database. Run a simulation to log results.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pastRuns.map((run) => {
                const runCity = getCityById(run.city_id);
                const scoreColor = run.score >= 80 ? 'var(--color-success)' : run.score >= 55 ? 'var(--color-warn)' : 'var(--color-alert)';
                const dateStr = run.created_at ? new Date(run.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'Unknown date';
                
                return (
                  <button
                    key={run.simulation_id}
                    onClick={() => handlePastRunClick(run)}
                    style={{
                      width: '100%',
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      padding: '16px 20px',
                      borderRadius: 8,
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'grid',
                      gridTemplateColumns: '120px 1fr 100px 80px',
                      alignItems: 'center',
                      gap: 16,
                      transition: 'all 150ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-primary-border)';
                      e.currentTarget.style.background = 'rgba(6, 182, 212, 0.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-border)';
                      e.currentTarget.style.background = 'var(--color-surface)';
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 14 }}>
                        {runCity?.name || run.city_id}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--color-text-ghost)', fontFamily: 'var(--font-data)', marginTop: 2 }}>
                        {dateStr}
                      </div>
                    </div>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {run.policy_text}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: 10,
                        fontFamily: 'var(--font-data)',
                        background: run.score >= 80 ? 'var(--color-success-dim)' : run.score >= 55 ? 'var(--color-warn-dim)' : 'var(--color-alert-dim)',
                        border: `1px solid ${scoreColor}`,
                        color: scoreColor,
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontWeight: 500,
                      }}>
                        {run.verdict}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 'bold', color: scoreColor }}>
                      {run.score}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
