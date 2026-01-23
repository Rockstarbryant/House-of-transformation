// server/test-role-permissions.js
// Run this with: node server/test-role-permissions.js

const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Load Role model
const Role = require('./models/Role');

console.log('\n🔍 Testing Role Permissions Enum...\n');

// Debug the schema structure
console.log('Schema paths:', Object.keys(Role.schema.paths));
console.log('\nPermissions path type:', Role.schema.paths.permissions);
console.log('\nPermissions schema:', Role.schema.paths.permissions.schema);

// Try to get enum values
const permissionsPath = Role.schema.path('permissions');
console.log('\nPermissions path:', permissionsPath);

// Check if it's an array with nested schema
let permissionsEnum;
if (permissionsPath && permissionsPath.schema) {
  // It's an array of subdocuments
  const nestedPath = permissionsPath.schema.path('');
  console.log('\nNested path:', nestedPath);
  permissionsEnum = nestedPath ? nestedPath.enumValues : undefined;
} else if (permissionsPath && permissionsPath.enumValues) {
  // Direct enum
  permissionsEnum = permissionsPath.enumValues;
} else if (permissionsPath && permissionsPath.caster && permissionsPath.caster.enumValues) {
  // Array with enum on caster
  permissionsEnum = permissionsPath.caster.enumValues;
}

console.log('\n📊 Permissions enum found:', permissionsEnum ? 'YES' : 'NO');
if (permissionsEnum) {
  console.log('📊 Total permissions in enum:', permissionsEnum.length);
} else {
  console.log('❌ Could not find permissions enum!');
  console.log('\nDebugging info:');
  console.log('- Has caster?', !!permissionsPath.caster);
  if (permissionsPath.caster) {
    console.log('- Caster type:', permissionsPath.caster.instance);
    console.log('- Caster enumValues?', !!permissionsPath.caster.enumValues);
  }
  process.exit(1);
}
console.log('\n📋 All permissions:\n');

// Group by category
const categories = {
  broad: [],
  campaigns: [],
  pledges: [],
  payments: [],
  donations: [],
  feedback: [],
  analytics: []
};

permissionsEnum.forEach(perm => {
  if (perm.startsWith('manage:')) {
    categories.broad.push(perm);
  } else if (perm.includes('campaign')) {
    categories.campaigns.push(perm);
  } else if (perm.includes('pledge')) {
    categories.pledges.push(perm);
  } else if (perm.includes('payment')) {
    categories.payments.push(perm);
  } else if (perm.includes('donation')) {
    categories.donations.push(perm);
  } else if (perm.includes('feedback')) {
    categories.feedback.push(perm);
  } else if (perm.includes('analytics') || perm.includes('audit')) {
    categories.analytics.push(perm);
  }
});

console.log('🔧 BROAD PERMISSIONS:', categories.broad.length);
categories.broad.forEach(p => console.log('  -', p));

console.log('\n💰 CAMPAIGN PERMISSIONS:', categories.campaigns.length);
categories.campaigns.forEach(p => console.log('  -', p));

console.log('\n🤝 PLEDGE PERMISSIONS:', categories.pledges.length);
categories.pledges.forEach(p => console.log('  -', p));

console.log('\n💳 PAYMENT PERMISSIONS:', categories.payments.length);
categories.payments.forEach(p => console.log('  -', p));

console.log('\n💸 OTHER DONATION PERMISSIONS:', categories.donations.length);
categories.donations.forEach(p => console.log('  -', p));

console.log('\n💬 FEEDBACK PERMISSIONS:', categories.feedback.length);
categories.feedback.forEach(p => console.log('  -', p));

console.log('\n📊 ANALYTICS PERMISSIONS:', categories.analytics.length);
categories.analytics.forEach(p => console.log('  -', p));

// Test specific permissions
console.log('\n\n🧪 TESTING SPECIFIC PERMISSIONS:\n');

const testPerms = [
  'view:campaigns',
  'create:campaigns',
  'view:pledges',
  'view:pledges:all',
  'process:payments',
  'view:donation:reports',
  'read:feedback:sermon',
  'manage:donations'
];

testPerms.forEach(perm => {
  const exists = permissionsEnum.includes(perm);
  console.log(exists ? '✅' : '❌', perm);
});

console.log('\n✅ Test complete!\n');

mongoose.connection.close();
process.exit(0);