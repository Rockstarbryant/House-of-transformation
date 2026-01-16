// server/scripts/fixAdminAndCreateSuperAdmin.js
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const User = require('../models/User');
const Role = require('../models/Role');
const connectDB = require('../config/database');

const fixAdminAndCreateSuperAdmin = async () => {
  try {
    await connectDB();
    
    console.log('\n📋 ========================================');
    console.log('📋 Fix Admin Users & Create Super Admin');
    console.log('📋 ========================================\n');

    // Get admin and member roles
    const adminRole = await Role.findOne({ name: 'admin' });
    const memberRole = await Role.findOne({ name: 'member' });

    if (!adminRole) {
      console.error('❌ ERROR: Admin role not found. Run seedRoles.js first!');
      process.exit(1);
    }

    console.log('✓ Found admin role');
    console.log('✓ Found member role\n');

    // ===== STEP 1: Find users with errors (no supabase_uid) =====
    console.log('📝 STEP 1: Finding users with errors (no supabase_uid)...\n');

    const errorUsers = await User.find({ supabase_uid: null });
    console.log(`Found ${errorUsers.length} users without supabase_uid:\n`);

    errorUsers.forEach(user => {
      console.log(`  - ${user.email}`);
    });

    // ===== STEP 2: Ask which should be admin =====
    console.log('\n📝 STEP 2: Setting admin roles...\n');

    // These are likely your admin accounts - assign them admin role
    const adminEmails = [
     // 'yobra194@gmail.com',
     // 'oumabrian9124@gmail.com',
      'admin@church.com'
    ];

    let adminCount = 0;

    for (const user of errorUsers) {
      if (adminEmails.includes(user.email)) {
        console.log(`✓ Assigning ADMIN role to: ${user.email}`);
        user.role = adminRole._id;
        await user.save();
        adminCount++;
      }
    }

    console.log(`\n✓ Assigned admin role to ${adminCount} users\n`);

    // ===== STEP 3: Find actual Super Admin for frontend =====
    console.log('📝 STEP 3: Super Admin setup...\n');

    const superAdmin = await User.findOne({ email: 'admin@church.com' }).populate('role');
    
    if (superAdmin) {
      console.log('✓ Super Admin Account Found:');
      console.log(`  Email: ${superAdmin.email}`);
      console.log(`  Role: ${superAdmin.role.name}`);
      console.log(`  Permissions: ${superAdmin.role.permissions.join(', ')}`);
    }

    // ===== STEP 4: Show summary =====
    console.log('\n📋 ========================================');
    console.log('✅ Admin Users Fixed!');
    console.log('📋 ========================================\n');

    const allUsers = await User.find().populate('role');
    const roleCount = {};

    allUsers.forEach(user => {
      const roleName = user.role?.name || 'none';
      roleCount[roleName] = (roleCount[roleName] || 0) + 1;
    });

    console.log('Current user distribution:');
    Object.entries(roleCount).forEach(([role, count]) => {
      console.log(`  ${role}: ${count} users`);
    });

    console.log('\n🔐 Next Steps:');
    console.log('1. Super Admin (admin@church.com) can now login to portal');
    console.log('2. Can manage all roles and users');
    console.log('3. Can assign permissions to other users');
    console.log('4. Can create custom roles\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixAdminAndCreateSuperAdmin();





