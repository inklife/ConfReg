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
    }
  },
  bankInfo: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'bank_info',
    comment: 'JSON structure: {accountName, bankName, accountNumber, routingNumber, country}'
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

  return {
    eligible: true,
    registration: registration,
    daysBeforeConference: daysBeforeConference
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
