/**
 * Migration Script: Convert User Roles to ObjectId References
 * 
 * This script fixes existing users who have string role values instead of ObjectId references.
 * Run this ONCE after deploying the new User model.
 * 
 * Usage:
 *   node scripts/migrateUserRoles.js
 */

const mongoose = require('mongoose');
const path = require('path');
const User = require('../models/User');
const Role = require('../models/Role');
const dotenv = require('dotenv');
require('dotenv').config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectDB = require('../config/database');

const migrateUserRoles = async () => {
  try {
    console.log('🔄 Starting user roles migration...');
    console.log('📊 Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Get all roles from database
    const roles = await Role.find({});
    console.log(`📋 Found ${roles.length} roles in database:`);
    roles.forEach(role => {
      console.log(`   - ${role.name} (ID: ${role._id})`);
    });
    console.log('');

    // Create a map of role names to ObjectIds
    const roleMap = {};
    roles.forEach(role => {
      roleMap[role.name] = role._id;
    });

    // Step 2: Find users with no role or with undefined role
    const usersWithoutRole = await User.find({
      $or: [
        { role: { $exists: false } },
        { role: null },
        { role: undefined }
      ]
    });

    console.log(`👥 Found ${usersWithoutRole.length} users without role assignment`);

    if (usersWithoutRole.length > 0) {
      // Get member role ID
      const memberRole = await Role.findOne({ name: 'member' });
      
      if (!memberRole) {
        console.error('❌ ERROR: "member" role not found in database!');
        console.log('Please ensure you have created the member role first.');
        process.exit(1);
      }

      // Update all users without roles to member
      const result = await User.updateMany(
        {
          $or: [
            { role: { $exists: false } },
            { role: null },
            { role: undefined }
          ]
        },
        { role: memberRole._id }
      );

      console.log(`✅ Updated ${result.modifiedCount} users to "member" role\n`);
    }

    // Step 3: Add isBanned field to users who don't have it
    const usersWithoutBanField = await User.updateMany(
      { isBanned: { $exists: false } },
      { $set: { isBanned: false } }
    );

    if (usersWithoutBanField.modifiedCount > 0) {
      console.log(`✅ Added isBanned=false to ${usersWithoutBanField.modifiedCount} users\n`);
    }

    // Step 4: Verify migration
    console.log('🔍 Verifying migration...');
    const allUsers = await User.find({}).populate('role', 'name');
    
    console.log(`\n📊 Migration Summary:`);
    console.log(`   Total users: ${allUsers.length}`);
    
    const roleStats = {};
    allUsers.forEach(user => {
      const roleName = user.role?.name || 'NO_ROLE';
      roleStats[roleName] = (roleStats[roleName] || 0) + 1;
    });

    console.log(`\n   Users by role:`);
    Object.keys(roleStats).forEach(roleName => {
      console.log(`   - ${roleName}: ${roleStats[roleName]}`);
    });

    // Check for users still without roles
    const stillWithoutRole = allUsers.filter(u => !u.role);
    if (stillWithoutRole.length > 0) {
      console.log(`\n⚠️  WARNING: ${stillWithoutRole.length} users still without role:`);
      stillWithoutRole.forEach(u => {
        console.log(`   - ${u.name} (${u.email})`);
      });
    } else {
      console.log(`\n✅ All users have role assignments!`);
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('You can now restart your server.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
  }
};

// Run migration
migrateUserRoles();