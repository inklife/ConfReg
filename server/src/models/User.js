const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const { sequelize } = require('../config/database');
const { getSaltRounds } = require('../config/crypto');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 150],
      notEmpty: true,
      noSpaces(value) {
        if (value && value.includes(' ')) {
          throw new Error('Username cannot contain spaces');
        }
      },
      noAtSymbol(value) {
        if (value && value.includes('@')) {
          throw new Error('Username cannot contain @ symbol');
        }
      }
    }
  },
  password: {
    type: DataTypes.STRING(128),
    allowNull: false,
    validate: {
      len: [6, 255]
    }
  },
  first_name: {
    type: DataTypes.STRING(150),
    allowNull: false,
    defaultValue: ''
  },
  last_name: {
    type: DataTypes.STRING(150),
    allowNull: false,
    defaultValue: ''
  },
  email: {
    type: DataTypes.STRING(254),
    allowNull: false,
    validate: {
      isEmail: {
        msg: 'Please provide a valid email address'
      }
    }
  },
  fullname: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [1, 100],
      notEmpty: true
    }
  },
  affiliation: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: ''
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: ''
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    allowNull: false,
    defaultValue: 'user',
    comment: 'User role for permission control'
  },
  is_superuser: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  date_joined: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // 备用邮箱字段
  backup_email: {
    type: DataTypes.STRING(254),
    allowNull: true,
    validate: {
      isEmail: {
        msg: 'Please provide a valid backup email address'
      }
    }
  },
  backup_email_verified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  // 用户名最后更新时间
  username_last_updated: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last time the username was updated'
  }
}, {
  tableName: 'backend_userinfo',
  timestamps: false,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const saltRounds = getSaltRounds();
        const salt = await bcrypt.genSalt(saltRounds);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const saltRounds = getSaltRounds();
        const salt = await bcrypt.genSalt(saltRounds);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// 实例方法：验证密码
User.prototype.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// 实例方法：获取公共信息（不包含密码）
User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password;
  return values;
};

module.exports = User;
