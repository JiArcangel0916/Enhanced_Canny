"""
Enhanced Canny vs Native Canny -- Web Comparison UI
====================================================
Run:  python app.py
Then open http://localhost:5000 in your browser (mobile-friendly).

Execution order: Enhanced Canny runs FIRST (results shown immediately),
then Native Canny (pure-Python loops, much slower).
"""

import os
import base64
import threading
import time
import cv2
import numpy as np
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
import sys

# Import measuring tools from their old API directory
sys.path.append(os.path.join(os.path.dirname(__file__), 'enhanced-canny-edge', 'api'))
from MEASURING_TOOLS.psnr import calculate_psnr, calculate_mse
from MEASURING_TOOLS.pratt_fom import calculate_fom

from nativeCanny import canny_edge_detection as native_canny
from enhanced_canny import enhanced_canny_edge_detection

app = Flask(__name__, static_folder="static", static_url_path="/static")

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "bmp", "tif", "tiff"}

_progress: dict = {}
_lock = threading.Lock()


def _allowed(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def _img_to_b64(arr: np.ndarray) -> str:
    if arr.dtype != np.uint8:
        arr = cv2.normalize(arr, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    ok, buf = cv2.imencode(".jpg", arr, [cv2.IMWRITE_JPEG_QUALITY, 92])
    if not ok:
        raise RuntimeError("cv2.imencode failed")
    return "data:image/jpeg;base64," + base64.b64encode(buf).decode()


def _run_algorithms(session_id: str, img_gray: np.ndarray, params: dict):
    """
    Runs Enhanced Canny FIRST so results appear quickly in the UI,
    then runs the slower pure-Python Native Canny and appends its result.
    The frontend polls /progress and shows partial results as they arrive.
    """
    with _lock:
        _progress[session_id] = {
            "status": "running",
            "step": "Starting...",
            "pct": 0,
            "partial": {},   # populated as each algo finishes
        }

    original_b64 = _img_to_b64(img_gray)
    with _lock:
        _progress[session_id]["partial"]["original_b64"] = original_b64

    # ── 1. Enhanced Canny and Native Canny in PARALLEL ────────────────────────
    def run_ec():
        try:
            t0 = time.perf_counter()
            enhanced_edge = enhanced_canny_edge_detection(
                img_gray,
                N=params["ec_N"],
                M=params["ec_M"],
                overlap=params["ec_overlap"],
                window_size=params["ec_window"],
                delta=params["ec_delta"],
                guided_radius=params["ec_guided_r"],
                guided_eps=params["ec_guided_eps"],
                nscale=params["ec_nscale"],
                norient=params["ec_norient"],
                pc_k=params["ec_pc_k"],
                low_threshold=params["ec_low"],
                high_threshold=params["ec_high"],
                use_parallel=False,
                verbose=False,
            )
            ec_time = time.perf_counter() - t0
            ec_psnr = calculate_psnr(img_gray, enhanced_edge)
            ec_mse = calculate_mse(img_gray, enhanced_edge)
            ec_fom = calculate_fom(enhanced_edge, img_gray)
            
            with _lock:
                _progress[session_id]["partial"]["enhanced"] = {
                    "edge_b64": _img_to_b64(enhanced_edge),
                    "time_s": round(ec_time, 4),
                    "psnr": round(ec_psnr, 4),
                    "mse": round(ec_mse, 4),
                    "fom": round(ec_fom, 4)
                }
                _progress[session_id]["enhanced_ready"] = True
                _progress[session_id]["pct"] += 45
        except Exception as e:
            with _lock:
                _progress[session_id]["partial"]["enhanced"] = {"error": str(e)}
                _progress[session_id]["enhanced_ready"] = True
                _progress[session_id]["pct"] += 45

    def run_nc():
        try:
            t0 = time.perf_counter()
            native_edge = native_canny(
                img_gray,
                low_threshold=params["nc_low"],
                high_threshold=params["nc_high"],
                gaussian_kernel_size=params["nc_gauss"],
                sobel_kernel_size=params["nc_sobel"],
            )
            nc_time = time.perf_counter() - t0
            nc_psnr = calculate_psnr(img_gray, native_edge)
            nc_mse = calculate_mse(img_gray, native_edge)
            nc_fom = calculate_fom(native_edge, img_gray)
            
            with _lock:
                _progress[session_id]["partial"]["native"] = {
                    "edge_b64": _img_to_b64(native_edge),
                    "time_s": round(nc_time, 4),
                    "psnr": round(nc_psnr, 4),
                    "mse": round(nc_mse, 4),
                    "fom": round(nc_fom, 4)
                }
                _progress[session_id]["pct"] += 45
        except Exception as e:
            with _lock:
                _progress[session_id]["partial"]["native"] = {"error": str(e)}
                _progress[session_id]["pct"] += 45

    with _lock:
        _progress[session_id].update(step="Running algorithms concurrently...", pct=10)

    # Start both algorithms concurrently
    t_ec = threading.Thread(target=run_ec)
    t_nc = threading.Thread(target=run_nc)
    t_ec.start()
    t_nc.start()
    
    # Wait for both to finish
    t_ec.join()
    t_nc.join()

    with _lock:
        _progress[session_id].update(
            status="done",
            step="Complete",
            pct=100,
            results=_progress[session_id]["partial"],
        )


@app.route("/")
def index():
    return send_from_directory(".", "index.html")


@app.route("/process", methods=["POST"])
def process():
    if "image" not in request.files:
        return jsonify(error="No image uploaded"), 400
    f = request.files["image"]
    if not f or not _allowed(f.filename):
        return jsonify(error="Invalid file type"), 400

    session_id = str(int(time.time() * 1000))
    save_dir = os.path.join(UPLOAD_FOLDER, session_id)
    os.makedirs(save_dir, exist_ok=True)
    img_path = os.path.join(save_dir, secure_filename(f.filename))
    f.save(img_path)

    img = cv2.imread(img_path)
    if img is None:
        return jsonify(error="Could not read image"), 400
    img_gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img

    def fi(key, default):
        try: return int(request.form.get(key, default))
        except: return default
    def ff(key, default):
        try: return float(request.form.get(key, default))
        except: return default

    params = dict(
        nc_low=fi("nc_low", 100), nc_high=fi("nc_high", 200),
        nc_gauss=fi("nc_gauss", 5), nc_sobel=fi("nc_sobel", 3),
        ec_N=fi("ec_N", 2), ec_M=fi("ec_M", 2), ec_overlap=fi("ec_overlap", 15),
        ec_window=fi("ec_window", 3), ec_delta=fi("ec_delta", 20),
        ec_guided_r=fi("ec_guided_r", 8), ec_guided_eps=ff("ec_guided_eps", 0.05),
        ec_nscale=fi("ec_nscale", 4), ec_norient=fi("ec_norient", 6),
        ec_pc_k=ff("ec_pc_k", 5.0), ec_low=ff("ec_low", 0.15), ec_high=ff("ec_high", 0.30),
    )

    threading.Thread(target=_run_algorithms, args=(session_id, img_gray, params), daemon=True).start()
    return jsonify(session_id=session_id)


@app.route("/progress/<session_id>")
def progress(session_id: str):
    with _lock:
        data = dict(_progress.get(session_id, {"status": "unknown"}))
    return jsonify(data)


if __name__ == "__main__":
    print("Starting Enhanced-Canny Comparison Web UI...")
    print("Open http://localhost:5000 in your browser.")
    app.run(debug=False, host="0.0.0.0", port=5000, threaded=True)
