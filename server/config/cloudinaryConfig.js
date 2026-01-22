const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log('🔧 Cloudinary config:');
console.log('   Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME ? '✅' : '❌ MISSING');
console.log('   API Key:', process.env.CLOUDINARY_API_KEY ? '✅' : '❌ MISSING');
console.log('   API Secret:', process.env.CLOUDINARY_API_SECRET ? '✅' : '❌ MISSING');

// ✅ NEW API: params must be a function
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'church-gallery',
      format: 'auto', // ✅ Changed from fetch_format
      resource_type: 'auto',
      transformation: [{ quality: 'auto' }] // ✅ Changed from quality: 'auto'
    };
  }
});

// Create multer instance with file size and type limits
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB per file
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      console.error('❌ Invalid file type:', file.mimetype);
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WebP allowed'), false);
    }
  }
});

module.exports = { cloudinary, upload };