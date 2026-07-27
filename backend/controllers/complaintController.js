const Complaint = require('../models/Complaint');
const Comment = require('../models/Comment');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const { cloudinary, MAX_IMAGES, MAX_FILE_SIZE } = require('../config/cloudinary');
const { sendVerificationEmail } = require('../utils/emailService');
const { validationResult } = require('express-validator');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const createComplaint = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation failed', errors.array());
  }

  const { title, description, category, ward, village } = req.body;
  if (!req.body.location) {
    throw new ApiError(400, 'Location is required');
  }

  let location;
  try {
    location = JSON.parse(req.body.location);
  } catch {
    throw new ApiError(400, 'Invalid location data');
  }

  const images = [];
  if (req.files) {
    for (const file of req.files) {
      if (!ALLOWED_TYPES.includes(file.mimetype)) {
        await cloudinary.uploader.destroy(file.filename);
        throw new ApiError(400, `"${file.originalname}": Only JPG, PNG and WEBP images are allowed.`);
      }
      if (file.size > MAX_FILE_SIZE) {
        await cloudinary.uploader.destroy(file.filename);
        throw new ApiError(400, `"${file.originalname}": Image size cannot exceed 5 MB.`);
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
      throw new ApiError(400, `Maximum ${MAX_IMAGES} images allowed.`);
    }
  }

  const complaint = await Complaint.create({
    title, description, category, ward, village, location, images,
    createdBy: req.user._id,
  });

  res.status(201).json(new ApiResponse(201, { complaint }, 'Complaint created successfully'));
});

const getComplaints = asyncHandler(async (req, res, next) => {
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

  res.status(200).json(new ApiResponse(200, { complaints, totalCount, page, pages: Math.ceil(totalCount / limit) }));
});

const getComplaintById = asyncHandler(async (req, res, next) => {
  const complaint = await Complaint.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('resolvedBy', 'name role')
    .populate('assignedTo', 'name role');

  if (!complaint) {
    throw new ApiError(404, 'Complaint not found');
  }

  const comments = await Comment.find({ complaintId: req.params.id })
    .populate('userId', 'name role');

  res.status(200).json(new ApiResponse(200, { complaint, comments }));
});

const upvoteComplaint = asyncHandler(async (req, res, next) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    throw new ApiError(404, 'Complaint not found');
  }

  const userId = req.user._id;
  const alreadyUpvoted = complaint.upvotes.some((id) => id.equals(userId));

  if (alreadyUpvoted) {
    complaint.upvotes.pull(userId);
    await complaint.save();
    return res.status(200).json(new ApiResponse(200, { upvoteCount: complaint.upvotes.length }, 'Upvote removed'));
  } else {
    complaint.upvotes.push(userId);
    await complaint.save();
    return res.status(200).json(new ApiResponse(200, { upvoteCount: complaint.upvotes.length }, 'Upvote added'));
  }
});

const addComment = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation failed', errors.array());
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

  res.status(201).json(new ApiResponse(201, { comment }, 'Comment added'));
});

const getMyComplaints = asyncHandler(async (req, res, next) => {
  const complaints = await Complaint.find({ createdBy: req.user._id })
    .populate('resolvedBy', 'name role')
    .sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(200, { complaints }));
});

const updateComplaintStatus = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation failed', errors.array());
  }

  const { status, rejectionReason, assignedTo, resolutionRemarks, resolutionImages } = req.body;
  const validStatuses = ['pending', 'approved', 'rejected', 'in_progress', 'resolved'];
  if (!validStatuses.includes(status)) {
    throw new ApiError(400, 'Invalid status value');
  }

  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    throw new ApiError(404, 'Complaint not found');
  }

  if (status === 'rejected' && !rejectionReason) {
    throw new ApiError(400, 'Rejection reason is required');
  }

  if (status === 'closed' || status === 'citizen_verification_pending') {
    throw new ApiError(400, 'Status cannot be set directly. Use citizen verification flow.');
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

    return res.status(200).json(new ApiResponse(200, { complaint: populated }));
  }

  complaint.status = status;
  if (rejectionReason) complaint.rejectionReason = rejectionReason;
  if (assignedTo) complaint.assignedTo = assignedTo;

  await complaint.save();

  const populated = await Complaint.findById(complaint._id)
    .populate('createdBy', 'name email')
    .populate('resolvedBy', 'name role')
    .populate('assignedTo', 'name role');

  res.status(200).json(new ApiResponse(200, { complaint: populated }));
});

const verifyComplaint = asyncHandler(async (req, res, next) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    throw new ApiError(404, 'Complaint not found');
  }

  if (!['citizen_verification_pending', 'awaiting_citizen_response'].includes(complaint.status)) {
    throw new ApiError(400, 'Complaint is not pending citizen verification');
  }

  if (!complaint.createdBy.equals(req.user._id)) {
    throw new ApiError(403, 'Only the complaint creator can verify resolution');
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

  res.status(200).json(new ApiResponse(200, { complaint: populated }, 'Complaint closed successfully'));
});

const reopenComplaint = asyncHandler(async (req, res, next) => {
  const { citizenFeedback } = req.body;
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    throw new ApiError(404, 'Complaint not found');
  }

  if (!['citizen_verification_pending', 'awaiting_citizen_response'].includes(complaint.status)) {
    throw new ApiError(400, 'Complaint is not pending citizen verification');
  }

  if (!complaint.createdBy.equals(req.user._id)) {
    throw new ApiError(403, 'Only the complaint creator can reject resolution');
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

  res.status(200).json(new ApiResponse(200, { complaint: populated }, 'Complaint reopened for further action'));
});

const getVerificationHistory = asyncHandler(async (req, res, next) => {
  const auditLogs = await AuditLog.find({ complaintId: req.params.id })
    .populate('userId', 'name role')
    .sort({ timestamp: -1 });
  res.status(200).json(new ApiResponse(200, { auditLogs }));
});

const getVerificationPendingComplaints = asyncHandler(async (req, res, next) => {
  const complaints = await Complaint.find({
    createdBy: req.user._id,
    status: { $in: ['citizen_verification_pending', 'awaiting_citizen_response'] },
  })
    .populate('resolvedBy', 'name role')
    .sort({ updatedAt: -1 });
  res.status(200).json(new ApiResponse(200, { complaints }));
});

const getAllAuditLogs = asyncHandler(async (req, res, next) => {
  const { complaintId } = req.query;
  const filter = {};
  if (complaintId) filter.complaintId = complaintId;
  const auditLogs = await AuditLog.find(filter)
    .populate('userId', 'name role')
    .populate('complaintId', 'title')
    .sort({ timestamp: -1 });
  res.status(200).json(new ApiResponse(200, { auditLogs }));
});

const getWardComplaints = asyncHandler(async (req, res, next) => {
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

  res.status(200).json(new ApiResponse(200, { complaints, totalCount, page, pages: Math.ceil(totalCount / limit) }));
});

const getAllComplaintsAdmin = asyncHandler(async (req, res, next) => {
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

  res.status(200).json(new ApiResponse(200, { complaints, totalCount, page, pages: Math.ceil(totalCount / limit) }));
});

const deleteComplaint = asyncHandler(async (req, res, next) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    throw new ApiError(404, 'Complaint not found');
  }

  const isOwner = complaint.createdBy.equals(req.user._id);
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    throw new ApiError(403, 'Not authorized to delete this complaint');
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

  res.status(200).json(new ApiResponse(200, null, 'Complaint deleted'));
});

module.exports = { createComplaint, getComplaints, getComplaintById, upvoteComplaint, addComment, getMyComplaints, updateComplaintStatus, getWardComplaints, getAllComplaintsAdmin, deleteComplaint, verifyComplaint, reopenComplaint, getVerificationHistory, getVerificationPendingComplaints, getAllAuditLogs };
