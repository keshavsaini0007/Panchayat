const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  getAllUsers, updateUserRole, deleteUser, getAnalytics,
} = require('../controllers/adminController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');

const updateRoleValidation = [
  body('role').isIn(['citizen', 'ward_member', 'gram_pradhan', 'admin']).withMessage('Invalid role'),
];

router.get('/users', protect, authorizeRoles('admin'), getAllUsers);
router.patch('/users/:id/role', protect, authorizeRoles('admin'), updateRoleValidation, updateUserRole);
router.delete('/users/:id', protect, authorizeRoles('admin'), deleteUser);
router.get('/analytics', protect, authorizeRoles('admin', 'gram_pradhan'), getAnalytics);

module.exports = router;
