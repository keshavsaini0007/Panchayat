const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const User = require('../models/User');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI + '/panchayat');
    console.log('MongoDB connected');

    await User.deleteMany({ email: 'admin@panchayat.com' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Admin@12345', salt);

    await User.collection.insertOne({
      name: 'Admin',
      email: 'admin@panchayat.com',
      phone: '0000000000',
      password: hashedPassword,
      role: 'admin',
      village: '',
      ward: '',
      isVerified: true,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const verifyUser = await User.findOne({ role: 'admin' });
    const match = await bcrypt.compare('Admin@12345', verifyUser.password);
    console.log('Password verification:', match ? 'PASS' : 'FAIL');
    console.log('Stored password hash length:', verifyUser.password.length);
    console.log('Stored password starts with:', verifyUser.password.substring(0, 7));
    const matchMethod = await verifyUser.matchPassword('Admin@12345');
    console.log('matchPassword method result:', matchMethod);

    console.log('Admin created successfully:');
    console.log('  Email:    admin@panchayat.com');
    console.log('  Password: Admin@12345');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
};

seedAdmin();
