const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log('🔧 Cloudinary config:');
console.log('   Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME ? '✅' : '❌ MISSING');
console.log('   API Key:', process.env.CLOUDINARY_API_KEY ? '✅' : '❌ MISSING');
console.log('   API Secret:', process.env.CLOUDINARY_API_SECRET ? '✅' : '❌ MISSING');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'church-gallery',
    resource_type: 'auto',
    quality: 'auto',
    fetch_format: 'auto'
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024
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