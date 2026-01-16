// server/scripts/verifyRoles.js
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const Role = require('../models/Role');
const User = require('../models/User');
const connectDB = require('../config/database');

const verifyRoles = async () => {
  try {
    console.log('\n🔍 VERIFY ROLES AND USERS');
    console.log('================================================\n');

    await connectDB();
    console.log('✓ Connected to MongoDB\n');

    // Check all roles
    console.log('📋 Checking Roles in Database:\n');
    const roles = await Role.find({});
    
    if (roles.length === 0) {
      console.log('❌ NO ROLES FOUND IN DATABASE!');
      console.log('   Run: node server/scripts/seedRoles.js\n');
      process.exit(1);
    }

    console.log(`Found ${roles.length} roles:\n`);
    roles.forEach(role => {
      console.log(`  ✓ ${role.name}`);
      console.log(`    ID: ${role._id}`);
      console.log(`    Permissions: ${role.permissions.length > 0 ? role.permissions.join(', ') : 'none'}`);
      console.log(`    System Role: ${role.isSystemRole ? 'Yes' : 'No'}`);
      console.log('');
    });

    // Check all users
    console.log('👥 Checking Users in Database:\n');
    const users = await User.find({}).populate('role');
    
    console.log(`Found ${users.length} users:\n`);
    
    const usersByRole = {};
    const usersWithInvalidRole = [];
    
    for (const user of users) {
      if (user.role && user.role._id) {
        // Valid role reference
        const roleName = user.role.name || 'unknown';
        if (!usersByRole[roleName]) {
          usersByRole[roleName] = [];
        }
        usersByRole[roleName].push({
          email: user.email,
          name: user.name,
          supabase_uid: user.supabase_uid,
          roleId: user.role._id
        });
      } else if (user.role && typeof user.role === 'string') {
        // Invalid - role is a string instead of ObjectId
        usersWithInvalidRole.push({
          email: user.email,
          name: user.name,
          invalidRole: user.role,
          supabase_uid: user.supabase_uid
        });
      } else {
        // No role assigned
        usersWithInvalidRole.push({
          email: user.email,
          name: user.name,
          invalidRole: 'null/undefined',
          supabase_uid: user.supabase_uid
        });
      }
    }

    // Display users by role
    if (Object.keys(usersByRole).length > 0) {
      console.log('Users grouped by role:\n');
      Object.entries(usersByRole).forEach(([roleName, roleUsers]) => {
        console.log(`  📌 ${roleName.toUpperCase()} (${roleUsers.length} users):`);
        roleUsers.forEach(u => {
          console.log(`    - ${u.email} (${u.name || 'No name'})`);
          console.log(`      Supabase: ${u.supabase_uid || 'MISSING'}`);
          console.log(`      Role ID: ${u.roleId}`);
        });
        console.log('');
      });
    }

    // Display users with invalid roles
    if (usersWithInvalidRole.length > 0) {
      console.log('⚠️  USERS WITH INVALID ROLES:\n');
      usersWithInvalidRole.forEach(u => {
        console.log(`  ❌ ${u.email}`);
        console.log(`     Invalid role: ${u.invalidRole}`);
        console.log(`     Supabase: ${u.supabase_uid || 'MISSING'}`);
        console.log('');
      });
      
      console.log('🔧 TO FIX: Run node server/scripts/fixAdminAndCreateSuperAdmin.js\n');
    }

    // Check for your specific user
    console.log('================================================');
    console.log('🔍 Checking your user (oumabrian9124@gmail.com):\n');
    
    const yourUser = await User.findOne({ email: 'oumabrian9124@gmail.com' }).populate('role');
    
    if (yourUser) {
      console.log('✓ User found:');
      console.log(`  Email: ${yourUser.email}`);
      console.log(`  Name: ${yourUser.name || 'Not set'}`);
      console.log(`  Supabase UID: ${yourUser.supabase_uid || '❌ MISSING'}`);
      console.log(`  Role Type: ${typeof yourUser.role}`);
      
      if (yourUser.role && yourUser.role._id) {
        console.log(`  Role Name: ${yourUser.role.name}`);
        console.log(`  Role ID: ${yourUser.role._id}`);
        console.log(`  Permissions: ${yourUser.role.permissions.join(', ')}`);
      } else if (typeof yourUser.role === 'string') {
        console.log(`  ❌ INVALID - Role is string: "${yourUser.role}"`);
        console.log(`  🔧 FIX: Run fixAdminAndCreateSuperAdmin.js`);
      } else {
        console.log(`  ❌ INVALID - Role is: ${yourUser.role}`);
      }
    } else {
      console.log('❌ User not found in MongoDB');
      console.log('   May need to create user or check email spelling');
    }

    console.log('\n================================================');
    console.log('✅ Verification Complete\n');

    // Summary
    console.log('📊 SUMMARY:');
    console.log(`  Roles in DB: ${roles.length}`);
    console.log(`  Total Users: ${users.length}`);
    console.log(`  Users with valid roles: ${Object.values(usersByRole).flat().length}`);
    console.log(`  Users needing fix: ${usersWithInvalidRole.length}`);
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
};

verifyRoles();