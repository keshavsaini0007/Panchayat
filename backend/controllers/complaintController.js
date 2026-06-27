const Complaint = require('../models/Complaint');
const Comment = require('../models/Comment');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const { cloudinary, MAX_IMAGES, MAX_FILE_SIZE } = require('../config/cloudinary');
const { sendVerificationEmail } = require('../utils/emailService');
const { validationResult } = require('express-validator');

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const createComplaint = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { title, description, category, ward, village } = req.body;
    if (!req.body.location) {
      return res.status(400).json({ success: false, message: 'Location is required' });
    }
    const location = JSON.parse(req.body.location);

    const images = [];
    if (req.files) {
      for (const file of req.files) {
        if (!ALLOWED_TYPES.includes(file.mimetype)) {
          await cloudinary.uploader.destroy(file.filename);
          return res.status(400).json({ success: false, message: `"${file.originalname}": Only JPG, PNG and WEBP images are allowed.` });
        }
        if (file.size > MAX_FILE_SIZE) {
          await cloudinary.uploader.destroy(file.filename);
          return res.status(400).json({ success: false, message: `"${file.originalname}": Image size cannot exceed 5 MB.` });
        }
        images.push(file.path);
      }
      if (images.length > MAX_IMAGES) {
        for (const url of images) {
          const segments = url.split('/upload/');
          if (segments.length > 1) {
            const publicId = segments[1].split('.')[0];
            await cloudinary.uploader.destroy(publicId);
          }
        }
        return res.status(400).json({ success: false, message: `Maximum ${MAX_IMAGES} images allowed.` });
      }
    }

    const complaint = await Complaint.create({
      title, description, category, ward, village, location, images,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, complaint });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: 'Validation failed', errors: messages });
    }
    if (err instanceof SyntaxError) {
      return res.status(400).json({ success: false, message: 'Invalid location data' });
    }
    next(err);
  }
};

const getComplaints = async (req, res, next) => {
  try {
    const { village, ward, status, category } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    const filter = {};
    if (village) filter.village = village;
    if (ward) filter.ward = ward;
    if (status) filter.status = status;
    if (category) filter.category = category;

    const totalCount = await Complaint.countDocuments(filter);
    const complaints = await Complaint.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email')
      .populate('resolvedBy', 'name role');

    res.status(200).json({ success: true, complaints, totalCount, page, pages: Math.ceil(totalCount / limit) });
  } catch (err) {
    next(err);
  }
};

const getComplaintById = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('resolvedBy', 'name role')
      .populate('assignedTo', 'name role');

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const comments = await Comment.find({ complaintId: req.params.id })
      .populate('userId', 'name role');

    res.status(200).json({ success: true, complaint, comments });
  } catch (err) {
    next(err);
  }
};

const upvoteComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const userId = req.user._id;
    const alreadyUpvoted = complaint.upvotes.some((id) => id.equals(userId));

    if (alreadyUpvoted) {
      complaint.upvotes.pull(userId);
      await complaint.save();
      return res.status(200).json({ success: true, message: 'Upvote removed', upvoteCount: complaint.upvotes.length });
    } else {
      complaint.upvotes.push(userId);
      await complaint.save();
      return res.status(200).json({ success: true, message: 'Upvote added', upvoteCount: complaint.upvotes.length });
    }
  } catch (err) {
    next(err);
  }
};

const addComment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { message } = req.body;
    const isOfficial = ['ward_member', 'gram_pradhan'].includes(req.user.role);

    let comment = await Comment.create({
      complaintId: req.params.id,
      userId: req.user._id,
      message,
      isOfficial,
    });

    comment = await comment.populate('userId', 'name role');

    res.status(201).json({ success: true, comment });
  } catch (err) {
    next(err);
  }
};

const getMyComplaints = async (req, res, next) => {
  try {
    const complaints = await Complaint.find({ createdBy: req.user._id })
      .populate('resolvedBy', 'name role')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, complaints });
  } catch (err) {
    next(err);
  }
};

const updateComplaintStatus = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { status, rejectionReason, assignedTo, resolutionRemarks, resolutionImages } = req.body;
    const validStatuses = ['pending', 'approved', 'rejected', 'in_progress', 'resolved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    if (status === 'rejected' && !rejectionReason) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    if (status === 'closed' || status === 'citizen_verification_pending') {
      return res.status(400).json({ success: false, message: 'Status cannot be set directly. Use citizen verification flow.' });
    }

    if (status === 'resolved') {
      const previousStatus = complaint.status;
      complaint.resolvedBy = req.user._id;
      complaint.resolvedAt = Date.now();
      complaint.resolutionRemarks = resolutionRemarks || '';
      if (resolutionImages) complaint.resolutionImages = resolutionImages;
      complaint.status = 'citizen_verification_pending';

      await complaint.save();

      const populated = await Complaint.findById(complaint._id)
        .populate('createdBy', 'name email')
        .populate('resolvedBy', 'name role')
        .populate('assignedTo', 'name role');

      await AuditLog.create({
        complaintId: complaint._id,
        userId: req.user._id,
        role: req.user.role,
        action: 'complaint_resolved',
        metadata: { resolutionRemarks, previousStatus },
      });

      const citizen = populated.createdBy;
      if (citizen) {
        await Notification.create({
          userId: citizen._id,
          complaintId: complaint._id,
          type: 'citizen_verification',
          message: 'Your complaint has been marked as resolved by the Panchayat. Please verify whether the issue has actually been resolved.',
        });

        if (citizen.email) {
          sendVerificationEmail(
            citizen.email,
            citizen.name,
            complaint.title,
            complaint._id,
            complaint.village,
          );
        }
      }

      return res.status(200).json({ success: true, complaint: populated });
    }

    complaint.status = status;
    if (rejectionReason) complaint.rejectionReason = rejectionReason;
    if (assignedTo) complaint.assignedTo = assignedTo;

    await complaint.save();

    const populated = await Complaint.findById(complaint._id)
      .populate('createdBy', 'name email')
      .populate('resolvedBy', 'name role')
      .populate('assignedTo', 'name role');

    res.status(200).json({ success: true, complaint: populated });
  } catch (err) {
    next(err);
  }
};

const verifyComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    if (!['citizen_verification_pending', 'awaiting_citizen_response'].includes(complaint.status)) {
      return res.status(400).json({ success: false, message: 'Complaint is not pending citizen verification' });
    }

    if (!complaint.createdBy.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the complaint creator can verify resolution' });
    }

    complaint.status = 'closed';
    complaint.verifiedByCitizen = true;
    complaint.verifiedAt = Date.now();
    complaint.closedAutomatically = false;

    await complaint.save();

    await AuditLog.create({
      complaintId: complaint._id,
      userId: req.user._id,
      role: req.user.role,
      action: 'citizen_verified',
      metadata: { complaintId: complaint._id, verifiedAt: complaint.verifiedAt },
    });

    const populated = await Complaint.findById(complaint._id)
      .populate('createdBy', 'name email')
      .populate('resolvedBy', 'name role')
      .populate('assignedTo', 'name role');

    res.status(200).json({ success: true, message: 'Complaint closed successfully', complaint: populated });
  } catch (err) {
    next(err);
  }
};

const reopenComplaint = async (req, res, next) => {
  try {
    const { citizenFeedback } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    if (!['citizen_verification_pending', 'awaiting_citizen_response'].includes(complaint.status)) {
      return res.status(400).json({ success: false, message: 'Complaint is not pending citizen verification' });
    }

    if (!complaint.createdBy.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the complaint creator can reject resolution' });
    }

    complaint.status = 'reopened';
    complaint.citizenFeedback = citizenFeedback || '';
    complaint.verifiedByCitizen = false;

    await complaint.save();

    await AuditLog.create({
      complaintId: complaint._id,
      userId: req.user._id,
      role: req.user.role,
      action: 'citizen_rejected',
      metadata: { citizenFeedback },
    });

    await AuditLog.create({
      complaintId: complaint._id,
      userId: req.user._id,
      role: req.user.role,
      action: 'complaint_reopened',
      metadata: { citizenFeedback },
    });

    const wardMembers = await User.find({
      ward: complaint.ward,
      role: { $in: ['ward_member', 'gram_pradhan'] },
    });

    for (const official of wardMembers) {
      await Notification.create({
        userId: official._id,
        complaintId: complaint._id,
        type: 'complaint_reopened',
        message: `Complaint "${complaint.title}" has been reopened by the citizen for further action. Reason: ${citizenFeedback || 'Issue still exists'}`,
      });
    }

    const populated = await Complaint.findById(complaint._id)
      .populate('createdBy', 'name email')
      .populate('resolvedBy', 'name role')
      .populate('assignedTo', 'name role');

    res.status(200).json({ success: true, message: 'Complaint reopened for further action', complaint: populated });
  } catch (err) {
    next(err);
  }
};

const getVerificationHistory = async (req, res, next) => {
  try {
    const auditLogs = await AuditLog.find({ complaintId: req.params.id })
      .populate('userId', 'name role')
      .sort({ timestamp: -1 });
    res.status(200).json({ success: true, auditLogs });
  } catch (err) {
    next(err);
  }
};

const getVerificationPendingComplaints = async (req, res, next) => {
  try {
    const complaints = await Complaint.find({
      createdBy: req.user._id,
      status: { $in: ['citizen_verification_pending', 'awaiting_citizen_response'] },
    })
      .populate('resolvedBy', 'name role')
      .sort({ updatedAt: -1 });
    res.status(200).json({ success: true, complaints });
  } catch (err) {
    next(err);
  }
};

const getAllAuditLogs = async (req, res, next) => {
  try {
    const { complaintId } = req.query;
    const filter = {};
    if (complaintId) filter.complaintId = complaintId;
    const auditLogs = await AuditLog.find(filter)
      .populate('userId', 'name role')
      .populate('complaintId', 'title')
      .sort({ timestamp: -1 });
    res.status(200).json({ success: true, auditLogs });
  } catch (err) {
    next(err);
  }
};

const getWardComplaints = async (req, res, next) => {
  try {
    const { status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    const filter = { ward: req.user.ward };
    if (status) filter.status = status;

    const totalCount = await Complaint.countDocuments(filter);
    const complaints = await Complaint.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email')
      .populate('resolvedBy', 'name role');

    res.status(200).json({ success: true, complaints, totalCount, page, pages: Math.ceil(totalCount / limit) });
  } catch (err) {
    next(err);
  }
};

const getAllComplaintsAdmin = async (req, res, next) => {
  try {
    const { status, category, village, ward } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (village) filter.village = village;
    if (ward) filter.ward = ward;

    const totalCount = await Complaint.countDocuments(filter);
    const complaints = await Complaint.find(filter)
      .sort({ upvoteCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email')
      .populate('resolvedBy', 'name role')
      .populate('assignedTo', 'name role');

    res.status(200).json({ success: true, complaints, totalCount, page, pages: Math.ceil(totalCount / limit) });
  } catch (err) {
    next(err);
  }
};

const deleteComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const isOwner = complaint.createdBy.equals(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this complaint' });
    }

    for (const url of complaint.images) {
      const segments = url.split('/upload/');
      if (segments.length > 1) {
        const publicId = segments[1].split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      }
    }

    await Comment.deleteMany({ complaintId: complaint._id });
    await complaint.deleteOne();

    res.status(200).json({ success: true, message: 'Complaint deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { createComplaint, getComplaints, getComplaintById, upvoteComplaint, addComment, getMyComplaints, updateComplaintStatus, getWardComplaints, getAllComplaintsAdmin, deleteComplaint, verifyComplaint, reopenComplaint, getVerificationHistory, getVerificationPendingComplaints, getAllAuditLogs };
