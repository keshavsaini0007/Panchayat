const Notification = require('../models/Notification');

const getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .populate('complaintId', 'title status')
      .sort({ createdAt: -1 });
    const unreadCount = notifications.filter((n) => !n.read).length;
    res.status(200).json({ success: true, notifications, unreadCount });
  } catch (err) {
    next(err);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    if (!notification.userId.equals(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    notification.read = true;
    await notification.save();
    res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMyNotifications, markAsRead, markAllAsRead };
