"""
DEMO 1: Sequential vs Parallel Processing
==========================================
Task: Compute the square of each number in a large list.

This is the simplest possible example to show the difference
between doing tasks one-by-one (sequential) vs all at once (parallel).
"""

import multiprocessing
import time

# ── The task: compute square of a number ──────────────────────────────────────
def compute_square(n):
    """Simulates a slightly heavy computation."""
    time.sleep(0.01)       # pretend each computation takes 10ms
    return n * n


# ── Sequential approach ───────────────────────────────────────────────────────
def run_sequential(numbers):
    results = []
    for n in numbers:
        results.append(compute_square(n))
    return results


# ── Parallel approach (domain decomposition idea) ─────────────────────────────
def run_parallel(numbers):
    # Pool creates worker processes — one per CPU core by default
    with multiprocessing.Pool() as pool:
        # pool.map() splits `numbers` across all workers automatically
        # each worker calls compute_square() on its assigned numbers
        results = pool.map(compute_square, numbers)
    return results


# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    numbers = list(range(1, 10000))   # 40 numbers to process
    cpu_count = multiprocessing.cpu_count()
    print(f"CPU cores available: {cpu_count}")
    print(f"Numbers to process : {len(numbers)}\n")

    # Sequential
    start = time.time()
    seq_results = run_sequential(numbers)
    seq_time = time.time() - start
    print(f"[Sequential] Time: {seq_time:.2f}s  | First 5 results: {seq_results[:5]}")

    # Parallel
    start = time.time()
    par_results = run_parallel(numbers)
    par_time = time.time() - start
    print(f"[Parallel  ] Time: {par_time:.2f}s  | First 5 results: {par_results[:5]}")

    # Speedup
    speedup = seq_time / par_time
    print(f"\nSpeedup: {speedup:.2f}x faster with parallelism")