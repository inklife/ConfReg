const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

const RegistrationSubmission = sequelize.define('RegistrationSubmission', {
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
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: ''
  },
  affiliation: {
    type: DataTypes.STRING(200),
    allowNull: false,
    defaultValue: ''
  },
  paper_type: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: 'research',
    validate: {
      isIn: {
        args: [['research', 'poster', 'none']],
        msg: 'Paper type must be research, poster, or none'
      }
    }
  },
  paper_id: {
    type: DataTypes.STRING(300),
    allowNull: false,
    defaultValue: '',
    validate: {
      isValidPaperId(value) {
        // 只有在有值的时候才验证格式
        if (value && value.trim() !== '' && !/^[1-9]\d*$/.test(value)) {
          throw new Error('Paper ID must be a number without leading zeros');
        }
      }
    }
  },
  paper_pages: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      isValidPageCount(value) {
        // 只有在有值且不为0的时候才验证范围
        if (value !== null && value !== undefined && value !== 0 && value !== '' && (value < 1 || value > 16)) {
          throw new Error('Paper pages must be between 1 and 16');
        }
      }
    }
  },
  product_code: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  registration_category: {
    type: DataTypes.ENUM('full', 'attendee'),
    allowNull: false,
    defaultValue: 'full',
    comment: 'Registration category: full registration or attendee registration'
  },
  payment_method: {
    type: DataTypes.ENUM('international', 'domestic'),
    allowNull: false,
    defaultValue: 'international',
    comment: 'Payment method: international bank transfer or domestic payment'
  },
  product_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    },
    comment: 'Base product price in USD'
  },
  product_price_rmb: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    },
    comment: 'Base product price in RMB'
  },
  total_amount_usd: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    },
    comment: 'Total amount including extra page fees in USD'
  },
  total_amount_rmb: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    },
    comment: 'Total amount including extra page fees in RMB'
  },
  extra_page_fee_usd: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0
    },
    comment: 'Extra page fee in USD'
  },
  extra_page_fee_rmb: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0
    },
    comment: 'Extra page fee in RMB'
  },
  screenshot: {
    type: DataTypes.STRING,
    allowNull: false
  },
  proof: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: ''
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending'
  },
  is_refunded: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this registration has been refunded'
  },
  reviewed_by: {
    type: DataTypes.INTEGER,
    field: 'reviewed_by_id',
    references: {
      model: 'backend_userinfo',
      key: 'id'
    }
  },
  review_notes: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: ''
  },
  review_time: {
    type: DataTypes.DATE
  },
  submission_time: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'submission_time',
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'backend_registrationsubmission',
  timestamps: false,
  indexes: [
    {
      name: 'idx_registration_user_id',
      fields: ['user_id']
    },
    {
      name: 'idx_registration_status',
      fields: ['status']
    },
    {
      name: 'idx_registration_product_code',
      fields: ['product_code']
    },
    {
      name: 'idx_registration_category',
      fields: ['registration_category']
    },
    {
      name: 'idx_payment_method',
      fields: ['payment_method']
    }
  ],
  validate: {
    // 交叉验证：paper_id 和 paper_pages 要么都不填，要么都填
    paperFieldsConsistency() {
      const hasPaperId = this.paper_id && this.paper_id.trim() !== '';
      const hasPaperPages = this.paper_pages && this.paper_pages !== 0;
      
      // 如果只有其中一个有值，则报错
      if (hasPaperId && !hasPaperPages) {
        throw new Error('Paper pages is required when Paper ID is provided');
      }
      if (!hasPaperId && hasPaperPages) {
        throw new Error('Paper ID is required when Paper pages is provided');
      }
    }
  }
});

// 关联关系
RegistrationSubmission.associate = function(models) {
  RegistrationSubmission.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user'
  });
  RegistrationSubmission.belongsTo(models.User, {
    foreignKey: 'reviewed_by_id',
    as: 'reviewer'
  });
};

// 静态方法：获取总支付金额
RegistrationSubmission.getTotalPayment = async function(status = null, timeRange = null) {
  let where = {
    // 排除已退款的注册
    [Op.or]: [
      { is_refunded: false },
      { is_refunded: null }
    ]
  };
  
  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    where.status = status;
  }
  
  // 添加时间范围过滤
  if (timeRange) {
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }
    
    if (startDate) {
      where.submission_time = { [Op.gte]: startDate };
    }
  }
  
  const result = await this.sum('product_price', { where });
  return result || 0;
};

// 静态方法：获取学生数量
RegistrationSubmission.getStudentCount = async function(status = null) {
  let where = {
    [Op.and]: [
      {
        [Op.or]: [
          { product_code: { [Op.like]: '%student%' } },
          { product_code: { [Op.like]: '%学生%' } }
        ]
      },
      // 排除已退款的注册
      {
        [Op.or]: [
          { is_refunded: false },
          { is_refunded: null }
        ]
      }
    ]
  };
  
  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    where[Op.and].push({ status: status });
  }
  
  return this.count({ where });
};

// 静态方法：获取会员数量
RegistrationSubmission.getMemberCount = async function(status = null) {
  let where = {
    [Op.and]: [
      {
        [Op.or]: [
          { product_code: { [Op.like]: '%member%' } },
          { product_code: { [Op.like]: '%会员%' } }
        ]
      },
      // 排除已退款的注册
      {
        [Op.or]: [
          { is_refunded: false },
          { is_refunded: null }
        ]
      }
    ]
  };
  
  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    where[Op.and].push({ status: status });
  }
  
  return this.count({ where });
};

// 静态方法：获取统计信息
RegistrationSubmission.getStats = async function() {
  const [
    total,
    approved,
    pending,
    rejected,
    students,
    members,
    totalPayment,
    approvedPayment,
    productStats
  ] = await Promise.all([
    this.count(),
    // 排除已退款的注册
    this.count({ 
      where: { 
        status: 'approved',
        [Op.or]: [
          { is_refunded: false },
          { is_refunded: null }
        ]
      } 
    }),
    this.count({ where: { status: 'pending' } }),
    this.count({ where: { status: 'rejected' } }),
    this.getStudentCount(),
    this.getMemberCount(),
    this.getTotalPayment(),
    this.getTotalPayment('approved'),
    sequelize.query(`
      SELECT product_code as "_id", 
             payment_method,
             COUNT(*) as count,
             SUM(CASE WHEN payment_method = 'international' THEN total_amount_usd ELSE 0 END) as total_usd,
             SUM(CASE WHEN payment_method = 'domestic' THEN total_amount_rmb ELSE 0 END) as total_rmb
      FROM backend_registrationsubmission 
      WHERE is_refunded IS NULL OR is_refunded = 0
      GROUP BY product_code, payment_method
      ORDER BY product_code, payment_method
    `, { type: sequelize.QueryTypes.SELECT })
  ]);

  const approvalRate = total > 0 ? Math.round((approved / total) * 100 * 100) / 100 : 0;

  return {
    total,
    approved,
    pending,
    rejected,
    students,
    members,
    total_payment: totalPayment,
    approved_payment: approvedPayment,
    approval_rate: approvalRate,
    product_stats: productStats
  };
};

module.exports = RegistrationSubmission;
