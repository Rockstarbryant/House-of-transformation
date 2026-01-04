// server/config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // Connection pool size
      minPoolSize: 5,
      maxIdleTimeMS: 45000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Monitor connection
    mongoose.connection.on('disconnected', () => {
      console.error('MongoDB disconnected');
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB error:', err);
    });
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;