// server/scripts/seedRoles.js
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const Role = require('../models/Role');
const connectDB = require('../config/database');

const seedRoles = async () => {
  try {
    await connectDB();
    
    console.log('\n📋 ========================================');
    console.log('📋 Seeding System Roles...');
    console.log('📋 ========================================\n');

    // System roles that cannot be deleted
    const systemRoles = [
      {
        name: 'admin',
        description: 'Full system access - Can manage everything',
        permissions: [
          'manage:events',
          'manage:sermons',
          'manage:gallery',
          'manage:donations',
          'manage:users',
          'manage:roles',
          'manage:blog',
          'manage:livestream',
          'manage:feedback',
          'manage:volunteers',
          'view:analytics',
          'view:audit_logs',
          'manage:settings'
        ],
        isSystemRole: true
      },
      {
        name: 'member',
        description: 'Default member role - No special permissions',
        permissions: [],
        isSystemRole: true
      },
      {
        name: 'pastor',
        description: 'Pastor - Can manage sermons and events',
        permissions: [
          'manage:sermons',
          'manage:events',
          'view:analytics'
        ],
        isSystemRole: false
      },
      {
        name: 'bishop',
        description: 'Bishop - Elevated permissions for oversight',
        permissions: [
          'manage:sermons',
          'manage:events',
          'manage:users',
          'manage:donations',
          'manage:volunteers',
          'view:analytics',
          'view:audit_logs'
        ],
        isSystemRole: false
      },
      {
        name: 'volunteer',
        description: 'Volunteer - Can help with events',
        permissions: [
          'manage:events'
        ],
        isSystemRole: false
      },
      {
        name: 'usher',
        description: 'Usher - Event assistance and crowd management',
        permissions: [
          'manage:events'
        ],
        isSystemRole: false
      },
      {
        name: 'worship_team',
        description: 'Worship Team Member - Can manage sermon content',
        permissions: [
          'manage:sermons'
        ],
        isSystemRole: false
      }
    ];

    let createdCount = 0;
    let updatedCount = 0;

    // Upsert roles (create if not exist, update if exist)
    for (const roleData of systemRoles) {
      const existing = await Role.findOne({ name: roleData.name });
      
      if (existing) {
        // Update existing role
        existing.description = roleData.description;
        existing.permissions = roleData.permissions;
        existing.isSystemRole = roleData.isSystemRole;
        await existing.save();
        console.log(`✅ Updated role: "${roleData.name}"`);
        updatedCount++;
      } else {
        // Create new role
        await Role.create(roleData);
        console.log(`✅ Created role: "${roleData.name}"`);
        createdCount++;
      }
    }

    console.log('\n📋 ========================================');
    console.log(`✅ Role seeding completed!`);
    console.log(`   Created: ${createdCount} new roles`);
    console.log(`   Updated: ${updatedCount} existing roles`);
    console.log(`   Total: ${systemRoles.length} roles`);
    console.log('📋 ========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ========================================');
    console.error('❌ Seeding error:', error.message);
    console.error('❌ ========================================\n');
    process.exit(1);
  }
};

// Run the seed function
seedRoles();