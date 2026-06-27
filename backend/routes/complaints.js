const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();
const {
  getComplaints, getComplaintById, createComplaint, upvoteComplaint,
  addComment, getMyComplaints, deleteComplaint, updateComplaintStatus,
  getWardComplaints, getAllComplaintsAdmin, verifyComplaint, reopenComplaint,
  getVerificationHistory, getVerificationPendingComplaints, getAllAuditLogs,
} = require('../controllers/complaintController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const { upload, MAX_IMAGES } = require('../config/cloudinary');

const handleUpload = (req, res, next) => {
  const uploadMiddleware = upload.array('images', MAX_IMAGES);
  uploadMiddleware(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'Image size cannot exceed 5 MB.' });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ success: false, message: `Maximum ${MAX_IMAGES} images allowed.` });
      }
      return res.status(err.statusCode || 400).json({ success: false, message: err.message });
    }
    next();
  });
};

const createComplaintValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('category').isIn(['roads', 'bridges', 'buildings', 'water_supply', 'electricity', 'street_lights', 'garbage', 'sewage', 'drainage', 'dangerous_structures', 'open_manholes', 'scheme_delays', 'other']).withMessage('Invalid category'),
  body('ward').trim().notEmpty().withMessage('Ward is required'),
  body('village').trim().notEmpty().withMessage('Village is required'),
  body('location').notEmpty().withMessage('Location is required'),
];

const addCommentValidation = [
  body('message').trim().notEmpty().withMessage('Comment message is required'),
];

const updateStatusValidation = [
  body('status').isIn(['pending', 'approved', 'rejected', 'in_progress', 'resolved']).withMessage('Invalid status value'),
];

router.get('/', getComplaints);
router.get('/my/list', protect, getMyComplaints);
router.get('/ward/list', protect, authorizeRoles('ward_member', 'gram_pradhan', 'admin'), getWardComplaints);
router.get('/admin/all', protect, authorizeRoles('gram_pradhan', 'admin'), getAllComplaintsAdmin);
router.get('/:id', getComplaintById);

router.post('/', protect, handleUpload, createComplaintValidation, createComplaint);
router.post('/:id/upvote', protect, upvoteComplaint);
router.post('/:id/comment', protect, addCommentValidation, addComment);

router.patch('/:id/status', protect, authorizeRoles('ward_member', 'gram_pradhan', 'admin'), updateStatusValidation, updateComplaintStatus);

router.post('/:id/verify', protect, verifyComplaint);
router.post('/:id/reopen', protect, reopenComplaint);
router.get('/:id/audit', protect, getVerificationHistory);

router.get('/verification/pending', protect, getVerificationPendingComplaints);

router.get('/audit/all', protect, authorizeRoles('admin', 'gram_pradhan'), getAllAuditLogs);

router.delete('/:id', protect, deleteComplaint);

module.exports = router;
