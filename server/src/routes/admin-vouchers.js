const express = require('express');
const router = express.Router();
const { MealVoucher, User } = require('../models');
const { requireAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');

// 生成餐券代码（仅在审核通过时）
function generateVoucherCode() {
  const prefix = 'MV';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

// 获取所有餐券请求（管理员）
router.get('/', requireAdmin, async (req, res) => {
  try {
    const {
      status,
      page = 1,
      limit = 20,
      search
    } = req.query;

    const where = {};
    
    if (status && status !== 'all') {
      where.status = status;
    }

    if (search) {
      where[Op.or] = [
        { attendee_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { voucher_code: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: vouchers } = await MealVoucher.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'fullname']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'username', 'email', 'fullname']
        }
      ],
      order: [
        ['status', 'ASC'], // pending first
        ['created_at', 'DESC']
      ],
      limit: parseInt(limit),
      offset
    });

    // 统计信息
    const stats = await MealVoucher.findAll({
      attributes: [
        'status',
        [MealVoucher.sequelize.fn('COUNT', '*'), 'count'],
        [MealVoucher.sequelize.fn('SUM', MealVoucher.sequelize.col('quantity')), 'total_quantity'],
        [MealVoucher.sequelize.fn('SUM', MealVoucher.sequelize.col('total_amount_usd')), 'total_amount']
      ],
      group: ['status'],
      raw: true
    });

    res.json({
      success: true,
      vouchers: vouchers.map(v => ({
        id: v.id,
        user_id: v.userId,
        user: v.user,
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
        reviewed_by: v.reviewed_by,
        reviewer: v.reviewer,
        created_at: v.createdAt,
        updated_at: v.updatedAt
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit))
      },
      statistics: stats.reduce((acc, stat) => {
        acc[stat.status] = {
          count: parseInt(stat.count),
          total_quantity: parseInt(stat.total_quantity) || 0,
          total_amount: parseFloat(stat.total_amount) || 0
        };
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Get admin vouchers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vouchers',
      error: error.message
    });
  }
});

// 获取单个餐券详情（管理员）
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const voucherId = req.params.id;
    
    const voucher = await MealVoucher.findByPk(voucherId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'fullname']
        },
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
        user_id: voucher.userId,
        user: voucher.user,
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
        reviewed_by: voucher.reviewed_by,
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

// 更新餐券状态（审核）
router.put('/:id/status', requireAdmin, async (req, res) => {
  try {
    const voucherId = req.params.id;
    const adminId = req.user.id;
    const { status, admin_notes } = req.body;

    // 验证状态
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "approved" or "rejected"'
      });
    }

    const voucher = await MealVoucher.findByPk(voucherId);

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found'
      });
    }

    // 只能审核 pending 状态的餐券
    if (voucher.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending vouchers can be reviewed'
      });
    }

    // 更新餐券状态
    const updateData = {
      status,
      reviewed_by: adminId,
      reviewed_at: new Date(),
      admin_notes: admin_notes || null
    };

    // 如果审核通过，生成餐券代码
    if (status === 'approved' && !voucher.voucher_code) {
      updateData.voucher_code = generateVoucherCode();
    }

    await voucher.update(updateData);

    // 重新加载数据以包含关联
    await voucher.reload({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'fullname']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'username', 'email', 'fullname']
        }
      ]
    });

    res.json({
      success: true,
      message: `Voucher ${status === 'approved' ? 'approved' : 'rejected'} successfully`,
      voucher: {
        id: voucher.id,
        status: voucher.status,
        voucher_code: voucher.voucher_code,
        admin_notes: voucher.admin_notes,
        reviewed_at: voucher.reviewed_at,
        reviewer: voucher.reviewer
      }
    });
  } catch (error) {
    console.error('Update voucher status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update voucher status',
      error: error.message
    });
  }
});

module.exports = router;
