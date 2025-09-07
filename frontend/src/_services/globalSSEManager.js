import { sseService } from './sse.service.js';

class GlobalSSEManager {
  constructor() {
    this.isListening = false;
    this.callbacks = new Map();
        // 绑定事件处理器
    this.completedHandler = this.handleCompleted.bind(this);
    this.downloadedHandler = this.handleDownloaded.bind(this);
    this.handledTasks = new Set(); // 追踪已处理的任务
    this.taskOwners = new Map(); // 追踪任务的所有者组件
    
    // 创建跨标签页通信频道
    this.broadcastChannel = new BroadcastChannel('sse-events');
    
    // 监听来自其他标签页的消息
    this.broadcastChannel.onmessage = (event) => {
      const { type, data } = event.data;
      if (type === 'sse-completed') {
        this.handleCrossTabCompleted(data);
      } else if (type === 'download-completed') {
        this.handleCrossTabDownloadCompleted(data);
      }
    };
    
    console.log('🌐 Global SSE Manager initialized with cross-tab communication');
  }

  // 启动全局SSE监听
  startListening() {
    if (this.isListening) {
      return;
    }
    
    console.log('🌐 Starting global SSE listener');
    sseService.on('completed', this.completedHandler);
    sseService.on('downloaded', this.downloadedHandler);
    this.isListening = true;
  }

  // 停止全局SSE监听
  stopListening() {
    if (!this.isListening) {
      return;
    }
    
    console.log('🌐 Stopping global SSE listener');
    sseService.off('completed', this.completedHandler);
    sseService.off('downloaded', this.downloadedHandler);
    this.isListening = false;
    this.callbacks.clear();
  }

  // 注册组件回调
  registerComponent(componentId, callback, taskChecker = null) {
    console.log(`📝 Registering component: ${componentId}`);
    this.callbacks.set(componentId, {
      callback,
      taskChecker // 可选的任务检查函数，用于判断组件是否应该处理特定任务
    });
    this.startListening();
  }

  // 注册任务所有权
  claimTask(taskId, componentId) {
    console.log(`🎯 Component ${componentId} claims ownership of task ${taskId}`);
    
    // 将任务所有权存储到localStorage，支持跨标签页
    const taskOwners = JSON.parse(localStorage.getItem('task_owners') || '{}');
    taskOwners[taskId] = {
      componentId: componentId,
      timestamp: Date.now()
    };
    localStorage.setItem('task_owners', JSON.stringify(taskOwners));
    
    // 同时更新内存中的映射
    this.taskOwners.set(taskId, componentId);
    
    // 30秒后清理所有权，防止内存泄漏
    setTimeout(() => {
      this.cleanupTaskOwnership(taskId, componentId);
    }, 30000);
  }

  // 清理任务所有权
  cleanupTaskOwnership(taskId, componentId) {
    const taskOwners = JSON.parse(localStorage.getItem('task_owners') || '{}');
    if (taskOwners[taskId] && taskOwners[taskId].componentId === componentId) {
      delete taskOwners[taskId];
      localStorage.setItem('task_owners', JSON.stringify(taskOwners));
      console.log(`🧹 Cleaned up ownership for task: ${taskId}`);
    }
    
    // 同时清理内存映射
    if (this.taskOwners.get(taskId) === componentId) {
      this.taskOwners.delete(taskId);
    }
  }

  // 获取任务所有者（从localStorage读取）
  getTaskOwner(taskId) {
    const taskOwners = JSON.parse(localStorage.getItem('task_owners') || '{}');
    return taskOwners[taskId] ? taskOwners[taskId].componentId : null;
  }

  // 注销组件回调
  unregisterComponent(componentId) {
    console.log(`🗑️ Unregistering component: ${componentId}`);
    this.callbacks.delete(componentId);
    
    // 如果没有组件监听，停止SSE
    if (this.callbacks.size === 0) {
      this.stopListening();
    }
  }

  // 处理生成完成事件
  handleCompleted(data) {
    console.log('🌐 Global SSE received generation completed event:', data);
    
    const { taskId } = data;
    
    // 检查是否已经处理过这个任务
    if (this.handledTasks.has(taskId)) {
      console.log(`⚠️ Task ${taskId} already handled, skipping...`);
      return;
    }
    
    // 标记任务已被处理
    this.handledTasks.add(taskId);
    console.log(`🏷️ Marked task ${taskId} as handled`);
    
    // 设置清理定时器，30秒后清理任务标记
    setTimeout(() => {
      this.handledTasks.delete(taskId);
      console.log(`🧹 Cleaned up task mark: ${taskId}`);
    }, 30000);
    
    // 第一优先级：检查是否有明确的任务所有者（从localStorage读取）
    const taskOwner = this.getTaskOwner(taskId);
    console.log(`🔍 Looking for task owner: ${taskId} → ${taskOwner}`);
    
    // 为了调试，显示localStorage中的任务所有权信息
    const taskOwners = JSON.parse(localStorage.getItem('task_owners') || '{}');
    console.log(`🔍 Available task owners:`, Object.entries(taskOwners));
    console.log(`🔍 Registered components:`, Array.from(this.callbacks.keys()));
    
    if (taskOwner && this.callbacks.has(taskOwner)) {
      console.log(`👑 Task ${taskId} has owner: ${taskOwner}, notifying only owner`);
      console.log(`📄 PDF生成完成，开始自动下载`);
      
      // 触发自动下载逻辑（如果配置了自动下载）
      this.triggerAutoDownload(data);
      
      const ownerData = this.callbacks.get(taskOwner);
      try {
        ownerData.callback(data);
      } catch (error) {
        console.error(`❌ Error in owner ${taskOwner} callback:`, error);
      }
      return;
    } else if (taskOwner) {
      console.warn(`⚠️ Task owner ${taskOwner} found but component not registered in this tab`);
      console.log(`📡 Broadcasting SSE event to other tabs for owner: ${taskOwner}`);
      
      // 通过BroadcastChannel通知其他标签页
      this.broadcastChannel.postMessage({
        type: 'sse-completed',
        data: data,
        targetOwner: taskOwner
      });
      
      // 不要在本标签页继续处理，让拥有组件的标签页处理
      return;
    } else {
      console.log(`📝 No task owner found for ${taskId}`);
    }
    
    // 第二优先级：找到负责处理这个任务的组件（通过taskChecker）
    let responsibleComponent = null;
    let responsibleComponents = [];
    
    // 检查所有组件的taskChecker
    this.callbacks.forEach(({ callback, taskChecker }, componentId) => {
      if (taskChecker && taskChecker(taskId)) {
        responsibleComponents.push(componentId);
        if (!responsibleComponent) {
          responsibleComponent = componentId;
        }
        console.log(`🎯 Component ${componentId} claims responsibility for task ${taskId}`);
      }
    });
    
    // 如果有多个组件都声明负责，这是异常情况，记录警告
    if (responsibleComponents.length > 1) {
      console.warn(`⚠️ Multiple components claim task ${taskId}:`, responsibleComponents);
      console.warn(`⚠️ Will notify only the first one: ${responsibleComponent}`);
    }
    
    // 如果有负责的组件，只通知第一个
    if (responsibleComponent) {
      const componentData = this.callbacks.get(responsibleComponent);
      if (componentData) {
        try {
          console.log(`📢 Notifying responsible component: ${responsibleComponent}`);
          componentData.callback(data);
        } catch (error) {
          console.error(`❌ Error in responsible component ${responsibleComponent} callback:`, error);
        }
      }
      return;
    }
    
    // 最后：没有所有者也没有负责的组件，通知DocumentManagement作为默认处理器
    const docManagement = this.callbacks.get('DocumentManagement');
    if (docManagement) {
      console.log(`📢 No owner or responsible component, notifying DocumentManagement as default`);
      try {
        docManagement.callback(data);
      } catch (error) {
        console.error(`❌ Error in DocumentManagement callback:`, error);
      }
    } else {
      console.warn(`⚠️ No component available to handle task ${taskId}`);
    }
  }

  // 触发自动下载逻辑
  triggerAutoDownload(data) {
    // 导入并检查用户设置（这里的逻辑根据实际需求调整）
    const { taskId, downloadUrl } = data;
    
    // 检查是否启用自动下载（从localStorage或store获取设置）
    const autoDownloadEnabled = localStorage.getItem('autoDownload') !== 'false'; // 默认开启
    
    if (!autoDownloadEnabled) {
      console.log(`⚙️ 自动下载已禁用，任务 ${taskId} 将显示手动下载按钮`);
      return;
    }
    
    // 检查是否已经在下载中，避免重复下载
    const downloadKey = `download_${taskId}`;
    if (this.handledTasks.has(downloadKey)) {
      console.log(`⚠️ 任务 ${taskId} 正在下载中，跳过重复下载`);
      return;
    }
    
    // 标记为下载中
    this.handledTasks.add(downloadKey);
    
    // 获取store引用来管理下载状态
    const store = window.Vue?.$store || window.$nuxt?.$store;
    if (store) {
      store.dispatch('tasks/startDownload', downloadKey);
    }
    
    // 触发自动下载（使用现有的下载管理器）
    console.log(`📥 开始下载任务: ${downloadKey}`);
    
    // 这里调用下载管理器的下载逻辑
    // 注意：需要确保下载管理器可以在全局范围内访问
    this.performDownload(data).then(() => {
      console.log(`✅ 下载任务完成: ${downloadKey}`);
      
      // 清除下载标记
      this.handledTasks.delete(downloadKey);
      if (store) {
        store.dispatch('tasks/finishDownload', downloadKey);
      }
      
      // 通知其他标签页下载已完成
      this.notifyDownloadCompleted(taskId, data.documentType);
      
      // 清理任务所有权
      this.cleanupTaskOwnership(taskId);
      
    }).catch((error) => {
      console.error(`❌ 下载任务失败: ${downloadKey}`, error);
      
      // 清除下载标记
      this.handledTasks.delete(downloadKey);
      if (store) {
        store.dispatch('tasks/finishDownload', downloadKey);
      }
    });
  }

  // 触发自动下载逻辑
  triggerAutoDownload(data) {
    // 导入并检查用户设置（这里的逻辑根据实际需求调整）
    const { taskId, downloadUrl } = data;
    
    // 检查是否启用自动下载（从localStorage或store获取设置）
    const autoDownloadEnabled = localStorage.getItem('autoDownload') !== 'false'; // 默认开启
    
    if (!autoDownloadEnabled) {
      console.log(`⚙️ 自动下载已禁用，任务 ${taskId} 将显示手动下载按钮`);
      return;
    }
    
    // 检查是否已经在下载中，避免重复下载
    const downloadKey = `download_${taskId}`;
    if (this.handledTasks.has(downloadKey)) {
      console.log(`⚠️ 任务 ${taskId} 正在下载中，跳过重复下载`);
      return;
    }
    
    // 标记为下载中
    this.handledTasks.add(downloadKey);
    
    // 获取store引用来管理下载状态
    const store = window.Vue?.$store || window.$nuxt?.$store;
    if (store) {
      store.dispatch('tasks/startDownload', downloadKey);
    }
    
    // 触发自动下载（使用现有的下载管理器）
    console.log(`📥 开始下载任务: ${downloadKey}`);
    
    // 这里调用下载管理器的下载逻辑
    this.performDownload(data).then(() => {
      console.log(`✅ 下载任务完成: ${downloadKey}`);
      
      // 清除下载标记
      this.handledTasks.delete(downloadKey);
      if (store) {
        store.dispatch('tasks/finishDownload', downloadKey);
      }
      
      // 通知其他标签页下载已完成
      this.notifyDownloadCompleted(taskId, data.documentType);
      
      // 清理任务所有权
      this.cleanupTaskOwnership(taskId);
      
    }).catch((error) => {
      console.error(`❌ 下载任务失败: ${downloadKey}`, error);
      
      // 清除下载标记
      this.handledTasks.delete(downloadKey);
      if (store) {
        store.dispatch('tasks/finishDownload', downloadKey);
      }
    });
  }
  
  // 执行下载
  async performDownload(data) {
    const { taskId, downloadUrl } = data;
    
    try {
      // 使用fetch下载文件
      const response = await fetch(downloadUrl, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }
      
      // 获取文件名
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'document.pdf';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      
      // 创建blob并下载
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log(`📥 文件下载完成: ${filename}`);
      
    } catch (error) {
      console.error(`❌ 下载失败:`, error);
      throw error;
    }
  }

  // 处理下载完成事件
  handleDownloaded(data) {
    console.log('🌐 Global SSE received download completed event:', data);
    
    const { taskId } = data;
    
    // 检查是否已经处理过这个下载事件
    const downloadKey = `downloaded_${taskId}`;
    if (this.handledTasks.has(downloadKey)) {
      console.log(`⚠️ Download event for task ${taskId} already handled, skipping...`);
      return;
    }
    
    // 标记下载事件已被处理
    this.handledTasks.add(downloadKey);
    console.log(`🏷️ Marked download event ${taskId} as handled`);
    
    // 设置清理定时器，30秒后清理下载事件标记
    setTimeout(() => {
      this.handledTasks.delete(downloadKey);
      console.log(`🧹 Cleaned up download event mark: ${taskId}`);
    }, 30000);
    
    // 通过store标记任务为已下载
    const store = window.Vue?.$store || window.$nuxt?.$store;
    if (store) {
      store.dispatch('tasks/downloadTask', taskId);
      console.log(`📥 Store: marked task ${taskId} as downloaded`);
    }
    
    // 通过BroadcastChannel通知其他标签页
    this.broadcastChannel.postMessage({
      type: 'download-completed',
      data: {
        type: 'pdf_downloaded',
        taskId: taskId,
        documentType: data.documentType,
        timestamp: Date.now()
      }
    });
    
    console.log(`📡 Broadcasted download completion to other tabs for task: ${taskId}`);
    
    // 同时通知本标签页的DocumentManagement组件
    const docManagement = this.callbacks.get('DocumentManagement');
    if (docManagement) {
      console.log(`📢 Notifying DocumentManagement in same tab about download completion`);
      try {
        docManagement.callback({
          type: 'pdf_downloaded',
          taskId: taskId,
          documentType: data.documentType,
          timestamp: Date.now(),
          fromDownloadCompletion: true
        });
      } catch (error) {
        console.error(`❌ Error in DocumentManagement same-tab download completion callback:`, error);
      }
    } else {
      console.log(`📝 DocumentManagement not found in this tab for same-tab notification`);
    }
  }

  // 处理来自其他标签页的下载完成事件
  handleCrossTabDownloadCompleted(data) {
    const { taskId } = data;
    console.log(`📥 Received cross-tab download completed event for task: ${taskId}`);
    
    // 通知本标签页的DocumentManagement更新任务状态
    const docManagement = this.callbacks.get('DocumentManagement');
    if (docManagement) {
      console.log(`📢 Notifying DocumentManagement to update task status after download completion`);
      try {
        docManagement.callback({
          ...data,
          fromDownloadCompletion: true
        });
      } catch (error) {
        console.error(`❌ Error in DocumentManagement download completion callback:`, error);
      }
    } else {
      console.log(`📝 DocumentManagement not found in this tab`);
    }
  }

  // 通知其他标签页下载已完成
  notifyDownloadCompleted(taskId, documentType) {
    console.log(`📡 Broadcasting download completion for task: ${taskId}`);
    this.broadcastChannel.postMessage({
      type: 'download-completed',
      data: {
        type: 'pdf_completed',
        taskId: taskId,
        documentType: documentType,
        timestamp: Date.now()
      }
    });
  }

  // 处理来自其他标签页的SSE事件
  handleCrossTabCompleted(data) {
    const { taskId } = data;
    
    // 检查是否已经处理过这个任务
    if (this.handledTasks.has(taskId)) {
      console.log(`⚠️ Cross-tab task ${taskId} already handled, skipping...`);
      return;
    }
    
    console.log(`📡 Received cross-tab SSE event for task: ${taskId}`);
    
    // 标记任务已被处理
    this.handledTasks.add(taskId);
    
    // 检查本标签页是否有对应的组件
    const taskOwner = this.getTaskOwner(taskId);
    if (taskOwner && this.callbacks.has(taskOwner)) {
      console.log(`🎯 Found target component in this tab: ${taskOwner}`);
      const ownerData = this.callbacks.get(taskOwner);
      try {
        ownerData.callback(data);
      } catch (error) {
        console.error(`❌ Error in cross-tab owner ${taskOwner} callback:`, error);
      }
    } else {
      console.log(`📝 Target component ${taskOwner} not found in this tab`);
    }
  }

  // 检查任务是否已被处理
  isTaskHandled(taskKey) {
    return this.handledTasks.has(taskKey);
  }

  // 获取当前监听状态
  getStatus() {
    return {
      isListening: this.isListening,
      registeredComponents: Array.from(this.callbacks.keys())
    };
  }
}

// 创建全局单例实例
const globalSSEManager = new GlobalSSEManager();

export default globalSSEManager;
