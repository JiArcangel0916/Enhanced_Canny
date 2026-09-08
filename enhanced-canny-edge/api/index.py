import base64
import numpy as np
import cv2
import time
from flask import Flask, request, jsonify
from flask_cors import CORS
from nativeCanny import run_native_canny
from enhancedCanny import enhanced_canny_edge_detection as run_enhanced_canny
from MEASURING_TOOLS.psnr import calculate_psnr
from MEASURING_TOOLS.rmse import calculate_mse_and_rmse
from MEASURING_TOOLS.pratt_fom import calculate_fom
from MEASURING_TOOLS.speedup import calculate_speedup

app = Flask(__name__)
CORS(app)

@app.route('/api/detect-edges/native', methods=['POST'])
def perform_native_canny():
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