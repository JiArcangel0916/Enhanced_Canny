import math
import numpy as np

def calculate_mse(image_a, image_b):
    """Calculates the Mean Squared Error between two image arrays."""
    # Ensure images are arrays and cast to float to prevent integer overflow
    err = np.sum((image_a.astype("float") - image_b.astype("float")) ** 2)
    err /= float(image_a.shape[0] * image_a.shape[1])
    return err

def calculate_psnr(image_a, image_b, r=255.0):
    """Calculates PSNR using the MSE."""
    mse = calculate_mse(image_a, image_b)
    
    if mse == 0:
        return float('inf')
        
    return 20 * math.log10(r / math.sqrt(mse))