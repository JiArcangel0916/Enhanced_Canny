"""
Enhanced Canny Edge Detection Algorithm
========================================================================
"An Enhancement of Canny Edge Detection Algorithm Applied in Water
 Sample Microorganism Detection System"

Pipeline (Figure 3.1):
    Image
      -> Domain Decomposition        (Step 1 / Objective 3)
      -> Extended Median Filter      (Step 2 / Objective 1)
      -> Guided Filter               (Step 3 / Objective 1)
      -> Phase Congruency (Kovesi)   (Step 4 / Objective 2)
      -> Non-Maximum Suppression     (Step 5)
      -> Hysteresis Tracking         (Step 6)
      -> Merge Sub-regions           (Step 7 / Objective 3)
    Edge Image

Author: Arcangel, A.Z. & Santiago, C.A. -- PLM Thesis
========================================================================
"""

import os
import time
import multiprocessing
from functools import partial

import numpy as np
import cv2
from scipy.ndimage import median_filter as _scipy_median_filter


# ============================================================================
# STEP 2 (Objective 1): EXTENDED MEDIAN FILTER (EMF)
# ============================================================================
def extended_median_filter(image, window_size=3, delta=20):
    """
    Extended Median Filter.

    Only replaces pixels flagged as "corrupted" (|pixel - median| >= delta)
    with the local median; clean pixels are left untouched, which avoids
    the blanket blurring produced by a plain median or Gaussian filter.

    Parameters
    ----------
    image       : 2D float64 array, values in [0, 255]
    window_size : odd int, size of the sliding window
    delta       : positive threshold controlling corruption sensitivity
    """
    if window_size % 2 == 0:
        raise ValueError("window_size must be odd (e.g. 3, 5, 7).")

    img = image.astype(np.float64)
    median_img = _scipy_median_filter(img, size=window_size, mode="reflect")
    corrupted_mask = np.abs(img - median_img) >= delta
    output = np.where(corrupted_mask, median_img, img)
    return output


# ============================================================================
# STEP 3 (Objective 1): GUIDED FILTER
# ============================================================================
def guided_filter(guide, src, radius=4, eps=1e-2):
    """
    Edge-preserving Guided Filter.

    q_i = a_k * I_i + b_k   (local linear model, averaged over overlapping windows)

    Parameters
    ----------
    guide  : 2D float64 array in [0, 1], the guidance image "I"
    src    : 2D float64 array in [0, 1], the image to be filtered "p"
    radius : local window radius
    eps    : regularization parameter (controls smoothing strength)
    """
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

    q = mean_a * I + mean_b
    return q


# ============================================================================
# STEP 4 (Objective 2): PHASE CONGRUENCY (Kovesi's log-Gabor formulation)
# ============================================================================
def _lowpassfilter(size, cutoff, n):
    """Butterworth low-pass filter in the frequency domain (for filter shaping)."""
    rows, cols = size
    xr = (np.arange(cols) - np.floor(cols / 2)) / cols
    yr = (np.arange(rows) - np.floor(rows / 2)) / rows
    x, y = np.meshgrid(xr, yr)
    radius = np.sqrt(x ** 2 + y ** 2)
    f = 1.0 / (1.0 + (radius / cutoff) ** (2 * n))
    return np.fft.ifftshift(f)


def phase_congruency(image, nscale=4, norient=6, min_wavelength=3, mult=2.1,
                      sigma_onf=0.55, k=2.0, cutoff=0.4, g=10, epsilon=1e-4):
    """
    Computes a Phase Congruency (PC) map using a bank of Log-Gabor filters
    spanning multiple scales and orientations, following Kovesi's
    frequency-domain formulation. Feature strength is based on the local
    alignment of Fourier phase components rather than absolute pixel
    intensity, making PC contrast/illumination-invariant and therefore
    less prone to the fragmented edges produced by Sobel-based gradients.

    Returns
    -------
    PC : 2D array, values roughly in [0, 1], higher = stronger edge/feature.
    """
    img = image.astype(np.float64)
    rows, cols = img.shape

    IM = np.fft.fft2(img)

    # Frequency-domain polar coordinates
    xr = (np.arange(cols) - np.floor(cols / 2)) / cols
    yr = (np.arange(rows) - np.floor(rows / 2)) / rows
    x, y = np.meshgrid(xr, yr)
    radius = np.sqrt(x ** 2 + y ** 2)
    theta = np.arctan2(-y, x)

    radius = np.fft.ifftshift(radius)
    theta = np.fft.ifftshift(theta)
    radius[0, 0] = 1.0  # avoid log(0) / div-by-0 at the DC term

    sintheta = np.sin(theta)
    costheta = np.cos(theta)

    lp = _lowpassfilter((rows, cols), cutoff, 10)

    # Build the radial log-Gabor filter for each scale
    logGabors = []
    for s in range(nscale):
        wavelength = min_wavelength * (mult ** s)
        fo = 1.0 / wavelength
        logGabor = np.exp((-(np.log(radius / fo)) ** 2) / (2 * np.log(sigma_onf) ** 2))
        logGabor *= lp
        logGabor[0, 0] = 0
        logGabors.append(logGabor)

    # Accumulators for the GLOBAL formula:
    #   PC(x) = sum_o sum_n W_o(x)[A_no(x)*dPhi_no(x) - T_o]_+  /  (sum_o sum_n A_no(x) + eps)
    # i.e. ONE numerator and ONE denominator shared across all orientations
    # and scales (matches phase_congruency_kovesi.py's calculate_phase_congruency).
    numerator_total = np.zeros((rows, cols))
    denominator_total = np.zeros((rows, cols))

    for o in range(norient):
        angl = o * np.pi / norient

        # Angular spreading function centered on this orientation
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
            e0 = np.fft.ifft2(IM * filt)          # even/odd symmetric filter response
            EO.append(e0)
            An = np.abs(e0)                       # local amplitude
            sumAn_ThisOrient += An
            sumE_ThisOrient += np.real(e0)
            sumO_ThisOrient += np.imag(e0)
            if s == 0:
                EM_n = np.sum(filt ** 2)          # energy of smallest-scale filter (for noise est.)
                maxAn = An.copy()
            else:
                maxAn = np.maximum(maxAn, An)

        # Local energy via phase-deviation weighted sum
        XEnergy = np.sqrt(sumE_ThisOrient ** 2 + sumO_ThisOrient ** 2) + epsilon
        MeanE = sumE_ThisOrient / XEnergy
        MeanO = sumO_ThisOrient / XEnergy

        energy = np.zeros((rows, cols))
        for s in range(nscale):
            e0 = EO[s]
            energy += (np.real(e0) * MeanE + np.imag(e0) * MeanO
                       - np.abs(np.real(e0) * MeanO - np.imag(e0) * MeanE))

        # Noise compensation threshold T (Rayleigh-distribution based estimate
        # taken from the smallest-scale filter response)
        medianE2n = np.median(np.abs(EO[0]) ** 2)
        meanE2n = medianE2n / np.log(2.0) if medianE2n > 0 else epsilon
        noisePower = meanE2n / EM_n if EM_n > 0 else 0.0

        tau = np.sqrt(noisePower)
        EstNoiseEnergy = tau * np.sqrt(np.pi / 2) * nscale
        EstNoiseEnergySigma = np.sqrt(max((2 - np.pi / 2), 0) * (tau ** 2) * nscale)
        T = EstNoiseEnergy + k * EstNoiseEnergySigma

        # This is the per-orientation, scale-collapsed version of
        # sum_n [A_no(x) * dPhi_no(x)] -- floored at T_o per your formula's
        # inner term: W_o(x) * floor(A_no(x)*dPhi_no(x) - T_o)
        energy = np.maximum(energy - T, 0)

        # Frequency-spread weighting W_o(x): penalizes points where only a
        # narrow range of scales responded (likely noise, not a real feature)
        width = (sumAn_ThisOrient / (maxAn + epsilon) - 1) / (nscale - 1)
        weight = 1.0 / (1 + np.exp(g * (cutoff - width)))

        # Accumulate into the SHARED numerator/denominator (summed over o and n),
        # exactly as calculate_phase_congruency() does with its o/n double loop.
        numerator_total += weight * energy
        denominator_total += sumAn_ThisOrient  # sum over n for this o; accumulated over all o

    PC = numerator_total / (denominator_total + epsilon)
    return PC


# ============================================================================
# STEP 5: NON-MAXIMUM SUPPRESSION
# ============================================================================
def compute_orientation(feature_map):
    """Estimate local feature orientation via Sobel gradients of the PC map."""
    gx = cv2.Sobel(feature_map, cv2.CV_64F, 1, 0, ksize=3)
    gy = cv2.Sobel(feature_map, cv2.CV_64F, 0, 1, ksize=3)
    return np.arctan2(gy, gx)


def apply_non_max_suppression(magnitude, orientation):
    """
    Thins the PC map down to single-pixel-wide ridges by keeping only
    local maxima along the gradient direction.
    """
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


# ============================================================================
# STEP 6: HYSTERESIS TRACKING
# ============================================================================
def apply_edge_tracking_by_hysteresis(magnitude, low_threshold, high_threshold):
    """Standard Canny-style hysteresis thresholding (strong / weak edge linking)."""
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


# ============================================================================
# STEP 1 & 7 (Objective 3): DOMAIN DECOMPOSITION (overlapping tiles + merge)
# ============================================================================
def decompose_domain_overlapping(image, N, M, overlap):
    """
    Partitions an image into an N x M grid of OVERLAPPING sub-regions.

    Overlapping (rather than non-overlapping) partitioning is used so that
    the window-based operations in the pipeline (EMF, Guided Filter, Phase
    Congruency) retain enough neighboring pixel context at tile borders,
    preventing discontinuities once the tiles are merged back together.

    Returns
    -------
    tiles      : list of 2D sub-image arrays (with overlap margins)
    tile_info  : list of dicts with the full-image coordinates needed to
                 place each tile's "core" (non-overlap) region back during merging
    """
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
    """
    Reassembles the processed tiles into a single full-size edge image by
    pasting back only each tile's non-overlapping "core" region.
    """
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


# ============================================================================
# PER-TILE PIPELINE (Steps 2 -> 6, run independently & in parallel per tile)
# ============================================================================
def _process_tile(tile, params):
    """Runs EMF -> Guided Filter -> Phase Congruency -> NMS -> Hysteresis on one tile."""
    tile = tile.astype(np.float64)

    # Step 2: Extended Median Filter (impulse noise removal)
    emf_out = extended_median_filter(tile, window_size=params["window_size"], delta=params["delta"])

    # Step 3: Guided Filter (edge-preserving smoothing), self-guided by EMF output
    guide = np.clip(emf_out / 255.0, 0, 1)
    gf_out = guided_filter(guide, guide, radius=params["guided_radius"], eps=params["guided_eps"])
    gf_out = np.clip(gf_out, 0, 1) * 255.0

    # Step 4: Phase Congruency (contrast-invariant feature/edge strength map)
    pc_map = phase_congruency(gf_out, nscale=params["nscale"], norient=params["norient"],
                               k=params.get("pc_k", 2.0))

    # Step 5: Non-Maximum Suppression
    orientation = compute_orientation(pc_map)
    nms_out = apply_non_max_suppression(pc_map, orientation)

    # Step 6: Hysteresis Tracking
    edge_map = apply_edge_tracking_by_hysteresis(nms_out, params["low_threshold"], params["high_threshold"])

    return edge_map


def _process_tile_star(args):
    """Helper to unpack (tile, params) for multiprocessing.Pool.map."""
    tile, params = args
    return _process_tile(tile, params)


# ============================================================================
# TOP-LEVEL DRIVER
# ============================================================================
def enhanced_canny_edge_detection(image, N=2, M=2, overlap=15,
                                   window_size=3, delta=20,
                                   guided_radius=8, guided_eps=5e-2,
                                   nscale=4, norient=6, pc_k=5.0,
                                   low_threshold=0.15, high_threshold=0.30,
                                   use_parallel=True, verbose=True):
    """
    Full Enhanced Canny pipeline:

        Domain Decomposition -> EMF -> Guided Filter -> Phase Congruency
        -> NMS -> Hysteresis -> Merge Sub-regions

    Parameters
    ----------
    image          : 2D grayscale image (uint8 or float)
    N, M           : number of sub-region rows/columns for domain decomposition
    overlap        : overlap margin (in pixels) between adjacent sub-regions
    window_size    : EMF sliding-window size
    delta          : EMF corruption-detection threshold
    guided_radius  : Guided Filter window radius
    guided_eps     : Guided Filter regularization parameter
    nscale         : number of Log-Gabor filter scales for Phase Congruency
    norient        : number of Log-Gabor filter orientations
    low_threshold, high_threshold : hysteresis thresholds (on PC's ~[0,1] scale)
    use_parallel   : if True, processes sub-regions across multiple CPU cores
    verbose        : if True, prints per-step timing

    Returns
    -------
    edge_map : 2D uint8 array, 0/255 edge image, same size as input
    """
    total_start = time.perf_counter()
    image = image.astype(np.float64)

    params = dict(window_size=window_size, delta=delta,
                  guided_radius=guided_radius, guided_eps=guided_eps,
                  nscale=nscale, norient=norient, pc_k=pc_k,
                  low_threshold=low_threshold, high_threshold=high_threshold)

    if verbose:
        print(f"[Step 1] Domain Decomposition: splitting image into {N}x{M} "
              f"overlapping tiles (overlap={overlap}px)...")
    start = time.perf_counter()
    tiles, tile_info = decompose_domain_overlapping(image, N, M, overlap)
    if verbose:
        print(f"--- Decomposition completed in {time.perf_counter() - start:.4f}s "
              f"({len(tiles)} tiles)")

    start = time.perf_counter()
    if use_parallel and len(tiles) > 1:
        n_workers = min(len(tiles), multiprocessing.cpu_count())
        if verbose:
            print(f"[Steps 2-6] Processing {len(tiles)} tiles in parallel "
                  f"across {n_workers} worker(s)...")
        with multiprocessing.Pool(processes=n_workers) as pool:
            processed_tiles = pool.map(_process_tile_star, [(t, params) for t in tiles])
    else:
        if verbose:
            print(f"[Steps 2-6] Processing {len(tiles)} tile(s) sequentially...")
        processed_tiles = [_process_tile(t, params) for t in tiles]
    if verbose:
        print(f"--- Tile processing (EMF+GuidedFilter+PhaseCongruency+NMS+Hysteresis) "
              f"completed in {time.perf_counter() - start:.4f}s")

    if verbose:
        print("[Step 7] Merging sub-regions...")
    start = time.perf_counter()
    edge_map = merge_tiles(processed_tiles, tile_info, image.shape, dtype=np.uint8)
    if verbose:
        print(f"--- Merge completed in {time.perf_counter() - start:.4f}s")

    if verbose:
        print(f"\n[TOTAL COST] Enhanced Canny finished in "
              f"{time.perf_counter() - total_start:.4f} seconds")

    return edge_map


# ============================================================================
# I/O HELPERS
# ============================================================================
def save_image(image, file_path):
    os.makedirs(os.path.dirname(os.path.abspath(file_path)), exist_ok=True)
    if image.dtype != np.uint8:
        image_normalized = cv2.normalize(image, None, 0, 255, cv2.NORM_MINMAX)
        image_to_save = np.uint8(image_normalized)
    else:
        image_to_save = image
    cv2.imwrite(file_path, image_to_save)


def load_grayscale(path):
    img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise FileNotFoundError(f"Could not read image at: {path}")
    return img


# ============================================================================
# MAIN
# ============================================================================
if __name__ == "__main__":
<<<<<<< HEAD
    # path_to_image = "Datasets/EMDS-7/G006~G010/EMDS6-G009-003-0400.png"
    path_to_image = "samples/tiger.jpg"
=======
    path_to_image = "Datasets/EMDS-7/G021~G025/EMDS6-G021-001-0400.png"
>>>>>>> 9e03e13f16b9850dbb6c2a10ec2e8da6894a7ff4
    output_directory = "output"
    base_filename = "enhanced_"

    original_image = load_grayscale(path_to_image)
    save_image(original_image, os.path.join(output_directory, f"{base_filename}0-grayscale.jpg"))

    edge_image = enhanced_canny_edge_detection(
        original_image,
        N=2, M=2, overlap=15,              # Domain Decomposition
        window_size=3, delta=20,           # Extended Median Filter
        guided_radius=8, guided_eps=5e-2,  # Guided Filter
        nscale=4, norient=6, pc_k=5.0,     # Phase Congruency
        low_threshold=0.15, high_threshold=0.30,  # Hysteresis
        use_parallel=True, verbose=True,
    )

    save_image(edge_image, os.path.join(output_directory, f"{base_filename}final_output.jpg"))
    print(f"\nSaved edge map to: {os.path.join(output_directory, base_filename + 'final_output.jpg')}")
