const multer = require('multer');


// File type validation
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'photo' || file.fieldname === 'signature') {
    // only allow images
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg') {
      cb(null, true);
    } else {
      cb(new Error('Only .png and .jpeg format allowed for photos/signatures!'), false);
    }
  } else if (file.fieldname === 'file') {
    // allow docs
    if (
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/msword' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX formats allowed for files!'), false);
    }
  } else {
    cb(new Error('Invalid field name! Use "photo", "signature" or "file".'), false);
  }
};

// Memory storage for S3 upload handling
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // default max 10MB
  fileFilter,
});

// ✅ Unified middleware
const uploadUserMedia = upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'signature', maxCount: 1 },
  { name: 'file', maxCount: 1 },
]);

module.exports = { uploadUserMedia };
