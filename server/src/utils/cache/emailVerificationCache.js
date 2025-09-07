const NodeCache = require('node-cache');

/**
 * 邮箱验证码缓存管理器
 * 用于存储注册时的邮箱验证码
 */
class EmailVerificationCache {
  constructor() {
    // 邮箱验证码缓存实例
    this.cache = new NodeCache({
      stdTTL: 900, // 15分钟过期 (900秒)
      checkperiod: 120, // 每2分钟检查一次过期项
      useClones: false,
      deleteOnExpire: true,
      maxKeys: 1000 // 最大缓存1000个验证码
    });

    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    this.cache.on('expired', (key, value) => {
      console.log(`[EmailVerificationCache] Verification code expired: ${key}`);
    });

    this.cache.on('del', (key, value) => {
      console.log(`[EmailVerificationCache] Verification code deleted: ${key}`);
    });
  }

  /**
   * 存储邮箱验证码
   * @param {string} email - 邮箱地址
   * @param {string} code - 验证码
   * @param {number} ttl - 过期时间（秒），默认15分钟
   * @returns {boolean} 是否存储成功
   */
  setVerificationCode(email, code, ttl = 900) {
    try {
      const key = `email_verification:${email.toLowerCase()}`;
      const data = {
        code: code,
        email: email,
        createdAt: Date.now(),
        expiresAt: Date.now() + (ttl * 1000),
        verified: false,
        attempts: 0,
        maxAttempts: 5
      };

      const success = this.cache.set(key, data, ttl);
      
      if (success) {
        console.log(`[EmailVerificationCache] Verification code set for: ${email}, TTL: ${ttl}s`);
      }
      return success;
    } catch (error) {
      console.error('[EmailVerificationCache] Error setting verification code:', error);
      return false;
    }
  }

  /**
   * 验证邮箱验证码
   * @param {string} email - 邮箱地址
   * @param {string} code - 用户输入的验证码
   * @returns {object} 验证结果
   */
  verifyCode(email, code) {
    try {
      const key = `email_verification:${email.toLowerCase()}`;
      const data = this.cache.get(key);

      if (!data) {
        return {
          success: false,
          message: 'Verification code not found or expired',
          code: 'CODE_NOT_FOUND'
        };
      }

      // 检查是否已验证过
      if (data.verified) {
        // 如果已验证，检查输入的验证码是否正确
        if (data.code === code) {
          // 验证码正确，允许重复验证（延长有效期）
          data.verifiedAt = Date.now();
          this.cache.set(key, data, 1800); // 重新设置30分钟有效期
          
          console.log(`[EmailVerificationCache] Re-verification successful for: ${email}`);
          return {
            success: true,
            message: 'Email verification confirmed',
            code: 'RE_VERIFICATION_SUCCESS',
            data: {
              email: email,
              verifiedAt: data.verifiedAt
            }
          };
        } else {
          // 验证码错误
          return {
            success: false,
            message: 'Invalid verification code for already verified email',
            code: 'CODE_INVALID_FOR_VERIFIED'
          };
        }
      }

      // 检查是否过期
      if (Date.now() > data.expiresAt) {
        this.cache.del(key);
        return {
          success: false,
          message: 'Verification code has expired',
          code: 'CODE_EXPIRED'
        };
      }

      // 检查尝试次数
      if (data.attempts >= data.maxAttempts) {
        this.cache.del(key);
        return {
          success: false,
          message: 'Too many verification attempts. Please request a new code.',
          code: 'TOO_MANY_ATTEMPTS'
        };
      }

      // 验证码匹配
      if (data.code === code) {
        // 标记为已验证，但保留在缓存中一段时间，供注册时确认
        data.verified = true;
        data.verifiedAt = Date.now();
        this.cache.set(key, data, 1800); // 验证成功后保留30分钟供注册确认

        console.log(`[EmailVerificationCache] Email verification successful for: ${email}`);
        return {
          success: true,
          message: 'Email verification successful',
          code: 'VERIFICATION_SUCCESS',
          data: {
            email: email,
            verifiedAt: data.verifiedAt
          }
        };
      } else {
        // 增加尝试次数
        data.attempts++;
        this.cache.set(key, data);
        
        const remainingAttempts = data.maxAttempts - data.attempts;
        return {
          success: false,
          message: `Invalid verification code. ${remainingAttempts} attempts remaining.`,
          code: 'CODE_INVALID',
          remainingAttempts: remainingAttempts
        };
      }
    } catch (error) {
      console.error('[EmailVerificationCache] Error verifying code:', error);
      return {
        success: false,
        message: 'Verification failed due to server error',
        code: 'SERVER_ERROR'
      };
    }
  }

  /**
   * 检查邮箱是否已验证（注册时使用）
   * @param {string} email - 邮箱地址
   * @returns {boolean} 是否已验证
   */
  isEmailVerified(email) {
    try {
      const key = `email_verification:${email.toLowerCase()}`;
      const data = this.cache.get(key);

      if (!data) {
        return false;
      }

      // 检查是否已验证且未过期
      return data.verified && Date.now() <= data.expiresAt;
    } catch (error) {
      console.error('[EmailVerificationCache] Error checking email verification:', error);
      return false;
    }
  }

  /**
   * 获取邮箱验证信息
   * @param {string} email - 邮箱地址
   * @returns {object|null} 验证信息
   */
  getVerificationInfo(email) {
    try {
      const key = `email_verification:${email.toLowerCase()}`;
      const data = this.cache.get(key);

      if (!data) {
        return null;
      }

      return {
        email: data.email,
        verified: data.verified,
        createdAt: data.createdAt,
        expiresAt: data.expiresAt,
        verifiedAt: data.verifiedAt || null,
        attempts: data.attempts,
        maxAttempts: data.maxAttempts,
        remainingTime: Math.max(0, data.expiresAt - Date.now())
      };
    } catch (error) {
      console.error('[EmailVerificationCache] Error getting verification info:', error);
      return null;
    }
  }

  /**
   * 删除邮箱验证码
   * @param {string} email - 邮箱地址
   * @returns {number} 删除的数量
   */
  deleteVerificationCode(email) {
    try {
      const key = `email_verification:${email.toLowerCase()}`;
      const count = this.cache.del(key);
      
      if (count > 0) {
        console.log(`[EmailVerificationCache] Verification code deleted for: ${email}`);
      }
      return count;
    } catch (error) {
      console.error('[EmailVerificationCache] Error deleting verification code:', error);
      return 0;
    }
  }

  /**
   * 标记邮箱验证已使用（注册成功后调用）
   * @param {string} email - 邮箱地址
   * @returns {boolean} 是否标记成功
   */
  markAsUsed(email) {
    try {
      const key = `email_verification:${email.toLowerCase()}`;
      const data = this.cache.get(key);

      if (data && data.verified) {
        // 标记为已使用，设置较短的过期时间
        data.used = true;
        data.usedAt = Date.now();
        this.cache.set(key, data, 300); // 保留5分钟后删除
        
        console.log(`[EmailVerificationCache] Email verification marked as used for: ${email}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[EmailVerificationCache] Error marking verification as used:', error);
      return false;
    }
  }

  /**
   * 检查是否可以发送新的验证码
   * @param {string} email - 邮箱地址
   * @param {boolean} isResend - 是否为重新发送
   * @returns {object} 检查结果
   */
  canSendNewCode(email, isResend = false) {
    try {
      const key = `email_verification:${email.toLowerCase()}`;
      const data = this.cache.get(key);

      if (!data) {
        return {
          canSend: true,
          message: 'No previous verification code found'
        };
      }

      // 如果已验证但未使用
      if (data.verified && !data.used) {
        // 如果是重新发送请求，检查时间间隔
        if (isResend) {
          const timeSinceVerified = Date.now() - (data.verifiedAt || data.createdAt);
          const resendThreshold = 5 * 60 * 1000; // 5分钟阈值
          
          if (timeSinceVerified > resendThreshold) {
            // 超过5分钟，允许重新发送
            console.log(`[EmailVerificationCache] Allowing resend for ${email} after ${Math.round(timeSinceVerified / 60000)} minutes`);
            return {
              canSend: true,
              message: 'Verification expired, can resend new code'
            };
          } else {
            // 未超过5分钟，提示使用现有验证码
            const remainingTime = Math.ceil((resendThreshold - timeSinceVerified) / 60000);
            return {
              canSend: false,
              message: `Email already verified. Please use your existing verification code or wait ${remainingTime} more minutes to resend.`,
              code: 'ALREADY_VERIFIED_RECENT',
              remainingMinutes: remainingTime
            };
          }
        } else {
          // 首次发送，直接返回已验证状态
          return {
            canSend: false,
            message: 'Email already verified. Please proceed with verification.',
            code: 'ALREADY_VERIFIED'
          };
        }
      }

      // 检查发送间隔（防止频繁发送）
      const timeSinceCreated = Date.now() - data.createdAt;
      const minInterval = 60 * 1000; // 1分钟最小间隔

      if (timeSinceCreated < minInterval) {
        const remainingTime = Math.ceil((minInterval - timeSinceCreated) / 1000);
        return {
          canSend: false,
          message: `Please wait ${remainingTime} seconds before requesting a new code`,
          code: 'TOO_FREQUENT',
          remainingTime: remainingTime
        };
      }

      return {
        canSend: true,
        message: 'Can send new verification code'
      };
    } catch (error) {
      console.error('[EmailVerificationCache] Error checking send permission:', error);
      return {
        canSend: false,
        message: 'Error checking send permission',
        code: 'SERVER_ERROR'
      };
    }
  }

  /**
   * 获取所有邮箱验证码的键
   * @returns {string[]} 邮箱列表
   */
  getVerificationKeys() {
    try {
      const keys = this.cache.keys();
      return keys.map(key => key.replace('email_verification:', ''));
    } catch (error) {
      console.error('[EmailVerificationCache] Error getting verification keys:', error);
      return [];
    }
  }

  /**
   * 清空所有邮箱验证码
   */
  clearAll() {
    try {
      this.cache.flushAll();
      console.log('[EmailVerificationCache] All verification codes cleared');
    } catch (error) {
      console.error('[EmailVerificationCache] Error clearing verification codes:', error);
    }
  }

  /**
   * 获取统计信息
   * @returns {object} 统计信息
   */
  getStats() {
    try {
      const stats = this.cache.getStats();
      const keys = this.cache.keys();
      
      let verifiedCount = 0;
      let unverifiedCount = 0;
      let usedCount = 0;
      
      for (const key of keys) {
        const data = this.cache.get(key);
        if (data) {
          if (data.used) {
            usedCount++;
          } else if (data.verified) {
            verifiedCount++;
          } else {
            unverifiedCount++;
          }
        }
      }

      return {
        ...stats,
        totalCodes: keys.length,
        verifiedCodes: verifiedCount,
        unverifiedCodes: unverifiedCount,
        usedCodes: usedCount
      };
    } catch (error) {
      console.error('[EmailVerificationCache] Error getting stats:', error);
      return {};
    }
  }

  /**
   * 关闭缓存
   */
  close() {
    try {
      this.cache.close();
      console.log('[EmailVerificationCache] Cache closed');
    } catch (error) {
      console.error('[EmailVerificationCache] Error closing cache:', error);
    }
  }
}

// 创建单例实例
const emailVerificationCache = new EmailVerificationCache();

module.exports = emailVerificationCache;
