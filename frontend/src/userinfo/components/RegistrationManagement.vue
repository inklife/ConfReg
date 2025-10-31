<template>
  <div class="registration-management">
    <div class="page-header">
      <h2>Registration Management</h2>
      <p>Manage your conference registrations and view detailed information</p>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="3" animated />
    </div>

    <!-- Registration list -->
    <div v-else class="registration-content">
      <!-- Notice Banner -->
      <div v-if="announcement.enabled && announcement.message" class="notice-banner">
        <i class="el-icon-info"></i>
        <p>{{ announcement.message }}</p>
      </div>

      <!-- No registrations state -->
      <div v-if="registrations.length === 0" class="empty-state">
        <div class="empty-icon">
          <i class="el-icon-document-add"></i>
        </div>
        <h3>No Registrations Found</h3>
        <p>You haven't submitted any registrations yet. Start by creating your first registration.</p>
        <el-button 
          type="primary" 
          icon="el-icon-plus" 
          size="large"
          @click="goToRegistration">
          Create New Registration
        </el-button>
      </div>

      <!-- Registration list -->
      <div v-else class="registration-list">
        <!-- Table Header -->
        <div class="registration-header">
          <div class="status-column">Status</div>
          <div class="paper-id-column">Paper ID</div>
          <div class="name-column">Attendee Name</div>
          <div class="type-column">Type</div>
          <div class="date-column">Submitted</div>
          <div class="amount-column">Amount</div>
          <div class="actions-column"></div>
        </div>
        
        <!-- Table Body -->
        <div 
          v-for="registration in registrations" 
          :key="registration.id"
          class="registration-item">
          <div class="registration-row" @click="viewRegistration(registration)">
            <!-- Status Badge -->
            <div class="status-column">
              <div class="status-badge" :class="getStatusClass(registration)">
                <i :class="getStatusIcon(registration)"></i>
                {{ getStatusText(registration) }}
              </div>
            </div>
            
            <!-- Paper ID -->
            <div class="paper-id-column">
              <span class="cell-content">{{ (registration.registration_data && registration.registration_data.paper_id) || registration.paper_id || 'N/A' }}</span>
            </div>
            
            <!-- Attendee Name -->
            <div class="name-column">
              <span class="cell-content">{{ registration.attendee_name || 'Registration' }}</span>
            </div>
            
            <!-- Registration Type -->
            <div class="type-column">
              <span class="cell-content">{{ getRegistrationCategoryText(registration) }}</span>
            </div>
            
            <!-- Submitted Date -->
            <div class="date-column">
              <span class="cell-content">{{ formatDate(registration.created_at) }}</span>
            </div>
            
            <!-- Payment Amount -->
            <div class="amount-column">
              <span class="cell-content amount-text">{{ formatAmount(registration) }}</span>
            </div>
            
            <!-- Actions -->
            <div class="actions-column">
              <el-dropdown @command="handleAction" trigger="click" @click.native.stop>
                <span class="el-dropdown-link">
                  <i class="el-icon-more"></i>
                </span>
                <el-dropdown-menu slot="dropdown">
                  <el-dropdown-item :command="{action: 'view', registration}">
                    <i class="el-icon-view"></i> View Details
                  </el-dropdown-item>
                  <el-dropdown-item 
                    v-if="registration.status === 'approved'"
                    :command="{action: 'download', registration}">
                    <i class="el-icon-download"></i> Download Receipt
                  </el-dropdown-item>
                  <el-dropdown-item 
                    v-if="canEdit(registration)"
                    :command="{action: 'edit', registration}">
                    <i class="el-icon-edit"></i> Edit Registration
                  </el-dropdown-item>
                </el-dropdown-menu>
              </el-dropdown>
            </div>
          </div>
          
          <!-- Rejection Reason Row (显示在被拒绝的项目下方) -->
          <div 
            v-if="registration.status === 'rejected' && registration.review_notes" 
            class="rejection-reason-row">
            <div class="rejection-reason-content">
              <i class="el-icon-warning"></i>
              <span class="rejection-label">Rejection Reason:</span>
              <span class="rejection-text">{{ truncateText(registration.review_notes, 100) }}</span>
            </div>
          </div>
        </div>

        <!-- Add new registration button -->
        <div class="add-registration">
          <el-button 
            type="primary" 
            icon="el-icon-plus" 
            @click="goToRegistration">
            Add New Registration
          </el-button>
        </div>
      </div>
    </div>

    <!-- Registration detail dialog -->
    <el-dialog
      :title="selectedRegistration ? 'Registration Details' : ''"
      :visible.sync="detailDialogVisible"
      width="60%"
      :before-close="handleCloseDetail">
      
      <div v-if="selectedRegistration" class="registration-detail">
        <!-- 详细信息内容 -->
        <div class="detail-section">
          <h4>Basic Information</h4>
          <el-row :gutter="20">
            <el-col :span="12">
              <div class="detail-item">
                <label>Attendee Name:</label>
                <span>{{ selectedRegistration.attendee_name }}</span>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="detail-item">
                <label>Email:</label>
                <span>{{ selectedRegistration.attendee_email }}</span>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="detail-item">
                <label>Registration Type:</label>
                <span>{{ selectedRegistration.registration_type }}</span>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="detail-item">
                <label>Status:</label>
                <el-tag :type="getStatusTagType(selectedRegistration)">
                  {{ getStatusText(selectedRegistration) }}
                </el-tag>
              </div>
            </el-col>
          </el-row>
        </div>

        <!-- Rejection Reason Section -->
        <div class="detail-section rejection-section" v-if="selectedRegistration.status === 'rejected' && selectedRegistration.review_notes">
          <h4>Rejection Reason</h4>
          <el-alert
            :title="'Administrator Notes'"
            type="error"
            :closable="false"
            show-icon>
            <div class="rejection-content">
              {{ selectedRegistration.review_notes }}
            </div>
            <div class="rejection-time" v-if="selectedRegistration.review_time">
              <i class="el-icon-time"></i>
              Reviewed on: {{ formatDate(selectedRegistration.review_time) }}
            </div>
          </el-alert>
        </div>

        <div class="detail-section" v-if="selectedRegistration.payment_amount">
          <h4>Payment Information</h4>
          <el-row :gutter="20">
            <el-col :span="12">
              <div class="detail-item">
                <label>Amount:</label>
                <span>${{ selectedRegistration.payment_amount }}</span>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="detail-item">
                <label>Payment Status:</label>
                <el-tag :type="selectedRegistration.payment_status === 'completed' ? 'success' : 'warning'">
                  {{ selectedRegistration.payment_status || 'Pending' }}
                </el-tag>
              </div>
            </el-col>
          </el-row>
        </div>
      </div>
      
      <span slot="footer" class="dialog-footer">
        <el-button @click="detailDialogVisible = false">Close</el-button>
        <el-button 
          v-if="selectedRegistration && selectedRegistration.status === 'approved'"
          type="primary" 
          @click="downloadReceipt(selectedRegistration)">
          Download Receipt
        </el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { userService } from '../../_services';
import { sseService } from '../../_services/sse.service.js';

export default {
  name: 'RegistrationManagement',
  data() {
    return {
      loading: true,
      registrations: [],
      selectedRegistration: null,
      detailDialogVisible: false,
      pendingDownloadTasks: {}, // 存储待处理的下载任务
      currentUserId: null,
      announcement: {
        enabled: false,
        message: ''
      }
    };
  },
  async mounted() {
    await this.loadAnnouncement();
    await this.loadRegistrations();
    this.initializeSSE();
  },
  beforeDestroy() {
    this.cleanupSSE();
  },
  methods: {
    // 初始化 SSE 连接
    initializeSSE() {
      console.log('📡 RegistrationManagement: 初始化SSE连接');
      
      // 获取当前用户ID
      if (this.$store && this.$store.state.account && this.$store.state.account.user) {
        this.currentUserId = this.$store.state.account.user.id;
      }
      
      // 注册到全局SSE管理器，提供回调函数和 taskChecker 方法
      if (this.$globalSSEManager) {
        const componentId = `RegistrationManagement_${this.$route.path}`;
        this.$globalSSEManager.registerComponent(
          componentId,
          // callback: 处理 SSE 事件的回调函数
          (data) => {
            console.log('📄 RegistrationManagement: 通过全局管理器收到事件:', data);
            if (data.type === 'pdf_completed') {
              this.handleSSECompleted(data);
            } else if (data.type === 'pdf_failed') {
              this.handleSSEFailed(data);
            }
          },
          // taskChecker: 检查任务是否属于本组件
          (taskId) => {
            const hasTask = !!this.pendingDownloadTasks[taskId];
            console.log(`🔍 RegistrationManagement: 检查任务 ${taskId} - ${hasTask ? '属于我' : '不属于我'}`);
            return hasTask;
          }
        );
        console.log('📡 RegistrationManagement: 已注册到全局SSE管理器:', componentId);
      }
      
      // 监听 SSE 事件（保留直接监听作为备用）
      sseService.on('pdf_completed', this.handleSSECompleted);
      sseService.on('pdf_failed', this.handleSSEFailed);
    },
    
    // 清理 SSE 连接
    cleanupSSE() {
      console.log('📡 RegistrationManagement: 清理SSE连接');
      
      // 从全局SSE管理器注销
      if (this.$globalSSEManager) {
        const componentId = `RegistrationManagement_${this.$route.path}`;
        this.$globalSSEManager.unregisterComponent(componentId);
      }
      
      // 移除事件监听
      sseService.off('pdf_completed', this.handleSSECompleted);
      sseService.off('pdf_failed', this.handleSSEFailed);
    },
    
    // 处理 SSE 完成事件
    handleSSECompleted(data) {
      console.log('📄 RegistrationManagement: 收到PDF完成通知:', data);
      const { taskId, documentType } = data;
      
      // 检查是否是我们的任务
      if (!this.pendingDownloadTasks[taskId]) {
        console.log('📄 RegistrationManagement: 不是本组件的任务，忽略');
        return;
      }
      
      const taskInfo = this.pendingDownloadTasks[taskId];
      
      this.$notify({
        title: 'Receipt Ready',
        message: 'Your receipt is ready and will download automatically!',
        type: 'success',
        duration: 3000
      });
      
      // 自动下载
      setTimeout(() => {
        this.downloadGeneratedReceipt(taskId, taskInfo.registration);
      }, 1000);
    },
    
    // 处理 SSE 失败事件
    handleSSEFailed(data) {
      console.log('❌ RegistrationManagement: 收到PDF失败通知:', data);
      const { taskId, error } = data;
      
      if (!this.pendingDownloadTasks[taskId]) {
        return;
      }
      
      this.$message({
        message: `Failed to generate receipt: ${error || 'Unknown error'}`,
        type: 'error'
      });
      
      // 清理任务
      delete this.pendingDownloadTasks[taskId];
    },
    
    async loadAnnouncement() {
      try {
        // 获取公告信息
        const response = await fetch('/api/config/announcement', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            this.announcement = {
              enabled: result.data.enabled || false,
              message: result.data.message || ''
            };
          }
        }
      } catch (error) {
        console.error('Failed to load announcement:', error);
        // 静默失败，不显示错误消息
        this.announcement = {
          enabled: false,
          message: ''
        };
      }
    },
    
    async loadRegistrations() {
      try {
        this.loading = true;
        
        // 使用新的API获取所有用户注册记录
        const response = await userService.getAllUserRegistrations();
        
        if (response && response.data) {
          this.registrations = response.data;
        } else {
          this.registrations = [];
        }
        
        console.log('Loaded registrations:', this.registrations);
        
      } catch (error) {
        console.error('Failed to load registrations:', error);
        this.$message({
          message: 'Failed to load registrations',
          type: 'error'
        });
        this.registrations = [];
      } finally {
        this.loading = false;
      }
    },
    
    getStatusClass(registration) {
      // 如果是对象，检查 is_refunded 字段
      if (typeof registration === 'object' && registration !== null) {
        if (registration.is_refunded === 1 || registration.is_refunded === true) {
          return { 'status-refunded': true };
        }
        const status = registration.status;
        return {
          'status-approved': status === 'approved',
          'status-pending': status === 'pending',
          'status-rejected': status === 'rejected'
        };
      }
      // 向后兼容：如果传入的是字符串
      const status = registration;
      return {
        'status-approved': status === 'approved',
        'status-pending': status === 'pending',
        'status-rejected': status === 'rejected'
      };
    },
    
    getStatusIcon(registration) {
      // 如果是对象，检查 is_refunded 字段
      if (typeof registration === 'object' && registration !== null) {
        if (registration.is_refunded === 1 || registration.is_refunded === true) {
          return 'el-icon-refresh-left';
        }
        const status = registration.status;
        const icons = {
          'approved': 'el-icon-check',
          'pending': 'el-icon-time',
          'rejected': 'el-icon-close'
        };
        return icons[status] || 'el-icon-question';
      }
      // 向后兼容：如果传入的是字符串
      const status = registration;
      const icons = {
        'approved': 'el-icon-check',
        'pending': 'el-icon-time',
        'rejected': 'el-icon-close'
      };
      return icons[status] || 'el-icon-question';
    },
    
    getStatusText(registration) {
      // 如果是对象，检查 is_refunded 字段
      if (typeof registration === 'object' && registration !== null) {
        if (registration.is_refunded === 1 || registration.is_refunded === true) {
          return 'Refunded';
        }
        const status = registration.status;
        const texts = {
          'approved': 'Approved',
          'pending': 'Pending Review',
          'rejected': 'Rejected'
        };
        return texts[status] || 'Unknown';
      }
      // 向后兼容：如果传入的是字符串
      const status = registration;
      const texts = {
        'approved': 'Approved',
        'pending': 'Pending Review',
        'rejected': 'Rejected'
      };
      return texts[status] || 'Unknown';
    },
    
    getStatusTagType(registration) {
      // 如果是对象，检查 is_refunded 字段
      if (typeof registration === 'object' && registration !== null) {
        if (registration.is_refunded === 1 || registration.is_refunded === true) {
          return 'info';
        }
        const status = registration.status;
        const types = {
          'approved': 'success',
          'pending': 'warning', 
          'rejected': 'danger'
        };
        return types[status] || '';
      }
      // 向后兼容：如果传入的是字符串
      const status = registration;
      const types = {
        'approved': 'success',
        'pending': 'warning', 
        'rejected': 'danger'
      };
      return types[status] || '';
    },
    
    canEdit(registration) {
      // 只有待审核的注册可以编辑
      return registration.status === 'pending';
    },
    
    formatDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    },
    
    formatAmount(registration) {
      // 检查支付方式，如果是国内支付（非 international），优先显示人民币
      const paymentMethod = registration.payment_method || 
                           (registration.registration_data && registration.registration_data.payment_method);
      
      // 获取金额数据
      const regData = registration.registration_data || {};
      const totalAmountRmb = regData.total_amount_rmb;
      const totalAmountUsd = regData.total_amount_usd;
      const paymentAmount = registration.payment_amount;
      
      // 如果支付方式不是 international，优先显示人民币
      if (paymentMethod && paymentMethod !== 'international') {
        if (totalAmountRmb) {
          return `¥${totalAmountRmb}`;
        }
      }
      
      // 否则显示美元
      if (totalAmountUsd) {
        return `$${totalAmountUsd}`;
      }
      
      // 最后使用 payment_amount 作为后备
      if (paymentAmount) {
        return `$${paymentAmount}`;
      }
      
      return '$0';
    },
    
    getRegistrationCategoryText(registration) {
      // 从 registration_data 中获取 registration_category
      const regData = registration.registration_data || {};
      const category = regData.registration_category;
      
      // 如果是 undefined 或无效值，显示 "Not selected"
      if (!category || category === 'undefined') {
        return 'Not selected';
      }
      
      // 根据类别映射为友好的显示文本
      if (category === 'full') {
        return 'Full Registration';
      } else if (category === 'attendee' || category === 'student') {
        return 'Attendee自尊心的地方小吃      Registration';
      }
      
      // 其他情况保持原值
      return category;
    },
    
    viewRegistration(registration) {
      // 跳转到详情页面，无论什么状态都跳转到 Step5 页面查看
      // 如果注册有真实的ID，跳转到对应的详情页面
      if (registration.id && !registration.id.toString().startsWith('pending-')) {
        this.$router.push(`/conference/${registration.id}`);
      } else {
        // 对于待审核或被拒绝的注册，跳转到step5查看状态
        this.$router.push('/conference/step5');
      }
    },
    
    handleAction(command) {
      const { action, registration } = command;
      
      switch (action) {
        case 'view':
          this.viewRegistration(registration);
          break;
        case 'download':
          this.downloadReceipt(registration);
          break;
        case 'edit':
          this.editRegistration(registration);
          break;
      }
    },
    
    async downloadReceipt(registration) {
      try {
        this.$message({
          message: 'Preparing receipt download...',
          type: 'info'
        });
        
        // 使用下载管理器和异步任务系统
        const axios = (await import('axios')).default;
        
        // 首先检查是否已有待处理的任务
        try {
          const statusResponse = await axios.get('/api/submissions/pending_tasks', {
            withCredentials: true
          });
          
          if (statusResponse.data && statusResponse.data.success && statusResponse.data.data.tasks) {
            const receiptTask = statusResponse.data.data.tasks.find(task => 
              task.type === 'receipt' && 
              task.registrationId === registration.id &&
              (task.status === 'generated' || task.status === 'processing')
            );
            
            if (receiptTask) {
              if (receiptTask.status === 'generated') {
                // 任务已生成，直接下载
                await this.downloadGeneratedReceipt(receiptTask.taskId, registration);
                return;
              } else if (receiptTask.status === 'processing') {
                this.$message.info('Receipt is being generated. Please wait...');
                return;
              }
            }
          }
        } catch (error) {
          console.warn('Failed to check pending tasks:', error);
        }
        
        // 启动新的异步生成任务
        const generateResponse = await axios.post('/api/submissions/generate_receipt', {
          registrationId: registration.id,
          marginMode: 'standard' // 可以根据需要调整
        }, {
          withCredentials: true
        });
        
        if (!generateResponse.data.success) {
          throw new Error(generateResponse.data.message || 'Failed to start receipt generation');
        }
        
        const taskId = generateResponse.data.taskId;
        
        // 添加到待处理任务列表
        this.pendingDownloadTasks[taskId] = {
          registration: registration,
          type: 'receipt',
          startTime: Date.now()
        };
        
        this.$message.success('Receipt generation started! You will be notified when it\'s ready. You can also check progress in Document Management.');
        
        // 添加到全局 store 以便在其他页面也能看到进度
        if (this.$store && this.$store.state.account && this.$store.state.account.user) {
          this.$store.dispatch('tasks/addDownloadTask', {
            taskId: taskId,
            type: 'receipt',
            userId: this.$store.state.account.user.id,
            registrationId: registration.id
          });
        }
        
      } catch (error) {
        console.error('Download receipt error:', error);
        
        // 如果异步接口失败，尝试使用同步备用接口
        if (error.response && error.response.status === 404) {
          this.$message.error('No approved registration found for receipt generation.');
        } else {
          this.$message.error(`Failed to download receipt: ${error.message || 'Unknown error'}`);
        }
      }
    },
    
    async downloadGeneratedReceipt(taskId, registration) {
      const downloadManager = this.$getDownloadManager();
      if (!downloadManager) {
        console.error('Download manager not initialized');
        this.$message.error('Download manager not available');
        return;
      }
      
      const downloadKey = downloadManager.generateDownloadKey('registration', taskId);
      
      await downloadManager.downloadPDF({
        taskId,
        type: 'receipt',
        downloadKey,
        filename: `ICPADS2025_Receipt_${registration.id}.pdf`,
        context: this,
        onSuccess: (taskId) => {
          this.$message.success('Receipt downloaded successfully!');
          
          // 清理待处理任务
          delete this.pendingDownloadTasks[taskId];
          
          // 标记任务为已下载
          if (this.$store) {
            this.$store.dispatch('tasks/downloadTask', { taskId });
          }
          
          // 通知全局SSE管理器下载已完成
          if (this.$globalSSEManager) {
            this.$globalSSEManager.notifyDownloadCompleted(taskId, 'receipt');
          }
        },
        onError: (error) => {
          console.error('Error downloading receipt:', error);
          this.$message.error('Failed to download receipt');
          
          // 清理待处理任务
          delete this.pendingDownloadTasks[taskId];
        }
      });
    },
    
    editRegistration(registration) {
      // 跳转到编辑页面，带上注册ID
      if (registration.id) {
        this.$router.push(`/conference/${registration.id}/step1`);
      } else {
        this.$message.error('Invalid registration ID');
      }
    },
    
    goToRegistration() {
      // 跳转到注册页面
      this.$router.push('/conference/new');
    },
    
    handleCloseDetail() {
      this.detailDialogVisible = false;
      this.selectedRegistration = null;
    },
    
    truncateText(text, maxLength) {
      if (!text) return '';
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength) + '...';
    }
  }
};
</script>

<style scoped>
.registration-management {
  padding: 24px;
}

.page-header {
  margin-bottom: 32px;
}

.page-header h2 {
  color: #303133;
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.page-header p {
  color: #909399;
  font-size: 16px;
  margin: 0;
}

.loading-container {
  padding: 40px 20px;
}

.registration-content {
  min-height: 400px;
}

/* Notice Banner */
.notice-banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 16px 20px;
  border-radius: 8px;
  margin-bottom: 24px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.25);
}

.notice-banner i {
  font-size: 20px;
  margin-top: 2px;
  flex-shrink: 0;
}

.notice-banner p {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: white;
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.empty-icon {
  font-size: 64px;
  color: #C0C4CC;
  margin-bottom: 24px;
}

.empty-state h3 {
  color: #303133;
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 12px 0;
}

.empty-state p {
  color: #909399;
  font-size: 14px;
  margin: 0 0 24px 0;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

/* Registration list */
.registration-list {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* Table Header */
.registration-header {
  display: flex;
  align-items: center;
  padding: 14px 20px;
  background: #f5f7fa;
  border-bottom: 2px solid #E4E7ED;
  gap: 16px;
  font-weight: 600;
  font-size: 12px;
  color: #606266;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.registration-item {
  border-bottom: 1px solid #E4E7ED;
}

.registration-item:last-child {
  border-bottom: none;
}

.registration-row {
  display: flex;
  align-items: center;
  padding: 18px 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  gap: 16px;
}

.registration-row:hover {
  background: #f5f7fa;
}

/* Columns - 表头和行使用相同的宽度确保对齐 */
.status-column {
  flex: 0 0 150px;
}

.paper-id-column {
  flex: 0 0 90px;
}

.name-column {
  flex: 1 1 180px;
  min-width: 150px;
}

.type-column {
  flex: 1 1 200px;
  min-width: 160px;
}

.date-column {
  flex: 0 0 120px;
}

.amount-column {
  flex: 0 0 100px;
  text-align: right;
  padding-right: 8px;
}

.actions-column {
  flex: 0 0 60px;
  text-align: center;
}

/* 表头特定样式 */
.registration-header .amount-column {
  text-align: right;
  padding-right: 8px;
}

.registration-header .actions-column {
  text-align: center;
}

/* Cell content */
.cell-content {
  color: #303133;
  font-size: 14px;
  font-weight: 400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.amount-text {
  font-weight: 500;
  color: #409EFF;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.status-approved {
  background: #f0f9ff;
  color: #67C23A;
  border: 1px solid #b3e5fc;
}

.status-pending {
  background: #fffbf0;
  color: #E6A23C;
  border: 1px solid #ffd54f;
}

.status-rejected {
  background: #fef2f2;
  color: #F56C6C;
  border: 1px solid #ffcdd2;
}

.status-refunded {
  background: #f4f4f5;
  color: #909399;
  border: 1px solid #d3d4d6;
}

.el-dropdown-link {
  color: #C0C4CC;
  font-size: 18px;
  cursor: pointer;
  transition: color 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
}

.el-dropdown-link:hover {
  color: #409EFF;
}

.add-registration {
  text-align: center;
  padding-top: 24px;
  padding-bottom: 32px;
  border-top: 1px solid #E4E7ED;
}

/* Detail dialog */
.registration-detail {
  padding: 20px 0;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section h4 {
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #E4E7ED;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
}

.detail-item label {
  color: #909399;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
}

.detail-item span {
  color: #303133;
  font-size: 14px;
}

/* Rejection section */
.rejection-section {
  background: #fef0f0;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #fde2e2;
}

.rejection-section h4 {
  color: #f56c6c;
  margin-bottom: 16px;
}

.rejection-content {
  color: #303133;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin-bottom: 12px;
}

.rejection-time {
  color: #909399;
  font-size: 12px;
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.rejection-time i {
  font-size: 14px;
}

/* Rejection reason row in list */
.rejection-reason-row {
  background: #fef0f0;
  padding: 12px 20px;
  margin-top: -1px;
  border-top: 1px solid #fde2e2;
  border-radius: 0 0 8px 8px;
}

.rejection-reason-content {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
}

.rejection-reason-content i {
  color: #F56C6C;
  font-size: 16px;
  margin-top: 2px;
  flex-shrink: 0;
}

.rejection-label {
  color: #F56C6C;
  font-weight: 600;
  flex-shrink: 0;
}

.rejection-text {
  color: #606266;
  line-height: 1.5;
  flex: 1;
}

/* Responsive design */
@media (max-width: 1200px) {
  .registration-row {
    gap: 12px;
  }
  
  .status-column {
    flex: 0 0 120px;
  }
  
  .type-column {
    flex: 0 0 120px;
  }
}

@media (max-width: 768px) {
  .registration-management {
    padding: 16px;
  }
  
  .page-header {
    margin-bottom: 24px;
  }
  
  .page-header h2 {
    font-size: 24px;
  }
  
  .page-header p {
    font-size: 14px;
  }
  
  .empty-state {
    padding: 60px 16px;
  }
  
  .empty-icon {
    font-size: 48px;
  }
  
  .empty-state h3 {
    font-size: 18px;
  }
  
  /* 隐藏表头 */
  .registration-header {
    display: none;
  }
  
  .registration-row {
    flex-wrap: wrap;
    padding: 16px;
    gap: 12px;
  }
  
  .registration-row > div {
    position: relative;
    padding-left: 100px;
    min-height: 24px;
  }
  
  .registration-row > div::before {
    content: attr(data-label);
    position: absolute;
    left: 0;
    font-weight: 600;
    color: #909399;
    font-size: 12px;
  }
  
  .status-column,
  .paper-id-column,
  .name-column,
  .type-column,
  .date-column,
  .amount-column {
    flex: 0 0 100%;
  }
  
  .status-column {
    padding-left: 0;
  }
  
  .status-column::before {
    display: none;
  }
  
  .actions-column {
    flex: 0 0 100%;
    text-align: center;
    margin-top: 8px;
  }
  
  .cell-content {
    font-size: 13px;
  }
}
</style>