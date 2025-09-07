const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InvoiceRequest = sequelize.define('InvoiceRequest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
  registrationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'registration_id',
    references: {
      model: 'backend_registrationsubmission',
      key: 'id'
    }
  },
  // 发票类型：electronic(电子发票) 或 paper(纸质发票)
  invoiceType: {
    type: DataTypes.ENUM('electronic', 'paper'),
    allowNull: false,
    defaultValue: 'electronic',
    field: 'invoice_type'
  },
  // 发票抬头
  invoiceTitle: {
    type: DataTypes.STRING(200),
    allowNull: false,
    field: 'invoice_title'
  },
  // 纳税人识别号
  taxNumber: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'tax_number'
  },
  // 开户行
  bankName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'bank_name'
  },
  // 银行账号
  bankAccount: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'bank_account'
  },
  // 注册地址
  registeredAddress: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'registered_address'
  },
  // 注册电话
  registeredPhone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'registered_phone'
  },
  // 邮寄地址（纸质发票）
  mailingAddress: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'mailing_address'
  },
  // 收件人
  recipient: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  // 收件人电话
  recipientPhone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'recipient_phone'
  },
  // 申请状态：pending(待处理)、processing(处理中)、completed(已完成)、rejected(已拒绝)
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'rejected'),
    allowNull: false,
    defaultValue: 'pending'
  },
  // 备注
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // 管理员备注
  adminNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'admin_notes'
  },
  // 发票金额
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  // 发票内容
  content: {
    type: DataTypes.STRING(200),
    allowNull: false,
    defaultValue: '会议注册费'
  },
  // 申请时间
  requestedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'requested_at'
  },
  // 处理时间
  processedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'processed_at'
  }
}, {
  tableName: 'invoice_requests',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = InvoiceRequest;
