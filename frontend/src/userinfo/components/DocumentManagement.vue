<template>
  <div class="document-management">
    <el-card>
      <div slot="header" class="card-header">
        <div class="header-left">
          <span class="card-title">Document Download</span>
          <p class="card-subtitle">Download confirmation letters, receipts, registration information and other related documents</p>
        </div>
        <div class="header-right">
          <el-button 
            type="primary" 
            size="small" 
            @click="refreshPage"
            icon="el-icon-refresh">
            Refresh
          </el-button>
        </div>
      </div>
      
      <!-- 无已批准注册的状态 -->
      <div v-if="!hasApprovedRegistration" class="empty-state">
        <el-empty description="You need to have approved registrations before downloading related documents">
          <el-button type="primary" @click="$router.push('/conference/auto')">Register Now</el-button>
        </el-empty>
      </div>
      
      <!-- 有已批准注册的状态 -->
      <div v-else class="document-content">
        <!-- PDF格式选择 -->
        <div class="format-selection">
          <h4>PDF Download Options</h4>
          <div class="options-row">
            <el-radio-group v-model="pdfMarginMode" size="small" class="format-radios">
              <el-radio label="standard">Standard (5mm)</el-radio>
              <el-radio label="minimal">Compact (2mm)</el-radio>
              <el-radio label="none">Full page (0mm)</el-radio>
            </el-radio-group>
            <div class="download-settings">
              <el-checkbox v-model="autoDownload" size="small">
                Auto download
              </el-checkbox>
            </div>
          </div>
        </div>
        
        <!-- 待下载通知区域 -->
        <div v-if="hasPendingTasks" class="pending-downloads">
          <div class="progress-content">
            <div class="progress-icon">
              <i class="el-icon-loading"></i>
            </div>
            <div class="progress-tasks">
              <div v-for="(task, type) in allPendingTasks" :key="type" class="pending-task">
                <span class="task-name">{{ getDocumentTypeName(type) }}:</span>
                <span v-if="task.status === 'processing'" class="task-status processing">
                  <span>Generating...</span>
                </span>
                <span v-else-if="task.status === 'generated'" class="task-status generated">
                  <i class="el-icon-circle-check"></i>
                  Ready! 
                  <el-button type="primary" size="mini" @click="downloadGeneratedTask(type, task.taskId)">
                    <i class="el-icon-download"></i>
                    Download
                  </el-button>
                </span>
                <span v-else-if="task.status === 'failed'" class="task-status failed">
                  <i class="el-icon-circle-close"></i>
                  Failed
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="document-grid">
          <!-- 确认函 -->
          <el-card class="document-card" shadow="hover">
            <div class="document-icon">
              <i class="el-icon-document"></i>
            </div>
            <h4>Confirmation Letter</h4>
            <p>Conference attendance confirmation letter for visa applications and other purposes</p>
            <el-button type="success" @click="downloadDocument('confirmation')" :loading="downloadLoading.confirmation">
              <i v-if="isDocumentDownloadable('confirmation')" class="el-icon-download"></i>
              {{ getDownloadButtonText('confirmation') }}
            </el-button>
          </el-card>
          
          <!-- 收据 -->
          <el-card class="document-card" shadow="hover">
            <div class="document-icon">
              <i class="el-icon-tickets"></i>
            </div>
            <h4>Payment Receipt</h4>
            <p>Registration fee payment receipt for reimbursement and other purposes</p>
            <el-button type="warning" @click="downloadDocument('receipt')" :loading="downloadLoading.receipt">
              <i v-if="isDocumentDownloadable('receipt')" class="el-icon-download"></i>
              {{ getDownloadButtonText('receipt') }}
            </el-button>
          </el-card>
          
          <!-- 注册信息 -->
          <el-card class="document-card" shadow="hover">
            <div class="document-icon">
              <i class="el-icon-user"></i>
            </div>
            <h4>Registration Information</h4>
            <p>Complete registration information sheet with all submitted details</p>
            <el-button type="info" @click="downloadDocument('registration')" :loading="downloadLoading.registration">
              <i v-if="isDocumentDownloadable('registration')" class="el-icon-download"></i>
              {{ getDownloadButtonText('registration') }}
            </el-button>
          </el-card>
          
          <!-- 参会证书 -->
          <el-card class="document-card" shadow="hover">
            <div class="document-icon">
              <i class="el-icon-medal"></i>
            </div>
            <h4>Attendance Certificate</h4>
            <p>Attendance certificate available after conference ends</p>
            <el-button 
              type="primary" 
              @click="downloadDocument('certificate')" 
              :loading="downloadLoading.certificate"
              :disabled="!isCertificateAvailable">
              <i v-if="isCertificateAvailable && isDocumentDownloadable('certificate')" class="el-icon-download"></i>
              {{ isCertificateAvailable ? 'Download Certificate' : 'Available After Conference' }}
            </el-button>
          </el-card>
        </div>
        
        <!-- 注册信息概览 -->
        <div class="registration-overview">
          <h4>Your Registration Information</h4>
          <el-table :data="approvedRegistrations" border style="width: 100%">
            <el-table-column prop="productCode" label="Product Code" width="120"></el-table-column>
            <el-table-column prop="name" label="Attendee Name"></el-table-column>
            <el-table-column prop="email" label="Email"></el-table-column>
            <el-table-column prop="productPrice" label="Fee" width="100">
              <template slot-scope="scope">
                ${{ scope.row.productPrice }} USD
              </template>
            </el-table-column>
            <el-table-column prop="submissionTime" label="Registration Time" width="180">
              <template slot-scope="scope">
                <div class="registration-time">
                  <div>{{ formatDateOnly(scope.row.submissionTime) }}</div>
                  <div class="time-part">{{ formatTimeOnly(scope.row.submissionTime) }}</div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="reviewTime" label="Approval Time" width="180">
              <template slot-scope="scope">
                <div class="registration-time">
                  <div>{{ formatDateOnly(scope.row.reviewTime) }}</div>
                  <div class="time-part">{{ formatTimeOnly(scope.row.reviewTime) }}</div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="Status" width="120">
              <template slot-scope="scope">
                <el-tag type="success">Approved</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
import { userService } from '../../_services';
import { sseService } from '../../_services/sse.service.js';
import globalSSEManager from '../../_services/globalSSEManager.js';

export default {
  name: 'DocumentManagement',
  data() {
    return {
      hasApprovedRegistration: false,
      approvedRegistrations: [],
      downloadLoading: {
        confirmation: false,
        receipt: false,
        registration: false,
        certificate: false
      },
      downloadHistory: [],
      isCertificateAvailable: false,
      pdfMarginMode: 'standard', // 'standard', 'minimal', 'none'
      autoDownload: true, // 是否自动下载
      refreshLoading: false, // 刷新按钮加载状态
      
      // 任务管理
      pendingTasks: {}, // { taskType: { taskId, status, progress, startTime } }
      backgroundPollingTimer: null,
      backgroundPollingInterval: 10000, // 10秒间隔
      
      // SSE支持 (使用sseService管理)
      useSSE: true, // 是否使用Server-Sent Events
      sseConnectedHandler: null, // SSE连接建立监听器引用
      
      // 用户状态管理
      currentUserId: null,
      hasInitialized: false, // 添加初始化状态标志
      
      // 防止重复下载
      downloadingTasks: new Set() // 存储正在下载的任务标识
    };
  },
  computed: {
    hasPendingTasks() {
      return Object.keys(this.allPendingTasks).length > 0;
    },
    
    // 检查文档是否可以下载（任务状态为 generated）
    isDocumentDownloadable() {
      return (type) => {
        const task = this.allPendingTasks[type];
        const result = task && task.status === 'generated';
        console.log(`🔽 [DEBUG] isDocumentDownloadable(${type}):`, {
          hasTask: !!task,
          taskStatus: task?.status,
          result: result
        });
        return result;
      };
    },
    
    // 合并本地任务和全局 store 中的任务
    allPendingTasks() {
      console.log('🔍 [DEBUG] allPendingTasks computed 被调用');
      console.log('🔍 [DEBUG] 本地 pendingTasks:', JSON.parse(JSON.stringify(this.pendingTasks)));
      
      const result = { ...this.pendingTasks };
      
      // 从全局 store 获取当前用户的任务
      if (this.$store && this.currentUserId) {
        const storeUserTasks = this.$store.getters['tasks/getUserPendingTasks'](this.currentUserId);
        console.log('🔍 [DEBUG] 从 store 获取的用户任务:', JSON.parse(JSON.stringify(storeUserTasks)));
        
        // 合并 store 中的任务到结果中
        Object.keys(storeUserTasks).forEach(type => {
          const storeTask = storeUserTasks[type];
          const localTask = result[type];
          
          console.log(`🔍 [DEBUG] 处理任务类型 ${type}:`, {
            storeTask: JSON.parse(JSON.stringify(storeTask)),
            localTask: localTask ? JSON.parse(JSON.stringify(localTask)) : null
          });
          
          // 只合并进行中的任务，跳过已下载的任务
          if (storeTask.status === 'downloaded') {
            console.log(`🔍 [DEBUG] 跳过已下载的任务: ${type}`);
            return;
          }
          
          // 跳过已生成的任务，除非是本页面发起的
          if (storeTask.status === 'generated') {
            if (!localTask || !localTask.initiatedInCurrentPage) {
              console.log(`🔍 [DEBUG] 跳过非本页面发起的已生成任务: ${type}, localTask存在:${!!localTask}, initiatedInCurrentPage:${localTask?.initiatedInCurrentPage}`);
              return; // 跳过非本页面发起的已生成任务
            } else {
              console.log(`🔍 [DEBUG] 保留本页面发起的已生成任务: ${type}`);
            }
          }
          
          // 如果本地没有此任务，使用 store 中的任务（仅限进行中的任务）
          if (!localTask && storeTask.status === 'processing') {
            console.log(`🔍 [DEBUG] 添加 store 中的进行中任务: ${type}`);
            result[type] = { ...storeTask, initiatedInCurrentPage: false };
          } 
          // 如果 store 中的任务 ID 不同，使用 store 中的任务
          else if (localTask && storeTask.taskId !== localTask.taskId) {
            console.log(`🔍 [DEBUG] 任务ID不同，使用 store 任务: ${type}, localTaskId:${localTask.taskId}, storeTaskId:${storeTask.taskId}`);
            result[type] = { ...storeTask, initiatedInCurrentPage: false };
          }
          // 如果任务 ID 相同，合并状态，但优先处理进行中的任务
          else if (localTask && storeTask.taskId === localTask.taskId) {
            console.log(`🔍 [DEBUG] 任务ID相同，合并状态: ${type}, localStatus:${localTask.status}, storeStatus:${storeTask.status}`);
            
            // 优先使用最新的状态，但本地的 generated 状态应该优先于 store 中的 processing 状态
            if (localTask.status === 'generated' && storeTask.status === 'processing') {
              console.log(`🔍 [DEBUG] 本地已生成，store还在处理中，保持本地生成状态: ${type}`);
              result[type] = {
                ...storeTask,
                ...localTask,
                status: 'generated',
                progress: 100
              };
            }
            // 如果任务仍在进行中，使用更新的状态
            else if (storeTask.status === 'processing' || localTask.status === 'processing') {
              console.log(`🔍 [DEBUG] 任务仍在进行中，更新状态: ${type}`);
              result[type] = {
                ...localTask,
                ...storeTask,
                // 保持原有的发起标记
                initiatedInCurrentPage: localTask.initiatedInCurrentPage,
                // 优先使用更高的进度
                progress: Math.max(localTask.progress || 0, storeTask.progress || 0)
              };
            }
            // 如果任务已生成，只有本页面发起的任务才显示下载按钮
            else if (storeTask.status === 'generated' || localTask.status === 'generated') {
              console.log(`🔍 [DEBUG] 任务已生成，检查发起页面: ${type}, initiatedInCurrentPage:${localTask.initiatedInCurrentPage}`);
              if (localTask.initiatedInCurrentPage) {
                console.log(`🔍 [DEBUG] 保留本页面发起的已生成任务: ${type}`);
                result[type] = {
                  ...storeTask,
                  ...localTask,
                  status: 'generated',
                  progress: 100
                };
              } else {
                console.log(`🔍 [DEBUG] 删除非本页面发起的已生成任务: ${type}`);
                // 非本页面发起的已生成任务，从结果中移除
                delete result[type];
              }
            }
            // 默认使用本地任务
            else {
              console.log(`🔍 [DEBUG] 使用默认本地任务: ${type}`);
              result[type] = localTask;
            }
          }
        });
      }
      
      // 最终过滤：只显示正在处理中的任务和已生成但未下载的任务
      const filteredResult = {};
      Object.keys(result).forEach(type => {
        const task = result[type];
        console.log(`🔍 [DEBUG] 最终过滤任务 ${type}:`, {
          status: task.status,
          shouldInclude: task.status === 'processing' || task.status === 'generated'
        });
        if (task.status === 'processing' || task.status === 'generated') {
          filteredResult[type] = task;
        }
      });
      
      console.log('🔍 [DEBUG] allPendingTasks 最终结果:', JSON.parse(JSON.stringify(filteredResult)));
      return filteredResult;
    }
  },
  async mounted() {
    console.log('🚀 [DEBUG] DocumentManagement mounted 开始');
    
    // 监听全局用户状态变化事件
    this.$root.$on('auth-status-changed', this.handleAuthStatusChange);
    
    // 添加页面卸载事件监听器，确保页面刷新时也能清理SSE连接
    window.addEventListener('beforeunload', this.handlePageUnload);
    window.addEventListener('unload', this.handlePageUnload);
    
    // 检查用户状态变化（这会初始化用户相关数据）
    console.log('🚀 [DEBUG] 1. 检查用户状态并初始化');
    await this.checkUserStateAndInitialize();
    
    // 加载通用数据（不依赖用户状态的数据）
    console.log('🚀 [DEBUG] 2. 加载通用数据');
    await this.loadApprovedRegistrations();
    await this.loadDownloadHistory();
    this.checkCertificateAvailability();
    
    // 优先从服务器加载pending任务，网络失败时才使用本地存储作为fallback
    console.log('🚀 [DEBUG] 3. 从服务器加载pending任务');
    await this.loadPendingTasksFromServer();
    
    // 如果服务器加载失败且本地没有数据，才从localStorage加载
    if (Object.keys(this.pendingTasks).length === 0) {
      console.log('🚀 [DEBUG] 4. 从localStorage加载任务（fallback）');
      this.loadPendingTasksFromStorage();
    } else {
      console.log('🚀 [DEBUG] 4. 跳过localStorage加载（已有服务器数据）');
    }
    
    // 从全局 store 同步任务状态
    console.log('🚀 [DEBUG] 5. 从全局store同步任务状态');
    this.syncTasksFromStore();
    
    console.log('🚀 [DEBUG] DocumentManagement mounted 完成');
    console.log('🚀 [DEBUG] 最终的 pendingTasks:', JSON.parse(JSON.stringify(this.pendingTasks)));
    console.log('🚀 [DEBUG] 最终的 allPendingTasks:', JSON.parse(JSON.stringify(this.allPendingTasks)));
  },
  beforeDestroy() {
    // 移除全局事件监听器
    this.$root.$off('auth-status-changed', this.handleAuthStatusChange);
    
    // 移除页面卸载事件监听器
    window.removeEventListener('beforeunload', this.handlePageUnload);
    window.removeEventListener('unload', this.handlePageUnload);
    
    this.cleanup();
  },
  methods: {
    // 刷新页面
    refreshPage() {
      window.location.reload();
    },

    // 刷新任务状态
    async refreshTaskStatus() {
      if (this.refreshLoading) {
        return; // 防止重复点击
      }
      
      this.refreshLoading = true;
      
      try {
        console.log('🔄 用户手动刷新任务状态...');
        
        // 从服务器重新加载pending任务
        await this.loadPendingTasksFromServer();
        
        // 验证现有任务的状态
        await this.validateTaskStates();
        
        // 从全局store同步任务状态
        this.syncTasksFromStore();
        
        // 显示成功提示
        this.$message.success('Task status refreshed successfully');
        
        console.log('✅ 任务状态刷新完成');
        
      } catch (error) {
        console.error('❌ 刷新任务状态失败:', error);
        this.$message.error('Failed to refresh task status. Please try again.');
      } finally {
        this.refreshLoading = false;
      }
    },

    // 检查用户状态并初始化
    async checkUserStateAndInitialize() {
      try {
        // 首先尝试从store获取用户信息
        const currentUser = this.$store.state.account.user;
        if (currentUser && currentUser.id) {
          const userId = currentUser.id;
          
          // 检查是否是新用户或用户发生变化
          if (this.currentUserId !== userId) {
            console.log(`用户状态变化: ${this.currentUserId} -> ${userId}`);
            
            // 只有当真正切换用户时才清理数据，而不是用户从null变为有效用户
            if (this.currentUserId !== null) {
              // 清理旧用户的数据
              this.cleanupUserData();
            }
            
            // 设置新用户ID
            this.currentUserId = userId;
            
            // 重新初始化用户相关的状态
            await this.initializeUserData();
          } else if (this.currentUserId === userId && !this.hasInitialized) {
            // 用户ID相同但组件还未初始化（可能是页面刷新或路由导航）
            console.log(`用户ID未变化(${userId})，但组件需要初始化`);
            await this.initializeUserData();
          }
          return;
        }
        
        // 如果store中没有用户信息，再从API获取
        const axios = (await import('axios')).default;
        const response = await axios.get('/api/auth/me', {
          withCredentials: true
        });
        
        if (response.data && response.data.user) {
          const userId = response.data.user.id;
          
          // 检查是否是新用户或用户发生变化
          if (this.currentUserId !== userId) {
            console.log(`用户状态变化: ${this.currentUserId} -> ${userId}`);
            
            // 只有当真正切换用户时才清理数据，而不是用户从null变为有效用户
            if (this.currentUserId !== null) {
              // 清理旧用户的数据
              this.cleanupUserData();
            }
            
            // 设置新用户ID
            this.currentUserId = userId;
            
            // 重新初始化用户相关的状态
            await this.initializeUserData();
          } else if (this.currentUserId === userId && !this.hasInitialized) {
            // 用户ID相同但组件还未初始化（可能是页面刷新或路由导航）
            console.log(`用户ID未变化(${userId})，但组件需要初始化`);
            await this.initializeUserData();
          }
        }
      } catch (error) {
        console.error('检查用户状态失败:', error);
        // 如果检查失败，清理所有数据
        this.cleanupUserData();
      }
    },

    // 处理页面卸载事件
    handlePageUnload() {
      console.log('📡 页面卸载，清理SSE连接...');
      this.cleanup();
    },

    // 处理全局用户状态变化
    async handleAuthStatusChange(authInfo) {
      console.log('DocumentManagement 接收到用户状态变化:', authInfo);
      
      if (!authInfo.isLoggedIn) {
        // 用户登出，清理数据
        console.log('用户已登出，清理DocumentManagement数据');
        this.cleanupUserData();
        this.currentUserId = null;
      } else if (authInfo.user && authInfo.user.id !== this.currentUserId) {
        // 用户切换，清理旧用户数据并初始化新用户数据
        console.log(`用户已切换: ${this.currentUserId} -> ${authInfo.user.id}`);
        this.cleanupUserData();
        this.currentUserId = authInfo.user.id;
        await this.initializeUserData();
      }
    },

    // 从全局 store 同步任务状态
    syncTasksFromStore() {
      console.log('🔄 [DEBUG] syncTasksFromStore 开始执行');
      console.log('🔄 [DEBUG] 当前用户ID:', this.currentUserId);
      console.log('🔄 [DEBUG] store 是否存在:', !!this.$store);
      
      if (!this.$store || !this.currentUserId) {
        console.log('🔄 [DEBUG] store 或 currentUserId 不存在，跳过同步');
        return;
      }
      
      try {
        // 获取当前用户在 store 中的任务
        const storeUserTasks = this.$store.getters['tasks/getUserPendingTasks'](this.currentUserId);
        console.log('🔄 [DEBUG] 从 store 获取的用户任务:', JSON.parse(JSON.stringify(storeUserTasks)));
        console.log('🔄 [DEBUG] 同步前的本地任务:', JSON.parse(JSON.stringify(this.pendingTasks)));
        
        // 将 store 中的任务合并到本地任务中，但只同步本页面发起的任务
        Object.keys(storeUserTasks).forEach(type => {
          const storeTask = storeUserTasks[type];
          
          // 将服务器类型映射到前端类型
          const frontendType = this.mapServerDocumentType(type);
          
          console.log(`🔄 [DEBUG] 处理任务类型 ${type} -> ${frontendType}:`, JSON.parse(JSON.stringify(storeTask)));
          
          // 只同步处理中的任务，或者本页面发起的已生成任务
          if (storeTask.status === 'downloaded') {
            console.log(`🔄 [DEBUG] 跳过已下载的任务: ${frontendType}`);
            return;
          }
          
          if (storeTask.status === 'generated') {
            // 如果是已生成的任务，只有本地存在对应的进行中任务才同步
            if (!this.pendingTasks[frontendType] || 
                (this.pendingTasks[frontendType].status !== 'processing' && !this.pendingTasks[frontendType].initiatedInCurrentPage)) {
              console.log(`🔄 [DEBUG] 跳过已生成的外部任务: ${frontendType}, 本地任务存在:${!!this.pendingTasks[frontendType]}, 本地状态:${this.pendingTasks[frontendType]?.status}, initiatedInCurrentPage:${this.pendingTasks[frontendType]?.initiatedInCurrentPage}`);
              return;
            } else {
              console.log(`🔄 [DEBUG] 保留已生成的本页面任务: ${frontendType}`);
            }
          }
          
          // 如果本地没有此任务，且是进行中状态，则添加（可能是从其他地方启动的）
          if (!this.pendingTasks[frontendType] && storeTask.status === 'processing') {
            console.log(`🔄 [DEBUG] 添加 store 中的进行中任务: ${frontendType}`);
            this.$set(this.pendingTasks, frontendType, { ...storeTask, initiatedInCurrentPage: false });
          }
          // 如果本地有此任务，更新状态
          else if (this.pendingTasks[frontendType] && storeTask.taskId === this.pendingTasks[frontendType].taskId) {
            console.log(`🔄 [DEBUG] 更新本地任务状态: ${frontendType}, 本地状态:${this.pendingTasks[frontendType].status}, store状态:${storeTask.status}`);
            this.$set(this.pendingTasks, frontendType, {
              ...this.pendingTasks[frontendType],
              ...storeTask
            });
          } else if (this.pendingTasks[frontendType]) {
            console.log(`🔄 [DEBUG] 任务ID不匹配，跳过更新: ${frontendType}, 本地taskId:${this.pendingTasks[frontendType].taskId}, store taskId:${storeTask.taskId}`);
          }
        });
        
        // 清理重复的任务类型
        this.cleanupDuplicateTaskTypes();
        
        // 保存更新后的任务到本地存储
        this.savePendingTasksToStorage();
        
        console.log('🔄 [DEBUG] 同步后的本地任务:', JSON.parse(JSON.stringify(this.pendingTasks)));
        console.log('🔄 [DEBUG] syncTasksFromStore 执行完成');
      } catch (error) {
        console.error('🔄 [DEBUG] 从 store 同步任务状态失败:', error);
      }
    },

    // 清理用户数据
    cleanupUserData() {
      console.log('清理用户数据...');
      
      // 重置初始化状态
      this.hasInitialized = false;
      
      // 清理localStorage中的任务状态
      const storageKey = this.getStorageKey();
      localStorage.removeItem(storageKey);
      
      // 清理通用存储键和旧版本键（兼容性清理）
      localStorage.removeItem('documentTasks');
      localStorage.removeItem('documentPendingTasks');
      
      // 重置组件状态
      this.pendingTasks = {};
      
      // 清理当前组件的SSE监听器，但不关闭连接
      this.closeSSEService();
      
      // 清理轮询定时器
      if (this.backgroundPollingTimer) {
        clearInterval(this.backgroundPollingTimer);
        this.backgroundPollingTimer = null;
      }
    },

    // 初始化用户数据
    async initializeUserData() {
      console.log(`初始化用户数据: ${this.currentUserId}`);
      
      // 设置初始化标志
      this.hasInitialized = true;
      
      // 加载用户的待处理任务
      this.loadPendingTasksFromStorage();
      
      // 从全局store同步任务状态
      this.syncTasksFromStore();
      
      // 验证任务状态的实际情况，移除已经不存在的任务
      await this.validateTaskStates();
      
      // 重新建立连接
      if (this.useSSE) {
        this.initSSEService();
      } else {
        this.startBackgroundPolling();
      }
    },

    async loadApprovedRegistrations() {
      try {
        console.log('DocumentManagement: Loading approved registrations...');
        const response = await userService.getApprovedRegistrations();
        console.log('DocumentManagement: API response:', response);
        
        if (response && response.success && response.data) {
          this.approvedRegistrations = response.data;
          this.hasApprovedRegistration = this.approvedRegistrations.length > 0;
          console.log('DocumentManagement: Found approved registrations:', this.approvedRegistrations.length);
        } else {
          console.log('DocumentManagement: No data in response or response failed');
          this.hasApprovedRegistration = false;
          await this.checkRegistrationStatusFallback();
        }
      } catch (error) {
        console.error('DocumentManagement: Failed to load approved registrations:', error);
        await this.checkRegistrationStatusFallback();
      }
    },

    async checkRegistrationStatusFallback() {
      try {
        console.log('DocumentManagement: Using fallback check...');
        const axios = (await import('axios')).default;
        const response = await axios.get('/api/submissions/check-registration', {
          withCredentials: true
        });
        
        console.log('DocumentManagement: Check registration fallback response:', response.data);
        
        if (response.data.success && response.data.approved) {
          this.hasApprovedRegistration = true;
          this.approvedRegistrations = [{
            id: response.data.registration_id || response.data.submission_id,
            name: response.data.registration_data?.name || 'N/A',
            email: response.data.registration_data?.email || 'N/A', 
            productCode: response.data.registration_data?.product_code || 'N/A',
            productPrice: response.data.registration_data?.product_price || 0,
            submissionTime: new Date().toISOString(),
            reviewTime: new Date().toISOString()
          }];
          console.log('DocumentManagement: Using fallback registration data, hasApprovedRegistration set to:', this.hasApprovedRegistration);
        } else {
          this.hasApprovedRegistration = false;
          console.log('DocumentManagement: No approved registration found via fallback');
        }
      } catch (error) {
        console.error('DocumentManagement: Fallback check also failed:', error);
        this.hasApprovedRegistration = false;
      }
    },
    
    async loadDownloadHistory() {
      try {
        this.downloadHistory = [
          {
            id: 1,
            documentType: 'confirmation',
            downloadTime: new Date().toISOString(),
            fileSize: 245760,
            downloadCount: 1
          },
          {
            id: 2,
            documentType: 'receipt',
            downloadTime: new Date(Date.now() - 86400000).toISOString(),
            fileSize: 123456,
            downloadCount: 2
          }
        ];
      } catch (error) {
        console.error('Failed to load download history:', error);
      }
    },
    
    checkCertificateAvailability() {
      const conferenceEndDate = new Date('2025-12-31');
      this.isCertificateAvailable = new Date() > conferenceEndDate;
    },
    
    // 映射服务器文档类型到前端类型
    mapServerDocumentType(serverType) {
      const typeMapping = {
        'registration-info': 'registration',
        'confirmation': 'confirmation',
        'confirmation-letter': 'confirmation', // 新增：将 confirmation-letter 映射到 confirmation
        'receipt': 'receipt'
      };
      return typeMapping[serverType] || serverType;
    },

    // 清理重复的任务类型（确保 registration 和 registration-info 不会同时存在）
    cleanupDuplicateTaskTypes() {
      const duplicateTypePairs = [
        ['registration', 'registration-info'],
        ['confirmation', 'confirmation-letter'] // 新增：防止 confirmation 和 confirmation-letter 重复
      ];
      
      duplicateTypePairs.forEach(([frontendType, serverType]) => {
        if (this.pendingTasks[frontendType] && this.pendingTasks[serverType]) {
          console.log(`🧹 发现重复任务类型: ${frontendType} 和 ${serverType}，移除服务器类型`);
          
          // 保留前端类型，移除服务器类型
          this.$delete(this.pendingTasks, serverType);
        }
      });
    },

    // 从后端加载用户的pending任务
    async loadPendingTasksFromServer() {
      try {
        console.log('� [DEBUG] loadPendingTasksFromServer 开始执行');
        console.log('📡 [DEBUG] 加载前的本地任务:', JSON.parse(JSON.stringify(this.pendingTasks)));
        
        const axios = (await import('axios')).default;
        const response = await axios.get('/api/submissions/pending_tasks', {
          withCredentials: true
        });
        
        if (response.data && response.data.success && response.data.data.tasks) {
          const serverTasks = response.data.data.tasks;
          console.log('📡 [DEBUG] 从服务器获取到任务:', JSON.parse(JSON.stringify(serverTasks)));
          
          // 过滤掉已完成的任务，只处理真正进行中的任务
          const processingTasks = serverTasks.filter(task => task.status === 'processing');
          console.log('� [DEBUG] 过滤后的进行中任务:', JSON.parse(JSON.stringify(processingTasks)));
          
          // 不要清空现有任务，而是有选择地更新
          // this.pendingTasks = {};
          
          // 只添加或更新进行中的任务
          processingTasks.forEach(task => {
            // 将服务器类型映射到前端类型
            const frontendType = this.mapServerDocumentType(task.type);
            
            console.log(`📡 [DEBUG] 处理服务器任务: ${task.type} -> ${frontendType}`, JSON.parse(JSON.stringify(task)));
            
            // 检查是否是本页面已知的任务
            const existingTask = this.pendingTasks[frontendType];
            const isKnownTask = existingTask && existingTask.taskId === task.taskId;
            
            console.log(`📡 [DEBUG] 现有任务检查: ${frontendType}, 存在:${!!existingTask}, 是否已知:${isKnownTask}`);
            
            this.pendingTasks[frontendType] = {
              taskId: task.taskId,
              status: task.status,
              progress: task.progress,
              timestamp: new Date(task.createdAt).getTime(),
              initiatedInCurrentPage: isKnownTask ? (existingTask.initiatedInCurrentPage || false) : false
            };
            
            console.log(`📡 [DEBUG] 更新后的任务 ${frontendType}:`, JSON.parse(JSON.stringify(this.pendingTasks[frontendType])));
          });
          
          // 清理重复的任务类型
          this.cleanupDuplicateTaskTypes();
          
          // 同时更新到全局store（只添加进行中的任务）
          if (this.$store) {
            console.log('📡 [DEBUG] 更新全局 store 中的任务');
            // 不要清空store中的任务，而是有选择地更新
            // this.$store.dispatch('tasks/clearUserTasks', { userId: this.currentUserId });
            
            // 添加服务器返回的进行中任务
            processingTasks.forEach(task => {
              // 将服务器类型映射到前端类型
              const frontendType = this.mapServerDocumentType(task.type);
              
              this.$store.dispatch('tasks/addDownloadTask', {
                taskId: task.taskId,
                type: frontendType,
                userId: this.currentUserId,
                status: task.status,
                progress: task.progress
              });
            });
          }
          
          // 保存到localStorage（只保存更新的任务）
          this.savePendingTasksToStorage();
          
          console.log('� [DEBUG] 服务器加载完成后的本地任务:', JSON.parse(JSON.stringify(this.pendingTasks)));
        } else {
          // 服务器没有任务数据，但不要清空本地已完成的任务
          console.log('� [DEBUG] 服务器无pending任务，保持本地已完成任务');
          // 移除本地所有进行中的任务（因为服务器说没有pending任务）
          Object.keys(this.pendingTasks).forEach(type => {
            const task = this.pendingTasks[type];
            if (task.status === 'processing') {
              console.log(`� [DEBUG] 移除本地进行中的任务: ${type}`);
              this.$delete(this.pendingTasks, type);
            }
          });
          this.savePendingTasksToStorage();
        }
      } catch (error) {
        console.error('📡 [DEBUG] 从服务器加载pending任务失败:', error);
        // 网络错误时仍然使用localStorage中的数据，但要告知用户
        console.log('📡 [DEBUG] 网络错误，使用本地缓存数据');
      }
    },
    
    // 从localStorage加载待处理任务
    loadPendingTasksFromStorage() {
      try {
        const storageKey = this.getStorageKey();
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          this.pendingTasks = JSON.parse(saved);
          console.log(`Loaded pending tasks from storage for user ${this.currentUserId}:`, this.pendingTasks);
          
          // 清理重复的任务类型
          this.cleanupDuplicateTaskTypes();
          
          // 如果有清理操作，重新保存
          this.savePendingTasksToStorage();
        } else {
          // 兼容旧版本：尝试加载通用键的数据
          const oldSaved = localStorage.getItem('documentPendingTasks');
          if (oldSaved && !this.currentUserId) {
            this.pendingTasks = JSON.parse(oldSaved);
            console.log('Loaded pending tasks from legacy storage:', this.pendingTasks);
            
            // 清理重复的任务类型
            this.cleanupDuplicateTaskTypes();
            
            // 如果有清理操作，重新保存
            this.savePendingTasksToStorage();
          }
        }
      } catch (error) {
        console.error('Failed to load pending tasks from storage:', error);
      }
    },
    
    // 保存待处理任务到localStorage
    savePendingTasksToStorage() {
      try {
        const storageKey = this.getStorageKey();
        localStorage.setItem(storageKey, JSON.stringify(this.pendingTasks));
        console.log(`Saved pending tasks to storage for user ${this.currentUserId}`);
      } catch (error) {
        console.error('Failed to save pending tasks to storage:', error);
      }
    },

    // 获取存储键
    getStorageKey() {
      return this.currentUserId ? `documentTasks_${this.currentUserId}` : 'documentTasks';
    },
    
    // 验证任务状态，移除已经不存在或已完成的任务
    async validateTaskStates() {
      if (Object.keys(this.pendingTasks).length === 0) {
        console.log('� [DEBUG] 没有待验证的任务');
        return;
      }
      
      console.log('🔍 [DEBUG] validateTaskStates 开始验证本地任务的实际状态');
      console.log('🔍 [DEBUG] 验证前的本地任务:', JSON.parse(JSON.stringify(this.pendingTasks)));
      
      try {
        const axios = (await import('axios')).default;
        const tasksToRemove = [];
        
        // 检查每个本地任务的实际状态
        for (const [type, task] of Object.entries(this.pendingTasks)) {
          console.log(`🔍 [DEBUG] 验证任务 ${type}:`, JSON.parse(JSON.stringify(task)));
          
          if (task.status === 'processing') {
            try {
              const response = await axios.get(`/api/submissions/pdf_status/${task.taskId}`, {
                withCredentials: true
              });
              
              if (response.data.success) {
                const serverTask = response.data.task;
                console.log(`� [DEBUG] 任务 ${type} 服务器实际状态:`, JSON.parse(JSON.stringify(serverTask)));
                
                if (serverTask.status === 'generated') {
                  // 任务已生成，但本地还显示为进行中，更新状态
                  console.log(`🔍 [DEBUG] 任务 ${type} 实际已生成，更新本地状态`);
                  this.$set(this.pendingTasks, type, {
                    ...task,
                    status: 'generated',
                    progress: 100
                  });
                  
                  // 同时更新全局store中的任务状态
                  if (this.$store) {
                    this.$store.dispatch('tasks/generateTask', {
                      taskId: task.taskId
                    });
                  }
                } else if (serverTask.status === 'failed') {
                  // 任务失败，移除
                  console.log(`🔍 [DEBUG] 任务 ${type} 实际已失败，标记移除`);
                  tasksToRemove.push(type);
                } else {
                  // 任务仍在进行中，更新进度
                  console.log(`🔍 [DEBUG] 任务 ${type} 仍在进行中，更新进度`);
                  this.$set(this.pendingTasks, type, {
                    ...task,
                    status: serverTask.status,
                    progress: serverTask.progress || 0
                  });
                }
              } else {
                // 任务不存在，移除
                console.log(`� [DEBUG] 任务 ${type} 服务器返回失败，标记移除`);
                tasksToRemove.push(type);
              }
            } catch (error) {
              if (error.response && error.response.status === 404) {
                // 任务不存在，移除
                console.log(`� [DEBUG] 任务 ${type} 404错误，标记移除`);
                tasksToRemove.push(type);
              } else {
                console.warn(`🔍 [DEBUG] 验证任务 ${type} 状态时出错:`, error);
              }
            }
          } else {
            console.log(`🔍 [DEBUG] 任务 ${type} 不是processing状态，跳过验证`);
          }
        }
        
        // 移除无效的任务
        tasksToRemove.forEach(type => {
          console.log(`🔍 [DEBUG] 移除无效任务: ${type}`);
          this.$delete(this.pendingTasks, type);
        });
        
        if (tasksToRemove.length > 0) {
          console.log(`🔍 [DEBUG] 已移除 ${tasksToRemove.length} 个无效任务:`, tasksToRemove);
          this.savePendingTasksToStorage();
        }
        
        console.log('🔍 [DEBUG] 验证完成后的本地任务:', JSON.parse(JSON.stringify(this.pendingTasks)));
        console.log('🔍 [DEBUG] validateTaskStates 执行完成');
        
      } catch (error) {
        console.error('🔍 [DEBUG] 验证任务状态时出错:', error);
      }
    },
    
    // 开始后台轮询
    startBackgroundPolling() {
      if (this.backgroundPollingTimer) return;
      
      this.backgroundPollingTimer = setInterval(() => {
        this.checkPendingTasks();
      }, this.backgroundPollingInterval);
      
      console.log('Started background polling for document generation');
    },
    
    // 停止后台轮询
    stopBackgroundPolling() {
      if (this.backgroundPollingTimer) {
        clearInterval(this.backgroundPollingTimer);
        this.backgroundPollingTimer = null;
        console.log('Stopped background polling');
      }
    },

    // 清理资源
    cleanup() {
      this.stopBackgroundPolling();
      this.closeSSEService();
    },

    // 使用sseService初始化SSE连接
    async initSSEService() {
      try {
        console.log('📡 DocumentManagement: 订阅SSE服务...');
        
        // 通过store注册为订阅者
        this.$store.dispatch('sse/subscribe', 'DocumentManagement');
        
        // DocumentManagement 作为默认处理器，不提供taskChecker，这样它会处理所有没有被其他组件声明的任务
        this.$globalSSEManager.registerComponent('DocumentManagement', this.handleSSECompleted);
        
        // 直接注册其他事件到sseService
        sseService.on('progress', this.handleSSEProgress);
        sseService.on('failed', this.handleSSEFailed);
        
        // 监听连接状态，连接建立后同步任务状态
        if (this.$store.getters['sse/isConnected']) {
          this.syncPendingTasksOnSSEConnected();
        } else {
          // 等待连接建立
          const unsubscribe = this.$store.watch(
            (state) => state.sse.isConnected,
            (isConnected) => {
              if (isConnected) {
                this.syncPendingTasksOnSSEConnected();
                unsubscribe(); // 只监听一次
              }
            }
          );
        }
        
      } catch (error) {
        console.error('❌ DocumentManagement: 初始化SSE连接失败:', error);
        this.useSSE = false;
        this.startBackgroundPolling();
      }
    },

    // 关闭sseService连接
    closeSSEService() {
      console.log('📡 DocumentManagement: 取消SSE订阅...');
      
      // 从全局SSE管理器注销
      this.$globalSSEManager.unregisterComponent('DocumentManagement');
      
      // 移除其他回调函数
      sseService.off('progress', this.handleSSEProgress);
      sseService.off('failed', this.handleSSEFailed);
      
      // 通过store取消订阅
      this.$store.dispatch('sse/unsubscribe', 'DocumentManagement');
    },

    // 处理SSE进度更新
    handleSSEProgress(data) {
      console.log('📊 收到PDF进度更新:', data);
      const { taskId, status, progress, error } = data;
      
      // 更新全局 store 中的任务进度
      if (this.$store) {
        this.$store.dispatch('tasks/updateTaskProgress', {
          taskId: taskId,
          progress: progress || 0
        });
      }
      
      // 查找对应的任务类型（优先查找全局任务，然后查找本地任务）
      let foundTask = false;
      
      // 先在 allPendingTasks 中查找
      for (const [type, task] of Object.entries(this.allPendingTasks)) {
        if (task.taskId === taskId) {
          // 更新本地任务状态
          this.$set(this.pendingTasks, type, {
            ...task,
            status: status,
            progress: progress || 0,
            error: error
          });
          
          this.savePendingTasksToStorage();
          foundTask = true;
          break;
        }
      }
      
      // 如果本地没有找到，可能是来自其他地方（如 UserDashboard）的任务
      if (!foundTask && this.$store && this.currentUserId) {
        const storeTask = this.$store.getters['tasks/getTaskById'](taskId);
        if (storeTask && storeTask.userId === this.currentUserId) {
          // 将 store 中的任务添加到本地
          this.$set(this.pendingTasks, storeTask.type, {
            taskId: taskId,
            status: status,
            progress: progress || 0,
            startTime: storeTask.startTime,
            error: error
          });
          
          this.savePendingTasksToStorage();
        }
      }
    },

    // 处理SSE完成通知
    handleSSECompleted(data) {
      console.log('✅ 收到PDF完成通知:', data);
      const { taskId, documentType, fromDownloadCompletion = false } = data;
      
      // 将服务器类型映射到前端类型
      const frontendType = this.mapServerDocumentType(documentType);
      
      if (fromDownloadCompletion) {
        console.log('📥 收到来自其他标签页的下载完成通知，更新任务状态');
        // 只更新任务状态，不触发下载
        this.updateTaskStatusOnly(taskId, frontendType);
        return;
      }
      
      // 防止重复处理同一个任务的完成通知 - 使用全局状态
      const completionKey = `completed_${taskId}`;
      if (this.$store.getters['tasks/isDownloading'](completionKey)) {
        console.log(`❌ 任务 ${taskId} 的完成通知已处理过，跳过重复处理`);
        return;
      }
      
      // 标记已处理 - 使用全局状态
      this.$store.dispatch('tasks/startDownload', completionKey);
      
      // 延迟处理，防止并发问题
      setTimeout(() => {
        this._handleSSECompletedInternal(taskId, frontendType);
        // 5秒后清除标记
        setTimeout(() => {
          this.$store.dispatch('tasks/finishDownload', completionKey);
        }, 5000);
      }, 100);
    },

    // 仅更新任务状态，不触发下载（用于处理其他标签页的下载完成通知）
    updateTaskStatusOnly(taskId, frontendDocumentType) {
      console.log(`📄 更新任务状态: ${taskId} → 已下载（跨标签页）`);
      
      // 更新全局 store 中的任务状态
      if (this.$store) {
        console.log(`🔍 Store更新前的任务:`, this.$store.getters['tasks/getTaskById'](taskId));
        this.$store.dispatch('tasks/downloadTask', {
          taskId: taskId
        });
        console.log(`🔍 Store更新后的任务:`, this.$store.getters['tasks/getTaskById'](taskId));
      }
      
      // 查找对应的任务并移除（跨标签页下载的任务不应该在当前页面显示）
      let taskFound = false;
      for (const [type, task] of Object.entries(this.pendingTasks)) {
        if (task.taskId === taskId) {
          console.log(`🔍 找到任务 ${type}, 当前状态:`, task.status);
          console.log(`🗑️ 移除跨标签页下载的任务 ${type}`);
          this.$delete(this.pendingTasks, type);
          this.savePendingTasksToStorage();
          taskFound = true;
          break;
        }
      }
      
      if (!taskFound) {
        console.warn(`⚠️ 未找到任务 ${taskId} 在本地任务列表中`);
        console.log(`🔍 当前pendingTasks:`, this.pendingTasks);
        console.log(`🔍 当前allPendingTasks:`, this.allPendingTasks);
      }
      
      // 强制Vue重新渲染
      this.$forceUpdate();
      
      // 再次确认状态更新
      this.$nextTick(() => {
        console.log(`🔄 Vue更新后的allPendingTasks:`, this.allPendingTasks);
        console.log(`🔄 Vue更新后是否还有待处理任务:`, this.hasPendingTasks);
      });
    },

    // 内部处理SSE生成完成通知的逻辑
    _handleSSECompletedInternal(taskId, documentType) {
      // 更新全局 store 中的任务状态为已生成
      if (this.$store) {
        this.$store.dispatch('tasks/generateTask', {
          taskId: taskId
        });
      }
      
      // 查找对应的任务类型（只在本地pendingTasks中查找）
      let foundTask = false;
      
      // 在本地pendingTasks中查找
      for (const [type, task] of Object.entries(this.pendingTasks)) {
        if (task.taskId === taskId) {
          // 检查任务是否已经是生成状态，避免重复处理
          if (task.status === 'generated') {
            console.log(`⚠️ 任务 ${taskId} 已经是生成状态，跳过重复处理`);
            foundTask = true;
            break;
          }
          
          // 检查是否是本页面发起的任务
          if (!task.initiatedInCurrentPage) {
            console.log(`📋 任务 ${taskId} 不是在当前页面发起的，不显示下载按钮`);
            // 只更新状态，不显示下载按钮
            this.$delete(this.pendingTasks, type);
            this.savePendingTasksToStorage();
            foundTask = true;
            break;
          }
          
          // 更新本地任务状态为已生成
          this.$set(this.pendingTasks, type, {
            ...task,
            status: 'generated',
            progress: 100
          });
          
          // 显示生成完成通知
          if (this.autoDownload) {
            this.$notify({
              title: 'Document Ready',
              message: `Your ${this.getDocumentTypeName(type)} is ready and will download automatically!`,
              type: 'success',
              duration: 3000
            });
            
            // 自动下载
            setTimeout(() => {
              this.downloadGeneratedTask(type, taskId);
            }, 1000);
          } else {
            this.$notify({
              title: 'Document Ready',
              message: `Your ${this.getDocumentTypeName(type)} is ready for download!`,
              type: 'success',
              duration: 5000
            });
          }
          
          this.savePendingTasksToStorage();
          foundTask = true;
          break;
        }
      }
      
      // 如果本地没有找到，说明任务不是在DocumentManagement中发起的
      if (!foundTask) {
        console.log(`📋 任务 ${taskId} 不是在DocumentManagement中发起的，不在此页面显示生成完成状态`);
      }
    },

    // 处理SSE失败通知
    handleSSEFailed(data) {
      console.log('❌ 收到PDF失败通知:', data);
      const { taskId, error } = data;
      
      // 更新全局 store 中的任务状态
      if (this.$store) {
        this.$store.dispatch('tasks/failTask', {
          taskId: taskId,
          error: error || 'Unknown error'
        });
      }
      
      // 查找对应的任务类型（优先查找全局任务，然后查找本地任务）
      let foundTask = false;
      
      // 先在 allPendingTasks 中查找
      for (const [type, task] of Object.entries(this.allPendingTasks)) {
        if (task.taskId === taskId) {
          this.$notify({
            title: 'Generation Failed',
            message: `Failed to generate ${this.getDocumentTypeName(type)}: ${error}`,
            type: 'error'
          });
          this.$delete(this.pendingTasks, type);
          this.savePendingTasksToStorage();
          foundTask = true;
          break;
        }
      }
      
      // 如果本地没有找到，可能是来自其他地方（如 UserDashboard）的任务
      if (!foundTask && this.$store && this.currentUserId) {
        const storeTask = this.$store.getters['tasks/getTaskById'](taskId);
        if (storeTask && storeTask.userId === this.currentUserId) {
          // 将服务器类型映射到前端类型以获取正确的名称
          const frontendType = this.mapServerDocumentType(storeTask.type);
          this.$notify({
            title: 'Generation Failed',
            message: `Failed to generate ${this.getDocumentTypeName(frontendType)}: ${error}`,
            type: 'error'
          });
        }
      }
    },

    // 处理SSE错误
    handleSSEError(error) {
      console.error('📡 SSE连接错误:', error);
      this.useSSE = false;
      this.startBackgroundPolling();
    },

    // SSE连接建立后同步进行中的任务状态
    async syncPendingTasksOnSSEConnected() {
      console.log('🔄 SSE连接已建立，同步当前进行中的任务...');
      
      // 检查localStorage中是否有进行中的任务
      const pendingTasks = Object.entries(this.pendingTasks).filter(
        ([type, task]) => task.status === 'processing'
      );
      
      if (pendingTasks.length === 0) {
        console.log('📭 没有进行中的任务需要同步');
        return;
      }
      
      console.log(`🔄 发现 ${pendingTasks.length} 个进行中的任务，开始同步状态...`);
      
      // 为每个进行中的任务查询最新状态
      for (const [type, task] of pendingTasks) {
        try {
          console.log(`🔍 查询任务状态: ${type} (${task.taskId})`);
          const response = await this.$http.get(`/api/submissions/pdf_status/${task.taskId}`);
          
          if (response.data.success) {
            const latestTask = response.data.task;
            console.log(`📊 任务 ${type} 最新状态:`, latestTask);
            
            // 更新本地任务状态
            this.pendingTasks[type] = {
              ...task,
              status: latestTask.status,
              progress: latestTask.progress,
              error: latestTask.error
            };
            
            // 如果任务已生成，检查是否应该自动下载
            if (latestTask.status === 'generated') {
              console.log(`✅ 任务 ${type} 已生成，检查是否应该自动下载`);
              
              // 检查任务生成时间，如果是最近生成的（比如30秒内），可能是其他页面刚生成的
              const now = Date.now();
              const taskGeneratedTime = new Date(latestTask.updatedAt || latestTask.createdAt).getTime();
              const timeDiff = now - taskGeneratedTime;
              
              if (timeDiff < 30000) { // 30秒内生成的任务
                console.log(`⏰ 任务 ${type} 是最近生成的（${Math.round(timeDiff/1000)}秒前），跳过自动下载以避免冲突`);
                // 只更新状态，不自动下载
                continue;
              }
              
              // 老任务可以自动下载
              console.log(`📥 任务 ${type} 是较早生成的任务，触发自动下载`);
              this._handleSSECompletedInternal(task.taskId, type);
            } else if (latestTask.status === 'failed') {
              console.log(`❌ 任务 ${type} 已失败:`, latestTask.error);
              this.$message.error(`${this.getDocumentTypeName(type)} generation failed: ${latestTask.error}`);
              this.$delete(this.pendingTasks, type);
            }
          }
        } catch (error) {
          console.error(`查询任务 ${type} 状态失败:`, error);
          // 如果查询失败，可能任务已经不存在了，从localStorage中移除
          if (error.response && error.response.status === 404) {
            console.log(`🗑️ 任务 ${type} 不存在，从localStorage中移除`);
            this.$delete(this.pendingTasks, type);
          }
        }
      }
      
      // 保存更新后的任务状态
      this.savePendingTasksToStorage();
      console.log('🔄 任务状态同步完成');
    },

    
    // 检查待处理任务状态
    async checkPendingTasks() {
      if (!this.hasPendingTasks) return;
      
      // 如果使用SSE，只需要偶尔检查一下，主要依赖SSE推送
      if (this.useSSE && sseService.connected) {
        console.log('📡 使用SSE模式，跳过主动轮询');
        return;
      }
      
      try {
        const axios = (await import('axios')).default;
        
        for (const [type, task] of Object.entries(this.pendingTasks)) {
          if (task.status === 'completed' || task.status === 'failed') continue;
          
          const statusResponse = await axios.get(`/api/submissions/pdf_status/${task.taskId}`, {
            withCredentials: true
          });
          
          if (statusResponse.data.success) {
            const taskStatus = statusResponse.data.task;
            
            // 更新任务状态
            this.pendingTasks[type] = {
              ...task,
              status: taskStatus.status,
              progress: taskStatus.progress,
              error: taskStatus.error
            };
            
            // 如果任务生成，显示通知
            if (taskStatus.status === 'generated' && task.status !== 'generated') {
              // 检查是否已经处理过这个任务的生成状态，避免重复下载 - 使用全局状态
              const completionKey = `polling_generated_${task.taskId}`;
              if (this.$store.getters['tasks/isDownloading'](completionKey)) {
                console.log(`❌ 轮询发现任务 ${task.taskId} 已处理过生成状态，跳过重复处理`);
                continue;
              }
              
              // 标记已处理 - 使用全局状态
              this.$store.dispatch('tasks/startDownload', completionKey);
              
              if (this.autoDownload) {
                this.$notify({
                  title: 'Document Ready',
                  message: `Your ${this.getDocumentTypeName(type)} is ready and will download automatically!`,
                  type: 'success',
                  duration: 3000
                });
                
                // 自动下载
                setTimeout(() => {
                  this.downloadGeneratedTask(type, task.taskId);
                  // 清除标记 - 使用全局状态
                  this.$store.dispatch('tasks/finishDownload', completionKey);
                }, 1000); // 延迟1秒后自动下载
              } else {
                this.$notify({
                  title: 'Document Ready',
                  message: `Your ${this.getDocumentTypeName(type)} is ready for download!`,
                  type: 'success',
                  duration: 0,
                  onClick: () => {
                    this.downloadGeneratedTask(type, task.taskId);
                    // 清除标记 - 使用全局状态
                    this.$store.dispatch('tasks/finishDownload', completionKey);
                  }
                });
              }
            } else if (taskStatus.status === 'failed') {
              this.$notify({
                title: 'Generation Failed',
                message: `Failed to generate ${this.getDocumentTypeName(type)}: ${taskStatus.error}`,
                type: 'error'
              });
              // 移除失败的任务
              this.$delete(this.pendingTasks, type);
            }
          }
        }
        
        // 保存更新后的任务状态
        this.savePendingTasksToStorage();
        
      } catch (error) {
        console.error('Error checking pending tasks:', error);
      }
    },
    
    // 下载已生成的任务
    async downloadGeneratedTask(type, taskId) {
      const downloadManager = this.$getDownloadManager();
      if (!downloadManager) {
        console.error('下载管理器未初始化');
        return;
      }
      
      const downloadKey = downloadManager.generateDownloadKey('doc', taskId, type);
      
      await downloadManager.downloadPDF({
        taskId,
        type,
        downloadKey,
        filename: this.getDocumentFileName(type),
        context: this,
        onSuccess: (taskId, type) => {
          console.log(`✅ 下载完成，将任务状态更新为已下载: ${type} (${taskId})`);
          
          // 更新任务状态为已下载并移除显示
          this.$delete(this.pendingTasks, type);
          this.savePendingTasksToStorage();
          
          // 更新全局 store 中的任务状态为已下载
          if (this.$store) {
            this.$store.dispatch('tasks/downloadTask', { taskId });
          }
          
          // 更新下载历史
          this.updateDownloadHistory(type);
          
          // 强制Vue重新渲染，确保UI正确更新
          this.$forceUpdate();
        },
        onError: (error) => {
          console.error('Download generated task error:', error);
        }
      });
    },
    
    // 获取下载按钮文字
    getDownloadButtonText(type) {
      const task = this.allPendingTasks[type];
      console.log(`🔽 [DEBUG] getDownloadButtonText(${type}):`, {
        hasTask: !!task,
        taskStatus: task?.status,
        autoDownload: this.autoDownload
      });
      
      if (task) {
        if (task.status === 'processing') {
          return 'Generating...';
        } else if (task.status === 'generated') {
          return 'Download Ready';
        }
      }
      // 根据自动下载选项决定是否显示 "& Download"
      return this.autoDownload ? 'Generate & Download' : 'Generate';
    },
    
    async downloadDocument(type) {
      try {
        this.downloadLoading[type] = true;
        
        // 检查是否已有待处理任务
        if (this.pendingTasks[type]) {
          const task = this.pendingTasks[type];
          if (task.status === 'generated') {
            await this.downloadGeneratedTask(type, task.taskId);
            return;
          } else if (task.status === 'processing') {
            this.$message.info(`${this.getDocumentTypeName(type)} is already being generated. Please wait...`);
            return;
          }
        }
        
        if (type === 'confirmation' || type === 'receipt' || type === 'registration') {
          const axios = (await import('axios')).default;
          
          this.$message.info(`Starting generation of ${this.getDocumentTypeName(type)}...`);
          
          // 使用新的异步接口
          await this.startDocumentGeneration(axios, type);
          
        } else if (type === 'certificate') {
          if (!this.isCertificateAvailable) {
            this.$message.warning('Certificate will be available after the conference ends');
            return;
          }
          
          this.$message.info('Certificate download feature is under development');
        }
        
      } catch (error) {
        console.error(`Download ${type} failed:`, error);
        if (error.response && error.response.status === 404) {
          this.$message.error('No approved registration found. Please complete your registration first.');
        } else {
          this.$message.error(`Failed to start generation of ${this.getDocumentTypeName(type)}: ${error.message || error}`);
        }
      } finally {
        this.downloadLoading[type] = false;
      }
    },

    async startDocumentGeneration(axios, type) {
      try {
        // 第一步：启动PDF生成
        let generateEndpoint;
        switch (type) {
          case 'confirmation':
            generateEndpoint = '/api/submissions/generate_confirmation';
            break;
          case 'receipt':
            generateEndpoint = '/api/submissions/generate_receipt';
            break;
          case 'registration':
            generateEndpoint = '/api/submissions/generate_registration';
            break;
          default:
            generateEndpoint = '/api/submissions/generate_receipt';
        }

        const generateResponse = await axios.post(generateEndpoint, {
          marginMode: this.pdfMarginMode
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
        console.log(`PDF generation started with task ID: ${taskId}`);

        // 添加到待处理任务，标记为当前页面发起的任务
        this.$set(this.pendingTasks, type, {
          taskId: taskId,
          status: 'processing',
          progress: 0,
          startTime: Date.now(),
          initiatedInCurrentPage: true // 标记为当前页面发起的任务
        });
        this.savePendingTasksToStorage();

        // 将任务添加到全局 store
        if (this.$store && this.currentUserId) {
          this.$store.dispatch('tasks/addDownloadTask', {
            taskId: taskId,
            type: type,
            userId: this.currentUserId
          });
        }

        this.$message.success(`${this.getDocumentTypeName(type)} generation started! You will be notified when it's ready.`);

      } catch (error) {
        console.error('Start generation error:', error);
        
        // 如果是409冲突错误（重复任务），尝试使用旧的同步接口作为备用
        if (error.response && error.response.status === 409) {
          console.log('Conflict detected, trying fallback to sync interface...');
          await this.downloadDocumentFallback(axios, type);
          return;
        }
        
        throw error;
      }
    },

    async downloadDocumentFallback(axios, type) {
      // 备用：使用旧的同步接口
      console.log('Using fallback sync interface for', type);
      
      let endpoint;
      switch (type) {
        case 'confirmation':
          endpoint = '/api/submissions/download_confirmation';
          break;
        case 'receipt':
          endpoint = '/api/submissions/download_receipt';
          break;
        case 'registration':
          endpoint = '/api/submissions/download_registration';
          break;
        default:
          endpoint = '/api/submissions/download_receipt';
      }
      
      const response = await axios.get(endpoint, {
        withCredentials: true,
        responseType: 'blob',
        params: {
          marginMode: this.pdfMarginMode
        }
      });

      // 创建下载链接
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = this.getDocumentFileName(type);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      this.$message.success(`${this.getDocumentTypeName(type)} downloaded successfully`);
      
      // 更新下载历史
      this.updateDownloadHistory(type);
    },
    
    async redownloadDocument(historyItem) {
      await this.downloadDocument(historyItem.documentType);
    },
    
    getDocumentFileName(type) {
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const fileNames = {
        'confirmation': `ICPADS2025_Confirmation_Letter_${timestamp}.pdf`,
        'receipt': `ICPADS2025_Payment_Receipt_${timestamp}.pdf`,
        'registration': `ICPADS2025_Registration_Information_${timestamp}.pdf`,
        'certificate': `ICPADS2025_Attendance_Certificate_${timestamp}.pdf`
      };
      return fileNames[type] || `ICPADS2025_Document_${timestamp}.pdf`;
    },
    
    getDocumentTypeName(type) {
      const typeNames = {
        'confirmation': 'Confirmation Letter',
        'receipt': 'Receipt',
        'registration': 'Registration Information',
        'certificate': 'Certificate'
      };
      return typeNames[type] || type;
    },
    
    updateDownloadHistory(type) {
      const existingRecord = this.downloadHistory.find(item => item.documentType === type);
      
      if (existingRecord) {
        existingRecord.downloadCount++;
        existingRecord.downloadTime = new Date().toISOString();
      } else {
        this.downloadHistory.unshift({
          id: Date.now(),
          documentType: type,
          downloadTime: new Date().toISOString(),
          fileSize: Math.floor(Math.random() * 500000) + 100000,
          downloadCount: 1
        });
      }
    },
    
    formatDate(dateString) {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleString('zh-CN');
    },
    
    formatDateOnly(dateString) {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleDateString('zh-CN');
    },
    
    formatTimeOnly(dateString) {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleTimeString('zh-CN');
    },
    
    formatFileSize(bytes) {
      if (!bytes) return 'N/A';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
  }
};
</script>

<style scoped>
.document-management {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 32px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px 0;
}

.header-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.header-right {
  display: flex;
  align-items: center;
  margin-top: 8px;
}

.card-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.card-subtitle {
  color: #909399;
  font-size: 16px;
  margin: 0;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.document-content {
  margin-top: 16px;
}

.pending-downloads {
  background: #e6f7ff;
  border: 1px solid #91d5ff;
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 16px;
}

.progress-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-icon {
  color: #1890ff;
  font-size: 16px;
}

.progress-icon .el-icon-loading {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.progress-tasks {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.pending-task {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.task-name {
  font-weight: 500;
  color: #303133;
}

.task-status {
  display: flex;
  align-items: center;
  gap: 4px;
}

.task-status.processing {
  color: #1890ff;
}

.task-status.generated {
  color: #52c41a;
}

.task-status.generated .el-icon-circle-check {
  color: #52c41a;
  margin-right: 3px;
}

.task-status.failed {
  color: #ff4d4f;
}

.task-status.failed .el-icon-circle-close {
  color: #ff4d4f;
  margin-right: 3px;
}

.task-status .el-button {
  padding: 4px 8px;
  font-size: 11px;
  margin-left: 4px;
  min-width: 60px;
  height: 22px;
}

.task-status .el-button.el-button--mini {
  border-radius: 4px;
}

.task-status .el-button i {
  font-size: 10px;
  margin-right: 2px;
}

.pending-task {
  margin: 4px 0;
  font-size: 14px;
}

.format-selection {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.format-selection h4 {
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
}

.options-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.format-radios {
  flex: 1;
}

.format-radios .el-radio {
  margin-right: 16px;
}

.download-settings {
  background: none;
  border: none;
  padding: 0;
  margin: 0;
}

.download-settings .el-checkbox {
  font-size: 13px;
  color: #606266;
}

.format-description {
  color: #909399;
  font-size: 14px;
  margin-top: 12px;
  margin-bottom: 0;
}

.document-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.document-card {
  text-align: center;
  padding: 32px 20px;
  border-radius: 12px;
  transition: all 0.3s ease;
  border: 1px solid #ebeef5;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.document-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
}

.document-icon {
  font-size: 56px;
  color: #409EFF;
  margin-bottom: 18px;
}

.document-card h4 {
  color: #303133;
  font-size: 19px;
  font-weight: 600;
  margin: 16px 0 10px 0;
}

.document-card p {
  color: #909399;
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 20px;
}

.document-card .el-button {
  width: 85%;
  padding: 11px 22px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 15px;
}

.registration-overview {
  margin: 48px 0;
}

.registration-overview h4 {
  color: #303133;
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 3px solid #f0f2f5;
}

.el-table {
  border-radius: 8px;
  overflow: hidden;
}

.el-button {
  border-radius: 6px;
}

.el-tag {
  border-radius: 4px;
}

/* 图标颜色自定义 */
.document-card:nth-child(1) .document-icon {
  color: #67C23A;
}

.document-card:nth-child(2) .document-icon {
  color: #E6A23C;
}

.document-card:nth-child(3) .document-icon {
  color: #909399;
}

.document-card:nth-child(4) .document-icon {
  color: #409EFF;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .document-grid {
    grid-template-columns: 1fr;
    gap: 18px;
  }
  
  .document-card {
    padding: 24px 18px;
    min-height: 200px;
  }
  
  .document-icon {
    font-size: 42px;
  }
  
  .options-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .format-radios .el-radio {
    margin-right: 12px;
    margin-bottom: 8px;
  }
  
  .progress-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  
  .progress-tasks {
    flex-direction: column;
    gap: 8px;
  }
  
  .task-status .el-button {
    min-width: 70px;
    height: 24px;
    font-size: 12px;
  }
}

/* 按钮状态样式 */
.el-button[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
}

.el-button.is-loading {
  pointer-events: none;
}

/* 空状态样式 */
.el-empty {
  padding: 30px 0;
}

/* 注册时间显示样式 */
.registration-time {
  line-height: 1.2;
}

.registration-time .time-part {
  color: #909399;
  font-size: 12px;
  margin-top: 2px;
}
</style>
