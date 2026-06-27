const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGES = 5;
const MAX_DIMENSION = 4096;
const MIN_DIMENSION = 50;

export const validateImageFile = (file) => {
  if (!file) return { valid: false, error: 'No file provided.' };
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Only JPG, PNG and WEBP images are allowed.' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'Image size cannot exceed 5 MB.' };
  }
  if (file.size === 0) {
    return { valid: false, error: 'File is empty.' };
  }
  return { valid: true };
};

export const validateImageDimensions = (file) => {
  return new Promise((resolve) => {
    if (!file) return resolve({ valid: false, error: 'No file provided.' });
    if (file.type.startsWith('image/svg')) return resolve({ valid: true });

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
        resolve({ valid: false, error: `Image dimensions (${img.width}x${img.height}) exceed maximum (${MAX_DIMENSION}x${MAX_DIMENSION}).` });
      } else if (img.width < MIN_DIMENSION || img.height < MIN_DIMENSION) {
        resolve({ valid: false, error: `Image dimensions (${img.width}x${img.height}) are too small. Minimum is ${MIN_DIMENSION}px.` });
      } else {
        resolve({ valid: true, width: img.width, height: img.height });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ valid: false, error: 'Failed to load image. File may be corrupted.' });
    };

    img.src = url;
  });
};

export const validateImageCount = (currentCount, newCount) => {
  if (currentCount + newCount > MAX_IMAGES) {
    return { valid: false, error: `Maximum ${MAX_IMAGES} images allowed.` };
  }
  return { valid: true };
};

export { ALLOWED_TYPES, MAX_FILE_SIZE, MAX_IMAGES };
