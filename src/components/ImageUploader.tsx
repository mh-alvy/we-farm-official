import React, { useState, useRef } from 'react';
import { Upload, X, Check, Loader2, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface ImageUploaderProps {
  onUploadSuccess: (url: string) => void;
  label?: string;
  currentImageUrl?: string;
  onClear?: () => void;
  folder?: string;
}

export default function ImageUploader({
  onUploadSuccess,
  label = 'Upload Image',
  currentImageUrl,
  onClear,
  folder = 'general'
}: ImageUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WEBP, etc.)');
      return;
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB.');
      return;
    }

    setError(null);
    setProgress(0);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          const originalDataUrl = event.target?.result as string;
          const img = new Image();
          img.src = originalDataUrl;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 600;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(originalDataUrl);
              return;
            }

            ctx.drawImage(img, 0, 0, width, height);
            // Compress as JPEG at 0.7 quality to keep size tiny (<50KB)
            const compressed = canvas.toDataURL('image/jpeg', 0.7);
            resolve(compressed);
          };
          img.onerror = () => {
            resolve(originalDataUrl);
          };
        };
        reader.onerror = (err) => {
          reject(err);
        };
      });

      // Smooth progress bar simulation for realistic and polished user feedback
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 10;
        if (currentProgress >= 100) {
          clearInterval(interval);
          setProgress(100);
          setTimeout(() => {
            onUploadSuccess(dataUrl);
            setProgress(null);
          }, 150);
        } else {
          setProgress(currentProgress);
        }
      }, 30);

    } catch (err) {
      console.error("Image processing error:", err);
      setError('Upload failed. Please try again.');
      setProgress(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      {label && (
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
          {label}
        </span>
      )}
      
      {currentImageUrl ? (
        <div className="relative group aspect-video rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center">
          <img 
            src={currentImageUrl} 
            alt="Preview" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={onButtonClick}
              className="bg-white hover:bg-green-50 text-green-700 px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all"
            >
              Change Image
            </button>
            {onClear && (
              <button
                type="button"
                onClick={onClear}
                className="bg-white/25 hover:bg-red-600 text-white hover:text-white p-2 rounded-xl transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={progress === null ? onButtonClick : undefined}
          className={`relative aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center transition-all duration-200 cursor-pointer ${
            dragActive
              ? 'border-green-500 bg-green-50/50 scale-[0.98]'
              : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:border-green-300'
          }`}
        >
          {progress !== null ? (
            <div className="flex flex-col items-center space-y-3 w-full max-w-xs">
              <Loader2 className="h-8 w-8 text-green-600 animate-spin" />
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <motion.div 
                  className="bg-green-600 h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs font-bold text-green-700">{progress}% Uploaded</span>
            </div>
          ) : (
            <>
              <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 mb-3 text-gray-400 group-hover:text-green-600 transition-colors">
                <Upload className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold text-gray-700">
                Drag & drop your image, or <span className="text-green-600 hover:underline">browse</span>
              </p>
              <p className="text-[10px] text-gray-400 mt-1">
                Supports PNG, JPG, WEBP (Max 10MB)
              </p>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={handleChange}
      />

      {error && (
        <p className="text-xs text-red-500 font-medium mt-1">{error}</p>
      )}
    </div>
  );
}
