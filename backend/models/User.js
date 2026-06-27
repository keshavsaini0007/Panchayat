const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['citizen', 'ward_member', 'gram_pradhan', 'admin'], default: 'citizen' },
  village: { type: String, default: '' },
  ward: { type: String, default: '' },
  isVerified: { type: Boolean, default: false },
  emailVerified: { type: Boolean, default: false },
  profileImage: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ role: 1, ward: 1 });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
