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

from flask_cors import CORS

app = Flask(__name__, static_folder="static", static_url_path="/static")
CORS(app)

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


import queue

ec_queue = queue.Queue()
nc_queue = queue.Queue()

def _check_done(session_id):
    with _lock:
        if session_id not in _progress: return
        p = _progress[session_id]["partial"]
        if "enhanced" in p and "native" in p:
            _progress[session_id].update(status="done", step="Complete", pct=100, results=p)

def _ec_worker():
    while True:
        task = ec_queue.get()
        if task is None: break
        session_id, img_gray, params = task
        with _lock:
            if session_id in _progress:
                _progress[session_id]["ec_status"] = "processing"
        try:
            t0 = time.perf_counter()
            enhanced_edge = enhanced_canny_edge_detection(
                img_gray,
                N=params["ec_N"], M=params["ec_M"], overlap=params["ec_overlap"],
                window_size=params["ec_window"], delta=params["ec_delta"],
                guided_radius=params["ec_guided_r"], guided_eps=params["ec_guided_eps"],
                nscale=params["ec_nscale"], norient=params["ec_norient"],
                pc_k=params["ec_pc_k"], low_threshold=params["ec_low"],
                high_threshold=params["ec_high"], use_parallel=True, verbose=False
            )
            ec_time = time.perf_counter() - t0
            ec_psnr = calculate_psnr(img_gray, enhanced_edge)
            ec_mse = calculate_mse(img_gray, enhanced_edge)
            ec_fom = calculate_fom(enhanced_edge, img_gray)
            with _lock:
                _progress[session_id]["partial"]["enhanced"] = {
                    "edge_b64": _img_to_b64(enhanced_edge),
                    "time_s": round(ec_time, 4),
                    "psnr": round(ec_psnr, 4), "mse": round(ec_mse, 4), "fom": round(ec_fom, 4)
                }
                _progress[session_id]["pct"] += 45
        except Exception as e:
            with _lock:
                _progress[session_id]["partial"]["enhanced"] = {"error": str(e)}
                _progress[session_id]["pct"] += 45
        finally:
            _check_done(session_id)
            ec_queue.task_done()

def _nc_worker():
    while True:
        task = nc_queue.get()
        if task is None: break
        session_id, img_gray, params = task
        with _lock:
            if session_id in _progress:
                _progress[session_id]["nc_status"] = "processing"
        try:
            t0 = time.perf_counter()
            native_edge = native_canny(
                img_gray, low_threshold=params["nc_low"], high_threshold=params["nc_high"],
                gaussian_kernel_size=params["nc_gauss"], sobel_kernel_size=params["nc_sobel"]
            )
            nc_time = time.perf_counter() - t0
            nc_psnr = calculate_psnr(img_gray, native_edge)
            nc_mse = calculate_mse(img_gray, native_edge)
            nc_fom = calculate_fom(native_edge, img_gray)
            with _lock:
                _progress[session_id]["partial"]["native"] = {
                    "edge_b64": _img_to_b64(native_edge),
                    "time_s": round(nc_time, 4),
                    "psnr": round(nc_psnr, 4), "mse": round(nc_mse, 4), "fom": round(nc_fom, 4)
                }
                _progress[session_id]["pct"] += 45
        except Exception as e:
            with _lock:
                _progress[session_id]["partial"]["native"] = {"error": str(e)}
                _progress[session_id]["pct"] += 45
        finally:
            _check_done(session_id)
            nc_queue.task_done()

threading.Thread(target=_ec_worker, daemon=True).start()
threading.Thread(target=_nc_worker, daemon=True).start()


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

    with _lock:
        _progress[session_id] = {
            "status": "running",
            "step": "Initializing...",
            "pct": 0,
            "partial": {"original_b64": _img_to_b64(img_gray)},
            "ec_status": "queued",
            "nc_status": "queued",
        }

    ec_queue.put((session_id, img_gray, params))
    nc_queue.put((session_id, img_gray, params))
    return jsonify(session_id=session_id)


@app.route("/progress/<session_id>")
def progress(session_id: str):
    with _lock:
        data = dict(_progress.get(session_id, {"status": "unknown"}))
    return jsonify(data)


if __name__ == "__main__":
    print("Starting Enhanced-Canny Comparison Web UI...")
    print("Open http://localhost:5005 in your browser.")
    app.run(debug=False, host="0.0.0.0", port=5005, threaded=True)
