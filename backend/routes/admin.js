const express = require('express');
const router = express.Router();
const {
  getAllUsers, updateUserRole, deleteUser, getAnalytics,
} = require('../controllers/adminController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

router.get('/users', protect, authorizeRoles('admin'), getAllUsers);
router.patch('/users/:id/role', protect, authorizeRoles('admin'), updateUserRole);
router.delete('/users/:id', protect, authorizeRoles('admin'), deleteUser);
router.get('/analytics', protect, authorizeRoles('admin', 'gram_pradhan'), getAnalytics);

module.exports = router;
