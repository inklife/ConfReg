import { sseService } from '../_services/sse.service.js';

const state = {
  isConnected: false,
  connectionId: null,
  subscribers: new Set(), // 追踪哪些组件订阅了SSE
  lastError: null
};

const getters = {
  isConnected: state => state.isConnected,
  connectionId: state => state.connectionId,
  subscriberCount: state => state.subscribers.size,
  hasSubscribers: state => state.subscribers.size > 0
};

const actions = {
  // 注册组件为SSE订阅者
  subscribe({ commit, state }, subscriberId) {
    commit('addSubscriber', subscriberId);
    
    // 如果这是第一个订阅者且没有连接，则初始化连接
    if (state.subscribers.size === 1 && !state.isConnected) {
      console.log('📡 首个订阅者，初始化SSE连接');
      
      try {
        sseService.init({
          endpoint: '/api/submissions/pdf_notifications'
        });
        
        // 监听连接状态变化
        sseService.on('connected', () => {
          commit('setConnected', { 
            connected: true, 
            connectionId: sseService.connectionId 
          });
        });
        
      } catch (error) {
        console.error('❌ 初始化SSE失败:', error);
        commit('setError', error);
      }
    }
  },
  
  // 组件取消订阅SSE
  unsubscribe({ commit, state }, subscriberId) {
    commit('removeSubscriber', subscriberId);
    
    // 如果没有订阅者了，清理连接
    if (state.subscribers.size === 0) {
      console.log('📡 没有订阅者，清理SSE连接');
      sseService.cleanup();
      commit('setConnected', { connected: false, connectionId: null });
    }
  },
  
  // 强制重新连接
  reconnect({ commit, state }) {
    console.log('📡 强制重新连接SSE');
    sseService.forceCleanup();
    commit('setConnected', { connected: false, connectionId: null });
    
    // 如果有订阅者，重新初始化连接
    if (state.subscribers.size > 0) {
      setTimeout(() => {
        this.dispatch('sse/subscribe', Array.from(state.subscribers)[0]);
      }, 100);
    }
  }
};

const mutations = {
  addSubscriber(state, subscriberId) {
    state.subscribers.add(subscriberId);
    console.log(`📡 添加SSE订阅者: ${subscriberId}, 总数: ${state.subscribers.size}`);
  },
  
  removeSubscriber(state, subscriberId) {
    state.subscribers.delete(subscriberId);
    console.log(`📡 移除SSE订阅者: ${subscriberId}, 总数: ${state.subscribers.size}`);
  },
  
  setConnected(state, { connected, connectionId }) {
    state.isConnected = connected;
    state.connectionId = connectionId;
  },
  
  setError(state, error) {
    state.lastError = error;
  }
};

export const sse = {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};
