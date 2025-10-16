const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri =
      process.env.NODE_ENV === 'production'
        ? process.env.MONGO_URI_PROD || process.env.MONGO_URI || 'mongodb+srv://ibdcplatform:70N7xiM8JzrSvoLb@test.uuqknwq.mongodb.net/legalcollab'
        : process.env.MONGO_URI || 'mongodb+srv://ibdcplatform:70N7xiM8JzrSvoLb@test.uuqknwq.mongodb.net/legalcollab';

    await mongoose.connect(uri); // 👈 no need for options in Mongoose v7+

    console.log(`✅ MongoDB connected: ${uri}`);
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('⚠️  Continuing without database connection for development...');
    // Don't exit in development mode, allow server to start without DB
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

module.exports = connectDB;
