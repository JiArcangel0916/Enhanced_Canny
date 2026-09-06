"""
Extended Median Filter (EMF)

Source: Charmouti, B., Junoh, A.K., Wan Muhamad, W.Z.A. (2017).
"Extended Median Filter for Salt and Pepper Noise in Image."
International Journal of Applied Engineering Research, 12(22), 12914-12918.

Algorithm:
1. Slide a window (e.g. 3x3) over the image and compute the median of the
   pixels inside that window.
2. Decide whether the center pixel is corrupted:
       abs(center_pixel - median) >= d
   where d is a positive threshold value.
3. If the pixel is corrupted, replace it with the window median.
   Otherwise, leave the pixel unchanged.
"""

import numpy as np


def extended_median_filter(image: np.ndarray, window_size: int = 3, d: int = 20) -> np.ndarray:
    if window_size % 2 == 0:
        raise ValueError("window_size must be odd (e.g. 3, 5, 7).")

    pad = window_size // 2
    orig_dtype = image.dtype

    img = image.astype(np.float64)
    padded = np.pad(img, pad_width=pad, mode="reflect")

    h, w = img.shape
    output = img.copy()

    for i in range(h):
        for j in range(w):
            window = padded[i:i + window_size, j:j + window_size]
            median_val = np.median(window)
            center_pixel = img[i, j]

            if abs(center_pixel - median_val) >= d:
                output[i, j] = median_val

    return np.clip(output, 0, 255).astype(orig_dtype)


def extended_median_filter_fast(image: np.ndarray, window_size: int = 3, d: int = 20) -> np.ndarray:
    from scipy.ndimage import median_filter as scipy_median_filter

    if window_size % 2 == 0:
        raise ValueError("window_size must be odd (e.g. 3, 5, 7).")

    orig_dtype = image.dtype
    img = image.astype(np.float64)

    median_img = scipy_median_filter(img, size=window_size, mode="reflect")

    corrupted_mask = np.abs(img - median_img) >= d
    output = np.where(corrupted_mask, median_img, img)

    return np.clip(output, 0, 255).astype(orig_dtype)
