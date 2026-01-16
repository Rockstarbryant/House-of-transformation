const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const User = require('../models/User');
const Role = require('../models/Role');
const connectDB = require('../config/database');

const migrateUsersToRoles = async () => {
  try {
    await connectDB();
    
    console.log('\n📋 ========================================');
    console.log('📋 Migrating Users to New Role System');
    console.log('📋 ========================================\n');

    // Get all users
    const users = await User.find();
    console.log(`Found ${users.length} users to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // For each user
    for (const user of users) {
      try {
        // Skip if already has ObjectId role
        if (mongoose.Types.ObjectId.isValid(user.role)) {
          console.log(`⏭️  Skipped: ${user.email} (already migrated)`);
          skippedCount++;
          continue;
        }

        const oldRoleString = user.role || 'member';
        console.log(`📝 Migrating: ${user.email} (was: ${oldRoleString})`);

        // Find role by name
        const roleDoc = await Role.findOne({ name: oldRoleString });

        if (!roleDoc) {
          console.warn(`⚠️  WARNING: Role "${oldRoleString}" not found for ${user.email}`);
          console.log(`   → Assigning default "member" role instead`);
          
          // Get member role
          const memberRole = await Role.findOne({ name: 'member' });
          user.role = memberRole._id;
        } else {
          // Assign role ID
          user.role = roleDoc._id;
          console.log(`   ✓ Assigned role: ${roleDoc.name}`);
        }

        // Save user
        await user.save();
        console.log(`   ✓ Saved: ${user.email}\n`);
        migratedCount++;

      } catch (error) {
        console.error(`❌ ERROR migrating ${user.email}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📋 ========================================');
    console.log('📋 Migration Complete!');
    console.log(`✅ Migrated: ${migratedCount} users`);
    console.log(`⏭️  Skipped: ${skippedCount} users (already migrated)`);
    console.log(`❌ Errors: ${errorCount} users`);
    console.log('📋 ========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
};

migrateUsersToRoles();