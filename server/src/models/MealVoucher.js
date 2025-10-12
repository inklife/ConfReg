const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MealVoucher = sequelize.define('MealVoucher', {
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
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  unit_price_usd: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 150.00
  },
  unit_price_rmb: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 1100.00
  },
  total_amount_usd: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  total_amount_rmb: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  attendee_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  payment_method: {
    type: DataTypes.ENUM('international', 'domestic'),
    allowNull: false
  },
  payment_screenshot: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending'
  },
  reviewed_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'backend_userinfo',
      key: 'id'
    }
  },
  reviewed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  admin_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  voucher_code: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true
  },
  createdAt: {
    type: DataTypes.DATE,
    field: 'created_at',
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    field: 'updated_at',
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'meal_vouchers',
  timestamps: true,
  underscored: true
});

module.exports = MealVoucher;
