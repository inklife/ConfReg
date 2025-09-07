<template>
  <div class="attendee-management">
    <el-card>
      <div slot="header" class="card-header">
        <span class="card-title">Attendee Information Transfer</span>
        <p class="card-subtitle">Modify registered attendee information for cases where the original attendee cannot
          attend</p>
      </div>

      <!-- 无已批准注册的状态 -->
      <div v-if="!transferStatus.hasApprovedRegistration" class="empty-state">
        <el-empty description="You need to have an approved registration before requesting attendee transfer">
          <el-button type="primary" @click="$router.push('/conference/auto')">Register Now</el-button>
        </el-empty>
      </div>

      <!-- 有待处理的变更申请 -->
      <div v-else-if="transferStatus.pendingTransfer" class="pending-request">
        <el-alert title="Pending Transfer Request" type="warning" :closable="false" show-icon>
        </el-alert>

        <div class="request-details">
          <h4>Request Details</h4>
          <el-descriptions :column="2">
            <el-descriptions-item label="Request Time">
              {{ formatDate(transferStatus.pendingTransfer.requestTime) }}
            </el-descriptions-item>
            <el-descriptions-item label="Status">
              <el-tag type="warning">Pending Admin Review</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="New Attendee Name">
              {{ transferStatus.pendingTransfer.newAttendee.name }}
            </el-descriptions-item>
            <el-descriptions-item label="New Attendee Email">
              {{ transferStatus.pendingTransfer.newAttendee.email }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>

      <!-- 不能变更的状态 -->
      <div v-else-if="!transferStatus.canTransfer" class="cannot-transfer">
        <el-alert :title="transferStatus.reason || 'Cannot request transfer at the moment'" type="info"
          :closable="false" show-icon>
        </el-alert>
      </div>

      <!-- 可以申请变更的状态 -->
      <div v-else class="can-transfer">
        <!-- 重要提示 -->
        <el-alert title="Important: Current Registration Information" type="info" :closable="false" show-icon>
          <p>This is your current registration information. If the original attendee cannot attend, you can request an
            attendee transfer to change this information while keeping your registration and payment status.</p>
        </el-alert>

        <div class="current-info-card">
          <div class="current-info-header">
            <h3 class="current-info-title">
              <i class="el-icon-user"></i>
              Current Registration Information
            </h3>
            <el-tag type="success" size="medium">
              <i class="el-icon-check"></i>
              Registered & Approved
            </el-tag>
          </div>

          <div class="registration-details">
            <el-card class="info-card" shadow="hover">
              <div class="info-item">
                <div class="info-label">
                  <i class="el-icon-user-solid"></i>
                  Attendee Name
                </div>
                <div class="info-value">{{ transferStatus.currentRegistration.name }}</div>
              </div>

              <div class="info-item">
                <div class="info-label">
                  <i class="el-icon-message"></i>
                  Email Address
                </div>
                <div class="info-value">{{ transferStatus.currentRegistration.email }}</div>
              </div>

              <div class="info-item" v-if="transferStatus.currentRegistration.phone">
                <div class="info-label">
                  <i class="el-icon-phone"></i>
                  Phone Number
                </div>
                <div class="info-value">{{ transferStatus.currentRegistration.phone }}</div>
              </div>

              <div class="info-item" v-if="transferStatus.currentRegistration.affiliation">
                <div class="info-label">
                  <i class="el-icon-office-building"></i>
                  Affiliation
                </div>
                <div class="info-value">{{ transferStatus.currentRegistration.affiliation }}</div>
              </div>
            </el-card>
          </div>

          <div class="action-buttons">
            <el-button type="primary" @click="showTransferDialog" icon="el-icon-edit">
              Request Attendee Transfer
            </el-button>
            <el-button type="info" @click="showHistory" icon="el-icon-document">
              View Transfer History
            </el-button>
          </div>

          <div class="transfer-notice">
            <el-alert title="Need to change attendee information?" type="warning" :closable="false" show-icon>
              <p>If the registered attendee cannot attend the conference, you can request an attendee transfer. This
                will:</p>
              <ul>
                <li>Keep your registration and payment status unchanged</li>
                <li>Update the attendee information for certificates and conference materials</li>
                <li>Require admin approval for the change</li>
              </ul>
            </el-alert>
          </div>
        </div>

      </div>
    </el-card>

    <!-- 变更申请对话框 -->
    <el-dialog title="Request Attendee Transfer" :visible.sync="dialogVisible" width="600px"
      :close-on-click-modal="false">

      <el-alert title="Important Notice" type="warning" :closable="false" show-icon>
        <p>This operation will change your registered attendee information. The registration and payment remain under
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
      </el-form>

      <div slot="footer">
        <el-button @click="dialogVisible = false">Cancel</el-button>
        <el-button type="primary" @click="submitTransfer" :loading="loading">Submit Request</el-button>
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
        pendingTransfer: null,
        canTransfer: false,
        currentRegistration: null,
        reason: ''
      },
      dialogVisible: false,
      historyDialogVisible: false,
      loading: false,
      transferForm: {
        newAttendee: {
          name: '',
          email: '',
          phone: '',
          affiliation: ''
        },
        reason: ''
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
        ]
      },
      transferHistory: []
    };
  },
  async mounted() {
    await this.checkTransferStatus();
  },
  methods: {
    async checkTransferStatus() {
      try {
        const response = await userService.checkTransferStatus();
        if (response && response.data) {
          this.transferStatus = response.data;
        }
      } catch (error) {
        console.error('Failed to check transfer status:', error);
        this.$message.error('Failed to load transfer status');
      }
    },

    showTransferDialog() {
      this.transferForm = {
        newAttendee: {
          name: '',
          email: '',
          phone: '',
          affiliation: ''
        },
        reason: ''
      };
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

        this.loading = true;

        await userService.transferRegistration(this.transferForm);

        this.$message.success('Attendee transfer request submitted successfully! Please wait for admin review.');
        this.dialogVisible = false;

        // 刷新状态
        await this.checkTransferStatus();

      } catch (error) {
        console.error('Transfer request failed:', error);
        this.$message.error(error || 'Request submission failed');
      } finally {
        this.loading = false;
      }
    },

    formatDate(dateString) {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleString('en-US');
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

.pending-request {
  margin-top: 32px;
}

.request-details {
  margin-top: 32px;
}

.request-details h4 {
  margin-bottom: 20px;
  color: #303133;
  font-size: 20px;
}

.cannot-transfer {
  margin-top: 20px;
}

.can-transfer {
  margin-top: 20px;
}

.current-info-card {
  margin: 20px 0;
}

.current-info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px 0;
  border-bottom: 2px solid #e4e7ed;
}

.current-info-title {
  margin: 0;
  color: #303133;
  font-size: 22px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.current-info-title i {
  color: #409EFF;
  font-size: 24px;
}

.registration-details {
  margin-bottom: 25px;
}

.info-card {
  background: linear-gradient(135deg, #ffffff 0%, #f0f8ff 100%);
  border: 1px solid #e1f3ff;
  border-radius: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(64, 158, 255, 0.1);
  background: rgba(255, 255, 255, 0.95);
  margin-bottom: 8px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.08);
  border: 1px solid rgba(64, 158, 255, 0.1);
}

.info-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.info-label {
  font-weight: 600;
  color: #606266;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
}

.info-label i {
  color: #409EFF;
  font-size: 16px;
}

.info-value {
  color: #303133;
  font-weight: 500;
  font-size: 15px;
  text-align: right;
  flex: 1;
  margin-left: 20px;
}

.transfer-notice {
  margin-top: 20px;
}

.transfer-notice ul {
  margin: 10px 0 0 20px;
  padding: 0;
}

.transfer-notice li {
  margin: 6px 0;
  color: #E6A23C;
  font-weight: 500;
}

.current-info {
  margin-bottom: 25px;
}

.action-buttons {
  display: flex;
  gap: 12px;
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
  .change-comparison {
    flex-direction: column;
  }

  .arrow {
    transform: rotate(90deg);
  }

  .action-buttons {
    flex-direction: column;
  }

  .current-info-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .current-info-title {
    font-size: 20px;
  }

  .info-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    text-align: left;
  }

  .info-value {
    text-align: left;
    margin-left: 0;
    width: 100%;
    padding: 8px 12px;
    background: rgba(64, 158, 255, 0.05);
    border-radius: 4px;
    border: 1px solid rgba(64, 158, 255, 0.15);
  }
}
</style>
