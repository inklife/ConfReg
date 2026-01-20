/**
 * 配置服务
 * 从后端API获取系统配置（包括会议名称）
 */

import axios from 'axios';

export const configService = {
  getConfig,
  getConfigByKey
};

/**
 * 获取完整配置
 * @returns {Promise<Object>} 配置数据
 */
async function getConfig() {
  try {
    const response = await axios.get('/api/config', {
      withCredentials: true
    });
    
    if (response.data && response.data.success) {
      return response.data.data;
    }
    
    throw new Error(response.data?.message || 'Failed to fetch config');
  } catch (error) {
    console.error('Config service error:', error);
    // 返回默认配置作为 fallback
    return getDefaultConfig();
  }
}

/**
 * 获取指定键的配置
 * @param {string} key - 配置键名 (如 'announcement', 'registrationFees')
 * @returns {Promise<Object>} 配置数据
 */
async function getConfigByKey(key) {
  try {
    const response = await axios.get(`/api/config/${key}`, {
      withCredentials: true
    });
    
    if (response.data && response.data.success) {
      return response.data.data;
    }
    
    throw new Error(response.data?.message || `Failed to fetch config: ${key}`);
  } catch (error) {
    console.error(`Config service error for key [${key}]:`, error);
    return null;
  }
}

/**
 * 默认配置（当API调用失败时使用）
 */
function getDefaultConfig() {
  return {
    conference: {
      name: 'ICPADS 2025',
      nameShort: 'ICPADS2025'
    },
    serverTime: {
      current: new Date().toISOString(),
      timezone: 'Asia/Shanghai',
      isEarlyBird: false,
      daysUntilDeadline: 0
    }
  };
}
