const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AttendeeTransfer = sequelize.define('AttendeeTransfer', {
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
  originalAttendee: {
    type: DataTypes.JSON,
    allowNull: false,
    field: 'original_attendee',
    comment: 'JSON object containing name, email, phone, affiliation of original attendee'
  },
  newAttendee: {
    type: DataTypes.JSON,
    allowNull: false,
    field: 'new_attendee',
    comment: 'JSON object containing name, email, phone, affiliation of new attendee'
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Reason for the attendee change'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending'
  },
  requestedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'requested_by',
    references: {
      model: 'backend_userinfo',
      key: 'id'
    }
  },
  processedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'processed_by',
    references: {
      model: 'backend_userinfo',
      key: 'id'
    }
  },
  requestTime: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'request_time',
    defaultValue: DataTypes.NOW
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
    comment: 'Notes from admin about the transfer decision'
  },
  feeAmountUsd: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 100.00,
    field: 'fee_amount_usd',
    comment: 'Transfer fee in USD'
  },
  feeAmountRmb: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 750.00,
    field: 'fee_amount_rmb',
    comment: 'Transfer fee in RMB'
  },
  feePaymentMethod: {
    type: DataTypes.ENUM('international', 'domestic'),
    allowNull: false,
    field: 'fee_payment_method',
    comment: 'Payment method for transfer fee: international or domestic'
  },
  feePaymentScreenshot: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'fee_payment_screenshot',
    comment: 'Path to the payment screenshot image'
  }
}, {
  tableName: 'attendee_transfers',
  timestamps: false,
  indexes: [
    {
      name: 'idx_transfer_registration_id',
      fields: ['registration_id']
    },
    {
      name: 'idx_transfer_requested_by',
      fields: ['requested_by']
    },
    {
      name: 'idx_transfer_status',
      fields: ['status']
    }
  ]
});

// 关联关系
AttendeeTransfer.associate = function(models) {
  AttendeeTransfer.belongsTo(models.RegistrationSubmission, {
    foreignKey: 'registration_id',
    as: 'registration'
  });
  AttendeeTransfer.belongsTo(models.User, {
    foreignKey: 'requested_by',
    as: 'requester'
  });
  AttendeeTransfer.belongsTo(models.User, {
    foreignKey: 'processed_by',
    as: 'processor'
  });
};

module.exports = AttendeeTransfer;
