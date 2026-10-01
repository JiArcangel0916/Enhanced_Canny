import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import {
  FaMicroscope, FaFileImage, FaTimes, FaSpinner, FaArrowDown,
  FaExclamationCircle, FaChartBar, FaExpand, FaFileExport, FaFileImport,
  FaSearchPlus, FaSearchMinus, FaLayerGroup, FaColumns, FaToggleOn, FaEye,
  FaInfoCircle, FaQuestionCircle
} from 'react-icons/fa';
import './App.css'

/* Inline SVG logo component */
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

/* Metric Explainer descriptions */
const METRIC_EXPLANATIONS = {
  psnr: {
    title: 'Peak Signal-to-Noise Ratio (PSNR)',
    formula: 'PSNR = 20 × log₁₀(MAX_PIXEL / √MSE)',
    description: 'PSNR measures the ratio between the maximum possible signal power and the noise power that affects image quality. It is expressed in decibels (dB).',
    interpretation: 'Higher PSNR values indicate better image quality preservation. A higher PSNR in the edge-detected output means the algorithm retained more of the original signal while performing edge detection. Typical values range from 5–15 dB for edge detection outputs.',
    whyItMatters: 'For microorganism detection, a higher PSNR means the edge detection preserved more detail from the original specimen, which helps biologists identify finer structural features of organisms.'
  },
  mse_rmse: {
    title: 'Mean Squared Error (MSE) & Root Mean Squared Error (RMSE)',
    formula: 'MSE = (1/N) × Σ(original - detected)²\nRMSE = √MSE',
    description: 'MSE quantifies the average squared difference between the original image and the edge-detected output pixel by pixel. RMSE is its square root, giving a value in the same units as pixel intensities (0–255).',
    interpretation: 'Lower MSE/RMSE values indicate the edge detection output is closer to the original image in terms of pixel intensity. For edge detection, this measures how much information is retained from the source.',
    whyItMatters: 'A lower MSE means less information loss during edge detection. When analyzing microscopic water samples, minimizing information loss ensures that subtle cellular structures and microorganism boundaries are preserved.'
  },
  fom: {
    title: "Pratt's Figure of Merit (FOM)",
    formula: 'FOM = (1 / max(N_ideal, N_actual)) × Σ 1/(1 + d(i)² × α)',
    description: "Pratt's FOM specifically evaluates edge detection quality by measuring three factors: (1) missing true edges, (2) falsely detected edges, and (3) edge localization accuracy. The scaling constant α is typically 1/9.",
    interpretation: 'FOM values range from 0 to 1, where 1 represents a perfect match with the ideal edge map. Values closer to 1 indicate better edge detection accuracy with fewer false positives, fewer missed edges, and more precise edge positioning.',
    whyItMatters: 'For water sample analysis, accurate edge localization is critical. A higher FOM means the algorithm correctly identifies the boundaries of microorganisms without adding noise artifacts that could be mistaken for organisms.'
  },
  speedup: {
    title: 'Speedup Factor',
    formula: 'Speedup = Native_Runtime / Enhanced_Runtime',
    description: 'Speedup factor measures how much faster the Enhanced Canny algorithm is compared to the Native (pure-Python) Canny implementation. It is the ratio of their execution times.',
    interpretation: 'A speedup of 10x means the Enhanced algorithm completes 10 times faster than the Native version. Values greater than 1x indicate the Enhanced algorithm is faster.',
    whyItMatters: 'When processing large batches of microscopic water samples (potentially hundreds of images per study), faster processing time dramatically reduces the total analysis duration, allowing biologists to get results sooner.'
  }
};

/* ================================================================
   Comparison Viewer Component
   – Overlay (opacity slider), Side-by-Side, Toggle, Zoom (1x–10x)
   ================================================================ */
function ComparisonViewer({ originalURL, enhancedURL, nativeURL, fileName }) {
  const [mode, setMode] = useState('side');        // 'side' | 'overlay' | 'toggle'
  const [overlayOpacity, setOverlayOpacity] = useState(50);
  const [toggleShowing, setToggleShowing] = useState('enhanced');
  const [zoom, setZoom] = useState(1);
  const zoomLevels = [1, 2, 3, 5, 10];

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingPan, setIsDraggingPan] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (zoom === 1) setPan({ x: 0, y: 0 });
  }, [zoom]);

  const handleMouseDown = (e) => {
    if (zoom <= 1) return;
    setIsDraggingPan(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e) => {
    if (!isDraggingPan) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUpOrLeave = () => setIsDraggingPan(false);

  return (
    <div className="comparison-viewer">
      {/* Toolbar */}
      <div className="comparison-toolbar">
        <div className="toolbar-group">
          <label>View Mode:</label>
          <button className={`mode-btn ${mode === 'side' ? 'active' : ''}`} onClick={() => setMode('side')}>
            <FaColumns style={{ marginRight: 4 }} /> Side-by-Side
          </button>
          <button className={`mode-btn ${mode === 'overlay' ? 'active' : ''}`} onClick={() => setMode('overlay')}>
            <FaLayerGroup style={{ marginRight: 4 }} /> Overlay
          </button>
          <button className={`mode-btn ${mode === 'toggle' ? 'active' : ''}`} onClick={() => setMode('toggle')}>
            <FaToggleOn style={{ marginRight: 4 }} /> Toggle
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <label>Zoom:</label>
          {zoomLevels.map(z => (
            <button key={z} className={`zoom-btn ${zoom === z ? 'active' : ''}`} onClick={() => setZoom(z)}>
              {z}x
            </button>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div 
        className="comparison-canvas" 
        style={{ 
          overflow: 'hidden', 
          cursor: zoom > 1 ? (isDraggingPan ? 'grabbing' : 'grab') : 'default',
          userSelect: 'none'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
      >
        {/* ── SIDE BY SIDE ─────────────────────────────── */}
        {mode === 'side' && (
          <div className="side-by-side-wrap" style={{ gridTemplateColumns: originalURL ? '1fr 1fr 1fr' : '1fr 1fr' }}>
            {originalURL && (
              <div className="side-by-side-panel">
                <span className="side-panel-label original-label">Original</span>
                <img src={originalURL} alt="Original specimen" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center center', pointerEvents: 'none' }} />
              </div>
            )}
            <div className="side-by-side-panel">
              <span className="side-panel-label enhanced-label">Enhanced Canny</span>
              {enhancedURL
                ? <img src={enhancedURL} alt="Enhanced Canny result" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center center', pointerEvents: 'none' }} />
                : <div className="placeholder-status"><FaSpinner className="spinner-icon spin" /><span>Processing…</span></div>
              }
            </div>
            <div className="side-by-side-panel">
              <span className="side-panel-label native-label">Native Canny</span>
              {nativeURL
                ? <img src={nativeURL} alt="Native Canny result" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center center', pointerEvents: 'none' }} />
                : <div className="placeholder-status"><FaSpinner className="spinner-icon spin" /><span>Processing…</span></div>
              }
            </div>
          </div>
        )}

        {/* ── OVERLAY ─────────────────────────────────── */}
        {mode === 'overlay' && (
          <div className="overlay-wrap" style={{ backgroundColor: '#000' }}>
            {/* Invisible spacer to maintain container height */}
            {enhancedURL && <img src={enhancedURL} style={{ visibility: 'hidden', width: '100%', height: 'auto', display: 'block', pointerEvents: 'none' }} alt="spacer" />}
            
            {/* Colored Base Layer (Native - Amber) */}
            {nativeURL
              ? (
                <div style={{ backgroundColor: '#f59e0b', mixBlendMode: 'screen', opacity: (100 - overlayOpacity) / 100, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', position: 'absolute', inset: 0 }}>
                  <img src={nativeURL} alt="Native (base layer)" style={{ mixBlendMode: 'multiply', transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center center', pointerEvents: 'none' }} />
                </div>
              )
              : <div className="placeholder-status" style={{ position: 'absolute', inset: 0, minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaSpinner className="spinner-icon spin" /><span style={{marginLeft: 8}}>Waiting for native…</span></div>
            }
            {/* Colored Overlay Layer (Enhanced - Cyan) */}
            {enhancedURL && (
              <div className="overlay-top" style={{ backgroundColor: '#0ea5e9', mixBlendMode: 'screen', opacity: overlayOpacity / 100, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', inset: 0 }}>
                <img src={enhancedURL} alt="Enhanced (overlay layer)" style={{ mixBlendMode: 'multiply', transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center center', pointerEvents: 'none' }} />
              </div>
            )}
            <div className="overlay-controls" style={{ pointerEvents: 'auto' }} onMouseDown={(e) => e.stopPropagation()}>
              <label style={{ color: '#f59e0b' }}>Native (Amber)</label>
              <input type="range" min="0" max="100" value={overlayOpacity} onChange={(e) => setOverlayOpacity(Number(e.target.value))} />
              <label style={{ color: '#0ea5e9' }}>Enhanced (Cyan)</label>
              <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 700, minWidth: 35 }}>{overlayOpacity}%</span>
            </div>
          </div>
        )}

        {/* ── TOGGLE ──────────────────────────────────── */}
        {mode === 'toggle' && (
          <div className="overlay-wrap" style={{ backgroundColor: '#000' }}>
            {toggleShowing === 'enhanced'
              ? (enhancedURL
                ? <img src={enhancedURL} alt="Enhanced Canny" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center center', pointerEvents: 'none' }} />
                : <div className="placeholder-status" style={{ position: 'relative', minHeight: 300 }}><FaSpinner className="spinner-icon spin" /><span>Processing…</span></div>)
              : (nativeURL
                ? <img src={nativeURL} alt="Native Canny" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center center', pointerEvents: 'none' }} />
                : <div className="placeholder-status" style={{ position: 'relative', minHeight: 300 }}><FaSpinner className="spinner-icon spin" /><span>Processing…</span></div>)
            }
            <div className="overlay-controls" style={{ pointerEvents: 'auto' }} onMouseDown={(e) => e.stopPropagation()}>
              <button
                className={`mode-btn ${toggleShowing === 'enhanced' ? 'active' : ''}`}
                onClick={() => setToggleShowing('enhanced')}
                style={{ fontSize: '0.8rem' }}
              >
                Enhanced Canny
              </button>
              <button
                className={`mode-btn ${toggleShowing === 'native' ? 'active' : ''}`}
                onClick={() => setToggleShowing('native')}
                style={{ fontSize: '0.8rem' }}
              >
                Native Canny
              </button>
              <span className={`toggle-label-indicator ${toggleShowing === 'enhanced' ? 'showing-enhanced' : 'showing-native'}`}>
                {toggleShowing === 'enhanced' ? '● Enhanced' : '● Native'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


/* ================================================================
   Main App
   ================================================================ */
function App() {
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

  /* ── File handling ──────────────────────────────────────── */
  const handleFiles = (inputFiles) => {
    const valid = Array.from(inputFiles).filter((file) => file.type.startsWith('image'));
    setFiles(valid);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e) => { if (e.target.files) handleFiles(e.target.files); };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length > 0) handleFiles(e.dataTransfer.files);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  /* ── Processing: Enhanced FIRST, then Native ────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) return;
    setIsLoading(true);

    const initialOutputs = files.map((file, idx) => ({
      id: `${file.name}-${idx}-${Date.now()}`,
      name: file.name,
      size: (file.size / 1024).toFixed(1),
      origURL: URL.createObjectURL(file),
      enhancedURL: null,
      nativeURL: null,
      enhancedMetrics: null,
      nativeMetrics: null,
      enhancedStatus: 'processing',
      nativeStatus: 'queued',
      fileRef: file,
    }));

    setOutputs(initialOutputs);

    // Queue 1: Process all Enhanced Canny (Fast, finishes quickly)
    const runEnhancedQueue = async () => {
      for (const item of initialOutputs) {
        const fd = new FormData();
        fd.append('image', item.fileRef);
        try {
          const res = await fetch('http://localhost:5000/api/detect-edges/enhanced', { method: 'POST', body: fd });
          if (!res.ok) throw new Error('Enhanced processing failed');
          const data = await res.json();
          setOutputs((prev) =>
            prev.map((o) =>
              o.id === item.id
                ? { ...o, enhancedURL: data.image, enhancedMetrics: data.metrics, enhancedStatus: 'done' }
                : o
            )
          );
        } catch (err) {
          console.error('Enhanced error:', err);
          setOutputs((prev) =>
            prev.map((o) =>
              o.id === item.id ? { ...o, enhancedStatus: 'error' } : o
            )
          );
        }
      }
    };

    // Queue 2: Process all Native Canny (Slower, runs alongside Enhanced)
    const runNativeQueue = async () => {
      for (const item of initialOutputs) {
        // Mark current item as processing
        setOutputs((prev) =>
          prev.map((o) =>
            o.id === item.id ? { ...o, nativeStatus: 'processing' } : o
          )
        );

        const fd = new FormData();
        fd.append('image', item.fileRef);
        try {
          const res = await fetch('http://localhost:5000/api/detect-edges/native', { method: 'POST', body: fd });
          if (!res.ok) throw new Error('Native processing failed');
          const data = await res.json();
          setOutputs((prev) =>
            prev.map((o) =>
              o.id === item.id
                ? { ...o, nativeURL: data.image, nativeMetrics: data.metrics, nativeStatus: 'done' }
                : o
            )
          );
        } catch (err) {
          console.error('Native error:', err);
          setOutputs((prev) =>
            prev.map((o) =>
              o.id === item.id ? { ...o, nativeStatus: 'error' } : o
            )
          );
        }
      }
    };

    // Run both queues concurrently
    await Promise.all([runEnhancedQueue(), runNativeQueue()]);
    setIsLoading(false);
  };

  /* ── Download comparison grid ───────────────────────────── */
  const handleDownload = async (origSrc, enhancedSrc, nativeSrc, fileName) => {
    if (!origSrc || !enhancedSrc || !nativeSrc) return;
    const loadImg = (src) => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

    try {
      const [origImg, enhancedImg, nativeImg] = await Promise.all([loadImg(origSrc), loadImg(enhancedSrc), loadImg(nativeSrc)]);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const targetHeight = Math.max(origImg.naturalHeight, enhancedImg.naturalHeight, nativeImg.naturalHeight);
      const origWidth = (origImg.naturalWidth / origImg.naturalHeight) * targetHeight;
      const enhancedWidth = (enhancedImg.naturalWidth / enhancedImg.naturalHeight) * targetHeight;
      const nativeWidth = (nativeImg.naturalWidth / nativeImg.naturalHeight) * targetHeight;
      const padding = 30, gap = 30, headerHeight = 70;
      const x1 = padding, x2 = x1 + origWidth + gap, x3 = x2 + enhancedWidth + gap;
      canvas.width = padding + origWidth + gap + enhancedWidth + gap + nativeWidth + padding;
      canvas.height = headerHeight + targetHeight + padding;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = 'bold 20px sans-serif';
      ctx.fillStyle = '#000000';
      ctx.fillText('INPUT IMAGE', x1, 45);
      ctx.fillText('ENHANCED CANNY EDGE', x2, 45);
      ctx.fillText('NATIVE CANNY EDGE', x3, 45);
      ctx.drawImage(origImg, x1, headerHeight, origWidth, targetHeight);
      ctx.drawImage(enhancedImg, x2, headerHeight, enhancedWidth, targetHeight);
      ctx.drawImage(nativeImg, x3, headerHeight, nativeWidth, targetHeight);
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `comparison_${fileName.replace(/\.[^/.]+$/, '')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert("Failed to download comparison grid");
    }
  };

  /* ── Derived state ──────────────────────────────────────── */
  const enhancedDone = outputs.filter(o => o.enhancedStatus === 'done');
  const nativeDone = outputs.filter(o => o.nativeStatus === 'done');
  const allEnhancedDone = outputs.length > 0 && outputs.every(o => o.enhancedStatus === 'done' || o.enhancedStatus === 'error');
  const isAllCompleted = outputs.length > 0 && outputs.every(o => o.enhancedStatus === 'done' && o.nativeStatus === 'done');

  const enhancedProcessing = outputs.filter(o => o.enhancedStatus === 'processing').length;
  const nativeProcessing = outputs.filter(o => o.nativeStatus === 'processing').length;

  /* ── Export / Import ────────────────────────────────────── */
  const exportProgress = () => {
    if (!averages) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(averages.rawData));
    const a = document.createElement('a');
    a.setAttribute("href", dataStr);
    a.setAttribute("download", "global_dataset_average.json");
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const importProgress = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const obj = JSON.parse(event.target.result);
        if (obj && typeof obj.count === 'number') {
          setImportedData(obj);
          alert(`Successfully loaded averages of ${obj.count} images.`);
        } else { alert("Invalid file format"); }
      } catch { alert("Invalid file format"); }
    };
    reader.readAsText(file);
    if (importInputRef.current) importInputRef.current.value = '';
  };

  /* ── Dataset Averages ───────────────────────────────────── */
  const averages = useMemo(() => {
    let validOutputs = outputs.filter(o => o.enhancedMetrics && o.nativeMetrics);
    let totalCount = importedData ? importedData.count : 0;
    let sumEFom = importedData ? importedData.sumEFom : 0;
    let sumNFom = importedData ? importedData.sumNFom : 0;
    let sumEMse = importedData ? importedData.sumEMse : 0;
    let sumNMse = importedData ? importedData.sumNMse : 0;
    let tNTime = importedData ? importedData.totalNativeTime : 0;
    let tETime = importedData ? importedData.totalEnhancedTime : 0;

    validOutputs.forEach(o => {
      totalCount += 1;
      sumEFom += o.enhancedMetrics.fom;
      sumNFom += o.nativeMetrics.fom;
      sumEMse += o.enhancedMetrics.mse_rmse[0];
      sumNMse += o.nativeMetrics.mse_rmse[0];
      tNTime += o.nativeMetrics.execution_time;
      tETime += o.enhancedMetrics.execution_time;
    });

    if (totalCount === 0) return null;

    const avgEnhancedFom = sumEFom / totalCount;
    const avgNativeFom = sumNFom / totalCount;
    const avgSpeedupFactor = tETime > 0 ? tNTime / tETime : 0;
    const avgEnhancedMse = sumEMse / totalCount;
    const avgNativeMse = sumNMse / totalCount;
    const avgEnhancedRmse = Math.sqrt(avgEnhancedMse);
    const avgNativeRmse = Math.sqrt(avgNativeMse);
    const maxPixel = 255.0;
    const avgEnhancedPsnr = avgEnhancedMse > 0 ? 20 * Math.log10(maxPixel / Math.sqrt(avgEnhancedMse)) : 0;
    const avgNativePsnr = avgNativeMse > 0 ? 20 * Math.log10(maxPixel / Math.sqrt(avgNativeMse)) : 0;

    return {
      totalCount,
      rawData: { count: totalCount, sumEFom, sumNFom, sumEMse, sumNMse, totalNativeTime: tNTime, totalEnhancedTime: tETime },
      psnr: { e: avgEnhancedPsnr, n: avgNativePsnr, diff: avgEnhancedPsnr - avgNativePsnr },
      mse_rmse: {
        eMse: avgEnhancedMse, nMse: avgNativeMse, mseDiff: avgEnhancedMse - avgNativeMse,
        eRmse: avgEnhancedRmse, nRmse: avgNativeRmse, rmseDiff: avgEnhancedRmse - avgNativeRmse
      },
      fom: { e: avgEnhancedFom, n: avgNativeFom, diff: avgEnhancedFom - avgNativeFom },
      speedup: { nTime: tNTime, eTime: tETime, factor: avgSpeedupFactor }
    };
  }, [outputs, importedData]);


  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <>
      {/* ── HEADER ──────────────────────────────────────────── */}
      <header>
        <div className="header-logo-row">
          <AppLogo size={48} />
        </div>
        <h1 className="sys-title">
          Water Sample Microorganism<br />
          <span className="title-accent">Detection System</span>
        </h1>
        <p className="sys-subtitle">
          Analyze microscopic water specimens using an Enhanced Canny Edge Detection algorithm.
          Compare detection accuracy against the standard Native Canny method across PSNR, MSE, RMSE, FOM, and runtime performance.
        </p>
      </header>

      {/* ── MAIN ────────────────────────────────────────────── */}
      <main>
        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="sys-input-container">
          <div
            className={`dropzone ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="sys-input-files"
              ref={fileInputRef}
              multiple
              onChange={handleFileChange}
              accept="image/*"
              className="sys-file-input"
            />
            <FaMicroscope className="microscope-svg" />
            <span className="drop-hint">
              Drag and drop microscopic specimen images here
            </span>
            <span className="drop-or">— or —</span>
            <button type="button" className="browse-files-btn" onClick={() => fileInputRef.current?.click()}>
              Browse Files
            </button>
          </div>

          <button type="submit" className="submit-files" disabled={isLoading || files.length === 0}>
            {isLoading ? (
              <><span className="spinner"></span>Analyzing Specimens…</>
            ) : (
              <>
                <FaEye /> Analyze {files.length > 0 ? `${files.length} Specimen${files.length > 1 ? 's' : ''}` : 'Specimens'}
              </>
            )}
          </button>

          {files.length > 0 && (
            <div className="files-list">
              <ul>
                {files.map((file, index) => (
                  <li key={`${file.name}-${index}`} className="file-item">
                    <div className="file-info">
                      <FaFileImage className="file-icon" />
                      <span className="file-name" title={file.name}>{file.name}</span>
                      <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
                      <button className="remove-file-btn" type="button" onClick={() => removeFile(index)} title="Remove File">
                        <FaTimes />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(importedData || files.length !== 0) && (
            <button type="button" className="clear-all-btn" onClick={() => { setFiles([]); setOutputs([]); setIsLoading(false); setImportedData(null); }}>
              Clear and Reset
            </button>
          )}
        </form>

        {/* Processing Banner */}
        {isLoading && (
          <div className="processing-banner">
            <FaSpinner className="spinner-icon spin" />
            <div className="progress-text">
              <strong>Processing...</strong> Enhanced Canny ({enhancedDone.length}/{outputs.length}) | Native Canny ({nativeDone.length}/{outputs.length})
            </div>
          </div>
        )}

        {/* ── ENHANCED CANNY RESULTS (shown FIRST) ──────────── */}
        {outputs.length > 0 && (
          <>
            <div className="output-section-title">
              Enhanced Canny Edge Detection Results
            </div>
            <div className="output-grid">
              {outputs.map((item) => (
                <div key={`enhanced-${item.id}`} className="result-card">
                  <div className="card-top">
                    <strong className="card-file-name" title={item.name}>{item.name}</strong>
                    <div className="card-actions">
                      <button
                        className="card-action-btn"
                        disabled={item.enhancedStatus !== 'done' || item.nativeStatus !== 'done'}
                        onClick={() => setExpandModal({
                          title: item.name,
                          original: item.origURL,
                          enhanced: item.enhancedURL,
                          native: item.nativeURL,
                          enhancedMetrics: item.enhancedMetrics,
                          nativeMetrics: item.nativeMetrics,
                        })}
                      >
                        <FaExpand /> Compare
                      </button>
                      <button
                        className="card-action-btn"
                        disabled={item.enhancedStatus !== 'done' || item.nativeStatus !== 'done'}
                        onClick={() => handleDownload(item.origURL, item.enhancedURL, item.nativeURL, item.name)}
                      >
                        <FaArrowDown /> Save
                      </button>
                    </div>
                  </div>
                  <div className="card-image-wrap">
                    {item.enhancedStatus === 'processing' && (
                      <div className="placeholder-status">
                        <FaSpinner className="spinner-icon spin" />
                        <span>Detecting edges…</span>
                      </div>
                    )}
                    {item.enhancedStatus === 'done' && (
                      <img
                        src={item.enhancedURL}
                        alt={`Enhanced edge detection: ${item.name}`}
                        style={{ cursor: 'zoom-in' }}
                        onClick={() => setExpandModal({
                          title: item.name,
                          original: item.origURL,
                          enhanced: item.enhancedURL,
                          native: item.nativeURL,
                          enhancedMetrics: item.enhancedMetrics,
                          nativeMetrics: item.nativeMetrics,
                        })}
                      />
                    )}
                    {item.enhancedStatus === 'error' && (
                      <div className="placeholder-status error">
                        <FaExclamationCircle className="spinner-icon" />
                        <span>Detection Failed</span>
                      </div>
                    )}
                    {item.enhancedStatus === 'done' && <span className="card-status-label done">Complete</span>}
                    {item.enhancedStatus === 'processing' && <span className="card-status-label processing">Processing</span>}
                    {item.enhancedStatus === 'error' && <span className="card-status-label error">Error</span>}
                  </div>
                  {item.enhancedMetrics && (
                    <div className="card-metrics-strip">
                      <div className="metric-cell">
                        <div className="metric-label">PSNR</div>
                        <div className="metric-value">{item.enhancedMetrics.psnr?.toFixed(2) ?? 'N/A'} dB</div>
                      </div>
                      <div className="metric-cell">
                        <div className="metric-label">FOM</div>
                        <div className="metric-value">{item.enhancedMetrics.fom?.toFixed(4) ?? 'N/A'}</div>
                      </div>
                      <div className="metric-cell">
                        <div className="metric-label">Runtime</div>
                        <div className="metric-value">{item.enhancedMetrics.execution_time ?? 'N/A'}s</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── NATIVE CANNY RESULTS (shown SECOND) ──────────── */}
        {outputs.length > 0 && (
          <>
            <div className="output-section-title">
              Native Canny Edge Detection Results
            </div>
            <div className="output-grid">
              {outputs.map((item) => (
                <div key={`native-${item.id}`} className="result-card">
                  <div className="card-top">
                    <strong className="card-file-name" title={item.name}>{item.name}</strong>
                    <div className="card-actions">
                      <button
                        className="card-action-btn"
                        disabled={item.enhancedStatus !== 'done' || item.nativeStatus !== 'done'}
                        onClick={() => setExpandModal({
                          title: item.name,
                          original: item.origURL,
                          enhanced: item.enhancedURL,
                          native: item.nativeURL,
                          enhancedMetrics: item.enhancedMetrics,
                          nativeMetrics: item.nativeMetrics,
                        })}
                      >
                        <FaExpand /> Compare
                      </button>
                      <button
                        className="card-action-btn"
                        disabled={item.enhancedStatus !== 'done' || item.nativeStatus !== 'done'}
                        onClick={() => handleDownload(item.origURL, item.enhancedURL, item.nativeURL, item.name)}
                      >
                        <FaArrowDown /> Save
                      </button>
                    </div>
                  </div>
                  <div className="card-image-wrap">
                    {(item.nativeStatus === 'processing' || item.nativeStatus === 'queued') && (
                      <div className="placeholder-status">
                        <FaSpinner className="spinner-icon spin" />
                        <span>{item.nativeStatus === 'queued' ? 'Queued — waiting for Enhanced…' : 'Detecting edges…'}</span>
                      </div>
                    )}
                    {item.nativeStatus === 'done' && (
                      <img
                        src={item.nativeURL}
                        alt={`Native edge detection: ${item.name}`}
                        style={{ cursor: 'zoom-in' }}
                        onClick={() => setExpandModal({
                          title: item.name,
                          original: item.origURL,
                          enhanced: item.enhancedURL,
                          native: item.nativeURL,
                          enhancedMetrics: item.enhancedMetrics,
                          nativeMetrics: item.nativeMetrics,
                        })}
                      />
                    )}
                    {item.nativeStatus === 'error' && (
                      <div className="placeholder-status error">
                        <FaExclamationCircle className="spinner-icon" />
                        <span>Detection Failed</span>
                      </div>
                    )}
                    {item.nativeStatus === 'done' && <span className="card-status-label done">Complete</span>}
                    {(item.nativeStatus === 'processing' || item.nativeStatus === 'queued') && <span className="card-status-label processing">{item.nativeStatus === 'queued' ? 'Queued' : 'Processing'}</span>}
                    {item.nativeStatus === 'error' && <span className="card-status-label error">Error</span>}
                  </div>
                  {item.nativeMetrics && (
                    <div className="card-metrics-strip">
                      <div className="metric-cell">
                        <div className="metric-label">PSNR</div>
                        <div className="metric-value">{item.nativeMetrics.psnr?.toFixed(2) ?? 'N/A'} dB</div>
                      </div>
                      <div className="metric-cell">
                        <div className="metric-label">FOM</div>
                        <div className="metric-value">{item.nativeMetrics.fom?.toFixed(4) ?? 'N/A'}</div>
                      </div>
                      <div className="metric-cell">
                        <div className="metric-label">Runtime</div>
                        <div className="metric-value">{item.nativeMetrics.execution_time ?? 'N/A'}s</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── METRIC BUTTONS ──────────────────────────────── */}
        <div className="view-measurments-btn">
          <div className="metric-options-btns">
            {(isAllCompleted || importedData) && averages && (
              <button className="metric-button" onClick={() => setIsModalOpen(true)}>
                <FaChartBar className="chart-symbol" />View Comparison Metrics
              </button>
            )}
            {(isAllCompleted || importedData) && averages && (
              <button className="metric-button" onClick={exportProgress} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-accent)' }}>
                <FaFileExport className="chart-symbol" />Save Global Average
              </button>
            )}
          </div>
          <button className="metric-button" onClick={() => importInputRef.current?.click()} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
            <FaFileImport className="chart-symbol" />Load Global Average
          </button>
          <input type="file" ref={importInputRef} style={{ display: 'none' }} accept=".json" onChange={importProgress} />
        </div>

        {/* ── METRICS MODAL ───────────────────────────────── */}
        {isModalOpen && (
          <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Performance & Evaluation Metrics</h3>
                <button className="modal-close-btn" type="button" onClick={() => setIsModalOpen(false)} title="Close"><FaTimes /></button>
              </div>

              <div className="modal-tabs">
                <button type="button" className={`tab-btn ${activeTable === 'psnr' ? 'active' : ''}`} onClick={() => { setActiveTable('psnr'); setShowExplainer(false); }}>PSNR</button>
                <button type="button" className={`tab-btn ${activeTable === 'mse_rmse' ? 'active' : ''}`} onClick={() => { setActiveTable('mse_rmse'); setShowExplainer(false); }}>MSE & RMSE</button>
                <button type="button" className={`tab-btn ${activeTable === 'fom' ? 'active' : ''}`} onClick={() => { setActiveTable('fom'); setShowExplainer(false); }}>Pratt's FOM</button>
                <button type="button" className={`tab-btn ${activeTable === 'speedup' ? 'active' : ''}`} onClick={() => { setActiveTable('speedup'); setShowExplainer(false); }}>Speedup</button>
                <button type="button" className={`tab-btn explainer-tab ${showExplainer ? 'active' : ''}`} onClick={() => setShowExplainer(!showExplainer)} title="What does this metric mean?">
                  <FaQuestionCircle style={{ marginRight: 4 }} /> Explain
                </button>
              </div>

              {/* Metric Explainer Panel */}
              {showExplainer && (
                <div className="metric-explainer">
                  <div className="explainer-card">
                    <h4><FaInfoCircle style={{ marginRight: 6, color: 'var(--primary)' }} />{METRIC_EXPLANATIONS[activeTable].title}</h4>
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
                      <span className="explainer-label">Why it matters for water sample analysis</span>
                      <p>{METRIC_EXPLANATIONS[activeTable].whyItMatters}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', position: 'relative', padding: 0 }}>
                <table className="modal-table" style={{ margin: 0 }}>
                  <thead>
                    {activeTable === 'psnr' && (
                      <tr><th>Sample Image</th><th>Enhanced PSNR (dB)</th><th>Native PSNR (dB)</th><th>PSNR Gain (Δ)</th></tr>
                    )}
                    {activeTable === 'mse_rmse' && (
                      <tr><th>Sample Image</th><th>Enhanced MSE</th><th>Native MSE</th><th>MSE Difference</th><th>Enhanced RMSE</th><th>Native RMSE</th><th>RMSE Difference</th></tr>
                    )}
                    {activeTable === 'fom' && (
                      <tr><th>Sample Image</th><th>Enhanced Pratt's FOM</th><th>Native Pratt's FOM</th><th>Localization Gain (Δ)</th></tr>
                    )}
                    {activeTable === 'speedup' && (
                      <tr><th>Sample Image</th><th>Native Runtime (s)</th><th>Enhanced Runtime (s)</th><th>Speedup Factor</th></tr>
                    )}
                  </thead>

                  <tbody>
                    {outputs.map((item) => {
                      const eM = item.enhancedMetrics || {};
                      const nM = item.nativeMetrics || {};

                      return (
                        <tr key={item.id}>
                          <td className="cell-filename" title={item.name}>{item.name}</td>

                          {activeTable === 'psnr' && (
                            <>
                              <td>{eM.psnr ?? 'N/A'}</td>
                              <td>{nM.psnr ?? 'N/A'}</td>
                              <td className={`highlight-gain ${eM.psnr && nM.psnr ? (eM.psnr - nM.psnr > 0 ? 'imp' : 'no-imp') : ''}`}>
                                {eM.psnr != null && nM.psnr != null ? (eM.psnr - nM.psnr).toFixed(3) : 'N/A'}
                              </td>
                            </>
                          )}

                          {activeTable === 'mse_rmse' && (
                            <>
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
                            </>
                          )}

                          {activeTable === 'fom' && (
                            <>
                              <td>{eM.fom ?? 'N/A'}</td>
                              <td>{nM.fom ?? 'N/A'}</td>
                              <td className={`highlight-gain ${nM.fom != null && eM.fom != null ? (eM.fom - nM.fom > 0 ? 'imp' : 'no-imp') : ''}`}>
                                {eM.fom != null && nM.fom != null ? (eM.fom - nM.fom).toFixed(4) : 'N/A'}
                              </td>
                            </>
                          )}

                          {activeTable === 'speedup' && (
                            <>
                              <td>{nM.execution_time ? `${nM.execution_time}s` : 'N/A'}</td>
                              <td>{eM.execution_time ? `${eM.execution_time}s` : 'N/A'}</td>
                              <td className={`highlight-speedup ${nM.execution_time && eM.execution_time ? (nM.execution_time > eM.execution_time ? 'imp' : 'no-imp') : ''}`}>
                                {nM.execution_time && eM.execution_time ? `${(nM.execution_time / eM.execution_time).toFixed(2)}x` : 'N/A'}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>

                  <tfoot>
                    <tr className="average-row">
                      <td style={{ textAlign: 'left' }}>
                        <strong>Global Dataset Average</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(N={averages ? averages.totalCount : 0} images)</div>
                      </td>

                      {activeTable === 'psnr' && averages && (
                        <>
                          <td>{averages.psnr.e.toFixed(3)}</td>
                          <td>{averages.psnr.n.toFixed(3)}</td>
                          <td className={`highlight-gain ${averages.psnr.diff > 0 ? 'imp' : 'no-imp'}`}>{averages.psnr.diff.toFixed(3)}</td>
                        </>
                      )}

                      {activeTable === 'mse_rmse' && averages && (
                        <>
                          <td>{averages.mse_rmse.eMse.toFixed(4)}</td>
                          <td>{averages.mse_rmse.nMse.toFixed(4)}</td>
                          <td className={`mse_rmse ${averages.mse_rmse.mseDiff < 0 ? 'imp' : 'no-imp'}`}>{averages.mse_rmse.mseDiff.toFixed(4)}</td>
                          <td>{averages.mse_rmse.eRmse.toFixed(4)}</td>
                          <td>{averages.mse_rmse.nRmse.toFixed(4)}</td>
                          <td className={`mse_rmse ${averages.mse_rmse.rmseDiff < 0 ? 'imp' : 'no-imp'}`}>{averages.mse_rmse.rmseDiff.toFixed(4)}</td>
                        </>
                      )}

                      {activeTable === 'fom' && averages && (
                        <>
                          <td>{averages.fom.e.toFixed(4)}</td>
                          <td>{averages.fom.n.toFixed(4)}</td>
                          <td className={`highlight-gain ${averages.fom.diff > 0 ? 'imp' : 'no-imp'}`}>{averages.fom.diff.toFixed(4)}</td>
                        </>
                      )}

                      {activeTable === 'speedup' && averages && (
                        <>
                          <td>{averages.speedup.nTime.toFixed(2)}s (Total)</td>
                          <td>{averages.speedup.eTime.toFixed(2)}s (Total)</td>
                          <td className={`highlight-speedup ${averages.speedup.factor > 1 ? 'imp' : 'no-imp'}`}>{averages.speedup.factor.toFixed(2)}x</td>
                        </>
                      )}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── COMPARISON EXPAND MODAL ─────────────────────── */}
        {expandModal && (
          <div className="modal-overlay" onClick={() => setExpandModal(null)} style={{ zIndex: 2000 }}>
            <div
              className="modal-container"
              onClick={(e) => e.stopPropagation()}
              style={{ width: '95%', maxWidth: '1600px' }}
            >
              <div className="modal-header">
                <h3>Specimen Comparison: {expandModal.title}</h3>
                <button className="modal-close-btn" type="button" onClick={() => setExpandModal(null)} title="Close"><FaTimes /></button>
              </div>
              <div className="modal-body" style={{ padding: '1rem' }}>
                <ComparisonViewer
                  originalURL={expandModal.original}
                  enhancedURL={expandModal.enhanced}
                  nativeURL={expandModal.native}
                  fileName={expandModal.title}
                />
                {/* Inline metrics comparison below the viewer */}
                {expandModal.enhancedMetrics && expandModal.nativeMetrics && (
                  <div style={{ marginTop: '1rem' }}>
                    <table className="modal-table" style={{ fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th>Algorithm</th>
                          <th>PSNR (dB)</th>
                          <th>MSE</th>
                          <th>RMSE</th>
                          <th>Pratt's FOM</th>
                          <th>Runtime (s)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ textAlign: 'left', fontWeight: 600, color: 'var(--accent-light)' }}>Enhanced Canny</td>
                          <td>{expandModal.enhancedMetrics.psnr?.toFixed(3) ?? 'N/A'}</td>
                          <td>{expandModal.enhancedMetrics.mse_rmse?.[0]?.toFixed(4) ?? 'N/A'}</td>
                          <td>{expandModal.enhancedMetrics.mse_rmse?.[1]?.toFixed(4) ?? 'N/A'}</td>
                          <td>{expandModal.enhancedMetrics.fom?.toFixed(4) ?? 'N/A'}</td>
                          <td>{expandModal.enhancedMetrics.execution_time ?? 'N/A'}</td>
                        </tr>
                        <tr>
                          <td style={{ textAlign: 'left', fontWeight: 600, color: '#fb923c' }}>Native Canny</td>
                          <td>{expandModal.nativeMetrics.psnr?.toFixed(3) ?? 'N/A'}</td>
                          <td>{expandModal.nativeMetrics.mse_rmse?.[0]?.toFixed(4) ?? 'N/A'}</td>
                          <td>{expandModal.nativeMetrics.mse_rmse?.[1]?.toFixed(4) ?? 'N/A'}</td>
                          <td>{expandModal.nativeMetrics.fom?.toFixed(4) ?? 'N/A'}</td>
                          <td>{expandModal.nativeMetrics.execution_time ?? 'N/A'}</td>
                        </tr>
                        <tr style={{ fontWeight: 700 }}>
                          <td style={{ textAlign: 'left' }}>Δ Difference</td>
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
      </main>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer>
        <p className="footer-subtitle">
          Developed by Albrecht Zildjian A. Arcangel and Christian Andrei V. Santiago<br />
          from Pamantasan ng Lungsod ng Maynila
        </p>
      </footer>
    </>
  );
}

export default App