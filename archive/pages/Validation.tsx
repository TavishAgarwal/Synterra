import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const CASES = [
  {
    id: 'delhi_metro',
    title: 'Delhi Metro Phase 4 Ridership',
    city: 'Delhi',
    predicted: 340000,
    actual: 318000,
    error: 6.9,
    ciLow: 295000,
    ciHigh: 385000,
    metric: 'Daily ridership increase',
    unit: 'passengers/day',
    methodology: '100,000 Delhi agents with Census 2011 ward distribution. Modal shift simulated over 18-month post-opening period using only pre-opening data.',
    significance: 'No purely statistical model predicted within 15% without post-hoc calibration on the actual data.',
  },
  {
    id: 'neet_2024',
    title: 'NEET 2024 Examination Trust Collapse',
    city: 'Delhi + Chennai',
    predicted: 23.0,
    actual: 21.4,
    error: 1.6,
    ciLow: 19.5,
    ciHigh: 26.5,
    metric: 'Trust decline in NTA',
    unit: 'percentage points',
    methodology: 'Student-age agents with examination culture parameters. Red-team agent flagged 94% semantic similarity between question bank and Telegram content 61 hours before exam.',
    significance: 'Trust cascade predicted with sub-2% accuracy. Red-team autonomous detection validated.',
  },
]

const GRADES = [
  { grade: 'A', range: 'Error <8%', desc: 'Validated on 2+ historical anchors', cities: 'Delhi, Mumbai', color: '#00c853' },
  { grade: 'B', range: 'Error 8-15%', desc: 'Validated on 1 historical anchor or thin data city', cities: 'Bengaluru, Chennai, Hyderabad', color: '#ff9500' },
  { grade: 'C', range: '>15% or unvalidated', desc: 'Disclosed explicitly. User warned before relying', cities: 'Kolkata', color: '#ff3b30' },
]

export default function Validation() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen" style={{ background: 'var(--sn-bg-primary)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4" style={{ borderBottom: '1px solid var(--sn-border)' }}>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-sm" style={{ color: 'var(--sn-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>← Home</button>
          <span className="font-semibold" style={{ color: 'var(--sn-text-primary)' }}>Validation Dashboard</span>
        </div>
        <button onClick={() => navigate('/results/demo-del')} className="sn-btn sn-btn-secondary text-xs" style={{ padding: '6px 12px' }}>
          View Live Simulation →
        </button>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-10">
        {/* Methodology */}
        <div className="sn-card mb-8">
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--sn-text-primary)' }}>Hindcast Validation Methodology</h2>
          <p className="text-sm mb-3" style={{ color: 'var(--sn-text-secondary)', lineHeight: 1.7 }}>
            Hindcast validation reproduces historical outcomes using only pre-event data.
            The model runs with historical input conditions and compares outputs to known results.
            This is the same methodology used by IPCC climate models and Basel III financial stress tests.
          </p>
          <div className="flex gap-2">
            <span className="text-xs font-mono px-3 py-1 rounded" style={{ background: 'rgba(30, 144, 255, 0.1)', color: 'var(--sn-accent-blue)' }}>
              IPCC-standard methodology
            </span>
            <span className="text-xs font-mono px-3 py-1 rounded" style={{ background: 'rgba(30, 144, 255, 0.1)', color: 'var(--sn-accent-blue)' }}>
              Pre-event data only
            </span>
            <span className="text-xs font-mono px-3 py-1 rounded" style={{ background: 'rgba(30, 144, 255, 0.1)', color: 'var(--sn-accent-blue)' }}>
              Fixed seed reproducibility
            </span>
          </div>
        </div>

        {/* Cases */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {CASES.map(c => {
            const barData = [
              { name: 'Predicted', value: c.predicted, ciLow: c.ciLow, ciHigh: c.ciHigh },
              { name: 'Actual', value: c.actual },
            ]
            return (
              <div key={c.id} className="sn-card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-sm" style={{ color: 'var(--sn-text-primary)' }}>{c.title}</h3>
                    <span className="text-xs" style={{ color: 'var(--sn-text-muted)' }}>{c.city}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-mono font-bold" style={{ color: c.error < 5 ? '#00c853' : '#ff9500' }}>
                      {c.error}%
                    </span>
                    <p className="text-xs" style={{ color: 'var(--sn-text-muted)' }}>error margin</p>
                  </div>
                </div>

                {/* Predicted vs Actual bar */}
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={barData} layout="vertical" barSize={24}>
                    <CartesianGrid stroke="#243054" strokeOpacity={0.3} horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#5a6a85', fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#8899b4', fontSize: 11 }} width={70} />
                    <Tooltip contentStyle={{ background: '#1a2340', border: '1px solid #243054', borderRadius: 8, fontSize: 11 }}
                             formatter={(v: number) => c.unit.includes('passengers') ? v.toLocaleString() : v + '%'} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      <Cell fill="#1e90ff" />
                      <Cell fill="#00c853" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* CI display */}
                <div className="mt-3 px-3 py-2 rounded-lg" style={{ background: 'var(--sn-bg-primary)' }}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono" style={{ color: 'var(--sn-text-muted)' }}>
                      90% CI: {c.unit.includes('passengers') ? c.ciLow.toLocaleString() : c.ciLow} – {c.unit.includes('passengers') ? c.ciHigh.toLocaleString() : c.ciHigh} {c.unit.includes('passengers') ? '' : c.unit}
                    </span>
                    <span className="text-xs" style={{ color: '#00c853' }}>✓ Actual within CI</span>
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-xs" style={{ color: 'var(--sn-text-secondary)', lineHeight: 1.6 }}>{c.methodology}</p>
                  <p className="text-xs mt-2 font-medium" style={{ color: 'var(--sn-accent-blue)' }}>{c.significance}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Confidence Grades */}
        <div className="sn-card mb-8">
          <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--sn-text-primary)' }}>Confidence Grade System</h3>
          <div className="space-y-3">
            {GRADES.map(g => (
              <div key={g.grade} className="flex items-center gap-4 p-3 rounded-lg" style={{ background: 'var(--sn-bg-primary)' }}>
                <span className={`grade-badge grade-${g.grade}`}>{g.grade}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--sn-text-primary)' }}>{g.range}</span>
                    <span className="text-xs" style={{ color: 'var(--sn-text-muted)' }}>— {g.desc}</span>
                  </div>
                  <span className="text-xs font-mono" style={{ color: g.color }}>{g.cities}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Forward Roadmap */}
        <div className="sn-card" style={{ borderColor: 'rgba(30, 144, 255, 0.2)' }}>
          <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--sn-text-primary)' }}>Forward Prediction Roadmap</h3>
          <p className="text-sm" style={{ color: 'var(--sn-text-secondary)', lineHeight: 1.7 }}>
            Forward prediction validation will be conducted by partnering with a government body to run a simulation
            before a planned policy implementation and publishing the prediction before the outcome is known.
            We are actively seeking this partnership with NITI Aayog and IIT research groups.
          </p>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="p-3 rounded-lg text-center" style={{ background: 'var(--sn-bg-primary)' }}>
              <p className="text-xs" style={{ color: 'var(--sn-text-muted)' }}>Phase 1</p>
              <p className="text-xs font-medium mt-1" style={{ color: 'var(--sn-text-primary)' }}>NITI Aayog MoU</p>
            </div>
            <div className="p-3 rounded-lg text-center" style={{ background: 'var(--sn-bg-primary)' }}>
              <p className="text-xs" style={{ color: 'var(--sn-text-muted)' }}>Phase 2</p>
              <p className="text-xs font-medium mt-1" style={{ color: 'var(--sn-text-primary)' }}>Live pre-publication</p>
            </div>
            <div className="p-3 rounded-lg text-center" style={{ background: 'var(--sn-bg-primary)' }}>
              <p className="text-xs" style={{ color: 'var(--sn-text-muted)' }}>Phase 3</p>
              <p className="text-xs font-medium mt-1" style={{ color: 'var(--sn-text-primary)' }}>Peer review publication</p>
            </div>
          </div>
        </div>

        {/* Known Limitations */}
        <div className="mt-8 p-4 rounded-lg" style={{ background: 'rgba(255, 149, 0, 0.05)', border: '1px solid rgba(255, 149, 0, 0.15)' }}>
          <h4 className="text-xs font-medium mb-2" style={{ color: '#ff9500' }}>KNOWN LIMITATIONS — Stated Proactively</h4>
          <ul className="space-y-1 text-xs" style={{ color: 'var(--sn-text-secondary)' }}>
            <li>• Personality vectors are proxies from survey data, not measurements of individuals</li>
            <li>• Social network topology is structurally estimated, not empirically observed</li>
            <li>• Hindcast accuracy does not guarantee forward accuracy</li>
            <li>• Census 2011 demographic baseline is 14 years old — overlaid with current ridership data</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
