import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { isBase64Image } from '../../lib/firebase';

interface ImageDisplayProps {
  src: string;
  alt: string;
  className?: string;
  showStorageIndicator?: boolean;
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({
  src,
  alt,
  className = '',
  showStorageIndicator = false
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageSrc, setImageSrc] = useState<string>('');

  useEffect(() => {
    if (!src) {
      setImageLoading(false);
      return;
    }

    setImageError(false);
    setImageLoading(true);

    // Handle base64 images
    if (isBase64Image(src)) {
      // Validate base64 format
      if (src.includes(',') && src.startsWith('data:image/')) {
        setImageSrc(src);
        setImageLoading(false);
      } else {
        console.error('Invalid base64 image format');
        setImageError(true);
        setImageLoading(false);
      }
      return;
    }

    // Handle regular URLs
    const img = new Image();
    img.onload = () => {
      setImageSrc(src);
      setImageLoading(false);
    };
    img.onerror = () => {
      console.error('Failed to load image:', src);
      setImageError(true);
      setImageLoading(false);
    };
    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  if (imageLoading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-700 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <span className="text-sm text-gray-500">Loading image...</span>
        </div>
      </div>
    );
  }

  if (imageError || !src) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-700 ${className}`}>
        <div className="text-center">
          <AlertCircle size={32} className="mx-auto text-gray-400 mb-2" />
          <span className="text-sm text-gray-500">No image available</span>
        </div>
      </div>
    );
  }

  const isBase64 = isBase64Image(imageSrc);

  return (
    <div className={`relative ${className}`}>
      <img
        src={imageSrc}
        alt={alt}
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
      />
      
      {showStorageIndicator && (
        <div className="absolute top-2 right-2">
          <div className={`p-1 rounded-full ${
            isBase64 
              ? 'bg-orange-500 text-white' 
              : 'bg-green-500 text-white'
          }`}>
            {isBase64 ? <WifiOff size={12} /> : <Wifi size={12} />}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageDisplay;