<template>
  <div class="meal-voucher-management">
    <div class="page-header">
      <h2>Meal Voucher Management</h2>
      <p>Purchase and manage meal vouchers for the conference</p>
    </div>

    <!-- Voucher Information -->
    <div class="voucher-info-section">
      <el-card class="voucher-info-card" shadow="never">
        <div class="voucher-info">
          <div class="voucher-icon">
            <i class="el-icon-food"></i>
          </div>
          <div class="voucher-details">
            <h3>Conference Meal Voucher</h3>
            <p>Includes breakfast, lunch, and refreshments during conference days</p>
            <div class="price-info">
              <span class="price-usd">$150 USD</span>
              <span class="price-rmb">(RMB ¥1,100)</span>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="2" animated />
    </div>

    <!-- Voucher management content -->
    <div v-else class="voucher-content">
      <!-- Important Notice - Only show when no vouchers -->
      <div v-if="vouchers.length === 0" class="notice-section">
        <el-alert
          type="info"
          :closable="false"
          show-icon>
          <template slot="title">
            <strong>Important Notice</strong>
          </template>
          <div class="notice-content">
            <p>
              <strong>Both full registration and student registration include conference attendance and the banquet.</strong>
              There is no need to purchase meal vouchers separately. If you are not attending the conference or need additional banquet tickets, you may purchase meal vouchers.
            </p>
          </div>
        </el-alert>
      </div>

      <!-- Current vouchers -->
      <div class="current-vouchers-section">
        <div class="section-header">
          <h3>My Vouchers</h3>
          <el-button 
            type="primary" 
            icon="el-icon-plus" 
            @click="showPurchaseDialog = true"
            :disabled="!canPurchase">
            Purchase Vouchers
          </el-button>
        </div>

        <!-- No vouchers state -->
        <div v-if="vouchers.length === 0" class="empty-vouchers">
          <div class="empty-icon">
            <i class="el-icon-tickets"></i>
          </div>
          <h4>No Meal Vouchers</h4>
          <p>You haven't purchased any meal vouchers yet. Purchase vouchers to enjoy conference meals.</p>
          <el-button 
            type="primary" 
            icon="el-icon-plus" 
            @click="showPurchaseDialog = true"
            :disabled="!canPurchase">
            Purchase Your First Vouchers
          </el-button>
        </div>

        <!-- Vouchers list -->
        <div v-else class="vouchers-list">
          <div 
            v-for="voucher in vouchers" 
            :key="voucher.id"
            class="voucher-item">
            <div class="voucher-item-content">
              <div class="voucher-item-left">
                <div class="voucher-status" :class="getStatusClass(voucher.status)">
                  <i :class="getStatusIcon(voucher.status)"></i>
                  {{ getStatusText(voucher.status) }}
                </div>
                <div class="voucher-id">Voucher #{{ voucher.id }}</div>
              </div>
              
              <div class="voucher-item-middle">
                <div class="voucher-info-list">
                  <div class="info-item">
                    <span class="label">Quantity:</span>
                    <span class="value">{{ voucher.quantity }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Total:</span>
                    <span class="value">${{ voucher.total_amount_usd }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Purchased:</span>
                    <span class="value">{{ formatDate(voucher.created_at) }}</span>
                  </div>
                </div>
              </div>
              
              <div class="voucher-item-right">
                <el-dropdown @command="handleVoucherAction" trigger="click">
                  <el-button type="text" icon="el-icon-more"></el-button>
                  <el-dropdown-menu slot="dropdown">
                    <el-dropdown-item :command="{action: 'view', voucher}">
                      <i class="el-icon-view"></i> View Details
                    </el-dropdown-item>
                    <el-dropdown-item 
                      v-if="voucher.status === 'approved'"
                      :command="{action: 'downloadVoucher', voucher}">
                      <i class="el-icon-download"></i> Download Voucher
                    </el-dropdown-item>
                    <el-dropdown-item 
                      v-if="voucher.status === 'active'"
                      :command="{action: 'downloadQR', voucher}">
                      <i class="el-icon-download"></i> Download QR Code
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </el-dropdown>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Purchase dialog -->
    <el-dialog
      title="Purchase Meal Vouchers"
      :visible.sync="showPurchaseDialog"
      width="600px"
      :before-close="handleClosePurchase">
      
      <div class="purchase-form">
        <div class="voucher-preview">
          <div class="preview-info">
            <h4>Conference Meal Voucher</h4>
            <p>Valid for all conference days • Includes all meals and refreshments</p>
            <div class="price-display">
              <span class="unit-price">$150 USD (RMB ¥1,100) per voucher</span>
            </div>
          </div>
        </div>

        <el-form 
          :model="purchaseForm" 
          :rules="purchaseRules" 
          ref="purchaseForm"
          label-width="145px">
          
          <el-form-item label="Quantity" prop="quantity">
            <el-input-number 
              v-model="purchaseForm.quantity"
              :min="1"
              :max="10"
              size="large"
              controls-position="right">
            </el-input-number>
            <div class="quantity-hint">Maximum 10 vouchers per order</div>
          </el-form-item>

          <el-form-item label="Attendee Name" prop="attendee_name">
            <el-input 
              v-model="purchaseForm.attendee_name"
              placeholder="Enter the name for voucher registration"
              size="large">
            </el-input>
            <div class="form-hint">Name that will appear on the vouchers</div>
          </el-form-item>

          <el-form-item label="Email" prop="email">
            <el-input 
              v-model="purchaseForm.email"
              placeholder="Email for voucher confirmation"
              size="large">
            </el-input>
          </el-form-item>

          <el-form-item label="Payment Method" prop="payment_method">
            <el-radio-group v-model="purchaseForm.payment_method" size="medium">
              <el-radio label="international">International Bank Transfer</el-radio>
              <el-radio label="domestic">China Mainland Payment</el-radio>
            </el-radio-group>
          </el-form-item>

          <!-- Payment Details Section - Collapsible -->
          <div v-if="purchaseForm.payment_method" class="payment-details-section">
            <div class="payment-details-collapse">
              <div 
                class="collapse-header"
                @click="togglePaymentDetails"
              >
                <div class="collapse-header-content">
                  <i class="el-icon-info"></i>
                  <span v-if="purchaseForm.payment_method === 'international'">
                    View Bank Transfer Details
                  </span>
                  <span v-else>查看转账信息</span>
                </div>
                <i 
                  class="el-icon-arrow-down collapse-icon"
                  :class="{ 'is-active': showPaymentDetails }"
                ></i>
              </div>
              
              <el-collapse-transition>
                <div v-show="showPaymentDetails" class="collapse-content">
                  <!-- International Bank Transfer Details -->
                  <div v-if="purchaseForm.payment_method === 'international'" class="payment-info-box">
                    <div class="bank-details">
                      <div class="detail-group">
                        <h5>Beneficiary's Details</h5>
                        <p><strong>Account Number:</strong> 01266320164304</p>
                        <p><strong>Name:</strong> YUAN LONGZHI</p>
                        <p><strong>Address:</strong></p>
                        <p class="address-indent">ROOM G7751, YEUNGKIN MAN BUILD.</p>
                        <p class="address-indent">CITY UNIVERSITY OF HONG KONG</p>
                        <p class="address-indent">83,TAT CHEE AVENUE, KLN HONG KONG</p>
                      </div>
                      
                      <div class="detail-group">
                        <h5>Beneficiary's Bank Details</h5>
                        <p><strong>Country / Region:</strong> Hong Kong</p>
                        <p><strong>SWIFT Code:</strong> BKCHHKHHXXX</p>
                        <p><strong>Bank Name:</strong> Bank of China (Hong Kong) Limited</p>
                        <p><strong>Bank Address:</strong> 1 Garden Road, Central, Hong Kong</p>
                      </div>
                      
                      <div class="detail-group">
                        <h5>Transfer Reference</h5>
                        <p><strong>Format:</strong> <code>Name+ICPADS 2025+MealVoucher</code></p>
                        <p class="reference-example">Example: JohnDoe+ICPADS 2025+MealVoucher</p>
                      </div>
                    </div>
                    <div class="payment-note">
                      <i class="el-icon-warning"></i>
                      Please upload payment confirmation screenshot after completing the transfer.
                    </div>
                  </div>

                  <!-- Domestic Payment Details -->
                  <div v-if="purchaseForm.payment_method === 'domestic'" class="payment-info-box domestic">
                    <div class="bank-details">
                      <div class="detail-group">
                        <h5>收款账户信息</h5>
                        <p><strong>账户名称：</strong>合肥博研会议会务服务有限公司</p>
                        <p><strong>开户行：</strong>中国邮政储蓄银行股份有限公司安徽自贸试验区合肥片区支行</p>
                        <p><strong>账户号码：</strong>934012013000728814</p>
                      </div>
                      
                      <div class="detail-group">
                        <h5>转账附言</h5>
                        <p><strong>格式：</strong> <code>姓名+ICPADS 2025+餐券</code></p>
                        <p class="reference-example">示例：张三+ICPADS 2025+餐券</p>
                      </div>
                    </div>
                    <div class="payment-note">
                      <i class="el-icon-warning"></i>
                      支付后请上传支付截图作为凭证。
                    </div>
                  </div>
                </div>
              </el-collapse-transition>
            </div>
          </div>

          <el-form-item label="Payment Proof" prop="payment_screenshot" required>
            <el-upload
              class="upload-demo"
              :auto-upload="false"
              :on-change="handleFileChange"
              :show-file-list="false"
              accept="image/*"
              action="#">
              <el-button size="small" type="primary">
                <i class="el-icon-upload"></i> Upload Screenshot
              </el-button>
            </el-upload>
            <div class="upload-tip">jpg/png files with a size less than 10MB</div>
            
            <div v-if="uploadedProof" class="preview-section">
              <div class="preview-label">Uploaded:</div>
              <div class="preview-content">
                <img :src="uploadedProof" alt="Payment Proof" class="proof-preview-small">
                <el-button 
                  size="mini" 
                  @click="removeProof" 
                  class="remove-btn-inline">
                  Remove
                </el-button>
              </div>
            </div>
          </el-form-item>

          <div class="total-section">
            <div class="total-calculation">
              <div class="calc-row">
                <span>{{ purchaseForm.quantity }} × $150 USD</span>
                <span>${{ calculateTotal() }}</span>
              </div>
              <div class="calc-row rmb">
                <span>{{ purchaseForm.quantity }} × RMB ¥1,100</span>
                <span>RMB ¥{{ calculateTotalRMB() }}</span>
              </div>
            </div>
          </div>
        </el-form>
      </div>
      
      <span slot="footer" class="dialog-footer">
        <el-button @click="handleClosePurchase">Cancel</el-button>
        <el-button 
          type="primary" 
          @click="submitPurchase"
          :loading="purchasing"
          :disabled="!canSubmit">
          Purchase ${{ calculateTotal() }}
        </el-button>
      </span>
    </el-dialog>

    <!-- Voucher detail dialog -->
    <el-dialog
      :title="selectedVoucher ? 'Voucher Details' : ''"
      :visible.sync="detailDialogVisible"
      width="50%">
      
      <div v-if="selectedVoucher" class="voucher-detail">
        <div class="detail-section">
          <h4>Voucher Information</h4>
          <el-row :gutter="20">
            <el-col :span="12">
              <div class="detail-item">
                <label>Voucher ID:</label>
                <span>{{ selectedVoucher.id }}</span>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="detail-item">
                <label>Status:</label>
                <el-tag :type="getStatusTagType(selectedVoucher.status)">
                  {{ getStatusText(selectedVoucher.status) }}
                </el-tag>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="detail-item">
                <label>Quantity:</label>
                <span>{{ selectedVoucher.quantity }}</span>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="detail-item">
                <label>Total Amount:</label>
                <span>${{ selectedVoucher.total_amount_usd }} (¥{{ selectedVoucher.total_amount_rmb }})</span>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="detail-item">
                <label>Attendee Name:</label>
                <span>{{ selectedVoucher.attendee_name }}</span>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="detail-item">
                <label>Purchase Date:</label>
                <span>{{ formatDate(selectedVoucher.created_at) }}</span>
              </div>
            </el-col>
          </el-row>
        </div>
      </div>
      
      <span slot="footer" class="dialog-footer">
        <el-button @click="detailDialogVisible = false">Close</el-button>
        <el-button 
          v-if="selectedVoucher && selectedVoucher.status === 'approved'"
          type="primary" 
          @click="downloadVoucher(selectedVoucher)">
          Download Voucher
        </el-button>
        <el-button 
          v-if="selectedVoucher && selectedVoucher.status === 'active'"
          type="success" 
          @click="downloadVoucherQR(selectedVoucher)">
          Download QR Code
        </el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { sseService } from '../../_services/sse.service.js';

export default {
  name: 'MealVoucherManagement',
  data() {
    return {
      loading: true,
      vouchers: [],
      showPurchaseDialog: false,
      detailDialogVisible: false,
      selectedVoucher: null,
      purchasing: false,
      uploadedProof: null,
      paymentFile: null,
      showPaymentDetails: false, // 控制支付详情折叠
      pendingDownloadTasks: {}, // 存储待处理的下载任务
      currentUserId: null,
      purchaseForm: {
        quantity: 1,
        attendee_name: '',
        email: '',
        payment_method: 'international',
        payment_screenshot: '' // 添加这个字段用于验证
      },
      purchaseRules: {
        quantity: [
          { required: true, message: 'Please select quantity', trigger: 'change' },
          { type: 'number', min: 1, max: 10, message: 'Quantity must be between 1 and 10', trigger: 'change' }
        ],
        attendee_name: [
          { required: true, message: 'Please enter attendee name', trigger: 'blur' },
          { min: 2, max: 50, message: 'Name should be between 2 and 50 characters', trigger: 'blur' }
        ],
        email: [
          { required: true, message: 'Please enter email', trigger: 'blur' },
          { type: 'email', message: 'Please enter a valid email', trigger: 'blur' }
        ],
        payment_method: [
          { required: true, message: 'Please select payment method', trigger: 'change' }
        ]
      }
    };
  },
  computed: {
    canPurchase() {
      // 简化逻辑，实际应该检查用户是否有有效的注册
      return true;
    },
    canSubmit() {
      return this.purchaseForm.quantity >= 1 &&
             this.purchaseForm.attendee_name &&
             this.purchaseForm.email &&
             this.purchaseForm.payment_method &&
             this.uploadedProof;
    }
  },
  async mounted() {
    await this.loadVouchers();
    await this.initUserInfo();
    this.addPaymentScreenshotRule();
    this.initializeSSE();
  },
  beforeDestroy() {
    this.cleanupSSE();
  },
  methods: {
    // 初始化 SSE 连接
    initializeSSE() {
      console.log('📡 MealVoucherManagement: 初始化SSE连接');
      
      // 获取当前用户ID
      if (this.$store && this.$store.state.account && this.$store.state.account.user) {
        this.currentUserId = this.$store.state.account.user.id;
      }
      
      // 注册到全局SSE管理器，提供回调函数和 taskChecker 方法
      if (this.$globalSSEManager) {
        const componentId = `MealVoucherManagement_${this.$route.path}`;
        this.$globalSSEManager.registerComponent(
          componentId,
          // callback: 处理 SSE 事件的回调函数
          (data) => {
            console.log('📄 MealVoucherManagement: 通过全局管理器收到事件:', data);
            if (data.type === 'pdf_completed') {
              this.handleSSECompleted(data);
            } else if (data.type === 'pdf_failed') {
              this.handleSSEFailed(data);
            }
          },
          // taskChecker: 检查任务是否属于本组件
          (taskId) => {
            const hasTask = !!this.pendingDownloadTasks[taskId];
            console.log(`🔍 MealVoucherManagement: 检查任务 ${taskId} - ${hasTask ? '属于我' : '不属于我'}`);
            return hasTask;
          }
        );
        console.log('📡 MealVoucherManagement: 已注册到全局SSE管理器:', componentId);
      }
      
      // 监听 SSE 事件（保留直接监听作为备用）
      sseService.on('pdf_completed', this.handleSSECompleted);
      sseService.on('pdf_failed', this.handleSSEFailed);
    },
    
    // 清理 SSE 连接
    cleanupSSE() {
      console.log('📡 MealVoucherManagement: 清理SSE连接');
      
      // 从全局SSE管理器注销
      if (this.$globalSSEManager) {
        const componentId = `MealVoucherManagement_${this.$route.path}`;
        this.$globalSSEManager.unregisterComponent(componentId);
      }
      
      // 移除事件监听
      sseService.off('pdf_completed', this.handleSSECompleted);
      sseService.off('pdf_failed', this.handleSSEFailed);
    },
    
    // 处理 SSE 完成事件
    handleSSECompleted(data) {
      console.log('📄 MealVoucherManagement: 收到PDF完成通知:', data);
      const { taskId, documentType } = data;
      
      // 检查是否是我们的任务
      if (!this.pendingDownloadTasks[taskId]) {
        console.log('📄 MealVoucherManagement: 不是本组件的任务，忽略');
        return;
      }
      
      const taskInfo = this.pendingDownloadTasks[taskId];
      
      this.$notify({
        title: 'Voucher Ready',
        message: 'Your meal voucher is ready and will download automatically!',
        type: 'success',
        duration: 3000
      });
      
      // 自动下载
      setTimeout(() => {
        this.downloadGeneratedVoucher(taskId, taskInfo.voucher);
      }, 1000);
    },
    
    // 处理 SSE 失败事件
    handleSSEFailed(data) {
      console.log('❌ MealVoucherManagement: 收到PDF失败通知:', data);
      const { taskId, error } = data;
      
      if (!this.pendingDownloadTasks[taskId]) {
        return;
      }
      
      this.$message({
        message: `Failed to generate voucher: ${error || 'Unknown error'}`,
        type: 'error'
      });
      
      // 清理任务
      delete this.pendingDownloadTasks[taskId];
    },
    
    togglePaymentDetails() {
      this.showPaymentDetails = !this.showPaymentDetails;
    },
    
    addPaymentScreenshotRule() {
      // 动态添加 payment_screenshot 验证规则
      this.purchaseRules.payment_screenshot = [
        {
          required: true,
          validator: (rule, value, callback) => {
            if (!this.paymentFile) {
              callback(new Error('Please upload payment screenshot'));
            } else {
              callback();
            }
          },
          trigger: 'change'
        }
      ];
    },
    async loadVouchers() {
      try {
        this.loading = true;
        
        const axios = (await import('axios')).default;
        const response = await axios.get('/api/vouchers', {
          withCredentials: true
        });
        
        if (response.data.success) {
          this.vouchers = response.data.vouchers;
        }
        
      } catch (error) {
        console.error('Failed to load vouchers:', error);
        this.$message({
          message: 'Failed to load vouchers',
          type: 'error'
        });
      } finally {
        this.loading = false;
      }
    },
    
    async initUserInfo() {
      // 获取当前用户信息并预填表单
      try {
        const user = (this.$store && this.$store.state && this.$store.state.account && this.$store.state.account.user) || 
                    JSON.parse(localStorage.getItem('user') || '{}');
        
        if (user) {
          this.purchaseForm.attendee_name = user.name || '';
          this.purchaseForm.email = user.email || '';
        }
      } catch (error) {
        console.error('Failed to load user info:', error);
      }
    },
    
    calculateTotal() {
      return this.purchaseForm.quantity * 150;
    },
    
    calculateTotalRMB() {
      return this.purchaseForm.quantity * 1100;
    },
    
    getStatusClass(status) {
      return {
        'status-active': status === 'approved',
        'status-pending': status === 'pending',
        'status-expired': status === 'rejected'
      };
    },
    
    getStatusIcon(status) {
      const icons = {
        'approved': 'el-icon-check',
        'pending': 'el-icon-time',
        'rejected': 'el-icon-close'
      };
      return icons[status] || 'el-icon-question';
    },
    
    getStatusText(status) {
      const texts = {
        'approved': 'Approved',
        'pending': 'Pending Review',
        'rejected': 'Rejected'
      };
      return texts[status] || 'Unknown';
    },
    
    getStatusTagType(status) {
      const types = {
        'approved': 'success',
        'pending': 'warning',
        'rejected': 'danger'
      };
      return types[status] || '';
    },
    
    handleFileChange(file) {
      const isImage = file.raw.type.indexOf('image/') === 0;
      const isLt10M = file.raw.size / 1024 / 1024 < 10;

      if (!isImage) {
        this.$message.error('Upload file must be an image!');
        return;
      }
      if (!isLt10M) {
        this.$message.error('Upload file size cannot exceed 10MB!');
        return;
      }

      // 读取文件并创建预览
      const reader = new FileReader();
      reader.onload = (e) => {
        this.uploadedProof = e.target.result;
        this.paymentFile = file.raw; // 保存实际文件对象
        this.purchaseForm.payment_screenshot = file.name; // 更新表单字段以通过验证
        
        console.log('File uploaded:', file.name, 'paymentFile set:', !!this.paymentFile);
        
        // 触发表单验证
        this.$nextTick(() => {
          if (this.$refs.purchaseForm) {
            this.$refs.purchaseForm.validateField('payment_screenshot');
          }
        });
      };
      reader.readAsDataURL(file.raw);
    },

    removeProof() {
      this.uploadedProof = null;
      this.paymentFile = null;
      this.purchaseForm.payment_screenshot = ''; // 清空表单字段
      this.$message.info('Payment proof removed');
      
      // 触发表单验证
      this.$nextTick(() => {
        this.$refs.purchaseForm.validateField('payment_screenshot');
      });
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
    
    handleVoucherAction(command) {
      const { action, voucher } = command;
      
      switch (action) {
        case 'view':
          this.viewVoucher(voucher);
          break;
        case 'downloadVoucher':
          this.downloadVoucher(voucher);
          break;
        case 'downloadQR':
          this.downloadVoucherQR(voucher);
          break;
      }
    },
    
    viewVoucher(voucher) {
      this.selectedVoucher = voucher;
      this.detailDialogVisible = true;
    },
    
    async downloadVoucher(voucher) {
      try {
        this.$message({
          message: 'Preparing voucher download...',
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
            const voucherTask = statusResponse.data.data.tasks.find(task => 
              task.type === 'meal-voucher' && 
              task.voucherId === voucher.id &&
              (task.status === 'generated' || task.status === 'processing')
            );
            
            if (voucherTask) {
              if (voucherTask.status === 'generated') {
                // 任务已生成，直接下载
                await this.downloadGeneratedVoucher(voucherTask.taskId, voucher);
                return;
              } else if (voucherTask.status === 'processing') {
                this.$message.info('Voucher is being generated. Please wait...');
                return;
              }
            }
          }
        } catch (error) {
          console.warn('Failed to check pending tasks:', error);
        }
        
        // 启动新的异步生成任务
        const generateResponse = await axios.post('/api/submissions/generate_meal_voucher', {
          voucherId: voucher.id,
          marginMode: 'standard'
        }, {
          withCredentials: true
        });
        
        if (!generateResponse.data.success) {
          throw new Error(generateResponse.data.message || 'Failed to start voucher generation');
        }
        
        const taskId = generateResponse.data.taskId;
        
        // 添加到待处理任务列表
        this.pendingDownloadTasks[taskId] = {
          voucher: voucher,
          type: 'meal-voucher',
          startTime: Date.now()
        };
        
        this.$message.success('Voucher generation started! You will be notified when it\'s ready. You can also check progress in Document Management.');
        
        // 添加到全局 store 以便在其他页面也能看到进度
        if (this.$store && this.$store.state.account && this.$store.state.account.user) {
          this.$store.dispatch('tasks/addDownloadTask', {
            taskId: taskId,
            type: 'meal-voucher',
            userId: this.$store.state.account.user.id,
            voucherId: voucher.id
          });
        }
        
      } catch (error) {
        console.error('Download voucher error:', error);
        
        // 如果异步接口失败，尝试使用同步备用接口
        if (error.response && error.response.status === 404) {
          this.$message.error('No approved voucher found for download.');
        } else {
          this.$message.error(`Failed to download voucher: ${error.message || 'Unknown error'}`);
        }
      }
    },
    
    async downloadGeneratedVoucher(taskId, voucher) {
      const downloadManager = this.$getDownloadManager();
      if (!downloadManager) {
        console.error('Download manager not initialized');
        this.$message.error('Download manager not available');
        return;
      }
      
      const downloadKey = downloadManager.generateDownloadKey('voucher', taskId);
      
      await downloadManager.downloadPDF({
        taskId,
        type: 'meal-voucher',
        downloadKey,
        filename: `ICPADS2025_MealVoucher_${voucher.id}.pdf`,
        context: this,
        onSuccess: (taskId) => {
          this.$message.success('Voucher downloaded successfully!');
          
          // 清理待处理任务
          delete this.pendingDownloadTasks[taskId];
          
          // 标记任务为已下载
          if (this.$store) {
            this.$store.dispatch('tasks/downloadTask', { taskId });
          }
          
          // 通知全局SSE管理器下载已完成
          if (this.$globalSSEManager) {
            this.$globalSSEManager.notifyDownloadCompleted(taskId, 'meal-voucher');
          }
        },
        onError: (error) => {
          console.error('Error downloading voucher:', error);
          this.$message.error('Failed to download voucher');
          
          // 清理待处理任务
          delete this.pendingDownloadTasks[taskId];
        }
      });
    },
    
    async downloadVoucherQR(voucher) {
      try {
        this.$message({
          message: 'Generating QR code...',
          type: 'info'
        });
        
        // 模拟 QR 码生成和下载
        // 实际应该调用后端 API 生成 QR 码
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        this.$message({
          message: 'QR code downloaded successfully!',
          type: 'success'
        });
        
      } catch (error) {
        console.error('Download QR error:', error);
        this.$message({
          message: 'Failed to download QR code. Please try again.',
          type: 'error'
        });
      }
    },
    
    async submitPurchase() {
      try {
        console.log('Submitting purchase. paymentFile:', !!this.paymentFile, 'uploadedProof:', !!this.uploadedProof);
        console.log('purchaseForm.payment_screenshot:', this.purchaseForm.payment_screenshot);
        
        // 验证表单
        await this.$refs.purchaseForm.validate();

        if (!this.uploadedProof || !this.paymentFile) {
          this.$message.error('Please upload payment screenshot');
          return;
        }
        
        this.purchasing = true;
        
        // 准备提交数据
        const formData = new FormData();
        formData.append('quantity', this.purchaseForm.quantity);
        formData.append('attendee_name', this.purchaseForm.attendee_name);
        formData.append('email', this.purchaseForm.email);
        formData.append('payment_method', this.purchaseForm.payment_method);
        formData.append('payment_screenshot', this.paymentFile);

        const axios = (await import('axios')).default;
        const response = await axios.post('/api/vouchers', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          withCredentials: true
        });
        
        if (response.data.success) {
          this.$message({
            message: 'Voucher purchase request submitted successfully! Waiting for admin approval.',
            type: 'success',
            duration: 5000
          });
          
          // 重新加载餐券列表
          await this.loadVouchers();
          
          this.handleClosePurchase();
        }
        
      } catch (error) {
        console.error('Purchase error:', error);
        this.$message({
          message: error.response?.data?.message || 'Failed to purchase vouchers. Please try again.',
          type: 'error'
        });
      } finally {
        this.purchasing = false;
      }
    },
    
    handleClosePurchase() {
      this.showPurchaseDialog = false;
      // 重置表单和上传的文件
      this.$nextTick(() => {
        this.$refs.purchaseForm.resetFields();
        this.purchaseForm.quantity = 1;
        this.purchaseForm.payment_method = 'international';
        this.uploadedProof = null;
        this.paymentFile = null;
      });
    }
  }
};
</script>

<style scoped>
.meal-voucher-management {
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

/* Voucher info section */
.voucher-info-section {
  margin-bottom: 32px;
}

.voucher-info-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
}

.voucher-info {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 8px;
}

.voucher-icon {
  font-size: 48px;
  color: white;
  opacity: 0.9;
}

.voucher-details h3 {
  color: white;
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.voucher-details p {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  margin: 0 0 12px 0;
}

.price-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.price-usd {
  font-size: 24px;
  font-weight: 700;
  color: white;
}

.price-rmb {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
}

/* Notice section */
.notice-section {
  margin-bottom: 32px;
}

.notice-content p {
  margin: 0;
  line-height: 1.6;
  font-size: 14px;
}

.notice-content strong {
  color: #303133;
}

/* Content sections */
.loading-container {
  padding: 40px 20px;
}

.voucher-content {
  min-height: 400px;
}

.current-vouchers-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #E4E7ED;
}

.section-header h3 {
  color: #303133;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

/* Empty state */
.empty-vouchers {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 64px;
  color: #C0C4CC;
  margin-bottom: 24px;
}

.empty-vouchers h4 {
  color: #303133;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 12px 0;
}

.empty-vouchers p {
  color: #909399;
  font-size: 14px;
  margin: 0 0 24px 0;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

/* Voucher list */
.vouchers-list {
  min-height: 200px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.voucher-item {
  background: white;
  border: 1px solid #E4E7ED;
  border-radius: 8px;
  transition: all 0.3s ease;
  overflow: hidden;
}

.voucher-item:hover {
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
  border-color: #409EFF;
}

.voucher-item-content {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  gap: 24px;
}

.voucher-item-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 280px;
}

.voucher-item-middle {
  flex: 1;
}

.voucher-item-right {
  display: flex;
  align-items: center;
}

.voucher-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.status-active {
  background: #f0f9ff;
  color: #67C23A;
  border: 1px solid #b3e5fc;
}

.status-pending {
  background: #fffbf0;
  color: #E6A23C;
  border: 1px solid #ffd54f;
}

.status-expired {
  background: #fef2f2;
  color: #F56C6C;
  border: 1px solid #ffcdd2;
}

.status-used {
  background: #f3f4f6;
  color: #909399;
  border: 1px solid #d1d5db;
}

.voucher-id {
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.voucher-info-list {
  display: flex;
  gap: 32px;
  align-items: center;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item .label {
  color: #909399;
  font-size: 12px;
  font-weight: 500;
}

.info-item .value {
  color: #303133;
  font-size: 14px;
  font-weight: 500;
}

/* Purchase dialog */
.purchase-form {
  padding: 20px 0;
}

.voucher-preview {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
}

.preview-info h4 {
  color: #303133;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.preview-info p {
  color: #606266;
  font-size: 14px;
  margin: 0 0 12px 0;
}

.unit-price {
  color: #E6A23C;
  font-size: 16px;
  font-weight: 600;
}

.quantity-hint,
.form-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.total-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-top: 24px;
}

.total-calculation {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.calc-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.calc-row.rmb {
  color: #909399;
  font-size: 14px;
  font-weight: 500;
}

/* Upload section */
.upload-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
}

.preview-section {
  margin-top: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.preview-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
  font-weight: 500;
}

.preview-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.proof-preview-small {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #DCDFE6;
}

.remove-btn-inline {
  padding: 5px 15px;
}

/* Detail dialog */
.voucher-detail {
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

/* Payment Details Section */
.payment-details-section {
  margin: 16px 0;
}

.payment-details-collapse {
  border: 1px solid #DCDFE6;
  border-radius: 8px;
  overflow: hidden;
  background: white;
}

.collapse-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f5f7fa;
  cursor: pointer;
  transition: all 0.3s;
  user-select: none;
}

.collapse-header:hover {
  background: #ecf5ff;
}

.collapse-header-content {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #409EFF;
  font-size: 14px;
  font-weight: 500;
}

.collapse-header-content i {
  font-size: 16px;
}

.collapse-icon {
  color: #909399;
  transition: transform 0.3s;
  font-size: 14px;
}

.collapse-icon.is-active {
  transform: rotate(180deg);
}

.collapse-content {
  padding: 16px;
  background: white;
}

.payment-info-box {
  background: #f8f9fa;
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
}

.payment-info-box.domestic {
  background: #fff7e6;
  border-color: #ffd666;
}

.bank-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-group {
  background: white;
  padding: 12px;
  border-radius: 6px;
  border-left: 3px solid #409EFF;
}

.payment-info-box.domestic .detail-group {
  border-left-color: #E6A23C;
}

.detail-group h5 {
  color: #606266;
  font-size: 13px;
  font-weight: 600;
  margin: 0 0 8px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-group p {
  color: #303133;
  font-size: 13px;
  margin: 4px 0;
  line-height: 1.5;
}

.detail-group p strong {
  color: #606266;
  font-weight: 600;
  min-width: 120px;
  display: inline-block;
}

.detail-group code {
  background: #ecf5ff;
  color: #409EFF;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 12px;
}

.payment-info-box.domestic .detail-group code {
  background: #fef0e0;
  color: #E6A23C;
}

.address-indent {
  padding-left: 16px;
  color: #606266;
  font-size: 12px;
}

.reference-example {
  color: #909399;
  font-style: italic;
  padding-left: 16px;
  font-size: 12px;
}

.payment-note {
  margin-top: 12px;
  padding: 10px 12px;
  background: #ecf5ff;
  border-radius: 4px;
  color: #409EFF;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  line-height: 1.5;
}

.payment-info-box.domestic .payment-note {
  background: #fef0e0;
  color: #E6A23C;
}

.payment-note i {
  font-size: 14px;
  flex-shrink: 0;
}

/* Responsive design */
@media (max-width: 768px) {
  .meal-voucher-management {
    padding: 16px;
  }
  
  .payment-info-box {
    padding: 16px;
  }
  
  .detail-group p strong {
    min-width: auto;
    display: block;
    margin-bottom: 4px;
  }
  
  .page-header {
    margin-bottom: 24px;
  }
  
  .page-header h2 {
    font-size: 24px;
  }
  
  .voucher-info {
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }
  
  .voucher-icon {
    font-size: 36px;
  }
  
  .voucher-details h3 {
    font-size: 18px;
  }
  
  .price-usd {
    font-size: 20px;
  }
  
  .section-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .current-vouchers-section {
    padding: 16px;
  }
  
  .empty-vouchers {
    padding: 40px 16px;
  }
  
  .empty-icon {
    font-size: 48px;
  }
  
  .voucher-item-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 16px;
  }
  
  .voucher-item-left {
    width: 100%;
    min-width: auto;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .voucher-item-middle {
    width: 100%;
  }
  
  .voucher-info-list {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .voucher-item-right {
    width: 100%;
    justify-content: flex-end;
  }
  
  .voucher-preview {
    padding: 16px;
  }
}
</style>