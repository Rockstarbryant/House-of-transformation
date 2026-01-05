/**
 * MIGRATION SCRIPT - Run this ONCE after updating User model
 * 
 * This marks all existing users as email verified so they don't have to verify again
 * Only new signups after this will require email verification
 * 
 * To run: node server/scripts/migrateUsersVerified.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const User = require('../models/User');

async function migrateUsers() {
  try {
    console.log('🔄 Connecting to database...');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✓ Connected to database');

    // Find all users and mark as verified
    const result = await User.updateMany(
      { isEmailVerified: { $ne: true } },
      { $set: { isEmailVerified: true } }
    );

    console.log(`\n✓ Migration Complete!`);
    console.log(`  - Users updated: ${result.modifiedCount}`);
    console.log(`  - All existing users marked as email verified`);
    console.log(`  - New signups will require email verification\n`);

    // Verify the results
    const verifiedCount = await User.countDocuments({ isEmailVerified: true });
    const totalUsers = await User.countDocuments();

    console.log(`📊 Stats:`);
    console.log(`  - Total users: ${totalUsers}`);
    console.log(`  - Verified users: ${verifiedCount}`);

    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrateUsers();