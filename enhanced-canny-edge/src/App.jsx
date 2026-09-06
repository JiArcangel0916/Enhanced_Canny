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
      processedURL: null,
      status: 'processing',
      fileRef: file
    }));

    setOutputs(initialOutputs);
    console.log(outputs)
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
            { ...o, status: 'done', processedUrl: data.processed_image } :
            o
        ));
      }
      catch (err) {
        setOutputs((prev) => prev.map((o) => (o.id === item.id ? { ...o, status: 'error' } : o)))
      }
      setIsLoading(false);
    }
  };

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
                <button className="download-output" type='button'><FontAwesomeIcon icon={faArrowDown} />Download</button>
              </div>

              <div className="comparison-grid">
                {/* Left Input Image*/}
                <div className="sample-panel">
                  <div className="square-placeholder original-box">
                    <img className="sample-image" src={item.origURL} alt={`Input image: (${item.name})`} />
                  </div>
                  <div className="panel-badge">Original Image</div>
                </div>

                {/* Right Output Image*/}
                <div className="sample-panel">
                  <div className="square-placeholder image-display-box processed-box">
                    {item.status === 'processing' && (
                      <div className="placeholder-status">
                        <FontAwesomeIcon icon={faSpinner} spin className="spinner-icon" />
                        <span>Computing edge gradients...</span>
                      </div>
                    )}

                    {item.status === 'done' && (
                      <img
                        src={item.processedUrl}
                        alt={`Canny output for ${item.name}`}
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