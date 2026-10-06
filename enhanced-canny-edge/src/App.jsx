import { useState, useRef, useMemo, useEffect } from 'react'
import {
  FaMicroscope, FaFileImage, FaTimes, FaSpinner, FaArrowDown,
  FaExclamationCircle, FaChartBar, FaExpand, FaFileExport, FaFileImport,
  FaLayerGroup, FaColumns, FaToggleOn, FaInfoCircle, FaQuestionCircle,
  FaSignOutAlt, FaUpload, FaTrash, FaPlay
} from 'react-icons/fa';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import Home from './Home';
import MicroBg from './MicroBg';
import './App.css'

/* ── Logo SVG ─────────────────────────────────────────── */
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
      <line x1="6"  y1="32" x2="14" y2="32" stroke="url(#logoGrad)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="50" y1="32" x2="58" y2="32" stroke="url(#logoGrad)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

/* ── Metric explanations ──────────────────────────────── */
const METRIC_EXPLANATIONS = {
  psnr: {
    title: 'Peak Signal-to-Noise Ratio (PSNR)',
    formula: 'PSNR = 20 × log₁₀(MAX_PIXEL / √MSE)',
    description: 'PSNR measures the ratio between the maximum possible signal power and the noise power that affects image quality. It is expressed in decibels (dB).',
    interpretation: 'Higher PSNR values indicate better image quality preservation. Typical values range from 5–15 dB for edge detection outputs.',
    whyItMatters: 'A higher PSNR means the edge detection preserved more detail from the original specimen, helping biologists identify finer structural features.'
  },
  mse_rmse: {
    title: 'Mean Squared Error (MSE) & Root Mean Squared Error (RMSE)',
    formula: 'MSE = (1/N) × Σ(original - detected)²\nRMSE = √MSE',
    description: 'MSE quantifies the average squared difference between the original image and the edge-detected output. RMSE is its square root in pixel units (0–255).',
    interpretation: 'Lower MSE/RMSE values indicate the edge detection output is closer to the original image in pixel intensity.',
    whyItMatters: 'Minimizing information loss ensures subtle cellular structures and microorganism boundaries are preserved in microscopic water samples.'
  },
  fom: {
    title: "Pratt's Figure of Merit (FOM)",
    formula: 'FOM = (1 / max(N_ideal, N_actual)) × Σ 1/(1 + d(i)² × α)',
    description: "Pratt's FOM evaluates edge detection quality by measuring missing edges, false detections, and localization accuracy. α ≈ 1/9.",
    interpretation: 'FOM values range from 0 to 1, where 1 represents a perfect match with the ideal edge map.',
    whyItMatters: 'A higher FOM means the algorithm correctly identifies microorganism boundaries without adding noise artifacts.'
  },
  speedup: {
    title: 'Speedup Factor',
    formula: 'Speedup = Native_Runtime / Enhanced_Runtime',
    description: 'Speedup factor measures how much faster the Enhanced Canny algorithm is compared to Native (pure-Python) Canny.',
    interpretation: 'A speedup of 10x means the Enhanced algorithm is 10× faster. Values > 1x indicate the Enhanced algorithm wins.',
    whyItMatters: 'Faster processing is critical when analyzing hundreds of microscopic water samples per research study.'
  }
};

/* ── Comparison Viewer ────────────────────────────────── */
function ComparisonViewer({ originalURL, enhancedURL, nativeURL }) {
  const [mode, setMode] = useState('side');
  const [overlayOpacity, setOverlayOpacity] = useState(50);
  const [toggleShowing, setToggleShowing] = useState('enhanced');
  const [zoom, setZoom] = useState(1);
  const zoomLevels = [1, 2, 3, 5, 10];
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingPan, setIsDraggingPan] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => { if (zoom === 1) setPan({ x: 0, y: 0 }); }, [zoom]);

  const handleMouseDown = (e) => {
    if (zoom <= 1) return;
    setIsDraggingPan(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };
  const handleMouseMove = (e) => {
    if (!isDraggingPan) return;
    setPan({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };
  const handleTouchStart = (e) => {
    if (zoom <= 1) return;
    setIsDraggingPan(true);
    const t = e.touches[0];
    dragStart.current = { x: t.clientX - pan.x, y: t.clientY - pan.y };
  };
  const handleTouchMove = (e) => {
    if (!isDraggingPan) return;
    const t = e.touches[0];
    setPan({ x: t.clientX - dragStart.current.x, y: t.clientY - dragStart.current.y });
  };
  const endDrag = () => setIsDraggingPan(false);

  const imgStyle = { transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center center', pointerEvents: 'none' };

  return (
    <div className="comparison-viewer">
      <div className="comparison-toolbar">
        <div className="toolbar-group">
          <label>Mode:</label>
          {[['side','side',''],['overlay','overlay',''],['toggle','toggle','']].map(([val,label]) => (
            <button key={val} className={`mode-btn ${mode===val?'active':''}`} onClick={() => setMode(val)}>
              {val==='side' && <FaColumns style={{marginRight:3}}/>}
              {val==='overlay' && <FaLayerGroup style={{marginRight:3}}/>}
              {val==='toggle' && <FaToggleOn style={{marginRight:3}}/>}
              {val.charAt(0).toUpperCase()+val.slice(1)}
            </button>
          ))}
        </div>
        <div className="toolbar-divider" />
        <div className="toolbar-group">
          <label>Zoom:</label>
          {zoomLevels.map(z => (
            <button key={z} className={`zoom-btn ${zoom===z?'active':''}`} onClick={() => setZoom(z)}>{z}x</button>
          ))}
        </div>
      </div>

      <div
        className="comparison-canvas"
        style={{ overflow:'hidden', cursor: zoom>1?(isDraggingPan?'grabbing':'grab'):'default', userSelect:'none', touchAction: zoom>1?'none':'auto' }}
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
        onMouseUp={endDrag} onMouseLeave={endDrag}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}
        onTouchEnd={endDrag} onTouchCancel={endDrag}
      >
        {mode === 'side' && (
          <div className={`side-by-side-wrap ${originalURL ? 'three-cols' : 'two-cols'}`}>
            {originalURL && (
              <div className="side-by-side-panel">
                <span className="side-panel-label original-label">Original</span>
                <img src={originalURL} alt="Original specimen" style={imgStyle} />
              </div>
            )}
            <div className="side-by-side-panel">
              <span className="side-panel-label enhanced-label">Enhanced Canny</span>
              {enhancedURL ? <img src={enhancedURL} alt="Enhanced" style={imgStyle} /> : <div className="placeholder-status"><FaSpinner className="spinner-icon spin"/><span>Processing…</span></div>}
            </div>
            <div className="side-by-side-panel">
              <span className="side-panel-label native-label">Native Canny</span>
              {nativeURL ? <img src={nativeURL} alt="Native" style={imgStyle} /> : <div className="placeholder-status"><FaSpinner className="spinner-icon spin"/><span>Processing…</span></div>}
            </div>
          </div>
        )}

        {mode === 'overlay' && (
          <div className="overlay-wrap" style={{ backgroundColor: '#000' }}>
            {enhancedURL && <img src={enhancedURL} style={{ visibility:'hidden', width:'100%', height:'auto', display:'block', pointerEvents:'none' }} alt="spacer" />}
            {nativeURL
              ? <div style={{ backgroundColor:'#f59e0b', mixBlendMode:'screen', opacity:(100-overlayOpacity)/100, display:'flex', alignItems:'center', justifyContent:'center', width:'100%', position:'absolute', inset:0 }}>
                  <img src={nativeURL} alt="Native base" style={{ mixBlendMode:'multiply', ...imgStyle }} />
                </div>
              : <div className="placeholder-status" style={{position:'absolute',inset:0,minHeight:300}}><FaSpinner className="spinner-icon spin"/><span style={{marginLeft:8}}>Loading native…</span></div>
            }
            {enhancedURL && (
              <div style={{ backgroundColor:'#0ea5e9', mixBlendMode:'screen', opacity:overlayOpacity/100, display:'flex', alignItems:'center', justifyContent:'center', position:'absolute', inset:0 }}>
                <img src={enhancedURL} alt="Enhanced overlay" style={{ mixBlendMode:'multiply', ...imgStyle }} />
              </div>
            )}
            <div className="overlay-controls" style={{pointerEvents:'auto'}} onMouseDown={e=>e.stopPropagation()}>
              <label style={{color:'#f59e0b'}}>Native</label>
              <input type="range" min="0" max="100" value={overlayOpacity} onChange={e=>setOverlayOpacity(Number(e.target.value))} />
              <label style={{color:'#38bdf8'}}>Enhanced</label>
              <span style={{color:'#fff',fontSize:'0.75rem',fontWeight:700,minWidth:34}}>{overlayOpacity}%</span>
            </div>
          </div>
        )}

        {mode === 'toggle' && (
          <div className="overlay-wrap" style={{backgroundColor:'#000'}}>
            {toggleShowing === 'enhanced'
              ? (enhancedURL ? <img src={enhancedURL} alt="Enhanced" style={imgStyle}/> : <div className="placeholder-status" style={{position:'relative',minHeight:300}}><FaSpinner className="spinner-icon spin"/><span>Processing…</span></div>)
              : (nativeURL  ? <img src={nativeURL}  alt="Native"   style={imgStyle}/> : <div className="placeholder-status" style={{position:'relative',minHeight:300}}><FaSpinner className="spinner-icon spin"/><span>Processing…</span></div>)
            }
            <div className="overlay-controls" style={{pointerEvents:'auto'}} onMouseDown={e=>e.stopPropagation()}>
              <button className={`mode-btn ${toggleShowing==='enhanced'?'active':''}`} onClick={()=>setToggleShowing('enhanced')} style={{fontSize:'0.75rem'}}>Enhanced</button>
              <button className={`mode-btn ${toggleShowing==='native'?'active':''}`}   onClick={()=>setToggleShowing('native')}   style={{fontSize:'0.75rem'}}>Native</button>
              <span className={`toggle-label-indicator ${toggleShowing==='enhanced'?'showing-enhanced':'showing-native'}`}>
                ● {toggleShowing==='enhanced'?'Enhanced':'Native'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Result Card ──────────────────────────────────────── */
function ResultCard({ item, type, onCompare, onSave }) {
  const status  = type === 'enhanced' ? item.enhancedStatus  : item.nativeStatus;
  const imgUrl  = type === 'enhanced' ? item.enhancedURL     : item.nativeURL;
  const metrics = type === 'enhanced' ? item.enhancedMetrics : item.nativeMetrics;
  const bothDone = item.enhancedStatus === 'done' && item.nativeStatus === 'done';

  return (
    <div className="result-card">
      <div className="card-top">
        <strong className="card-file-name" style={{ color: type === 'enhanced' ? 'var(--accent)' : 'var(--amber)' }}>
          {type === 'enhanced' ? 'Enhanced Canny' : 'Native Canny'}
        </strong>
        <div className="card-actions">
          <button className="card-action-btn" disabled={!bothDone} onClick={onCompare} title="Compare side-by-side">
            <FaExpand /> Compare
          </button>
          <button className="card-action-btn" disabled={!bothDone} onClick={onSave} title="Download comparison">
            <FaArrowDown /> Save
          </button>
        </div>
      </div>

      <div className="card-image-wrap">
        {(status === 'processing' || status === 'queued') && (
          <div className="placeholder-status">
            <FaSpinner className="spinner-icon spin" />
            <span>{status === 'queued' ? 'Queued…' : 'Detecting edges…'}</span>
          </div>
        )}
        {status === 'done' && (
          <img
            src={imgUrl}
            alt={`${type} edge detection: ${item.name}`}
            style={{ cursor: 'zoom-in' }}
            onClick={onCompare}
          />
        )}
        {status === 'error' && (
          <div className="placeholder-status error">
            <FaExclamationCircle className="spinner-icon" />
            <span>{item.errorMessage ? `Error: ${item.errorMessage}` : 'Detection Failed'}</span>
          </div>
        )}
        <span className={`card-status-label ${status}`}>
          {status === 'queued' ? 'Queued' : status === 'processing' ? 'Processing' : status === 'done' ? 'Complete' : 'Error'}
        </span>
      </div>

      {metrics && (
        <div className="card-metrics-strip">
          <div className="metric-cell">
            <div className="metric-label">PSNR</div>
            <div className="metric-value">{metrics.psnr?.toFixed(2) ?? 'N/A'} dB</div>
          </div>
          <div className="metric-cell">
            <div className="metric-label">FOM</div>
            <div className="metric-value">{metrics.fom?.toFixed(4) ?? 'N/A'}</div>
          </div>
          <div className="metric-cell">
            <div className="metric-label">Runtime</div>
            <div className="metric-value">{metrics.execution_time ?? 'N/A'}s</div>
          </div>
        </div>
      )}
    </div>
  );
}

import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';

/* ── Main App Router ─────────────────────────────────── */
function App() {
  const [session, setSession] = useState(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [authModal, setAuthModal] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSessionLoaded(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) setAuthModal(null); // close modal on successful login
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!sessionLoaded) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#070c14' }}>
        <FaSpinner className="spin" style={{ fontSize:'2rem', color:'#0d9488' }} />
      </div>
    );
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  return (
    <>
      <div className="page-transition" key={location.pathname}>
        <Routes>
          <Route path="/" element={
            <Home
              session={session}
              onGoToTool={() => navigate('/tool')}
              onOpenAuth={(mode) => setAuthModal(mode)}
              onSignOut={handleSignOut}
            />
          } />
          <Route path="/tool" element={
            <MainDashboard
              session={session}
              onGoHome={() => navigate('/')}
              onOpenAuth={(mode) => setAuthModal(mode)}
              onSignOut={handleSignOut}
            />
          } />
        </Routes>
      </div>

      {/* Auth modal overlay — shown on top of whatever page */}
      {authModal && (
        <div className="auth-modal-backdrop" onClick={() => setAuthModal(null)}>
          <div className="auth-modal-box" onClick={e => e.stopPropagation()}>
            <button className="auth-modal-close" onClick={() => setAuthModal(null)}>
              <FaTimes />
            </button>
            <Auth initialMode={authModal} onSuccess={() => setAuthModal(null)} />
          </div>
        </div>
      )}
    </>
  );
}

/* ── Dashboard (publicly accessible, optional session) ── */
function MainDashboard({ session, onGoHome, onOpenAuth, onSignOut }) {
  const [files, setFiles] = useState([]);
  const [outputs, setOutputs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandModal, setExpandModal] = useState(null);
  const [importedData, setImportedData] = useState(null);
  const [activeTable, setActiveTable] = useState('psnr');
  const [showExplainer, setShowExplainer] = useState(false);
  const fileInputRef = useRef(null);
  const importInputRef = useRef(null);

  /* File handling */
  const handleFiles = (inputFiles) => {
    const valid = Array.from(inputFiles).filter(f => f.type.startsWith('image'));
    setFiles(valid);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const handleFileChange = (e) => { if (e.target.files) handleFiles(e.target.files); };
  const handleDragOver  = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files?.length > 0) handleFiles(e.dataTransfer.files);
  };
  const removeFile = (index) => setFiles(prev => prev.filter((_, i) => i !== index));

  /* Prevent accidental reload/sleep when work is done */
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (outputs.length > 0) {
        e.preventDefault();
        e.returnValue = 'You have unsaved analysis progress. Are you sure you want to leave?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [outputs]);

  /* Submit */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) return;
    setIsLoading(true);

    const initialOutputs = files.map((file, idx) => ({
      id: `${file.name}-${idx}-${Date.now()}`,
      name: file.name,
      size: (file.size / 1024).toFixed(1),
      origURL: URL.createObjectURL(file),
      enhancedURL: null, nativeURL: null,
      enhancedMetrics: null, nativeMetrics: null,
      enhancedStatus: 'queued', nativeStatus: 'queued',
      fileRef: file,
      pct: 0,
    }));

    // Append to existing outputs instead of overwriting
    setOutputs(prev => [...prev, ...initialOutputs]);
    setFiles([]); // Clear files so the dropzone is ready for a new batch

    const processImages = async () => {
      // Process only the newly added images
      for (const item of initialOutputs) {
        setOutputs(prev => prev.map(o => o.id === item.id ? { ...o, enhancedStatus: 'processing', nativeStatus: 'processing' } : o));
        
        await new Promise(async (resolveItem) => {
          const fd = new FormData();
          fd.append('image', item.fileRef);
          try {
            const res = await fetch('http://127.0.0.1:5005/process', { method: 'POST', body: fd });
            if (!res.ok) throw new Error('Process failed');
            const { session_id } = await res.json();
            
            let enhancedResolved = false;

            // Background polling loop
            (async () => {
              try {
                while (true) {
                  const progRes = await fetch(`http://127.0.0.1:5005/progress/${session_id}`);
                  if (!progRes.ok) throw new Error('Progress fetch failed');
                  const prog = await progRes.json();
                  
                  setOutputs(prev => prev.map(o => {
                    if (o.id !== item.id) return o;
                    const newO = { ...o };
                    newO.pct = prog.pct || newO.pct;
                    if (prog.ec_status) newO.enhancedStatus = prog.ec_status;
                    if (prog.nc_status) newO.nativeStatus = prog.nc_status;
                    
                    if (prog.partial) {
                      if (prog.partial.enhanced && !prog.partial.enhanced.error) {
                        newO.enhancedURL = prog.partial.enhanced.edge_b64;
                        newO.enhancedMetrics = {
                          psnr: prog.partial.enhanced.psnr,
                          mse_rmse: [prog.partial.enhanced.mse, Math.sqrt(prog.partial.enhanced.mse)],
                          fom: prog.partial.enhanced.fom,
                          execution_time: prog.partial.enhanced.time_s
                        };
                        newO.enhancedStatus = 'done';
                      } else if (prog.partial.enhanced?.error) {
                        newO.enhancedStatus = 'error';
                        newO.errorMessage = prog.partial.enhanced.error;
                      }
                      
                      if (prog.partial.native && !prog.partial.native.error) {
                        newO.nativeURL = prog.partial.native.edge_b64;
                        newO.nativeMetrics = {
                          psnr: prog.partial.native.psnr,
                          mse_rmse: [prog.partial.native.mse, Math.sqrt(prog.partial.native.mse)],
                          fom: prog.partial.native.fom,
                          execution_time: prog.partial.native.time_s
                        };
                        newO.nativeStatus = 'done';
                      } else if (prog.partial.native?.error) {
                        newO.nativeStatus = 'error';
                        newO.errorMessage = prog.partial.native.error;
                      }
                    }
                    return newO;
                  }));

                  if (prog.partial && prog.partial.enhanced && !enhancedResolved) {
                    enhancedResolved = true;
                    resolveItem();
                  }

                  if (prog.status === 'done' || prog.status === 'error' || prog.status === 'unknown') {
                    if (!enhancedResolved) {
                      enhancedResolved = true;
                      resolveItem();
                    }
                    break;
                  }
                  await new Promise(r => setTimeout(r, 600));
                }
              } catch (pollErr) {
                console.error(pollErr);
                setOutputs(prev => prev.map(o => o.id === item.id ? { ...o, enhancedStatus: 'error', nativeStatus: 'error', errorMessage: 'Connection lost' } : o));
                if (!enhancedResolved) {
                  enhancedResolved = true;
                  resolveItem();
                }
              }
            })();
          } catch (err) {
            console.error(err);
            setOutputs(prev => prev.map(o => o.id === item.id ? { ...o, enhancedStatus: 'error', nativeStatus: 'error', errorMessage: err.message || 'Network error' } : o));
            resolveItem();
          }
        });
      }
    };

    await processImages();
    setIsLoading(false);
  };

  /* Download comparison */
  const handleDownload = async (origSrc, enhancedSrc, nativeSrc, fileName) => {
    if (!origSrc || !enhancedSrc || !nativeSrc) return;
    const loadImg = (src) => new Promise((res, rej) => {
      const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = src;
    });
    try {
      const [oI, eI, nI] = await Promise.all([loadImg(origSrc), loadImg(enhancedSrc), loadImg(nativeSrc)]);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const h = Math.max(oI.naturalHeight, eI.naturalHeight, nI.naturalHeight);
      const ow = (oI.naturalWidth  / oI.naturalHeight)  * h;
      const ew = (eI.naturalWidth  / eI.naturalHeight)  * h;
      const nw = (nI.naturalWidth  / nI.naturalHeight)  * h;
      const pad = 30, gap = 30, hdr = 70;
      const x1 = pad, x2 = x1+ow+gap, x3 = x2+ew+gap;
      canvas.width  = pad + ow + gap + ew + gap + nw + pad;
      canvas.height = hdr + h + pad;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.font = 'bold 20px sans-serif'; ctx.fillStyle = '#000';
      ctx.fillText('INPUT IMAGE', x1, 45);
      ctx.fillText('ENHANCED CANNY EDGE', x2, 45);
      ctx.fillText('NATIVE CANNY EDGE', x3, 45);
      ctx.drawImage(oI, x1, hdr, ow, h);
      ctx.drawImage(eI, x2, hdr, ew, h);
      ctx.drawImage(nI, x3, hdr, nw, h);
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `comparison_${fileName.replace(/\.[^/.]+$/, '')}.png`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } catch (err) { console.error(err); alert('Download failed'); }
  };

  /* Derived state */
  const enhancedDone = outputs.filter(o => o.enhancedStatus === 'done').length;
  const nativeDone   = outputs.filter(o => o.nativeStatus   === 'done').length;
  const isAllCompleted = outputs.length > 0 && outputs.every(o => o.enhancedStatus === 'done' && o.nativeStatus === 'done');

  /* Export / Import */
  const exportProgress = () => {
    if (!averages) return;
    const str = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(averages.rawData));
    const a = document.createElement('a');
    a.setAttribute('href', str); a.setAttribute('download', 'global_dataset_average.json');
    document.body.appendChild(a); a.click(); a.remove();
  };

  const importProgress = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const obj = JSON.parse(ev.target.result);
        if (obj && typeof obj.count === 'number') { setImportedData(obj); alert(`Loaded averages for ${obj.count} images.`); }
        else alert('Invalid file format');
      } catch { alert('Invalid file format'); }
    };
    reader.readAsText(file);
    if (importInputRef.current) importInputRef.current.value = '';
  };

  /* Averages */
  const averages = useMemo(() => {
    let valid = outputs.filter(o => o.enhancedMetrics && o.nativeMetrics);
    let cnt = importedData ? importedData.count : 0;
    let sEF=importedData?importedData.sumEFom:0, sNF=importedData?importedData.sumNFom:0;
    let sEM=importedData?importedData.sumEMse:0, sNM=importedData?importedData.sumNMse:0;
    let tNT=importedData?importedData.totalNativeTime:0, tET=importedData?importedData.totalEnhancedTime:0;

    valid.forEach(o => {
      cnt++; sEF+=o.enhancedMetrics.fom; sNF+=o.nativeMetrics.fom;
      sEM+=o.enhancedMetrics.mse_rmse[0]; sNM+=o.nativeMetrics.mse_rmse[0];
      tNT+=o.nativeMetrics.execution_time; tET+=o.enhancedMetrics.execution_time;
    });
    if (cnt === 0) return null;
    const aEF=sEF/cnt, aNF=sNF/cnt, sp=tET>0?tNT/tET:0;
    const aEM=sEM/cnt, aNM=sNM/cnt;
    const aER=Math.sqrt(aEM), aNR=Math.sqrt(aNM), mx=255;
    const aEP=aEM>0?20*Math.log10(mx/Math.sqrt(aEM)):0;
    const aNP=aNM>0?20*Math.log10(mx/Math.sqrt(aNM)):0;
    return {
      totalCount: cnt,
      rawData: { count:cnt, sumEFom:sEF, sumNFom:sNF, sumEMse:sEM, sumNMse:sNM, totalNativeTime:tNT, totalEnhancedTime:tET },
      psnr:    { e:aEP, n:aNP, diff:aEP-aNP },
      mse_rmse:{ eMse:aEM, nMse:aNM, mseDiff:aEM-aNM, eRmse:aER, nRmse:aNR, rmseDiff:aER-aNR },
      fom:     { e:aEF, n:aNF, diff:aEF-aNF },
      speedup: { nTime:tNT, eTime:tET, factor:sp }
    };
  }, [outputs, importedData]);

  const openExpand = (item) => setExpandModal({
    title: item.name, original: item.origURL, enhanced: item.enhancedURL, native: item.nativeURL,
    enhancedMetrics: item.enhancedMetrics, nativeMetrics: item.nativeMetrics,
  });

  const userEmail = session?.user?.email ?? '';
  const userInitials = userEmail.slice(0,2).toUpperCase();
  
  // Calculate average percentage based on completed items + in-progress pct
  const globalPct = outputs.length > 0 ? (outputs.reduce((acc, o) => {
    if (o.enhancedStatus === 'done' && o.nativeStatus === 'done') return acc + 100;
    return acc + (o.pct || 0);
  }, 0) / outputs.length) : 0;

  return (
    <>
      {/* Microorganism background – subtle in tool view */}
      <MicroBg className="tool-micro-bg" />

      {/* ── TOPBAR ─────────────────────────── */}
      <nav className="topbar">
        <div className="topbar-left">
          <button className="topbar-home-btn" onClick={onGoHome} title="Back to Home">
            ← Home
          </button>
          <div className="topbar-divider-v" />
          <div className="topbar-logo-ring">
            <AppLogo size={32} />
          </div>
          <div className="topbar-brand">
            <span className="topbar-title">Detection Tool</span>
            <span className="topbar-sub">Enhanced Canny Edge · v2.0</span>
          </div>
        </div>
        <div className="topbar-right">
          {session ? (
            <>
              <div className="user-chip">
                <div className="user-avatar">{session.user?.email?.slice(0,2).toUpperCase()}</div>
                <span>{session.user?.email}</span>
              </div>
              <button className="signout-btn" onClick={onSignOut}>
                <FaSignOutAlt style={{ marginRight: 4 }} /> Sign Out
              </button>
            </>
          ) : (
            <>
              <span className="topbar-guest-hint">Not signed in - sessions not tracked</span>
              <button className="topbar-auth-btn" onClick={() => onOpenAuth('login')}>Sign In</button>
              <button className="topbar-auth-btn solid" onClick={() => onOpenAuth('signup')}>Sign Up</button>
            </>
          )}
        </div>
      </nav>

      {/* ── WORKSPACE ──────────────────────── */}
      <div className="workspace">

        {/* ── LEFT PANEL ─ */}
        <aside className="panel-left">

          {/* Upload Card */}
          <div className="panel-card">
            <div className="panel-card-header">
              <div className="panel-card-header-icon"><FaUpload /></div>
              <span className="panel-card-title">Upload Specimens</span>
            </div>
            <div className="panel-card-body">
              <form onSubmit={handleSubmit}>
                <div className="form-scroll-area">
                  <div
                    className={`dropzone ${isDragging ? 'dragging' : ''}`}
                    onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input type="file" ref={fileInputRef} multiple onChange={handleFileChange} accept="image/*" className="sys-file-input" />
                    <div className="dz-icon-wrap"><FaMicroscope /></div>
                    <span className="drop-hint">Drag & drop specimen images here</span>
                    <span className="drop-or">- or -</span>
                    <button type="button" className="browse-btn" onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                      Browse Files
                    </button>
                  </div>

                  {files.length > 0 && (
                    <div className="files-list">
                      {files.map((file, index) => (
                        <div key={`${file.name}-${index}`} className="file-chip">
                          <FaFileImage className="chip-icon" />
                          <span className="chip-name" title={file.name}>{file.name}</span>
                          <span className="chip-size">{(file.size / 1024).toFixed(1)}KB</span>
                          <button type="button" className="chip-remove" onClick={() => removeFile(index)}>
                            <FaTimes />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-actions">
                  <button type="submit" className="analyze-btn" disabled={isLoading || files.length === 0}>
                    {isLoading ? <><div className="btn-spinner" />Analyzing…</> : <><FaPlay />Analyze {files.length > 0 ? `${files.length} Specimen${files.length > 1 ? 's' : ''}` : 'Specimens'}</>}
                  </button>
                  {(files.length > 0 || outputs.length > 0 || importedData) && (
                    <button type="button" className="reset-btn" onClick={() => { setFiles([]); setOutputs([]); setIsLoading(false); setImportedData(null); }}>
                      <FaTrash style={{ marginRight:4 }} /> Clear & Reset
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Progress Card (visible while loading) */}
          {isLoading && (
            <div className="panel-card">
              <div className="panel-card-header">
                <div className="panel-card-header-icon"><FaSpinner className="spin" /></div>
                <span className="panel-card-title">Processing</span>
              </div>
              <div className="panel-card-body">
                <div className="progress-panel">
                  <div className="progress-track">
                    <span className="progress-track-label">Enhanced</span>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill enhanced" style={{ width: `${outputs.length > 0 ? (enhancedDone === outputs.length ? 100 : globalPct) : 0}%` }} />
                    </div>
                    <span className="progress-count">{enhancedDone}/{outputs.length}</span>
                  </div>
                  <div className="progress-track">
                    <span className="progress-track-label">Native</span>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill native" style={{ width: `${outputs.length > 0 ? (nativeDone === outputs.length ? 100 : globalPct) : 0}%` }} />
                    </div>
                    <span className="progress-count">{nativeDone}/{outputs.length}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions Card */}
          <div className="panel-card">
            <div className="panel-card-header">
              <div className="panel-card-header-icon"><FaChartBar /></div>
              <span className="panel-card-title">Dataset Tools</span>
            </div>
            <div className="panel-card-body">
              <div className="action-panel">
                {(isAllCompleted || importedData) && averages && (
                  <>
                    <button className="secondary-btn primary-outline" onClick={() => setIsModalOpen(true)}>
                      <FaChartBar /> View Comparison Metrics
                    </button>
                    <button className="secondary-btn primary-outline" onClick={exportProgress}>
                      <FaFileExport /> Save Global Average
                    </button>
                  </>
                )}
                <button className="secondary-btn" onClick={() => importInputRef.current?.click()}>
                  <FaFileImport /> Load Global Average
                </button>
                <input type="file" ref={importInputRef} style={{ display:'none' }} accept=".json" onChange={importProgress} />
              </div>
            </div>
          </div>

        </aside>

        {/* ── RIGHT PANEL ─ */}
        <main className="panel-right">

          {outputs.length === 0 ? (
            <div className="empty-state">
              <FaMicroscope className="empty-state-icon" />
              <div className="empty-state-title">No specimens analyzed yet</div>
              <div className="empty-state-text">Upload one or more microscopic images and click Analyze to begin edge detection.</div>
            </div>
          ) : (
            <div className="per-image-results-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {outputs.map(item => (
                <div key={item.id} className="image-result-group">
                  <div className="results-section-header" style={{ marginBottom: '1rem' }}>
                    <div className="section-title-row">
                      <FaFileImage style={{ color: 'var(--primary)' }} />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: '600' }}>{item.name}</span>
                    </div>
                  </div>
                  <div className="image-cards-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <ResultCard
                      item={item} type="enhanced"
                      onCompare={() => openExpand(item)}
                      onSave={() => handleDownload(item.origURL, item.enhancedURL, item.nativeURL, item.name)}
                    />
                    <ResultCard
                      item={item} type="native"
                      onCompare={() => openExpand(item)}
                      onSave={() => handleDownload(item.origURL, item.enhancedURL, item.nativeURL, item.name)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* ── FOOTER ─────────────────────────── */}
      <footer className="app-footer">
        <span className="footer-text">Enhanced Canny Edge Detection System · Water Sample Microorganism Analysis</span>
        <span className="footer-text">{new Date().getFullYear()} · Research Tool v2.0</span>
      </footer>

      {/* ── METRICS MODAL ─────────────────── */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Performance & Evaluation Metrics</h3>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}><FaTimes /></button>
            </div>
            <div className="modal-tabs">
              {['psnr','mse_rmse','fom','speedup'].map(t => (
                <button key={t} type="button" className={`tab-btn ${activeTable===t?'active':''}`}
                  onClick={() => { setActiveTable(t); setShowExplainer(false); }}>
                  {t==='psnr'?'PSNR':t==='mse_rmse'?'MSE & RMSE':t==='fom'?"Pratt's FOM":'Speedup'}
                </button>
              ))}
              <button type="button" className={`tab-btn explainer-tab ${showExplainer?'active':''}`}
                onClick={() => setShowExplainer(!showExplainer)}>
                <FaQuestionCircle /> Explain
              </button>
            </div>

            {showExplainer && (
              <div className="metric-explainer">
                <div className="explainer-card">
                  <h4><FaInfoCircle style={{marginRight:6,color:'var(--primary-light)'}}/>{METRIC_EXPLANATIONS[activeTable].title}</h4>
                  <div className="explainer-section">
                    <span className="explainer-label">Formula</span>
                    <code className="explainer-formula">{METRIC_EXPLANATIONS[activeTable].formula}</code>
                  </div>
                  <div className="explainer-section">
                    <span className="explainer-label">What it measures</span>
                    <p>{METRIC_EXPLANATIONS[activeTable].description}</p>
                  </div>
                  <div className="explainer-section">
                    <span className="explainer-label">How to interpret</span>
                    <p>{METRIC_EXPLANATIONS[activeTable].interpretation}</p>
                  </div>
                  <div className="explainer-section">
                    <span className="explainer-label">Why it matters</span>
                    <p>{METRIC_EXPLANATIONS[activeTable].whyItMatters}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="modal-body" style={{ maxHeight:'60vh', overflow:'auto', position:'relative', padding:0, WebkitOverflowScrolling:'touch' }}>
              <table className="modal-table" style={{ margin:0 }}>
                <thead>
                  {activeTable === 'psnr'     && <tr><th>Sample Image</th><th>Enhanced PSNR (dB)</th><th>Native PSNR (dB)</th><th>PSNR Gain (Δ)</th></tr>}
                  {activeTable === 'mse_rmse' && <tr><th>Sample Image</th><th>Enh. MSE</th><th>Nat. MSE</th><th>MSE Δ</th><th>Enh. RMSE</th><th>Nat. RMSE</th><th>RMSE Δ</th></tr>}
                  {activeTable === 'fom'      && <tr><th>Sample Image</th><th>Enhanced FOM</th><th>Native FOM</th><th>Localization Gain (Δ)</th></tr>}
                  {activeTable === 'speedup'  && <tr><th>Sample Image</th><th>Native Runtime (s)</th><th>Enhanced Runtime (s)</th><th>Speedup Factor</th></tr>}
                </thead>
                <tbody>
                  {outputs.map(item => {
                    const eM = item.enhancedMetrics || {};
                    const nM = item.nativeMetrics   || {};
                    return (
                      <tr key={item.id}>
                        <td className="cell-filename" title={item.name}>{item.name}</td>
                        {activeTable === 'psnr' && <>
                          <td>{eM.psnr ?? 'N/A'}</td>
                          <td>{nM.psnr ?? 'N/A'}</td>
                          <td className={`highlight-gain ${eM.psnr && nM.psnr ? (eM.psnr - nM.psnr > 0 ? 'imp' : 'no-imp') : ''}`}>
                            {eM.psnr != null && nM.psnr != null ? (eM.psnr - nM.psnr).toFixed(3) : 'N/A'}
                          </td>
                        </>}
                        {activeTable === 'mse_rmse' && <>
                          <td>{eM.mse_rmse?.[0] ?? 'N/A'}</td>
                          <td>{nM.mse_rmse?.[0] ?? 'N/A'}</td>
                          <td className={`mse_rmse ${eM.mse_rmse?.[0] != null && nM.mse_rmse?.[0] != null ? (eM.mse_rmse[0] - nM.mse_rmse[0] < 0 ? 'imp' : 'no-imp') : ''}`}>
                            {eM.mse_rmse?.[0] != null && nM.mse_rmse?.[0] != null ? (eM.mse_rmse[0] - nM.mse_rmse[0]).toFixed(4) : 'N/A'}
                          </td>
                          <td>{eM.mse_rmse?.[1] ?? 'N/A'}</td>
                          <td>{nM.mse_rmse?.[1] ?? 'N/A'}</td>
                          <td className={`mse_rmse ${eM.mse_rmse?.[1] != null && nM.mse_rmse?.[1] != null ? (eM.mse_rmse[1] - nM.mse_rmse[1] < 0 ? 'imp' : 'no-imp') : ''}`}>
                            {eM.mse_rmse?.[1] != null && nM.mse_rmse?.[1] != null ? (eM.mse_rmse[1] - nM.mse_rmse[1]).toFixed(4) : 'N/A'}
                          </td>
                        </>}
                        {activeTable === 'fom' && <>
                          <td>{eM.fom ?? 'N/A'}</td>
                          <td>{nM.fom ?? 'N/A'}</td>
                          <td className={`highlight-gain ${nM.fom != null && eM.fom != null ? (eM.fom - nM.fom > 0 ? 'imp' : 'no-imp') : ''}`}>
                            {eM.fom != null && nM.fom != null ? (eM.fom - nM.fom).toFixed(4) : 'N/A'}
                          </td>
                        </>}
                        {activeTable === 'speedup' && <>
                          <td>{nM.execution_time ? `${nM.execution_time}s` : 'N/A'}</td>
                          <td>{eM.execution_time ? `${eM.execution_time}s` : 'N/A'}</td>
                          <td className={`highlight-speedup ${nM.execution_time && eM.execution_time ? (nM.execution_time > eM.execution_time ? 'imp' : 'no-imp') : ''}`}>
                            {nM.execution_time && eM.execution_time ? `${(nM.execution_time / eM.execution_time).toFixed(2)}x` : 'N/A'}
                          </td>
                        </>}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="average-row">
                    <td style={{ textAlign:'left' }}>
                      <strong>Global Dataset Average</strong>
                      <div style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>(N={averages ? averages.totalCount : 0} images)</div>
                    </td>
                    {activeTable === 'psnr' && averages && <>
                      <td>{averages.psnr.e.toFixed(3)}</td>
                      <td>{averages.psnr.n.toFixed(3)}</td>
                      <td className={`highlight-gain ${averages.psnr.diff > 0 ? 'imp' : 'no-imp'}`}>{averages.psnr.diff.toFixed(3)}</td>
                    </>}
                    {activeTable === 'mse_rmse' && averages && <>
                      <td>{averages.mse_rmse.eMse.toFixed(4)}</td>
                      <td>{averages.mse_rmse.nMse.toFixed(4)}</td>
                      <td className={`mse_rmse ${averages.mse_rmse.mseDiff < 0 ? 'imp' : 'no-imp'}`}>{averages.mse_rmse.mseDiff.toFixed(4)}</td>
                      <td>{averages.mse_rmse.eRmse.toFixed(4)}</td>
                      <td>{averages.mse_rmse.nRmse.toFixed(4)}</td>
                      <td className={`mse_rmse ${averages.mse_rmse.rmseDiff < 0 ? 'imp' : 'no-imp'}`}>{averages.mse_rmse.rmseDiff.toFixed(4)}</td>
                    </>}
                    {activeTable === 'fom' && averages && <>
                      <td>{averages.fom.e.toFixed(4)}</td>
                      <td>{averages.fom.n.toFixed(4)}</td>
                      <td className={`highlight-gain ${averages.fom.diff > 0 ? 'imp' : 'no-imp'}`}>{averages.fom.diff.toFixed(4)}</td>
                    </>}
                    {activeTable === 'speedup' && averages && <>
                      <td>{averages.speedup.nTime.toFixed(2)}s</td>
                      <td>{averages.speedup.eTime.toFixed(2)}s</td>
                      <td className={`highlight-speedup ${averages.speedup.factor > 1 ? 'imp' : 'no-imp'}`}>{averages.speedup.factor.toFixed(2)}x</td>
                    </>}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── EXPAND COMPARISON MODAL ────────── */}
      {expandModal && (
        <div className="modal-overlay" onClick={() => setExpandModal(null)} style={{ zIndex:2000 }}>
          <div className="modal-container" onClick={e => e.stopPropagation()} style={{ width:'95%', maxWidth:'1600px' }}>
            <div className="modal-header">
              <h3>Specimen Comparison: {expandModal.title}</h3>
              <button className="modal-close-btn" onClick={() => setExpandModal(null)}><FaTimes /></button>
            </div>
            <div className="modal-body" style={{ padding:'1rem' }}>
              <ComparisonViewer
                originalURL={expandModal.original}
                enhancedURL={expandModal.enhanced}
                nativeURL={expandModal.native}
                fileName={expandModal.title}
              />
              {expandModal.enhancedMetrics && expandModal.nativeMetrics && (
                <div style={{ marginTop:'1rem', overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
                  <table className="modal-table" style={{ fontSize:'0.82rem' }}>
                    <thead>
                      <tr><th>Algorithm</th><th>PSNR (dB)</th><th>MSE</th><th>RMSE</th><th>Pratt's FOM</th><th>Runtime (s)</th></tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ textAlign:'left', fontWeight:700, color:'var(--accent)' }}>Enhanced Canny</td>
                        <td>{expandModal.enhancedMetrics.psnr?.toFixed(3) ?? 'N/A'}</td>
                        <td>{expandModal.enhancedMetrics.mse_rmse?.[0]?.toFixed(4) ?? 'N/A'}</td>
                        <td>{expandModal.enhancedMetrics.mse_rmse?.[1]?.toFixed(4) ?? 'N/A'}</td>
                        <td>{expandModal.enhancedMetrics.fom?.toFixed(4) ?? 'N/A'}</td>
                        <td>{expandModal.enhancedMetrics.execution_time ?? 'N/A'}</td>
                      </tr>
                      <tr>
                        <td style={{ textAlign:'left', fontWeight:700, color:'var(--amber)' }}>Native Canny</td>
                        <td>{expandModal.nativeMetrics.psnr?.toFixed(3) ?? 'N/A'}</td>
                        <td>{expandModal.nativeMetrics.mse_rmse?.[0]?.toFixed(4) ?? 'N/A'}</td>
                        <td>{expandModal.nativeMetrics.mse_rmse?.[1]?.toFixed(4) ?? 'N/A'}</td>
                        <td>{expandModal.nativeMetrics.fom?.toFixed(4) ?? 'N/A'}</td>
                        <td>{expandModal.nativeMetrics.execution_time ?? 'N/A'}</td>
                      </tr>
                      <tr style={{ fontWeight:700 }}>
                        <td style={{ textAlign:'left' }}>Δ Difference</td>
                        <td className={`highlight-gain ${(expandModal.enhancedMetrics.psnr - expandModal.nativeMetrics.psnr) > 0 ? 'imp' : 'no-imp'}`}>
                          {(expandModal.enhancedMetrics.psnr - expandModal.nativeMetrics.psnr).toFixed(3)}
                        </td>
                        <td className={`mse_rmse ${(expandModal.enhancedMetrics.mse_rmse?.[0] - expandModal.nativeMetrics.mse_rmse?.[0]) < 0 ? 'imp' : 'no-imp'}`}>
                          {(expandModal.enhancedMetrics.mse_rmse[0] - expandModal.nativeMetrics.mse_rmse[0]).toFixed(4)}
                        </td>
                        <td className={`mse_rmse ${(expandModal.enhancedMetrics.mse_rmse?.[1] - expandModal.nativeMetrics.mse_rmse?.[1]) < 0 ? 'imp' : 'no-imp'}`}>
                          {(expandModal.enhancedMetrics.mse_rmse[1] - expandModal.nativeMetrics.mse_rmse[1]).toFixed(4)}
                        </td>
                        <td className={`highlight-gain ${(expandModal.enhancedMetrics.fom - expandModal.nativeMetrics.fom) > 0 ? 'imp' : 'no-imp'}`}>
                          {(expandModal.enhancedMetrics.fom - expandModal.nativeMetrics.fom).toFixed(4)}
                        </td>
                        <td className={`highlight-speedup ${expandModal.nativeMetrics.execution_time > expandModal.enhancedMetrics.execution_time ? 'imp' : 'no-imp'}`}>
                          {(expandModal.nativeMetrics.execution_time / expandModal.enhancedMetrics.execution_time).toFixed(2)}x faster
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;