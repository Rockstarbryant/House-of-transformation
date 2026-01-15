/**
 * CREATE ADMIN USER FROM TERMINAL
 * File: server/scripts/createAdmin.js
 * 
 * Usage:
 *   node server/scripts/createAdmin.js --email admin@church.com --password AdminPass123! --name "Admin User"
 * 
 * Or interactive:
 *   node server/scripts/createAdmin.js
 */

const { createClient } = require('@supabase/supabase-js');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const config = require('../config/env');
const User = require('../models/User');

// Parse command line arguments
const args = process.argv.slice(2);
let adminEmail, adminPassword, adminName;

// Extract arguments
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--email' && args[i + 1]) {
    adminEmail = args[i + 1];
  }
  if (args[i] === '--password' && args[i + 1]) {
    adminPassword = args[i + 1];
  }
  if (args[i] === '--name' && args[i + 1]) {
    adminName = args[i + 1];
  }
}

// Initialize Supabase with SERVICE_KEY (for admin operations)
const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_KEY, // Use service key for admin operations
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function createAdmin() {
  try {
    console.log('\n🔐 CREATE ADMIN USER\n');
    console.log('================================================\n');

    // Validate Supabase config
    if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_KEY) {
      console.error('❌ Error: Missing Supabase environment variables');
      console.error('   SUPABASE_URL:', config.SUPABASE_URL ? '✓' : '✗');
      console.error('   SUPABASE_SERVICE_KEY:', config.SUPABASE_SERVICE_KEY ? '✓' : '✗');
      console.error('\n📝 Make sure these are set in your .env file\n');
      process.exit(1);
    }

    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB...');
    await mongoose.connect(config.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('   ✓ MongoDB connected\n');

    // Get input from command line or prompt user
    if (!adminEmail || !adminPassword || !adminName) {
      console.log('📋 Please provide admin details:\n');
      
      // Simple prompting (for production, use inquirer.js or similar)
      if (!adminEmail) {
        adminEmail = await question('Email: ');
      }
      if (!adminPassword) {
        adminPassword = await question('Password (min 8 chars, uppercase, number, special): ');
      }
      if (!adminName) {
        adminName = await question('Full Name: ');
      }
    }

    // Validate inputs
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      throw new Error('Invalid email format');
    }

    if (adminPassword.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    if (!adminName || adminName.trim().length < 2) {
      throw new Error('Name must be at least 2 characters');
    }

    console.log('\n📝 Admin Details:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Name: ${adminName}`);
    console.log(`   Role: admin\n`);

    // Check if user already exists in Supabase
    console.log('🔍 Checking if user already exists in Supabase...');
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`);
    }

    const userExists = existingUsers?.users?.some(u => u.email === adminEmail);
    
    if (userExists) {
      console.log('   ⚠️  User already exists in Supabase Auth\n');
      
      // Try to get existing user's UID
      const existingUser = existingUsers.users.find(u => u.email === adminEmail);
      const mongoUser = await User.findOne({ email: adminEmail });

      if (mongoUser) {
        console.log('✓ User already exists in both systems\n');
        console.log('Would you like to:');
        console.log('  1. Update role to admin');
        console.log('  2. Cancel\n');
        
        // For non-interactive mode, just update
        console.log('Updating role to admin...\n');
        mongoUser.role = 'admin';
        await mongoUser.save();
        console.log('✅ User role updated to admin\n');
        console.log(`User ID: ${mongoUser._id}`);
        console.log(`Supabase UID: ${mongoUser.supabase_uid}\n`);
      } else {
        throw new Error('User exists in Supabase but not in MongoDB. Run migration first.');
      }
    } else {
      // Create new user in Supabase Auth
      console.log('   Creating user in Supabase Auth...\n');
      
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true // Auto-confirm email
      });

      if (authError) {
        throw new Error(`Supabase creation failed: ${authError.message}`);
      }

      const supabaseUid = authData.user.id;
      console.log('   ✓ Supabase user created\n');

      // Create MongoDB profile
      console.log('📝 Creating MongoDB profile...');
      
      const newAdmin = new User({
        supabase_uid: supabaseUid,
        name: adminName,
        email: adminEmail,
        role: 'admin',
        isActive: true
      });

      await newAdmin.save();
      console.log('   ✓ MongoDB profile created\n');

      console.log('✅ ADMIN CREATED SUCCESSFULLY!\n');
      console.log('User Details:');
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Name: ${adminName}`);
      console.log(`   Role: admin`);
      console.log(`   MongoDB ID: ${newAdmin._id}`);
      console.log(`   Supabase UID: ${supabaseUid}\n`);
    }

    console.log('================================================');
    console.log('✓ Admin user ready to login\n');

  } catch (error) {
    console.error('❌ Error creating admin:\n');
    console.error(`   ${error.message}\n`);
    
    // Helpful error messages
    if (error.message.includes('Invalid email')) {
      console.log('💡 Tip: Use valid email format (e.g., admin@church.com)\n');
    }
    if (error.message.includes('password')) {
      console.log('💡 Tip: Password must be at least 8 characters with:\n');
      console.log('   - Uppercase letter (A-Z)');
      console.log('   - Lowercase letter (a-z)');
      console.log('   - Number (0-9)');
      console.log('   - Special character (@$!%*?&)\n');
      console.log('Example: MyAdmin@2024!\n');
    }
    if (error.message.includes('SUPABASE')) {
      console.log('💡 Tip: Check your Supabase environment variables in .env\n');
    }
    
    process.exit(1);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    process.exit(0);
  }
}

/**
 * Simple prompting function for interactive mode
 */
function question(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim());
    });
  });
}

// Run the script
createAdmin();