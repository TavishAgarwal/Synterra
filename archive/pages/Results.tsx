import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Area, AreaChart, ComposedChart,
} from 'recharts'

// ═══════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════
interface DayData {
  day: number
  modal_shift: Record<string, number>
  protest_probability: number
  revenue_impact: number
  equity_by_decile: Record<string, number>
  confidence_intervals: { protest_probability: number; revenue_impact: number; modal_shift: Record<string, number> }
  agent_summary: { total: number; mode_switch: number; protest_join: number; no_change: number }
  alerts: Array<{ type: string; severity: string; message: string; agent_source: string; policy_alternative?: any }>
  network_sample: Array<{ id: string; archetype: string; sentiment: number; tier: number; action: string }>
}

interface CausalNode {
  label: string
  agent_count: number
  decision?: string
  children: CausalNode[]
}

// ═══════════════════════════════════════════════════
// DEMO DATA (embedded for instant load)
// ═══════════════════════════════════════════════════
function generateDemoData(): DayData[] {
  const days: DayData[] = []
  for (let day = 1; day <= 30; day++) {
    const t = day / 30
    const ms: Record<string, number> = {
      daily_wage_worker: Math.min(0.95, 0.15 + 0.85 * (1 - Math.exp(-0.15 * day))),
      formal_sector_employee: Math.min(0.42, day >= 7 ? 0.05 * day / 7 : 0.02),
      government_employee: 0.02 + (Math.random() - 0.5) * 0.01,
      tech_knowledge_worker: Math.min(0.08, 0.01 * day / 14),
      small_business_owner: Math.min(0.35, 0.03 + 0.12 * t),
      student: Math.min(0.25, day >= 3 ? 0.04 * day / 10 : 0.01),
      homemaker: Math.min(0.55, 0.08 + 0.45 * (1 - Math.exp(-0.1 * day))),
      street_vendor: Math.min(0.88, 0.20 + 0.70 * (1 - Math.exp(-0.12 * day))),
      retired: Math.min(0.30, 0.02 + 0.15 * t),
      migrant_worker: Math.min(0.82, 0.18 + 0.65 * (1 - Math.exp(-0.13 * day))),
      healthcare_worker: Math.min(0.15, 0.01 + 0.06 * t),
      exam_aspirant: Math.min(0.12, 0.01 + 0.04 * t),
      gig_economy_worker: Math.max(-0.15, -0.05 - 0.10 * t),
      journalist_tier1: Math.min(0.20, 0.02 + 0.08 * t),
    }
    let pp: number
    if (day < 5) pp = 0.05 + 0.03 * day
    else if (day < 18) pp = 0.18 + 0.015 * (day - 5)
    else if (day === 18) pp = 0.42
    else if (day < 22) pp = 0.38 + (Math.random() - 0.5) * 0.02
    else pp = 0.35 + (Math.random() - 0.5) * 0.03

    const ri = -(0.05 + 0.10 * (1 - Math.exp(-0.08 * day))) + (Math.random() - 0.5) * 0.01
    const eq: Record<string, number> = {}
    for (let d = 1; d <= 10; d++) eq[`D${d}`] = -((0.25 - 0.02 * d) * (1 - Math.exp(-0.1 * day)))

    const alerts: DayData['alerts'] = []
    if (day === 11) alerts.push({ type: 'collective_action', severity: 'warning', message: 'Coalition formation detected in DEL_SHAHDARA. 127 agents crossed collective action threshold autonomously.', agent_source: 'Tier 2 journalist' })
    if (day === 18) alerts.push({ type: 'government_alert', severity: 'critical', message: 'Protest probability in DEL_SHAHDARA exceeds 38%. Autonomous recommendation: consider phased 10% increase over 60 days — projected resistance reduction 61%.', agent_source: 'Government Agent', policy_alternative: { magnitude: 10, timeline_days: 60, projected_resistance_reduction: 0.61 } })
    if (day === 22) alerts.push({ type: 'redteam_alert', severity: 'info', message: 'Red-team analysis: Most harmed invisible segment is exam_aspirant (coaching commute non-negotiable, family absorbs cost silently).', agent_source: 'Red-Team Agent' })

    const net: DayData['network_sample'] = []
    const archs = Object.keys(ms)
    for (let i = 0; i < 50; i++) {
      const arch = archs[i % 14]
      net.push({ id: `T1_${arch.slice(0,4).toUpperCase()}_${String(i).padStart(5,'0')}`, archetype: arch, sentiment: -(ms[arch] * 0.7 + (Math.random() - 0.5) * 0.1), tier: i < 40 ? 1 : i < 47 ? 2 : 3, action: ms[arch] > 0.3 ? 'mode_switch' : 'no_change' })
    }

    const total = 10000
    const msCount = Math.round(Object.values(ms).filter(v => v > 0).reduce((a, b) => a + b, 0) / 14 * total)
    days.push({
      day, modal_shift: ms, protest_probability: pp, revenue_impact: ri,
      equity_by_decile: eq,
      confidence_intervals: { protest_probability: pp * 0.15 + 0.02, revenue_impact: Math.abs(ri) * 0.18 + 0.01, modal_shift: Object.fromEntries(Object.entries(ms).map(([k, v]) => [k, Math.abs(v) * 0.12 + 0.02])) },
      agent_summary: { total, mode_switch: msCount, protest_join: Math.round(pp * total * 0.6), no_change: Math.max(0, total - msCount - Math.round(pp * total * 0.6)) },
      alerts, network_sample: net,
    })
  }
  return days
}

const CAUSAL_TREE: CausalNode = {
  label: 'Protest probability spike to 42%', agent_count: 4200,
  children: [
    { label: 'Shahdara D4 income cluster — 68% mode_switch by day 14', agent_count: 1840, decision: 'mode_switch → protest cascade',
      children: [
        { label: 'Daily wage workers: fare > 8% of daily wage', agent_count: 1200, decision: 'Autonomous mode_switch at day 3',
          children: [{ label: 'Remittance migrants: disposable < ₹180/day', agent_count: 340, decision: 'return_migration evaluation', children: [] }] },
        { label: 'Street vendors: supply chain + commute double cost', agent_count: 640, decision: 'vendor_relocate, footfall -31%',
          children: [{ label: 'Homemaker trip consolidation → market cascading drop', agent_count: 480, decision: '14 informal markets lost viability', children: [] }] },
      ] },
    { label: 'Tier 2 journalist broadcast at day 11', agent_count: 3, decision: 'Autonomous resistance broadcast',
      children: [{ label: '127 Tier 1 agents updated collective_action_threshold', agent_count: 127, decision: 'Belief contagion cascade', children: [] }] },
    { label: 'Tier 3 bureaucrat — autonomous policy concern', agent_count: 1, decision: 'Alternative: 10% over 60 days, -61% resistance',
      children: [{ label: 'Government Agent autonomous alert triggered', agent_count: 1, decision: 'Unprompted recommendation generated', children: [] }] },
  ],
}

// CF data
function genCfData() {
  const d = []
  for (let day = 1; day <= 30; day++) {
    d.push({ day, protest_probability: Math.min(0.14, 0.02 + 0.005 * day), modal_shift_avg: Math.min(0.18, 0.03 + 0.15 * (1 - Math.exp(-0.08 * day))), revenue_impact: -(0.02 + 0.04 * (1 - Math.exp(-0.06 * day))) })
  }
  return d
}

// ═══════════════════════════════════════════════════
// Components
// ═══════════════════════════════════════════════════

function ProtestGauge({ value, ci }: { value: number; ci: number }) {
  const pct = Math.min(1, Math.max(0, value))
  const r = 60, circ = 2 * Math.PI * r
  const offset = circ * (1 - pct * 0.75)
  const color = pct > 0.35 ? '#ff3b30' : pct > 0.2 ? '#ff9500' : '#00c853'
  return (
    <div className="flex flex-col items-center">
      <svg width={150} height={100} viewBox="0 0 150 100">
        <path d="M 15 85 A 60 60 0 0 1 135 85" fill="none" stroke="#243054" strokeWidth={10} strokeLinecap="round" />
        <path d="M 15 85 A 60 60 0 0 1 135 85" fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"
              strokeDasharray={`${circ * 0.75}`} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        <text x={75} y={72} textAnchor="middle" fill={color} fontSize={22} fontFamily="IBM Plex Mono" fontWeight={700}>
          {(pct * 100).toFixed(0)}%
        </text>
        <text x={75} y={90} textAnchor="middle" fill="#5a6a85" fontSize={9} fontFamily="IBM Plex Mono">
          ±{(ci * 100).toFixed(1)}%
        </text>
      </svg>
      <span className="text-xs font-mono mt-1" style={{ color: '#8899b4' }}>Protest Index</span>
    </div>
  )
}

function CausalTree({ node, depth = 0 }: { node: CausalNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 2)
  const hasChildren = node.children.length > 0
  return (
    <div className="ml-4" style={{ borderLeft: depth > 0 ? '1px solid var(--sn-border)' : 'none', paddingLeft: depth > 0 ? 12 : 0 }}>
      <div className="flex items-start gap-2 py-2 cursor-pointer group" onClick={() => setOpen(!open)}>
        {hasChildren && <span className="text-xs mt-0.5" style={{ color: 'var(--sn-accent-blue)' }}>{open ? '▼' : '▶'}</span>}
        <div>
          <span className="text-xs font-medium" style={{ color: 'var(--sn-text-primary)' }}>{node.label}</span>
          <span className="text-xs font-mono ml-2" style={{ color: 'var(--sn-text-muted)' }}>{node.agent_count.toLocaleString()} agents</span>
          {node.decision && <p className="text-xs mt-0.5" style={{ color: 'var(--sn-accent-cyan, var(--sn-accent-blue))' }}>{node.decision}</p>}
        </div>
      </div>
      {open && hasChildren && node.children.map((c, i) => <CausalTree key={i} node={c} depth={depth + 1} />)}
    </div>
  )
}

function AlertFeed({ alerts }: { alerts: DayData['alerts'] }) {
  if (!alerts.length) return null
  return (
    <div className="space-y-2 animate-in">
      {alerts.map((a, i) => (
        <div key={i} className={`alert-${a.severity === 'critical' ? 'critical' : a.severity === 'warning' ? 'warning' : 'info'} ${a.severity === 'critical' ? 'pulse-critical' : ''}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold" style={{ color: a.severity === 'critical' ? '#ff3b30' : a.severity === 'warning' ? '#ff9500' : '#1e90ff' }}>
              {a.agent_source}
            </span>
            <span className="text-xs" style={{ color: 'var(--sn-text-muted)' }}>autonomous</span>
          </div>
          <p className="text-xs" style={{ color: 'var(--sn-text-primary)' }}>{a.message}</p>
          {a.policy_alternative && (
            <div className="mt-2 flex gap-2">
              <span className="text-xs font-mono px-2 py-1 rounded" style={{ background: 'rgba(0,200,83,0.1)', color: '#00c853' }}>
                Alt: {a.policy_alternative.magnitude}% over {a.policy_alternative.timeline_days}d
              </span>
              <span className="text-xs font-mono px-2 py-1 rounded" style={{ background: 'rgba(0,200,83,0.1)', color: '#00c853' }}>
                -{(a.policy_alternative.projected_resistance_reduction * 100).toFixed(0)}% resistance
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function NetworkVis({ nodes }: { nodes: DayData['network_sample'] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const w = c.width, h = c.height
    ctx.clearRect(0, 0, w, h)
    // Position nodes in a force-like layout
    const positioned = nodes.map((n, i) => {
      const angle = (i / nodes.length) * Math.PI * 2
      const radius = n.tier === 3 ? 20 : n.tier === 2 ? 60 : 80 + Math.random() * 40
      return { ...n, x: w / 2 + Math.cos(angle) * radius, y: h / 2 + Math.sin(angle) * radius }
    })
    // Draw edges (sparse)
    ctx.strokeStyle = 'rgba(36, 48, 84, 0.4)'
    ctx.lineWidth = 0.5
    for (let i = 0; i < positioned.length; i++) {
      const j = (i + 1) % positioned.length
      ctx.beginPath(); ctx.moveTo(positioned[i].x, positioned[i].y); ctx.lineTo(positioned[j].x, positioned[j].y); ctx.stroke()
      // Connect to center hubs
      if (positioned[i].tier === 1 && i % 5 === 0) {
        const hub = positioned.find(p => p.tier >= 2)
        if (hub) { ctx.beginPath(); ctx.moveTo(positioned[i].x, positioned[i].y); ctx.lineTo(hub.x, hub.y); ctx.stroke() }
      }
    }
    // Draw nodes
    for (const n of positioned) {
      const s = n.sentiment
      const r = Math.round(Math.max(0, -s) * 255)
      const g = Math.round(Math.max(0, s) * 200)
      ctx.fillStyle = `rgb(${r}, ${g + 60}, ${80})`
      const size = n.tier === 3 ? 6 : n.tier === 2 ? 4 : 2
      ctx.beginPath(); ctx.arc(n.x, n.y, size, 0, Math.PI * 2); ctx.fill()
      if (n.tier >= 2) { ctx.strokeStyle = '#1e90ff'; ctx.lineWidth = 1; ctx.stroke() }
    }
  }, [nodes])
  return <canvas ref={canvasRef} width={280} height={220} style={{ width: '100%', height: 220 }} />
}

// ═══════════════════════════════════════════════════
// Main Results Page
// ═══════════════════════════════════════════════════
export default function Results() {
  const navigate = useNavigate()
  const [days, setDays] = useState<DayData[]>([])
  const [currentDay, setCurrentDay] = useState(0)
  const [streaming, setStreaming] = useState(true)
  const [showCausal, setShowCausal] = useState(false)
  const [showCf, setShowCf] = useState(false)
  const [cfData] = useState(genCfData())
  const allData = useRef(generateDemoData())
  const allAlerts = useRef<DayData['alerts']>([])

  // Stream simulation data
  useEffect(() => {
    let idx = 0
    const iv = setInterval(() => {
      if (idx < allData.current.length) {
        const d = allData.current[idx]
        setDays(prev => [...prev, d])
        setCurrentDay(d.day)
        if (d.alerts.length > 0) allAlerts.current = [...allAlerts.current, ...d.alerts]
        idx++
        // Auto-open causal at day 18
        if (d.day === 18) setTimeout(() => setShowCausal(true), 600)
      } else {
        setStreaming(false)
        clearInterval(iv)
      }
    }, 350)
    return () => clearInterval(iv)
  }, [])

  const latest = days[days.length - 1]
  if (!latest) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--sn-bg-primary)' }}>
      <div className="text-center">
        <div className="status-dot status-live mb-4 mx-auto" style={{ width: 16, height: 16 }} />
        <p className="font-mono text-sm" style={{ color: 'var(--sn-accent-blue)' }}>Initialising simulation...</p>
      </div>
    </div>
  )

  // Chart data
  const chartData = days.map(d => ({
    day: d.day,
    protest: +(d.protest_probability * 100).toFixed(1),
    protestHi: +((d.protest_probability + d.confidence_intervals.protest_probability) * 100).toFixed(1),
    protestLo: +((d.protest_probability - d.confidence_intervals.protest_probability) * 100).toFixed(1),
    revenue: +(d.revenue_impact * 100).toFixed(1),
    revHi: +((d.revenue_impact + d.confidence_intervals.revenue_impact) * 100).toFixed(1),
    revLo: +((d.revenue_impact - d.confidence_intervals.revenue_impact) * 100).toFixed(1),
    daily_wage: +(d.modal_shift.daily_wage_worker * 100).toFixed(1),
    formal: +(d.modal_shift.formal_sector_employee * 100).toFixed(1),
    vendor: +(d.modal_shift.street_vendor * 100).toFixed(1),
    migrant: +(d.modal_shift.migrant_worker * 100).toFixed(1),
    govt: +(d.modal_shift.government_employee * 100).toFixed(1),
    cfProtest: cfData[d.day - 1] ? +(cfData[d.day - 1].protest_probability * 100).toFixed(1) : 0,
  }))

  const equityData = Object.entries(latest.equity_by_decile).map(([k, v]) => ({
    decile: k, impact: +(v * 100).toFixed(1),
  }))

  return (
    <div className="min-h-screen" style={{ background: 'var(--sn-bg-primary)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3" style={{ borderBottom: '1px solid var(--sn-border)' }}>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} style={{ color: 'var(--sn-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }} className="text-sm">← Home</button>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm" style={{ color: 'var(--sn-text-primary)' }}>Delhi — 20% Fare Hike</span>
            <span className="grade-badge grade-A" style={{ width: 24, height: 24, fontSize: 10 }}>A</span>
            {streaming && <span className="status-dot status-live ml-2" />}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm" style={{ color: 'var(--sn-accent-blue)' }}>Day {currentDay}/30</span>
          <span className="font-mono text-xs" style={{ color: 'var(--sn-text-muted)' }}>{latest.agent_summary.total.toLocaleString()} agents</span>
          <button onClick={() => setShowCf(!showCf)} className="sn-btn sn-btn-secondary text-xs" style={{ padding: '6px 12px' }}>
            {showCf ? 'Hide' : 'Show'} Counterfactual
          </button>
          <button onClick={() => navigate('/validation')} className="sn-btn sn-btn-secondary text-xs" style={{ padding: '6px 12px' }}>
            Validation →
          </button>
        </div>
      </header>

      <div className="flex" style={{ height: 'calc(100vh - 53px)' }}>
        {/* LEFT PANEL — Status + Alerts + Network */}
        <div className="w-72 overflow-y-auto p-4 space-y-4 flex-shrink-0" style={{ borderRight: '1px solid var(--sn-border)' }}>
          {/* Day Counter */}
          <div className="sn-card text-center">
            <p className="text-xs" style={{ color: 'var(--sn-text-muted)' }}>SIMULATION DAY</p>
            <p className="text-4xl font-mono font-bold mt-1" style={{ color: 'var(--sn-accent-blue)' }}>{currentDay}</p>
            <div className="w-full rounded-full h-1 mt-3" style={{ background: 'var(--sn-border)' }}>
              <div className="h-1 rounded-full transition-all" style={{ width: `${(currentDay / 30) * 100}%`, background: 'var(--sn-accent-blue)' }} />
            </div>
          </div>

          {/* Agent Summary */}
          <div className="sn-card">
            <p className="text-xs mb-2" style={{ color: 'var(--sn-text-muted)' }}>AGENT DECISIONS</p>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-xs" style={{ color: 'var(--sn-text-secondary)' }}>Mode switch</span><span className="text-xs font-mono" style={{ color: '#ff9500' }}>{latest.agent_summary.mode_switch.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-xs" style={{ color: 'var(--sn-text-secondary)' }}>Protest join</span><span className="text-xs font-mono" style={{ color: '#ff3b30' }}>{latest.agent_summary.protest_join.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-xs" style={{ color: 'var(--sn-text-secondary)' }}>No change</span><span className="text-xs font-mono" style={{ color: '#00c853' }}>{latest.agent_summary.no_change.toLocaleString()}</span></div>
            </div>
          </div>

          {/* Alert Feed */}
          <div>
            <p className="text-xs mb-2" style={{ color: 'var(--sn-text-muted)' }}>AUTONOMOUS ALERTS</p>
            {allAlerts.current.length > 0 ? (
              <AlertFeed alerts={allAlerts.current} />
            ) : (
              <p className="text-xs" style={{ color: 'var(--sn-text-muted)' }}>Monitoring...</p>
            )}
          </div>

          {/* Red-Team Sidebar */}
          <div className="sn-card" style={{ borderColor: 'rgba(255, 59, 48, 0.2)' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="status-dot" style={{ background: streaming ? '#ff3b30' : '#5a6a85', boxShadow: streaming ? '0 0 6px rgba(255,59,48,0.5)' : 'none' }} />
              <span className="text-xs font-mono" style={{ color: '#ff3b30' }}>RED-TEAM AGENT</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--sn-text-secondary)' }}>
              {currentDay < 22 ? 'Scanning for invisible harm patterns...' : 'Most harmed invisible: exam_aspirant — coaching commute non-negotiable, impact visibility 3.2%'}
            </p>
          </div>

          {/* Network */}
          <div className="sn-card">
            <p className="text-xs mb-2" style={{ color: 'var(--sn-text-muted)' }}>INFLUENCE NETWORK</p>
            <NetworkVis nodes={latest.network_sample} />
            <div className="flex justify-between mt-2 text-xs" style={{ color: 'var(--sn-text-muted)' }}>
              <span>🟢 positive</span><span>🔴 negative</span><span>🔵 hub</span>
            </div>
          </div>
        </div>

        {/* CENTRE PANEL — Charts */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className={`grid gap-4 ${showCf ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {/* Modal Shift */}
            <div className="sn-card">
              <p className="text-xs mb-1" style={{ color: 'var(--sn-text-muted)' }}>MODAL SHIFT BY ARCHETYPE {showCf && '— 20% Hike'}</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid stroke="#243054" strokeOpacity={0.3} />
                  <XAxis dataKey="day" tick={{ fill: '#5a6a85', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#5a6a85', fontSize: 10 }} unit="%" />
                  <Tooltip contentStyle={{ background: '#1a2340', border: '1px solid #243054', borderRadius: 8, fontSize: 11 }} />
                  <Line type="monotone" dataKey="daily_wage" stroke="#ff3b30" strokeWidth={2} dot={false} name="Daily wage" />
                  <Line type="monotone" dataKey="vendor" stroke="#ff9500" strokeWidth={2} dot={false} name="Vendor" />
                  <Line type="monotone" dataKey="migrant" stroke="#ff6b6b" strokeWidth={1.5} dot={false} name="Migrant" />
                  <Line type="monotone" dataKey="formal" stroke="#1e90ff" strokeWidth={1.5} dot={false} name="Formal" />
                  <Line type="monotone" dataKey="govt" stroke="#00c853" strokeWidth={1.5} dot={false} name="Govt" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {showCf && (
              <div className="sn-card" style={{ borderColor: 'rgba(0, 200, 83, 0.3)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--sn-confirm-green)' }}>COUNTERFACTUAL — 10% Hike</p>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={cfData.map((d, i) => ({ ...d, day: d.day, ms: +(d.modal_shift_avg * 100).toFixed(1) }))}>
                    <CartesianGrid stroke="#243054" strokeOpacity={0.3} />
                    <XAxis dataKey="day" tick={{ fill: '#5a6a85', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#5a6a85', fontSize: 10 }} unit="%" />
                    <Tooltip contentStyle={{ background: '#1a2340', border: '1px solid #243054', borderRadius: 8, fontSize: 11 }} />
                    <Area type="monotone" dataKey="ms" stroke="#00c853" fill="rgba(0,200,83,0.1)" strokeWidth={2} name="Avg modal shift" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Protest + Revenue row */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            {/* Protest probability */}
            <div className="sn-card">
              <p className="text-xs mb-1" style={{ color: 'var(--sn-text-muted)' }}>PROTEST PROBABILITY</p>
              <ProtestGauge value={latest.protest_probability} ci={latest.confidence_intervals.protest_probability} />
              <ResponsiveContainer width="100%" height={100}>
                <ComposedChart data={chartData}>
                  <CartesianGrid stroke="#243054" strokeOpacity={0.3} />
                  <XAxis dataKey="day" tick={{ fill: '#5a6a85', fontSize: 9 }} />
                  <YAxis tick={{ fill: '#5a6a85', fontSize: 9 }} unit="%" />
                  <Area type="monotone" dataKey="protestHi" fill="rgba(255,59,48,0.08)" stroke="none" />
                  <Area type="monotone" dataKey="protestLo" fill="var(--sn-bg-card)" stroke="none" />
                  <Line type="monotone" dataKey="protest" stroke="#ff3b30" strokeWidth={2} dot={false} />
                  {showCf && <Line type="monotone" dataKey="cfProtest" stroke="#00c853" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Revenue */}
            <div className="sn-card">
              <p className="text-xs mb-1" style={{ color: 'var(--sn-text-muted)' }}>REVENUE IMPACT</p>
              <p className="text-2xl font-mono font-bold" style={{ color: '#ff9500' }}>
                {(latest.revenue_impact * 100).toFixed(1)}%
                <span className="text-xs font-normal ml-1" style={{ color: 'var(--sn-text-muted)' }}>
                  ±{(latest.confidence_intervals.revenue_impact * 100).toFixed(1)}%
                </span>
              </p>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={chartData}>
                  <CartesianGrid stroke="#243054" strokeOpacity={0.3} />
                  <XAxis dataKey="day" tick={{ fill: '#5a6a85', fontSize: 9 }} />
                  <YAxis tick={{ fill: '#5a6a85', fontSize: 9 }} unit="%" />
                  <Area type="monotone" dataKey="revHi" fill="rgba(255,149,0,0.06)" stroke="none" />
                  <Area type="monotone" dataKey="revLo" fill="var(--sn-bg-card)" stroke="none" />
                  <Area type="monotone" dataKey="revenue" stroke="#ff9500" fill="rgba(255,149,0,0.1)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Equity */}
            <div className="sn-card">
              <p className="text-xs mb-1" style={{ color: 'var(--sn-text-muted)' }}>EQUITY IMPACT BY INCOME DECILE</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={equityData}>
                  <CartesianGrid stroke="#243054" strokeOpacity={0.3} />
                  <XAxis dataKey="decile" tick={{ fill: '#5a6a85', fontSize: 9 }} />
                  <YAxis tick={{ fill: '#5a6a85', fontSize: 9 }} unit="%" />
                  <Tooltip contentStyle={{ background: '#1a2340', border: '1px solid #243054', borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="impact" fill="#1e90ff" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-center mt-1" style={{ color: 'var(--sn-text-muted)' }}>D1 = poorest, D10 = wealthiest</p>
            </div>
          </div>

          {/* Causal Chain Panel */}
          <div className="mt-4">
            <button onClick={() => setShowCausal(!showCausal)}
                    className="sn-btn sn-btn-secondary text-xs w-full"
                    style={{ padding: '10px 16px', justifyContent: 'space-between', display: 'flex' }}>
              <span>🔍 Causal Chain Explorer</span>
              <span>{showCausal ? '▲' : '▼'}</span>
            </button>
            {showCausal && (
              <div className="sn-card mt-2 animate-in">
                <p className="text-xs mb-3" style={{ color: 'var(--sn-text-muted)' }}>
                  WHY did protest probability spike to 42% at day 18? Click nodes to expand.
                </p>
                <CausalTree node={CAUSAL_TREE} />
              </div>
            )}
          </div>

          {showCf && (
            <div className="sn-card mt-4" style={{ borderColor: 'rgba(30, 144, 255, 0.3)' }}>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--sn-accent-blue)' }}>DIVERGENCE ANALYSIS — 20% vs 10% Fare Hike</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs" style={{ color: 'var(--sn-text-muted)' }}>Protest peak</p>
                  <p className="font-mono font-bold" style={{ color: '#ff3b30' }}>42% <span className="text-xs" style={{ color: 'var(--sn-text-muted)' }}>vs</span> <span style={{ color: '#00c853' }}>14%</span></p>
                </div>
                <div className="text-center">
                  <p className="text-xs" style={{ color: 'var(--sn-text-muted)' }}>Revenue impact</p>
                  <p className="font-mono font-bold" style={{ color: '#ff9500' }}>-15% <span className="text-xs" style={{ color: 'var(--sn-text-muted)' }}>vs</span> <span style={{ color: '#00c853' }}>-6%</span></p>
                </div>
                <div className="text-center">
                  <p className="text-xs" style={{ color: 'var(--sn-text-muted)' }}>Resistance reduction</p>
                  <p className="font-mono font-bold" style={{ color: '#00c853' }}>61%</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
