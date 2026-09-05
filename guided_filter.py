import numpy as np
import cv2

def guided_filter(I, p, radius, eps):
    """
    Python implementation of the Guided Filter based on the extracted formulas.
    
    Parameters:
    I      : Guide image (2D numpy array, float type)
    p      : Input image to be filtered (2D numpy array, float type)
    radius : The radius of the local window (determines window size)
    eps    : The penalty parameter (epsilon) to adjust filtering effect
    """
    # Define the window size based on the given radius
    window = (2 * radius + 1, 2 * radius + 1)
    
    # 1. Compute the local means over the window
    mean_I = cv2.boxFilter(I, -1, window)
    mean_p = cv2.boxFilter(p, -1, window)
    mean_Ip = cv2.boxFilter(I * p, -1, window)
    
    # 2. Compute variance of I (σ_k^2) and covariance of I and p
    mean_II = cv2.boxFilter(I * I, -1, window)
    var_I = mean_II - mean_I * mean_I
    cov_Ip = mean_Ip - mean_I * mean_p
    
    # 3. Compute the coefficients a_k and b_k
    # Formula: a_k = (cov(I, p)) / (var(I) + eps)
    a = cov_Ip / (var_I + eps)
    # Formula: b_k = mean(p) - a_k * mean(I)
    b = mean_p - a * mean_I
    
    # 4. Average the coefficients over the window 
    # (Since a pixel is involved in multiple overlapping windows)
    mean_a = cv2.boxFilter(a, -1, window)
    mean_b = cv2.boxFilter(b, -1, window)
    
    # 5. Calculate the final output image q
    # Formula: q_i = a_k * I_i + b_k
    q = mean_a * I + mean_b
    
    return q