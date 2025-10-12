const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

const RefundRequest = sequelize.define('RefundRequest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  registrationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'registration_id',
    references: {
      model: 'backend_registrationsubmission',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'backend_userinfo',
      key: 'id'
    }
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [10, 1000] // 退款原因长度限制
    }
  },
  refundAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'refund_amount',
    validate: {
      min: 0
    },
    comment: 'Refund amount in the currency specified by refund_currency'
  },
  refundCurrency: {
    type: DataTypes.STRING(10),
    allowNull: false,
    field: 'refund_currency',
    defaultValue: 'USD',
    validate: {
      isIn: [['USD', 'RMB']]
    },
    comment: 'Currency of the refund amount: USD or RMB'
  },
  bankInfo: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'bank_info',
    comment: 'JSON structure: {bankType: "international"|"domestic", accountName, bankName, accountNumber, beneficiaryAddress, country, swiftCode, bankAddress}'
  },
  requestTime: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'request_time',
    defaultValue: DataTypes.NOW
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'processed'),
    defaultValue: 'pending',
    comment: 'pending: 待审核, approved: 已批准, rejected: 已拒绝, processed: 已退款'
  },
  processedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'processed_by_id',
    references: {
      model: 'backend_userinfo',
      key: 'id'
    }
  },
  processTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'process_time'
  },
  adminNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'admin_notes',
    defaultValue: ''
  },
  refundMethod: {
    type: DataTypes.ENUM('bank_transfer', 'original_payment', 'check', 'other'),
    allowNull: true,
    field: 'refund_method',
    defaultValue: 'bank_transfer'
  },
  transactionId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'transaction_id',
    comment: 'Bank transaction ID or reference number'
  }
}, {
  tableName: 'refund_requests',
  timestamps: false,
  indexes: [
    {
      name: 'idx_refund_user_id',
      fields: ['user_id']
    },
    {
      name: 'idx_refund_registration_id',
      fields: ['registration_id']
    },
    {
      name: 'idx_refund_status',
      fields: ['status']
    },
    {
      name: 'idx_refund_request_time',
      fields: ['request_time']
    }
  ]
});

// 关联关系
RefundRequest.associate = function(models) {
  RefundRequest.belongsTo(models.RegistrationSubmission, {
    foreignKey: 'registration_id',
    as: 'registration'
  });
  RefundRequest.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user'
  });
  RefundRequest.belongsTo(models.User, {
    foreignKey: 'processed_by_id',
    as: 'processor'
  });
};

// 静态方法：获取用户的退款申请历史
RefundRequest.getUserRefundHistory = async function(userId) {
  return this.findAll({
    where: { userId },
    include: [
      {
        model: this.sequelize.models.RegistrationSubmission,
        as: 'registration',
        attributes: ['id', 'name', 'email', 'product_code', 'product_price', 'submission_time']
      },
      {
        model: this.sequelize.models.User,
        as: 'processor',
        attributes: ['fullname', 'email'],
        required: false
      }
    ],
    order: [['requestTime', 'DESC']]
  });
};

// 静态方法：检查用户是否可以申请退款
RefundRequest.checkRefundEligibility = async function(userId, registrationId) {
  // 检查注册是否存在且已批准
  const registration = await this.sequelize.models.RegistrationSubmission.findOne({
    where: {
      id: registrationId,
      userId: userId,
      status: 'approved'
    }
  });

  if (!registration) {
    return {
      eligible: false,
      reason: 'Registration not found or not approved'
    };
  }

  // 检查是否已经退款
  if (registration.is_refunded) {
    return {
      eligible: false,
      reason: 'This registration has already been refunded'
    };
  }

  // 检查是否已有待处理的退款申请
  const existingRequest = await this.findOne({
    where: {
      registrationId,
      userId,
      status: ['pending', 'approved']
    }
  });

  if (existingRequest) {
    return {
      eligible: false,
      reason: 'You already have a pending or approved refund request for this registration'
    };
  }

  // 检查是否是paper ID的唯一全额注册
  if (registration.paper_id && registration.paper_id.trim() !== '') {
    // 查询该paper_id下所有已批准且未退款的全额注册
    const fullRegistrationsForPaper = await this.sequelize.models.RegistrationSubmission.findAll({
      where: {
        paper_id: registration.paper_id,
        status: 'approved',
        is_refunded: false,
        registration_category: 'full'
      }
    });

    // 如果只有一个全额注册，且正是当前注册，则不允许退款
    if (fullRegistrationsForPaper.length === 1 && fullRegistrationsForPaper[0].id === registrationId) {
      return {
        eligible: false,
        reason: `This is the only full registration for Paper ID ${registration.paper_id}. At least one full registration must be maintained for this paper. Refund is not allowed.`
      };
    }
  }

  // 检查退款时间限制（例如：会议开始前30天）
  const now = new Date();
  const conferenceDate = new Date('2025-12-08'); // 根据实际会议日期调整
  const daysBeforeConference = Math.ceil((conferenceDate - now) / (1000 * 60 * 60 * 24));
  
  if (daysBeforeConference < 30) {
    return {
      eligible: false,
      reason: 'Refund requests must be submitted at least 30 days before the conference'
    };
  }

  // 计算退款手续费
  const REFUND_FEE_USD = 100;
  const REFUND_FEE_RMB = 750;
  
  // 根据支付方式确定手续费
  let refundFee = REFUND_FEE_USD;
  let refundFeeCurrency = 'USD';
  
  if (registration.payment_method === 'domestic') {
    refundFee = REFUND_FEE_RMB;
    refundFeeCurrency = 'RMB';
  }
  
  // 计算实际退款金额
  let actualRefundAmount;
  if (registration.payment_method === 'domestic') {
    actualRefundAmount = Math.max(0, (registration.total_amount_rmb || registration.product_price_rmb || 0) - refundFee);
  } else {
    actualRefundAmount = Math.max(0, (registration.total_amount_usd || registration.product_price || 0) - refundFee);
  }

  return {
    eligible: true,
    registration: registration,
    daysBeforeConference: daysBeforeConference,
    refundFee: refundFee,
    refundFeeCurrency: refundFeeCurrency,
    actualRefundAmount: actualRefundAmount
  };
};

// 静态方法：获取统计信息
RefundRequest.getStats = async function() {
  const [
    total,
    pending,
    approved,
    rejected,
    processed,
    totalAmount,
    approvedAmount
  ] = await Promise.all([
    this.count(),
    this.count({ where: { status: 'pending' } }),
    this.count({ where: { status: 'approved' } }),
    this.count({ where: { status: 'rejected' } }),
    this.count({ where: { status: 'processed' } }),
    this.sum('refund_amount'),
    this.sum('refund_amount', { where: { status: ['approved', 'processed'] } })
  ]);

  return {
    total,
    pending,
    approved,
    rejected,
    processed,
    total_amount: totalAmount || 0,
    approved_amount: approvedAmount || 0
  };
};

module.exports = RefundRequest;
