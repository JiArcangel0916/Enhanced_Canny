import { useState, useRef, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicroscope, faFileImage, faX, faSpinner, faArrowDown, faCircleExclamation, faChartSimple } from '@fortawesome/free-solid-svg-icons'
import './App.css'

function App() {
  const [files, setFiles] = useState([]);
  const [outputs, setOutputs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTable, setActiveTable] = useState('psnr');
  const fileInputRef = useRef(null);

  const handleFiles = (inputFiles) => {
    const valid = Array.from(inputFiles).filter((file) => file.type.startsWith('image'));
    setFiles(() => {
      if (valid.length > 10) {
        alert(`You can only upload a maxmimum of 10 images`);
        return valid.slice(0, 10);
      }
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
        img.crossOrigin = "anonymous";
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
            <FontAwesomeIcon icon={faMicroscope} className='microscope-svg' />
            <span className="drop-hint">Drag and drop microscopic images <br /> of water samples here</span>
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
              <ul>
                {files.map((file, index) => (
                  <li key={`${file.name}-${index}`} className='file-item'>
                    <div className="file-info">
                      <FontAwesomeIcon icon={faFileImage} className='file-icon' />
                      <span className="file-name" title={file.name}>{file.name}</span>
                      <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
                      <button className="remove-file-btn" type='button' onClick={() => { removeFile(index) }} title='Remove File'>
                        <FontAwesomeIcon icon={faX} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <button type='button' className='clear-all-btn' onClick={() => { setFiles([]); setOutputs([]) }}>Clear and Reset</button>
            </div>
          )}
        </form>

        {/* OUTPUT SECTION */}
        <div className="output-grid">
          {outputs.map((item) => (
            <div key={item.id} className='result-card'>
              <div className="card-top">
                <strong className="card-file-name" title={item.name}>{item.name}</strong>
                <button className="download-output" type='button' disabled={item.nativeStatus !== 'done' || item.enhancedStatus !== 'done'} onClick={() => handleDownload(item.origURL, item.enhancedURL, item.nativeURL, item.name)}><FontAwesomeIcon icon={faArrowDown} />Download</button>
              </div>

              <div className="comparison-grid">
                {/* Left: Input Image */}
                <div className="sample-panel">
                  <div className="square-placeholder">
                    <img className="sample-image" src={item.origURL} alt={`Input: ${item.name}`} />
                  </div>
                  <div className="panel-badge">Original Image</div>
                </div>

                {/* Middle: Enhanced Canny */}
                <div className="sample-panel">
                  <div className="square-placeholder">
                    {item.enhancedStatus === 'processing' && (
                      <div className="placeholder-status">
                        <FontAwesomeIcon icon={faSpinner} spin className="spinner-icon" />
                        <span>Processing Enhanced...</span>
                      </div>
                    )}

                    {item.enhancedStatus === 'done' && (
                      <img
                        src={item.enhancedURL}
                        alt={`Enhanced Canny output for ${item.name}`}
                        className="sample-image"
                      />
                    )}

                    {item.enhancedStatus === 'error' && (
                      <div className="placeholder-status error">
                        <FontAwesomeIcon icon={faCircleExclamation} />
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
                        <FontAwesomeIcon icon={faSpinner} spin className="spinner-icon" />
                        <span>Processing Native...</span>
                      </div>
                    )}

                    {item.nativeStatus === 'done' && (
                      <img
                        src={item.nativeURL}
                        alt={`Native Canny output for ${item.name}`}
                        className="sample-image"
                      />
                    )}

                    {item.nativeStatus === 'error' && (
                      <div className="placeholder-status error">
                        <FontAwesomeIcon icon={faCircleExclamation} />
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
        {isAllCompleted && (
          <button className='metric-button' onClick={() => { setIsModalOpen(true) }}><FontAwesomeIcon icon={faChartSimple} className="chart-symbol" />View Comparison Metrics</button>
        )}

        {isModalOpen && (
          <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>

              <div className="modal-header">
                <h3>Performance & Evaluation Metrics</h3>
                <button className="modal-close-btn" type="button" onClick={() => setIsModalOpen(false)} title="Close Modal"><FontAwesomeIcon icon={faX} /></button>
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
              <div className="modal-body">
                <table className="modal-table">
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
                      <td style={{textAlign: 'left'}}>Average</td>

                      {/* PSNR AVERAGE */}
                      {activeTable === 'psnr' && (
                        <>
                          <td>psnr placeholder</td>
                          <td>psnr placeholder</td>
                          <td>psnr placeholder</td>
                        </>
                      )}

                      {/* MSE RMSE AVERAGE */}
                      {activeTable === 'mse_rmse' && (
                        <>
                          <td>mse_rmse palceholder</td>
                          <td>mse_rmse palceholder</td>
                          <td>mse_rmse palceholder</td>
                          <td>mse_rmse palceholder</td>
                          <td>mse_rmse palceholder</td>
                          <td>mse_rmse palceholder</td>
                        </>
                      )}

                      {/* FOM AVERAGE */}
                      {activeTable === 'fom' && (
                        <>
                          <td>fom placeholder</td>
                          <td>fom placeholder</td>
                          <td>fom placeholder</td>
                        </>
                      )}

                      {/* SPEEDUP AVERAGE */}
                      {activeTable === 'speedup' && (
                        <>
                          <td>speedup placeholder</td>
                          <td>speedup placeholder</td>
                          <td>speedup placeholder</td>
                        </>
                      )}
                    </tr>
                  </tfoot>
                </table>
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