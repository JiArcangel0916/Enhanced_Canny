def calculate_speedup(baseline_time, optimized_time):
    """
    Calculates the speedup factor (S).
    
    Args:
        baseline_time (float): The execution time of the baseline or sequential version, T(m_1 = 1).
        optimized_time (float): The execution time of the improved or parallel version, T(m_1 > 1).
        
    Returns:
        float: The speedup factor.
    """
    if optimized_time == 0:
        # Prevent division by zero if the optimized time is recorded as 0
        raise ValueError("Optimized time cannot be zero.")
        
    speedup = baseline_time / optimized_time
    
    return speedup

# --- Example Usage ---
t_m1_equals_1 = 5.0  
t_m1_greater_than_1 = 0.26  

s = calculate_speedup(t_m1_equals_1, t_m1_greater_than_1)
print(f"Speedup (S): {s:.2f}x")