const express = require('express');
const router = express.Router();
const {
  getComplaints, getComplaintById, createComplaint, upvoteComplaint,
  addComment, getMyComplaints, deleteComplaint, updateComplaintStatus,
  getWardComplaints, getAllComplaintsAdmin,
} = require('../controllers/complaintController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const { upload, MAX_IMAGES } = require('../config/cloudinary');

const handleUpload = (req, res, next) => {
  const uploadMiddleware = upload.array('images', MAX_IMAGES);
  uploadMiddleware(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Image size cannot exceed 5 MB.' });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ message: `Maximum ${MAX_IMAGES} images allowed.` });
      }
      return res.status(err.statusCode || 400).json({ message: err.message });
    }
    next();
  });
};

router.get('/', getComplaints);
router.get('/my/list', protect, getMyComplaints);
router.get('/ward/list', protect, authorizeRoles('ward_member', 'gram_pradhan', 'admin'), getWardComplaints);
router.get('/admin/all', protect, authorizeRoles('gram_pradhan', 'admin'), getAllComplaintsAdmin);
router.get('/:id', getComplaintById);

router.post('/', protect, handleUpload, createComplaint);
router.post('/:id/upvote', protect, upvoteComplaint);
router.post('/:id/comment', protect, addComment);

router.patch('/:id/status', protect, authorizeRoles('ward_member', 'gram_pradhan', 'admin'), updateComplaintStatus);

router.delete('/:id', protect, deleteComplaint);

module.exports = router;
