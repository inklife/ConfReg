<template>
  <div class="user-dashboard">
    <!-- 顶部导航栏 
    <div class="dashboard-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="dashboard-title">
            <i class="el-icon-user"></i>
            User Center
          </h1>
          <p class="dashboard-subtitle">Manage your registration information, request refunds and download related documents</p>
        </div>
        <div class="header-right">
          <el-button 
            type="primary" 
            @click="logout" 
            icon="el-icon-switch-button">
            Logout
          </el-button>
        </div>
      </div>
    </div>
    -->
    <!-- 主内容区域 -->
    <div class="dashboard-main">
      <!-- 侧边栏 -->
      <aside class="dashboard-sidebar">
        <el-menu
          :default-active="activeMenu"
          @select="handleMenuSelect"
          class="sidebar-menu"
          :collapse="false">
          
          <el-menu-item index="overview">
            <i class="el-icon-pie-chart"></i>
            <span slot="title">Overview</span>
          </el-menu-item>
          
          <el-menu-item index="profile">
            <i class="el-icon-user"></i>
            <span slot="title">Profile</span>
          </el-menu-item>
          
          <el-menu-item index="attendee">
            <i class="el-icon-edit-outline"></i>
            <span slot="title">Attendee Transfer</span>
          </el-menu-item>
          
          <el-menu-item index="refund">
            <i class="el-icon-money"></i>
            <span slot="title">Refund Request</span>
          </el-menu-item>
          
          <el-menu-item index="invoice">
            <i class="el-icon-document-add"></i>
            <span slot="title">Invoice Request</span>
          </el-menu-item>
          
          <el-menu-item index="documents">
            <i class="el-icon-folder-opened"></i>
            <span slot="title">Document Download</span>
          </el-menu-item>
        </el-menu>
      </aside>

      <!-- 内容区域 -->
      <main class="dashboard-content">
        <!-- 概览信息 -->
        <div v-if="activeMenu === 'overview'" class="overview-section">
          <div class="stats-section">
            <el-row :gutter="20" class="stats-row">
              <el-col :span="5">
                <el-card class="stat-card">
                  <el-statistic 
                    title="Approved Registrations" 
                    :value="registrationStats.approved">
                    <template slot="prefix">
                      <i class="el-icon-check" style="color: #67C23A"></i>
                    </template>
                  </el-statistic>
                </el-card>
              </el-col>
              <el-col :span="5">
                <el-card class="stat-card">
                  <el-statistic 
                    title="Pending Applications" 
                    :value="registrationStats.pending">
                    <template slot="prefix">
                      <i class="el-icon-time" style="color: #E6A23C"></i>
                    </template>
                  </el-statistic>
                </el-card>
              </el-col>
              <el-col :span="5">
                <el-card class="stat-card">
                  <el-statistic 
                    title="Transfer Requests" 
                    :value="registrationStats.transfers">
                    <template slot="prefix">
                      <i class="el-icon-edit" style="color: #409EFF"></i>
                    </template>
                  </el-statistic>
                </el-card>
              </el-col>
              <el-col :span="5">
                <el-card class="stat-card">
                  <el-statistic 
                    title="Refund Requests" 
                    :value="registrationStats.refunds">
                    <template slot="prefix">
                      <i class="el-icon-money" style="color: #F56C6C"></i>
                    </template>
                  </el-statistic>
                </el-card>
              </el-col>
              <el-col :span="4">
                <el-card class="stat-card">
                  <el-statistic 
                    title="Invoice Requests" 
                    :value="registrationStats.invoices">
                    <template slot="prefix">
                      <i class="el-icon-document-add" style="color: #909399"></i>
                    </template>
                  </el-statistic>
                </el-card>
              </el-col>
            </el-row>
          </div>

          <div class="quick-actions">
            <h3>Quick Actions</h3>
            
            <!-- 注册状态和继续注册区域 -->
            <div class="registration-status-section">
              <el-row :gutter="20">
                <!-- 当没有任何注册记录时，继续注册卡片在左侧 -->
                <el-col :span="12" v-if="registrationStats.approved === 0 && registrationStats.pending === 0">
                  <el-card class="continue-registration-card" shadow="hover" @click.native="goToConferenceRegistration">
                    <div class="continue-content">
                      <div class="continue-icon">
                        <i class="el-icon-plus"></i>
                      </div>
                      <div class="continue-text">
                        <h4>Check My Registration</h4>
                        <p>Begin your conference registration process</p>
                      </div>
                      <div class="continue-arrow">
                        <i class="el-icon-arrow-right"></i>
                      </div>
                    </div>
                  </el-card>
                </el-col>
                <!-- 当没有任何注册记录时，状态信息卡片在右侧 -->
                <el-col :span="12" v-if="registrationStats.approved === 0 && registrationStats.pending === 0">
                  <el-card 
                    class="status-info-card" 
                    shadow="never">
                    <div class="status-content">
                      <div class="status-icon">
                        <i class="el-icon-info" style="color: #909399"></i>
                      </div>
                      <div class="status-text">
                        <h4>No Registrations</h4>
                        <p>You haven't submitted any registration yet</p>
                      </div>
                    </div>
                  </el-card>
                </el-col>
                
                <!-- 当有注册记录时，保持原有顺序：左侧状态信息，右侧继续注册 -->
                <el-col :span="12" v-if="registrationStats.approved > 0 || registrationStats.pending > 0">
                  <el-card 
                    class="status-info-card" 
                    shadow="never"
                    :class="{ 'clickable': registrationStats.approved > 0 }"
                    @click.native="handleStatusCardClick">
                    <div class="status-content">
                      <div class="status-icon">
                        <i class="el-icon-warning" v-if="registrationStats.pending > 0" style="color: #E6A23C"></i>
                        <i class="el-icon-success" v-else style="color: #67C23A"></i>
                      </div>
                      <div class="status-text">
                        <!-- 有待审核的注册 -->
                        <h4 v-if="registrationStats.pending > 0">{{ registrationStats.pending }} Pending Registration{{ registrationStats.pending > 1 ? 's' : '' }}</h4>
                        <!-- 有已批准的注册 -->
                        <h4 v-else>{{ registrationStats.approved }} Approved Registration{{ registrationStats.approved > 1 ? 's' : '' }}</h4>
                        
                        <!-- 对应的描述信息 -->
                        <p v-if="registrationStats.pending > 0">Your registration is under review</p>
                        <p v-else-if="registrationStats.approved > 0">Click to download receipt • Approved registrations</p>
                      </div>
                      <!-- 下载图标提示 - 只在有已批准注册时显示
                      <div v-if="registrationStats.approved > 0" class="download-indicator">
                        <i class="el-icon-download" style="color: #67C23A; font-size: 20px;"></i>
                      </div> -->
                    </div>
                  </el-card>
                </el-col>
                <el-col :span="12" v-if="registrationStats.approved > 0 || registrationStats.pending > 0">
                  <el-card class="continue-registration-card" shadow="hover" @click.native="goToConferenceRegistration">
                    <div class="continue-content">
                      <div class="continue-icon">
                        <i class="el-icon-plus"></i>
                      </div>
                      <div class="continue-text">
                        <h4>Check My Registration</h4>
                        <p v-if="registrationStats.pending > 0">Check your pending registration status</p>
                        <p v-else>View or add another attendee to your registration</p>
                      </div>
                      <div class="continue-arrow">
                        <i class="el-icon-arrow-right"></i>
                      </div>
                    </div>
                  </el-card>
                </el-col>
              </el-row>
            </div>

            <!-- 原有的四个快捷操作 -->
            <el-row :gutter="20">
              <el-col :span="6">
                <el-card class="action-card" shadow="hover" @click.native="activeMenu = 'attendee'">
                  <div class="action-icon">
                    <i class="el-icon-edit-outline"></i>
                  </div>
                  <h4>Request Attendee Transfer</h4>
                  <p>Modify the registered attendee information</p>
                </el-card>
              </el-col>
              <el-col :span="6">
                <el-card class="action-card" shadow="hover" @click.native="activeMenu = 'refund'">
                  <div class="action-icon">
                    <i class="el-icon-money"></i>
                  </div>
                  <h4>Request Refund</h4>
                  <p>Apply for refund for approved registrations</p>
                </el-card>
              </el-col>
              <el-col :span="6">
                <el-card class="action-card" shadow="hover" @click.native="activeMenu = 'invoice'">
                  <div class="action-icon">
                    <i class="el-icon-document-add"></i>
                  </div>
                  <h4>Request Invoice</h4>
                  <p>Apply for invoice for approved registrations</p>
                </el-card>
              </el-col>
              <el-col :span="6">
                <el-card class="action-card" shadow="hover" @click.native="activeMenu = 'documents'">
                  <div class="action-icon">
                    <i class="el-icon-download"></i>
                  </div>
                  <h4>Download Documents</h4>
                  <p>Download confirmation letters, receipts and other documents</p>
                </el-card>
              </el-col>
            </el-row>
          </div>
        </div>

        <!-- 动态加载的组件内容 -->
        <component 
          v-if="activeMenu !== 'overview'" 
          :is="currentComponent"
          @update="handleComponentUpdate">
        </component>
      </main>
    </div>
  </div>
</template>

<script>
import { userService } from '../_services';
import { sseService } from '../_services/sse.service.js';
import ProfileManagement from './components/ProfileManagement.vue';
import AttendeeManagement from './components/AttendeeManagement.vue';
import RefundManagement from './components/RefundManagement.vue';
import DocumentManagement from './components/DocumentManagement.vue';
import InvoiceManagement from './components/InvoiceManagement.vue';

export default {
  name: 'UserDashboard',
  components: {
    ProfileManagement,
    AttendeeManagement,
    RefundManagement,
    DocumentManagement,
    InvoiceManagement
  },
  data() {
    return {
      activeMenu: 'overview',
      currentUser: null,
      avatarUrl: '',
      registrationStats: {
        approved: 0,
        pending: 0,
        transfers: 0,
        refunds: 0,
        invoices: 0
      },
      // 当前处理的任务
      currentTaskId: null,
      isGenerating: false,
      // SSE回调引用，用于正确清理
      onProgressCallback: null,
      onCompletedCallback: null,
      onFailedCallback: null
    };
  },
  computed: {
    currentComponent() {
      const componentMap = {
        'profile': 'ProfileManagement',
        'attendee': 'AttendeeManagement',
        'refund': 'RefundManagement',
        'documents': 'DocumentManagement',
        'invoice': 'InvoiceManagement'
      };
      return componentMap[this.activeMenu];
    }
  },
  watch: {
    // 监听用户 receipt 任务状态变化
    '$store.state.tasks.userTasks': {
      handler(newUserTasks) {
        if (!this.currentUser || !newUserTasks) return;
        
        const userTasks = newUserTasks[this.currentUser.id];
        if (!userTasks) return;
        
        const receiptTask = userTasks.receipt;
        if (!receiptTask) {
          // 如果没有 receipt 任务了，重置状态
          if (this.isGenerating) {
            this.isGenerating = false;
            this.currentTaskId = null;
          }
          return;
        }
        
        // 同步任务状态
        if (receiptTask.status === 'processing' && !this.isGenerating) {
          this.isGenerating = true;
          this.currentTaskId = receiptTask.taskId;
        } else if (receiptTask.status !== 'processing' && this.isGenerating) {
          this.isGenerating = false;
          this.currentTaskId = null;
        }
      },
      deep: true
    }
  },
  async mounted() {
    await this.loadUserData();
    await this.loadRegistrationStats();
    
    // 从全局 store 同步现有任务状态
    this.syncExistingTasks();
    
    // 初始化SSE连接
    this.initSSE();
    
    // 从URL参数中获取初始页面
    const tab = this.$route.query.tab;
    if (tab && ['overview', 'profile', 'attendee', 'refund', 'documents', 'invoice'].includes(tab)) {
      this.activeMenu = tab;
    }
  },
  beforeDestroy() {
    // 清理SSE连接
    this.cleanup();
  },
  methods: {
    async loadUserData() {
      try {
        // 从store或localStorage获取当前用户信息
        const user = (this.$store && this.$store.state && this.$store.state.account && this.$store.state.account.user) || JSON.parse(localStorage.getItem('user') || '{}');
        this.currentUser = user;
        
        // 也可以从服务器获取最新用户信息
        const userProfile = await userService.getUserProfile();
        if (userProfile && userProfile.data) {
          this.currentUser = {
            ...this.currentUser,
            ...userProfile.data
          };
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      }
    },
    
    async loadRegistrationStats() {
      try {
        // 加载注册统计信息 - 已批准的注册
        const approvedRegistrations = await userService.getApprovedRegistrations();
        if (approvedRegistrations && approvedRegistrations.data) {
          this.registrationStats.approved = approvedRegistrations.data.length;
        }
        
        // 检查当前注册状态（包括待审核的）
        try {
          const registrationStatus = await userService.checkRegistrationStatus();
          console.log('Registration status check:', registrationStatus);
          
          if (registrationStatus && registrationStatus.success) {
            if (registrationStatus.has_submission && !registrationStatus.approved) {
              // 有提交但未批准，说明是待审核状态
              this.registrationStats.pending = 1;
            } else {
              this.registrationStats.pending = 0;
            }
          }
        } catch (error) {
          console.error('Failed to check registration status:', error);
          // 如果检查状态失败，尝试其他方式获取待审核状态
          const transferStatus = await userService.checkTransferStatus();
          if (transferStatus && transferStatus.data && transferStatus.data.pendingTransfer) {
            this.registrationStats.pending++;
          }
        }
        
        // 加载变更历史
        const transferHistory = await userService.getTransferHistory();
        if (transferHistory && transferHistory.data) {
          this.registrationStats.transfers = transferHistory.data.length;
        }
        
        // 加载退款历史
        const refundHistory = await userService.getRefundHistory();
        if (refundHistory && refundHistory.data) {
          this.registrationStats.refunds = refundHistory.data.length;
        }

        // 加载发票申请历史
        try {
          const { invoiceService } = await import('../_services/invoice.service.js');
          const invoiceHistory = await invoiceService.getMyRequests();
          if (invoiceHistory && invoiceHistory.requests) {
            this.registrationStats.invoices = invoiceHistory.requests.length;
          }
        } catch (error) {
          console.error('Failed to load invoice stats:', error);
        }
        
      } catch (error) {
        console.error('Failed to load registration stats:', error);
      }
    },
    
    handleMenuSelect(index) {
      this.activeMenu = index;
      
      // 更新URL参数
      const newQuery = { tab: index };
      
      // 只有在选择profile时保留subtab参数，其他情况下清除subtab
      if (index === 'profile' && this.$route.query.subtab) {
        newQuery.subtab = this.$route.query.subtab;
      }
      
      // 检查是否需要导航，避免重复导航错误
      const currentQuery = this.$route.query;
      const needsNavigation = currentQuery.tab !== index || 
        (index !== 'profile' && currentQuery.subtab) ||
        (index === 'profile' && currentQuery.subtab !== newQuery.subtab);
      
      if (needsNavigation) {
        this.$router.replace({
          query: newQuery
        }).catch(err => {
          // 忽略重复导航错误
          if (err.name !== 'NavigationDuplicated') {
            console.error('Navigation error:', err);
          }
        });
      }
    },
    
    handleComponentUpdate() {
      // 当子组件有数据更新时，重新加载统计信息
      this.loadRegistrationStats();
    },

    // 跳转到profile的特定子选项卡
    goToProfileTab(subtab) {
      this.activeMenu = 'profile';
      
      // 检查是否需要导航，避免重复导航错误
      const currentQuery = this.$route.query;
      const needsNavigation = currentQuery.tab !== 'profile' || currentQuery.subtab !== subtab;
      
      if (needsNavigation) {
        this.$router.replace({
          query: { 
            ...this.$route.query, 
            tab: 'profile',
            subtab: subtab 
          }
        }).catch(err => {
          // 忽略重复导航错误
          if (err.name !== 'NavigationDuplicated') {
            console.error('Navigation error:', err);
          }
        });
      }
    },

    // 同步全局 store 中的现有任务状态
    syncExistingTasks() {
      if (!this.$store || !this.currentUser) {
        return;
      }
      
      try {
        // 检查当前用户是否有 receipt 类型的任务在进行
        const existingReceiptTask = this.$store.getters['tasks/getUserTaskByType'](this.currentUser.id, 'receipt');
        
        if (existingReceiptTask) {
          console.log('发现现有的 receipt 任务:', existingReceiptTask);
          
          // 如果任务正在进行，恢复本地状态，但不声明任务所有权
          // 任务所有权应该只属于真正创建任务的组件实例
          if (existingReceiptTask.status === 'processing') {
            this.isGenerating = true;
            // 注意：这里不设置 currentTaskId，因为这个实例不是任务的真正所有者
            console.log('检测到现有 receipt 任务，但不声明所有权:', existingReceiptTask.taskId);
          }
        }
      } catch (error) {
        console.error('同步现有任务失败:', error);
      }
    },

    // 跳转到会议注册页面
    goToConferenceRegistration() {
      // 跳转到会议注册页面，根据实际路由进行调整
      this.$router.push('/conference/auto');
    },

    // 处理状态卡片点击事件
    async handleStatusCardClick() {
      // 只有当有已批准的注册时才允许下载
      if (this.registrationStats.approved > 0) {
        await this.downloadReceiptQuickAction();
      }
    },

    // Quick Action下载凭证 - 使用SSE推送机制
    async downloadReceiptQuickAction() {
      try {
        // 检查是否已经有任务在进行（更精确的检查）
        if (this.isGenerating && this.currentTaskId) {
          this.$message({
            message: 'Receipt generation is already in progress. Redirecting to Document Download section...',
            type: 'warning',
            duration: 3000
          });
          
          // 延迟跳转，让用户看到消息（只有在不在目标页面时才跳转）
          setTimeout(() => {
            if (this.activeMenu !== 'documents') {
              this.activeMenu = 'documents';
              this.$router.replace({ query: { tab: 'documents' } }).catch(err => {
                // 忽略导航重复错误
                if (err.name !== 'NavigationDuplicated') {
                  console.error('Navigation error:', err);
                }
              });
            }
          }, 1500);
          return;
        }

        // 动态导入axios
        const axios = (await import('axios')).default;
        
        // 首先从服务器检查是否有待处理的任务（排除 generated 状态）
        try {
          console.log('🔍 检查服务器上的待处理任务...');
          const pendingResponse = await axios.get('/api/submissions/pending_tasks', {
            withCredentials: true
          });
          
          if (pendingResponse.data && pendingResponse.data.success && pendingResponse.data.data.tasks) {
            const serverTasks = pendingResponse.data.data.tasks;
            console.log('📋 服务器返回的任务:', serverTasks);
            
            // 检查是否有 receipt 类型的任务（进行中或已生成）
            const receiptTask = serverTasks.find(task => 
              (task.type === 'receipt' || task.type === 'registration-info') && 
              (task.status === 'processing' || task.status === 'generated')
            );
            
            if (receiptTask) {
              console.log('⚠️ 发现服务器上的 receipt 任务:', receiptTask);
              
              let message, messageType;
              if (receiptTask.status === 'processing') {
                message = 'Receipt generation is already in progress. Redirecting to Document Download section...';
                messageType = 'warning';
              } else if (receiptTask.status === 'generated') {
                message = 'Receipt is already generated and ready for download. Redirecting to Document Download section...';
                messageType = 'info';
              }
              
              this.$message({
                message: message,
                type: messageType,
                duration: 3000
              });
              
              // 延迟跳转，让用户看到消息（只有在不在目标页面时才跳转）
              setTimeout(() => {
                if (this.activeMenu !== 'documents') {
                  this.activeMenu = 'documents';
                  this.$router.replace({ query: { tab: 'documents' } }).catch(err => {
                    // 忽略导航重复错误
                    if (err.name !== 'NavigationDuplicated') {
                      console.error('Navigation error:', err);
                    }
                  });
                }
              }, 1500);
              return;
            }
          }
        } catch (error) {
          console.warn('⚠️ 检查服务器待处理任务失败，继续使用本地检查:', error);
        }

        // 检查全局 store 中是否有当前用户的 receipt 任务在进行（保留本地检查作为备用）
        if (this.$store && this.currentUser) {
          const existingTask = this.$store.getters['tasks/getUserTaskByType'](this.currentUser.id, 'receipt');
          if (existingTask && existingTask.status === 'processing') {
            this.$message({
              message: 'Receipt generation is already in progress. Redirecting to Document Download section...',
              type: 'warning',
              duration: 3000
            });
            
            // 延迟跳转，让用户看到消息（只有在不在目标页面时才跳转）
            setTimeout(() => {
              if (this.activeMenu !== 'documents') {
                this.activeMenu = 'documents';
                this.$router.replace({ query: { tab: 'documents' } }).catch(err => {
                  // 忽略导航重复错误
                  if (err.name !== 'NavigationDuplicated') {
                    console.error('Navigation error:', err);
                  }
                });
              }
            }, 1500);
            return;
          }
        }

        // 第一步：启动PDF生成
        this.$message({
          message: 'Starting receipt generation...',
          type: 'info'
        });
        
        this.isGenerating = true;
        
        const generateResponse = await axios.post('/api/submissions/generate_receipt', {
          marginMode: 'standard' // 默认边距模式
        }, {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!generateResponse.data.success) {
          throw new Error(generateResponse.data.message || 'Failed to start PDF generation');
        }

        const taskId = generateResponse.data.taskId;
        this.currentTaskId = taskId;
        console.log(`Receipt generation started with task ID: ${taskId}`);

        // 声明任务所有权 - 基于URL路径
        this.$globalSSEManager.claimTask(taskId, `UserDashboard_${this.$route.path}`);

        // 将任务添加到全局 store，以便 DocumentManagement 组件可以查看进度
        if (this.$store && this.currentUser) {
          this.$store.dispatch('tasks/addDownloadTask', {
            taskId: taskId,
            type: 'receipt',
            userId: this.currentUser.id
          });
        }

        // 显示成功消息并提醒用户查看进度
        this.$message({
          message: 'Receipt generation started! You can view the progress in the Document Download section.',
          type: 'success',
          duration: 5000
        });
        
        // 移除延迟通知，改为立即在上面的消息中包含相关信息

      } catch (error) {
        console.error('Download receipt error:', error);
        this.isGenerating = false;
        this.currentTaskId = null;
        
        let errorMessage = 'Failed to start receipt generation';
        
        if (error.response) {
          if (error.response.status === 404) {
            errorMessage = 'No approved registration found for receipt download';
          } else if (error.response.status === 409) {
            errorMessage = 'Receipt generation is already in progress. Please check the Document Download section.';
            // 直接跳转到documents页面，并显示简单消息
            this.$message({
              message: 'Receipt generation is already in progress. Redirecting to Document Download section...',
              type: 'warning',
              duration: 3000
            });
            
            // 延迟跳转，让用户看到消息
            setTimeout(() => {
              this.activeMenu = 'documents';
              this.$router.replace({ query: { tab: 'documents' } });
            }, 1500);
            return;
          } else if (error.response.data && error.response.data.message) {
            errorMessage = error.response.data.message;
          }
        }
        
        this.$message({
          message: errorMessage,
          type: 'error'
        });
      }
    },

    // 初始化SSE连接
    async initSSE() {
      try {
        console.log('📡 UserDashboard: 订阅SSE服务...');
        
        // 使用全局SSE管理器注册
        // 创建任务检查函数 - 基于URL路径和任务创建位置
        const taskChecker = (taskId) => {
          // 只有在Dashboard主页面且确实有currentTaskId时才认领任务
          // 排除documents标签页（?tab=documents），让DocumentManagement处理
          const isOnDashboardMain = this.$route.path === '/dashboard' && 
                                   (!this.$route.query.tab || this.$route.query.tab === 'overview');
          const hasMyTask = taskId === this.currentTaskId && this.currentTaskId !== null;
          const isMyTask = isOnDashboardMain && hasMyTask;
          
          if (isMyTask) {
            console.log(`UserDashboard: 确认任务 ${taskId} 属于我 (URL: ${this.$route.path}, tab: ${this.$route.query.tab})`);
          } else if (hasMyTask) {
            console.log(`UserDashboard: 任务 ${taskId} 匹配但URL不匹配 (URL: ${this.$route.path}, tab: ${this.$route.query.tab})`);
          } else {
            console.log(`UserDashboard: 任务 ${taskId} 不属于我 (currentTaskId: ${this.currentTaskId})`);
          }
          return isMyTask;
        };
        
        // 使用全局SSE管理器注册，并提供任务检查函数
        this.$globalSSEManager.registerComponent(`UserDashboard_${this.$route.path}`, this.handleSSECompleted, taskChecker);
        
        // 创建其他回调函数并存储引用，便于后续清理
        this.onProgressCallback = this.handleSSEProgress.bind(this);
        this.onFailedCallback = this.handleSSEFailed.bind(this);
        
        // 初始化SSE服务并注册其他回调
        sseService.init({
          onProgress: this.onProgressCallback,
          onFailed: this.onFailedCallback
        });
        
      } catch (error) {
        console.error('❌ UserDashboard: 初始化SSE失败:', error);
      }
    },

    // 清理资源
    cleanup() {
      // 从全局SSE管理器注销
      this.$globalSSEManager.unregisterComponent(`UserDashboard_${this.$route.path}`);
      
      // 移除其他SSE回调函数
      if (this.onProgressCallback) {
        sseService.off('progress', this.onProgressCallback);
      }
      if (this.onFailedCallback) {
        sseService.off('failed', this.onFailedCallback);
      }
      
      // 清理回调引用
      this.onProgressCallback = null;
      this.onFailedCallback = null;
      
      // 让SSE服务检查是否还有其他监听器，决定是否保持连接
      sseService.cleanup();
      
      this.isGenerating = false;
      this.currentTaskId = null;
    },

    // 处理SSE进度更新
    handleSSEProgress(data) {
      const { taskId, progress } = data;
      
      // 只处理当前任务的进度
      if (taskId === this.currentTaskId) {
        console.log(`📄 PDF生成进度: ${progress}%`);
        
        // 更新全局 store 中的进度
        if (this.$store) {
          this.$store.dispatch('tasks/updateTaskProgress', {
            taskId: taskId,
            progress: progress
          });
        }
        
        if (progress > 0) {
          this.$message({
            message: `Generating receipt... ${progress}%`,
            type: 'info',
            duration: 2000
          });
        }
      }
    },

    // 处理SSE完成通知
    handleSSECompleted(data) {
      const { taskId, downloadUrl } = data;
      
      // 只处理当前任务的通知
      if (taskId === this.currentTaskId) {
        console.log('📄 PDF生成完成，已由全局SSE管理器自动下载');
        
        // 标记任务生成完成在全局 store 中
        if (this.$store) {
          this.$store.dispatch('tasks/generateTask', {
            taskId: taskId
          });
        }
        
        this.$message({
          message: 'Receipt ready and downloaded automatically!',
          type: 'success'
        });
        
        // 不再手动下载，全局SSE管理器已经处理了
        // 直接标记任务完成并重置状态
        setTimeout(() => {
          if (this.$store) {
            this.$store.dispatch('tasks/downloadTask', { taskId });
            setTimeout(() => {
              this.$store.dispatch('tasks/removeTask', { taskId });
            }, 2000);
          }
          
          this.isGenerating = false;
          this.currentTaskId = null;
        }, 1000);
      }
    },

    // 处理SSE失败通知
    handleSSEFailed(data) {
      const { taskId, error } = data;
      
      // 只处理当前任务
      if (taskId === this.currentTaskId) {
        console.error('📄 PDF生成失败:', error);
        
        // 标记任务失败在全局 store 中
        if (this.$store) {
          this.$store.dispatch('tasks/failTask', {
            taskId: taskId,
            error: error || 'Unknown error'
          });
        }
        
        this.$message({
          message: `Receipt generation failed: ${error || 'Unknown error'}`,
          type: 'error'
        });
        
        // 重置状态
        this.isGenerating = false;
        this.currentTaskId = null;
      }
    },

    // 处理SSE错误
    handleSSEError(error) {
      console.error('📄 SSE连接错误:', error);
      // 如果SSE失败，可以在这里添加降级处理逻辑
    },

    // 下载已完成的PDF
    async downloadCompletedPDF(taskId) {
      const downloadManager = this.$getDownloadManager();
      if (!downloadManager) {
        console.error('下载管理器未初始化');
        return;
      }
      
      const downloadKey = downloadManager.generateDownloadKey('dashboard', taskId);
      
      await downloadManager.downloadPDF({
        taskId,
        type: 'receipt',
        downloadKey,
        filename: 'ICPADS2025_Receipt.pdf',
        context: this,
        onSuccess: (taskId) => {
          // 下载成功后先标记任务为已下载
          if (this.$store) {
            this.$store.dispatch('tasks/downloadTask', { taskId });
          }
          
          // 通知其他标签页下载已完成
          this.$globalSSEManager.notifyDownloadCompleted(taskId, 'receipt');
          
          // 延迟一段时间后从全局 store 中移除任务
          setTimeout(() => {
            if (this.$store) {
              this.$store.dispatch('tasks/removeTask', { taskId });
            }
          }, 2000); // 2秒后清理
          
          // 重置状态
          this.isGenerating = false;
          this.currentTaskId = null;
        },
        onError: (error) => {
          console.error('Error downloading completed PDF:', error);
          // 出错时也重置状态
          this.isGenerating = false;
          this.currentTaskId = null;
        }
      });
    },

    // 下载凭证 - 保留原来的方法作为备用
    async downloadReceipt() {
      try {
        this.$message({
          message: 'Preparing receipt download...',
          type: 'info'
        });

        // 动态导入axios
        const axios = (await import('axios')).default;
        
        // 使用新的异步接口
        await this.downloadReceiptAsync(axios);

      } catch (error) {
        console.error('Download receipt error:', error);
        let errorMessage = 'Failed to download receipt';
        
        if (error.response) {
          if (error.response.status === 404) {
            errorMessage = 'No approved registration found for receipt download';
          } else if (error.response.data && error.response.data.message) {
            errorMessage = error.response.data.message;
          }
        }
        
        this.$message({
          message: errorMessage,
          type: 'error'
        });
      }
    },

    async downloadReceiptAsync(axios) {
      try {
        // 第一步：启动PDF生成
        const generateResponse = await axios.post('/api/submissions/generate_receipt', {
          marginMode: 'standard' // 默认边距模式
        }, {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!generateResponse.data.success) {
          throw new Error(generateResponse.data.message || 'Failed to start PDF generation');
        }

        const taskId = generateResponse.data.taskId;
        console.log(`Receipt generation started with task ID: ${taskId}`);

        // 声明任务所有权
        this.$globalSSEManager.claimTask(taskId, 'UserDashboard');

        // 第二步：轮询检查生成状态
        let attempts = 0;
        const maxAttempts = 60; // 最多等待60秒
        const pollInterval = 1000; // 每秒检查一次
        
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          attempts++;

          const statusResponse = await axios.get(`/api/submissions/pdf_status/${taskId}`, {
            withCredentials: true
          });

          if (!statusResponse.data.success) {
            throw new Error('Failed to check PDF generation status');
          }

          const task = statusResponse.data.task;
          console.log(`Receipt generation status: ${task.status}, progress: ${task.progress}%`);

          // 更新用户提示
          if (task.progress > 0) {
            this.$message({
              message: `Generating receipt... ${task.progress}%`,
              type: 'info'
            });
          }

          if (task.status === 'completed') {
            // 第三步：下载完成的PDF - 使用防重复下载
            await this.downloadCompletedPDF(taskId);
            return;

          } else if (task.status === 'failed') {
            throw new Error(task.error || 'PDF generation failed');
          }
        }

        // 如果超时
        throw new Error('PDF generation timeout. Please try again later.');

      } catch (error) {
        console.error('Async download error:', error);
        
        // 如果是409冲突错误（重复任务），尝试使用旧的同步接口作为备用
        if (error.response && error.response.status === 409) {
          console.log('Conflict detected, trying fallback to sync interface...');
          await this.downloadReceiptFallback(axios);
          return;
        }
        
        throw error;
      }
    },

    async downloadReceiptFallback(axios) {
      // 备用：使用旧的同步接口
      console.log('Using fallback sync interface for receipt download');
      
      const response = await axios.get('/api/submissions/download_receipt', {
        withCredentials: true,
        responseType: 'blob'
      });

      // 创建下载链接
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // 设置文件名
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'ICPADS2025_Receipt.pdf';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      this.$message({
        message: 'Receipt downloaded successfully!',
        type: 'success'
      });
    },

    // logout() {
    //   // 清除本地存储
    //   localStorage.removeItem('user');
    //   localStorage.removeItem('token');
      
    //   // 清除store状态
    //   if (this.$store && this.$store.commit) {
    //     this.$store.commit('account/logout');
    //   }
      
    //   // 跳转到登录页
    //   this.$router.push('/login');
    // }
  }
};
</script>

<style scoped>
.user-dashboard {
  min-height: 100vh;
  background: #f8f9fa;
}

.dashboard-header {
  background: white;
  border-bottom: 1px solid #e4e7ed;
  padding: 0;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left .dashboard-title {
  font-size: 32px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
}

.header-left .dashboard-subtitle {
  color: #909399;
  font-size: 16px;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
}

.dashboard-main {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  gap: 32px;
  padding: 32px 24px;
  min-height: calc(100vh - 120px);
}

.dashboard-sidebar {
  width: 280px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.sidebar-menu {
  border-right: none;
}

.sidebar-menu .el-menu-item {
  height: 64px;
  line-height: 64px;
  padding: 0 24px;
  font-size: 16px;
  color: #606266;
  border-bottom: 1px solid #f5f7fa;
}

.sidebar-menu .el-menu-item:hover,
.sidebar-menu .el-menu-item.is-active {
  background-color: #ecf5ff;
  color: #409EFF;
}

.sidebar-menu .el-menu-item i {
  font-size: 20px;
  margin-right: 16px;
  width: 20px;
}

.dashboard-content {
  flex: 1;
  background: transparent;
  overflow: hidden;
}

/* 概览页面样式 */
.overview-section {
  padding: 0;
}

.stats-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 32px;
  margin-bottom: 24px;
}

.stats-row {
  margin-bottom: 0;
}

.stat-card {
  text-align: center;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 24px 16px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: none !important;
}

.stat-card:hover {
  background: white;
  border-color: #409EFF;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
  transform: translateY(-2px);
}


.quick-actions {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 32px;
  margin-top: 24px;
}

.quick-actions h3 {
  color: #303133;
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 3px solid #f0f2f5;
}

/* 注册状态区域样式 */
.registration-status-section {
  margin-bottom: 32px;
}

.status-info-card {
  background: #f8f9fa;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  height: 120px !important;
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
}

.status-info-card.clickable {
  cursor: pointer;
}

.status-info-card.clickable:hover {
  background: #f0f9ff;
  border-color: #67C23A;
  box-shadow: 0 2px 8px rgba(103, 194, 58, 0.1);
  transform: translateY(-1px);
}

.status-content {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0 16px;
}

.download-indicator {
  margin-left: auto;
  flex-shrink: 0;
  opacity: 0.7;
  transition: all 0.3s ease;
}

.status-info-card.clickable:hover .download-indicator {
  opacity: 1;
  transform: translateX(-2px);
}

.status-icon {
  font-size: 32px;
  margin-right: 16px;
  flex-shrink: 0;
  transition: transform 0.3s ease;
}

.status-info-card.clickable:hover .status-icon {
  transform: scale(1.1);
}

.status-text h4 {
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px 0;
  line-height: 1.3;
}

.status-text p {
  color: #909399;
  font-size: 14px;
  margin: 0;
  line-height: 1.4;
}

.continue-registration-card {
  background: linear-gradient(135deg, #409EFF 0%, #67C23A 100%);
  border: none;
  border-radius: 8px;
  height: 120px !important;
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;
  position: relative;
}

.continue-registration-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(64, 158, 255, 0.3);
}

.continue-content {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 0 16px;
  color: white;
  position: relative;
}

.continue-icon {
  font-size: 28px;
  margin-right: 12px;
  flex-shrink: 0;
}

.continue-text {
  flex-grow: 1;
}

.continue-text h4 {
  color: white;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px 0;
  line-height: 1.3;
}

.continue-text p {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  margin: 0;
  line-height: 1.4;
}

.continue-arrow {
  font-size: 20px;
  opacity: 0.8;
  flex-shrink: 0;
  transition: transform 0.3s ease;
}

.continue-registration-card:hover .continue-arrow {
  transform: translateX(4px);
}

.action-card {
  text-align: center;
  padding: 24px 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  height: 240px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.action-card:hover {
  transform: translateY(-3px);
  background: white;
  border-color: #409EFF;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.12);
}

.action-icon {
  font-size: 48px;
  color: #409EFF;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.action-card h4 {
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
  flex-shrink: 0;
  line-height: 1.3;
}

.action-card p {
  color: #909399;
  font-size: 14px;
  margin: 0;
  line-height: 1.5;
  flex-grow: 1;
  display: flex;
  align-items: center;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .dashboard-main {
    flex-direction: column;
    padding: 16px;
  }
  
  .dashboard-sidebar {
    width: 100%;
  }
  
  .sidebar-menu {
    display: flex;
    overflow-x: auto;
  }
  
  .sidebar-menu .el-menu-item {
    white-space: nowrap;
    min-width: 120px;
    text-align: center;
  }
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .stats-row .el-col {
    margin-bottom: 16px;
  }
  
  .action-card {
    height: 180px;
    margin-bottom: 16px;
  }
  
  .registration-status-section .el-col {
    margin-bottom: 16px;
  }
  
  .status-info-card,
  .continue-registration-card {
    height: 100px;
  }
  
  .status-content,
  .continue-content {
    padding: 0 12px;
  }
  
  .status-text h4,
  .continue-text h4 {
    font-size: 14px;
  }
  
  .status-text p,
  .continue-text p {
    font-size: 12px;
  }
  
  .status-icon,
  .continue-icon {
    font-size: 24px;
    margin-right: 12px;
  }
}
</style>

<!-- 全局样式，专门用于覆盖Element UI组件样式 -->
<style>


.stat-card .el-statistic .head .title {
  font-size: 14px;
  color: #909399;
  line-height: 1.2;
}

.stat-card .el-statistic .con .number {
  /* font-size: 32px; */
  font-weight: 400;
  color: #303133;
}

.stat-card .el-statistic .head {
  margin-bottom: 8px;
}

.stat-card .el-statistic .con {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.action-card.el-card .el-card__body {
  padding: 0 !important;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* 修复注册状态卡片的高度和垂直居中问题 */
.status-info-card.el-card .el-card__body {
  padding: 0 !important;
  height: 120px;
  display: flex;
  align-items: center;
}

.continue-registration-card.el-card .el-card__body {
  padding: 0 !important;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
