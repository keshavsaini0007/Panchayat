const User = require('../models/User');
const Complaint = require('../models/Complaint');

const getAllUsers = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    const users = await User.find(filter).select('-password');
    res.status(200).json({ users });
  } catch (err) {
    next(err);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = req.body.role;
    if (req.body.role === 'ward_member' || req.body.role === 'gram_pradhan') {
      user.isVerified = true;
    }

    await user.save();

    const updated = await User.findById(user._id).select('-password');
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete yourself' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.deleteOne();
    res.status(200).json({ message: 'User deleted' });
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
        { $match: { status: 'resolved', resolvedAt: { $ne: null } } },
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
