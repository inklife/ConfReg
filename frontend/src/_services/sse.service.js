/**
 * SSE (Server-Sent Events) 服务
 * 用于管理PDF生成任务的实时推送
 */

class SSEService {
  constructor() {
    this.eventSource = null;
    this.connectionId = null;
    this.useSSE = true;
    this.listeners = new Map(); // 存储事件监听器
    this.isConnected = false;
  }

  /**
   * 初始化SSE连接
   * @param {Object} options - 配置选项
   * @param {string} options.endpoint - SSE端点，默认为 '/api/submissions/pdf_notifications'
   * @param {Function} options.onProgress - 进度回调
   * @param {Function} options.onCompleted - 完成回调
   * @param {Function} options.onFailed - 失败回调
   * @param {Function} options.onError - 错误回调
   */
  init(options = {}) {
    // 如果已经有活跃连接，只注册新的回调函数，不重新连接
    if (this.isConnected && this.eventSource && this.eventSource.readyState === EventSource.OPEN) {
      console.log('📡 SSE已连接，复用现有连接，ID:', this.connectionId);
      const { onProgress, onCompleted, onFailed } = options;
      if (onProgress) this.on('progress', onProgress);
      if (onCompleted) this.on('completed', onCompleted);
      if (onFailed) this.on('failed', onFailed);
      return;
    }

    // 如果连接状态异常，重新建立连接
    const {
      endpoint = '/api/submissions/pdf_notifications',
      onProgress,
      onCompleted,
      onFailed,
      onError
    } = options;

    try {
      // 只有在没有连接或连接异常时才清理
      if (!this.isConnected || !this.eventSource || this.eventSource.readyState !== EventSource.OPEN) {
        this.close();
        
        // 生成新的连接ID
        this.connectionId = 'conn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        console.log('📡 建立新的SSE连接, ID:', this.connectionId);
      } else {
        console.log('📡 复用现有SSE连接, ID:', this.connectionId);
        return;
      }
      
      this.eventSource = new EventSource(`${endpoint}?connectionId=${this.connectionId}`, {
        withCredentials: true
      });

      this.eventSource.onopen = () => {
        console.log('📡 SSE连接已建立, ID:', this.connectionId);
        this.isConnected = true;
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📡 收到SSE消息:', data);
          this.handleMessage(data);
        } catch (error) {
          console.error('📡 解析SSE消息失败:', error, event.data);
        }
      };

      // 监听特定事件类型
      this.eventSource.addEventListener('connected', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📡 收到连接确认事件:', data);
          this.emit('connected', data);
        } catch (error) {
          console.error('📡 解析连接确认事件失败:', error);
        }
      });

      this.eventSource.addEventListener('pdf_status', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📡 收到PDF状态事件:', data);
          this.emit('progress', data);
        } catch (error) {
          console.error('📡 解析PDF状态事件失败:', error);
        }
      });

      this.eventSource.addEventListener('pdf_completed', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📡 收到PDF完成事件:', data);
          this.emit('completed', data);
        } catch (error) {
          console.error('📡 解析PDF完成事件失败:', error);
        }
      });

      this.eventSource.addEventListener('pdf_downloaded', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📡 收到PDF下载完成事件:', data);
          this.emit('downloaded', data);
        } catch (error) {
          console.error('📡 解析PDF下载完成事件失败:', error);
        }
      });

      this.eventSource.addEventListener('heartbeat', (event) => {
        console.log('💓 收到SSE心跳');
      });

      this.eventSource.onerror = (error) => {
        console.warn('📡 SSE连接错误:', error);
        
        // 只有在连接完全关闭时才认为是严重错误
        if (this.eventSource.readyState === EventSource.CLOSED) {
          console.error('📡 SSE连接已永久关闭');
          this.isConnected = false;
          this.useSSE = false;
          this.cleanup();
          
          if (onError) {
            onError(error);
          }
        } else if (this.eventSource.readyState === EventSource.CONNECTING) {
          console.log('📡 SSE正在重新连接...');
          // 连接重试中，不需要特殊处理
        }
      };

      // 注册回调函数
      if (onProgress) this.on('progress', onProgress);
      if (onCompleted) this.on('completed', onCompleted);
      if (onFailed) this.on('failed', onFailed);

    } catch (error) {
      console.error('初始化SSE失败:', error);
      this.useSSE = false;
      if (onError) {
        onError(error);
      }
    }
  }

  /**
   * 注册事件监听器
   * @param {string} event - 事件类型 ('progress', 'completed', 'failed')
   * @param {Function} callback - 回调函数
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    // 检查是否已经注册过相同的回调函数，避免重复注册
    const callbacks = this.listeners.get(event);
    if (callbacks.indexOf(callback) === -1) {
      callbacks.push(callback);
      console.log(`📡 注册SSE监听器: ${event}, 当前数量: ${callbacks.length}`);
    } else {
      console.log(`📡 SSE监听器已存在: ${event}, 跳过重复注册`);
    }
  }

  /**
   * 移除事件监听器
   * @param {string} event - 事件类型
   * @param {Function} callback - 要移除的回调函数
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
        console.log(`📡 移除SSE监听器: ${event}, 当前数量: ${callbacks.length}`);
      } else {
        console.log(`📡 SSE监听器不存在: ${event}, 无需移除`);
      }
    }
  }

  /**
   * 触发事件
   * @param {string} event - 事件类型
   * @param {any} data - 事件数据
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`执行${event}事件回调时出错:`, error);
        }
      });
    }
  }

  /**
   * 处理SSE消息
   * @param {Object} data - 消息数据
   */
  handleMessage(data) {
    const { type } = data;
    
    switch (type) {
      case 'pdf_progress':
        this.emit('progress', data);
        break;
      case 'pdf_completed':
        this.emit('completed', data);
        break;
      case 'pdf_failed':
        this.emit('failed', data);
        break;
      default:
        console.log('📡 未知的SSE消息类型:', type);
    }
  }

  /**
   * 关闭SSE连接
   */
  close() {
    if (this.eventSource) {
      console.log('📡 正在关闭SSE连接, ID:', this.connectionId);
      this.eventSource.close();
      this.eventSource = null;
      this.isConnected = false;
      console.log('📡 SSE连接已关闭, ID:', this.connectionId);
    }
  }

  /**
   * 清理资源 - 但保持连接如果还有其他监听器
   */
  cleanup() {
    // 不要直接关闭连接，而是清理当前组件的监听器
    // 只有当没有任何监听器时才关闭连接
    const hasListeners = Array.from(this.listeners.values()).some(callbacks => callbacks.length > 0);
    
    console.log('📡 SSE监听器状态:', {
      progress: this.listeners.get('progress')?.length || 0,
      completed: this.listeners.get('completed')?.length || 0,
      failed: this.listeners.get('failed')?.length || 0,
      connected: this.listeners.get('connected')?.length || 0
    });
    
    if (!hasListeners) {
      console.log('📡 没有监听器，关闭SSE连接');
      this.close();
      this.connectionId = null;
      this.useSSE = true;
    } else {
      console.log('📡 还有其他监听器，保持SSE连接');
    }
  }

  /**
   * 强制清理所有资源
   */
  forceCleanup() {
    this.close();
    this.listeners.clear();
    this.connectionId = null;
    this.useSSE = true;
  }

  /**
   * 检查是否已连接
   */
  get connected() {
    return this.isConnected && this.eventSource && this.eventSource.readyState === EventSource.OPEN;
  }
}

// 创建单例实例
const sseService = new SSEService();

export { SSEService, sseService };
