import { useState } from 'react'
import { FaMicroscope, FaChartBar, FaBolt, FaTint, FaUpload, FaCogs, FaColumns, FaChartLine } from 'react-icons/fa'
import MicroBg from './MicroBg'
import './Home.css'

function AppLogo({ size = 40 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width={size} height={size}>
      <defs>
        <linearGradient id="homeLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0d9488"/>
          <stop offset="100%" stopColor="#34d399"/>
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="none" stroke="url(#homeLogoGrad)" strokeWidth="3"/>
      <circle cx="32" cy="32" r="18" fill="none" stroke="url(#homeLogoGrad)" strokeWidth="1.5" opacity="0.5"/>
      <path d="M16 32 Q20 22 24 32 Q28 42 32 32 Q36 22 40 32 Q44 42 48 32" fill="none" stroke="url(#homeLogoGrad)" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="32" y1="6"  x2="32" y2="14" stroke="url(#homeLogoGrad)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="32" y1="50" x2="32" y2="58" stroke="url(#homeLogoGrad)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="6"  y1="32" x2="14" y2="32" stroke="url(#homeLogoGrad)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="50" y1="32" x2="58" y2="32" stroke="url(#homeLogoGrad)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export default function Home({ onGoToTool, onOpenAuth, session, onSignOut }) {
  const features = [
    {
      icon: <FaMicroscope />,
      title: 'Enhanced Canny Algorithm',
      desc: 'Our optimized implementation delivers superior edge detection accuracy on microscopic specimens.'
    },
    {
      icon: <FaChartBar />,
      title: '4 Scientific Metrics',
      desc: 'Evaluate quality through PSNR, MSE, RMSE, and Pratt\'s Figure of Merit (FOM).'
    },
    {
      icon: <FaBolt />,
      title: 'Real-time Processing',
      desc: 'Compare both algorithms simultaneously with live progress tracking and speedup analysis.'
    },
    {
      icon: <FaTint />,
      title: 'Water Sample Focused',
      desc: 'Built specifically for microscopic water sample analysis and microorganism boundary detection.'
    },
  ]

  return (
    <div className="home-root">
      {/* Microorganism background */}
      <MicroBg className="home-micro-bg" />

      {/* Top Nav */}
      <nav className="home-nav">
        <div className="home-nav-inner">
          <div className="home-nav-brand">
            <AppLogo size={34} />
            <div className="home-nav-text">
              <span className="home-nav-title">Enhanced Canny Edge</span>
              <span className="home-nav-sub">Research Tool · v2.0</span>
            </div>
          </div>
          <div className="home-nav-right">
            {session ? (
              <>
                <span className="home-nav-user">{session.user?.email}</span>
                <button className="home-nav-btn outline" onClick={onSignOut}>Sign Out</button>
              </>
            ) : (
              <>
                <button className="home-nav-btn ghost" onClick={() => onOpenAuth('login')}>Sign In</button>
                <button className="home-nav-btn solid" onClick={() => onOpenAuth('signup')}>Sign Up</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="home-hero">
        <div className="home-hero-inner">
          <div className="home-eyebrow">
            <span className="home-eyebrow-dot" />
            Microscopic Water Sample Detection
          </div>

          <h1 className="home-hero-title">
            Evaluate Edge Detection Algorithms with Precision.
          </h1>

          <p className="home-hero-desc">
            An advanced edge detection system for identifying and comparing microorganism boundaries in water specimens.
            Powered by an optimized Enhanced Canny algorithm and validated with peer-reviewed metrics.
          </p>

          <div className="home-cta-row">
            <button className="home-cta-primary" onClick={onGoToTool}>
              <span className="home-cta-icon"><FaMicroscope /></span>
              Start Analyzing - Free
            </button>
            {!session && (
              <button className="home-cta-secondary" onClick={() => onOpenAuth('signup')}>
                Create Research Account
              </button>
            )}
          </div>

          <p className="home-cta-hint">
            {session
              ? `Signed in as ${session.user?.email} - your sessions are tracked.`
              : 'No account needed to use the tool. Sign up to have your research sessions logged.'
            }
          </p>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="home-features">
        <div className="home-features-inner">
          <h2 className="home-section-title">Built for Researchers</h2>
          <p className="home-section-sub">Everything you need to compare Canny edge detection algorithms on microscopic water samples.</p>
          <div className="home-feature-grid">
            {features.map((f, i) => (
              <div key={i} className="home-feature-card">
                <div className="home-feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="home-steps">
        <div className="home-steps-inner">
          <h2 className="home-section-title">How It Works</h2>
          <div className="home-steps-row">
            {[
              { n: <FaUpload />, t: 'Upload', d: 'Drop in your microscopic specimen images - JPG, PNG, TIFF all supported.' },
              { n: <FaCogs />, t: 'Process', d: 'Both Enhanced and Native Canny algorithms run in parallel on your images.' },
              { n: <FaColumns />, t: 'Compare', d: 'Side-by-side, overlay, or toggle view modes with zoom up to 10×.' },
              { n: <FaChartLine />, t: 'Analyze', d: 'Review PSNR, MSE, RMSE, FOM, and speedup metrics for your dataset.' },
            ].map((s, i) => (
              <div key={i} className="home-step">
                <div className="home-step-num">{s.n}</div>
                <div className="home-step-body">
                  <h4>{s.t}</h4>
                  <p>{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="home-banner">
        <div className="home-banner-micro"><MicroBg /></div>
        <div className="home-banner-inner">
          <h2>Ready to Analyze Your Specimens?</h2>
          <p>No signup required. Open the tool and upload your first specimen images now.</p>
          <button className="home-cta-primary large" onClick={onGoToTool}>
            Open Detection Tool →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="home-footer-inner">
          <div className="home-footer-brand">
            <AppLogo size={28} />
            <span>Enhanced Canny Edge Detection System</span>
          </div>
          <div className="home-footer-authors">
            <span>Research by Albrecht Zildjian A. Arcangel & Christian Andrei V. Santiago</span>
          </div>
          <span className="home-footer-copy">Water Sample Microorganism Detection · Tool v2.0 · {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  )
}
