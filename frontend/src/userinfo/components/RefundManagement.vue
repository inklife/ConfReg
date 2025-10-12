<template>
  <div class="refund-management">
    <el-card>
      <div slot="header" class="card-header">
        <span class="card-title">Refund Request</span>
        <p class="card-subtitle">Apply for refund for approved registrations, must request 30 days in advance</p>
      </div>
      
      <!-- 重要退款政策提示 -->
      <el-alert
        title="Refund Policy Notice"
        type="warning"
        :closable="false"
        show-icon
        class="refund-policy-alert">
        <div class="policy-content">
          <p><strong>Important Notes:</strong></p>
          <ul>
            <li>If this registration is the <strong>only full registration</strong> (not student registration) for a paper ID, refund is <strong>NOT allowed</strong>.</li>
            <li>All refunds are subject to a processing fee of <strong>$100 USD</strong> or <strong>¥750 RMB</strong> (automatically deducted from the refund amount).</li>
          </ul>
        </div>
      </el-alert>
      
      <!-- 无已批准注册的状态 -->
      <div v-if="!refundStatus.hasApprovedRegistration" class="empty-state">
        <el-empty description="You need to have approved registrations before requesting refunds">
          <el-button type="primary" @click="$router.push('/conference/new')">Register Now</el-button>
        </el-empty>
      </div>
      
      <!-- 有待处理的退款申请 -->
      <div v-if="refundStatus.pendingRequest" class="pending-request">
        <el-alert
          title="You have a pending refund request"
          type="warning"
          :closable="false"
          show-icon>
        </el-alert>
        

      </div>
      
      <!-- 显示所有注册信息（不管是否有pending request） -->
      <div v-if="refundStatus.hasApprovedRegistration" class="refund-content">
        <div v-if="approvedRegistrations.length > 0">

          <!-- 所有注册列表（包括可退款和已退款） -->
          <div class="all-registrations">
            <h4>Registration Records</h4>
            
            <!-- 桌面端表格显示 -->
            <div class="desktop-table">
              <el-table :data="allRegistrationsWithRefundStatus" border style="width: 100%">
                <el-table-column prop="productCode" label="Product Code" width="120"></el-table-column>
                <el-table-column prop="paper_id" label="Paper ID" width="100">
                  <template slot-scope="scope">
                    <span>{{ scope.row.paper_id || '-' }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="name" label="Attendee Name"></el-table-column>
                <el-table-column prop="email" label="Email"></el-table-column>
                <el-table-column prop="productPrice" label="Amount" width="100">
                  <template slot-scope="scope">
                    {{ formatAmount(scope.row) }}
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
                <el-table-column label="Status" width="160" align="center">
                  <template slot-scope="scope">
                    <div class="table-action-cell">
                      <!-- 已退款状态 -->
                      <el-tag v-if="scope.row.isRefunded" type="success" size="small">
                        <i class="el-icon-circle-check"></i>
                        Refunded
                      </el-tag>
                      <!-- 可退款按钮 -->
                      <el-button v-else-if="scope.row.refundEligible" size="mini" type="danger" @click="selectRegistrationForRefund(scope.row)">
                        Apply Refund
                      </el-button>
                      <!-- 不可退款状态 -->
                      <el-tooltip v-else placement="top" :content="scope.row.refundIneligibleReason || 'Not eligible for refund'">
                        <el-tag type="info" size="small">Not Eligible</el-tag>
                      </el-tooltip>
                    </div>
                  </template>
                </el-table-column>
              </el-table>
            </div>
            
            <!-- 移动端卡片显示 -->
            <div class="mobile-cards">
              <div v-for="registration in allRegistrationsWithRefundStatus" :key="registration.id" class="registration-card" :class="{'refunded-card': registration.isRefunded}">
                <div class="card-header-info">
                  <div class="product-code">{{ registration.productCode }}</div>
                  <div class="amount">{{ formatAmount(registration) }}</div>
                </div>
                
                <div class="card-content">
                  <div class="info-row">
                    <span class="label">Paper ID:</span>
                    <span class="value">{{ registration.paper_id || '-' }}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Name:</span>
                    <span class="value">{{ registration.name }}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Email:</span>
                    <span class="value">{{ registration.email }}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Registration Time:</span>
                    <span class="value">
                      <div>{{ formatDateOnly(registration.submissionTime) }}</div>
                      <div class="time-secondary">{{ formatTimeOnly(registration.submissionTime) }}</div>
                    </span>
                  </div>
                </div>
                
                <div class="card-action">
                  <!-- 已退款状态 -->
                  <div v-if="registration.isRefunded" class="refunded-status">
                    <el-tag type="success" size="medium">
                      <i class="el-icon-circle-check"></i>
                      Refunded
                    </el-tag>
                  </div>
                  <!-- 可退款按钮 -->
                  <el-button v-else-if="registration.refundEligible" type="danger" @click="selectRegistrationForRefund(registration)" block>
                    <i class="el-icon-money"></i>
                    Apply Refund
                  </el-button>
                  <!-- 不可退款状态 -->
                  <div v-else class="not-eligible-status">
                    <el-tag type="info" size="medium">Not Eligible</el-tag>
                    <p class="not-eligible-reason">{{ registration.refundIneligibleReason }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 操作按钮 -->
          <div class="action-buttons">
            <el-button type="danger" @click="showRefundDialog" :disabled="eligibleRegistrationsCount === 0" icon="el-icon-money">
              Apply for Refund
            </el-button>
            <el-button type="info" @click="showRefundHistory" icon="el-icon-document">
              View Refund History
            </el-button>
          </div>
          
          <!-- 无法退款的原因说明 -->
          <div v-if="eligibleRegistrationsCount === 0 && refundStatus.ineligibleReasons.length > 0" class="ineligible-reasons">
            <el-alert
              title="Cannot request refund"
              type="info"
              :closable="false"
              show-icon>
              <div class="refund-not-available">
                <p><strong>Reason:</strong></p>
                <ul>
                  <li v-for="reason in refundStatus.ineligibleReasons" :key="reason">{{ reason }}</li>
                </ul>
              </div>
            </el-alert>
          </div>
          
        </div>
        
        <div v-else class="no-registrations">
          <el-empty description="You have no approved registration records">
            <el-button type="primary" @click="$router.push('/conference/new')">Register Now</el-button>
          </el-empty>
        </div>
      </div>
    </el-card>

    <!-- 退款申请对话框 -->
    <el-dialog
      title="Apply for Refund"
      :visible.sync="dialogVisible"
      width="700px"
      :close-on-click-modal="false">
      
      <el-alert
        title="Refund Policy"
        type="info"
        :closable="false"
        show-icon>
        <div>
          <p>Refund requests must be submitted at least 30 days before the conference begins. Processing time is 5-10 business days.</p>
          <p><strong>Refund Fee:</strong> A processing fee of $100 USD or ¥750 RMB will be deducted from your refund amount.</p>
        </div>
      </el-alert>
      
      <el-form :model="refundForm" :rules="refundRules" ref="refundForm" label-width="180px" class="refund-form">
        <el-form-item label="Select Registration" prop="registrationId">
          <el-select v-model="refundForm.registrationId" placeholder="Select registration to refund" style="width: 100%;" @change="onRegistrationChange">
            <el-option
              v-for="registration in eligibleRegistrations"
              :key="registration.id"
              :label="`${registration.productCode} - ${formatAmount(registration)}`"
              :value="registration.id">
              <span style="float: left">{{ registration.productCode }}</span>
              <span style="float: right; color: #8492a6; font-size: 13px">{{ formatAmount(registration) }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="Original Amount" v-if="selectedRegistration">
          <el-input :value="formatAmount(selectedRegistration)" disabled></el-input>
        </el-form-item>
        
        <el-form-item label="Processing Fee" v-if="selectedRegistration">
          <el-input :value="getProcessingFeeText(selectedRegistration)" disabled>
            <template slot="append">will be deducted</template>
          </el-input>
        </el-form-item>
        
        <el-form-item label="Actual Refund Amount" v-if="selectedRegistration">
          <el-input :value="getActualRefundText(selectedRegistration)" disabled>
            <template slot="prepend" style="color: #67C23A; font-weight: bold;">≈</template>
          </el-input>
        </el-form-item>
        
        <el-form-item label="Refund Reason" prop="reason">
          <el-input
            type="textarea"
            v-model="refundForm.reason"
            placeholder="Please provide detailed reason for refund request"
            :rows="4"></el-input>
        </el-form-item>
        
        <!-- 银行信息折叠面板 -->
        <el-collapse v-model="bankInfoCollapse" class="bank-info-collapse">
          <el-collapse-item name="bankInfo">
            <template slot="title">
              <div class="collapse-title">
                <i class="el-icon-bank-card"></i>
                <span>Bank Information (Optional)</span>
                <el-tag size="mini" type="info" style="margin-left: 10px;">Expand to fill</el-tag>
              </div>
            </template>
            
            <el-alert
              type="info"
              :closable="false"
              show-icon
              class="bank-info-alert">
              <div>
                <p>If you wish to receive refund via bank transfer, please fill in the following information. Otherwise, we will refund through your original payment method.</p>
                <p><strong>Note:</strong> If you close this section without filling, bank information will be ignored and refund will be processed through your original payment method.</p>
              </div>
            </el-alert>
            
            <!-- 选择银行类型 -->
            <el-form-item label="Bank Type" prop="bankInfo.bankType">
              <el-radio-group v-model="refundForm.bankInfo.bankType" @change="onBankTypeChange">
                <el-radio label="international">International (SWIFT)</el-radio>
                <el-radio label="domestic">Domestic (China)</el-radio>
              </el-radio-group>
            </el-form-item>
            
            <!-- 国际银行信息 -->
            <div v-if="refundForm.bankInfo.bankType === 'international'" class="bank-fields-section">
              <h5 class="section-title">Beneficiary's Details</h5>
              
              <el-form-item 
                label="Account Number" 
                prop="bankInfo.accountNumber">
                <el-input 
                  v-model="refundForm.bankInfo.accountNumber" 
                  placeholder="Enter account number"
                  @input="onBankInfoChange"></el-input>
              </el-form-item>
              
              <el-form-item 
                label="Name" 
                prop="bankInfo.accountName">
                <el-input 
                  v-model="refundForm.bankInfo.accountName" 
                  placeholder="Enter beneficiary name"
                  @input="onBankInfoChange"></el-input>
              </el-form-item>
              
              <el-form-item 
                label="Address" 
                prop="bankInfo.beneficiaryAddress">
                <el-input 
                  type="textarea"
                  v-model="refundForm.bankInfo.beneficiaryAddress" 
                  placeholder="Enter beneficiary address"
                  :rows="3"
                  @input="onBankInfoChange"></el-input>
              </el-form-item>
              
              <h5 class="section-title">Beneficiary's Bank Details</h5>
              
              <el-form-item 
                label="Country / Region" 
                prop="bankInfo.country">
                <el-input 
                  v-model="refundForm.bankInfo.country" 
                  placeholder="Enter bank country/region"
                  @input="onBankInfoChange"></el-input>
              </el-form-item>
              
              <el-form-item 
                label="SWIFT Code" 
                prop="bankInfo.swiftCode">
                <el-input 
                  v-model="refundForm.bankInfo.swiftCode" 
                  placeholder="Enter SWIFT/BIC code"
                  @input="onBankInfoChange"></el-input>
              </el-form-item>
              
              <el-form-item 
                label="Bank Name" 
                prop="bankInfo.bankName">
                <el-input 
                  v-model="refundForm.bankInfo.bankName" 
                  placeholder="Enter bank name"
                  @input="onBankInfoChange"></el-input>
              </el-form-item>
              
              <el-form-item 
                label="Bank Address" 
                prop="bankInfo.bankAddress">
                <el-input 
                  type="textarea"
                  v-model="refundForm.bankInfo.bankAddress" 
                  placeholder="Enter bank address"
                  :rows="3"
                  @input="onBankInfoChange"></el-input>
              </el-form-item>
            </div>
            
            <!-- 国内银行信息 -->
            <div v-if="refundForm.bankInfo.bankType === 'domestic'" class="bank-fields-section">
              <el-form-item 
                label="账户名称" 
                prop="bankInfo.accountName">
                <el-input 
                  v-model="refundForm.bankInfo.accountName" 
                  placeholder="请输入账户名称"
                  @input="onBankInfoChange"></el-input>
              </el-form-item>
              
              <el-form-item 
                label="开户行" 
                prop="bankInfo.bankName">
                <el-input 
                  v-model="refundForm.bankInfo.bankName" 
                  placeholder="请输入开户行名称"
                  @input="onBankInfoChange"></el-input>
              </el-form-item>
              
              <el-form-item 
                label="账户号码" 
                prop="bankInfo.accountNumber">
                <el-input 
                  v-model="refundForm.bankInfo.accountNumber" 
                  placeholder="请输入银行账户号码"
                  @input="onBankInfoChange"></el-input>
              </el-form-item>
            </div>
          </el-collapse-item>
        </el-collapse>
      </el-form>
      
      <div slot="footer">
        <el-button @click="dialogVisible = false">Cancel</el-button>
        <el-button type="primary" @click="submitRefund" :loading="loading">Submit Request</el-button>
      </div>
    </el-dialog>

    <!-- 退款历史对话框 -->
    <el-dialog
      title="Refund History"
      :visible.sync="historyDialogVisible"
      width="1000px">
      
      <div v-if="refundHistory.length === 0" class="empty-history">
        <el-empty description="No refund history records"></el-empty>
      </div>
      
      <el-timeline v-else>
        <el-timeline-item
          v-for="refund in refundHistory"
          :key="refund.id"
          :timestamp="formatDate(refund.requestTime)"
          placement="top">
          
          <el-card>
            <div class="history-header">
              <h4>Refund Request #{{ refund.id }}</h4>
              <el-tag :type="getRefundStatusType(refund.status)">
                {{ getRefundStatusText(refund.status) }}
              </el-tag>
            </div>
            
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="Registration Info">
                {{ refund.registration.productCode }} - {{ formatAmount(refund.registration) }}
              </el-descriptions-item>
              <el-descriptions-item label="Refund Amount">
                {{ formatRefundAmount(refund.refundAmount, refund.refundCurrency) }}
              </el-descriptions-item>
              <el-descriptions-item label="Request Reason" :span="2">
                {{ refund.reason }}
              </el-descriptions-item>
            </el-descriptions>
            
            <div v-if="refund.bankInfo" class="bank-details">
              <h5>Bank Information</h5>
              <el-descriptions :column="2" border size="small">
                <el-descriptions-item label="Account Holder">
                  {{ refund.bankInfo.accountName }}
                </el-descriptions-item>
                <el-descriptions-item label="Bank Name">
                  {{ refund.bankInfo.bankName }}
                </el-descriptions-item>
                <el-descriptions-item label="Account Number">
                  {{ maskAccountNumber(refund.bankInfo.accountNumber) }}
                </el-descriptions-item>
                <el-descriptions-item label="Country/Region">
                  {{ refund.bankInfo.country }}
                </el-descriptions-item>
              </el-descriptions>
            </div>
            
            <div v-if="refund.processTime" class="process-info">
              <h5>Processing Information</h5>
              <el-descriptions :column="2" border size="small">
                <el-descriptions-item label="Process Time">
                  {{ formatDate(refund.processTime) }}
                </el-descriptions-item>
                <el-descriptions-item label="Processed By" v-if="refund.processor">
                  {{ refund.processor.name }}
                </el-descriptions-item>
                <el-descriptions-item label="Refund Method" v-if="refund.refundMethod">
                  {{ formatRefundMethod(refund.refundMethod) }}
                </el-descriptions-item>
                <el-descriptions-item label="Transaction ID" v-if="refund.transactionId">
                  {{ refund.transactionId }}
                </el-descriptions-item>
                <el-descriptions-item label="Admin Notes" v-if="refund.adminNotes" :span="2">
                  {{ refund.adminNotes }}
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
  name: 'RefundManagement',
  data() {
    return {
      refundStatus: {
        hasApprovedRegistration: false,
        pendingRequest: null,
        approvedRequest: null,
        eligibleForRefund: false,
        ineligibleReasons: []
      },
      approvedRegistrations: [],
      dialogVisible: false,
      historyDialogVisible: false,
      loading: false,
      bankInfoCollapse: [], // 控制银行信息折叠面板（默认关闭）
      refundForm: {
        registrationId: '',
        reason: '',
        bankInfo: {
          bankType: '', // 'international' 或 'domestic'
          accountName: '',
          bankName: '',
          accountNumber: '',
          // 国际银行字段
          beneficiaryAddress: '',
          country: '',
          swiftCode: '',
          bankAddress: ''
        }
      },
      refundRules: {
        registrationId: [
          { required: true, message: 'Please select a registration to refund', trigger: 'change' }
        ],
        reason: [
          { required: true, message: 'Please provide refund reason', trigger: 'blur' },
          { min: 10, max: 1000, message: 'Reason must be between 10 and 1000 characters', trigger: 'blur' }
        ],
        'bankInfo.bankType': [
          { validator: this.validateBankInfo, trigger: 'change' }
        ],
        'bankInfo.accountName': [
          { validator: this.validateBankInfo, trigger: 'blur' }
        ],
        'bankInfo.bankName': [
          { validator: this.validateBankInfo, trigger: 'blur' }
        ],
        'bankInfo.accountNumber': [
          { validator: this.validateBankInfo, trigger: 'blur' }
        ],
        'bankInfo.beneficiaryAddress': [
          { validator: this.validateBankInfo, trigger: 'blur' }
        ],
        'bankInfo.country': [
          { validator: this.validateBankInfo, trigger: 'blur' }
        ],
        'bankInfo.swiftCode': [
          { validator: this.validateBankInfo, trigger: 'blur' }
        ],
        'bankInfo.bankAddress': [
          { validator: this.validateBankInfo, trigger: 'blur' }
        ]
      },
      refundHistory: []
    };
  },
  computed: {
    // 所有注册记录（包括已退款和未退款）
    allRegistrationsWithRefundStatus() {
      return this.approvedRegistrations.map(reg => {
        // 检查该注册是否已退款
        const isRefunded = reg.isRefunded || false;
        return {
          ...reg,
          isRefunded
        };
      });
    },
    
    eligibleRegistrations() {
      return this.approvedRegistrations.filter(reg => reg.refundEligible);
    },
    
    eligibleRegistrationsCount() {
      return this.eligibleRegistrations.length;
    },
    
    selectedRegistration() {
      if (!this.refundForm.registrationId) return null;
      return this.approvedRegistrations.find(reg => reg.id === this.refundForm.registrationId);
    },
    
    // 检测用户是否开始填写银行信息
    hasBankInfo() {
      const bankInfo = this.refundForm.bankInfo;
      return bankInfo.bankType || bankInfo.accountName || bankInfo.bankName || 
             bankInfo.accountNumber || bankInfo.beneficiaryAddress || 
             bankInfo.country || bankInfo.swiftCode || bankInfo.bankAddress;
    }
  },
  async mounted() {
    await this.loadApprovedRegistrations();
    await this.checkRefundStatus();
  },
  methods: {
    async loadApprovedRegistrations() {
      try {
        const response = await userService.getApprovedRegistrations();
        if (response && response.data) {
          this.approvedRegistrations = response.data;
        }
      } catch (error) {
        console.error('Failed to load approved registrations:', error);
        this.$message.error(this.getErrorMessage(error, 'Failed to get registration information'));
      }
    },
    
    async checkRefundStatus() {
      try {
        // 检查是否有已批准的注册
        this.refundStatus.hasApprovedRegistration = this.approvedRegistrations.length > 0;
        
        // 检查退款资格
        this.refundStatus.eligibleForRefund = this.approvedRegistrations.some(reg => reg.refundEligible);
        this.refundStatus.ineligibleReasons = this.approvedRegistrations
          .filter(reg => !reg.refundEligible && reg.refundIneligibleReason)
          .map(reg => reg.refundIneligibleReason)
          .filter((reason, index, self) => self.indexOf(reason) === index);
        
        // 检查待处理的退款申请
        const history = await userService.getRefundHistory();
        if (history && history.data) {
          const pendingRequest = history.data.find(refund => refund.status === 'pending');
          const approvedRequest = history.data.find(refund => refund.status === 'approved');
          this.refundStatus.pendingRequest = pendingRequest || null;
          this.refundStatus.approvedRequest = approvedRequest || null;
        }
      } catch (error) {
        console.error('Failed to check refund status:', error);
      }
    },
    
    selectRegistrationForRefund(registration) {
      this.refundForm.registrationId = registration.id;
      this.showRefundDialog();
    },
    
    showRefundDialog() {
      this.refundForm = {
        registrationId: '',
        reason: '',
        bankInfo: {
          bankType: '',
          accountName: '',
          bankName: '',
          accountNumber: '',
          beneficiaryAddress: '',
          country: '',
          swiftCode: '',
          bankAddress: ''
        }
      };
      this.bankInfoCollapse = []; // 重置折叠面板为关闭状态
      this.dialogVisible = true;
    },
    
    async showRefundHistory() {
      try {
        const response = await userService.getRefundHistory();
        this.refundHistory = response.data || [];
        this.historyDialogVisible = true;
      } catch (error) {
        console.error('Failed to load refund history:', error);
        this.$message.error(this.getErrorMessage(error, 'Failed to get refund history'));
      }
    },
    
    onRegistrationChange() {
      // 注册选择改变时的处理
    },
    
    // 银行类型改变时清空其他字段
    onBankTypeChange() {
      this.refundForm.bankInfo.accountName = '';
      this.refundForm.bankInfo.bankName = '';
      this.refundForm.bankInfo.accountNumber = '';
      this.refundForm.bankInfo.beneficiaryAddress = '';
      this.refundForm.bankInfo.country = '';
      this.refundForm.bankInfo.swiftCode = '';
      this.refundForm.bankInfo.bankAddress = '';
      
      // 清除校验状态
      this.$nextTick(() => {
        if (this.$refs.refundForm) {
          this.$refs.refundForm.clearValidate();
        }
      });
    },
    
    // 银行信息输入变化时触发重新校验
    onBankInfoChange() {
      // 延迟校验，避免用户还在输入时就显示错误
      this.$nextTick(() => {
        if (this.$refs.refundForm) {
          // 重新校验所有银行信息字段
          this.$refs.refundForm.validateField('bankInfo.bankType');
          this.$refs.refundForm.validateField('bankInfo.accountName');
          this.$refs.refundForm.validateField('bankInfo.bankName');
          this.$refs.refundForm.validateField('bankInfo.accountNumber');
          this.$refs.refundForm.validateField('bankInfo.beneficiaryAddress');
          this.$refs.refundForm.validateField('bankInfo.country');
          this.$refs.refundForm.validateField('bankInfo.swiftCode');
          this.$refs.refundForm.validateField('bankInfo.bankAddress');
        }
      });
    },
    
    // 银行信息校验方法
    validateBankInfo(rule, value, callback) {
      // 如果折叠面板未展开，跳过校验
      if (!this.bankInfoCollapse.includes('bankInfo')) {
        callback();
        return;
      }
      
      const bankInfo = this.refundForm.bankInfo;
      // 检查是否有实际填写的内容（排除空字符串）
      const hasAnyBankInfo = (bankInfo.bankType && bankInfo.bankType.trim()) || 
                           (bankInfo.accountName && bankInfo.accountName.trim()) || 
                           (bankInfo.bankName && bankInfo.bankName.trim()) || 
                           (bankInfo.accountNumber && bankInfo.accountNumber.trim()) || 
                           (bankInfo.beneficiaryAddress && bankInfo.beneficiaryAddress.trim()) || 
                           (bankInfo.country && bankInfo.country.trim()) || 
                           (bankInfo.swiftCode && bankInfo.swiftCode.trim()) || 
                           (bankInfo.bankAddress && bankInfo.bankAddress.trim());
      
      // 如果用户没有填写任何银行信息，则不需要校验
      if (!hasAnyBankInfo) {
        callback();
        return;
      }
      
      // 如果用户填写了银行信息，则需要校验必要字段
      const field = rule.field.split('.')[1]; // 获取字段名
      const bankType = bankInfo.bankType;
      
      switch (field) {
        case 'bankType':
          if (!value || value.trim() === '') {
            callback(new Error('Please select bank type when providing bank information'));
          } else {
            callback();
          }
          break;
          
        case 'accountName':
          if (bankType && (!value || value.trim() === '')) {
            callback(new Error('Account/Beneficiary name is required'));
          } else if (value && (value.length < 2 || value.length > 100)) {
            callback(new Error('Name must be between 2 and 100 characters'));
          } else {
            callback();
          }
          break;
          
        case 'bankName':
          if (bankType && (!value || value.trim() === '')) {
            callback(new Error('Bank name is required'));
          } else if (value && (value.length < 2 || value.length > 100)) {
            callback(new Error('Bank name must be between 2 and 100 characters'));
          } else {
            callback();
          }
          break;
          
        case 'accountNumber':
          if (bankType && (!value || value.trim() === '')) {
            callback(new Error('Account number is required'));
          } else if (value && (value.length < 5 || value.length > 50)) {
            callback(new Error('Account number must be between 5 and 50 characters'));
          } else {
            callback();
          }
          break;
          
        case 'beneficiaryAddress':
          // 仅国际银行需要
          if (bankType === 'international' && (!value || value.trim() === '')) {
            callback(new Error('Beneficiary address is required for international transfers'));
          } else if (value && (value.length < 10 || value.length > 500)) {
            callback(new Error('Address must be between 10 and 500 characters'));
          } else {
            callback();
          }
          break;
          
        case 'country':
          // 仅国际银行需要
          if (bankType === 'international' && (!value || value.trim() === '')) {
            callback(new Error('Country/Region is required for international transfers'));
          } else if (value && (value.length < 2 || value.length > 100)) {
            callback(new Error('Country/Region must be between 2 and 100 characters'));
          } else {
            callback();
          }
          break;
          
        case 'swiftCode':
          // 仅国际银行需要
          if (bankType === 'international' && (!value || value.trim() === '')) {
            callback(new Error('SWIFT code is required for international transfers'));
          } else if (value && (value.length < 8 || value.length > 11)) {
            callback(new Error('SWIFT code must be between 8 and 11 characters'));
          } else {
            callback();
          }
          break;
          
        case 'bankAddress':
          // 仅国际银行需要
          if (bankType === 'international' && (!value || value.trim() === '')) {
            callback(new Error('Bank address is required for international transfers'));
          } else if (value && (value.length < 10 || value.length > 500)) {
            callback(new Error('Bank address must be between 10 and 500 characters'));
          } else {
            callback();
          }
          break;
          
        default:
          callback();
      }
    },
    
    async submitRefund() {
      try {
        const valid = await this.$refs.refundForm.validate();
        if (!valid) return;
        
        this.loading = true;
        
        // 如果折叠面板未展开，清空银行信息
        const formData = { ...this.refundForm };
        if (!this.bankInfoCollapse.includes('bankInfo')) {
          formData.bankInfo = {
            bankType: '',
            accountName: '',
            bankName: '',
            accountNumber: '',
            beneficiaryAddress: '',
            country: '',
            swiftCode: '',
            bankAddress: ''
          };
        }
        
        // 检查退款资格
        const eligibilityCheck = await userService.checkRefundEligibility(formData.registrationId);
        if (!eligibilityCheck.data.eligible) {
          this.$message.error(eligibilityCheck.data.reason);
          return;
        }
        
        // 提交退款申请
        await userService.submitRefundRequest(formData);
        
        this.$message.success('Refund request submitted successfully! We will review your request within 5-10 business days and contact you.');
        this.dialogVisible = false;
        
        // 刷新状态
        await this.checkRefundStatus();
        
      } catch (error) {
        console.error('Refund request failed:', error);
        this.$message.error(this.getErrorMessage(error, 'Request submission failed'));
      } finally {
        this.loading = false;
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
    
    getProcessingDays(requestTime, processTime) {
      if (!requestTime || !processTime) return 'N/A';
      const request = new Date(requestTime);
      const process = new Date(processTime);
      const diffTime = Math.abs(process - request);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    },
    
    getRefundStatusType(status) {
      switch (status) {
        case 'approved': return 'success';
        case 'processed': return 'success';
        case 'rejected': return 'danger';
        case 'pending': return 'warning';
        default: return 'info';
      }
    },
    
    getRefundStatusText(status) {
      switch (status) {
        case 'approved': return 'Approved';
        case 'processed': return 'Processed';
        case 'rejected': return 'Rejected';
        case 'pending': return 'Pending Review';
        default: return status;
      }
    },
    
    maskAccountNumber(accountNumber) {
      if (!accountNumber) return 'N/A';
      if (accountNumber.length <= 4) return accountNumber;
      return '*'.repeat(accountNumber.length - 4) + accountNumber.slice(-4);
    },
    
    formatRefundMethod(method) {
      const methods = {
        'bank_transfer': 'Bank Transfer',
        'original_payment': 'Original Payment Method',
        'check': 'Check',
        'other': 'Other'
      };
      return methods[method] || method;
    },
    
    // 格式化金额显示 - 优先显示总价
    formatAmount(registration) {
      // 检查支付方式，如果是国内支付，优先显示人民币
      const paymentMethod = registration.paymentMethod || registration.payment_method;
      
      // 获取金额数据
      const totalAmountRmb = registration.totalAmountRMB || registration.total_amount_rmb;
      const totalAmountUsd = registration.totalAmountUSD || registration.total_amount_usd;
      const productPrice = registration.productPrice;
      
      // 如果支付方式是国内支付，优先显示人民币
      if (paymentMethod === 'domestic') {
        if (totalAmountRmb) {
          return `¥${totalAmountRmb}`;
        }
      }
      
      // 否则显示美元
      if (totalAmountUsd) {
        return `$${totalAmountUsd}`;
      }
      
      // 最后使用 productPrice 作为后备
      if (productPrice) {
        return `$${productPrice}`;
      }
      
      return '$0';
    },
    
    // 格式化退款金额显示（包含货币单位）
    formatRefundAmount(amount, currency) {
      if (!amount) return '$0';
      const curr = currency || 'USD';
      if (curr === 'RMB') {
        return `¥${amount} RMB`;
      }
      return `$${amount} USD`;
    },
    
    // 获取退款手续费文本
    getProcessingFeeText(registration) {
      if (!registration) return 'N/A';
      // 根据支付方式确定手续费
      if (registration.paymentMethod === 'domestic') {
        return '¥750 RMB';
      }
      return '$100 USD';
    },
    
    // 获取实际退款金额文本
    getActualRefundText(registration) {
      if (!registration) return 'N/A';
      
      const REFUND_FEE_USD = 100;
      const REFUND_FEE_RMB = 750;
      
      let actualAmount;
      let currency;
      
      if (registration.paymentMethod === 'domestic') {
        // 使用人民币
        const totalAmount = registration.totalAmountRMB || registration.productPriceRMB || 0;
        actualAmount = Math.max(0, totalAmount - REFUND_FEE_RMB);
        currency = 'RMB';
        return `¥${actualAmount.toFixed(2)} ${currency}`;
      } else {
        // 使用美元
        const totalAmount = registration.totalAmountUSD || registration.productPrice || 0;
        actualAmount = Math.max(0, totalAmount - REFUND_FEE_USD);
        currency = 'USD';
        return `$${actualAmount.toFixed(2)} ${currency}`;
      }
    },
    
    // 统一的错误处理方法
    getErrorMessage(error, defaultMessage = 'An error occurred') {
      if (!error) return defaultMessage;
      
      if (typeof error === 'string') {
        return error;
      }
      
      // 处理 HTTP 错误响应
      if (error.response && error.response.data) {
        const data = error.response.data;
        
        // 处理验证错误格式 (包含错误数组)
        if (data.message === 'Validation errors' && data.errors) {
          if (Array.isArray(data.errors) && data.errors.length > 0) {
            // 提取所有验证错误消息
            const validationMessages = data.errors.map(err => err.msg).filter(msg => msg);
            
            if (validationMessages.length > 0) {
              return validationMessages.join('; ');
            }
          }
        }
        
        // 处理其他错误格式
        if (data.message && data.message !== 'Validation errors') {
          return data.message;
        } else if (data.error) {
          return data.error;
        } else if (data.details) {
          return data.details;
        } else if (typeof data === 'string') {
          return data;
        } else {
          return `HTTP ${error.response.status}: ${error.response.statusText || 'Error'}`;
        }
      }
      
      // 处理其他类型的错误
      if (error.message) {
        return error.message;
      }
      
      if (error.toString && error.toString() !== '[object Object]') {
        return error.toString();
      }
      
      return defaultMessage;
    }
  }
};
</script>

<style scoped>

.card-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 20px 0;
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
  padding: 60px 40px;
}

.pending-request {
  margin-top: 30px;
}

.request-details {
  margin-top: 30px;
}

.request-details h4 {
  margin-bottom: 20px;
  color: #303133;
  font-size: 18px;
}

.refund-content {
  margin-top: 30px;
}

.eligibility-info {
  margin-bottom: 25px;
}

.approved-stats-info {
  margin: 25px 0;
}

/* Element UI的gutter已经提供了间距，只需确保卡片内容不贴边 */

/* 统计卡片样式 */
.stats-card {
  display: flex;
  align-items: center;
  padding: 24px;
  margin: 0 8px; /* 为卡片本身添加左右间距 */
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.2);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

/* 确保第一个和最后一个卡片不超出容器 */
.approved-stats-info .el-col:first-child .stats-card,
.eligibility-info .el-col:first-child .stats-card {
  margin-left: 0;
}

.approved-stats-info .el-col:last-child .stats-card,
.eligibility-info .el-col:last-child .stats-card {
  margin-right: 0;
}

.stats-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  pointer-events: none;
}

.stats-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.stats-card.approved-registrations {
  background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.2);
}

.stats-card.approved-registrations:hover {
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
}

.stats-card.eligible-refunds {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.2);
}

.stats-card.eligible-refunds:hover {
  box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
}

.stats-card.approved-refund-status {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.2);
}

.stats-card.approved-refund-status:hover {
  box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
}

.stats-card.refund-amount {
  background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);
  box-shadow: 0 4px 15px rgba(8, 145, 178, 0.2);
}

.stats-card.refund-amount:hover {
  box-shadow: 0 8px 25px rgba(8, 145, 178, 0.3);
}

.stats-card.processing-days {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.2);
}

.stats-card.processing-days:hover {
  box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
}

.stats-icon {
  font-size: 32px;
  margin-right: 20px;
  opacity: 0.9;
  min-width: 48px;
  text-align: center;
}

.stats-content {
  flex: 1;
}

.stats-number {
  font-size: 36px;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 8px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stats-label {
  font-size: 16px;
  font-weight: 500;
  opacity: 0.95;
  line-height: 1.2;
}

/* 表格操作按钮样式 */
.table-action-cell {
  padding: 0 8px;
  display: flex;
  justify-content: center;
}

.table-action-cell .el-button {
  border-radius: 6px;
  font-weight: 500;
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

.ineligible-reasons {
  margin: 20px 0;
}

.ineligible-reasons ul {
  margin: 10px 0 0 20px;
  padding: 0;
}

.ineligible-reasons li {
  margin-bottom: 5px;
}

.eligible-registrations {
  margin: 35px 0;
}

.eligible-registrations h4 {
  margin-bottom: 20px;
  color: #303133;
  font-size: 18px;
}

/* 桌面端显示表格，移动端隐藏 */
.desktop-table {
  display: block;
}

.mobile-cards {
  display: none;
}

/* 详情显示控制 */
.desktop-details {
  display: block;
}

.mobile-details {
  display: none;
}

/* 移动端详情卡片样式 */
.detail-card {
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  padding: 0;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f5f5f5;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-item.full-width {
  flex-direction: column;
  align-items: flex-start;
}

.detail-label {
  font-weight: 600;
  color: #666;
  font-size: 14px;
  margin-bottom: 0;
}

.detail-item.full-width .detail-label {
  margin-bottom: 8px;
}

.detail-value {
  color: #333;
  font-size: 14px;
  text-align: right;
  word-break: break-word;
}

.detail-item.full-width .detail-value {
  text-align: left;
  width: 100%;
}

.detail-value.amount-highlight {
  font-weight: 600;
  color: #10b981;
  font-size: 16px;
}

.detail-value.notes {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 8px;
  line-height: 1.5;
  border: 1px solid #e9ecef;
}

.detail-value .status-tag {
  font-size: 13px;
}

/* 移动端注册卡片样式 */
.registration-card {
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  margin-bottom: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.registration-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.card-header-info {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.product-code {
  font-size: 18px;
  font-weight: 600;
}

.amount {
  font-size: 16px;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 12px;
  border-radius: 20px;
}

.card-content {
  padding: 20px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  align-items: flex-start;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-row .label {
  font-weight: 600;
  color: #666;
  min-width: 100px;
  flex-shrink: 0;
}

.info-row .value {
  color: #333;
  text-align: right;
  flex: 1;
  word-break: break-all;
}

.time-secondary {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

.card-action {
  padding: 16px 20px;
  background: #fafafa;
  border-top: 1px solid #f0f0f0;
}

.card-action .el-button {
  font-weight: 500;
  border-radius: 8px;
}

.no-registrations {
  text-align: center;
  padding: 60px 40px;
}

.refund-policy-alert {
  margin-bottom: 24px;
}

.policy-content {
  line-height: 1.8;
  font-size: 14px;
}

.policy-content p {
  margin: 8px 0;
}

.policy-content ul {
  margin: 12px 0;
  padding-left: 24px;
}

.policy-content li {
  margin: 8px 0;
  line-height: 1.6;
}

.action-buttons {
  display: flex;
  gap: 20px;
  margin-top: 35px;
  justify-content: center;
}

.action-buttons .el-button {
  padding: 12px 30px;
  font-size: 16px;
}

.refund-form {
  margin-top: 30px;
}

.refund-form .el-form-item {
  margin-bottom: 25px;
}

.bank-info-note {
  color: #909399;
  font-size: 15px;
  margin-bottom: 25px;
  padding: 15px;
  background: #f0f9ff;
  border-left: 4px solid #409eff;
  border-radius: 4px;
}

.bank-info-collapse {
  margin-bottom: 20px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
}

.bank-info-collapse .el-collapse-item__header {
  padding: 0 20px;
  font-size: 15px;
  font-weight: 500;
  background-color: #f5f7fa;
}

.collapse-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.collapse-title i {
  font-size: 18px;
  color: #409eff;
}

.bank-info-alert {
  margin-bottom: 20px;
}

.bank-info-alert p {
  margin: 8px 0;
  line-height: 1.6;
}

.bank-fields-section {
  margin-top: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 20px 0 15px 0;
  padding-bottom: 10px;
  border-bottom: 2px solid #409eff;
}

.empty-history {
  text-align: center;
  padding: 60px 40px;
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

.bank-details, .process-info {
  margin: 20px 0;
}

.bank-details h5, .process-info h5 {
  margin-bottom: 15px;
  color: #606266;
  font-size: 16px;
}

.el-button {
  border-radius: 6px;
}

.el-alert {
  margin-bottom: 20px;
}

.el-statistic {
  text-align: center;
}



/* 其他注册区域样式 */
.refund-content {
  margin-top: 0;
}

.refund-content .eligibility-info:first-child {
  margin-top: 10px;
}

/* 所有注册列表样式 */
.all-registrations {
  margin: 30px 0;
}

.all-registrations h4 {
  font-size: 18px;
  margin-bottom: 20px;
  color: #333;
}

/* 已退款卡片样式 */
.refunded-card {
  background: #f6ffed;
  border: 1px solid #b7eb8f !important;
}

.refunded-status {
  text-align: center;
  padding: 10px 0;
}

.refunded-status .el-tag {
  font-size: 14px;
  padding: 8px 16px;
}

.not-eligible-status {
  text-align: center;
}

.not-eligible-reason {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

@media (max-width: 768px) {
  .refund-management {
    padding: 0;
  }
  
  .refund-management .el-card {
    margin: 10px;
    border-radius: 12px;
  }
  
  .refund-management .el-card__body {
    padding: 20px 16px;
  }
  
  .card-header {
    padding: 20px 0;
  }
  
  .card-title {
    font-size: 22px;
    margin-bottom: 12px;
    line-height: 1.3;
  }
  
  .card-subtitle {
    font-size: 15px;
    line-height: 1.4;
  }
  
  .empty-state,
  .no-registrations,
  .empty-history {
    padding: 40px 20px;
  }
  
  .empty-state .el-button,
  .no-registrations .el-button {
    padding: 12px 24px;
    font-size: 14px;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 12px;
    margin-top: 25px;
  }
  
  .action-buttons .el-button {
    padding: 12px 20px;
    font-size: 14px;
    width: 100%;
  }
  
  .eligibility-info .el-col,
  .approved-stats-info .el-col {
    margin-bottom: 12px;
  }
  
  /* 确保最后一个统计卡片没有底部边距 */
  .eligibility-info .el-col:last-child,
  .approved-stats-info .el-col:last-child {
    margin-bottom: 0;
  }
  
  .eligibility-info,
  .approved-stats-info {
    margin: 20px 0;
  }
  
  .stats-card {
    padding: 18px 16px;
    margin-bottom: 0;
    border-radius: 12px;
  }
  
  .stats-icon {
    font-size: 26px;
    margin-right: 14px;
    min-width: 36px;
  }
  
  .stats-number {
    font-size: 26px;
    margin-bottom: 4px;
  }
  
  .stats-label {
    font-size: 14px;
  }
  

  
  .request-details,
  .refund-content,
  .pending-request {
    margin-top: 25px;
  }
  
  .request-details {
    padding: 20px;
    background: #fafafa;
    border-radius: 12px;
    border: 1px solid #e8e8e8;
  }
  
  .request-details h4,
  .eligible-registrations h4 {
    font-size: 18px;
    margin-bottom: 20px;
    color: #333;
  }
  
  .eligible-registrations {
    margin: 30px 0;
  }
  
  /* 移动端隐藏表格，显示卡片 */
  .desktop-table {
    display: none;
  }
  
  .mobile-cards {
    display: block;
  }
  
  /* 移动端隐藏桌面端描述列表，显示移动端详情卡片 */
  .desktop-details {
    display: none;
  }
  
  .mobile-details {
    display: block;
  }
  
  .detail-item {
    padding: 14px 16px;
    flex-direction: column;
    align-items: flex-start;
  }
  
  .detail-label {
    margin-bottom: 6px;
    font-size: 13px;
  }
  
  .detail-value {
    text-align: left;
    font-size: 14px;
    width: 100%;
  }
  
  .detail-value.amount-highlight {
    font-size: 16px;
  }
  
  .registration-card {
    margin-bottom: 20px;
  }
  
  .card-header-info {
    padding: 14px 16px;
  }
  
  .product-code {
    font-size: 16px;
  }
  
  .amount {
    font-size: 14px;
  }
  
  .card-content {
    padding: 16px;
  }
  
  .info-row {
    margin-bottom: 14px;
    flex-direction: column;
    align-items: flex-start;
  }
  
  .info-row .label {
    margin-bottom: 4px;
    min-width: auto;
    font-size: 13px;
  }
  
  .info-row .value {
    text-align: left;
    font-size: 14px;
    word-break: break-word;
  }
  
  .card-action {
    padding: 12px 16px;
  }
  
  .card-action .el-button {
    padding: 12px;
    font-size: 14px;
  }
  
  /* 对话框移动端适配 */
  .el-dialog {
    width: 95% !important;
    margin-top: 5vh !important;
    margin-bottom: 5vh !important;
  }
  
  .el-dialog__body {
    padding: 15px 20px;
  }
  
  .el-dialog__header {
    padding: 15px 20px 0;
  }
  
  .el-dialog__footer {
    padding: 15px 20px 20px;
  }
  
  .el-dialog__title {
    font-size: 16px;
  }
  
  .refund-form .el-form-item {
    margin-bottom: 20px;
  }
  
  .refund-form .el-form-item__label {
    font-size: 14px;
    line-height: 1.4;
    padding-bottom: 8px;
  }
  
  .bank-info-note {
    font-size: 13px;
    padding: 12px;
    margin-bottom: 20px;
  }
  
  .bank-info-collapse .el-collapse-item__header {
    padding: 0 15px;
    font-size: 14px;
  }
  
  .collapse-title i {
    font-size: 16px;
  }
  
  .bank-info-alert {
    font-size: 13px;
  }
  
  .bank-info-alert p {
    margin: 6px 0;
  }
  
  .section-title {
    font-size: 15px;
    margin: 15px 0 12px 0;
  }
  
  /* 历史记录对话框适配 */
  .el-timeline-item__timestamp {
    font-size: 12px;
  }
  
  .history-header h4 {
    font-size: 14px;
  }
  
  .bank-details h5,
  .process-info h5 {
    font-size: 14px;
    margin-bottom: 10px;
  }
  
  /* 描述列表移动端适配 */
  .el-descriptions {
    margin-bottom: 20px;
  }
  
  .el-descriptions__label {
    font-size: 14px !important;
    font-weight: 600 !important;
    color: #666 !important;
    padding: 8px !important;
  }
  
  .el-descriptions__content {
    font-size: 14px !important;
    color: #333 !important;
    padding: 8px !important;
    word-break: break-word;
  }
  
  .el-descriptions-item__cell {
    padding: 8px !important;
  }
  
  /* 移动端描述列表单列显示 */
  .el-descriptions--border .el-descriptions-item__cell {
    border-right: none !important;
  }
  
  /* 警告框移动端适配 */
  .el-alert {
    margin-bottom: 20px;
    padding: 16px;
    border-radius: 12px;
  }
  
  .el-alert__title {
    font-size: 16px;
    font-weight: 600;
  }
  
  .el-alert__description {
    font-size: 14px;
    margin-top: 8px;
    line-height: 1.5;
  }
  
  .ineligible-reasons {
    margin: 15px 0;
  }
  
  .ineligible-reasons ul {
    margin-left: 15px;
  }
  
  .ineligible-reasons li {
    font-size: 13px;
    line-height: 1.4;
  }
  
  /* 已批准请求详情适配 */
  .approved-request {
    margin: 25px 0;
  }
  
  .approved-request .el-alert {
    margin-bottom: 25px;
  }
  
  .approved-request .request-details {
    padding: 20px;
    margin-top: 20px;
    border-radius: 12px;
  }
  
  .approved-request .request-details h4 {
    font-size: 18px;
    margin-bottom: 16px;
  }
}

@media (max-width: 560px) {
  .refund-management .el-card {
    margin: 8px;
  }
  
  .refund-management .el-card__body {
    padding: 16px 12px;
  }
  
  .card-header {
    padding: 16px 0;
  }
  
  .card-title {
    font-size: 20px;
    line-height: 1.2;
  }
  
  .card-subtitle {
    font-size: 14px;
    line-height: 1.4;
  }
  
  .stats-card {
    padding: 16px 12px;
    flex-direction: column;
    text-align: center;
    margin-bottom: 8px;
  }
  
  /* 小屏幕上的统计卡片行间距 */
  .eligibility-info .el-col,
  .approved-stats-info .el-col {
    margin-bottom: 12px;
  }
  
  .eligibility-info .el-col:last-child,
  .approved-stats-info .el-col:last-child {
    margin-bottom: 0;
  }
  
  .stats-icon {
    font-size: 32px;
    margin-right: 0;
    margin-bottom: 10px;
  }
  
  .stats-number {
    font-size: 32px;
    margin-bottom: 4px;
  }
  
  .stats-label {
    font-size: 14px;
  }
  
  .empty-state,
  .no-registrations,
  .empty-history {
    padding: 40px 20px;
  }
  
  .action-buttons {
    margin-top: 30px;
    gap: 16px;
  }
  
  .action-buttons .el-button {
    font-size: 14px;
    padding: 14px 20px;
    border-radius: 8px;
  }
  
  .el-dialog {
    width: 98% !important;
    margin: 2vh auto !important;
  }
  
  .el-dialog__body {
    padding: 10px 15px;
  }
  
  .el-dialog__header {
    padding: 10px 15px 0;
  }
  
  .el-dialog__footer {
    padding: 10px 15px 15px;
  }
  
  .refund-form .el-form-item__label {
    font-size: 13px;
  }
  
  .bank-info-note {
    font-size: 12px;
    padding: 10px;
  }
  
  .bank-info-collapse .el-collapse-item__header {
    padding: 0 12px;
    font-size: 13px;
  }
  
  .collapse-title {
    gap: 6px;
  }
  
  .collapse-title i {
    font-size: 15px;
  }
  
  .bank-info-alert {
    font-size: 12px;
  }
  
  .bank-info-alert p {
    margin: 5px 0;
  }
  
  .section-title {
    font-size: 14px;
    margin: 12px 0 10px 0;
  }
  
  /* 超小屏幕卡片优化 */
  .eligible-registrations {
    margin: 25px 0;
  }
  
  .registration-card {
    margin-bottom: 16px;
    border-radius: 10px;
  }
  
  .card-header-info {
    padding: 12px 14px;
  }
  
  .product-code {
    font-size: 15px;
  }
  
  .amount {
    font-size: 13px;
    padding: 3px 10px;
  }
  
  .card-content {
    padding: 14px;
  }
  
  .info-row {
    margin-bottom: 12px;
  }
  
  .info-row .label {
    font-size: 12px;
    margin-bottom: 3px;
  }
  
  .info-row .value {
    font-size: 13px;
  }
  
  .card-action {
    padding: 10px 14px;
  }
  
  .card-action .el-button {
    padding: 10px;
    font-size: 13px;
  }
  
  /* 超小屏幕详情卡片优化 */
  .detail-item {
    padding: 12px 14px;
  }
  
  .detail-label {
    font-size: 12px;
    margin-bottom: 4px;
  }
  
  .detail-value {
    font-size: 13px;
  }
  
  .detail-value.amount-highlight {
    font-size: 15px;
  }
  
  .detail-value.notes {
    padding: 10px;
    font-size: 12px;
  }
}
</style>
