const express = require('express');
const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const { PptUpload, User } = require('../models');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// PPT 上传目录
const PPT_UPLOAD_DIR = path.join(__dirname, '../../uploads/ppt');

/**
 * 获取所有PPT上传记录（管理员）
 * GET /admin/ppt
 */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    
    let where = { status: 'active' };
    let userWhere = {};

    // 搜索功能
    if (search) {
      const searchTerm = search.trim();
      userWhere = {
        [Op.or]: [
          { username: { [Op.like]: `%${searchTerm}%` } },
          { email: { [Op.like]: `%${searchTerm}%` } }
        ]
      };
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // 查询PPT文件及关联用户
    const { count, rows: files } = await PptUpload.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'fullname'],
          where: search ? userWhere : undefined,
          required: !!search
        }
      ],
      order: [['uploadTime', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    // 格式化返回数据
    const formattedFiles = files.map(file => ({
      id: file.id,
      userId: file.userId,
      username: file.user?.username || '未知用户',
      email: file.user?.email || '未知',
      fullname: file.user?.fullname || '',
      originalFilename: file.originalFilename,
      storedFilename: file.storedFilename,
      fileExtension: file.fileExtension,
      fileSize: file.fileSize,
      fileHash: file.fileHash,
      mimeType: file.mimeType,
      uploadTime: file.uploadTime,
      description: file.description
    }));

    res.json({
      success: true,
      data: {
        files: formattedFiles,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(count / parseInt(limit)),
          count: formattedFiles.length,
          totalRecords: count
        }
      }
    });

  } catch (error) {
    console.error('Get PPT files error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 下载单个PPT文件（管理员）
 * GET /admin/ppt/:id/download
 */
router.get('/:id/download', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const pptFile = await PptUpload.findOne({
      where: {
        id: parseInt(id),
        status: 'active'
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['username', 'email']
        }
      ]
    });

    if (!pptFile) {
      return res.status(404).json({
        success: false,
        message: 'PPT文件不存在'
      });
    }

    const filePath = path.join(PPT_UPLOAD_DIR, pptFile.storedFilename);

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: '文件不存在于服务器上'
      });
    }

    // 构建下载文件名：用户名_原始文件名
    const downloadFilename = `${pptFile.user?.username || 'unknown'}_${pptFile.originalFilename}`;

    // 设置响应头并发送文件
    res.setHeader('Content-Type', pptFile.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(downloadFilename)}`);
    
    res.sendFile(filePath);

  } catch (error) {
    console.error('Download PPT file error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 导出PPT文件列表（CSV格式）（管理员）
 * GET /admin/ppt/export
 */
router.get('/export', requireAdmin, async (req, res) => {
  try {
    const { search } = req.query;
    
    let where = { status: 'active' };
    let userWhere = {};

    if (search) {
      const searchTerm = search.trim();
      userWhere = {
        [Op.or]: [
          { username: { [Op.like]: `%${searchTerm}%` } },
          { email: { [Op.like]: `%${searchTerm}%` } }
        ]
      };
    }

    // 获取所有文件
    const files = await PptUpload.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'fullname'],
          where: search ? userWhere : undefined,
          required: !!search
        }
      ],
      order: [['uploadTime', 'DESC']]
    });

    // 生成CSV内容
    const csvHeaders = ['ID', '用户ID', '用户名', '邮箱', '姓名', '原始文件名', '文件大小(字节)', '上传时间', '下载地址'];
    const csvRows = files.map(file => {
      const downloadUrl = `${req.protocol}://${req.get('host')}/admin/ppt/${file.id}/download`;
      return [
        file.id,
        file.userId,
        file.user?.username || '',
        file.user?.email || '',
        file.user?.fullname || '',
        `"${(file.originalFilename || '').replace(/"/g, '""')}"`,
        file.fileSize,
        file.uploadTime ? new Date(file.uploadTime).toISOString() : '',
        downloadUrl
      ].join(',');
    });

    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');

    // 添加 BOM 以支持 Excel 正确识别 UTF-8
    const bom = '\uFEFF';
    const csvWithBom = bom + csvContent;

    // 设置响应头
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `ppt_list_${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    
    res.send(csvWithBom);

  } catch (error) {
    console.error('Export PPT list error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 获取单个PPT文件详情（管理员）
 * GET /admin/ppt/:id
 */
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const pptFile = await PptUpload.findOne({
      where: {
        id: parseInt(id),
        status: 'active'
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'fullname']
        }
      ]
    });

    if (!pptFile) {
      return res.status(404).json({
        success: false,
        message: 'PPT文件不存在'
      });
    }

    res.json({
      success: true,
      data: {
        id: pptFile.id,
        userId: pptFile.userId,
        username: pptFile.user?.username || '未知用户',
        email: pptFile.user?.email || '未知',
        fullname: pptFile.user?.fullname || '',
        originalFilename: pptFile.originalFilename,
        storedFilename: pptFile.storedFilename,
        fileExtension: pptFile.fileExtension,
        fileSize: pptFile.fileSize,
        fileHash: pptFile.fileHash,
        mimeType: pptFile.mimeType,
        uploadTime: pptFile.uploadTime,
        description: pptFile.description
      }
    });

  } catch (error) {
    console.error('Get PPT file detail error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
