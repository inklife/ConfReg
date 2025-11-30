const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PptUpload = sequelize.define('PptUpload', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
    // 外键关系通过 index.js 中的 belongsTo 关联定义
  },
  originalFilename: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '原始文件名'
  },
  storedFilename: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    comment: '存储的文件名(UUID)'
  },
  fileExtension: {
    type: DataTypes.STRING(10),
    allowNull: false,
    comment: '文件扩展名'
  },
  fileSize: {
    type: DataTypes.BIGINT,
    allowNull: false,
    comment: '文件大小(字节)'
  },
  fileHash: {
    type: DataTypes.STRING(64),
    allowNull: false,
    comment: '文件SHA256哈希值'
  },
  mimeType: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'MIME类型'
  },
  uploadTime: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '上传时间'
  },
  description: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '文件描述'
  },
  status: {
    type: DataTypes.ENUM('active', 'deleted'),
    allowNull: false,
    defaultValue: 'active',
    comment: '文件状态'
  }
}, {
  tableName: 'ppt_uploads',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['fileHash']
    },
    {
      fields: ['status']
    }
  ]
});

// 类方法：获取用户的所有PPT文件
PptUpload.getUserUploads = async function(userId) {
  return await this.findAll({
    where: {
      userId,
      status: 'active'
    },
    order: [['uploadTime', 'DESC']]
  });
};

// 类方法：检查用户是否有现有的PPT上传
PptUpload.getUserActiveUpload = async function(userId) {
  return await this.findOne({
    where: {
      userId,
      status: 'active'
    },
    order: [['uploadTime', 'DESC']]
  });
};

// 实例方法：软删除
PptUpload.prototype.softDelete = async function() {
  this.status = 'deleted';
  await this.save();
};

module.exports = PptUpload;
