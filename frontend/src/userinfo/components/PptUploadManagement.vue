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
            <p>You have {{ approvedRegistrations.length }} approved registration(s). Please upload your presentation file via the link below.</p>
            <div class="file-requirements">
              <span>Supported formats: .ppt, .pptx, .pdf</span>
              <span>Please use the external upload service</span>
            </div>
            <div class="upload-action">
              <el-button type="primary" size="large" @click="goToUploadPage">
                <i class="el-icon-upload2"></i> Go to Upload Page
              </el-button>
            </div>
          </div>
        </div>
      </el-card>
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
      hasApprovedRegistration: false,
      approvedRegistrations: [],
      uploadPageUrl: ''
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
        // 并行加载配置和已批准的注册
        await Promise.all([
          this.loadConfig(),
          this.loadApprovedRegistrations()
        ]);
      } finally {
        this.loading = false;
      }
    },
    
    // 加载配置
    async loadConfig() {
      try {
        const axios = (await import('axios')).default;
        const response = await axios.get('/api/config');
        
        if (response.data.success && response.data.data.pptUpload) {
          this.uploadPageUrl = response.data.data.pptUpload.externalUrl || '';
          console.log('PptUploadManagement: Config loaded, uploadPageUrl:', this.uploadPageUrl);
        }
      } catch (error) {
        console.error('PptUploadManagement: Failed to load config:', error);
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
    
    // 跳转到上传页面
    goToUploadPage() {
      if (this.uploadPageUrl) {
        window.open(this.uploadPageUrl, '_blank');
      } else {
        this.$message.warning('Upload page URL is not configured');
      }
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
  margin-bottom: 16px;
}

.upload-action {
  margin-top: 16px;
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
}
</style>
