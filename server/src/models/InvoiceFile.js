const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InvoiceFile = sequelize.define('InvoiceFile', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  invoiceRequestId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'invoice_request_id',
    references: {
      model: 'invoice_requests',
      key: 'id'
    }
  },
  // 原始文件名
  originalName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'original_name'
  },
  // 存储文件名
  fileName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'file_name'
  },
  // 文件路径
  filePath: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'file_path'
  },
  // 文件大小（字节）
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'file_size'
  },
  // 文件类型
  mimeType: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'mime_type'
  },
  // 上传者ID（管理员）
  uploadedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'uploaded_by',
    references: {
      model: 'backend_userinfo',
      key: 'id'
    }
  },
  // 上传时间
  uploadedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'uploaded_at'
  },
  // 显示顺序
  displayOrder: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    field: 'display_order'
  }
}, {
  tableName: 'invoice_files',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = InvoiceFile;
