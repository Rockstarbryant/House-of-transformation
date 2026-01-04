// server/config/validateEnv.js
const required = [
  'MONGODB_URI',
  'JWT_SECRET',
  'NODE_ENV',
  'MPESA_CONSUMER_KEY',
  'MPESA_CONSUMER_SECRET'
];

function validateEnv() {
  const missing = required.filter(env => !process.env[env]);
  
  if (missing.length > 0) {
    throw new Error(`Missing env vars: ${missing.join(', ')}`);
  }
  
  // Validate JWT_SECRET length
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
  
  console.log('✓ Environment variables validated');
}

module.exports = validateEnv;