const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { MealVoucher, User } = require('../models');
const { requireAuth } = require('../middleware/auth');

// 配置文件上传
const uploadDir = path.join(__dirname, '../../uploads/vouchers');

// 确保上传目录存在
const ensureUploadDir = async () => {
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    await ensureUploadDir();
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const filename = `voucher_${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// 生成餐券代码
function generateVoucherCode() {
  const prefix = 'MV';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

// 获取用户的餐券列表
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const vouchers = await MealVoucher.findAll({
      where: { userId },
      include: [
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'username', 'email', 'fullname']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      vouchers: vouchers.map(v => ({
        id: v.id,
        quantity: v.quantity,
        unit_price_usd: v.unit_price_usd,
        unit_price_rmb: v.unit_price_rmb,
        total_amount_usd: v.total_amount_usd,
        total_amount_rmb: v.total_amount_rmb,
        attendee_name: v.attendee_name,
        email: v.email,
        payment_method: v.payment_method,
        payment_screenshot: v.payment_screenshot,
        status: v.status,
        voucher_code: v.voucher_code,
        admin_notes: v.admin_notes,
        reviewed_at: v.reviewed_at,
        reviewer: v.reviewer,
        created_at: v.createdAt,
        updated_at: v.updatedAt
      }))
    });
  } catch (error) {
    console.error('Get vouchers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vouchers',
      error: error.message
    });
  }
});

// 获取单个餐券详情
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const voucherId = req.params.id;
    
    const voucher = await MealVoucher.findOne({
      where: { 
        id: voucherId,
        userId 
      },
      include: [
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'username', 'email', 'fullname']
        }
      ]
    });

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found'
      });
    }

    res.json({
      success: true,
      voucher: {
        id: voucher.id,
        quantity: voucher.quantity,
        unit_price_usd: voucher.unit_price_usd,
        unit_price_rmb: voucher.unit_price_rmb,
        total_amount_usd: voucher.total_amount_usd,
        total_amount_rmb: voucher.total_amount_rmb,
        attendee_name: voucher.attendee_name,
        email: voucher.email,
        payment_method: voucher.payment_method,
        payment_screenshot: voucher.payment_screenshot,
        status: voucher.status,
        voucher_code: voucher.voucher_code,
        admin_notes: voucher.admin_notes,
        reviewed_at: voucher.reviewed_at,
        reviewer: voucher.reviewer,
        created_at: voucher.createdAt,
        updated_at: voucher.updatedAt
      }
    });
  } catch (error) {
    console.error('Get voucher error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch voucher',
      error: error.message
    });
  }
});

// 创建餐券购买请求
router.post('/', requireAuth, upload.single('payment_screenshot'), async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      quantity,
      attendee_name,
      email,
      payment_method
    } = req.body;

    // 验证必填字段
    if (!quantity || !attendee_name || !email || !payment_method) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // 验证支付截图
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Payment screenshot is required'
      });
    }

    // 计算总金额
    const unit_price_usd = 150;
    const unit_price_rmb = 1100;
    const total_amount_usd = unit_price_usd * parseInt(quantity);
    const total_amount_rmb = unit_price_rmb * parseInt(quantity);

    // 创建餐券记录
    const voucher = await MealVoucher.create({
      userId,
      quantity: parseInt(quantity),
      unit_price_usd,
      unit_price_rmb,
      total_amount_usd,
      total_amount_rmb,
      attendee_name,
      email,
      payment_method,
      payment_screenshot: `/uploads/vouchers/${req.file.filename}`,
      status: 'pending'
    });

    res.json({
      success: true,
      message: 'Voucher purchase request submitted successfully',
      voucher: {
        id: voucher.id,
        quantity: voucher.quantity,
        total_amount_usd: voucher.total_amount_usd,
        total_amount_rmb: voucher.total_amount_rmb,
        status: voucher.status,
        created_at: voucher.createdAt
      }
    });
  } catch (error) {
    console.error('Create voucher error:', error);
    
    // 删除上传的文件（如果有）
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (err) {
        console.error('Failed to delete uploaded file:', err);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create voucher purchase request',
      error: error.message
    });
  }
});

module.exports = router;
