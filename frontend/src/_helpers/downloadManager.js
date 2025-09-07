/**
 * 全局下载管理器
 * 统一管理PDF文件下载，防止重复下载
 */

class DownloadManager {
  constructor(store) {
    this.store = store;
  }

  /**
   * 检查是否正在下载
   * @param {string} downloadKey - 下载标识键
   * @returns {boolean}
   */
  isDownloading(downloadKey) {
    return this.store.getters['tasks/isDownloading'](downloadKey);
  }

  /**
   * 标记开始下载
   * @param {string} downloadKey - 下载标识键
   */
  startDownload(downloadKey) {
    this.store.dispatch('tasks/startDownload', downloadKey);
  }

  /**
   * 标记下载完成
   * @param {string} downloadKey - 下载标识键
   */
  finishDownload(downloadKey) {
    this.store.dispatch('tasks/finishDownload', downloadKey);
  }

  /**
   * 统一的PDF下载方法
   * @param {Object} options - 下载配置
   * @param {string} options.taskId - 任务ID
   * @param {string} options.type - 文档类型 
   * @param {string} options.downloadKey - 下载标识键
   * @param {string} options.filename - 文件名
   * @param {Function} options.onSuccess - 成功回调
   * @param {Function} options.onError - 错误回调
   * @param {Object} options.context - Vue组件实例
   */
  async downloadPDF(options) {
    const {
      taskId,
      type,
      downloadKey,
      filename,
      onSuccess,
      onError,
      context
    } = options;

    // 检查是否正在下载
    if (this.isDownloading(downloadKey)) {
      console.log(`❌ 任务 ${downloadKey} 已在下载中，跳过重复下载`);
      return;
    }

    try {
      // 标记开始下载
      this.startDownload(downloadKey);
      console.log(`📥 开始下载任务: ${downloadKey}`);

      // 动态导入axios
      const axios = (await import('axios')).default;

      // 发起下载请求
      const downloadResponse = await axios.get(`/api/submissions/download_pdf/${taskId}`, {
        withCredentials: true,
        responseType: 'blob'
      });

      // 处理文件名
      let actualFilename = filename;
      const contentDisposition = downloadResponse.headers['content-disposition'];
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          actualFilename = filenameMatch[1];
        }
      }

      // 创建下载链接
      const blob = new Blob([downloadResponse.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = actualFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // 显示成功消息
      if (context && context.$message) {
        const docTypeName = this.getDocumentTypeName(type);
        context.$message.success(`${docTypeName} downloaded successfully!`);
      }

      // 执行成功回调
      if (onSuccess) {
        onSuccess(taskId, type, actualFilename);
      }

      console.log(`✅ 下载任务完成: ${downloadKey}`);

    } catch (error) {
      console.error(`下载任务失败: ${downloadKey}`, error);

      // 显示错误消息
      if (context && context.$message) {
        const docTypeName = this.getDocumentTypeName(type);
        context.$message.error(`Failed to download ${docTypeName}`);
      }

      // 执行错误回调
      if (onError) {
        onError(error, taskId, type);
      }

    } finally {
      // 移除下载标记
      this.finishDownload(downloadKey);
    }
  }

  /**
   * 获取文档类型名称
   * @param {string} type - 文档类型
   * @returns {string}
   */
  getDocumentTypeName(type) {
    const typeNames = {
      'receipt': 'Receipt',
      'confirmation': 'Confirmation Letter',
      'registration': 'Registration Information',
      'certificate': 'Certificate'
    };
    return typeNames[type] || 'Document';
  }

  /**
   * 生成下载键
   * @param {string} prefix - 前缀
   * @param {string} taskId - 任务ID
   * @param {string} type - 类型（可选）
   * @returns {string}
   */
  generateDownloadKey(prefix, taskId, type = '') {
    return type ? `${prefix}_${type}_${taskId}` : `${prefix}_${taskId}`;
  }

  /**
   * 清理所有下载状态
   */
  clearAllDownloadStates() {
    this.store.dispatch('tasks/clearDownloadingTasks');
  }
}

// 创建单例实例
let downloadManagerInstance = null;

/**
 * 获取下载管理器实例
 * @param {Object} store - Vuex store
 * @returns {DownloadManager}
 */
export function getDownloadManager(store) {
  if (!downloadManagerInstance) {
    downloadManagerInstance = new DownloadManager(store);
  }
  return downloadManagerInstance;
}

export default DownloadManager;
