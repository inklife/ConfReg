/**
 * 配置状态管理模块
 * 管理会议名称等全局配置
 */

import { configService } from '../_services/config.service';

const state = {
  // 会议信息
  conference: {
    name: 'ICPADS 2025',       // 完整名称，用于显示
    nameShort: 'ICPADS2025'    // 短名称，用于文件名等
  },
  // 服务器时间信息
  serverTime: {
    current: null,
    timezone: 'Asia/Shanghai',
    isEarlyBird: false,
    daysUntilDeadline: 0
  },
  // 加载状态
  loaded: false,
  loading: false,
  error: null
};

const actions = {
  /**
   * 从API获取配置
   */
  async fetchConfig({ commit, state }) {
    // 如果已加载或正在加载，直接返回
    if (state.loaded || state.loading) {
      return;
    }
    
    commit('SET_LOADING', true);
    
    try {
      const config = await configService.getConfig();
      commit('SET_CONFIG', config);
      commit('SET_LOADED', true);
      commit('SET_ERROR', null);
    } catch (error) {
      console.error('Failed to fetch config:', error);
      commit('SET_ERROR', error.message);
      // 使用默认值，不阻止应用运行
      commit('SET_LOADED', true);
    } finally {
      commit('SET_LOADING', false);
    }
  },
  
  /**
   * 强制刷新配置
   */
  async refreshConfig({ commit }) {
    commit('SET_LOADING', true);
    commit('SET_LOADED', false);
    
    try {
      const config = await configService.getConfig();
      commit('SET_CONFIG', config);
      commit('SET_LOADED', true);
      commit('SET_ERROR', null);
    } catch (error) {
      console.error('Failed to refresh config:', error);
      commit('SET_ERROR', error.message);
      commit('SET_LOADED', true);
    } finally {
      commit('SET_LOADING', false);
    }
  }
};

const mutations = {
  SET_CONFIG(state, config) {
    if (config.conference) {
      state.conference = {
        name: config.conference.name || state.conference.name,
        nameShort: config.conference.nameShort || state.conference.nameShort
      };
    }
    if (config.serverTime) {
      state.serverTime = config.serverTime;
    }
  },
  
  SET_LOADED(state, loaded) {
    state.loaded = loaded;
  },
  
  SET_LOADING(state, loading) {
    state.loading = loading;
  },
  
  SET_ERROR(state, error) {
    state.error = error;
  }
};

const getters = {
  /**
   * 获取完整会议名称（如 "ICPADS 2025"）
   */
  conferenceName: state => state.conference.name,
  
  /**
   * 获取短会议名称（如 "ICPADS2025"），用于文件名
   */
  conferenceNameShort: state => state.conference.nameShort,
  
  /**
   * 配置是否已加载
   */
  isConfigLoaded: state => state.loaded,
  
  /**
   * 配置是否正在加载
   */
  isConfigLoading: state => state.loading,
  
  /**
   * 是否为早鸟期
   */
  isEarlyBird: state => state.serverTime.isEarlyBird,
  
  /**
   * 距离截止日期的天数
   */
  daysUntilDeadline: state => state.serverTime.daysUntilDeadline
};

export const config = {
  namespaced: true,
  state,
  actions,
  mutations,
  getters
};
