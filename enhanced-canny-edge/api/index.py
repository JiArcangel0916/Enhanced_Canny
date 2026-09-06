import os
import time
import base64
import numpy as np
import cv2
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ==============================================================================
# CANNY ALGORITHM
# ==============================================================================

def rgb_to_gray(image):
    return np.mean(image, axis=2).astype(np.uint8)

def apply_gaussian_blur(image, kernel_size):
    if kernel_size % 2 == 0:
        kernel_size += 1

    sigma = 1.0
    k_half = kernel_size // 2

    # Generate 2D Gaussian Kernel
    ax = np.linspace(-k_half, k_half, kernel_size)
    gauss = np.exp(-0.5 * np.square(ax) / np.square(sigma))
    kernel = np.outer(gauss, gauss)
    kernel = kernel / np.sum(kernel)

    # Pad image borders to preserve original dimension
    padded = np.pad(image, k_half, mode='reflect')
    rows, cols = image.shape
    output = np.zeros_like(image, dtype=np.float64)

    for i in range(rows):
        for j in range(cols):
            output[i, j] = np.sum(padded[i:i + kernel_size, j:j + kernel_size] * kernel)

    return output

def compute_gradient_magnitude_and_orientation(image, sobel_kernel_size=3):
    if sobel_kernel_size == 3:
        sobel_x = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]])
        sobel_y = np.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]])
    else:
        sobel_x = np.array([[-1, -2, 0, 2, 1], [-2, -3, 0, 3, 2], [-3, -5, 0, 5, 3], [-2, -3, 0, 3, 2], [-1, -2, 0, 2, 1]])
        sobel_y = np.array([[-1, -2, -3, -2, -1], [-2, -3, -5, -3, -2], [0, 0, 0, 0, 0], [2, 3, 5, 3, 2], [1, 2, 3, 2, 1]])

    rows, cols = image.shape
    half_size = sobel_kernel_size // 2
    padded = np.pad(image, half_size, mode='reflect')

    gradient_x = np.zeros_like(image, dtype=np.float64)
    gradient_y = np.zeros_like(image, dtype=np.float64)

    for i in range(rows):
        for j in range(cols):
            window = padded[i:i + sobel_kernel_size, j:j + sobel_kernel_size]
            gradient_x[i, j] = np.sum(window * sobel_x)
            gradient_y[i, j] = np.sum(window * sobel_y)

    magnitude = np.hypot(gradient_x, gradient_y)
    orientation = np.arctan2(gradient_y, gradient_x)
    return magnitude, orientation

def apply_non_max_suppression(magnitude, orientation):
    rows, cols = magnitude.shape
    suppressed = np.zeros_like(magnitude)
    angle = orientation * 180.0 / np.pi
    angle[angle < 0] += 180

    for i in range(1, rows - 1):
        for j in range(1, cols - 1):
            q = 255
            r = 255
            
            # Angle 0
            if (0 <= angle[i, j] < 22.5) or (157.5 <= angle[i, j] <= 180):
                q = magnitude[i, j + 1]
                r = magnitude[i, j - 1]
            # Angle 45
            elif 22.5 <= angle[i, j] < 67.5:
                q = magnitude[i + 1, j - 1]
                r = magnitude[i - 1, j + 1]
            # Angle 90
            elif 67.5 <= angle[i, j] < 112.5:
                q = magnitude[i + 1, j]
                r = magnitude[i - 1, j]
            # Angle 135
            elif 112.5 <= angle[i, j] < 157.5:
                q = magnitude[i - 1, j - 1]
                r = magnitude[i + 1, j + 1]

            if (magnitude[i, j] >= q) and (magnitude[i, j] >= r):
                suppressed[i, j] = magnitude[i, j]
            else:
                suppressed[i, j] = 0

    return suppressed

def apply_edge_tracking_by_hysteresis(magnitude, low_threshold, high_threshold):
    rows, cols = magnitude.shape
    edge_map = np.zeros((rows, cols), dtype=np.uint8)

    strong_edge_i, strong_edge_j = np.where(magnitude >= high_threshold)
    weak_edge_i, weak_edge_j = np.where((magnitude >= low_threshold) & (magnitude < high_threshold))

    edge_map[strong_edge_i, strong_edge_j] = 255

    # 8-connectivity check
    for i, j in zip(weak_edge_i, weak_edge_j):
        if i > 0 and i < rows - 1 and j > 0 and j < cols - 1:
            if (edge_map[i - 1:i + 2, j - 1:j + 2] == 255).any():
                edge_map[i, j] = 255

    return edge_map

def run_native_canny(image, low=50, high=150):
    # Resize high-resolution samples to a manageable dimension for raw Python nested loops
    h, w = image.shape[:2]
    max_dim = 600
    if max(h, w) > max_dim:
        scale = max_dim / float(max(h, w))
        image = cv2.resize(image, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

    if len(image.shape) == 3:
        gray = rgb_to_gray(image)
    else:
        gray = image

    blurred = apply_gaussian_blur(gray, kernel_size=3)
    mag, ori = compute_gradient_magnitude_and_orientation(blurred, sobel_kernel_size=3)
    nms = apply_non_max_suppression(mag, ori)
    final_edges = apply_edge_tracking_by_hysteresis(nms, low, high)
    return final_edges


# ==============================================================================
# FLASK ROUTE
# ==============================================================================

@app.route('/api/detect-edges', methods=['POST'])
def process_edge_detection():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file uploaded'}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'Filename cannot be empty'}), 400

    try:
        # Read file buffer into memory (no disk saving required)
        file_bytes = np.frombuffer(file.read(), np.uint8)
        img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)

        if img is None:
            return jsonify({'error': 'Unable to decode image'}), 400

        # Run your Canny implementation
        edge_result = run_native_canny(img, low=50, high=150)

        # Encode back to PNG base64 string
        _, buffer = cv2.imencode('.png', edge_result)
        base64_str = base64.b64encode(buffer).decode('utf-8')
        processed_data_url = f"data:image/png;base64,{base64_str}"

        return jsonify({
            'success': True,
            'filename': file.filename,
            'processed_image': processed_data_url
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)