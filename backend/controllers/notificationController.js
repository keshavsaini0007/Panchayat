const Notification = require('../models/Notification');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');

const getMyNotifications = asyncHandler(async (req, res, next) => {
  const notifications = await Notification.find({ userId: req.user._id })
    .populate('complaintId', 'title status')
    .sort({ createdAt: -1 });
  const unreadCount = notifications.filter((n) => !n.read).length;
  res.status(200).json(new ApiResponse(200, { notifications, unreadCount }));
});

const markAsRead = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findById(req.params.id);
  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }
  if (!notification.userId.equals(req.user._id) && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized');
  }
  notification.read = true;
  await notification.save();
  res.status(200).json(new ApiResponse(200, null, 'Notification marked as read'));
});

const markAllAsRead = asyncHandler(async (req, res, next) => {
  await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
  res.status(200).json(new ApiResponse(200, null, 'All notifications marked as read'));
});

module.exports = { getMyNotifications, markAsRead, markAllAsRead };
