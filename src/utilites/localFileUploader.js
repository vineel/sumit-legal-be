const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
const signaturesDir = path.join(uploadsDir, 'signatures');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(signaturesDir)) {
  fs.mkdirSync(signaturesDir, { recursive: true });
}

/**
 * Upload signature data to local file system
 * @param {string} signatureData - Base64 encoded signature data
 * @param {string} userId - User ID for organizing files
 * @returns {Promise<string>} - Local URL of uploaded signature
 */
const uploadSignatureToLocal = async (signatureData, userId) => {
  try {
    console.log('Signature data received:', signatureData ? signatureData.substring(0, 100) + '...' : 'null');
    console.log('Signature data type:', typeof signatureData);
    console.log('Signature data length:', signatureData ? signatureData.length : 0);
    
    if (!signatureData) {
      throw new Error('No signature data provided');
    }

    let mimeType = 'image/png'; // Default to PNG
    let base64Data = signatureData;
    
    // Check if it's a data URL format (data:image/png;base64,...)
    const dataUrlMatch = signatureData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (dataUrlMatch) {
      mimeType = dataUrlMatch[1];
      base64Data = dataUrlMatch[2];
      console.log('Detected data URL format with mime type:', mimeType);
    } else {
      // Check if it's already base64 data without data URL prefix
      console.log('No data URL prefix detected, treating as raw base64');
      
      // Validate if it's valid base64
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(signatureData)) {
        throw new Error('Invalid base64 signature data format');
      }
    }
    
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');
    console.log('Buffer size:', buffer.length, 'bytes');
    
    // Generate unique filename with proper extension
    const timestamp = Date.now();
    const extension = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'png';
    const filename = `signature_${userId}_${timestamp}_${uuidv4()}.${extension}`;
    
    // Create file path
    const filePath = path.join(signaturesDir, filename);
    console.log('File path:', filePath);
    
    // Write file to local storage
    fs.writeFileSync(filePath, buffer);
    
    // Return the local URL (accessible via static file serving)
    const url = `/uploads/signatures/${filename}`;
    
    console.log(`Signature uploaded successfully: ${url}`);
    return url;
    
  } catch (error) {
    console.error('Error uploading signature to local storage:', error);
    console.error('Signature data sample:', signatureData ? signatureData.substring(0, 200) : 'null');
    throw new Error(`Failed to upload signature: ${error.message}`);
  }
};

module.exports = { uploadSignatureToLocal };
