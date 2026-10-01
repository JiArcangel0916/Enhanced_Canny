# Enhanced Canny Edge Detection System

This project is a full-stack web application that implements and compares Native Canny Edge Detection and an Enhanced Canny Edge Detection algorithm. It provides an interactive UI to upload images, process them using either algorithm, and evaluate the output through various Image Quality Assessment (IQA) metrics.

## 🚀 Tech Stack

### Frontend
* **Framework:** React 19 + Vite
* **Styling:** CSS
* **Icons:** FontAwesome & React Icons
* **Language:** JavaScript (ES6+)

### Backend
* **Framework:** Python 3 + Flask
* **Image Processing:** OpenCV (`cv2`), NumPy
* **API Architecture:** RESTful API with Flask-CORS

## ✨ Key Features

1. **Native Canny Edge Detection:** Runs standard OpenCV Canny Edge algorithm.
2. **Enhanced Canny Edge Detection:** A customized edge detection algorithm designed to improve edge continuity and noise suppression.
3. **Performance Metrics:** Compares results using quantifiable IQA algorithms:
   * **PSNR (Peak Signal-to-Noise Ratio)**
   * **MSE / RMSE (Mean Squared Error / Root Mean Squared Error)**
   * **Pratt's FOM (Figure of Merit)**
   * **Execution Time (Speedup Tracking)**

## 📦 Project Structure

```
.
├── enhanced-canny-edge/        # Frontend (React/Vite) directory
│   ├── api/                    # Backend (Flask) Python application
│   │   ├── index.py            # Flask Entry Point
│   │   ├── nativeCanny.py      # Standard Canny implementation
│   │   ├── enhancedCanny.py    # Custom Enhanced Canny implementation
│   │   └── MEASURING_TOOLS/    # Performance metric calculation scripts
│   ├── src/                    # React frontend source code
│   └── package.json            # Frontend dependencies
├── package.json                # Root package.json to run both concurrently
└── requirements.txt            # Python dependencies
```

## 🛠️ Local Development Setup

### Prerequisites
* **Node.js** (v18+ recommended)
* **Python** (v3.8+ recommended)

### 1. Install Dependencies

Install Node modules for the root and the frontend:
```bash
npm install
cd enhanced-canny-edge
npm install
cd ..
```

Install Python dependencies for the backend:
```bash
pip install -r requirements.txt
```

### 2. Run the Application Concurrently
You can start both the Vite React Frontend and the Flask Python Backend simultaneously using a single command from the root directory:
```bash
npm start
```
* **Frontend:** runs on `http://localhost:5173`
* **Backend API:** runs on `http://localhost:5000`

---
*Developed for edge detection research and algorithm comparison.*
