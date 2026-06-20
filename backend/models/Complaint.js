const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: {
    type: String, required: true,
    enum: ['roads', 'bridges', 'buildings', 'water_supply', 'electricity', 'street_lights', 'garbage', 'sewage', 'drainage', 'dangerous_structures', 'open_manholes', 'scheme_delays', 'other'],
  },
  images: [{ type: String }],
  location: {
    address: String,
    lat: Number,
    lng: Number,
    plusCode: String,
  },
  ward: { type: String, required: true },
  village: { type: String, required: true },
  status: {
    type: String, enum: ['pending', 'approved', 'rejected', 'in_progress', 'resolved', 'closed'], default: 'pending',
  },
  priority: {
    type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium',
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  upvoteCount: { type: Number, default: 0 },
  rejectionReason: { type: String, default: '' },
  resolvedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

complaintSchema.pre('save', function () {
  this.updatedAt = Date.now();
  this.upvoteCount = this.upvotes.length;
});

module.exports = mongoose.model('Complaint', complaintSchema);
