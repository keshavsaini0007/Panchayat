const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI + '/panchayat';

  const options = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    retryWrites: true,
    w: 'majority',
  };

  try {
    await mongoose.connect(uri, options);
    console.log('MongoDB Connected');
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

mongoose.connection.on('error', (err) => {
  console.error(`MongoDB runtime error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
});

module.exports = connectDB;
