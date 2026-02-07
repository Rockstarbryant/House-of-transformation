/**
 * Migration Script: Add authProvider to Existing Users
 * 
 * Run this ONCE after updating the User model to add the authProvider field.
 * This will set all existing users to 'email' as the default provider.
 * 
 * Usage:
 * 1. Save this file as: scripts/migrateAuthProvider.js
 * 2. Run: node scripts/migrateAuthProvider.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const migrateAuthProvider = async () => {
  try {
    console.log('🔄 Starting authProvider migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Find all users without authProvider field
    const usersToUpdate = await User.find({ 
      authProvider: { $exists: false } 
    });
    
    console.log(`📊 Found ${usersToUpdate.length} users to update`);
    
    if (usersToUpdate.length === 0) {
      console.log('✅ All users already have authProvider field');
      process.exit(0);
    }
    
    // Update each user
    let updated = 0;
    for (const user of usersToUpdate) {
      // Set to 'email' by default for existing users
      // They all signed up with email/password before OAuth was added
      await User.updateOne(
        { _id: user._id },
        { $set: { authProvider: 'email' } }
      );
      updated++;
      
      if (updated % 100 === 0) {
        console.log(`📝 Updated ${updated}/${usersToUpdate.length} users...`);
      }
    }
    
    console.log(`✅ Migration complete! Updated ${updated} users`);
    
    // Verify
    const remainingUsers = await User.find({ 
      authProvider: { $exists: false } 
    });
    
    if (remainingUsers.length === 0) {
      console.log('✅ Verification passed: All users now have authProvider field');
    } else {
      console.warn(`⚠️  Warning: ${remainingUsers.length} users still missing authProvider`);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run migration
migrateAuthProvider();