import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTypewriter } from '../hooks/useTypewriter';
import logoImg from '../assets/synterra-logo.jpg';

const tickerItems = [
  ['Ramesh, Shahdara', 'Switched to BEST bus'],
  ['Priya, Andheri', 'Updated commute budget +₹480'],
  ['Mohammed, Kurla', 'Vendor viability flag triggered'],
  ['Sunita, Rohini', 'Consolidated market trips'],
  ['Arjun, GTB Nagar', 'Joined resistance network'],
  ['Kavita, Seelampur', 'Protest signal broadcast'],
  ['Deepak, Janakpuri', 'WFH request filed'],
  ['Meena, Dwarka', 'Switched to cycling (2km leg)'],
];

const howSteps = [
  {
    step: 'STEP 01',
    kicker: 'Choose your city',
    title: 'Pick where to simulate',
    body: 'Select from 6 Indian cities, each with its own demographic profile, transport network, and economic baseline built from real NSSO and Census data.',
  },
  {
    step: 'STEP 02',
    kicker: 'Describe your policy',
    title: 'Say it in plain English',
    body: 'Type your policy as you would write it in a government order. Or pick from 8 pre-loaded demo policies to see the platform in action immediately.',
  },
  {
    step: 'STEP 03',
    kicker: 'Watch agents react',
    title: '10,000 citizens respond',
    body: 'Every agent has a personality, a 30-day memory, and a social network. They react independently. Their collective decisions produce outcomes nobody programmed.',
  },
  {
    step: 'STEP 04',
    kicker: 'Get your verdict',
    title: 'Score, verdict, and fixes',
    body: 'Your policy receives a score out of 100, a clear verdict, and tiered recommendations, from necessary fixes to gold-standard improvements.',
  },
];

const previewFeed = [
  ['#1aad6e', 'Ramesh, Shahdara → Switched to BEST bus'],
  ['#ffb347', 'Sunita, Seelampur → EMI stress flagged'],
  ['#ff0055', 'Abdul, Mustafabad → Transport unsustainable'],
  ['#00e5ff', 'Kavita, Rohini → Broadcasting to 47 contacts'],
];

export default function Landing() {
  const navigate = useNavigate();
  const { displayText, isComplete } = useTypewriter(
    'Describe a policy. 10,000 AI citizens react to it. You get a score, a verdict, and exact recommendations — in 3 minutes.',
    18,
    800
  );

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div style={{ background: '#0a0c10', color: 'var(--color-text-primary)' }}>
      <section style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', padding: '28px 28px 72px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'transparent',
              border: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 0,
            }}
          >
            <img src={logoImg} alt="Synterra Logo" style={{ height: 36, width: 'auto', borderRadius: 4 }} />
            <span style={{
              fontFamily: 'var(--font-data)',
              fontSize: 16,
              letterSpacing: '0.15em',
              color: '#00e5ff',
              fontWeight: 'bold',
            }}>
              SYNTERRA<span className="cursor-blink">_</span>
            </span>
          </button>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--color-text-ghost)' }}>
            <button className="landing-link" onClick={() => scrollTo('how')}>How it works</button>
            <span>·</span>
            <a className="landing-link" href="https://github.com/Pulkit1r/Synterra" target="_blank" rel="noreferrer">
              GitHub →
            </a>
          </div>
        </div>

        <div
          style={{
            minHeight: 'calc(100vh - 140px)',
            display: 'grid',
            placeItems: 'center',
            textAlign: 'center',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--font-data)',
                fontSize: 11,
                color: 'var(--color-text-dim)',
                letterSpacing: '0.12em',
                marginBottom: 20,
              }}
            >
              <span className="pulse-square">■</span> AUTONOMOUS POLICY SIMULATION ENGINE
            </div>
            <h1 className="landing-headline">
              <span>Before governments</span>
              <span>change reality,</span>
              <span style={{ color: '#00e5ff' }}>they test it here.</span>
            </h1>
            <p className={`landing-subhead ${isComplete ? 'typewriter-cursor landing-cursor-fade' : 'typewriter-cursor'}`}>
              {displayText}
            </p>
            <div className="landing-stats">
              {['10,000 AI Citizens', '6 Indian Cities', '3 Min Results'].map((stat, index) => (
                <motion.span
                  key={stat}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2.7 + index * 0.2 }}
                >
                  {index > 0 && <span style={{ color: 'var(--color-text-ghost)', margin: '0 14px' }}>·</span>}
                  {stat}
                </motion.span>
              ))}
            </div>
            <button className="primary-cta chamfered" onClick={() => navigate('/cities')}>
              Run a simulation →
            </button>
            <button className="landing-demo-link" onClick={() => scrollTo('demo')}>
              or watch a 90-second demo ↓
            </button>
          </div>
        </div>

        <div className="agent-ticker">
          <div className="agent-ticker-track">
            {[0, 1].map((copy) => (
              <span key={copy} style={{ paddingRight: 120 }}>
                {tickerItems.map(([name, decision], index) => (
                  <span key={`${copy}-${name}`}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>{name}</span>
                    <span> → {decision}</span>
                    <span style={{ color: 'var(--color-text-ghost)' }}>{index === tickerItems.length - 1 ? '        ' : ' · '}</span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="how" style={{ background: '#0d0f14', borderTop: '1px solid #1e2d47', padding: '80px 24px' }}>
        <h2 className="section-heading">How it works</h2>
        <div className="section-rule" />
        <div className="how-grid">
          {howSteps.map((item) => (
            <div key={item.step} className="how-card">
              <div style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--color-text-dim)', marginBottom: 10 }}>{item.step}</div>
              <div style={{ fontFamily: 'var(--font-data)', fontSize: 10, color: '#00e5ff', marginBottom: 6 }}>{item.kicker.toUpperCase()}</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 8 }}>{item.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>{item.body}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 36 }}>
          <button className="primary-cta chamfered" onClick={() => navigate('/cities')}>
            Start simulating →
          </button>
        </div>
      </section>

      <section id="demo" style={{ background: '#0a0c10', padding: '80px 24px', textAlign: 'center' }}>
        <h2 className="section-heading">See it running</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 16, marginBottom: 28 }}>
          Railway Fare +20% — Delhi — running right now
        </p>
        <div className="mini-preview">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginBottom: 10 }}>
            Day <span className="pulse-number">18</span> / 30
          </div>
          <div style={{ height: 8, background: '#1a1c20', marginBottom: 22 }}>
            <div style={{ width: '60%', height: '100%', background: '#00e5ff' }} />
          </div>
          <div style={{ textAlign: 'left', marginBottom: 18 }}>
            {previewFeed.map(([color, text], index) => (
              <motion.div
                key={text}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.35, repeat: Infinity, repeatDelay: 3 }}
                style={{ borderBottom: '1px solid #1e2d47', padding: '10px 12px', color }}
              >
                {text}
              </motion.div>
            ))}
          </div>
          <div style={{ border: '1px solid #ff0055', background: '#16070c', textAlign: 'left', padding: 16 }}>
            <div style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: '#ffb347', marginBottom: 8 }}>
              <span className="alert-dot" /> GOVERNMENT AGENT — AUTONOMOUS ALERT FIRED
            </div>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Protest probability in Shahdara: 38% — threshold exceeded
            </p>
          </div>
          <div className="mini-preview-fade">
            <button className="primary-cta chamfered" onClick={() => navigate('/cities')}>
              Try it with your own policy →
            </button>
          </div>
        </div>
      </section>

      <section style={{ background: '#0d0f14', padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-data)', fontSize: 12, color: 'var(--color-text-dim)', letterSpacing: '0.1em', marginBottom: 24 }}>
          VALIDATED ON REAL HISTORICAL DATA
        </div>
        <div className="validation-grid">
          {[
            ['DELHI METRO PHASE 4', '340,000', '/day riders', 'Actual: 318,000', '6.9% error margin', '93.1%'],
            ['NEET 2024 TRUST COLLAPSE', '23.0%', 'trust decline', 'Actual: 21.4%', '1.6% error margin', '98.4%'],
          ].map(([label, predicted, unit, actual, error, width]) => (
            <div key={label} className="validation-card">
              <div style={{ fontFamily: 'var(--font-data)', fontSize: 10, color: 'var(--color-text-dim)', marginBottom: 8 }}>{label}</div>
              <div><span style={{ fontFamily: 'var(--font-display)', fontSize: 32 }}>{predicted}</span> <span style={{ color: 'var(--color-text-dim)' }}>{unit}</span></div>
              <div style={{ color: 'var(--color-text-secondary)', marginTop: 8 }}>{actual}</div>
              <div style={{ fontFamily: 'var(--font-data)', fontSize: 12, color: '#00e5ff', margin: '12px 0 8px' }}>{error}</div>
              <div style={{ height: 6, background: '#1a1c20' }}><div style={{ height: '100%', width, background: '#00e5ff' }} /></div>
            </div>
          ))}
        </div>
        <p style={{ margin: '24px auto 0', maxWidth: 620, color: 'var(--color-text-dim)', fontSize: 13, lineHeight: 1.6 }}>
          Hindcast validation — the same methodology used by climate and epidemiological models before they are trusted for forward prediction.
        </p>
      </section>

      <footer className="landing-footer">
        <span>SYNTERRA</span>
        <span>FAR AWAY 2026 · Agentic & Autonomous Systems</span>
        <a href="https://github.com/Pulkit1r/Synterra" target="_blank" rel="noreferrer">
          github.com/Pulkit1r/Synterra
        </a>
      </footer>
    </div>
  );
}
