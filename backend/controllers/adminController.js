const User = require('../models/User');
const Complaint = require('../models/Complaint');
const { validationResult } = require('express-validator');

const getAllUsers = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    const users = await User.find(filter).select('-password');
    res.status(200).json({ success: true, users });
  } catch (err) {
    next(err);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.role = req.body.role;
    if (req.body.role === 'ward_member' || req.body.role === 'gram_pradhan') {
      user.isVerified = true;
    }

    await user.save();

    const updated = await User.findById(user._id).select('-password');
    res.status(200).json({ success: true, user: updated });
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await user.deleteOne();
    res.status(200).json({ success: true, message: 'User deleted' });
  } catch (err) {
    next(err);
  }
};

const getAnalytics = async (req, res, next) => {
  try {
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

    res.status(200).json({
      success: true,
      totalComplaints,
      byStatus,
      byCategory,
      byVillage,
      avgResolutionHours: avgResolution.length > 0 ? avgResolution[0].avg : 0,
      usersByRole,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllUsers, updateUserRole, deleteUser, getAnalytics };
