// 需要在顶部导入 Vue
import Vue from 'vue';

const state = {
  // 全局下载任务状态 
  // { taskId: { type, status, progress, startTime, userId } }
  downloadTasks: {},
  
  // 用户相关的任务缓存
  // { userId: { taskType: { taskId, status, progress, startTime } } }
  userTasks: {},
  
  // 全局下载状态管理 - 防止重复下载
  // Set类型，存储正在下载或已处理的任务标识
  downloadingTasks: new Set()
};

const actions = {
  // 添加下载任务
  addDownloadTask({ commit }, { taskId, type, userId }) {
    commit('ADD_DOWNLOAD_TASK', { taskId, type, userId });
  },
  
  // 更新任务进度
  updateTaskProgress({ commit }, { taskId, progress }) {
    commit('UPDATE_TASK_PROGRESS', { taskId, progress });
  },
  
  // 标记任务生成完成（但还未下载）
  generateTask({ commit }, { taskId }) {
    commit('GENERATE_TASK', { taskId });
  },
  
  // 标记任务已下载
  downloadTask({ commit }, { taskId }) {
    commit('DOWNLOAD_TASK', { taskId });
  },
  
  // 完成任务（别名，指向 downloadTask）
  completeTask({ commit }, { taskId }) {
    commit('DOWNLOAD_TASK', { taskId });
  },
  
  // 标记任务失败
  failTask({ commit }, { taskId, error }) {
    commit('FAIL_TASK', { taskId, error });
  },
  
  // 移除任务
  removeTask({ commit }, { taskId }) {
    commit('REMOVE_TASK', { taskId });
  },
  
  // 清理用户的所有任务
  clearUserTasks({ commit }, { userId }) {
    commit('CLEAR_USER_TASKS', { userId });
  },
  
  // 从存储中恢复用户任务
  restoreUserTasks({ commit }, { userId, tasks }) {
    commit('RESTORE_USER_TASKS', { userId, tasks });
  },
  
  // 检查是否正在下载或已处理
  isDownloading({ state }, downloadKey) {
    return state.downloadingTasks.has(downloadKey);
  },
  
  // 标记开始下载
  startDownload({ commit }, downloadKey) {
    commit('ADD_DOWNLOADING_TASK', downloadKey);
  },
  
  // 标记下载完成
  finishDownload({ commit }, downloadKey) {
    commit('REMOVE_DOWNLOADING_TASK', downloadKey);
  },
  
  // 清理所有下载状态
  clearDownloadingTasks({ commit }) {
    commit('CLEAR_DOWNLOADING_TASKS');
  }
};

const mutations = {
  ADD_DOWNLOAD_TASK(state, { taskId, type, userId }) {
    // 添加到全局任务列表
    Vue.set(state.downloadTasks, taskId, {
      type,
      status: 'processing',
      progress: 0,
      startTime: Date.now(),
      userId
    });
    
    // 添加到用户任务缓存
    if (!state.userTasks[userId]) {
      Vue.set(state.userTasks, userId, {});
    }
    Vue.set(state.userTasks[userId], type, {
      taskId,
      status: 'processing',
      progress: 0,
      startTime: Date.now()
    });
  },
  
  UPDATE_TASK_PROGRESS(state, { taskId, progress }) {
    const task = state.downloadTasks[taskId];
    if (task) {
      task.progress = progress;
      
      // 同步更新用户任务缓存
      const userTask = state.userTasks[task.userId]?.[task.type];
      if (userTask && userTask.taskId === taskId) {
        userTask.progress = progress;
      }
    }
  },
  
  GENERATE_TASK(state, { taskId }) {
    const task = state.downloadTasks[taskId];
    if (task) {
      task.status = 'generated';
      task.progress = 100;
      
      // 同步更新用户任务缓存
      const userTask = state.userTasks[task.userId]?.[task.type];
      if (userTask && userTask.taskId === taskId) {
        userTask.status = 'generated';
        userTask.progress = 100;
      }
    }
  },
  
  DOWNLOAD_TASK(state, { taskId }) {
    const task = state.downloadTasks[taskId];
    if (task) {
      task.status = 'downloaded';
      task.progress = 100;
      task.downloadedAt = Date.now();
      
      // 同步更新用户任务缓存
      const userTask = state.userTasks[task.userId]?.[task.type];
      if (userTask && userTask.taskId === taskId) {
        userTask.status = 'downloaded';
        userTask.progress = 100;
        userTask.downloadedAt = Date.now();
      }
    }
  },
  
  FAIL_TASK(state, { taskId, error }) {
    const task = state.downloadTasks[taskId];
    if (task) {
      task.status = 'failed';
      task.error = error;
      
      // 同步更新用户任务缓存
      const userTask = state.userTasks[task.userId]?.[task.type];
      if (userTask && userTask.taskId === taskId) {
        userTask.status = 'failed';
        userTask.error = error;
      }
    }
  },
  
  REMOVE_TASK(state, { taskId }) {
    const task = state.downloadTasks[taskId];
    if (task) {
      const { userId, type } = task;
      
      // 从全局任务列表移除
      Vue.delete(state.downloadTasks, taskId);
      
      // 从用户任务缓存移除
      if (state.userTasks[userId]?.[type]?.taskId === taskId) {
        Vue.delete(state.userTasks[userId], type);
      }
    }
  },
  
  CLEAR_USER_TASKS(state, { userId }) {
    // 从全局任务列表中移除该用户的所有任务
    Object.keys(state.downloadTasks).forEach(taskId => {
      if (state.downloadTasks[taskId].userId === userId) {
        Vue.delete(state.downloadTasks, taskId);
      }
    });
    
    // 清理用户任务缓存
    if (state.userTasks[userId]) {
      Vue.delete(state.userTasks, userId);
    }
  },
  
  RESTORE_USER_TASKS(state, { userId, tasks }) {
    if (!state.userTasks[userId]) {
      Vue.set(state.userTasks, userId, {});
    }
    
    // 恢复用户任务，并同步到全局任务列表
    Object.keys(tasks).forEach(type => {
      const task = tasks[type];
      Vue.set(state.userTasks[userId], type, task);
      
      // 如果任务还在进行中，也添加到全局列表
      if (task.status === 'processing' || task.status === 'completed') {
        Vue.set(state.downloadTasks, task.taskId, {
          type,
          status: task.status,
          progress: task.progress,
          startTime: task.startTime,
          userId
        });
      }
    });
  },
  
  // 下载状态管理 mutations
  ADD_DOWNLOADING_TASK(state, downloadKey) {
    state.downloadingTasks.add(downloadKey);
    console.log(`🔒 标记下载中: ${downloadKey}, 当前下载数: ${state.downloadingTasks.size}`);
  },
  
  REMOVE_DOWNLOADING_TASK(state, downloadKey) {
    state.downloadingTasks.delete(downloadKey);
    console.log(`✅ 移除下载标记: ${downloadKey}, 当前下载数: ${state.downloadingTasks.size}`);
  },
  
  CLEAR_DOWNLOADING_TASKS(state) {
    state.downloadingTasks.clear();
    console.log('🧹 清理所有下载状态');
  }
};

const getters = {
  // 获取用户的待处理任务
  getUserPendingTasks: (state) => (userId) => {
    return state.userTasks[userId] || {};
  },
  
  // 获取用户是否有待处理任务
  hasUserPendingTasks: (state) => (userId) => {
    const userTasks = state.userTasks[userId];
    if (!userTasks) return false;
    
    return Object.values(userTasks).some(task => 
      task.status === 'processing' || task.status === 'completed'
    );
  },
  
  // 获取特定任务ID的任务信息
  getTaskById: (state) => (taskId) => {
    return state.downloadTasks[taskId];
  },
  
  // 获取用户的特定类型任务
  getUserTaskByType: (state) => (userId, type) => {
    return state.userTasks[userId]?.[type];
  },
  
  // 检查是否正在下载
  isDownloading: (state) => (downloadKey) => {
    return state.downloadingTasks.has(downloadKey);
  },
  
  // 获取当前下载任务数量
  downloadingTasksCount: (state) => {
    return state.downloadingTasks.size;
  }
};

export const tasks = {
  namespaced: true,
  state,
  actions,
  mutations,
  getters
};
