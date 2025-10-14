const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../config/database');
const { InvoiceRequest, InvoiceFile, RegistrationSubmission, User } = require('../models');
const { requireAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');

// 配置multer用于管理员上传发票文件
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/invoices');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `invoice_${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: function (req, file, cb) {
    // 允许的文件类型：PDF, JPG, PNG
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传PDF、JPG或PNG格式的文件'));
    }
  }
});

// 添加multer中间件来处理中文文件名编码
const handleFileUpload = (req, res, next) => {
  upload.single('invoice')(req, res, (err) => {
    if (err) {
      return next(err);
    }
    
    // 处理文件名编码问题
    if (req.file && req.file.originalname) {
      try {
        // 检查是否需要重新编码文件名
        const originalName = req.file.originalname;
        
        // 如果文件名包含奇怪字符，尝试重新编码
        if (!/^[\x00-\x7F]*$/.test(originalName)) {
          // 不是纯ASCII字符，可能需要处理编码
          const testDecoded = Buffer.from(originalName, 'latin1').toString('utf8');
          
          // 验证解码结果是否更合理（包含中文字符而不是乱码）
          if (/[\u4e00-\u9fff]/.test(testDecoded) && !testDecoded.includes('�')) {
            req.file.originalname = testDecoded;
          }
        }
      } catch (error) {
        console.warn('文件名编码处理警告:', error.message);
        // 保持原始文件名
      }
    }
    
    next();
  });
};

// 获取所有发票申请（管理员）
router.get('/requests', requireAdmin, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};
    if (status) {
      whereClause.status = status;
    }

    let includeClause = [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'fullname', 'email']
      },
      {
        model: RegistrationSubmission,
        as: 'registration',
        attributes: ['id', 'name', 'product_code', 'product_price', 'submission_time']
      },
      {
        model: InvoiceFile,
        as: 'files',
        attributes: ['id', 'originalName', 'uploadedAt', 'displayOrder']
      }
    ];

    // 如果有搜索条件，构建综合搜索
    if (search) {
      const searchTerm = search.trim();
      
      // 如果搜索词为空，不进行搜索
      if (!searchTerm) {
        // 正常返回所有数据，不添加搜索条件
      } else {
        // 处理邮箱搜索：如果包含@，取前半部分；否则直接搜索
        const emailSearchTerm = searchTerm.includes('@') ? searchTerm.split('@')[0] : searchTerm;

        // 先查找匹配的用户ID
        const matchingUsers = await User.findAll({
          where: {
            [Op.or]: [
              { fullname: { [Op.like]: `%${searchTerm}%` } },
              { username: { [Op.like]: `%${searchTerm}%` } },
              { email: { [Op.like]: `%${emailSearchTerm}%` } }
            ]
          },
          attributes: ['id']
        });

        const userIds = matchingUsers.map(user => user.id);

        // 构建搜索条件：发票抬头 OR 用户匹配
        const searchConditions = [
          { invoiceTitle: { [Op.like]: `%${searchTerm}%` } }
        ];

        if (userIds.length > 0) {
          searchConditions.push({ userId: { [Op.in]: userIds } });
        }

        whereClause[Op.or] = searchConditions;
      }
    }

    const { count, rows: requests } = await InvoiceRequest.findAndCountAll({
      where: whereClause,
      include: includeClause,
      order: [
        ['requestedAt', 'DESC'],
        [{ model: InvoiceFile, as: 'files' }, 'displayOrder', 'ASC'],
        [{ model: InvoiceFile, as: 'files' }, 'uploadedAt', 'ASC']
      ],
      limit: parseInt(limit),
      offset: offset,
      distinct: true // 确保count正确，因为有JOIN操作
    });

    res.json({
      requests: requests,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit)
    });

  } catch (error) {
    console.error('获取发票申请列表失败:', error);
    res.status(500).json({
      error: 'Failed to obtain invoice application list',
      details: error.message
    });
  }
});

// 获取发票申请详情（管理员）
router.get('/request/:id', requireAdmin, async (req, res) => {
  try {
    const request = await InvoiceRequest.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'fullname', 'email']
        },
        {
          model: RegistrationSubmission,
          as: 'registration',
          attributes: ['id', 'name', 'email', 'phone', 'affiliation', 'product_code', 'product_price', 'submission_time']
        },
        {
          model: InvoiceFile,
          as: 'files',
          include: [
            {
              model: User,
              as: 'uploader',
              attributes: ['id', 'username', 'fullname']
            }
          ]
        }
      ],
      order: [
        [{ model: InvoiceFile, as: 'files' }, 'displayOrder', 'ASC'],
        [{ model: InvoiceFile, as: 'files' }, 'uploadedAt', 'ASC']
      ]
    });

    if (!request) {
      return res.status(404).json({
        error: '发票申请不存在'
      });
    }

    res.json({
      request: request
    });

  } catch (error) {
    console.error('获取发票申请详情失败:', error);
    res.status(500).json({
      error: '获取发票申请详情失败',
      details: error.message
    });
  }
});

// 更新发票申请状态（管理员）
router.put('/request/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;

    if (!['pending', 'processing', 'completed', 'rejected'].includes(status)) {
      return res.status(400).json({
        error: '无效的状态值'
      });
    }

    const request = await InvoiceRequest.findByPk(req.params.id);
    if (!request) {
      return res.status(404).json({
        error: '发票申请不存在'
      });
    }

    const updateData = {
      status: status,
      adminNotes: adminNotes
    };

    if (status === 'completed' || status === 'rejected') {
      updateData.processedAt = new Date();
    }

    await request.update(updateData);

    res.json({
      message: '状态更新成功',
      request: await InvoiceRequest.findByPk(req.params.id, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'fullname', 'email']
          },
          {
            model: RegistrationSubmission,
            as: 'registration',
            attributes: ['id', 'name', 'product_code', 'product_price']
          }
        ]
      })
    });

  } catch (error) {
    console.error('状态更新失败:', error);
    res.status(500).json({
      error: '状态更新失败',
      details: error.message
    });
  }
});

// 重新审核发票申请（管理员）
router.post('/request/:id/re-review', requireAdmin, async (req, res) => {
  try {
    const request = await InvoiceRequest.findByPk(req.params.id);
    if (!request) {
      return res.status(404).json({
        error: '发票申请不存在'
      });
    }

    // 检查当前状态
    if (request.status === 'pending') {
      return res.status(400).json({
        error: '发票申请已经是待处理状态'
      });
    }

    // 重置为待处理状态
    const updateData = {
      status: 'pending',
      adminNotes: '',
      processedAt: null
    };

    await request.update(updateData);

    res.json({
      message: '发票申请已重新设置为待处理状态',
      request: await InvoiceRequest.findByPk(req.params.id, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'fullname', 'email']
          },
          {
            model: RegistrationSubmission,
            as: 'registration',
            attributes: ['id', 'name', 'product_code', 'product_price']
          }
        ]
      })
    });

  } catch (error) {
    console.error('重新审核失败:', error);
    res.status(500).json({
      error: '重新审核失败',
      details: error.message
    });
  }
});

// 上传发票文件（管理员）
router.post('/request/:id/upload', requireAdmin, handleFileUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: '请选择要上传的文件'
      });
    }

    const request = await InvoiceRequest.findByPk(req.params.id);
    if (!request) {
      return res.status(404).json({
        error: '发票申请不存在'
      });
    }

    // 获取当前文件的最大显示顺序
    const maxOrder = await InvoiceFile.max('displayOrder', {
      where: { invoiceRequestId: request.id }
    }) || 0;

    // 创建文件记录 - 存储相对路径而不是绝对路径
    const relativePath = path.relative(path.join(__dirname, '../..'), req.file.path);
    
    const invoiceFile = await InvoiceFile.create({
      invoiceRequestId: request.id,
      originalName: req.file.originalname, // 已在中间件中处理编码
      fileName: req.file.filename,
      filePath: relativePath,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedBy: req.session.adminUserId || req.session.userId,
      displayOrder: maxOrder + 1 // 新文件排在最后
    });

    // 如果申请状态是pending，自动更新为processing
    if (request.status === 'pending') {
      await request.update({ status: 'processing' });
    }

    res.json({
      message: '发票文件上传成功',
      file: {
        id: invoiceFile.id,
        originalName: invoiceFile.originalName,
        uploadedAt: invoiceFile.uploadedAt,
        displayOrder: invoiceFile.displayOrder
      }
    });

  } catch (error) {
    console.error('发票文件上传失败:', error);
    // 如果有文件上传，删除文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      error: '发票文件上传失败',
      details: error.message
    });
  }
});

// 删除发票文件（管理员）
router.delete('/file/:fileId', requireAdmin, async (req, res) => {
  try {
    const file = await InvoiceFile.findByPk(req.params.fileId);
    if (!file) {
      return res.status(404).json({
        error: '文件不存在'
      });
    }

    // 删除文件系统中的文件
    const absolutePath = path.isAbsolute(file.filePath) 
      ? file.filePath 
      : path.join(__dirname, '../..', file.filePath);
    
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    // 删除数据库记录
    await file.destroy();

    res.json({
      message: '文件删除成功'
    });

  } catch (error) {
    console.error('文件删除失败:', error);
    res.status(500).json({
      error: '文件删除失败',
      details: error.message
    });
  }
});

// 下载发票文件（管理员）
router.get('/download/:fileId', requireAdmin, async (req, res) => {
  try {
    const file = await InvoiceFile.findByPk(req.params.fileId);
    if (!file) {
      return res.status(404).json({
        error: '文件不存在'
      });
    }

    // 构建绝对路径
    const absolutePath = path.isAbsolute(file.filePath) 
      ? file.filePath 
      : path.join(__dirname, '../..', file.filePath);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({
        error: '文件已被删除'
      });
    }

    // 处理中文文件名编码
    const fileName = file.originalName;
    const encodedFileName = encodeURIComponent(fileName);
    
    // 设置 Content-Disposition 头部，使用 RFC 5987 标准支持中文文件名
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}`);
    res.setHeader('Content-Type', file.mimeType);
    res.sendFile(path.resolve(absolutePath));

  } catch (error) {
    console.error('文件下载失败:', error);
    res.status(500).json({
      error: '文件下载失败',
      details: error.message
    });
  }
});

// 删除单个发票文件（管理员）
router.delete('/file/:fileId', requireAdmin, async (req, res) => {
  try {
    const file = await InvoiceFile.findByPk(req.params.fileId);
    if (!file) {
      return res.status(404).json({
        error: '文件不存在'
      });
    }

    // 删除物理文件
    const absolutePath = path.isAbsolute(file.filePath) 
      ? file.filePath 
      : path.join(__dirname, '../..', file.filePath);
    
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    // 删除数据库记录
    await file.destroy();

    res.json({
      message: '文件删除成功'
    });

  } catch (error) {
    console.error('删除文件失败:', error);
    res.status(500).json({
      error: '删除文件失败',
      details: error.message
    });
  }
});

// 重新排序发票文件（管理员）
router.put('/request/:id/files/reorder', requireAdmin, async (req, res) => {
  try {
    const { fileOrder } = req.body; // [{ fileId, order }, ...]

    if (!Array.isArray(fileOrder)) {
      return res.status(400).json({
        error: '文件顺序数据格式错误'
      });
    }

    // 使用事务更新文件顺序
    await sequelize.transaction(async (t) => {
      for (const item of fileOrder) {
        await InvoiceFile.update(
          { displayOrder: item.order },
          { 
            where: { id: item.fileId },
            transaction: t
          }
        );
      }
    });

    res.json({
      message: '文件顺序更新成功'
    });

  } catch (error) {
    console.error('更新文件顺序失败:', error);
    res.status(500).json({
      error: '更新文件顺序失败',
      details: error.message
    });
  }
});

// 获取发票申请统计信息（管理员）
router.get('/statistics', requireAdmin, async (req, res) => {
  try {
    const stats = await InvoiceRequest.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    const totalAmount = await InvoiceRequest.sum('amount', {
      where: {
        status: 'completed'
      }
    });

    const result = {
      byStatus: {},
      totalCompleted: totalAmount || 0
    };

    stats.forEach(stat => {
      result.byStatus[stat.status] = parseInt(stat.getDataValue('count'));
    });

    res.json(result);

  } catch (error) {
    console.error('获取统计信息失败:', error);
    res.status(500).json({
      error: '获取统计信息失败',
      details: error.message
    });
  }
});

module.exports = router;
