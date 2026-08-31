import matplotlib.pyplot as plt
import time 
import cv2
import nativeCanny as canny

resolutions = [
    '128x128',
    '256x256',
    '512x512',
    '1024x1024',
    '2048x2048'
]
images = [
    'benchmark/128.png',
    'benchmark/256.png',
    'benchmark/512.png',
    'benchmark/1024.png',
    'benchmark/2048.png',
]

times = []

def run_benchmark():
    for img_path in images:
        img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
        
        if img is None:
            print(f"Error: Could not load {img_path}")
            continue

        print(f"Benchmarking {img_path}...")
        start = time.perf_counter()
        canny.canny_edge_detection(img, 100, 200, 3, 3)
        duration = time.perf_counter() - start
        times.append(duration)

    plt.figure(figsize=(12, 8))
    plt.plot(resolutions, times, marker='o', linestyle='-', color='b')
    for x, y in zip(resolutions, times):
        plt.annotate(f"{y:.4f}s", (x, y), textcoords="offset points", xytext=(0, 10), ha='right')

    plt.title('Execution Time based on Image Resolutions of Canny Algorithm')
    plt.xlabel('Resolution (Pixels)')
    plt.ylabel('Execution Time (Seconds)')
    plt.grid(True)
    plt.show()

if __name__ == '__main__':
    run_benchmark()