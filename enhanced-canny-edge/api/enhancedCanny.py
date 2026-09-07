import numpy as np
import cv2
from scipy.ndimage import median_filter as _scipy_median_filter


# ==============================================================================
# PREPROCESSING & DOMAIN DECOMPOSITION
# ==============================================================================

def rgb_to_gray(image):
    return np.mean(image, axis=2).astype(np.uint8)


def decompose_domain_overlapping(image, N=2, M=2, overlap=15):
    H, W = image.shape[:2]
    base_h = max(1, H // N)
    base_w = max(1, W // M)

    tiles = []
    tile_info = []

    for i in range(N):
        core_start_h = i * base_h
        core_end_h = H if i == N - 1 else (i + 1) * base_h
        start_h = max(0, core_start_h - overlap)
        end_h = min(H, core_end_h + overlap)

        for j in range(M):
            core_start_w = j * base_w
            core_end_w = W if j == M - 1 else (j + 1) * base_w
            start_w = max(0, core_start_w - overlap)
            end_w = min(W, core_end_w + overlap)

            tile = image[start_h:end_h, start_w:end_w]
            tiles.append(tile)
            tile_info.append({
                "start_h": start_h, "end_h": end_h,
                "start_w": start_w, "end_w": end_w,
                "core_start_h": core_start_h, "core_end_h": core_end_h,
                "core_start_w": core_start_w, "core_end_w": core_end_w,
            })

    return tiles, tile_info


def merge_tiles(processed_tiles, tile_info, output_shape, dtype=np.uint8):
    output = np.zeros(output_shape, dtype=dtype)
    for tile, info in zip(processed_tiles, tile_info):
        lh0 = info["core_start_h"] - info["start_h"]
        lh1 = info["core_end_h"] - info["start_h"]
        lw0 = info["core_start_w"] - info["start_w"]
        lw1 = info["core_end_w"] - info["start_w"]
        core = tile[lh0:lh1, lw0:lw1]
        output[info["core_start_h"]:info["core_end_h"],
               info["core_start_w"]:info["core_end_w"]] = core
    return output


# ==============================================================================
# FILTERING (EMF & GUIDED FILTER)
# ==============================================================================

def extended_median_filter(image, window_size=3, delta=20):
    if window_size % 2 == 0:
        window_size += 1

    img = image.astype(np.float64)
    median_img = _scipy_median_filter(img, size=window_size, mode="reflect")
    corrupted_mask = np.abs(img - median_img) >= delta
    return np.where(corrupted_mask, median_img, img)


def guided_filter(guide, src, radius=4, eps=1e-2):
    I = guide.astype(np.float64)
    p = src.astype(np.float64)
    window = (2 * radius + 1, 2 * radius + 1)

    mean_I = cv2.boxFilter(I, -1, window)
    mean_p = cv2.boxFilter(p, -1, window)
    mean_Ip = cv2.boxFilter(I * p, -1, window)
    cov_Ip = mean_Ip - mean_I * mean_p

    mean_II = cv2.boxFilter(I * I, -1, window)
    var_I = mean_II - mean_I * mean_I

    a = cov_Ip / (var_I + eps)
    b = mean_p - a * mean_I

    mean_a = cv2.boxFilter(a, -1, window)
    mean_b = cv2.boxFilter(b, -1, window)

    return mean_a * I + mean_b


# ==============================================================================
# PHASE CONGRUENCY & ORIENTATION
# ==============================================================================

def _lowpassfilter(size, cutoff, n):
    rows, cols = size
    xr = (np.arange(cols) - np.floor(cols / 2)) / cols
    yr = (np.arange(rows) - np.floor(rows / 2)) / rows
    x, y = np.meshgrid(xr, yr)
    radius = np.sqrt(x ** 2 + y ** 2)
    f = 1.0 / (1.0 + (radius / cutoff) ** (2 * n))
    return np.fft.ifftshift(f)


def compute_phase_congruency(image, nscale=4, norient=6, min_wavelength=3, mult=2.1,
                             sigma_onf=0.55, k=2.0, cutoff=0.4, g=10, epsilon=1e-4):
    img = image.astype(np.float64)
    rows, cols = img.shape
    IM = np.fft.fft2(img)

    xr = (np.arange(cols) - np.floor(cols / 2)) / cols
    yr = (np.arange(rows) - np.floor(rows / 2)) / rows
    x, y = np.meshgrid(xr, yr)
    radius = np.sqrt(x ** 2 + y ** 2)
    theta = np.arctan2(-y, x)

    radius = np.fft.ifftshift(radius)
    theta = np.fft.ifftshift(theta)
    radius[0, 0] = 1.0

    sintheta = np.sin(theta)
    costheta = np.cos(theta)
    lp = _lowpassfilter((rows, cols), cutoff, 10)

    logGabors = []
    for s in range(nscale):
        wavelength = min_wavelength * (mult ** s)
        fo = 1.0 / wavelength
        logGabor = np.exp((-(np.log(radius / fo)) ** 2) / (2 * np.log(sigma_onf) ** 2))
        logGabor *= lp
        logGabor[0, 0] = 0
        logGabors.append(logGabor)

    numerator_total = np.zeros((rows, cols))
    denominator_total = np.zeros((rows, cols))

    for o in range(norient):
        angl = o * np.pi / norient
        ds = sintheta * np.cos(angl) - costheta * np.sin(angl)
        dc = costheta * np.cos(angl) + sintheta * np.sin(angl)
        dtheta = np.abs(np.arctan2(ds, dc))
        dtheta = np.minimum(dtheta * norient / 2, np.pi)
        spread = (np.cos(dtheta) + 1) / 2

        sumE_ThisOrient = np.zeros((rows, cols))
        sumO_ThisOrient = np.zeros((rows, cols))
        sumAn_ThisOrient = np.zeros((rows, cols))
        EO = []
        maxAn = None
        EM_n = 0.0

        for s in range(nscale):
            filt = logGabors[s] * spread
            e0 = np.fft.ifft2(IM * filt)
            EO.append(e0)
            An = np.abs(e0)
            sumAn_ThisOrient += An
            sumE_ThisOrient += np.real(e0)
            sumO_ThisOrient += np.imag(e0)
            if s == 0:
                EM_n = np.sum(filt ** 2)
                maxAn = An.copy()
            else:
                maxAn = np.maximum(maxAn, An)

        XEnergy = np.sqrt(sumE_ThisOrient ** 2 + sumO_ThisOrient ** 2) + epsilon
        MeanE = sumE_ThisOrient / XEnergy
        MeanO = sumO_ThisOrient / XEnergy

        energy = np.zeros((rows, cols))
        for s in range(nscale):
            e0 = EO[s]
            energy += (np.real(e0) * MeanE + np.imag(e0) * MeanO
                       - np.abs(np.real(e0) * MeanO - np.imag(e0) * MeanE))

        medianE2n = np.median(np.abs(EO[0]) ** 2)
        meanE2n = medianE2n / np.log(2.0) if medianE2n > 0 else epsilon
        noisePower = meanE2n / EM_n if EM_n > 0 else 0.0

        tau = np.sqrt(noisePower)
        EstNoiseEnergy = tau * np.sqrt(np.pi / 2) * nscale
        EstNoiseEnergySigma = np.sqrt(max((2 - np.pi / 2), 0) * (tau ** 2) * nscale)
        T = EstNoiseEnergy + k * EstNoiseEnergySigma

        energy = np.maximum(energy - T, 0)
        width = (sumAn_ThisOrient / (maxAn + epsilon) - 1) / (nscale - 1)
        weight = 1.0 / (1 + np.exp(g * (cutoff - width)))

        numerator_total += weight * energy
        denominator_total += sumAn_ThisOrient

    return numerator_total / (denominator_total + epsilon)


def compute_orientation(feature_map):
    gx = cv2.Sobel(feature_map, cv2.CV_64F, 1, 0, ksize=3)
    gy = cv2.Sobel(feature_map, cv2.CV_64F, 0, 1, ksize=3)
    return np.arctan2(gy, gx)


# ==============================================================================
# EDGE TRACKING (NMS & HYSTERESIS)
# ==============================================================================

def apply_non_max_suppression(magnitude, orientation):
    suppressed = np.copy(magnitude)
    rows, cols = magnitude.shape

    for i in range(1, rows - 1):
        for j in range(1, cols - 1):
            angle = orientation[i, j]
            if (-np.pi / 8 <= angle < np.pi / 8) or (7 * np.pi / 8 <= abs(angle) <= np.pi):
                q1, q2 = magnitude[i, j + 1], magnitude[i, j - 1]
            elif np.pi / 8 <= angle < 3 * np.pi / 8:
                q1, q2 = magnitude[i + 1, j + 1], magnitude[i - 1, j - 1]
            elif 3 * np.pi / 8 <= angle < 5 * np.pi / 8:
                q1, q2 = magnitude[i + 1, j], magnitude[i - 1, j]
            else:
                q1, q2 = magnitude[i - 1, j + 1], magnitude[i + 1, j - 1]

            if magnitude[i, j] < max(q1, q2):
                suppressed[i, j] = 0

    return suppressed


def apply_edge_tracking_by_hysteresis(magnitude, low_threshold, high_threshold):
    rows, cols = magnitude.shape
    edge_map = np.zeros((rows, cols), dtype=np.uint8)

    strong_i, strong_j = np.where(magnitude >= high_threshold)
    weak_i, weak_j = np.where((magnitude >= low_threshold) & (magnitude < high_threshold))

    edge_map[strong_i, strong_j] = 255

    for i, j in zip(weak_i, weak_j):
        i0, i1 = max(i - 1, 0), min(i + 2, rows)
        j0, j1 = max(j - 1, 0), min(j + 2, cols)
        if (edge_map[i0:i1, j0:j1] == 255).any():
            edge_map[i, j] = 255

    return edge_map


def _process_tile(tile, params):
    tile = tile.astype(np.float64)

    # 1. Extended Median Filter
    emf_out = extended_median_filter(tile, window_size=params["window_size"], delta=params["delta"])

    # 2. Guided Filter
    guide = np.clip(emf_out / 255.0, 0, 1)
    gf_out = guided_filter(guide, guide, radius=params["guided_radius"], eps=params["guided_eps"])
    gf_out = np.clip(gf_out, 0, 1) * 255.0

    # 3. Phase Congruency & Orientation
    pc_map = compute_phase_congruency(gf_out, nscale=params["nscale"], norient=params["norient"], k=params["pc_k"])
    orientation = compute_orientation(pc_map)

    # 4. Thinning & Thresholding
    nms_out = apply_non_max_suppression(pc_map, orientation)
    edge_map = apply_edge_tracking_by_hysteresis(nms_out, params["low_threshold"], params["high_threshold"])

    return edge_map


# ==============================================================================
# MAIN ENTRYPOINT PIPELINE
# ==============================================================================

def run_enhanced_canny(image, N=2, M=2, overlap=15,
                       window_size=3, delta=20,
                       guided_radius=8, guided_eps=5e-2,
                       nscale=4, norient=6, pc_k=5.0,
                       low_threshold=0.15, high_threshold=0.30):
    # Downscale high-resolution images to match nativeCanny's handling
    h, w = image.shape[:2]
    max_dim = 600
    if max(h, w) > max_dim:
        scale = max_dim / float(max(h, w))
        image = cv2.resize(image, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

    # Ensure single-channel 2D grayscale
    if len(image.shape) == 3:
        gray = rgb_to_gray(image)
    else:
        gray = image

    params = {
        "window_size": window_size,
        "delta": delta,
        "guided_radius": guided_radius,
        "guided_eps": guided_eps,
        "nscale": nscale,
        "norient": norient,
        "pc_k": pc_k,
        "low_threshold": low_threshold,
        "high_threshold": high_threshold,
    }

    # Tile-based pipeline (safe for Flask single-threaded execution)
    tiles, tile_info = decompose_domain_overlapping(gray, N=N, M=M, overlap=overlap)
    processed_tiles = [_process_tile(t, params) for t in tiles]
    final_edges = merge_tiles(processed_tiles, tile_info, gray.shape, dtype=np.uint8)

    return final_edges