<template>
  <div class="invoice-management">
    <div class="management-header">
      <h2 class="section-title">Invoice Management</h2>
      <p class="section-description">Submit invoice requests and manage your invoices</p>
    </div>

    <!-- 功能选项卡 -->
    <el-tabs v-model="activeTab" @tab-click="handleTabClick">
      <!-- 动态显示标签页：有历史记录时优先显示My Requests -->
      <el-tab-pane 
        v-if="hasInvoiceRequests" 
        label="My Requests" 
        name="history">
        <div class="tab-content">
          <div v-if="loadingHistory" class="loading-state">
            <el-icon class="is-loading"><loading /></el-icon>
            <p>Loading invoice requests...</p>
          </div>

          <div v-else-if="invoiceRequests.length === 0" class="empty-state">
            <el-icon><document /></el-icon>
            <p>No invoice requests found</p>
            <small>You haven't submitted any invoice requests yet</small>
          </div>

          <div v-else class="request-list">
            <el-card v-for="request in invoiceRequests" :key="request.id" class="request-card">
              <div class="request-header">
                <div class="request-info">
                  <h4>{{ request.invoiceTitle }}</h4>
                  <p class="request-id">Request ID: {{ request.id }}</p>
                </div>
                <div class="request-status">
                  <el-tag :type="getInvoiceTagType(request.status)" size="medium">
                    {{ getStatusText(request.status) }}
                  </el-tag>
                </div>
              </div>
              
              <div class="request-details">
                <el-row :gutter="20">
                  <el-col :span="8">
                    <p><strong>Invoice Type:</strong> {{ request.invoiceType === 'electronic' ? 'Electronic' : 'Paper' }}</p>
                    <p><strong>Amount:</strong> ${{ request.amount }}</p>
                  </el-col>
                  <el-col :span="8">
                    <p><strong>Request Date:</strong> {{ formatDate(request.created_at) }}</p>
                    <p><strong>Content:</strong> {{ request.content }}</p>
                  </el-col>
                  <el-col :span="8">
                    <p v-if="request.taxNumber"><strong>Tax Number:</strong> {{ request.taxNumber }}</p>
                    <p v-if="request.processingNote"><strong>Note:</strong> {{ request.processingNote }}</p>
                    <p v-if="request.files && request.files.length > 0" class="files-info">
                      <strong>Files:</strong> 
                      <el-tag size="small" type="success">{{ request.files.length }} file(s)</el-tag>
                    </p>
                  </el-col>
                </el-row>
              </div>

              <div class="request-actions">
                <!-- 显示文件信息和下载按钮 -->
                <div v-if="request.status === 'completed' && request.files && request.files.length > 0" class="invoice-files-section">
                  <div v-if="request.files.length === 1" class="single-file-download">
                    <el-button 
                      type="primary" 
                      size="small"
                      @click="downloadSingleFile(request.files[0])">
                      <i class="el-icon-download"></i>
                      Download Invoice
                    </el-button>
                  </div>
                  <div v-else class="multiple-files-download">
                    <!-- 改用下拉菜单的多文件下载界面 -->
                    <el-dropdown @command="handleDownloadCommand" trigger="click" placement="bottom-start">
                      <el-button type="primary" size="small">
                        <i class="el-icon-download"></i>
                        Download Files ({{ request.files.length }})
                        <i class="el-icon-arrow-down el-icon--right"></i>
                      </el-button>
                      <el-dropdown-menu slot="dropdown">
                        <el-dropdown-item 
                          v-for="(file, index) in sortFilesByDisplayOrder(request.files)" 
                          :key="file.id"
                          :command="{ type: 'single', file: file }"
                          class="download-item">
                          <i class="el-icon-document"></i>
                          <span class="file-name">{{ file.originalName || `Invoice File ${index + 1}` }}</span>
                        </el-dropdown-item>
                        <el-dropdown-item divided :command="{ type: 'all', files: request.files }" class="download-all-item">
                          <i class="el-icon-folder-opened"></i>
                          <span class="download-all-text">Download All Files</span>
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </el-dropdown>
                  </div>
                </div>
                
                <el-button 
                  v-if="['pending'].includes(request.status)"
                  type="danger" 
                  size="small"
                  @click="cancelRequest(request.id)">
                  Cancel Request
                </el-button>
                <el-button 
                  size="small"
                  @click="viewRequestDetails(request)">
                  View Details
                </el-button>
              </div>
            </el-card>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="New Request" name="request">
        <div class="tab-content">
          <!-- Step Indicator -->
          <div class="step-indicator">
            <div class="step-item" :class="{ active: step === 1 }">
              <div class="step-number">1</div>
              <span class="step-label">
                <span class="step-label-full">Select Registration</span>
                <span class="step-label-short">Select</span>
              </span>
            </div>
            <div class="step-divider"></div>
            <div class="step-item" :class="{ active: step === 2 }">
              <div class="step-number">2</div>
              <span class="step-label">
                <span class="step-label-full">Invoice Information</span>
                <span class="step-label-short">Invoice</span>
              </span>
            </div>
            <div class="step-divider"></div>
            <div class="step-item" :class="{ active: step === 3 }">
              <div class="step-number">3</div>
              <span class="step-label">
                <span class="step-label-full">Submit Request</span>
                <span class="step-label-short">Submit</span>
              </span>
            </div>
          </div>

          <div class="step-content">
            <!-- Step 1: Select Registration -->
            <div v-if="step === 1" class="step-panel">
              <h3>Select Registration Record for Invoice</h3>
              
              <div v-if="loading" class="loading-state">
                <el-icon class="is-loading"><loading /></el-icon>
                <p>Loading registrations...</p>
              </div>

              <div v-else-if="registrations.length === 0" class="empty-state">
                <el-icon><document /></el-icon>
                <p>No registration records available for invoice</p>
                <small>Only approved registration records can request invoices</small>
              </div>

              <div v-else class="registration-list">
                <div v-for="registration in registrations" :key="registration.id"
                     class="registration-card"
                     :class="{ 
                       selected: selectedRegistration && selectedRegistration.id === registration.id,
                       disabled: hasActivePendingRequest(registration)
                     }"
                     @click="selectRegistration(registration)">
                  <div class="card-header">
                    <h4>{{ registration.name || 'Registration Record' }}</h4>
                    <span class="price">${{ registration.product_price }}</span>
                  </div>
                  <div class="card-body">
                    <p><strong>Product Code:</strong> {{ registration.product_code }}</p>
                    <p><strong>Registration Date:</strong> {{ formatDate(registration.created_at) }}</p>
                    <p><strong>Status:</strong> 
                      <el-tag type="success" size="small">{{ registration.status }}</el-tag>
                    </p>
                  </div>
                  <div v-if="registration.invoiceRequests && registration.invoiceRequests.length > 0" class="invoice-history">
                    <p><strong>Invoice Requests:</strong></p>
                    <div v-for="request in registration.invoiceRequests" :key="request.id" class="invoice-item">
                      <el-tag :type="getInvoiceTagType(request.status)" size="small">
                        {{ getStatusText(request.status) }}
                      </el-tag>
                      <span class="date">{{ formatDate(request.created_at) }}</span>
                    </div>
                  </div>
                  <div v-if="hasActivePendingRequest(registration)" class="pending-notice">
                    <el-alert
                      title="This registration has a pending invoice request"
                      type="warning"
                      :closable="false"
                      show-icon>
                    </el-alert>
                  </div>
                </div>
              </div>

              <div v-if="selectedRegistration" class="step-actions">
                <el-button type="primary" @click="nextStep">Next Step</el-button>
              </div>
            </div>

            <!-- Step 2: Invoice Information -->
            <div v-if="step === 2" class="step-panel">
              <h3>Invoice Information</h3>
              
              <el-form :model="form" label-width="140px" class="invoice-form">
                <el-form-item label="Invoice Type">
                  <el-radio-group v-model="form.invoiceType">
                    <el-radio label="electronic">Electronic Invoice</el-radio>
                    <el-radio label="paper">Paper Invoice</el-radio>
                  </el-radio-group>
                </el-form-item>

                <el-form-item label="Invoice Title" required>
                  <el-input v-model="form.invoiceTitle" placeholder="Please enter invoice title"></el-input>
                </el-form-item>

                <el-form-item label="Invoice Content">
                  <el-input v-model="form.content" placeholder="Conference Registration Fee"></el-input>
                </el-form-item>

                <el-form-item label="Tax Number">
                  <el-input v-model="form.taxNumber" placeholder="Enter tax ID number (required for corporate invoices)"></el-input>
                </el-form-item>

                <div v-if="form.taxNumber" class="corporate-info">
                  <el-form-item label="Bank Name">
                    <el-input v-model="form.bankName" placeholder="Enter bank name"></el-input>
                  </el-form-item>

                  <el-form-item label="Bank Account">
                    <el-input v-model="form.bankAccount" placeholder="Enter bank account number"></el-input>
                  </el-form-item>

                  <el-form-item label="Registered Address">
                    <el-input v-model="form.registeredAddress" placeholder="Enter company registered address"></el-input>
                  </el-form-item>

                  <el-form-item label="Registered Phone">
                    <el-input v-model="form.registeredPhone" placeholder="Enter company registered phone"></el-input>
                  </el-form-item>
                </div>

                <div v-if="form.invoiceType === 'paper'" class="mailing-info">
                  <h4>Mailing Information</h4>
                  <el-form-item label="Mailing Address" required>
                    <el-input type="textarea" :rows="3" v-model="form.mailingAddress" 
                              placeholder="Please enter detailed mailing address"></el-input>
                  </el-form-item>

                  <el-form-item label="Recipient" required>
                    <el-input v-model="form.recipient" placeholder="Enter recipient name"></el-input>
                  </el-form-item>

                  <el-form-item label="Recipient Phone" required>
                    <el-input v-model="form.recipientPhone" placeholder="Enter recipient phone number"></el-input>
                  </el-form-item>
                </div>

                <el-form-item label="Notes">
                  <el-input type="textarea" :rows="3" v-model="form.notes" 
                            placeholder="Please enter notes (optional)"></el-input>
                </el-form-item>
              </el-form>

              <div class="step-actions">
                <el-button @click="prevStep">Previous Step</el-button>
                <el-button type="primary" @click="nextStep">Next Step</el-button>
              </div>
            </div>

            <!-- Step 3: Confirm Submission -->
            <div v-if="step === 3" class="step-panel">
              <h3>Confirm Request Information</h3>
              
              <div class="confirmation-content">
                <el-row :gutter="20">
                  <el-col :span="12">
                    <div class="info-section">
                      <h4>Registration Information</h4>
                      <p><strong>Name:</strong> {{ selectedRegistration.name }}</p>
                      <p><strong>Product:</strong> {{ selectedRegistration.product_code }}</p>
                      <p><strong>Amount:</strong> ${{ selectedRegistration.product_price }}</p>
                    </div>
                  </el-col>
                  <el-col :span="12">
                    <div class="info-section">
                      <h4>Invoice Information</h4>
                      <p><strong>Type:</strong> {{ form.invoiceType === 'electronic' ? 'Electronic Invoice' : 'Paper Invoice' }}</p>
                      <p><strong>Header:</strong> {{ form.invoiceTitle }}</p>
                      <p><strong>Content:</strong> {{ form.content || 'Conference Registration Fee' }}</p>
                    </div>
                  </el-col>
                </el-row>
                
                <div v-if="form.taxNumber" class="info-section">
                  <h4>Corporate Information</h4>
                  <p><strong>Tax ID Number:</strong> {{ form.taxNumber }}</p>
                  <p v-if="form.bankName"><strong>Bank Name:</strong> {{ form.bankName }}</p>
                  <p v-if="form.bankAccount"><strong>Bank Account:</strong> {{ form.bankAccount }}</p>
                </div>
                
                <div v-if="form.invoiceType === 'paper'" class="info-section">
                  <h4>Mailing Information</h4>
                  <p><strong>Address:</strong> {{ form.mailingAddress }}</p>
                  <p><strong>Recipient:</strong> {{ form.recipient }}</p>
                  <p><strong>Phone:</strong> {{ form.recipientPhone }}</p>
                </div>
              </div>

              <div class="step-actions">
                <el-button @click="prevStep">Previous Step</el-button>
                <el-button type="primary" :loading="submitting" @click="submitRequest">
                  Submit Request
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 只有在没有历史记录时才显示 My Requests 标签页 -->
      <el-tab-pane 
        v-if="!hasInvoiceRequests" 
        label="My Requests" 
        name="history">
        <div class="tab-content">
          <div v-if="loadingHistory" class="loading-state">
            <el-icon class="is-loading"><loading /></el-icon>
            <p>Loading invoice requests...</p>
          </div>

          <div v-else class="empty-state">
            <el-icon><document /></el-icon>
            <p>No invoice requests found</p>
            <small>You haven't submitted any invoice requests yet</small>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script>
import { invoiceService } from '../../_services/invoice.service.js';

export default {
  name: 'InvoiceManagement',
  data() {
    return {
      activeTab: 'request', // 默认值，会在mounted中根据实际情况调整
      step: 1,
      loading: true,
      loadingHistory: false,
      submitting: false,
      registrations: [],
      invoiceRequests: [],
      selectedRegistration: null,
      form: {
        invoiceType: 'electronic',
        invoiceTitle: '',
        taxNumber: '',
        bankName: '',
        bankAccount: '',
        registeredAddress: '',
        registeredPhone: '',
        mailingAddress: '',
        recipient: '',
        recipientPhone: '',
        notes: '',
        content: 'Conference Registration Fee'
      }
    };
  },
  computed: {
    hasInvoiceRequests() {
      return this.invoiceRequests && this.invoiceRequests.length > 0;
    }
  },
  mounted() {
    this.initializeComponent();
  },
  beforeUnmount() {
    // 清理全局函数
    if (window.downloadFileFromDetails) {
      delete window.downloadFileFromDetails;
    }
    if (window.downloadAllFilesFromDetails) {
      delete window.downloadAllFilesFromDetails;
    }
  },
  methods: {
    // 初始化组件
    async initializeComponent() {
      this.setupGlobalDownloadFunctions();
      
      // 同时加载注册记录和发票请求历史
      await Promise.all([
        this.loadRegistrations(),
        this.loadInvoiceHistory()
      ]);
      
      // 根据是否有发票请求来设置默认标签页
      if (this.hasInvoiceRequests) {
        this.activeTab = 'history';
      } else {
        this.activeTab = 'request';
      }
    },

    // 设置全局下载函数，用于在详情弹窗中调用
    setupGlobalDownloadFunctions() {
      const self = this;
      
      // 单文件下载函数
      window.downloadFileFromDetails = async (fileId, fileName) => {
        try {
          console.log('从详情中下载文件:', fileId, fileName);
          await self.downloadSingleFile({ id: fileId, originalName: fileName });
        } catch (error) {
          console.error('详情下载失败:', error);
          self.$message.error('Download failed: ' + error.message);
        }
      };
      
      // 批量下载函数
      window.downloadAllFilesFromDetails = async (filesInfo) => {
        try {
          console.log('从详情中批量下载:', filesInfo);
          const files = filesInfo.map(info => ({ id: info.id, originalName: info.name }));
          // 确保文件按显示顺序排序
          const sortedFiles = self.sortFilesByDisplayOrder(files);
          await self.downloadAllFiles(sortedFiles);
        } catch (error) {
          console.error('详情批量下载失败:', error);
          self.$message.error('Batch download failed: ' + error.message);
        }
      };
    },

    async loadRegistrations() {
      try {
        this.loading = true;
        const response = await invoiceService.getRegistrations();
        this.registrations = response.registrations || [];
      } catch (error) {
        console.error('获取注册记录失败:', error);
        this.$message.error('Failed to load registration records: ' + error.message);
      } finally {
        this.loading = false;
      }
    },

    async loadInvoiceHistory() {
      try {
        this.loadingHistory = true;
        const response = await invoiceService.getMyRequests();
        this.invoiceRequests = response.requests || [];
      } catch (error) {
        console.error('获取发票申请历史失败:', error);
        this.$message.error('Failed to load invoice requests: ' + error.message);
      } finally {
        this.loadingHistory = false;
      }
    },

    handleTabClick(tab) {
      // 当切换到历史记录标签页时，如果还没有加载过，则重新加载
      if (tab.name === 'history' && !this.loadingHistory) {
        this.loadInvoiceHistory();
      }
    },

    hasActivePendingRequest(registration) {
      if (!registration.invoiceRequests) return false;
      return registration.invoiceRequests.some(
        request => ['pending', 'processing'].includes(request.status)
      );
    },
    
    selectRegistration(registration) {
      // 检查是否已有待处理的发票申请
      if (this.hasActivePendingRequest(registration)) {
        this.$message.warning('This registration already has a pending invoice request. Please wait for it to be processed or cancel it first.');
        return;
      }
      
      this.selectedRegistration = registration;
    },

    async downloadInvoice(request) {
      // 保留原有方法作为向后兼容，但修改为下载第一个文件
      if (request.files && request.files.length > 0) {
        await this.downloadSingleFile(request.files[0]);
      } else {
        this.$message.error('No invoice file available for download');
      }
    },

    async downloadSingleFile(file) {
      console.log('Downloading single file:', file); // 添加调试日志
      try {
        const blob = await invoiceService.downloadFile(file.id);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.originalName || `invoice-${file.id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        this.$message.success(`File "${file.originalName}" downloaded successfully!`);
      } catch (error) {
        console.error('下载文件失败:', error);
        this.$message.error('Failed to download file: ' + error.message);
      }
    },

    async downloadAllFiles(files) {
      console.log('Downloading all files:', files); // 添加调试日志
      try {
        this.$message.info(`Starting download of ${files.length} files...`);
        
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          // 添加延迟以避免并发下载问题
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          await this.downloadSingleFile(file);
        }
        
        this.$message.success(`All ${files.length} files downloaded successfully!`);
      } catch (error) {
        console.error('批量下载失败:', error);
        this.$message.error('Failed to download all files: ' + error.message);
      }
    },

    // 处理下拉菜单的下载命令
    async handleDownloadCommand(command) {
      try {
        if (command.type === 'single') {
          await this.downloadSingleFile(command.file);
        } else if (command.type === 'all') {
          // 确保文件按显示顺序排序
          const sortedFiles = this.sortFilesByDisplayOrder(command.files);
          await this.downloadAllFiles(sortedFiles);
        }
      } catch (error) {
        console.error('下载命令处理失败:', error);
        this.$message.error('Download failed: ' + error.message);
      }
    },

    // 按显示顺序排序文件
    sortFilesByDisplayOrder(files) {
      if (!files || !Array.isArray(files)) return [];
      
      return [...files].sort((a, b) => {
        // 如果有 displayOrder 字段，按该字段排序
        if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
          return (a.displayOrder || 0) - (b.displayOrder || 0);
        }
        
        // 如果没有 displayOrder，按上传时间排序
        if (a.uploadedAt && b.uploadedAt) {
          return new Date(a.uploadedAt) - new Date(b.uploadedAt);
        }
        
        // 最后按文件名排序
        return (a.originalName || '').localeCompare(b.originalName || '');
      });
    },

    async cancelRequest(requestId) {
      try {
        await this.$confirm('Are you sure you want to cancel this invoice request?', 'Confirm', {
          confirmButtonText: 'Yes, Cancel',
          cancelButtonText: 'No',
          type: 'warning'
        });

        await invoiceService.cancelRequest(requestId);
        this.$message.success('Invoice request cancelled successfully!');
        
        // 重新加载数据
        await this.loadInvoiceHistory();
        await this.loadRegistrations();
        
        // 通知父组件更新
        this.$emit('update');
        
      } catch (error) {
        if (error !== 'cancel') {
          console.error('取消申请失败:', error);
          this.$message.error('Failed to cancel request: ' + error.message);
        }
      }
    },

    viewRequestDetails(request) {
      console.log('Viewing request details:', request);
      
      // 构建文件列表显示，文件名直接可点击下载
      let filesHtml = '';
      if (request.files && request.files.length > 0) {
        // 按显示顺序排序文件
        const sortedFiles = this.sortFilesByDisplayOrder(request.files);
        
        // 预处理文件信息，避免在HTML中使用JSON.stringify
        const filesInfo = sortedFiles.map(f => `{id:'${f.id}',name:'${f.originalName.replace(/'/g, "\\'")}'}`).join(',');
        
        filesHtml = `
          <div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
            <p><strong>Invoice Files (${sortedFiles.length}):</strong></p>
            <div style="margin: 5px 0;">
              ${sortedFiles.map((file, index) => {
                const isImage = file.originalName && /\.(jpg|jpeg|png|gif|webp)$/i.test(file.originalName);
                const fileIcon = isImage ? '🖼️' : '📄';
                
                return `
                  <div style="margin: 8px 0; padding: 8px; border: 1px solid #e4e7ed; border-radius: 4px; background: white;">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                      <div style="flex: 1;">
                        <span 
                          onclick="window.downloadFileFromDetails('${file.id}', '${file.originalName.replace(/'/g, "\\'")}')"
                          style="
                            color: #409EFF; 
                            font-weight: 500; 
                            cursor: pointer; 
                            text-decoration: none;
                            display: inline-flex;
                            align-items: center;
                            gap: 5px;
                          "
                          onmouseover="this.style.textDecoration='underline'; this.style.color='#337ecc'"
                          onmouseout="this.style.textDecoration='none'; this.style.color='#409EFF'"
                          title="Click to download ${file.originalName}"
                        >
                          ${fileIcon} ${file.originalName}
                        </span>
                        <div style="margin-top: 5px; font-size: 12px; color: #666;">
                          File ${index + 1} of ${sortedFiles.length} • Uploaded: ${new Date(file.uploadedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
            <div style="margin-top: 12px; text-align: center; padding-top: 8px; border-top: 1px solid #e4e7ed;">
              <span 
                onclick="window.downloadAllFilesFromDetails([${filesInfo}])"
                style="
                  color: #67C23A; 
                  font-weight: 600; 
                  cursor: pointer; 
                  text-decoration: none;
                  display: inline-flex;
                  align-items: center;
                  gap: 5px;
                  padding: 6px 12px;
                  border-radius: 4px;
                  background: #f0f9ff;
                  border: 1px solid #67C23A;
                "
                onmouseover="this.style.background='#e6f7ff'; this.style.transform='scale(1.02)'"
                onmouseout="this.style.background='#f0f9ff'; this.style.transform='scale(1)'"
                title="Download all ${sortedFiles.length} files"
              >
                📦 Download All Files (${sortedFiles.length})
              </span>
            </div>
          </div>
        `;
      }

      this.$alert(`
        <div>
          <p><strong>Request ID:</strong> ${request.id}</p>
          <p><strong>Invoice Title:</strong> ${request.invoiceTitle}</p>
          <p><strong>Invoice Type:</strong> ${request.invoiceType === 'electronic' ? 'Electronic' : 'Paper'}</p>
          <p><strong>Amount:</strong> $${request.amount}</p>
          <p><strong>Status:</strong> ${this.getStatusText(request.status)}</p>
          <p><strong>Request Date:</strong> ${this.formatDate(request.created_at)}</p>
          ${request.processingNote ? `<p><strong>Processing Note:</strong> ${request.processingNote}</p>` : ''}
          ${request.taxNumber ? `<p><strong>Tax Number:</strong> ${request.taxNumber}</p>` : ''}
          ${filesHtml}
        </div>
      `, 'Request Details', {
        dangerouslyUseHTMLString: true,
        confirmButtonText: 'Close'
      });
    },
    
    nextStep() {
      if (this.step < 3) {
        this.step++;
      }
    },
    
    prevStep() {
      if (this.step > 1) {
        this.step--;
      }
    },
    
    async submitRequest() {
      try {
        this.submitting = true;
        
        const requestData = {
          registrationId: this.selectedRegistration.id,
          ...this.form
        };
        
        await invoiceService.createRequest(requestData);
        
        this.$message.success('Invoice request submitted successfully!');
        
        // 重置表单和状态
        this.resetForm();
        this.step = 1;
        this.selectedRegistration = null;
        
        // 切换到历史记录选项卡
        this.activeTab = 'history';
        await this.loadInvoiceHistory();
        
        // 重新加载注册数据
        await this.loadRegistrations();
        
        // 通知父组件更新
        this.$emit('update');
        
      } catch (error) {
        console.error('提交发票申请失败:', error);
        if (error.response && error.response.data) {
          this.$message.error(error.response.data.error || 'Failed to submit invoice request');
        } else {
          this.$message.error('Failed to submit invoice request');
        }
      } finally {
        this.submitting = false;
      }
    },
    
    resetForm() {
      this.form = {
        invoiceType: 'electronic',
        invoiceTitle: '',
        taxNumber: '',
        bankName: '',
        bankAccount: '',
        registeredAddress: '',
        registeredPhone: '',
        mailingAddress: '',
        recipient: '',
        recipientPhone: '',
        notes: '',
        content: 'Conference Registration Fee'
      };
    },
    
    formatDate(dateString) {
      if (!dateString) return '';
      return new Date(dateString).toLocaleDateString('en-US');
    },
    
    getStatusText(status) {
      const statusMap = {
        pending: 'Pending',
        processing: 'Processing',
        completed: 'Completed',
        rejected: 'Rejected',
        cancelled: 'Cancelled'
      };
      return statusMap[status] || status;
    },
    
    getInvoiceTagType(status) {
      const typeMap = {
        pending: 'warning',
        processing: 'info',
        completed: 'success',
        rejected: 'danger',
        cancelled: 'info'
      };
      return typeMap[status] || 'info';
    }
  }
};
</script>

<style scoped>
.invoice-management {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 32px;
}

.management-header {
  margin-bottom: 32px;
  padding-bottom: 20px;
  border-bottom: 2px solid #f0f2f5;
}

.section-title {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
}

.section-description {
  color: #909399;
  font-size: 16px;
  margin: 0;
}

.tab-content {
  min-height: 500px;
}

.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.step-item {
  display: flex;
  align-items: center;
  color: #909399;
  transition: color 0.3s;
}

.step-item.active {
  color: #409EFF;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e4e7ed;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-right: 8px;
}

.step-item.active .step-number {
  background: #409EFF;
}

.step-label {
  font-size: 14px;
  font-weight: 500;
}

.step-label-short {
  display: none; /* 默认隐藏短标签 */
}

.step-label-full {
  display: inline; /* 默认显示完整标签 */
}

.step-divider {
  width: 60px;
  height: 1px;
  background: #e4e7ed;
  margin: 0 20px;
}

.step-content {
  min-height: 400px;
}

.step-panel h3 {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 24px;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 60px 0;
  color: #909399;
}

.loading-state .el-icon,
.empty-state .el-icon {
  font-size: 48px;
  margin-bottom: 16px;
  display: block;
}

.registration-list {
  display: grid;
  gap: 16px;
  margin-bottom: 24px;
}

.registration-card {
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;
}

.registration-card:hover {
  border-color: #409EFF;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.registration-card.selected {
  border-color: #409EFF;
  background: #ecf5ff;
}

.registration-card.disabled {
  background: #f5f7fa;
  cursor: not-allowed;
  opacity: 0.7;
}

.registration-card.disabled:hover {
  border-color: #e4e7ed;
  box-shadow: none;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.card-header h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.price {
  font-size: 20px;
  font-weight: 600;
  color: #67C23A;
}

.card-body p {
  margin: 6px 0;
  color: #606266;
}

.invoice-history {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e4e7ed;
}

.invoice-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.pending-notice {
  margin-top: 12px;
}

.invoice-form {
  max-width: 600px;
}

.corporate-info,
.mailing-info {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e4e7ed;
}

.mailing-info h4 {
  margin-bottom: 16px;
  color: #303133;
}

.confirmation-content {
  background: #f8f9fa;
  padding: 24px;
  border-radius: 8px;
  margin-bottom: 24px;
}

.info-section {
  margin-bottom: 24px;
}

.info-section h4 {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e4e7ed;
}

.info-section p {
  margin: 8px 0;
  color: #606266;
}

.step-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #e4e7ed;
}

.step-actions .el-button {
  min-width: 120px;
}

/* 申请历史样式 */
.request-list {
  display: grid;
  gap: 20px;
}

.request-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
}

.request-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 24px 0;
}

.request-info h4 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.request-id {
  color: #909399;
  font-size: 14px;
  margin: 0;
}

.request-details {
  padding: 16px 24px;
  border-top: 1px solid #f0f2f5;
  background: #fafafa;
}

.request-details p {
  margin: 8px 0;
  color: #606266;
  font-size: 14px;
}

.request-actions {
  padding: 16px 24px;
  border-top: 1px solid #f0f2f5;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  align-items: center;
}

/* 发票文件下载样式 */
.invoice-files-section {
  margin-right: 12px;
}

.single-file-download,
.multiple-files-download {
  display: inline-block;
}

/* 下拉菜单样式优化 */
.multiple-files-download .el-dropdown {
  display: inline-block;
}

.download-item {
  display: flex;
  align-items: center;
  padding: 8px 16px !important;
  cursor: pointer;
}

.download-item i {
  margin-right: 8px;
  color: #409EFF;
  font-size: 14px;
}

.file-name {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.download-all-item {
  background: #f0f9ff !important;
  border-top: 1px solid #e4e7ed !important;
}

.download-all-item i {
  margin-right: 8px;
  color: #67C23A;
  font-size: 14px;
}

.download-all-text {
  font-weight: 600;
  color: #67C23A;
}

/* 修复分割线的白色背景问题 */
.download-all-item.el-dropdown-menu__item--divided:before {
  background-color: transparent !important;
  height: 0 !important;
  display: none !important;
}

/* 或者直接覆盖所有分割线样式 
.el-dropdown-menu__item--divided:before {
  background-color: #f0f9ff !important;
  height: 1px !important;
}
*/

.el-dropdown-menu__item {
  padding: 8px 16px;
  font-size: 14px;
}

.el-dropdown-menu__item:hover {
  background-color: #f5f7fa;
  color: #409EFF;
}

.el-dropdown-menu__item.is-divided {
  border-top: 1px solid #e4e7ed;
  margin-top: 6px;
  padding-top: 8px;
}

/* 文件列表样式（详情弹窗中） */
.invoice-files-list {
  margin-top: 15px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 4px;
}

.invoice-files-list ul {
  margin: 5px 0;
  padding-left: 20px;
  list-style: none;
}

.invoice-files-list li {
  margin: 8px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.file-name-link {
  color: #409EFF;
  cursor: pointer;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 5px;
}

.file-name-link:hover {
  text-decoration: underline;
}

.file-meta {
  color: #909399;
  font-size: 12px;
  margin-left: 10px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .invoice-management {
    padding: 12px;
  }
  
  .management-header {
    padding: 16px 0;
    text-align: center;
  }
  
  .section-title {
    font-size: 20px;
    margin-bottom: 8px;
  }
  
  .section-description {
    font-size: 14px;
  }
  
  .step-indicator {
    padding: 12px 8px; /* 减小内边距 */
    margin-bottom: 24px; /* 减小底部间距 */
    overflow-x: auto; /* 允许水平滚动以防万一 */
    flex-wrap: nowrap; /* 确保不换行 */
  }
  
  .step-item {
    flex-shrink: 0; /* 防止项目收缩 */
    white-space: nowrap; /* 防止文本换行 */
  }
  
  .step-number {
    width: 24px; /* 减小圆圈大小 */
    height: 24px;
    margin-right: 6px; /* 减小右边距 */
    font-size: 12px; /* 减小字体 */
  }
  
  .step-label {
    font-size: 12px; /* 减小标签字体 */
    font-weight: 500;
  }
  
  .step-label-full {
    display: none; /* 移动端隐藏完整标签 */
  }
  
  .step-label-short {
    display: inline; /* 移动端显示短标签 */
  }
  
  .step-divider {
    width: 30px; /* 减小分隔线宽度 */
    height: 1px;
    margin: 0 12px; /* 减小左右边距 */
  }
  
  .request-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .request-info h4 {
    font-size: 16px;
    line-height: 1.3;
  }
  
  .request-id {
    font-size: 12px;
  }
  
  .request-details .el-row {
    flex-direction: column;
  }
  
  .request-details .el-col {
    margin-bottom: 12px;
  }
  
  .request-details p {
    font-size: 13px;
    line-height: 1.4;
    margin-bottom: 8px;
  }
  
  .request-actions {
    flex-wrap: wrap;
    justify-content: flex-start;
    gap: 8px;
  }
  
  .request-actions .el-button {
    font-size: 12px;
    padding: 8px 16px;
  }
  
  .confirmation-content .el-row {
    flex-direction: column;
  }
  
  .invoice-form .el-form-item {
    margin-bottom: 20px;
  }
  
  .invoice-form .el-form-item__label {
    font-size: 14px;
    line-height: 1.4;
  }
  
  .files-info .el-tag {
    font-size: 11px;
  }
  
  .single-file-download .el-button,
  .multiple-files-download .el-button {
    width: 100%;
    margin-bottom: 8px;
  }
}

@media (max-width: 480px) {
  .invoice-management {
    padding: 8px;
  }
  
  .management-header {
    padding: 12px 0;
  }
  
  .section-title {
    font-size: 18px;
  }
  
  .section-description {
    font-size: 13px;
  }
  
  .request-card {
    margin-bottom: 12px;
  }
  
  .request-card .el-card__body {
    padding: 12px;
  }
  
  .request-info h4 {
    font-size: 14px;
  }
  
  .request-details p {
    font-size: 12px;
  }
  
  .el-tabs__item {
    padding: 0 12px;
    font-size: 13px;
  }
  
  .tab-content {
    padding: 12px 0;
  }
  
  /* 超小屏步骤指示器进一步优化 */
  .step-indicator {
    padding: 8px 4px; /* 进一步减小内边距 */
    margin-bottom: 16px; /* 减小底部间距 */
  }
  
  .step-number {
    width: 20px; /* 进一步减小圆圈 */
    height: 20px;
    margin-right: 4px; /* 进一步减小右边距 */
    font-size: 11px; /* 进一步减小字体 */
  }
  
  .step-label {
    font-size: 10px; /* 进一步减小标签字体 */
  }
  
  .step-label-full {
    display: none; /* 超小屏隐藏完整标签 */
  }
  
  .step-label-short {
    display: inline; /* 超小屏显示短标签 */
  }
  
  .step-divider {
    width: 20px; /* 进一步减小分隔线 */
    margin: 0 8px; /* 进一步减小边距 */
  }
  
  .empty-state,
  .loading-state {
    padding: 40px 20px;
  }
  
  .empty-state p,
  .loading-state p {
    font-size: 14px;
  }
  
  .empty-state small {
    font-size: 12px;
  }
}
</style>
