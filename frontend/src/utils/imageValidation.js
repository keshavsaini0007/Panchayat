const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGES = 5;

export const validateImageFile = (file) => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Only JPG, PNG and WEBP images are allowed.' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'Image size cannot exceed 5 MB.' };
  }
  return { valid: true };
};

export const validateImageCount = (currentCount, newCount) => {
  if (currentCount + newCount > MAX_IMAGES) {
    return { valid: false, error: `Maximum ${MAX_IMAGES} images allowed.` };
  }
  return { valid: true };
};

export { ALLOWED_TYPES, MAX_FILE_SIZE, MAX_IMAGES };
