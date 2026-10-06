import base64
import numpy as np
import cv2
import time
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
from nativeCanny import run_native_canny
from enhancedCanny import enhanced_canny_edge_detection as run_enhanced_canny
from MEASURING_TOOLS.psnr import calculate_psnr
from MEASURING_TOOLS.rmse import calculate_mse_and_rmse
from MEASURING_TOOLS.pratt_fom import calculate_fom
from MEASURING_TOOLS.speedup import calculate_speedup

url: str = os.environ.get("SUPABASE_URL", "https://oobjjjmmnttufxrlnmsd.supabase.co")
key: str = os.environ.get("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vYmpqam1tbnR0dWZ4cmxubXNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMjA5NTMsImV4cCI6MjEwNjY5Njk1M30.b2X-r_W6W88LUoaek-92vu0qcMw0l_00glSqekh-XQo")
supabase: Client = create_client(url, key)

app = Flask(__name__)
CORS(app)

def verify_token(req):
    auth_header = req.headers.get('Authorization')
    if not auth_header:
        return False
    try:
        token = auth_header.split(" ")[1]
        user = supabase.auth.get_user(token)
        if not user:
            return False
        return True
    except Exception as e:
        print(f"Token verification failed: {e}")
        return False

@app.route('/api/detect-edges/native', methods=['POST'])
def perform_native_canny():
    if not verify_token(request):
        return jsonify({'error': 'Unauthorized'}), 401

    if 'image' not in request.files:
        return jsonify({'error': 'No image file uploaded'}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'Filename cannot be empty'}), 400

    try:
        file_bytes = np.frombuffer(file.read(), np.uint8)
        img = cv2.imdecode(file_bytes, cv2.IMREAD_GRAYSCALE)

        if img is None:
            return jsonify({'error': 'Unable to decode image'}), 400

        start_time = time.perf_counter()
        native_edge_result = run_native_canny(img, low=50, high=150)
        end_time = round(time.perf_counter() - start_time, 4)

        psnr = calculate_psnr(img, native_edge_result)
        mse_rmse = calculate_mse_and_rmse(img, native_edge_result)
        fom = calculate_fom(native_edge_result, img)

        _, buffer_native = cv2.imencode('.png', native_edge_result)
        native_base64_str = base64.b64encode(buffer_native).decode('utf-8')
        native_url = f"data:image/png;base64,{native_base64_str}"

        return jsonify({
            'success': True,
            'filename': file.filename,
            'image': native_url,
            'metrics' : {
                'psnr': psnr,
                'mse_rmse': mse_rmse,
                'fom': fom,
                'execution_time': end_time
            }
        })

    except Exception as e:
        print(e)
        return jsonify({'error': str(e)}), 500

@app.route('/api/detect-edges/enhanced', methods=['POST'])
def perform_enhanced_canny():
    if not verify_token(request):
        return jsonify({'error': 'Unauthorized'}), 401

    if 'image' not in request.files:
            return jsonify({'error': 'No image file uploaded'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'Filename cannot be empty'}), 400

    try:
        file_bytes = np.frombuffer(file.read(), np.uint8)
        img = cv2.imdecode(file_bytes, cv2.IMREAD_GRAYSCALE)
    
        if img is None:
            return jsonify({'error': 'Unable to decode image'}), 400

        start_time = time.perf_counter()
        enhanced_edge_result = run_enhanced_canny(img)
        end_time = round(time.perf_counter() - start_time, 4)

        psnr = calculate_psnr(img, enhanced_edge_result)
        mse_rmse = calculate_mse_and_rmse(img, enhanced_edge_result)
        fom = calculate_fom(enhanced_edge_result, img)
    
        _, buffer_enhanced = cv2.imencode('.png', enhanced_edge_result)
        enhanced_base64_str = base64.b64encode(buffer_enhanced).decode('utf-8')
        enhanced_url = f"data:image/png;base64,{enhanced_base64_str}"
    
        return jsonify({
            'success': True,
            'filename': file.filename,
            'image': enhanced_url,
            'metrics': {
                'psnr': psnr,
                'mse_rmse': mse_rmse,
                'fom': fom,
                'execution_time': end_time
            }
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)