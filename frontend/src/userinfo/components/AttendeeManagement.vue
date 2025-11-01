<template>
  <div class="attendee-management">
    <el-card>
      <div slot="header" class="card-header">
        <span class="card-title">Attendee Information Transfer</span>
        <p class="card-subtitle">Modify registered attendee information for cases where the original attendee cannot attend</p>
      </div>

      <!-- 无已批准注册的状态 -->
      <div v-if="!transferStatus.hasApprovedRegistration" class="empty-state">
        <el-empty description="You need to have an approved registration before requesting attendee transfer">
          <el-button type="primary" @click="goToRegistrations">Register Now</el-button>
        </el-empty>
      </div>

      <!-- 有已批准注册的状态 - 显示注册列表 -->
      <div v-else class="registrations-list">
        <!-- 统计信息 -->
        <div class="stats-bar">
          <div class="stat-item">
            <i class="el-icon-document"></i>
            <span>Total: {{ transferStatus.totalCount || 0 }}</span>
          </div>
          <div class="stat-item available">
            <i class="el-icon-check"></i>
            <span>Can Transfer: {{ transferStatus.canTransferCount || 0 }}</span>
          </div>
          <div class="stat-item pending" v-if="transferStatus.pendingCount > 0">
            <i class="el-icon-time"></i>
            <span>Pending: {{ transferStatus.pendingCount }}</span>
          </div>
          <div class="stat-item completed" v-if="transferStatus.approvedCount > 0">
            <i class="el-icon-circle-check"></i>
            <span>Transferred: {{ transferStatus.approvedCount }}</span>
          </div>
          <el-button class="history-button" size="small" @click="showHistory">
            <i class="el-icon-document"></i>
            View History
          </el-button>
        </div>

        <!-- 注册项目列表 -->
        <div class="registration-items">
          <div 
            v-for="registration in transferStatus.approvedRegistrations" 
            :key="registration.id"
            class="registration-item"
            :class="{ 'has-pending': !registration.canTransfer, 'is-expanded': expandedItems[registration.id] }">
            
            <!-- 注册信息头部 - 始终显示 -->
            <div class="item-header" @click="toggleExpand(registration.id)">
              <div class="header-left">
                <i class="el-icon-arrow-right expand-icon" :class="{ 'is-expanded': expandedItems[registration.id] }"></i>
                <span class="product-code">{{ registration.productCode }}</span>
                <span class="product-price">
                  {{ formatBasePrice(registration) }}
                  <span v-if="hasExtraPageFee(registration)" class="extra-fee">
                    + {{ formatExtraPageFee(registration) }}
                  </span>
                </span>
                <span class="registration-id">#{{ registration.id }}</span>
              </div>
              <div class="header-right">
                <span class="attendee-name">{{ registration.name }}</span>
                <el-tag v-if="registration.isRefunded" type="danger" size="small">Refunded</el-tag>
                <el-tag v-else-if="registration.canTransfer" type="success" size="small">Can Transfer</el-tag>
                <el-tag v-else-if="registration.pendingTransfer" type="warning" size="small">Transfer Pending</el-tag>
                <el-tag v-else-if="registration.approvedTransfer" type="info" size="small">Transferred</el-tag>
              </div>
            </div>

            <!-- 折叠的详细信息 -->
            <el-collapse-transition>
              <div v-show="expandedItems[registration.id]" class="item-details">
                <!-- 参会者信息 -->
                <div class="attendee-info">
                  <div class="info-line">
                    <span v-if="registration.paperId" class="label">Paper ID: {{ registration.paperId }}</span>
                  </div>
                  <div class="info-line">
                    <span><strong>Name:</strong> {{ registration.name }}</span>
                    <span class="separator">•</span>
                    <span><strong>Email:</strong> {{ registration.email }}</span>
                  </div>
                  <div class="info-line">
                    <span><strong>Payment:</strong> {{ formatPaymentMethod(registration.paymentMethod) }}</span>
                    <span class="separator">•</span>
                    <span><strong>Pages:</strong> {{ registration.paperPages }}</span>
                    <span class="separator">•</span>
                    <span><strong>Registered:</strong> {{ formatDate(registration.submissionTime) }}</span>
                  </div>
                </div>

                <!-- 待处理的转让请求 -->
                <div v-if="!registration.canTransfer && registration.pendingTransfer" class="pending-transfer-info">
                  <el-alert type="warning" :closable="false">
                    <div class="pending-content">
                      <div><strong>Pending Transfer Request</strong></div>
                      <div class="pending-details">
                        <span>New Attendee: {{ registration.pendingTransfer.newAttendee.name }}</span>
                        <span class="separator">•</span>
                        <span>{{ registration.pendingTransfer.newAttendee.email }}</span>
                      </div>
                      <div class="request-time">
                        Requested: {{ formatDate(registration.pendingTransfer.requestTime) }}
                      </div>
                    </div>
                  </el-alert>
                </div>

                <!-- 已批准的转让记录 -->
                <div v-if="!registration.canTransfer && registration.approvedTransfer" class="approved-transfer-info">
                  <el-alert type="success" :closable="false">
                    <div class="approved-content">
                      <div><strong>Transfer Completed</strong></div>
                      <div class="transfer-details">
                        <div class="detail-row">
                          <span class="label">Original Attendee:</span>
                          <span>{{ registration.approvedTransfer.originalAttendee.name }} ({{ registration.approvedTransfer.originalAttendee.email }})</span>
                        </div>
                        <div class="detail-row">
                          <span class="label">Current Attendee:</span>
                          <span>{{ registration.approvedTransfer.newAttendee.name }} ({{ registration.approvedTransfer.newAttendee.email }})</span>
                        </div>
                        <div class="detail-row">
                          <span class="label">Processed:</span>
                          <span>{{ formatDate(registration.approvedTransfer.processTime) }}</span>
                        </div>
                      </div>
                      <div class="transfer-notice">
                        <i class="el-icon-info"></i>
                        This registration has been transferred and cannot be transferred again.
                      </div>
                    </div>
                  </el-alert>
                </div>

                <!-- 已退款的注册 -->
                <div v-if="registration.isRefunded" class="refunded-info">
                  <el-alert type="error" :closable="false">
                    <div class="refunded-content">
                      <div><strong>Refunded Registration</strong></div>
                      <div class="refund-notice">
                        <i class="el-icon-warning"></i>
                        This registration has been refunded and cannot be transferred.
                      </div>
                    </div>
                  </el-alert>
                </div>

                <!-- 操作按钮 -->
                <div class="item-actions">
                  <el-button 
                    type="primary" 
                    size="small"
                    :disabled="!registration.canTransfer"
                    @click.stop="selectRegistrationForTransfer(registration)">
                    <i class="el-icon-edit"></i>
                    Request Transfer
                  </el-button>
                  <template v-if="!registration.canTransfer">
                    <el-tooltip v-if="registration.isRefunded" 
                      content="Refunded registrations cannot be transferred" 
                      placement="top">
                      <span class="disabled-hint">
                        <i class="el-icon-info"></i>
                        Refunded
                      </span>
                    </el-tooltip>
                    <el-tooltip v-else-if="registration.approvedTransfer" 
                      content="This registration has already been transferred" 
                      placement="top">
                      <span class="disabled-hint">
                        <i class="el-icon-info"></i>
                        Already Transferred
                      </span>
                    </el-tooltip>
                  </template>
                </div>
              </div>
            </el-collapse-transition>
          </div>
        </div>

        <!-- 提示信息 - 可折叠 -->
        <div class="notice-section">
          <div class="notice-collapse">
            <div class="notice-header" @click="showNotice = !showNotice">
              <i class="el-icon-info"></i>
              <span>Transfer Notice</span>
              <i 
                class="el-icon-arrow-down collapse-icon"
                :class="{ 'is-active': showNotice }"
              ></i>
            </div>
            <el-collapse-transition>
              <div v-show="showNotice" class="notice-content">
                <p>• <strong>Transfer Processing Fee:</strong> A fee of <strong>${{ transferFees.usd }} USD</strong> or <strong>¥{{ transferFees.rmb }} RMB</strong> is required for each attendee transfer request</p>
                <p>• Each registration can be transferred independently</p>
                <p>• <strong>Each registration can only be transferred once</strong></p>
                <p>• Only one pending transfer request per registration at a time</p>
                <p>• Transfer updates attendee information while keeping registration and payment records</p>
              </div>
            </el-collapse-transition>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 变更申请对话框 -->
    <el-dialog title="Request Attendee Transfer" :visible.sync="dialogVisible" width="650px"
      :close-on-click-modal="false">

      <!-- 显示当前注册信息 -->
      <div v-if="selectedRegistration" class="dialog-current-info">
        <h4>Current Registration Information</h4>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="Registration ID">
            #{{ selectedRegistration.id }}
          </el-descriptions-item>
          <el-descriptions-item label="Product Code">
            {{ selectedRegistration.productCode }}
          </el-descriptions-item>
          <el-descriptions-item label="Current Name">
            {{ selectedRegistration.name }}
          </el-descriptions-item>
          <el-descriptions-item label="Current Email">
            {{ selectedRegistration.email }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <el-alert title="Important Notice" type="warning" :closable="false" show-icon style="margin: 20px 0;">
        <p>This operation will change the registered attendee information. The registration and payment remain under
          your account, but certificates and documents will show the new attendee's information.</p>
      </el-alert>

      <el-form :model="transferForm" :rules="transferRules" ref="transferForm" label-width="180px"
        class="transfer-form">
        <el-form-item label="New Attendee Name" prop="newAttendee.name">
          <el-input v-model="transferForm.newAttendee.name"
            placeholder="Please enter the new attendee's name"></el-input>
        </el-form-item>

        <el-form-item label="New Attendee Email" prop="newAttendee.email">
          <el-input v-model="transferForm.newAttendee.email"
            placeholder="Please enter the new attendee's email"></el-input>
        </el-form-item>

        <el-form-item label="Phone Number" prop="newAttendee.phone">
          <el-input v-model="transferForm.newAttendee.phone"
            placeholder="Please enter phone number (optional)"></el-input>
        </el-form-item>

        <el-form-item label="Affiliation" prop="newAttendee.affiliation">
          <el-input v-model="transferForm.newAttendee.affiliation"
            placeholder="Please enter affiliation (optional)"></el-input>
        </el-form-item>

        <el-form-item label="Reason for Transfer" prop="reason">
          <el-input type="textarea" v-model="transferForm.reason"
            placeholder="Please provide detailed reason for attendee transfer" :rows="4"></el-input>
        </el-form-item>

        <!-- 手续费支付部分 -->
        <el-divider></el-divider>
        <h4 style="margin: 20px 0 16px 0; color: #303133;">Transfer Processing Fee</h4>
        
        <el-alert type="info" :closable="false" show-icon style="margin-bottom: 20px;">
          <div slot="title">Processing Fee Required</div>
          <p>A processing fee of <strong>${{ transferFees.usd }} USD</strong> or <strong>¥{{ transferFees.rmb }} RMB</strong> is required for attendee transfer.</p>
        </el-alert>

        <el-form-item label="Payment Method" prop="feePaymentMethod">
          <el-radio-group v-model="transferForm.feePaymentMethod" size="medium">
            <el-radio label="international">International Bank Transfer (${{ transferFees.usd }} USD)</el-radio>
            <el-radio label="domestic">China Mainland Payment (¥{{ transferFees.rmb }} RMB)</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- Payment Details Section - Collapsible -->
        <div v-if="transferForm.feePaymentMethod" class="payment-details-section">
          <div class="payment-details-collapse">
            <div 
              class="collapse-header"
              @click="togglePaymentDetails"
            >
              <div class="collapse-header-content">
                <i class="el-icon-info"></i>
                <span v-if="transferForm.feePaymentMethod === 'international'">
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
                <div v-if="transferForm.feePaymentMethod === 'international'" class="payment-info-box">
                  <div class="bank-details">
                    <div class="detail-group">
                      <h5>Beneficiary's Details</h5>
                      <p><strong>Account Number:</strong> 01266320164304</p>
                      <p><strong>Name:</strong> YUAN LONGZHI</p>
                      <p><strong>Phone:</strong> +852 97562070</p>
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
                      <p><strong>Format:</strong> <code>Name+PaperID+ICPADS 2025+TransferFee</code></p>
                      <p class="reference-example">Example: JohnDoe+123+ICPADS 2025+TransferFee</p>
                      <p class="reference-example" v-if="selectedRegistration && selectedRegistration.paperId">
                        Your reference: <strong>{{ selectedRegistration.name }}+{{ selectedRegistration.paperId }}+ICPADS 2025+TransferFee</strong>
                      </p>
                    </div>
                  </div>
                  <div class="payment-note">
                    <i class="el-icon-warning"></i>
                    Please upload payment confirmation screenshot after completing the transfer.
                  </div>
                </div>

                <!-- Domestic Payment Details -->
                <div v-if="transferForm.feePaymentMethod === 'domestic'" class="payment-info-box domestic">
                  <div class="bank-details">
                    <div class="detail-group">
                      <h5>收款账户信息</h5>
                      <p><strong>账户名称：</strong>合肥博研会议会务服务有限公司</p>
                      <p><strong>开户行：</strong>中国邮政储蓄银行股份有限公司安徽自贸试验区合肥片区支行</p>
                      <p><strong>账户号码：</strong>934012013000728814</p>
                    </div>
                    
                    <div class="detail-group">
                      <h5>转账附言</h5>
                      <p><strong>格式：</strong> <code>姓名+论文编号+ICPADS 2025+转让手续费</code></p>
                      <p class="reference-example">示例：张三+123+ICPADS 2025+转让手续费</p>
                      <p class="reference-example" v-if="selectedRegistration && selectedRegistration.paperId">
                        您的附言：<strong>{{ selectedRegistration.name }}+{{ selectedRegistration.paperId }}+ICPADS 2025+转让手续费</strong>
                      </p>
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

        <el-form-item label="Payment Proof" prop="feePaymentScreenshot" required>
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
      </el-form>

      <div slot="footer">
        <el-button @click="dialogVisible = false">Cancel</el-button>
        <el-button type="primary" @click="submitTransfer" :loading="loading" :disabled="!canSubmit">Submit Request</el-button>
      </div>
    </el-dialog>

    <!-- 变更历史对话框 -->
    <el-dialog title="Attendee Transfer History" :visible.sync="historyDialogVisible" width="900px">

      <div v-if="transferHistory.length === 0" class="empty-history">
        <el-empty description="No transfer history records"></el-empty>
      </div>

      <el-timeline v-else>
        <el-timeline-item v-for="record in transferHistory" :key="record.id" :timestamp="formatDate(record.requestTime)"
          placement="top">

          <el-card>
            <div class="history-header">
              <h4>Transfer Request #{{ record.id }}</h4>
              <el-tag :type="getStatusType(record.transferStatus)">
                {{ getStatusText(record.transferStatus) }}
              </el-tag>
            </div>

            <el-descriptions :column="1" border size="small">
              <el-descriptions-item label="Registration ID">
                #{{ record.registrationId }}
              </el-descriptions-item>
              <el-descriptions-item label="Transfer Reason">
                {{ record.reason }}
              </el-descriptions-item>
            </el-descriptions>

            <div class="attendee-change">
              <h5>Attendee Information Change</h5>
              <div class="change-comparison">
                <div class="before">
                  <h6>Original Information</h6>
                  <p><strong>Name:</strong> {{ record.originalAttendee.name }}</p>
                  <p><strong>Email:</strong> {{ record.originalAttendee.email }}</p>
                  <p v-if="record.originalAttendee.phone"><strong>Phone:</strong> {{ record.originalAttendee.phone }}
                  </p>
                  <p v-if="record.originalAttendee.affiliation"><strong>Affiliation:</strong> {{
                    record.originalAttendee.affiliation }}</p>
                </div>
                <div class="arrow">→</div>
                <div class="after">
                  <h6>New Information</h6>
                  <p><strong>Name:</strong> {{ record.newAttendee.name }}</p>
                  <p><strong>Email:</strong> {{ record.newAttendee.email }}</p>
                  <p v-if="record.newAttendee.phone"><strong>Phone:</strong> {{ record.newAttendee.phone }}</p>
                  <p v-if="record.newAttendee.affiliation"><strong>Affiliation:</strong> {{
                    record.newAttendee.affiliation }}</p>
                </div>
              </div>
            </div>

            <div v-if="record.processTime" class="process-info">
              <el-descriptions :column="2" border size="small">
                <el-descriptions-item label="Process Time">
                  {{ formatDate(record.processTime) }}
                </el-descriptions-item>
                <el-descriptions-item label="Processor" v-if="record.processor">
                  {{ record.processor.name }}
                </el-descriptions-item>
                <el-descriptions-item label="Admin Notes" v-if="record.adminNotes" :span="2">
                  {{ record.adminNotes }}
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>
    </el-dialog>
  </div>
</template>

<script>
import { userService } from '../../_services';

export default {
  name: 'AttendeeManagement',
  data() {
    return {
      transferStatus: {
        hasApprovedRegistration: false,
        approvedRegistrations: [],
        totalCount: 0,
        canTransferCount: 0,
        pendingCount: 0
      },
      selectedRegistration: null,
      dialogVisible: false,
      historyDialogVisible: false,
      loading: false,
      config: null, // 存储配置信息
      transferFees: {
        usd: 150,
        rmb: 1100
      }, // 默认手续费
      transferForm: {
        registrationId: '',
        newAttendee: {
          name: '',
          email: '',
          phone: '',
          affiliation: ''
        },
        reason: '',
        feePaymentMethod: 'international',
        feePaymentScreenshot: ''
      },
      transferRules: {
        'newAttendee.name': [
          { required: true, message: 'Please enter new attendee name', trigger: 'blur' }
        ],
        'newAttendee.email': [
          { required: true, message: 'Please enter new attendee email', trigger: 'blur' },
          { type: 'email', message: 'Please enter a valid email address', trigger: 'blur' }
        ],
        reason: [
          { required: true, message: 'Please provide reason for transfer', trigger: 'blur' },
          { min: 10, message: 'Please provide detailed reason (at least 10 characters)', trigger: 'blur' }
        ],
        feePaymentMethod: [
          { required: true, message: 'Please select payment method', trigger: 'change' }
        ],
        feePaymentScreenshot: [
          { required: true, message: 'Please upload payment proof screenshot', trigger: 'change' }
        ]
      },
      transferHistory: [],
      uploadedProof: null,
      paymentFile: null,
      showPaymentDetails: false,
      expandedItems: {}, // 用于追踪每个注册项的展开/折叠状态
      showNotice: false // 控制提示信息的显示/隐藏
    };
  },
  computed: {
    canSubmit() {
      return this.transferForm.registrationId &&
             this.transferForm.newAttendee.name &&
             this.transferForm.newAttendee.email &&
             this.transferForm.reason &&
             this.transferForm.feePaymentMethod &&
             this.uploadedProof;
    }
  },
  async mounted() {
    await this.loadConfig();
    await this.checkTransferStatus();
  },
  methods: {
    async loadConfig() {
      try {
        const response = await fetch('/api/config');
        const result = await response.json();
        if (result.success) {
          this.config = result.data;
          // 从配置中获取手续费
          if (this.config.processingFees && this.config.processingFees.transferFee) {
            this.transferFees = this.config.processingFees.transferFee;
          }
        }
      } catch (error) {
        console.error('Failed to load config:', error);
        // 使用默认手续费
      }
    },
    async checkTransferStatus() {
      try {
        const response = await userService.checkTransferStatus();
        if (response && response.data) {
          this.transferStatus = response.data;
          
          // 如果只有一个注册项，默认展开
          if (this.transferStatus.approvedRegistrations && 
              this.transferStatus.approvedRegistrations.length === 1) {
            const registrationId = this.transferStatus.approvedRegistrations[0].id;
            this.$set(this.expandedItems, registrationId, true);
          }
        }
      } catch (error) {
        console.error('Failed to check transfer status:', error);
        this.$message.error('Failed to load transfer status');
      }
    },

    selectRegistrationForTransfer(registration) {
      this.selectedRegistration = registration;
      this.transferForm = {
        registrationId: registration.id,
        newAttendee: {
          name: '',
          email: '',
          phone: '',
          affiliation: ''
        },
        reason: '',
        feePaymentMethod: 'international',
        feePaymentScreenshot: ''
      };
      this.uploadedProof = null;
      this.paymentFile = null;
      this.showPaymentDetails = false;
      this.dialogVisible = true;
    },

    async showHistory() {
      try {
        const history = await userService.getTransferHistory();
        this.transferHistory = history.data || [];
        this.historyDialogVisible = true;
      } catch (error) {
        console.error('Failed to load transfer history:', error);
        this.$message.error('Failed to load transfer history');
      }
    },

    async submitTransfer() {
      try {
        const valid = await this.$refs.transferForm.validate();
        if (!valid) return;

        if (!this.paymentFile) {
          this.$message.error('Please upload payment proof screenshot');
          return;
        }

        this.loading = true;

        // 创建 FormData 对象
        const formData = new FormData();
        formData.append('registrationId', this.transferForm.registrationId);
        formData.append('newAttendee', JSON.stringify(this.transferForm.newAttendee));
        formData.append('reason', this.transferForm.reason);
        formData.append('feePaymentMethod', this.transferForm.feePaymentMethod);
        formData.append('feePaymentScreenshot', this.paymentFile);

        await userService.transferRegistration(formData);

        this.$message.success('Attendee transfer request submitted successfully! Please wait for admin review.');
        this.dialogVisible = false;
        this.selectedRegistration = null;

        // 刷新状态
        await this.checkTransferStatus();

      } catch (error) {
        console.error('Transfer request failed:', error);
        this.$message.error(error || 'Request submission failed');
      } finally {
        this.loading = false;
      }
    },

    toggleExpand(registrationId) {
      this.$set(this.expandedItems, registrationId, !this.expandedItems[registrationId]);
    },

    togglePaymentDetails() {
      this.showPaymentDetails = !this.showPaymentDetails;
    },

    // 跳转到注册页面
    goToRegistrations() {
      // 发送事件给父组件，让父组件处理菜单切换
      this.$emit('navigate', 'registrations');
    },

    handleFileChange(file) {
      const isImage = file.raw.type.startsWith('image/');
      const isLt10M = file.raw.size / 1024 / 1024 < 10;

      if (!isImage) {
        this.$message.error('Only image files are allowed!');
        return;
      }
      if (!isLt10M) {
        this.$message.error('Image size must be less than 10MB!');
        return;
      }

      this.paymentFile = file.raw;
      
      // 创建预览
      const reader = new FileReader();
      reader.onload = (e) => {
        this.uploadedProof = e.target.result;
        // 更新表单字段以触发验证
        this.transferForm.feePaymentScreenshot = file.name;
        // 手动触发表单验证
        this.$nextTick(() => {
          this.$refs.transferForm.validateField('feePaymentScreenshot');
        });
      };
      reader.readAsDataURL(file.raw);
    },

    removeProof() {
      this.uploadedProof = null;
      this.paymentFile = null;
      this.transferForm.feePaymentScreenshot = '';
      // 手动触发表单验证
      this.$nextTick(() => {
        this.$refs.transferForm.validateField('feePaymentScreenshot');
      });
    },

    formatDate(dateString) {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },

    formatBasePrice(registration) {
      // 根据支付方式显示基础产品价格
      if (registration.paymentMethod === 'domestic') {
        const amount = parseFloat(registration.productPriceRmb) || 0;
        return `¥${amount.toFixed(2)}`;
      } else {
        const amount = parseFloat(registration.productPriceUsd) || 0;
        return `$${amount.toFixed(2)}`;
      }
    },

    formatPaymentMethod(method) {
      return method === 'domestic' ? 'Domestic (RMB)' : 'International (USD)';
    },

    hasExtraPageFee(registration) {
      if (registration.paymentMethod === 'domestic') {
        return parseFloat(registration.extraPageFeeRmb || 0) > 0;
      } else {
        return parseFloat(registration.extraPageFeeUsd || 0) > 0;
      }
    },

    formatExtraPageFee(registration) {
      if (registration.paymentMethod === 'domestic') {
        const fee = parseFloat(registration.extraPageFeeRmb) || 0;
        return `¥${fee.toFixed(2)}`;
      } else {
        const fee = parseFloat(registration.extraPageFeeUsd) || 0;
        return `$${fee.toFixed(2)}`;
      }
    },

    getStatusType(status) {
      switch (status) {
        case 'approved': return 'success';
        case 'rejected': return 'danger';
        case 'pending': return 'warning';
        default: return 'info';
      }
    },

    getStatusText(status) {
      switch (status) {
        case 'approved': return 'Approved';
        case 'rejected': return 'Rejected';
        case 'pending': return 'Pending';
        default: return status;
      }
    }
  }
};
</script>

<style scoped>
.card-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 24px 0;
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

/* 统计栏样式 */
.stats-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #606266;
  font-weight: 500;
  font-size: 14px;
}

.stat-item i {
  font-size: 16px;
  color: #909399;
}

.stat-item.available {
  color: #67C23A;
}

.stat-item.available i {
  color: #67C23A;
}

.stat-item.pending {
  color: #E6A23C;
}

.stat-item.pending i {
  color: #E6A23C;
}

.stat-item.completed {
  color: #409EFF;
}

.stat-item.completed i {
  color: #409EFF;
}

.history-button {
  margin-left: auto;
}

/* 注册项目列表样式 */
.registration-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.registration-item {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  background: white;
  transition: all 0.2s ease;
}

.registration-item:hover {
  border-color: #409EFF;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.registration-item.has-pending {
  border-color: #3d5f9e;
  /* background-color: white; */
  border-width: 1px;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
  /* margin: -8px -16px 0;
  padding: 8px 16px 12px; */
  border-radius: 6px 6px 0 0;
}

.item-header:hover {
  background-color: #f5f7fa;
}

.registration-item.is-expanded .item-header {
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f2f5;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.expand-icon {
  font-size: 14px;
  color: #909399;
  transition: transform 0.3s;
}

.expand-icon.is-expanded {
  transform: rotate(90deg);
}

.product-code {
  font-size: 14px;
  font-weight: 600;
  color: #409EFF;
  background: #ecf5ff;
  padding: 3px 10px;
  border-radius: 4px;
}

.product-price {
  font-size: 15px;
  font-weight: 600;
  color: #67C23A;
}

.extra-fee {
  font-size: 13px;
  color: #f59e0b;
  font-weight: 600;
  margin-left: 6px;
}

.registration-id {
  font-size: 12px;
  color: #909399;
  background: #f5f7fa;
  padding: 2px 8px;
  border-radius: 3px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.attendee-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-details {
  margin-top: 12px;
  padding-top: 12px;
}

/* 参会者信息样式 */
.attendee-info {
  margin-bottom: 12px;
}

.info-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
}

.info-line:last-child {
  margin-bottom: 0;
}

.info-line .label {
  color: #909399;
  font-size: 12px;
}

.info-line .separator {
  color: #dcdfe6;
  margin: 0 4px;
}

.info-line strong {
  color: #303133;
  font-weight: 500;
}

/* 待处理转让信息 */
.pending-transfer-info {
  margin-bottom: 16px;
}

.pending-content {
  font-size: 13px;
}

.pending-details {
  margin: 8px 0;
  color: #606266;
}

.separator {
  margin: 0 8px;
  color: #909399;
}

.request-time {
  font-size: 12px;
  color: #909399;
  margin-top: 6px;
}

/* 已批准转让信息 */
.approved-transfer-info {
  margin-bottom: 16px;
}

.approved-content {
  font-size: 13px;
}

.transfer-details {
  margin: 12px 0;
}

.detail-row {
  display: flex;
  margin-bottom: 8px;
  color: #606266;
  line-height: 1.6;
}

.detail-row .label {
  font-weight: 500;
  min-width: 140px;
  color: #303133;
  flex-shrink: 0;
}

.transfer-notice {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e4e7ed;
  font-size: 12px;
  color: #67c23a;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 已退款信息 */
.refunded-info {
  margin-bottom: 16px;
}

.refunded-content {
  font-size: 13px;
}

.refund-notice {
  margin-top: 8px;
  font-size: 12px;
  color: #f56c6c;
  display: flex;
  align-items: center;
  gap: 6px;
}

.transfer-notice i {
  font-size: 14px;
}

/* 操作按钮样式 */
.item-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
}

.disabled-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #909399;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
}

.disabled-hint i {
  font-size: 14px;
}

/* 提示信息 */
.notice-section {
  margin-top: 20px;
}

.notice-collapse {
  border: 1px solid #d9ecff;
  border-radius: 6px;
  overflow: hidden;
  background: #ecf5ff;
}

.notice-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  cursor: pointer;
  user-select: none;
  color: #409EFF;
  font-weight: 500;
  transition: background-color 0.2s;
}

.notice-header:hover {
  background-color: #d9ecff;
}

.notice-header i:first-child {
  font-size: 16px;
}

.notice-header span {
  flex: 1;
}

.notice-header .collapse-icon {
  font-size: 14px;
  transition: transform 0.3s;
}

.notice-header .collapse-icon.is-active {
  transform: rotate(180deg);
}

.notice-content {
  padding: 12px 16px;
  background: white;
  border-top: 1px solid #d9ecff;
}

.notice-content p {
  margin: 8px 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
}

.notice-content p:first-child {
  margin-top: 0;
}

.notice-content p:last-child {
  margin-bottom: 0;
}

/* 对话框样式 */
.dialog-current-info {
  margin-bottom: 20px;
}

.dialog-current-info h4 {
  margin-bottom: 12px;
  color: #303133;
  font-size: 20px;
}

.transfer-form {
  margin-top: 20px;
}

.transfer-form .el-form-item {
  margin-bottom: 20px;
}

.empty-history {
  text-align: center;
  padding: 40px 20px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.history-header h4 {
  margin: 0;
  color: #303133;
}

.attendee-change {
  margin: 20px 0;
}

.attendee-change h5 {
  margin-bottom: 15px;
  color: #606266;
}

.change-comparison {
  display: flex;
  align-items: center;
  gap: 20px;
  background: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
}

.before,
.after {
  flex: 1;
  padding: 10px;
  background: white;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
}

.before h6,
.after h6 {
  margin: 0 0 10px 0;
  color: #409EFF;
  font-size: 14px;
}

.before p,
.after p {
  margin: 5px 0;
  font-size: 13px;
  color: #606266;
}

.arrow {
  font-size: 20px;
  color: #409EFF;
  font-weight: bold;
}

.process-info {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #ebeef5;
}

.el-button {
  border-radius: 6px;
}

.el-alert {
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .card-header {
    padding: 16px 0;
  }
  
  .card-title {
    font-size: 18px;
  }
  
  .card-subtitle {
    font-size: 13px;
  }

  .stats-bar {
    padding: 10px 12px;
    gap: 10px;
  }

  .stat-item {
    font-size: 12px;
  }

  .history-button {
    margin-left: 0;
    width: 100%;
    margin-top: 8px;
  }

  .registration-item {
    padding: 12px;
  }

  .item-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .product-code {
    font-size: 13px;
  }

  .product-price {
    font-size: 14px;
  }

  .extra-fee {
    font-size: 11px;
  }

  .header-right {
    width: 100%;
  }

  .info-line {
    font-size: 12px;
    gap: 6px;
  }

  .info-line .separator {
    margin: 0 2px;
  }

  .pending-content {
    font-size: 12px;
  }

  .pending-details {
    flex-direction: column;
  }

  .item-actions {
    justify-content: stretch;
  }

  .item-actions .el-button {
    flex: 1;
  }

  .notice-section p {
    font-size: 12px;
  }

  .change-comparison {
    flex-direction: column;
  }

  .arrow {
    transform: rotate(90deg);
    align-self: center;
    margin: 8px 0;
  }
  
  .empty-state {
    padding: 40px 12px;
  }
}

/* 小屏设备进一步优化 */
@media (max-width: 480px) {
  .attendee-management {
    padding: 8px;
  }
  
  .card-title {
    font-size: 16px;
  }
  
  .card-subtitle {
    font-size: 12px;
  }
  
  .current-info-title {
    font-size: 14px;
  }
  
  .info-label {
    font-size: 12px;
  }
  
  .info-value {
    font-size: 13px;
    padding: 5px 8px;
  }
  
  .custom-button {
    font-size: 12px;
    padding: 8px 12px;
  }
  
  .custom-button i {
    font-size: 14px;
  }
  
  .custom-button span {
    font-size: 12px;
  }
  
  .transfer-notice li {
    font-size: 11px;
  }
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
</style>
