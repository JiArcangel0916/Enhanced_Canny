import { useState, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicroscope, faFileImage, faX, faSpinner, faArrowDown, faCircleExclamation } from '@fortawesome/free-solid-svg-icons'
import './App.css'

function App() {
  const [files, setFiles] = useState([]);
  const [outputs, setOutputs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
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
      status: 'processing',
      fileRef: file
    }));

    setOutputs(initialOutputs);
    for (let i = 0; i < initialOutputs.length; i++) {
      const item = initialOutputs[i];
      const formData = new FormData();
      formData.append('image', item.fileRef);

      try {
        const response = await fetch('http://localhost:5000/api/detect-edges', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Processing Failed');
        const data = await response.json();

        setOutputs((prev) => prev.map((o) =>
          o.id === item.id ?
            { ...o, status: 'done', enhancedURL: data.enhanced_processed_image, nativeURL: data.native_processed_image } :
            o
        ));
      }
      catch (err) {
        console.error(err)
        setOutputs((prev) => prev.map((o) => (o.id === item.id ? { ...o, status: 'error' } : o)))
      }
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
                <button className="download-output" type='button' disabled={item.status !== 'done'} onClick={() => handleDownload(item.origURL, item.enhancedURL, item.nativeURL, item.name)}><FontAwesomeIcon icon={faArrowDown} />Download</button>
              </div>

              <div className="comparison-grid">
                {/* Left Input Image*/}
                <div className="sample-panel">
                  <div className="square-placeholder">
                    <img className="sample-image" src={item.origURL} alt={`Input image: (${item.name})`} />
                  </div>
                  <div className="panel-badge">Original Image</div>
                </div>

                {/* Middle Enhanced Canny Output Image */}
                <div className="sample-panel">
                  <div className="square-placeholder">
                    {item.status === 'processing' && (
                      <div className="placeholder-status">
                        <FontAwesomeIcon icon={faSpinner} spin className="spinner-icon" />
                        <span>Processing Image</span>
                      </div>
                    )}

                    {item.status === 'done' && (
                      <img
                        src={item.enhancedURL}
                        alt={`Enhanced Canny output for ${item.name}`}
                        className="sample-image"
                      />
                    )}

                    {item.status === 'error' && (
                      <div className="placeholder-status error">
                        <FontAwesomeIcon icon={faCircleExclamation} />
                        <span>Detection Failed</span>
                      </div>
                    )}
                  </div>
                  <div className="panel-badge highlight">Enhanced Canny Edge Output</div>
                </div>

                {/* Right Native Canny Output Image*/}
                <div className="sample-panel">
                  <div className="square-placeholder">
                    {item.status === 'processing' && (
                      <div className="placeholder-status">
                        <FontAwesomeIcon icon={faSpinner} spin className="spinner-icon" />
                        <span>Processing Image</span>
                      </div>
                    )}

                    {item.status === 'done' && (
                      <img
                        src={item.nativeURL}
                        alt={`Native Canny output for ${item.name}`}
                        className="sample-image"
                      />
                    )}

                    {item.status === 'error' && (
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
      </main>

      {/* FOOTER SECTION */}
      <footer>
        <p className="footer-subtitle">Developed by Albrecht Zildjian A. Arcangel and Christian Andrei V. Santiago <br />from Pamantasan ng Lungsod ng Maynila</p>
      </footer>
    </>
  )
}

export default App