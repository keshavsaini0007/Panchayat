import imageCompression from 'browser-image-compression';

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
};

export const compressImage = async (file) => {
  if (!file.type.startsWith('image/')) return file;
  return imageCompression(file, COMPRESSION_OPTIONS);
};
