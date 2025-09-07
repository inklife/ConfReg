/**
 * 下载管理器 Vue 插件
 */

import { getDownloadManager } from './downloadManager.js';

export default {
  install(Vue, options = {}) {
    // 通过 Vue.prototype 全局注册，避免使用 mixin 可能导致的重复初始化
    Vue.prototype.$downloadManager = null;
    
    Vue.prototype.$getDownloadManager = function() {
      // 使用延迟初始化，确保每个组件实例都有独立的访问
      if (!this.$downloadManager && this.$store) {
        this.$downloadManager = getDownloadManager(this.$store);
      }
      return this.$downloadManager;
    };
  }
};
