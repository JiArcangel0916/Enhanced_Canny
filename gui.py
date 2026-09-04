import tkinter as tk
from tkinter import filedialog, ttk
import os
import glob
import cv2
import threading
from nativeCanny import canny_edge_detection, rgb_to_gray, save_image

class CannyGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Native Canny Edge Detection")
        
        # Test Mode Variable
        self.test_mode_var = tk.BooleanVar(value=True)
        
        # UI Elements
        frame = ttk.Frame(root, padding="10")
        frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Test mode toggle
        ttk.Checkbutton(frame, text="Test Mode (creates new test folders)", variable=self.test_mode_var).grid(row=0, column=0, columnspan=2, pady=5, sticky=tk.W)
        
        # Parameters
        ttk.Label(frame, text="Low Threshold:").grid(row=1, column=0, sticky=tk.W)
        self.low_thresh = tk.Scale(frame, from_=0, to=255, orient=tk.HORIZONTAL)
        self.low_thresh.set(100)
        self.low_thresh.grid(row=1, column=1, sticky=(tk.W, tk.E))
        
        ttk.Label(frame, text="High Threshold:").grid(row=2, column=0, sticky=tk.W)
        self.high_thresh = tk.Scale(frame, from_=0, to=255, orient=tk.HORIZONTAL)
        self.high_thresh.set(200)
        self.high_thresh.grid(row=2, column=1, sticky=(tk.W, tk.E))
        
        ttk.Label(frame, text="Gaussian Kernel:").grid(row=3, column=0, sticky=tk.W)
        self.gaussian_k = ttk.Combobox(frame, values=[3, 5, 7, 9], state="readonly")
        self.gaussian_k.set(5)
        self.gaussian_k.grid(row=3, column=1, sticky=(tk.W, tk.E))
        
        ttk.Label(frame, text="Sobel Kernel:").grid(row=4, column=0, sticky=tk.W)
        self.sobel_k = ttk.Combobox(frame, values=[3, 5], state="readonly")
        self.sobel_k.set(3)
        self.sobel_k.grid(row=4, column=1, sticky=(tk.W, tk.E))
        
        # Buttons
        btn_frame = ttk.Frame(frame)
        btn_frame.grid(row=5, column=0, columnspan=2, pady=10)
        
        ttk.Button(btn_frame, text="Single Image (From Datasets)", command=lambda: self.process_single(from_datasets=True)).grid(row=0, column=0, padx=5, pady=2)
        ttk.Button(btn_frame, text="Single Image (Anywhere)", command=lambda: self.process_single(from_datasets=False)).grid(row=0, column=1, padx=5, pady=2)
        
        ttk.Button(btn_frame, text="Batch Folder (From Datasets)", command=lambda: self.process_batch(from_datasets=True)).grid(row=1, column=0, padx=5, pady=2)
        ttk.Button(btn_frame, text="Batch Folder (Anywhere)", command=lambda: self.process_batch(from_datasets=False)).grid(row=1, column=1, padx=5, pady=2)
        
        # Log
        self.log_text = tk.Text(frame, height=10, width=50, state=tk.DISABLED)
        self.log_text.grid(row=6, column=0, columnspan=2, pady=5)
        
    def log(self, message):
        self.log_text.config(state=tk.NORMAL)
        self.log_text.insert(tk.END, message + "\n")
        self.log_text.see(tk.END)
        self.log_text.config(state=tk.DISABLED)
        self.root.update()

    def get_output_dir(self):
        base_outputs = "outputs"
        os.makedirs(base_outputs, exist_ok=True)
        
        if self.test_mode_var.get():
            # Find next test folder
            test_dirs = [d for d in os.listdir(base_outputs) if d.startswith("test") and os.path.isdir(os.path.join(base_outputs, d))]
            max_num = 0
            for d in test_dirs:
                try:
                    num = int(d.replace("test", ""))
                    if num > max_num:
                        max_num = num
                except:
                    pass
            new_dir = os.path.join(base_outputs, f"test{max_num + 1}")
        else:
            new_dir = os.path.join(base_outputs, "draft images")
            
        os.makedirs(new_dir, exist_ok=True)
        return new_dir

    def run_algorithm(self, image_path, out_dir):
        try:
            self.log(f"Processing: {os.path.basename(image_path)}")
            img = cv2.imread(image_path)
            if img is None:
                self.log(f"Error: Could not read {image_path}")
                return
                
            if len(img.shape) == 3:
                img = rgb_to_gray(img)
                
            base_name = os.path.splitext(os.path.basename(image_path))[0] + "_"
            
            # Save grayscale
            save_image(img, os.path.join(out_dir, f"{base_name}1-grayscale.jpg"))
            
            lt = self.low_thresh.get()
            ht = self.high_thresh.get()
            gk = int(self.gaussian_k.get())
            sk = int(self.sobel_k.get())
            
            edge_img = canny_edge_detection(img, lt, ht, gk, sk, output_dir=out_dir, base_name=base_name)
            save_image(edge_img, os.path.join(out_dir, f"{base_name}5-final_output.jpg"))
            self.log("Done.\n")
        except Exception as e:
            self.log(f"Error processing {image_path}: {e}\n")

    def process_single(self, from_datasets=False):
        init_dir = os.path.join(os.getcwd(), "Datasets") if from_datasets else os.getcwd()
        file_path = filedialog.askopenfilename(initialdir=init_dir, filetypes=[("Image files", "*.jpg *.jpeg *.png *.bmp")])
        if not file_path:
            return
            
        out_dir = self.get_output_dir()
        self.log(f"Output Directory: {out_dir}")
        
        def task():
            self.run_algorithm(file_path, out_dir)
            self.log("=== Finished ===")
            
        threading.Thread(target=task).start()

    def process_batch(self, from_datasets=False):
        init_dir = os.path.join(os.getcwd(), "Datasets") if from_datasets else os.getcwd()
        dir_path = filedialog.askdirectory(initialdir=init_dir)
        if not dir_path:
            return
            
        out_dir = self.get_output_dir()
        self.log(f"Output Directory: {out_dir}")
        
        def task():
            valid_exts = {".jpg", ".jpeg", ".png", ".bmp"}
            files = [os.path.join(dir_path, f) for f in os.listdir(dir_path) if os.path.splitext(f)[1].lower() in valid_exts]
            self.log(f"Found {len(files)} images.")
            for f in files:
                self.run_algorithm(f, out_dir)
            self.log("=== Batch Finished ===")
            
        threading.Thread(target=task).start()

if __name__ == "__main__":
    root = tk.Tk()
    app = CannyGUI(root)
    root.mainloop()
