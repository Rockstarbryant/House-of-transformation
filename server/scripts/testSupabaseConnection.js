/**
 * Test Supabase Connection
 * File: server/scripts/testSupabaseConnection.js
 * Run: node server/scripts/testSupabaseConnection.js
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const config = require('../config/env');

async function testConnection() {
  console.log('\n🧪 Testing Supabase Connection...\n');

  // Check environment variables
  console.log('1️⃣  Checking Environment Variables:');
  console.log(`   SUPABASE_URL: ${config.SUPABASE_URL ? '✓' : '❌'}`);
  console.log(`   SUPABASE_ANON_KEY: ${config.SUPABASE_ANON_KEY ? '✓' : '❌'}`);
  console.log(`   SUPABASE_SERVICE_KEY: ${config.SUPABASE_SERVICE_KEY ? '✓' : '❌'}\n`);

  if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase credentials in .env\n');
    process.exit(1);
  }

  // Test connection with SERVICE_KEY
  console.log('2️⃣  Connecting to Supabase with SERVICE_KEY...');
  try {
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

    console.log('   ✓ Supabase client created\n');

    // Test listing users (simple operation)
    console.log('3️⃣  Testing Auth API (listing users)...');
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('   ❌ Error:', listError.message);
      console.error('   Details:', listError);
      process.exit(1);
    }

    console.log(`   ✓ Auth API working`);
    console.log(`   ✓ Total users in Supabase: ${users?.users?.length || 0}\n`);

    // Test creating a test user
    console.log('4️⃣  Testing User Creation...');
    const testEmail = `test-${Date.now()}@test.com`;
    const testPassword = 'TestPassword123!';

    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    });

    if (createError) {
      console.error('   ❌ Creation error:', createError.message);
      process.exit(1);
    }

    console.log(`   ✓ Test user created successfully`);
    console.log(`   Email: ${testEmail}`);
    console.log(`   User ID: ${newUser.user.id}\n`);

    // Test login
    console.log('5️⃣  Testing User Login...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (loginError) {
      console.error('   ❌ Login error:', loginError.message);
      process.exit(1);
    }

    console.log('   ✓ Login successful');
    console.log(`   Access Token: ${loginData.session.access_token.substring(0, 20)}...`);
    console.log(`   Refresh Token: ${loginData.session.refresh_token.substring(0, 20)}...\n`);

    // Clean up - delete test user
    console.log('6️⃣  Cleaning up test user...');
    const { error: deleteError } = await supabase.auth.admin.deleteUser(newUser.user.id);

    if (deleteError) {
      console.warn('   ⚠️  Warning: Could not delete test user:', deleteError.message);
    } else {
      console.log('   ✓ Test user deleted\n');
    }

    console.log('✅ ALL TESTS PASSED!\n');
    console.log('Your Supabase connection is working correctly.\n');

  } catch (error) {
    console.error('❌ Connection Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testConnection();