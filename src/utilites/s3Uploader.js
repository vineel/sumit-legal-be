const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');



const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});


/**
 * Upload file to S3
 * @param {Buffer} fileBuffer - File buffer data
 * @param {string} originalName - Original filename
 * @param {string} mimeType - File MIME type
 * @param {string} userId - User ID for organizing files
 * @param {string} type - Type of upload ('signature' or 'photo')
 * @returns {Promise<string>} - S3 URL of uploaded file
 */
const uploadFileToS3 = async (fileBuffer, originalName, mimeType, userId, type = 'signature') => {
  try {
    console.log(`Uploading ${type} to S3 for user: ${userId}`);
    console.log('File size:', fileBuffer ? fileBuffer.length : 'undefined', 'bytes');
    console.log('MIME type:', mimeType);
    console.log('Original name:', originalName);
    
    // Validate inputs
    if (!fileBuffer) {
      throw new Error('File buffer is required');
    }
    if (!userId) {
      throw new Error('User ID is required');
    }
    if (!mimeType) {
      throw new Error('MIME type is required');
    }
    
    // Check AWS credentials
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS credentials not configured');
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const extension = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'png';
    const filename = `${type}_${timestamp}_${uuidv4()}.${extension}`;
    
    // Create S3 key
    const key = `users/${userId}/${type}s/${filename}`;
    console.log('S3 key:', key);
    
    // Get bucket and region from environment
    const bucket = process.env.AWS_S3_BUCKET || 'legal-collab-media';
    const region = process.env.AWS_REGION || 'us-east-2';
    
    console.log('S3 configuration:', { bucket, region });
    
    // Upload to S3
    const uploadParams = {
      Bucket: bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
    };

    const command = new PutObjectCommand(uploadParams);
    await s3.send(command);
    
    // Return the public URL
    const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    
    console.log(`${type} uploaded successfully: ${url}`);
    return url;
    
  } catch (error) {
    console.error(`Error uploading ${type} to S3:`, error);
    console.error('Error stack:', error.stack);
    throw new Error(`Failed to upload ${type}: ${error.message}`);
  }
};

/**
 * Upload signature data to S3 (legacy function for backward compatibility)
 * @param {string} signatureData - Base64 encoded signature data
 * @param {string} userId - User ID for organizing files
 * @returns {Promise<string>} - S3 URL of uploaded signature
 */
const uploadSignatureToS3 = async (signatureData, userId) => {
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
    const filename = `signature_${timestamp}_${uuidv4()}.${extension}`;
    
    // Create S3 key
    const key = `users/${userId}/signatures/${filename}`;
    console.log('S3 key:', key);
    
    // Upload to S3
    const uploadParams = {
      Bucket: 'legal-collab-media',
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    };

    const command = new PutObjectCommand(uploadParams);
    await s3.send(command);
    
    // Return the public URL
    const region = 'us-east-2';
    const bucket = 'legal-collab-media';
    const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    
    console.log(`Signature uploaded successfully: ${url}`);
    return url;
    
  } catch (error) {
    console.error('Error uploading signature to S3:', error);
    console.error('Signature data sample:', signatureData ? signatureData.substring(0, 200) : 'null');
    throw new Error(`Failed to upload signature: ${error.message}`);
  }
};

module.exports = { uploadFileToS3, uploadSignatureToS3 };
