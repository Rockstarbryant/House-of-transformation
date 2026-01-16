// server/scripts/createAdmin.js
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const readline = require('readline');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const User = require('../models/User');
const Role = require('../models/Role');
const connectDB = require('../config/database');
const { createClient } = require('@supabase/supabase-js');

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (flag) => {
  const index = args.indexOf(flag);
  return index > -1 ? args[index + 1] : null;
};

const email = getArg('--email');
const password = getArg('--password');
const name = getArg('--name');

if (!email || !password || !name) {
  console.error('❌ Missing required arguments');
  console.log('Usage: node server/scripts/createAdmin.js --email <email> --password <password> --name <name>');
  console.log('Example: node server/scripts/createAdmin.js --email admin@church.com --password Admin123! --name "Admin User"');
  process.exit(1);
}

// Initialize Supabase Admin Client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Use service key for admin operations
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

const createAdmin = async () => {
  try {
    console.log('🔐 CREATE ADMIN USER');
    console.log('================================================');
    
    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB...');
    await connectDB();
    console.log('   ✓ MongoDB connected');

    console.log('📝 Admin Details:');
    console.log(`   Email: ${email}`);
    console.log(`   Name: ${name}`);
    console.log(`   Role: admin\n`);

    // Get the admin role from MongoDB
    console.log('🔍 Fetching admin role...');
    const adminRole = await Role.findOne({ name: 'admin' });
    
    if (!adminRole) {
      console.error('❌ Admin role not found in database!');
      console.log('   Run: node server/scripts/seedRoles.js first');
      process.exit(1);
    }
    
    console.log(`   ✓ Found admin role (ID: ${adminRole._id})\n`);

    // Check if user exists in Supabase
    console.log('🔍 Checking if user already exists in Supabase...');
    const { data: existingSupabaseUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error checking Supabase users:', listError.message);
      process.exit(1);
    }

    const existingSupabaseUser = existingSupabaseUsers.users.find(u => u.email === email);
    
    let supabaseUserId;

    if (existingSupabaseUser) {
      console.log('   ⚠️  User already exists in Supabase Auth');
      console.log(`   Supabase UID: ${existingSupabaseUser.id}\n`);
      supabaseUserId = existingSupabaseUser.id;

      // Check if user exists in MongoDB
      const existingMongoUser = await User.findOne({ supabase_uid: supabaseUserId });
      
      if (existingMongoUser) {
        console.log('✓ User already exists in both systems');
        
        // Check if already admin
        if (existingMongoUser.role.toString() === adminRole._id.toString()) {
          console.log('✓ User is already an admin!');
          process.exit(0);
        }

        // Ask if they want to update role
        console.log('Would you like to:');
        console.log('  1. Update role to admin');
        console.log('  2. Cancel');
        
        const choice = await askQuestion('Enter choice (1 or 2): ');
        
        if (choice === '1') {
          console.log('Updating role to admin...');
          existingMongoUser.role = adminRole._id; // ✅ Use ObjectId, not string
          existingMongoUser.name = name; // Update name if provided
          await existingMongoUser.save();
          
          console.log('\n✅ SUCCESS!');
          console.log('================================================');
          console.log('✓ User updated to admin role');
          console.log(`📧 Email: ${existingMongoUser.email}`);
          console.log(`👤 Name: ${existingMongoUser.name}`);
          console.log(`🔑 Role: admin`);
          console.log(`🆔 Supabase UID: ${existingMongoUser.supabase_uid}`);
          console.log('================================================\n');
        } else {
          console.log('❌ Operation cancelled');
        }
        
        rl.close();
        process.exit(0);
      }

      // User exists in Supabase but not MongoDB - create MongoDB profile
      console.log('📝 Creating MongoDB profile for existing Supabase user...');
      
    } else {
      // Create new user in Supabase
      console.log('📝 Creating new user in Supabase Auth...');
      
      const { data: newSupabaseUser, error: signUpError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          name
        }
      });

      if (signUpError) {
        console.error('❌ Error creating Supabase user:', signUpError.message);
        process.exit(1);
      }

      console.log('   ✓ Supabase user created');
      console.log(`   Supabase UID: ${newSupabaseUser.user.id}\n`);
      supabaseUserId = newSupabaseUser.user.id;
    }

    // Create MongoDB user profile
    console.log('📝 Creating MongoDB user profile...');
    
    const newUser = await User.create({
      supabase_uid: supabaseUserId,
      email,
      name,
      role: adminRole._id, // ✅ Use ObjectId reference, not string
      username: email.split('@')[0]
    });

    console.log('   ✓ MongoDB user created\n');

    // Populate role for display
    await newUser.populate('role');

    console.log('\n✅ SUCCESS!');
    console.log('================================================');
    console.log('✓ Admin user created successfully!');
    console.log(`📧 Email: ${newUser.email}`);
    console.log(`👤 Name: ${newUser.name}`);
    console.log(`🔑 Role: ${newUser.role.name}`);
    console.log(`🆔 Supabase UID: ${newUser.supabase_uid}`);
    console.log(`🔐 Password: ${password}`);
    console.log('\n📋 Permissions:');
    newUser.role.permissions.forEach(perm => {
      console.log(`   ✓ ${perm}`);
    });
    console.log('================================================\n');
    console.log('🎉 You can now login with these credentials!');
    console.log(`   URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/login\n`);

    rl.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error creating admin:');
    console.error('  ', error.message);
    
    if (error.errors) {
      Object.keys(error.errors).forEach(key => {
        console.error(`   ${key}: ${error.errors[key].message}`);
      });
    }
    
    rl.close();
    process.exit(1);
  }
};

createAdmin();

/**
 * CREATE ADMIN USER FROM TERMINAL
 * File: server/scripts/createAdmin.js
 * 
 * Usage:
 *   node server/scripts/createAdmin.js --email admin@church.com --password AdminPass123! --name "Admin User"
 * 
 * Or interactive:
 *   node server/scripts/createAdmin.js
 

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


 * Simple prompting function for interactive mode
 
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
*/