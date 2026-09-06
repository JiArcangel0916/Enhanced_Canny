import numpy as np

def calculate_phase_congruency(E, A, W, T, epsilon=1e-4):
    """
    Calculates Kovesi's Phase Congruency based on the provided formula.

    Args:
        E (np.ndarray): 2D array representing the local energy E(x).
        A (list of lists of np.ndarray): Fourier amplitudes A_{no}(x).
                                         Indexed as A[orientation][scale].
        W (list of np.ndarray): 2D arrays of the weight function W_o(x) per orientation.
        T (list or 1D array): Noise compensation term T_o per orientation.
        epsilon (float): Small positive constant to prevent division by zero.

    Returns:
        np.ndarray: The resulting Phase Congruency map PC(x).
    """
    num_orientations = len(A)
    num_scales = len(A[0])

    # Initialize the numerator and denominator matrices
    numerator = np.zeros_like(E, dtype=np.float64)
    denominator = np.zeros_like(E, dtype=np.float64)

    for o in range(num_orientations):
        # 1. The floor operator \lfloor E(x) - T_o \rfloor
        # This keeps the value if it is positive, and sets it to 0 otherwise.
        energy_term = np.maximum(E - T[o], 0)

        # 2. Sum over scales (n) and orientations (o) for the numerator.
        # Since W_o, E(x), and T_o do not depend on the scale 'n' in the formula, 
        # summing over 'n' is mathematically equivalent to multiplying by num_scales.
        numerator += num_scales * (W[o] * energy_term)

        # 3. Sum over scales (n) and orientations (o) for the denominator.
        for n in range(num_scales):
            denominator += A[o][n]

    # Calculate final Phase Congruency
    PC = numerator / (denominator + epsilon)

    return PC