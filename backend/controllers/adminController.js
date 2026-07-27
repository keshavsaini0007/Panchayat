const User = require('../models/User');
const Complaint = require('../models/Complaint');
const { validationResult } = require('express-validator');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');

const getAllUsers = asyncHandler(async (req, res, next) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  const users = await User.find(filter).select('-password');
  res.status(200).json(new ApiResponse(200, { users }));
});

const updateUserRole = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation failed', errors.array());
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  user.role = req.body.role;
  if (req.body.role === 'ward_member' || req.body.role === 'gram_pradhan') {
    user.isVerified = true;
  }

  await user.save();

  const updated = await User.findById(user._id).select('-password');
  res.status(200).json(new ApiResponse(200, { user: updated }));
});

const deleteUser = asyncHandler(async (req, res, next) => {
  if (req.params.id === req.user._id.toString()) {
    throw new ApiError(400, 'Cannot delete yourself');
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  await user.deleteOne();
  res.status(200).json(new ApiResponse(200, null, 'User deleted'));
});

const getAnalytics = asyncHandler(async (req, res, next) => {
  const [totalComplaints, byStatus, byCategory, byVillage, avgResolution, usersByRole] = await Promise.all([
    Complaint.countDocuments(),
    Complaint.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Complaint.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
    Complaint.aggregate([{ $group: { _id: '$village', count: { $sum: 1 } } }]),
    Complaint.aggregate([
      { $match: { status: { $in: ['resolved', 'closed'] }, resolvedAt: { $ne: null } } },
      {
        $project: {
          hours: {
            $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600000],
          },
        },
      },
      { $group: { _id: null, avg: { $avg: '$hours' } } },
    ]),
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
  ]);

  res.status(200).json(new ApiResponse(200, {
    totalComplaints,
    byStatus,
    byCategory,
    byVillage,
    avgResolutionHours: avgResolution.length > 0 ? avgResolution[0].avg : 0,
    usersByRole,
  }));
});

module.exports = { getAllUsers, updateUserRole, deleteUser, getAnalytics };
