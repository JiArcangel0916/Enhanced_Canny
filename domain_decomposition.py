import numpy as np

def decompose_domain_overlapping(image, N, M, overlap):
    """
    Partitions an image of size (H, W) into N x M overlapping sub-regions.
    
    Parameters:
    image (numpy.ndarray): The input image.
    N (int): Number of sub-regions along the height.
    M (int): Number of sub-regions along the width.
    overlap (int): The number of pixels to overlap on each side of the sub-region.
    
    Returns:
    list: A list of overlapping image tiles.
    list: A list of tuples containing the (start_h, end_h, start_w, end_w) coordinates for merging later.
    """
    H, W = image.shape[:2]
    
    # Calculate the base dimensions for standard non-overlapping tiles
    base_h = H // N
    base_w = W // M
    
    overlapping_tiles = []
    tile_coordinates = []
    
    for i in range(N):
        for j in range(M):
            # Calculate boundaries and apply the overlap margin
            # max(0, ...) and min(H/W, ...) prevent the index from going out of the image bounds
            start_h = max(0, i * base_h - overlap)
            end_h = min(H, (i + 1) * base_h + overlap)
            
            start_w = max(0, j * base_w - overlap)
            end_w = min(W, (j + 1) * base_w + overlap)
            
            # Extract the overlapping sub-region from the main image
            tile = image[start_h:end_h, start_w:end_w]
            
            overlapping_tiles.append(tile)
            tile_coordinates.append((start_h, end_h, start_w, end_w))
            
    return overlapping_tiles, tile_coordinates

# --- Example Usage ---
# Create a dummy image of size 2048 x 2048
dummy_image = np.zeros((2048, 2048))

# Decompose into a 4x4 grid (N=4, M=4) with a 15-pixel overlap
tiles, coords = decompose_domain_overlapping(dummy_image, N=4, M=4, overlap=15)

print(f"Total tiles generated: {len(tiles)}")
print(f"Shape of the first tile with overlap: {tiles[0].shape}")