import { useNavigate } from 'react-router-dom'

const CITIES = [
  { id: 'DEL', name: 'Delhi', grade: 'A', zones: 9, desc: 'National capital — validated against Delhi Metro Phase 4 ridership' },
  { id: 'MUM', name: 'Mumbai', grade: 'A', zones: 9, desc: 'Financial capital — validated against Western Railway patterns' },
  { id: 'BLR', name: 'Bengaluru', grade: 'B', zones: 9, desc: 'Tech capital — calibrated against Namma Metro Phase 1' },
  { id: 'CHN', name: 'Chennai', grade: 'B', zones: 9, desc: 'Industrial hub — validated against NEET 2024 trust cascade' },
  { id: 'HYD', name: 'Hyderabad', grade: 'B', zones: 9, desc: 'Emerging tech hub — calibrated against MMTS ridership' },
  { id: 'KOL', name: 'Kolkata', grade: 'C', zones: 9, desc: 'Eastern metro — limited validation data available' },
]

const STEPS = [
  { icon: '⚙️', title: 'Configure', desc: 'Describe any policy in natural language' },
  { icon: '🧬', title: 'Simulate', desc: '10,000 autonomous agents decide independently' },
  { icon: '📊', title: 'Analyse', desc: 'Causal chains, counterfactuals, confidence intervals' },
]

const RECENT = [
  { scenario: 'Delhi Railway 20% Fare Hike', agents: '10,000', result: 'Protest probability 42% by day 18', grade: 'A' },
  { scenario: 'NEET 2024 Trust Cascade', agents: '10,000', result: '23% trust decline predicted (actual: 21.4%)', grade: 'A' },
  { scenario: 'Mumbai Western Rail Strike', agents: '10,000', result: 'Dharavi informal economy -31% footfall', grade: 'A' },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen" style={{ background: 'var(--sn-bg-primary)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5" style={{ borderBottom: '1px solid var(--sn-border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-lg"
               style={{ background: 'linear-gradient(135deg, #1e90ff, #0066cc)', color: 'white' }}>
            SN
          </div>
          <div>
            <h1 className="text-lg font-semibold" style={{ color: 'var(--sn-text-primary)' }}>Synthetic Nation</h1>
            <p className="text-xs" style={{ color: 'var(--sn-text-muted)' }}>Autonomous Policy Simulation Engine</p>
          </div>
        </div>
        <nav className="flex gap-6">
          <button onClick={() => navigate('/validation')}
                  className="text-sm font-medium hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--sn-text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Validation
          </button>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-8 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-xs font-medium"
             style={{ background: 'rgba(30, 144, 255, 0.1)', color: 'var(--sn-accent-blue)', border: '1px solid rgba(30, 144, 255, 0.2)' }}>
          <span className="status-dot status-live" /> 100,000 autonomous agents ready
        </div>
        <h2 className="text-4xl font-bold mb-4 leading-tight" style={{ color: 'var(--sn-text-primary)' }}>
          Test policies on AI citizens<br />
          <span style={{ color: 'var(--sn-accent-blue)' }}>before testing on real ones.</span>
        </h2>
        <p className="text-base max-w-2xl mx-auto mb-10" style={{ color: 'var(--sn-text-secondary)', lineHeight: 1.7 }}>
          Synthetic Nation simulates 100,000 autonomous AI agents — each with unique income, commute patterns,
          and social networks — to predict how policy changes ripple through Indian cities with sub-7% error.
        </p>

        {/* How it works */}
        <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto mb-16">
          {STEPS.map((s, i) => (
            <div key={i} className="sn-card text-center">
              <div className="text-3xl mb-3">{s.icon}</div>
              <h3 className="font-semibold mb-1 text-sm" style={{ color: 'var(--sn-text-primary)' }}>{s.title}</h3>
              <p className="text-xs" style={{ color: 'var(--sn-text-secondary)' }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* City Selector */}
      <section className="max-w-5xl mx-auto px-8 pb-12">
        <h3 className="text-lg font-semibold mb-6" style={{ color: 'var(--sn-text-primary)' }}>
          Select a city to simulate
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {CITIES.map(city => (
            <button
              key={city.id}
              onClick={() => navigate(`/simulate/${city.id}`)}
              className="sn-card text-left cursor-pointer group"
              style={{ border: '1px solid var(--sn-border)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-lg" style={{ color: 'var(--sn-text-primary)' }}>{city.name}</span>
                <span className={`grade-badge grade-${city.grade}`}>{city.grade}</span>
              </div>
              <p className="text-xs mb-2" style={{ color: 'var(--sn-text-secondary)' }}>{city.desc}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono" style={{ color: 'var(--sn-text-muted)' }}>{city.zones} zones</span>
                <span className="text-xs" style={{ color: 'var(--sn-accent-blue)', opacity: 0, transition: 'opacity 0.2s' }}
                      ref={el => { if (el) el.closest('.group')?.addEventListener('mouseenter', () => el.style.opacity = '1'); el?.closest('.group')?.addEventListener('mouseleave', () => el.style.opacity = '0'); }}>
                  Configure →
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Recent Results */}
      <section className="max-w-5xl mx-auto px-8 pb-16">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--sn-text-primary)' }}>Recent simulations</h3>
        <div className="space-y-3">
          {RECENT.map((r, i) => (
            <div key={i} className="sn-card flex items-center justify-between py-3 px-5">
              <div>
                <span className="font-medium text-sm" style={{ color: 'var(--sn-text-primary)' }}>{r.scenario}</span>
                <span className="ml-4 text-xs font-mono" style={{ color: 'var(--sn-text-muted)' }}>{r.agents} agents</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono" style={{ color: 'var(--sn-accent-blue)' }}>{r.result}</span>
                <span className={`grade-badge grade-${r.grade}`} style={{ width: 24, height: 24, fontSize: 11 }}>{r.grade}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
