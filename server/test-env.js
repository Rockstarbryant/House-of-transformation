require('dotenv').config();

console.log('Checking environment variables...');
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length || 0);
console.log('JWT_EXPIRE:', process.env.JWT_EXPIRE);

if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET is empty! Update your .env file');
} else if (process.env.JWT_SECRET.length < 32) {
  console.warn('⚠️ JWT_SECRET is too short (min 32 chars)');
} else {
  console.log('✅ JWT_SECRET is properly configured');
}