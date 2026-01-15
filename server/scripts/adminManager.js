/**
 * ADMIN MANAGEMENT UTILITY
 * File: server/scripts/adminManager.js
 * 
 * Commands:
 *   node server/scripts/adminManager.js list
 *   node server/scripts/adminManager.js update-role --email admin@church.com --role pastor
 *   node server/scripts/adminManager.js delete --email admin@church.com
 *   node server/scripts/adminManager.js reset-password --email admin@church.com
 */

const { createClient } = require('@supabase/supabase-js');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const config = require('../config/env');
const User = require('../models/User');

const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const command = process.argv[2];
const args = process.argv.slice(3);

// Parse command arguments
function parseArgs(argArray) {
  const result = {};
  for (let i = 0; i < argArray.length; i++) {
    if (argArray[i].startsWith('--')) {
      const key = argArray[i].substring(2);
      const value = argArray[i + 1];
      if (!value?.startsWith('--')) {
        result[key] = value;
        i++;
      }
    }
  }
  return result;
}

/**
 * List all admins
 */
async function listAdmins() {
  try {
    await mongoose.connect(config.MONGODB_URI);

    console.log('\n📋 ADMIN USERS\n');
    console.log('================================================\n');

    const admins = await User.find({ role: 'admin' }).select('-password');

    if (admins.length === 0) {
      console.log('No admin users found\n');
    } else {
      console.log(`Found ${admins.length} admin(s):\n`);
      
      admins.forEach((admin, index) => {
        console.log(`${index + 1}. ${admin.name}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   MongoDB ID: ${admin._id}`);
        console.log(`   Supabase UID: ${admin.supabase_uid}`);
        console.log(`   Status: ${admin.isActive ? '✓ Active' : '✗ Inactive'}`);
        console.log(`   Created: ${admin.createdAt.toLocaleDateString()}\n`);
      });
    }

    // Also list all users by role
    console.log('================================================');
    console.log('\n👥 USER STATISTICS\n');

    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    stats.forEach(stat => {
      console.log(`${stat._id}: ${stat.count} user(s)`);
    });

    console.log('\n================================================\n');

  } catch (error) {
    console.error('❌ Error listing admins:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

/**
 * Update user role
 */
async function updateRole() {
  try {
    const { email, role } = parseArgs(args);

    if (!email || !role) {
      throw new Error('Required: --email and --role');
    }

    const validRoles = ['member', 'volunteer', 'usher', 'worship_team', 'pastor', 'bishop', 'admin'];
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    await mongoose.connect(config.MONGODB_URI);

    console.log('\n👤 UPDATE USER ROLE\n');
    console.log('================================================\n');

    const user = await User.findOne({ email });

    if (!user) {
      throw new Error(`User not found: ${email}`);
    }

    console.log(`User: ${user.name} (${user.email})`);
    console.log(`Current role: ${user.role}`);
    console.log(`New role: ${role}\n`);

    user.role = role;
    await user.save();

    console.log('✅ Role updated successfully!\n');
    console.log('================================================\n');

  } catch (error) {
    console.error('❌ Error updating role:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

/**
 * Reset user password in Supabase
 */
async function resetPassword() {
  try {
    const { email } = parseArgs(args);

    if (!email) {
      throw new Error('Required: --email');
    }

    await mongoose.connect(config.MONGODB_URI);

    console.log('\n🔑 RESET PASSWORD\n');
    console.log('================================================\n');

    const user = await User.findOne({ email });

    if (!user) {
      throw new Error(`User not found: ${email}`);
    }

    if (!user.supabase_uid) {
      throw new Error('User has no Supabase UID');
    }

    console.log(`User: ${user.name} (${user.email})`);
    console.log(`Supabase UID: ${user.supabase_uid}\n`);

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password`
    });

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    console.log('✅ Password reset email sent!\n');
    console.log('User will receive email with reset link.\n');
    console.log('================================================\n');

  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

/**
 * Delete user (both Supabase and MongoDB)
 */
async function deleteUser() {
  try {
    const { email } = parseArgs(args);

    if (!email) {
      throw new Error('Required: --email');
    }

    await mongoose.connect(config.MONGODB_URI);

    console.log('\n🗑️  DELETE USER\n');
    console.log('================================================\n');

    const user = await User.findOne({ email });

    if (!user) {
      throw new Error(`User not found: ${email}`);
    }

    console.log(`⚠️  WARNING: This will delete the user permanently!\n`);
    console.log(`User: ${user.name} (${user.email})`);
    console.log(`MongoDB ID: ${user._id}`);
    console.log(`Supabase UID: ${user.supabase_uid}\n`);

    // Delete from Supabase if UID exists
    if (user.supabase_uid) {
      console.log('Deleting from Supabase...');
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.supabase_uid);

      if (deleteError) {
        console.warn(`⚠️  Supabase deletion failed: ${deleteError.message}`);
      } else {
        console.log('✓ Deleted from Supabase');
      }
    }

    // Delete from MongoDB
    console.log('Deleting from MongoDB...');
    await User.findByIdAndDelete(user._id);
    console.log('✓ Deleted from MongoDB');

    console.log('\n✅ User deleted successfully!\n');
    console.log('================================================\n');

  } catch (error) {
    console.error('❌ Error deleting user:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

/**
 * Show help
 */
function showHelp() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║         ADMIN MANAGEMENT TOOL FOR CHURCH API              ║
╚════════════════════════════════════════════════════════════╝

COMMANDS:

  list
    List all admin users and statistics
    Usage: node server/scripts/adminManager.js list

  update-role
    Change a user's role
    Usage: node server/scripts/adminManager.js update-role --email user@church.com --role admin
    Roles: member, volunteer, usher, worship_team, pastor, bishop, admin

  reset-password
    Send password reset email to user
    Usage: node server/scripts/adminManager.js reset-password --email admin@church.com

  delete
    Delete a user (from both Supabase and MongoDB)
    Usage: node server/scripts/adminManager.js delete --email admin@church.com

  help
    Show this message
    Usage: node server/scripts/adminManager.js help

EXAMPLES:

  # Create new admin (use createAdmin.js instead)
  node server/scripts/createAdmin.js --email admin@church.com --password AdminPass123! --name "Admin User"

  # List all admins
  node server/scripts/adminManager.js list

  # Promote user to admin
  node server/scripts/adminManager.js update-role --email pastor@church.com --role admin

  # Reset admin password
  node server/scripts/adminManager.js reset-password --email admin@church.com

  # Delete a user
  node server/scripts/adminManager.js delete --email old-admin@church.com

TROUBLESHOOTING:

  Error: Missing Supabase environment variables
    → Check your .env file has SUPABASE_URL and SUPABASE_SERVICE_KEY

  Error: User not found
    → Make sure email is spelled correctly (case-sensitive on some systems)

  Error: User profile not found
    → User might exist only in Supabase. Run createAdmin.js to create both accounts.

`);
}

/**
 * Main routing
 */
async function main() {
  if (!command || command === 'help') {
    showHelp();
    process.exit(0);
  }

  // Validate Supabase config
  if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: Missing Supabase environment variables');
    console.error('   SUPABASE_URL:', config.SUPABASE_URL ? '✓' : '✗');
    console.error('   SUPABASE_SERVICE_KEY:', config.SUPABASE_SERVICE_KEY ? '✓' : '✗');
    console.error('\n📝 Make sure these are set in your .env file\n');
    process.exit(1);
  }

  switch (command) {
    case 'list':
      await listAdmins();
      break;
    case 'update-role':
      await updateRole();
      break;
    case 'reset-password':
      await resetPassword();
      break;
    case 'delete':
      await deleteUser();
      break;
    default:
      console.error(`Unknown command: ${command}\n`);
      showHelp();
      process.exit(1);
  }
}

main();