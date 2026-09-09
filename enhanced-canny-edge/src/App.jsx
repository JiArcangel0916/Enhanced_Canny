import { useState, useRef, useMemo } from 'react'
import { FaMicroscope, FaFileImage, FaTimes, FaSpinner, FaArrowDown, FaExclamationCircle, FaChartBar, FaExpand, FaFileExport, FaFileImport } from 'react-icons/fa';

import './App.css'

function App() {
  const [files, setFiles] = useState([]);
  const [outputs, setOutputs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandModal, setExpandModal] = useState(null);
  const [importedData, setImportedData] = useState(null);
  const [activeTable, setActiveTable] = useState('psnr');
  const fileInputRef = useRef(null);
  const importInputRef = useRef(null);

  const handleFiles = (inputFiles) => {
    const valid = Array.from(inputFiles).filter((file) => file.type.startsWith('image'));
    setFiles(() => {
      return valid;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    };
  };

  const handleFileChange = (e) => {
    if (e.target.files) handleFiles(e.target.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== index));
  }

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
      nativeStatus: 'processing',
      fileRef: file,
    }));

    setOutputs(initialOutputs);

    for (let i = 0; i < initialOutputs.length; i++) {
      const item = initialOutputs[i];

      const formDataEnhanced = new FormData();
      formDataEnhanced.append('image', item.fileRef);

      const formDataNative = new FormData();
      formDataNative.append('image', item.fileRef);

      const enhancedPromise = fetch('http://localhost:5000/api/detect-edges/enhanced', {
        method: 'POST',
        body: formDataEnhanced,
      })
        .then(async (res) => {
          if (!res.ok) {
            throw new Error('Enhanced processing failed');
          }
          const data = await res.json();
          setOutputs((prev) =>
            prev.map((o) =>
              o.id === item.id
                ? { ...o, enhancedURL: data.image, enhancedMetrics: data.metrics, enhancedStatus: 'done' }
                : o
            )
          );
        })
        .catch((err) => {
          console.error('Enhanced error:', err);
          setOutputs((prev) =>
            prev.map((o) =>
              o.id === item.id ? { ...o, enhancedStatus: 'error' } : o
            )
          );
        });

      const nativePromise = fetch('http://localhost:5000/api/detect-edges/native', {
        method: 'POST',
        body: formDataNative,
      })
        .then(async (res) => {
          if (!res.ok) throw new Error('Native processing failed');
          const data = await res.json();
          setOutputs((prev) =>
            prev.map((o) =>
              o.id === item.id
                ? { ...o, nativeURL: data.image, nativeMetrics: data.metrics, nativeStatus: 'done' }
                : o
            )
          );
        })
        .catch((err) => {
          console.error('Native error:', err);
          setOutputs((prev) =>
            prev.map((o) =>
              o.id === item.id ? { ...o, nativeStatus: 'error' } : o
            )
          );
        });

      await Promise.all([enhancedPromise, nativePromise]);
    }

    setIsLoading(false);
  };

  const handleDownload = async (origSrc, enhancedSrc, nativeSrc, fileName) => {
    if (!origSrc || !enhancedSrc || !nativeSrc) return;

    const loadImg = (src) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
        img.src = src;
      });
    };

    try {
      const [origImg, enhancedImg, nativeImg] = await Promise.all([loadImg(origSrc), loadImg(enhancedSrc), loadImg(nativeSrc)]);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const targetHeight = Math.max(origImg.naturalHeight, enhancedImg.naturalHeight, nativeImg.naturalHeight);
      const origWidth = (origImg.naturalWidth / origImg.naturalHeight) * targetHeight;
      const enhancedWidth = (enhancedImg.naturalWidth / enhancedImg.naturalHeight) * targetHeight;
      const nativeWidth = (nativeImg.naturalWidth / nativeImg.naturalHeight) * targetHeight;

      const padding = 30;
      const gap = 30;
      const headerHeight = 70;

      const x1 = padding;
      const x2 = x1 + origWidth + gap;
      const x3 = x2 + enhancedWidth + gap;

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

      const combineDataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = combineDataUrl;
      link.download = `comparison_${fileName.replace(/\.[^/.]+$/, '')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    catch (err) {
      console.error(`Error: ${err}`);
      alert("Failed to download comparison grid");
    }
  }

  const isAllCompleted = outputs.length > 0 && outputs.every((item) => item.enhancedStatus === 'done' && item.nativeStatus === 'done');

  // Export/Import Global Averages
  const exportProgress = () => {
    if (!averages) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(averages.rawData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "global_dataset_average.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
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
        } else {
          alert("Invalid file format");
        }
      } catch (err) {
        alert("Invalid file format");
      }
    };
    reader.readAsText(file);
    if (importInputRef.current) importInputRef.current.value = '';
  };

  // Calculate Dataset Averages
  const averages = useMemo(() => {
    let validOutputs = outputs.filter(o => o.enhancedMetrics && o.nativeMetrics);

    // Base accumulated sums
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

    // Calculate final averages
    const avgEnhancedFom = sumEFom / totalCount;
    const avgNativeFom = sumNFom / totalCount;
    const avgSpeedupFactor = tETime > 0 ? tNTime / tETime : 0;
    const avgEnhancedMse = sumEMse / totalCount;
    const avgNativeMse = sumNMse / totalCount;
    const avgEnhancedRmse = Math.sqrt(avgEnhancedMse);
    const avgNativeRmse = Math.sqrt(avgNativeMse);

    // 4. PSNR (Calculate using the Average MSE)
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

  return (
    <>
      {/* HEADER SECTION */}
      <header>
        <h1 className='sys-title'>Water Sample Microorganism <br /> Detection System</h1>
        <p className='sys-subtitle'>A microorganism detection system that utilizes an Enhanced Canny Edge Detection Algorithm to detect microorganisms from microscopic water samples.</p>
      </header>

      {/* MAIN SECTION */}
      <main>
        {/* INPUT SECTION */}
        <form onSubmit={handleSubmit} className="sys-input-container">
          <div className={`dropzone ${isDragging ? 'dragging' : ''}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
            <input
              type="file"
              id="sys-input-files"
              ref={fileInputRef}
              multiple
              onChange={handleFileChange}
              accept="image/*"
              className="sys-file-input"
            />
            <FaMicroscope className='microscope-svg' />
            <span className="drop-hint">Drag and drop microscopic images <br /> of water samples here</span>
            <span className="drop-or" style={{ margin: '10px 0', color: 'var(--text-muted, #8399b7)', fontSize: '0.9rem' }}>— or —</span>
            <button type="button" className="browse-files-btn" onClick={() => fileInputRef.current?.click()} style={{ padding: '8px 16px', backgroundColor: 'var(--primary, #015b87)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', transition: '0.2s', marginTop: '5px' }}>Browse Files</button>
          </div>

          <button type="submit" className="submit-files" disabled={isLoading || files.length === 0}>
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Processing...
              </>
            ) : (
              'Submit Files'
            )}
          </button>
          {files.length > 0 && (
            <div className="files-list">
              <ul style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '5px' }}>
                {files.map((file, index) => (
                  <li key={`${file.name}-${index}`} className='file-item'>
                    <div className="file-info">
                      <FaFileImage className='file-icon' />
                      <span className="file-name" title={file.name}>{file.name}</span>
                      <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
                      <button className="remove-file-btn" type='button' onClick={() => { removeFile(index) }} title='Remove File'>
                        <FaTimes />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {( importedData || files.length !== 0 ) && (
            <button type='button' className='clear-all-btn' onClick={() => { setFiles([]); setOutputs([]); setIsLoading(false); setImportedData(null); }}>Clear and Reset</button>
          )}
        </form>

        {/* OUTPUT SECTION */}
        <div className="output-grid">
          {outputs.map((item) => (
            <div key={item.id} className='result-card'>
              <div className="card-top">
                <strong className="card-file-name" title={item.name}>{item.name}</strong>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button className="download-output" type="button" disabled={item.nativeStatus !== 'done' || item.enhancedStatus !== 'done'} onClick={() => setExpandModal({ type: 'compare', title: item.name, original: item.origURL, enhanced: item.enhancedURL, native: item.nativeURL })} style={{ width: 'auto', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaExpand />Expand
                  </button>
                  <button className="download-output" type='button' disabled={item.nativeStatus !== 'done' || item.enhancedStatus !== 'done'} onClick={() => handleDownload(item.origURL, item.enhancedURL, item.nativeURL, item.name)} style={{ width: 'auto', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaArrowDown />Download
                  </button>
                </div>
              </div>

              <div className="comparison-grid">
                {/* Left: Input Image */}
                <div className="sample-panel">
                  <div className="square-placeholder">
                    <img
                      className="sample-image"
                      src={item.origURL}
                      alt={`Input: ${item.name}`}
                      title="Click to expand"
                      style={{ cursor: 'zoom-in' }}
                      onClick={() => setExpandModal({ type: 'single', title: `Input Image: ${item.name}`, url: item.origURL })}
                    />
                  </div>
                  <div className="panel-badge">Original Image</div>
                </div>

                {/* Middle: Enhanced Canny */}
                <div className="sample-panel">
                  <div className="square-placeholder">
                    {item.enhancedStatus === 'processing' && (
                      <div className="placeholder-status">
                        <FaSpinner className="spinner-icon spin" />
                        <span>Processing Enhanced...</span>
                      </div>
                    )}

                    {item.enhancedStatus === 'done' && (
                      <img
                        src={item.enhancedURL}
                        alt={`Enhanced Canny output for ${item.name}`}
                        className="sample-image"
                        title="Click to expand"
                        style={{ cursor: 'zoom-in' }}
                        onClick={() => setExpandModal({ type: 'single', title: `Enhanced Canny Edge: ${item.name}`, url: item.enhancedURL })}
                      />
                    )}

                    {item.enhancedStatus === 'error' && (
                      <div className="placeholder-status error">
                        <FaExclamationCircle />
                        <span>Detection Failed</span>
                      </div>
                    )}
                  </div>
                  <div className="panel-badge highlight">Enhanced Canny Edge Output</div>
                </div>

                {/* Right: Native Canny */}
                <div className="sample-panel">
                  <div className="square-placeholder">
                    {item.nativeStatus === 'processing' && (
                      <div className="placeholder-status">
                        <FaSpinner className="spinner-icon spin" />
                        <span>Processing Native...</span>
                      </div>
                    )}

                    {item.nativeStatus === 'done' && (
                      <img
                        src={item.nativeURL}
                        alt={`Native Canny output for ${item.name}`}
                        className="sample-image"
                        title="Click to expand"
                        style={{ cursor: 'zoom-in' }}
                        onClick={() => setExpandModal({ type: 'single', title: `Native Canny Edge: ${item.name}`, url: item.nativeURL })}
                      />
                    )}

                    {item.nativeStatus === 'error' && (
                      <div className="placeholder-status error">
                        <FaExclamationCircle />
                        <span>Detection Failed</span>
                      </div>
                    )}
                  </div>
                  <div className="panel-badge highlight">Native Canny Edge Output</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* BUTTONS FOR VIEWING MEASUREMENTS */}
        <div className="view-measurments-btn">
          <div className="metric-options-btns">
            {(isAllCompleted || importedData) && averages && (
              <button className='metric-button' onClick={() => { setIsModalOpen(true) }}>
                <FaChartBar className="chart-symbol" />View Comparison Metrics
              </button>
            )}

            {(isAllCompleted || importedData) && averages && (
              <button className='metric-button' onClick={exportProgress} style={{ backgroundColor: 'var(--primary)', border: '1px solid #000' }}>
                <FaFileExport className="chart-symbol" />Save Global Average
              </button>
            )}
          </div>
          <button className='metric-button' onClick={() => importInputRef.current?.click()} style={{ backgroundColor: 'var(--card-bg)', border: '1px solid #444', color: '#fff' }}>
            <FaFileImport className="chart-symbol" />Load Global Average
          </button>
          <input type="file" ref={importInputRef} style={{ display: 'none' }} accept=".json" onChange={importProgress} />
        </div>

        {isModalOpen && (
          <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>

              <div className="modal-header">
                <h3>Performance & Evaluation Metrics</h3>
                <button className="modal-close-btn" type="button" onClick={() => setIsModalOpen(false)} title="Close Modal"><FaTimes /></button>
              </div>

              {/* TAB NAVIGATION BAR */}
              <div className="modal-tabs">
                <button
                  type="button"
                  className={`tab-btn ${activeTable === 'psnr' ? 'active' : ''}`}
                  onClick={() => setActiveTable('psnr')}
                >
                  PSNR
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeTable === 'mse_rmse' ? 'active' : ''}`}
                  onClick={() => setActiveTable('mse_rmse')}
                >
                  MSE & RMSE
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeTable === 'fom' ? 'active' : ''}`}
                  onClick={() => setActiveTable('fom')}
                >
                  Pratt's FOM
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeTable === 'speedup' ? 'active' : ''}`}
                  onClick={() => setActiveTable('speedup')}
                >
                  Speedup
                </button>
              </div>

              {/* MODAL BODY */}
              <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', position: 'relative', padding: 0 }}>
                <style>{`
                  .modal-table thead th { position: sticky; top: 0; z-index: 10; background-color: var(--card-bg, #051B33); box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
                  .modal-table tfoot td { position: sticky; bottom: 0; z-index: 10; background-color: var(--card-bg, #051B33); box-shadow: 0 -2px 5px rgba(0,0,0,0.2); }
                `}</style>
                <table className="modal-table" style={{ margin: 0 }}>
                  <thead>
                    {activeTable === 'psnr' && (
                      <tr>
                        <th>Sample Image</th>
                        <th>Enhanced PSNR (dB)</th>
                        <th>Native PSNR (dB)</th>
                        <th>PSNR Gain (Δ)</th>
                      </tr>
                    )}

                    {activeTable === 'mse_rmse' && (
                      <tr>
                        <th>Sample Image</th>
                        <th>Enhanced MSE</th>
                        <th>Native MSE</th>
                        <th>MSE Difference</th>
                        <th>Enhanced RMSE</th>
                        <th>Native RMSE</th>
                        <th>RMSE Difference</th>
                      </tr>
                    )}

                    {activeTable === 'fom' && (
                      <tr>
                        <th>Sample Image</th>
                        <th>Enhanced Pratt's FOM</th>
                        <th>Native Pratt's FOM</th>
                        <th>Localization Gain (Δ)</th>
                      </tr>
                    )}

                    {activeTable === 'speedup' && (
                      <tr>
                        <th>Sample Image</th>
                        <th>Native Runtime (s)</th>
                        <th>Enhanced Runtime (s)</th>
                        <th>Speedup Factor</th>
                      </tr>
                    )}
                  </thead>

                  <tbody>
                    {outputs.map((item) => {
                      const eM = item.enhancedMetrics || {};
                      const nM = item.nativeMetrics || {};

                      return (
                        <tr key={item.id}>
                          <td className="cell-filename" title={item.name}>
                            {item.name}
                          </td>

                          {/* PSNR TAB */}
                          {activeTable === 'psnr' && (
                            <>
                              <td>{eM.psnr ?? 'N/A'}</td>
                              <td>{nM.psnr ?? 'N/A'}</td>
                              <td className={`highlight-gain ${eM.psnr && nM.psnr
                                ? (eM.psnr - nM.psnr > 0 ? 'imp' : 'no-imp')
                                : ''
                                }`}>
                                {eM.psnr != null && nM.psnr != null
                                  ? (eM.psnr - nM.psnr).toFixed(3)
                                  : 'N/A'}
                              </td>
                            </>
                          )}

                          {/* MSE & RMSE TAB */}
                          {activeTable === 'mse_rmse' && (
                            <>
                              <td>{eM.mse_rmse[0] ?? 'N/A'}</td>
                              <td>{nM.mse_rmse[0] ?? 'N/A'}</td>
                              <td className={`mse_rmse ${eM.mse_rmse[0] && eM.mse_rmse[0]
                                ? (eM.mse_rmse[0] - nM.mse_rmse[0] < 0 ? 'imp' : 'no-imp')
                                : ''
                                }`}>{(eM.mse_rmse[0] - nM.mse_rmse[0]).toFixed(4) ?? 'N/A'}</td>
                              <td>{eM.mse_rmse[1] ?? 'N/A'}</td>
                              <td>{nM.mse_rmse[1] ?? 'N/A'}</td>
                              <td className={`mse_rmse ${eM.mse_rmse[1] && nM.mse_rmse[1]
                                ? (eM.mse_rmse[1] - nM.mse_rmse[1] < 0 ? 'imp' : 'no-imp')
                                : ''
                                }`}>{(eM.mse_rmse[1] - nM.mse_rmse[1]).toFixed(4) ?? 'N/A'}</td>
                            </>
                          )}

                          {/* PRATT'S FOM TAB */}
                          {activeTable === 'fom' && (
                            <>
                              <td>{eM.fom ?? 'N/A'}</td>
                              <td>{nM.fom ?? 'N/A'}</td>
                              <td className={`highlight-gain ${nM.fom && eM.fom
                                ? (eM.fom - nM.fom > 0 ? 'imp' : 'no-imp')
                                : ''
                                }`}>
                                {eM.fom != null && nM.fom != null
                                  ? (eM.fom - nM.fom).toFixed(4)
                                  : 'N/A'}
                              </td>
                            </>
                          )}

                          {/* SPEEDUP TAB */}
                          {activeTable === 'speedup' && (
                            <>
                              <td>{nM.execution_time ? `${nM.execution_time}s` : 'N/A'}</td>
                              <td>{eM.execution_time ? `${eM.execution_time}s` : 'N/A'}</td>
                              <td className={`highlight-speedup ${nM.execution_time && eM.execution_time
                                ? (nM.execution_time > eM.execution_time ? 'imp' : 'no-imp')
                                : ''
                                }`}>
                                {nM.execution_time && eM.execution_time
                                  ? `${(nM.execution_time / eM.execution_time).toFixed(2)}x`
                                  : 'N/A'}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className='average-row'>
                      <td style={{ textAlign: 'left' }}>
                        <strong>Global Dataset Average</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>(N={averages ? averages.totalCount : 0} images)</div>
                      </td>

                      {/* PSNR AVERAGE */}
                      {activeTable === 'psnr' && averages && (
                        <>
                          <td>{averages.psnr.e.toFixed(3)}</td>
                          <td>{averages.psnr.n.toFixed(3)}</td>
                          <td className={`highlight-gain ${averages.psnr.diff > 0 ? 'imp' : 'no-imp'}`}>
                            {averages.psnr.diff.toFixed(3)}
                          </td>
                        </>
                      )}

                      {/* MSE RMSE AVERAGE */}
                      {activeTable === 'mse_rmse' && averages && (
                        <>
                          <td>{averages.mse_rmse.eMse.toFixed(4)}</td>
                          <td>{averages.mse_rmse.nMse.toFixed(4)}</td>
                          <td className={`mse_rmse ${averages.mse_rmse.mseDiff < 0 ? 'imp' : 'no-imp'}`}>
                            {averages.mse_rmse.mseDiff.toFixed(4)}
                          </td>
                          <td>{averages.mse_rmse.eRmse.toFixed(4)}</td>
                          <td>{averages.mse_rmse.nRmse.toFixed(4)}</td>
                          <td className={`mse_rmse ${averages.mse_rmse.rmseDiff < 0 ? 'imp' : 'no-imp'}`}>
                            {averages.mse_rmse.rmseDiff.toFixed(4)}
                          </td>
                        </>
                      )}

                      {/* FOM AVERAGE */}
                      {activeTable === 'fom' && averages && (
                        <>
                          <td>{averages.fom.e.toFixed(4)}</td>
                          <td>{averages.fom.n.toFixed(4)}</td>
                          <td className={`highlight-gain ${averages.fom.diff > 0 ? 'imp' : 'no-imp'}`}>
                            {averages.fom.diff.toFixed(4)}
                          </td>
                        </>
                      )}

                      {/* SPEEDUP AVERAGE */}
                      {activeTable === 'speedup' && averages && (
                        <>
                          <td>{averages.speedup.nTime.toFixed(2)}s (Total)</td>
                          <td>{averages.speedup.eTime.toFixed(2)}s (Total)</td>
                          <td className={`highlight-speedup ${averages.speedup.factor > 1 ? 'imp' : 'no-imp'}`}>
                            {averages.speedup.factor.toFixed(2)}x
                          </td>
                        </>
                      )}
                    </tr>
                  </tfoot>
                </table>
              </div>

            </div>
          </div>
        )}

        {/* IMAGE EXPAND MODAL */}
        {expandModal && (
          <div className="modal-overlay" onClick={() => setExpandModal(null)} style={{ zIndex: 2000 }}>
            <div
              className="modal-container"
              onClick={(e) => e.stopPropagation()}
              style={{ width: expandModal.type === 'compare' ? '95%' : 'auto', maxWidth: '1600px', padding: '30px' }}
            >
              <div className="modal-header">
                <h3>{expandModal.title}</h3>
                <button className="modal-close-btn" type="button" onClick={() => setExpandModal(null)} title="Close Modal">
                  <FaTimes />
                </button>
              </div>
              <div className="modal-body" style={{ display: 'flex', justifyContent: 'center', gap: '20px', alignItems: 'center' }}>
                {expandModal.type === 'single' && (
                  <img
                    src={expandModal.url}
                    alt={expandModal.title}
                    style={{ maxHeight: '75vh', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px' }}
                  />
                )}
                {expandModal.type === 'compare' && (
                  <>
                    <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                      <h4 style={{ marginBottom: '10px' }}>Input Image</h4>
                      <img src={expandModal.original} alt="Input" style={{ maxHeight: '70vh', width: '100%', objectFit: 'contain', borderRadius: '8px', border: '1px solid #444' }} />
                    </div>
                    <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                      <h4 style={{ marginBottom: '10px', color: '#646cff' }}>Enhanced Canny Edge</h4>
                      <img src={expandModal.enhanced} alt="Enhanced" style={{ maxHeight: '70vh', width: '100%', objectFit: 'contain', borderRadius: '8px', border: '1px solid #444' }} />
                    </div>
                    <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                      <h4 style={{ marginBottom: '10px', color: '#ff6b6b' }}>Native Canny Edge</h4>
                      <img src={expandModal.native} alt="Native" style={{ maxHeight: '70vh', width: '100%', objectFit: 'contain', borderRadius: '8px', border: '1px solid #444' }} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER SECTION */}
      <footer>
        <p className="footer-subtitle">Developed by Albrecht Zildjian A. Arcangel and Christian Andrei V. Santiago <br />from Pamantasan ng Lungsod ng Maynila</p>
      </footer>
    </>
  )
}

export default App