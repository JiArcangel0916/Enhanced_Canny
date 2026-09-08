import numpy as np

def calculate_mse_and_rmse(f, f_prime):
    """
    Calculates the Mean Squared Error (MSE) and Root Mean Squared Error (RMSE)
    between an original image (f) and a refined image (f_prime).
    
    Args:
        f (numpy.ndarray): The original image.
        f_prime (numpy.ndarray): The refined/processed image.
        
    Returns:
        tuple: (mse, rmse)
    """
    # Cast images to float64 to prevent integer overflow during subtraction
    f = f.astype(np.float64)
    f_prime = f_prime.astype(np.float64)
    
    # np.mean computes the sum of the squared differences divided by m * n
    mse = np.mean((f - f_prime) ** 2)
    
    # RMSE is just the square root of MSE, as noted in the image
    rmse = np.sqrt(mse)
    
    return mse, rmse

# --- Example Usage ---
# Assuming 'original_img' and 'refined_img' are numpy arrays of the same shape
# mse_value, rmse_value = calculate_mse_and_rmse(original_img, refined_img)
# print(f"MSE: {mse_value}, RMSE: {rmse_value}")