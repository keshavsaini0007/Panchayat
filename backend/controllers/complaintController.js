const Complaint = require('../models/Complaint');
const Comment = require('../models/Comment');
const { cloudinary, MAX_IMAGES, MAX_FILE_SIZE } = require('../config/cloudinary');
const { validationResult } = require('express-validator');

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const createComplaint = async (req, res, next) => {
  try {
    const { title, description, category, ward, village } = req.body;
    if (!req.body.location) {
      return res.status(400).json({ message: 'Location is required' });
    }
    const location = JSON.parse(req.body.location);

    const images = [];
    if (req.files) {
      for (const file of req.files) {
        if (!ALLOWED_TYPES.includes(file.mimetype)) {
          await cloudinary.uploader.destroy(file.filename);
          return res.status(400).json({ message: `"${file.originalname}": Only JPG, PNG and WEBP images are allowed.` });
        }
        if (file.size > MAX_FILE_SIZE) {
          await cloudinary.uploader.destroy(file.filename);
          return res.status(400).json({ message: `"${file.originalname}": Image size cannot exceed 5 MB.` });
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
        return res.status(400).json({ message: `Maximum ${MAX_IMAGES} images allowed.` });
      }
    }

    const complaint = await Complaint.create({
      title, description, category, ward, village, location, images,
      createdBy: req.user._id,
    });

    res.status(201).json(complaint);
  } catch (err) {
    console.error('=== COMPLAINT CREATION ERROR ===');
    console.error('Name:', err.name);
    console.error('Message:', err.message);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: 'Validation failed', errors: messages });
    }
    if (err instanceof SyntaxError) {
      return res.status(400).json({ message: 'Invalid location data' });
    }
    next(err);
  }
};

const getComplaints = async (req, res, next) => {
  try {
    const { village, ward, status, category } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
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
      .populate('createdBy', 'name email');

    res.status(200).json({ complaints, totalCount, page, pages: Math.ceil(totalCount / limit) });
  } catch (err) {
    next(err);
  }
};

const getComplaintById = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name role');

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    const comments = await Comment.find({ complaintId: req.params.id })
      .populate('userId', 'name role');

    res.status(200).json({ complaint, comments });
  } catch (err) {
    next(err);
  }
};

const upvoteComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    const userId = req.user._id;
    const alreadyUpvoted = complaint.upvotes.some((id) => id.equals(userId));

    if (alreadyUpvoted) {
      complaint.upvotes.pull(userId);
      await complaint.save();
      return res.status(200).json({ message: 'Upvote removed', upvoteCount: complaint.upvotes.length });
    } else {
      complaint.upvotes.push(userId);
      await complaint.save();
      return res.status(200).json({ message: 'Upvote added', upvoteCount: complaint.upvotes.length });
    }
  } catch (err) {
    next(err);
  }
};

const addComment = async (req, res, next) => {
  try {
    const { message } = req.body;
    const isOfficial = ['ward_member', 'gram_pradhan'].includes(req.user.role);

    let comment = await Comment.create({
      complaintId: req.params.id,
      userId: req.user._id,
      message,
      isOfficial,
    });

    comment = await comment.populate('userId', 'name role');

    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
};

const getMyComplaints = async (req, res, next) => {
  try {
    const complaints = await Complaint.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ complaints });
  } catch (err) {
    next(err);
  }
};

const updateComplaintStatus = async (req, res, next) => {
  try {
    const { status, rejectionReason, assignedTo } = req.body;
    const validStatuses = ['pending', 'approved', 'rejected', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    if (status === 'rejected' && !rejectionReason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    complaint.status = status;
    if (rejectionReason) complaint.rejectionReason = rejectionReason;
    if (assignedTo) complaint.assignedTo = assignedTo;
    if (status === 'resolved') complaint.resolvedAt = Date.now();

    await complaint.save();

    res.status(200).json(complaint);
  } catch (err) {
    next(err);
  }
};

const getWardComplaints = async (req, res, next) => {
  try {
    const { status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { ward: req.user.ward };
    if (status) filter.status = status;

    const totalCount = await Complaint.countDocuments(filter);
    const complaints = await Complaint.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email');

    res.status(200).json({ complaints, totalCount, page, pages: Math.ceil(totalCount / limit) });
  } catch (err) {
    next(err);
  }
};

const getAllComplaintsAdmin = async (req, res, next) => {
  try {
    const { status, category, village, ward } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
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
      .populate('assignedTo', 'name role');

    res.status(200).json({ complaints, totalCount, page, pages: Math.ceil(totalCount / limit) });
  } catch (err) {
    next(err);
  }
};

const deleteComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    const isOwner = complaint.createdBy.equals(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this complaint' });
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

    res.status(200).json({ message: 'Complaint deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { createComplaint, getComplaints, getComplaintById, upvoteComplaint, addComment, getMyComplaints, updateComplaintStatus, getWardComplaints, getAllComplaintsAdmin, deleteComplaint };
