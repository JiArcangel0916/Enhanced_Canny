import numpy as np
from scipy.ndimage import distance_transform_edt

def calculate_fom(ground_truth, detected, kappa=1/9):
    """
    Calculates Pratt's Figure of Merit (FOM) for edge detection evaluation.
    
    Args:
        ground_truth (numpy.ndarray): The ideal/reference edge map.
        detected (numpy.ndarray): The edge map produced by the algorithm.
        kappa (float): Scaling constant, defaults to 1/9.
        
    Returns:
        float: The FOM value, bounded between 0.0 and 1.0 (1.0 is a perfect match).
    """
    # Ensure images are binary (True for edges, False for background)
    gt_edges = ground_truth > 0
    det_edges = detected > 0
    
    # E_GT and E_Det: Count of edge pixels
    e_gt = np.sum(gt_edges)
    e_det = np.sum(det_edges)
    
    # Handle cases where one or both images have no edges at all
    if e_gt == 0 and e_det == 0:
        return 1.0
    if e_gt == 0 or e_det == 0:
        return 0.0
        
    # Calculate the minimal Euclidean distance to the nearest GT edge pixel.
    # distance_transform_edt calculates distance to the nearest 0/False value.
    # Therefore, we invert the GT map (~gt_edges) so edges are 0.
    distance_map = distance_transform_edt(~gt_edges)
    
    # Extract only the distances for the pixels where an edge was actually detected
    d_n = distance_map[det_edges]
    
    # Compute the summation part of the formula
    summation = np.sum(1.0 / (1.0 + kappa * (d_n ** 2)))
    
    # Calculate final FOM
    fom = (1.0 / max(e_gt, e_det)) * summation
    
    return fom