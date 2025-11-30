<template>
  <div class="ppt-upload-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>PPT Upload</h2>
      <p>Upload your presentation slides for the conference</p>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="3" animated />
    </div>

    <!-- 无已批准注册的提示 -->
    <el-card v-else-if="!hasApprovedRegistration" class="no-registration-card" shadow="never">
      <div class="no-registration-content">
        <div class="no-registration-icon">
          <i class="el-icon-warning-outline"></i>
        </div>
        <div class="no-registration-text">
          <h3>No Approved Registration</h3>
          <p>You need at least one approved registration before uploading your presentation.</p>
          <el-button type="primary" @click="goToRegistrations">
            <i class="el-icon-tickets"></i> View My Registrations
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 有已批准注册的内容 -->
    <template v-else>
      <!-- 上传说明卡片 -->
      <el-card class="info-card" shadow="never">
        <div class="info-content">
          <div class="info-icon">
            <i class="el-icon-upload"></i>
          </div>
          <div class="info-details">
            <h3>Presentation Upload</h3>
            <p>Upload your presentation file for the conference</p>
            <div class="file-requirements">
              <span>Supported formats: .ppt, .pptx, .pdf, .zip</span>
              <span>Maximum file size: 50MB</span>
            </div>
            <div v-if="approvedRegistrations.length > 1" class="upload-tip">
              <i class="el-icon-info"></i>
              <span>You have {{ approvedRegistrations.length }} approved registrations. Please upload all presentations in a single .zip file.</span>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 主要内容 -->
      <div class="main-content">
        <!-- 当前上传的文件 -->
        <el-card v-if="currentUpload" class="current-file-card">
          <div slot="header" class="card-header">
            <span>Current Uploaded File</span>
            <el-button type="danger" size="small" @click="handleDelete">
              <i class="el-icon-delete"></i> Delete
            </el-button>
          </div>
          
          <div class="file-info">
            <div class="file-icon">
              <i :class="getFileIcon(currentUpload.fileExtension)"></i>
            </div>
            <div class="file-details">
              <div class="file-name">{{ currentUpload.originalFilename }}</div>
              <div class="file-meta">
                <span><i class="el-icon-document"></i> {{ currentUpload.fileSizeFormatted }}</span>
                <span><i class="el-icon-time"></i> {{ formatDate(currentUpload.uploadTime) }}</span>
              </div>
              <div class="file-hash">
                <span class="hash-label">SHA256:</span>
                <span class="hash-value">{{ currentUpload.fileHash }}</span>
                <el-button type="text" size="mini" @click="copyHash">
                  <i class="el-icon-copy-document"></i>
                </el-button>
              </div>
            </div>
          </div>
        </el-card>

        <!-- 上传区域 -->
        <el-card class="upload-card">
          <div slot="header" class="card-header">
            <span>{{ currentUpload ? 'Replace File' : 'Upload File' }}</span>
          </div>
          
          <el-upload
            class="upload-area"
            drag
            action="/api/ppt-upload/upload"
            :before-upload="beforeUpload"
            :on-success="handleUploadSuccess"
            :on-error="handleUploadError"
            :on-progress="handleUploadProgress"
            :show-file-list="false"
            :disabled="uploading"
            accept=".ppt,.pptx,.pdf,.zip">
            <div v-if="uploading" class="uploading-state">
              <el-progress type="circle" :percentage="uploadProgress"></el-progress>
              <p>Uploading...</p>
            </div>
            <div v-else>
              <i class="el-icon-upload"></i>
              <div class="el-upload__text">
                Drop file here or <em>click to upload</em>
              </div>
              <div class="el-upload__tip" slot="tip">
                Supported: .ppt, .pptx, .pdf, .zip (Max 50MB)
              </div>
            </div>
          </el-upload>
        </el-card>
      </div>
    </template>
  </div>
</template>

<script>
import { userService } from '../../_services';

export default {
  name: 'PptUploadManagement',
  
  data() {
    return {
      loading: false,
      uploading: false,
      uploadProgress: 0,
      currentUpload: null,
      hasApprovedRegistration: false,
      approvedRegistrations: []
    };
  },
  
  mounted() {
    this.initializeData();
  },
  
  methods: {
    // 初始化数据
    async initializeData() {
      this.loading = true;
      try {
        // 先加载已批准的注册
        await this.loadApprovedRegistrations();
        
        // 只有有已批准的注册才加载当前上传的文件
        if (this.hasApprovedRegistration) {
          await this.loadCurrentUpload();
        }
      } finally {
        this.loading = false;
      }
    },
    
    // 加载已批准的注册
    async loadApprovedRegistrations() {
      try {
        console.log('PptUploadManagement: Loading approved registrations...');
        const response = await userService.getApprovedRegistrations();
        
        if (response && response.success && response.data) {
          this.approvedRegistrations = response.data;
          this.hasApprovedRegistration = this.approvedRegistrations.length > 0;
          console.log('PptUploadManagement: Found approved registrations:', this.approvedRegistrations.length);
        } else {
          this.hasApprovedRegistration = false;
          this.approvedRegistrations = [];
        }
      } catch (error) {
        console.error('PptUploadManagement: Failed to load approved registrations:', error);
        this.hasApprovedRegistration = false;
        this.approvedRegistrations = [];
      }
    },
    
    // 跳转到注册页面
    goToRegistrations() {
      this.$emit('navigate', 'registrations');
    },
    
    // 加载当前上传的文件
    async loadCurrentUpload() {
      try {
        const axios = (await import('axios')).default;
        const response = await axios.get('/api/ppt-upload/my-upload', {
          withCredentials: true
        });
        
        if (response.data.success && response.data.data.upload) {
          this.currentUpload = response.data.data.upload;
        } else {
          this.currentUpload = null;
        }
      } catch (error) {
        console.error('Failed to load current upload:', error);
        this.currentUpload = null;
      }
    },
    
    // 上传前检查
    beforeUpload(file) {
      const allowedExtensions = ['.ppt', '.pptx', '.pdf', '.zip'];
      const maxSize = 50 * 1024 * 1024; // 50MB
      
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        this.$message.error(`Invalid file type. Allowed: ${allowedExtensions.join(', ')}`);
        return false;
      }
      
      if (file.size > maxSize) {
        this.$message.error('File size exceeds 50MB limit');
        return false;
      }
      
      this.uploading = true;
      this.uploadProgress = 0;
      return true;
    },
    
    // 上传成功
    handleUploadSuccess(response, file) {
      this.uploading = false;
      this.uploadProgress = 0;
      
      if (response.success) {
        this.$message.success('File uploaded successfully');
        this.currentUpload = response.data.upload;
      } else {
        this.$message.error(response.message || 'Upload failed');
      }
    },
    
    // 上传失败
    handleUploadError(error) {
      this.uploading = false;
      this.uploadProgress = 0;
      console.error('Upload error:', error);
      this.$message.error('Upload failed. Please try again.');
    },
    
    // 上传进度
    handleUploadProgress(event) {
      if (event.percent) {
        this.uploadProgress = Math.round(event.percent);
      }
    },
    
    // 删除文件
    async handleDelete() {
      try {
        await this.$confirm('Are you sure you want to delete this file?', 'Confirm Delete', {
          confirmButtonText: 'Delete',
          cancelButtonText: 'Cancel',
          type: 'warning'
        });
        
        const axios = (await import('axios')).default;
        const response = await axios.delete(`/api/ppt-upload/delete/${this.currentUpload.id}`, {
          withCredentials: true
        });
        
        if (response.data.success) {
          this.$message.success('File deleted successfully');
          this.currentUpload = null;
        } else {
          this.$message.error(response.data.message || 'Delete failed');
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Delete error:', error);
          this.$message.error('Failed to delete file');
        }
      }
    },
    
    // 复制hash值
    copyHash() {
      if (this.currentUpload && this.currentUpload.fileHash) {
        navigator.clipboard.writeText(this.currentUpload.fileHash).then(() => {
          this.$message.success('Hash copied to clipboard');
        }).catch(() => {
          this.$message.error('Failed to copy hash');
        });
      }
    },
    
    // 获取文件图标
    getFileIcon(ext) {
      const iconMap = {
        '.ppt': 'el-icon-data-board',
        '.pptx': 'el-icon-data-board',
        '.pdf': 'el-icon-document',
        '.zip': 'el-icon-folder'
      };
      return iconMap[ext] || 'el-icon-document';
    },
    
    // 格式化日期
    formatDate(date) {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }
};
</script>

<style scoped>
.ppt-upload-management {
  padding: 20px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 24px;
}

.page-header p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.info-card {
  margin-bottom: 24px;
  border: 1px solid #e4e7ed;
}

.info-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.info-icon {
  font-size: 48px;
  color: #409EFF;
}

.info-details h3 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 18px;
}

.info-details p {
  margin: 0 0 8px 0;
  color: #606266;
}

.file-requirements {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #909399;
}

.upload-tip {
  margin-top: 12px;
  padding: 10px 12px;
  background: #fdf6ec;
  border: 1px solid #faecd8;
  border-radius: 4px;
  font-size: 13px;
  color: #e6a23c;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.upload-tip i {
  margin-top: 2px;
  flex-shrink: 0;
}

.loading-container {
  padding: 40px;
}

.no-registration-card {
  border: 1px solid #faecd8;
  background: #fdf6ec;
}

.no-registration-content {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 20px;
}

.no-registration-icon {
  font-size: 64px;
  color: #e6a23c;
}

.no-registration-text h3 {
  margin: 0 0 12px 0;
  color: #303133;
  font-size: 18px;
}

.no-registration-text p {
  margin: 0 0 16px 0;
  color: #606266;
  font-size: 14px;
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.current-file-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.file-info {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.file-icon {
  font-size: 48px;
  color: #409EFF;
}

.file-details {
  flex: 1;
}

.file-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
  word-break: break-all;
}

.file-meta {
  display: flex;
  gap: 20px;
  color: #909399;
  font-size: 14px;
  margin-bottom: 12px;
}

.file-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.file-hash {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f5f7fa;
  padding: 8px 12px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
}

.hash-label {
  color: #909399;
  font-weight: 600;
}

.hash-value {
  color: #606266;
  word-break: break-all;
}

.upload-card .card-header {
  font-weight: 600;
}

.upload-area {
  width: 100%;
}

.upload-area :deep(.el-upload) {
  width: 100%;
}

.upload-area :deep(.el-upload-dragger) {
  width: 100%;
  height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.uploading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.uploading-state p {
  color: #909399;
  margin: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .ppt-upload-management {
    padding: 12px;
  }
  
  .info-content {
    flex-direction: column;
    text-align: center;
  }
  
  .no-registration-content {
    flex-direction: column;
    text-align: center;
  }
  
  .no-registration-icon {
    font-size: 48px;
  }
  
  .file-info {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .file-meta {
    flex-direction: column;
    gap: 8px;
    justify-content: center;
  }
  
  .file-hash {
    flex-direction: column;
    text-align: center;
  }
}
</style>
