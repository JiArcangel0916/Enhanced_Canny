import { useState } from 'react'
import './App.css'

function App() {
  const [files, setFiles] = useState([]);
  const [output, setOutput] = useState(null)
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = () => {
    alert("File submitted");
    return;
  }

  const handleFileChange = () => {
    return;
  }

  return (
    <>
      <header>
        <h1 className='sys-title'>Water Sample Microorganism <br /> Detection System</h1>
        <p className='sys-subtitle'>A microorganism detection system that utilizes an Enhanced Canny Edge Detection Algorithm to detect microorganisms from microscopic water samples.</p>
      </header>

      <main>
        <form action={handleSubmit} className="sys-input">
          <p className="input-instruction">Input microscopic images of any water sample</p>
          <input
            type="file"
            id='sys-input-files'
            multiple
            onChange={handleFileChange}
            accept='image/*'
          />

          <button type="submit" className="submit-files" disabled={isLoading}>
            {
              isLoading ? (
                <>
                  <span className='spinner'></span>
                  Detecting...
                </>)
                :
                'Submit Files'
            }
          </button>
        </form>
      </main>

      <footer>
        <p className="footer-subtitle">Developed by Albrecht Zildjian A. Arcangel and Christian Andrei V. Santiago <br />from Pamantasan ng Lungsod ng Maynila</p>
      </footer>
    </>
  )
}

export default App