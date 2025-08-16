// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence, doc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Debug environment variables (only in development)
if (import.meta.env.MODE === 'development') {
  console.log('Environment check:', {
    NODE_ENV: import.meta.env.MODE,
    hasApiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
    hasAuthDomain: !!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    hasProjectId: !!import.meta.env.VITE_FIREBASE_PROJECT_ID
  });
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCnR5SMrO8vhO1lEPRx1Ctg6gxyhYfVMp0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "store-b8644.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "store-b8644",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "store-b8644.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "353628807781",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:353628807781:web:950616402c6e1157729c8c",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-YL7NLQBLG9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Enhanced offline persistence with connection state tracking
let persistenceEnabled = false;

const setupPersistence = async () => {
  try {
    // Only enable persistence in browser environment
    if (typeof window !== 'undefined') {
      await enableIndexedDbPersistence(db, { 
        forceOwnership: true 
      });
      persistenceEnabled = true;
      if (import.meta.env.MODE === 'development') {
        console.log('Offline persistence enabled');
      }
    }
  } catch (err) {
    if (typeof err === 'object' && err !== null && 'code' in err) {
      const code = (err as { code: string }).code;
      if (code === 'failed-precondition') {
        if (import.meta.env.MODE === 'development') {
          console.warn('Persistence failed: Multiple tabs open');
        }
      } else if (code === 'unimplemented') {
        if (import.meta.env.MODE === 'development') {
          console.warn('Persistence not available in this browser');
        }
      }
    }
    persistenceEnabled = false;
  }
};

// Fast and reliable image compression
export const compressImage = (file: File, maxWidth: number = 600, quality: number = 0.8): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      try {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width = (width * maxWidth) / height;
            height = maxWidth;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Clear canvas and draw image with optimized settings
        if (ctx) {
          ctx.clearRect(0, 0, width, height);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
        }
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    // Create object URL for faster loading
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
  });
};

// Optimized base64 conversion with size limit
export const convertToBase64 = (file: File, maxSizeKB: number = 500): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Check file size before conversion
    if (file.size > maxSizeKB * 1024) {
      reject(new Error(`File too large for local storage (max ${maxSizeKB}KB)`));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Validate base64 format
        if (reader.result.startsWith('data:image/')) {
          resolve(reader.result);
        } else {
          reject(new Error('Invalid image format'));
        }
      } else {
        reject(new Error('Failed to convert to base64'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

// Streamlined upload function with better error handling
export const uploadCompressedImage = async (file: File, path: string): Promise<string> => {
  try {
    // First, compress the image for faster upload
    const compressedFile = await compressImage(file, 600, 0.75);
    console.log(`Compressed: ${(file.size / 1024).toFixed(1)}KB → ${(compressedFile.size / 1024).toFixed(1)}KB`);

    // Try Firebase Storage upload first
    try {
      const storageRef = ref(storage, path);
      
      const metadata = {
        contentType: 'image/jpeg',
        cacheControl: 'public,max-age=3600',
        customMetadata: {
          'uploaded-by': 'frame-management-app',
          'upload-timestamp': Date.now().toString()
        }
      };
      
      const snapshot = await uploadBytes(storageRef, compressedFile, metadata);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      
      console.log('Firebase upload successful');
      return downloadUrl;
      
    } catch (uploadError) {
      console.warn('Firebase upload failed, using local storage:', uploadError);
      
      // Fallback to base64 with smaller size limit for local storage
      const base64Data = await convertToBase64(compressedFile, 300);
      console.log('Base64 fallback successful');
      return base64Data;
    }
    
  } catch (error) {
    console.error('Image processing failed:', error);
    throw new Error('Failed to process image. Please try a smaller image file.');
  }
};

// Utility to check if URL is base64 data
export const isBase64Image = (url: string): boolean => {
  return url && url.startsWith('data:image/');
};

// Utility to get file size from base64
export const getBase64Size = (base64: string): number => {
  if (!base64 || !base64.includes(',')) return 0;
  const base64Length = base64.length - (base64.indexOf(',') + 1);
  return Math.round(base64Length * 0.75);
};

// Create optimized image preview URL
export const createPreviewUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      try {
        // Create small preview (200x200 max)
        const maxSize = 200;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
        }
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const previewUrl = URL.createObjectURL(blob);
              resolve(previewUrl);
            } else {
              reject(new Error('Failed to create preview'));
            }
          },
          'image/jpeg',
          0.7
        );
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

// Track Firestore connection state
export const getFirestoreStatus = () => {
  return new Promise((resolve) => {
    const unsubscribe = db.onSnapshot(
      doc(db, 'connection/status'), 
      () => {
        unsubscribe();
        resolve(true);
      },
      (err) => {
        console.log('Connection error:', err);
        resolve(false);
      }
    );
  });
};

setupPersistence();

export default app;