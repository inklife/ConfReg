const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const { PptUpload, User, RegistrationSubmission } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { apiResponse } = require('../utils/response');

const router = express.Router();

// 上传目录
const PPT_UPLOAD_DIR = path.join(__dirname, '../../uploads/ppt');

// 确保上传目录存在
if (!fs.existsSync(PPT_UPLOAD_DIR)) {
  fs.mkdirSync(PPT_UPLOAD_DIR, { recursive: true });
}

// 允许的文件扩展名
const ALLOWED_EXTENSIONS = ['.zip', '.ppt', '.pptx', '.pdf'];

// 最大文件大小 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// 配置multer存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, PPT_UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

// 文件过滤器
const fileFilter = function (req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: fileFilter
});

// 计算文件hash
function calculateFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/**
 * 获取用户当前上传的PPT文件
 */
router.get('/my-upload', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // 检查用户是否有已批准的注册
    const approvedRegistration = await RegistrationSubmission.findOne({
      where: {
        userId: userId,
        status: 'approved',
        [Op.or]: [
          { is_refunded: false },
          { is_refunded: null }
        ]
      }
    });
    
    if (!approvedRegistration) {
      return res.status(403).json({
        success: false,
        message: 'Only users with approved registration can access PPT upload'
      });
    }
    
    const upload = await PptUpload.getUserActiveUpload(userId);
    
    if (!upload) {
      return apiResponse(res, true, { upload: null }, 'No upload found');
    }
    
    res.json({
      success: true,
      data: {
        upload: {
          id: upload.id,
          originalFilename: upload.originalFilename,
          fileExtension: upload.fileExtension,
          fileSize: upload.fileSize,
          fileSizeFormatted: formatFileSize(upload.fileSize),
          fileHash: upload.fileHash,
          mimeType: upload.mimeType,
          uploadTime: upload.uploadTime,
          description: upload.description
        }
      }
    });
  } catch (error) {
    console.error('Get PPT upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get upload information',
      error: error.message
    });
  }
});

/**
 * 获取用户所有上传历史
 */
router.get('/my-uploads', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // 检查用户是否有已批准的注册
    const approvedRegistration = await RegistrationSubmission.findOne({
      where: {
        userId: userId,
        status: 'approved',
        [Op.or]: [
          { is_refunded: false },
          { is_refunded: null }
        ]
      }
    });
    
    if (!approvedRegistration) {
      return res.status(403).json({
        success: false,
        message: 'Only users with approved registration can access PPT upload'
      });
    }
    
    const uploads = await PptUpload.getUserUploads(userId);
    
    res.json({
      success: true,
      data: {
        uploads: uploads.map(upload => ({
          id: upload.id,
          originalFilename: upload.originalFilename,
          fileExtension: upload.fileExtension,
          fileSize: upload.fileSize,
          fileSizeFormatted: formatFileSize(upload.fileSize),
          fileHash: upload.fileHash,
          mimeType: upload.mimeType,
          uploadTime: upload.uploadTime,
          description: upload.description
        }))
      }
    });
  } catch (error) {
    console.error('Get PPT uploads error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get upload list',
      error: error.message
    });
  }
});

/**
 * 上传PPT文件（覆盖上传）
 */
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // 检查用户是否有已批准的注册
    const approvedRegistration = await RegistrationSubmission.findOne({
      where: {
        userId: userId,
        status: 'approved',
        [Op.or]: [
          { is_refunded: false },
          { is_refunded: null }
        ]
      }
    });
    
    if (!approvedRegistration) {
      // 如果上传了文件但不允许，需要删除临时文件
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(403).json({
        success: false,
        message: 'Only users with approved registration can upload PPT files'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    const filePath = req.file.path;
    const originalFilename = req.file.originalname;
    const storedFilename = req.file.filename;
    const fileExtension = path.extname(originalFilename).toLowerCase();
    const fileSize = req.file.size;
    const mimeType = req.file.mimetype;
    const description = req.body.description || null;
    
    // 计算文件hash
    const fileHash = await calculateFileHash(filePath);
    
    // 检查是否已有上传，如果有则标记为deleted并删除物理文件
    const existingUpload = await PptUpload.getUserActiveUpload(userId);
    if (existingUpload) {
      // 删除旧文件
      const oldFilePath = path.join(PPT_UPLOAD_DIR, existingUpload.storedFilename);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
      // 软删除旧记录
      await existingUpload.softDelete();
    }
    
    // 创建新的上传记录
    const newUpload = await PptUpload.create({
      userId,
      originalFilename,
      storedFilename,
      fileExtension,
      fileSize,
      fileHash,
      mimeType,
      uploadTime: new Date(),
      description,
      status: 'active'
    });
    
    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        upload: {
          id: newUpload.id,
          originalFilename: newUpload.originalFilename,
          fileExtension: newUpload.fileExtension,
          fileSize: newUpload.fileSize,
          fileSizeFormatted: formatFileSize(newUpload.fileSize),
          fileHash: newUpload.fileHash,
          mimeType: newUpload.mimeType,
          uploadTime: newUpload.uploadTime,
          description: newUpload.description
        }
      }
    });
  } catch (error) {
    console.error('PPT upload error:', error);
    
    // 如果上传失败，删除已上传的临时文件
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to upload file',
      error: error.message
    });
  }
});

/**
 * 删除上传的PPT文件
 */
router.delete('/delete/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const uploadId = parseInt(req.params.id);
    
    // 检查用户是否有已批准的注册
    const approvedRegistration = await RegistrationSubmission.findOne({
      where: {
        userId: userId,
        status: 'approved',
        [Op.or]: [
          { is_refunded: false },
          { is_refunded: null }
        ]
      }
    });
    
    if (!approvedRegistration) {
      return res.status(403).json({
        success: false,
        message: 'Only users with approved registration can manage PPT uploads'
      });
    }
    
    // 查找用户的上传记录
    const upload = await PptUpload.findOne({
      where: {
        id: uploadId,
        userId,
        status: 'active'
      }
    });
    
    if (!upload) {
      return res.status(404).json({
        success: false,
        message: 'Upload not found'
      });
    }
    
    // 删除物理文件
    const filePath = path.join(PPT_UPLOAD_DIR, upload.storedFilename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // 软删除记录
    await upload.softDelete();
    
    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete PPT upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file',
      error: error.message
    });
  }
});

/**
 * 清空用户所有上传
 */
router.delete('/clear-all', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // 检查用户是否有已批准的注册
    const approvedRegistration = await RegistrationSubmission.findOne({
      where: {
        userId: userId,
        status: 'approved',
        [Op.or]: [
          { is_refunded: false },
          { is_refunded: null }
        ]
      }
    });
    
    if (!approvedRegistration) {
      return res.status(403).json({
        success: false,
        message: 'Only users with approved registration can manage PPT uploads'
      });
    }
    
    // 查找用户所有活跃的上传
    const uploads = await PptUpload.findAll({
      where: {
        userId,
        status: 'active'
      }
    });
    
    // 删除所有物理文件并软删除记录
    for (const upload of uploads) {
      const filePath = path.join(PPT_UPLOAD_DIR, upload.storedFilename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      await upload.softDelete();
    }
    
    res.json({
      success: true,
      message: `${uploads.length} file(s) deleted successfully`
    });
  } catch (error) {
    console.error('Clear all PPT uploads error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear all files',
      error: error.message
    });
  }
});

// 错误处理中间件 - 处理multer错误
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${error.message}`
    });
  }
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next();
});

module.exports = router;
