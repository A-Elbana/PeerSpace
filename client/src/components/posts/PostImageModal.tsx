import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

type FileLike = { File?: { secure_url?: string } };

interface Props {
  images: FileLike[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function PostImageModal({ images, initialIndex = 0, isOpen, onClose }: Props) {
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(initialIndex);

  if (!isOpen) return null;

  const goToPrevImage = () => setCurrentImageIndex(i => (i > 0 ? i - 1 : images.length - 1));
  const goToNextImage = () => setCurrentImageIndex(i => (i < images.length - 1 ? i + 1 : 0));

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div
        className="relative max-w-4xl w-full max-h-[calc(100vh-4rem)] flex flex-col overflow-hidden rounded-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <div className="relative flex-1 min-h-0 flex items-center justify-center overflow-auto p-4">
            <img
              src={images[currentImageIndex]?.File?.secure_url}
              alt={`image-${currentImageIndex}`}
              className="max-w-full max-h-[calc(100vh-8rem)] object-contain"
            />
          </div>
        </div>

        {images.length > 1 && (
          <>
            <button onClick={(e: any) => { e.stopPropagation(); goToPrevImage(); }} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 z-20">
              <ChevronLeft size={24} />
            </button>
            <button onClick={(e: any) => { e.stopPropagation(); goToNextImage(); }} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 z-20">
              <ChevronRight size={24} />
            </button>
            <div className="flex justify-center gap-1 mt-4 pb-4">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e: any) => { e.stopPropagation(); setCurrentImageIndex(idx); }}
                  className={`w-2 h-2 rounded-full transition-all ${idx === currentImageIndex ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/70'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      {/* close button placed outside image at top-left */}
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full z-30"
          aria-label="Close image preview"
        >
          <X size={24} />
        </button>
      {/* backdrop click closes and uses parent's navigateOnClose flag */}
      <button className="absolute inset-0 w-full h-full" aria-hidden onClick={(e) => { e.stopPropagation(); onClose(); }} />
    </div>
  );
}
