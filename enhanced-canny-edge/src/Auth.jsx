import { useState, useMemo } from 'react'
import { supabase } from './supabaseClient'
import './Auth.css'

/* Inline SVG logo component (from App.jsx) */
function AppLogo({ size = 40 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width={size} height={size}>
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0d9488"/>
          <stop offset="100%" stopColor="#34d399"/>
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="none" stroke="url(#logoGrad)" strokeWidth="3"/>
      <circle cx="32" cy="32" r="18" fill="none" stroke="url(#logoGrad)" strokeWidth="1.5" opacity="0.5"/>
      <path d="M16 32 Q20 22 24 32 Q28 42 32 32 Q36 22 40 32 Q44 42 48 32" fill="none" stroke="url(#logoGrad)" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="32" y1="6" x2="32" y2="14" stroke="url(#logoGrad)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="32" y1="50" x2="32" y2="58" stroke="url(#logoGrad)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="6" y1="32" x2="14" y2="32" stroke="url(#logoGrad)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="50" y1="32" x2="58" y2="32" stroke="url(#logoGrad)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export default function Auth({ initialMode = 'login', onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState(initialMode) // 'login', 'signup', 'reset'
  
  const [message, setMessage] = useState({ text: '', type: '' })

  const requirements = useMemo(() => {
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^a-zA-Z0-9]/.test(password)
    }
  }, [password])

  const strengthCount = Object.values(requirements).filter(Boolean).length
  const meetsAll = strengthCount === 5

  const getStrengthColor = () => {
    if (strengthCount <= 2) return '#ef4444' // red
    if (strengthCount <= 4) return '#f59e0b' // yellow
    return '#10b981' // green
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ text: '', type: '' })
    
    let error
    
    if (mode === 'login') {
      const res = await supabase.auth.signInWithPassword({ email, password })
      error = res.error
    } else if (mode === 'signup') {
      if (!meetsAll) {
        setMessage({ text: 'Please ensure your password meets all requirements.', type: 'error' })
        setLoading(false)
        return
      }
      const res = await supabase.auth.signUp({ email, password })
      error = res.error
      if (!error) {
        setMessage({ text: 'Success! Check your email for the confirmation link.', type: 'success' })
      }
    } else if (mode === 'reset') {
      const res = await supabase.auth.resetPasswordForEmail(email)
      error = res.error
      if (!error) {
        setMessage({ text: 'Password reset instructions have been sent to your email.', type: 'success' })
      }
    }

    if (error) {
      setMessage({ text: error.error_description || error.message, type: 'error' })
    }
    
    setLoading(false)
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        
        <div className="auth-header">
          <div className="auth-logo-wrapper">
            <AppLogo size={56} />
          </div>
          <h2 className="auth-title">
            {mode === 'login' && 'Welcome Back'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'reset' && 'Reset Password'}
          </h2>
          <p className="auth-subtitle">
            {mode === 'login' && 'Sign in to analyze water specimens'}
            {mode === 'signup' && 'Join to start microorganism detection'}
            {mode === 'reset' && 'Enter your email to reset your password'}
          </p>
        </div>

        {message.text && (
          <div className={`auth-message ${message.type}`}>
            {message.text}
          </div>
        )}

        <form className="auth-form" onSubmit={handleAuth}>
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <input
              className="auth-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          {mode !== 'reset' && (
            <div className="input-group">
              <label className="input-label">
                Password
                {mode === 'login' && (
                  <button type="button" className="forgot-link" onClick={() => setMode('reset')}>
                    Forgot Password?
                  </button>
                )}
              </label>
              <input
                className="auth-input"
                type="password"
                placeholder="••••••••"
                value={password}
                required
                onChange={(e) => setPassword(e.target.value)}
              />

              {mode === 'signup' && (
                <div className="password-strength-container">
                  <div className="strength-bar-bg">
                    <div 
                      className="strength-bar-fill" 
                      style={{ 
                        width: `${(strengthCount / 5) * 100}%`,
                        backgroundColor: getStrengthColor()
                      }} 
                    />
                  </div>
                  <ul className="req-list">
                    <li className={`req-item ${requirements.length ? 'met' : ''}`}>
                      <span className="req-icon"></span> 8+ Characters
                    </li>
                    <li className={`req-item ${requirements.uppercase ? 'met' : ''}`}>
                      <span className="req-icon"></span> Uppercase Letter
                    </li>
                    <li className={`req-item ${requirements.lowercase ? 'met' : ''}`}>
                      <span className="req-icon"></span> Lowercase Letter
                    </li>
                    <li className={`req-item ${requirements.number ? 'met' : ''}`}>
                      <span className="req-icon"></span> Number
                    </li>
                    <li className={`req-item ${requirements.special ? 'met' : ''}`}>
                      <span className="req-icon"></span> Special Character
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}
          
          <button 
            className="auth-button" 
            disabled={loading || (mode === 'signup' && !meetsAll)} 
            type="submit"
          >
            {loading ? <div className="auth-spinner" /> : (
              mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Sign Up' : 'Send Reset Link'
            )}
          </button>
        </form>
        
        <button 
          className="auth-toggle"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login')
            setMessage({ text: '', type: '' })
          }}
        >
          {mode === 'login' ? 'Need an account? ' : 'Back to '}
          <span>{mode === 'login' ? 'Sign Up' : 'Sign In'}</span>
        </button>

      </div>
    </div>
  )
}
