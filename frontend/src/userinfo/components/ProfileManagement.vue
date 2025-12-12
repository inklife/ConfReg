<template>
  <div class="profile-management">
    <el-card>
      <div slot="header" class="card-header">
        <span class="card-title">Profile Management</span>
        <p class="card-subtitle">Manage your personal information and account settings</p>
      </div>
      
      <!-- Custom Tab Navigation -->
      <div class="custom-tabs">
        <div class="custom-tabs-nav">
          <div 
            class="custom-tab-item"
            :class="{ 'is-active': activeTab === 'personal' }"
            @click="switchTab('personal')">
            Personal Information
          </div>
          <div 
            class="custom-tab-item"
            :class="{ 'is-active': activeTab === 'password' }"
            @click="switchTab('password')">
            Change Password
          </div>
          <div 
            class="custom-tab-item"
            :class="{ 'is-active': activeTab === 'email' }"
            @click="switchTab('email')">
            Email Management
          </div>
          <div 
            class="custom-tab-item"
            :class="{ 'is-active': activeTab === 'username' }"
            @click="switchTab('username')">
            Update Username
          </div>
        </div>
      </div>

      <!-- Tab Content -->
      <div class="custom-tabs-content">
        <!-- Personal Information Tab -->
        <div v-show="activeTab === 'personal'" class="custom-tab-pane">
          <!-- 移动端下滑提示 -->
          <div class="scroll-hint-container" v-show="showScrollHint">
            <div class="scroll-hint">
              <i class="el-icon-arrow-down scroll-hint-icon"></i>
              <span class="scroll-hint-text">Scroll down</span>
            </div>
          </div>
          
          <el-form :model="userInfo" :rules="rules" ref="profileForm" label-width="180px" class="profile-form">
            <el-form-item label="First Name" prop="firstName">
              <el-input v-model="userInfo.firstName" placeholder="Please enter your first name" @input="updateFullName">
                <i slot="prefix" class="el-icon-user"></i>
              </el-input>
            </el-form-item>
            
            <el-form-item label="Last Name" prop="lastName">
              <el-input v-model="userInfo.lastName" placeholder="Please enter your last name" @input="updateFullName">
                <i slot="prefix" class="el-icon-user"></i>
              </el-input>
            </el-form-item>
            
            <el-form-item label="Full Name" prop="name">
              <el-input v-model="userInfo.name" placeholder="Please enter your full display name">
                <i slot="prefix" class="el-icon-user"></i>
              </el-input>
              <div class="field-hint">
                <i class="el-icon-info"></i>
                Full name is automatically generated from first and last name, but you can edit it directly
              </div>
            </el-form-item>
            
            <el-form-item label="Email" prop="email">
              <el-input v-model="userInfo.email" :disabled="true" placeholder="Email cannot be modified (used for login)">
                <i slot="prefix" class="el-icon-message"></i>
              </el-input>
              <!-- <div class="field-hint">
                <i class="el-icon-info"></i>
                Email is used for login and cannot be changed. Contact admin if you need to change it.
              </div> -->
            </el-form-item>
            
            <el-form-item label="Affiliation" prop="affiliation">
              <el-input v-model="userInfo.affiliation" placeholder="Please enter your affiliation">
                <i slot="prefix" class="el-icon-office-building"></i>
              </el-input>
            </el-form-item>
            
            <el-form-item label="Phone" prop="phone">
              <el-input v-model="userInfo.phone" placeholder="Please enter phone number">
                <i slot="prefix" class="el-icon-phone"></i>
              </el-input>
            </el-form-item>
            
            <div class="custom-form-buttons">
              <button type="button" @click="saveProfile" :disabled="loading" class="custom-btn custom-btn-primary">
                <i v-if="loading" class="el-icon-loading"></i>
                <i v-else class="el-icon-check"></i>
                Save Changes
              </button>
              <button type="button" @click="resetForm" class="custom-btn custom-btn-secondary">
                <i class="el-icon-refresh"></i>
                Reset
              </button>
            </div>
          </el-form>
        </div>

        <!-- Change Password Tab -->
        <div v-show="activeTab === 'password'" class="custom-tab-pane">
          <!-- 移动端下滑提示 -->
          <div class="scroll-hint-container" v-show="showScrollHint">
            <div class="scroll-hint">
              <i class="el-icon-arrow-down scroll-hint-icon"></i>
              <span class="scroll-hint-text">Scroll down</span>
            </div>
          </div>
          
          <!-- 密码修改锁定提示 -->
          <div v-if="passwordLocked" class="password-locked-warning">
            <el-alert
              title="Password Change Temporarily Disabled"
              :description="`Too many incorrect password attempts. Please try again in ${lockRemainingTime} minutes.`"
              type="warning"
              :closable="false"
              show-icon>
            </el-alert>
          </div>
          
          <el-form :model="passwordForm" :rules="passwordRules" ref="passwordForm" label-width="180px" class="password-form">
            <el-form-item label="Current Password" prop="currentPassword">
              <el-input 
                v-model="passwordForm.currentPassword" 
                type="password" 
                placeholder="Please enter your current password"
                :disabled="passwordLocked"
                show-password>
                <i slot="prefix" class="el-icon-lock"></i>
              </el-input>
              <!-- 显示密码尝试次数警告 -->
              <div v-if="passwordAttempts > 0 && passwordAttempts < 3 && !passwordLocked" class="password-attempt-warning">
                <i class="el-icon-warning"></i>
                Incorrect password. {{ 3 - passwordAttempts }} attempts remaining before temporary lockout.
              </div>
            </el-form-item>
            
            <el-form-item label="New Password" prop="newPassword">
              <el-input 
                v-model="passwordForm.newPassword" 
                type="password" 
                placeholder="Please enter new password (at least 6 characters)"
                :disabled="passwordLocked"
                show-password>
                <i slot="prefix" class="el-icon-key"></i>
              </el-input>
            </el-form-item>
            
            <el-form-item label="Confirm Password" prop="confirmPassword">
              <el-input 
                v-model="passwordForm.confirmPassword" 
                type="password" 
                placeholder="Please confirm your new password"
                :disabled="passwordLocked"
                show-password>
                <i slot="prefix" class="el-icon-key"></i>
              </el-input>
            </el-form-item>
            
            <div class="custom-form-buttons">
              <button type="button" @click="changePassword" :disabled="passwordLoading || passwordLocked" class="custom-btn custom-btn-primary">
                <i v-if="passwordLoading" class="el-icon-loading"></i>
                <i v-else class="el-icon-check"></i>
                Change Password
              </button>
              <button type="button" @click="resetPasswordForm" :disabled="passwordLocked" class="custom-btn custom-btn-secondary">
                <i class="el-icon-refresh"></i>
                Reset
              </button>
            </div>
          </el-form>
        </div>

        <!-- Email Management Tab -->
        <div v-show="activeTab === 'email'" class="custom-tab-pane">
          <!-- 移动端下滑提示 -->
          <div class="scroll-hint-container" v-show="showScrollHint">
            <div class="scroll-hint">
              <i class="el-icon-arrow-down scroll-hint-icon"></i>
              <span class="scroll-hint-text">Scroll down</span>
            </div>
          </div>
          
          <div class="email-management">
            <!-- Primary Email Section -->
            <div class="email-section">
              <h3 class="section-title">
                <i class="el-icon-message"></i>
                Primary Email (for login)
              </h3>
              <div class="email-info">
                <div class="email-display">
                  <span class="email-address">{{ emailInfo.primaryEmail }}</span>
                  <el-tag type="success" size="small">Primary</el-tag>
                </div>
                <div class="email-note">
                  <i class="el-icon-info"></i>
                  This email is used for login and cannot be deleted.
                </div>
              </div>
            </div>

            <!-- Backup Email Section -->
            <div class="email-section">
              <h3 class="section-title">
                <i class="el-icon-message"></i>
                Backup Email
              </h3>
              
              <!-- If no backup email -->
              <div v-if="!emailInfo.backupEmail" class="no-backup-email">
                <div class="empty-state mobile-hidden">
                  <!-- <i class="el-icon-plus"></i> -->
                  <p>No backup email configured</p>
                  <p class="empty-note">Add a backup email for account security</p>
                </div>
                
                <el-form :model="backupEmailForm" :rules="backupEmailRules" ref="backupEmailForm" label-width="180px" class="add-backup-form">
                  <el-form-item label="Backup Email" prop="email">
                    <el-input 
                      v-model="backupEmailForm.email" 
                      placeholder="Enter backup email address"
                      :disabled="emailLoading"
                      @keydown.enter.native="addBackupEmail">
                      <i slot="prefix" class="el-icon-message"></i>
                    </el-input>
                  </el-form-item>
                  <el-form-item>
                    <el-button type="primary" @click="addBackupEmail" :loading="emailLoading">
                      <i class="el-icon-plus"></i>
                      Add Backup Email
                    </el-button>
                  </el-form-item>
                </el-form>
                
                <div class="empty-state mobile-only">
                  <!-- <i class="el-icon-plus"></i> -->
                  <p>No backup email configured</p>
                  <p class="empty-note">Add a backup email for account security</p>
                </div>
              </div>

              <!-- If backup email exists -->
              <div v-else class="backup-email-exists">
                <div class="email-info">
                  <div class="email-display">
                    <span class="email-address">{{ emailInfo.backupEmail }}</span>
                    <el-tag v-if="emailInfo.backupEmailVerified" type="success" size="small">Verified</el-tag>
                    <el-tag v-else type="warning" size="small">Unverified</el-tag>
                    <!-- Remove button for unverified backup email -->
                    <el-button v-if="!emailInfo.backupEmailVerified" 
                               type="danger" 
                               size="small" 
                               @click="confirmDeleteBackupEmail" 
                               :loading="emailLoading" 
                               class="inline-remove-btn">
                      <i class="el-icon-delete"></i>
                      Remove
                    </el-button>
                  </div>
                  
                  <!-- Verification section for unverified backup email -->
                  <div v-if="!emailInfo.backupEmailVerified" class="verification-section">
                    <div class="verification-note">
                      <i class="el-icon-warning"></i>
                      Please verify your backup email to activate it.
                    </div>
                    
                    <el-form :model="verificationForm" :rules="verificationRules" ref="verificationForm" label-width="180px" class="verification-form">
                      <el-form-item label="Verification Code" prop="code">
                        <el-input 
                          v-model="verificationForm.code" 
                          placeholder="Enter 6-digit verification code"
                          maxlength="6"
                          :disabled="emailLoading"
                          @keydown.enter.native="verifyBackupEmail">
                          <i slot="prefix" class="el-icon-key"></i>
                        </el-input>
                      </el-form-item>
                      <el-form-item>
                        <div class="verification-actions">
                          <el-button type="primary" @click="verifyBackupEmail" :loading="emailLoading" class="action-btn primary-btn">
                            <i class="el-icon-check"></i>
                            Verify Email
                          </el-button>
                          <el-button @click="resendVerification" :loading="emailLoading" class="action-btn secondary-btn">
                            <i class="el-icon-refresh"></i>
                            Resend Code
                          </el-button>
                        </div>
                      </el-form-item>
                    </el-form>
                  </div>
                  
                  <!-- Actions for verified backup email -->
                  <div v-else class="backup-email-actions">
                    <div class="email-actions-container">
                      <el-button type="primary" @click="setBackupAsPrimary" :loading="emailLoading" class="action-btn primary-btn">
                        <i class="el-icon-top"></i>
                        Set as Primary Email
                      </el-button>
                      <el-button type="danger" @click="confirmDeleteBackupEmail" :loading="emailLoading" class="action-btn danger-btn">
                        <i class="el-icon-delete"></i>
                        Remove Backup Email
                      </el-button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Email Management Info -->
              <div class="email-management-info">
                <div class="info-card">
                  <h4><i class="el-icon-info"></i> Email Management Rules</h4>
                  <ul>
                    <li>Only the primary email can be used for login</li>
                    <li>Backup email requires verification before it can be set as primary</li>
                    <li>You can delete backup email without verification</li>
                    <li>Primary email cannot be deleted</li>
                    <li>Backup email serves as an alternative contact method</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Update Username Tab -->
        <div v-show="activeTab === 'username'" class="custom-tab-pane">
          <!-- 移动端下滑提示 -->
          <div class="scroll-hint-container" v-show="showScrollHint">
            <div class="scroll-hint">
              <i class="el-icon-arrow-down scroll-hint-icon"></i>
              <span class="scroll-hint-text">Scroll down</span>
            </div>
          </div>
          
          <div class="username-management">
            <!-- Username Update Status -->
            <div v-if="!usernameUpdateStatus.canUpdate" class="username-restriction-warning">
              <el-alert
                title="Username Update Restricted"
                :description="usernameUpdateStatus.reason"
                type="warning"
                :closable="false"
                show-icon>
              </el-alert>
              
              <!-- Current Username Display -->
              <div class="current-username-info">
                <div class="info-item">
                  <i class="el-icon-user"></i>
                  <span class="info-label">Current Username:</span>
                  <span class="info-value">{{ userInfo.username }}</span>
                </div>
              </div>
              
              <div v-if="usernameUpdateStatus.lastUpdated" class="last-updated-info">
                <i class="el-icon-time"></i>
                Last updated: {{ formatDate(usernameUpdateStatus.lastUpdated) }}
              </div>
            </div>

            <!-- Username Update Form -->
            <div v-else class="username-update-form">
              <div class="current-username-info">
                <h3 class="section-title">
                  <i class="el-icon-user"></i>
                  Current Username
                </h3>
                <div class="username-display">
                  <span class="username-text">{{ userInfo.username || userInfo.email }}</span>
                  <el-tag type="info" size="small">Current</el-tag>
                </div>
                <div v-if="usernameUpdateStatus.lastUpdated" class="last-updated-info">
                  <i class="el-icon-time"></i>
                  Last updated: {{ formatDate(usernameUpdateStatus.lastUpdated) }}
                </div>
              </div>

              <!-- Step 1: Enter new username -->
              <div v-if="usernameUpdateStep === 1" class="username-step">
                <h3 class="section-title">
                  <i class="el-icon-edit"></i>
                  Enter New Username
                </h3>
                
                <el-form :model="usernameUpdateForm" :rules="usernameUpdateRules" ref="usernameUpdateForm" label-width="180px" class="username-form">
                  <el-form-item label="New Username" prop="newUsername">
                    <el-input 
                      v-model="usernameUpdateForm.newUsername" 
                      placeholder="Enter your new username"
                      :disabled="usernameLoading"
                      @input="onUsernameInput"
                      @keydown.enter.native="proceedToVerification">
                      <i slot="prefix" class="el-icon-user"></i>
                      <i slot="suffix" 
                         :class="{
                           'el-icon-loading': usernameValidationStatus === 'checking',
                           'el-icon-circle-check': usernameValidationStatus === 'available',
                           'el-icon-circle-close': usernameValidationStatus === 'unavailable' || usernameValidationStatus === 'invalid'
                         }"
                         :style="{
                           color: usernameValidationStatus === 'available' ? '#67C23A' : 
                                  (usernameValidationStatus === 'unavailable' || usernameValidationStatus === 'invalid') ? '#F56C6C' : '#909399'
                         }">
                      </i>
                    </el-input>
                    
                    <!-- Username validation feedback -->
                    <div v-if="usernameValidationStatus" class="username-validation-feedback">
                      <div v-if="usernameValidationStatus === 'checking'" class="validation-message checking">
                        <i class="el-icon-loading"></i>
                        Checking username availability...
                      </div>
                      <div v-else-if="usernameValidationStatus === 'available'" class="validation-message available">
                        <i class="el-icon-circle-check"></i>
                        Username is available
                      </div>
                      <div v-else-if="usernameValidationStatus === 'unavailable'" class="validation-message unavailable">
                        <i class="el-icon-circle-close"></i>
                        Username is already taken
                      </div>
                      <div v-else-if="usernameValidationStatus === 'invalid'" class="validation-message invalid">
                        <i class="el-icon-circle-close"></i>
                        {{ usernameValidationMessage }}
                      </div>
                    </div>
                    
                    <!-- Username suggestions -->
                    <div v-if="showUsernameSuggestions && usernameSuggestions.length > 0" class="username-suggestions">
                      <p class="suggestions-title">
                        <i class="el-icon-info"></i>
                        Try these alternatives:
                      </p>
                      <div class="suggestions-list">
                        <el-tag 
                          v-for="suggestion in usernameSuggestions" 
                          :key="suggestion"
                          @click="selectSuggestion(suggestion)"
                          class="suggestion-tag">
                          {{ suggestion }}
                        </el-tag>
                      </div>
                    </div>
                    
                    <div class="username-rules mobile-hidden">
                      <p><i class="el-icon-info"></i> Username rules: </p>
                      <p>Unique AND No spaces or @ symbol</p>
                    </div>
                  </el-form-item>
                  <el-form-item>
                    <el-button type="primary" @click="proceedToVerification" :loading="usernameLoading" :disabled="usernameValidationStatus !== 'available'" class="action-btn primary-btn">
                      <i class="el-icon-right"></i>
                      Next: Verify Email
                    </el-button>
                    <el-button @click="resetUsernameUpdate" class="action-btn secondary-btn">
                      <i class="el-icon-refresh"></i>
                      Reset
                    </el-button>
                  </el-form-item>
                  
                  <!-- Username rules for mobile - moved after buttons -->
                  <div class="username-rules mobile-only">
                    <p><i class="el-icon-info"></i> Username rules: </p>
                    <p>Unique AND No spaces or @ symbol</p>
                  </div>
                </el-form>
              </div>

              <!-- Step 2: Email verification -->
              <div v-if="usernameUpdateStep === 2" class="username-step">
                <h3 class="section-title">
                  <i class="el-icon-message"></i>
                  Email Verification Required
                </h3>
                
                <div class="verification-info">
                  <div class="verification-notice">
                    <i class="el-icon-info"></i>
                    <span>For security reasons, we need to verify your primary email address before updating your username.</span>
                  </div>
                  <div class="email-info">
                    <span>Verification email will be sent to: <strong>{{ userInfo.email }}</strong></span>
                  </div>
                </div>

                <div class="verification-actions">
                  <el-button v-if="!verificationCodeSent" type="primary" @click="sendUsernameVerificationCode" :loading="usernameLoading" class="action-btn primary-btn">
                    <i class="el-icon-message"></i>
                    Send Verification Code
                  </el-button>
                  
                  <div v-else class="verification-code-section">
                    <el-form :model="usernameUpdateForm" :rules="verificationCodeRules" ref="verificationCodeForm" label-width="180px" class="verification-form">
                      <el-form-item label="Verification Code" prop="verificationCode">
                        <el-input 
                          v-model="usernameUpdateForm.verificationCode" 
                          placeholder="Enter 6-digit verification code"
                          maxlength="6"
                          :disabled="usernameLoading"
                          @keydown.enter.native="confirmUsernameUpdate">
                          <i slot="prefix" class="el-icon-key"></i>
                        </el-input>
                      </el-form-item>
                      <el-form-item>
                        <div class="verification-actions">
                          <el-button type="primary" @click="confirmUsernameUpdate" :loading="usernameLoading" class="action-btn primary-btn">
                            <i class="el-icon-check"></i>
                            Update Username
                          </el-button>
                          <el-button @click="sendUsernameVerificationCode" :loading="usernameLoading" class="action-btn secondary-btn">
                            <i class="el-icon-refresh"></i>
                            Resend Code
                          </el-button>
                        </div>
                      </el-form-item>
                    </el-form>
                  </div>
                </div>

                <div class="step-navigation">
                  <el-button @click="usernameUpdateStep = 1" :disabled="usernameLoading" class="action-btn secondary-btn">
                    <i class="el-icon-back"></i>
                    Back to Username
                  </el-button>
                </div>
              </div>
            </div>

            <!-- Username Update Info -->
            <div class="username-management-info">
              <div class="info-card">
                <h4><i class="el-icon-info"></i> Username Update Rules</h4>
                <ul>
                  <li>Username can only be changed once every 7 days</li>
                  <li>Email verification is required for security</li>
                  <!-- <li>Your new username must be unique across the system</li>
                  <li>Username change does not affect your login email</li>
                   <li>Other users will see your new username in the system</li> -->
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
import { userService } from '../../_services';

export default {
  name: 'ProfileManagement',
  data() {
    return {
      activeTab: 'personal',
      showScrollHint: false, // 控制滑动提示的显示
      userInfo: {
        firstName: '',
        lastName: '',
        name: '',
        email: '',
        username: '',
        affiliation: '',
        phone: ''
      },
      originalUserInfo: {},
      lastAutoGeneratedName: '', // 用于跟踪自动生成的全名
      passwordForm: {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      },
      // 邮箱管理相关数据
      emailInfo: {
        primaryEmail: '',
        backupEmail: null,
        backupEmailVerified: false
      },
      backupEmailForm: {
        email: ''
      },
      verificationForm: {
        code: ''
      },
      // Username update related data
      usernameUpdateStatus: {
        canUpdate: true,
        reason: '',
        lastUpdated: null,
        remainingDays: 0
      },
      usernameUpdateForm: {
        newUsername: '',
        verificationCode: ''
      },
      usernameUpdateStep: 1, // 1: enter username, 2: email verification
      verificationCodeSent: false,
      usernameLoading: false,
      // Username validation related
      usernameValidationStatus: null, // null, 'checking', 'available', 'unavailable', 'invalid'
      usernameValidationMessage: '',
      usernameCheckTimer: null,
      usernameCheckTimeout: null,
      usernameSuggestions: [],
      showUsernameSuggestions: false,
      emailLoading: false,
      loading: false,
      passwordLoading: false,
      // 密码修改尝试限制相关
      passwordAttempts: 0,
      passwordLocked: false,
      lockRemainingTime: 0,
      lockTimer: null,
      rules: {
        firstName: [
          { required: true, message: 'Please enter your first name', trigger: 'blur' },
          { max: 50, message: 'First name cannot exceed 50 characters', trigger: 'blur' }
        ],
        lastName: [
          { required: true, message: 'Please enter your last name', trigger: 'blur' },
          { max: 50, message: 'Last name cannot exceed 50 characters', trigger: 'blur' }
        ],
        name: [
          { required: true, message: 'Please enter your display name', trigger: 'blur' },
          { max: 100, message: 'Name cannot exceed 100 characters', trigger: 'blur' }
        ]
      },
      passwordRules: {
        currentPassword: [
          { required: true, message: 'Please enter your current password', trigger: 'blur' }
        ],
        newPassword: [
          { required: true, message: 'Please enter new password', trigger: 'blur' },
          { min: 6, message: 'Password must be at least 6 characters', trigger: 'blur' }
        ],
        confirmPassword: [
          { required: true, message: 'Please confirm your password', trigger: 'blur' },
          { 
            validator: (rule, value, callback) => {
              if (value !== this.passwordForm.newPassword) {
                callback(new Error('Password confirmation does not match'));
              } else {
                callback();
              }
            }, 
            trigger: 'blur' 
          }
        ]
      },
      // 备用邮箱表单验证规则
      backupEmailRules: {
        email: [
          { required: true, message: 'Please enter backup email address', trigger: 'blur' },
          { type: 'email', message: 'Please enter a valid email address', trigger: 'blur' },
          { 
            validator: (rule, value, callback) => {
              if (value === this.emailInfo.primaryEmail) {
                callback(new Error('Backup email cannot be the same as primary email'));
              } else {
                callback();
              }
            }, 
            trigger: 'blur' 
          }
        ]
      },
      // 验证码表单验证规则
      verificationRules: {
        code: [
          { required: true, message: 'Please enter verification code', trigger: 'blur' },
          { len: 6, message: 'Verification code must be 6 digits', trigger: 'blur' },
          { pattern: /^\d{6}$/, message: 'Verification code must be 6 digits', trigger: 'blur' }
        ]
      },
      // Username update validation rules
      usernameUpdateRules: {
        newUsername: [
          { required: true, message: 'Please enter new username', trigger: 'blur' },
          { min: 3, max: 150, message: 'Username must be between 3 and 150 characters', trigger: 'blur' },
          { pattern: /^[a-zA-Z0-9_.-]+$/, message: 'Username can only contain letters, numbers, underscore, dot and dash', trigger: 'blur' },
          { 
            validator: (rule, value, callback) => {
              if (value && value.includes(' ')) {
                callback(new Error('Username cannot contain spaces'));
              } else if (value && value.includes('@')) {
                callback(new Error('Username cannot contain @ symbol'));
              } else if (value === this.userInfo.username) {
                callback(new Error('New username must be different from current username'));
              } else {
                callback();
              }
            }, 
            trigger: 'blur' 
          }
        ]
      },
      // Verification code validation rules for username update
      verificationCodeRules: {
        verificationCode: [
          { required: true, message: 'Please enter verification code', trigger: 'blur' },
          { len: 6, message: 'Verification code must be 6 digits', trigger: 'blur' },
          { pattern: /^\d{6}$/, message: 'Verification code must be 6 digits', trigger: 'blur' }
        ]
      }
    };
  },
  watch: {
    '$route.query.subtab': {
      handler(newSubtab) {
        if (newSubtab && ['personal', 'password', 'email', 'username'].includes(newSubtab)) {
          this.activeTab = newSubtab;
        }
      },
      immediate: true
    }
  },
  async mounted() {
    await this.loadUserData();
    await this.loadEmailInfo();
    await this.loadUsernameUpdateStatus();
    // 初始化自动生成的名称跟踪
    this.lastAutoGeneratedName = this.userInfo.name;
    // 检查保存的密码修改失败状态
    this.checkSavedPasswordFailureState();
    
    // 从URL参数中获取初始子选项卡
    const subtab = this.$route.query.subtab;
    if (subtab && ['personal', 'password', 'email', 'username'].includes(subtab)) {
      this.activeTab = subtab;
    }
    
    // 移动端触摸优化
    this.$nextTick(() => {
      this.optimizeMobileTabs();
      this.initScrollHint();
    });
  },
  destroyed() {
    // 清理计时器
    if (this.lockTimer) {
      clearInterval(this.lockTimer);
    }
    // 清理用户名检查计时器
    if (this.usernameCheckTimeout) {
      clearTimeout(this.usernameCheckTimeout);
    }
    
    // 清理移动端触摸事件监听器
    if (typeof window !== 'undefined') {
      const tabItems = this.$el?.querySelectorAll('.el-tabs__item');
      if (tabItems) {
        tabItems.forEach(tab => {
          tab.removeEventListener('touchstart', this.handleTabTouchStart);
          tab.removeEventListener('touchend', this.handleTabTouchEnd);
        });
      }
      
      // 清理滚动事件监听器
      if (this.scrollHandler) {
        window.removeEventListener('scroll', this.scrollHandler);
      }
    }
  },
  methods: {
    switchTab(tabName) {
      this.activeTab = tabName;
      this.handleTabChange({ name: tabName });
    },
    
    handleTabChange(tab) {
      // 更新URL参数以包含子选项卡
      const currentSubtab = this.$route.query.subtab;
      
      // 检查是否需要导航，避免重复导航错误
      if (currentSubtab !== tab.name) {
        this.$router.replace({
          query: { 
            ...this.$route.query, 
            subtab: tab.name 
          }
        }).catch(err => {
          // 忽略重复导航错误
          if (err.name !== 'NavigationDuplicated') {
            console.error('Navigation error:', err);
          }
        });
      }
      
      // 在移动端切换tab时重新显示滚动提示
      this.$nextTick(() => {
        this.showScrollHintOnTabChange();
      });
    },

    // 切换tab时显示滚动提示
    showScrollHintOnTabChange() {
      if (typeof window === 'undefined') return;
      
      const isMobile = window.innerWidth <= 768;
      if (!isMobile) return;
      
      // 显示滚动提示
      this.showScrollHint = true;
      
      // 2秒后自动隐藏
      setTimeout(() => {
        this.showScrollHint = false;
      }, 2000);
    },

    // 优化移动端tabs的触摸体验
    optimizeMobileTabs() {
      if (typeof window === 'undefined') return;
      
      // 检查是否为移动设备
      const isMobile = window.innerWidth <= 768 || 
        ('ontouchstart' in window) || 
        (navigator.maxTouchPoints > 0);
        
      if (!isMobile) return;
      
      this.$nextTick(() => {
        // 查找所有tab元素
        const tabItems = this.$el.querySelectorAll('.el-tabs__item');
        
        tabItems.forEach((tab, index) => {
          // 移除现有的事件监听器
          tab.removeEventListener('touchstart', this.handleTabTouchStart);
          tab.removeEventListener('touchend', this.handleTabTouchEnd);
          
          // 添加优化的触摸事件
          tab.addEventListener('touchstart', this.handleTabTouchStart, { passive: true });
          tab.addEventListener('touchend', this.handleTabTouchEnd, { passive: true });
          
          // 添加视觉反馈
          tab.style.cursor = 'pointer';
          tab.style.userSelect = 'none';
          tab.style.webkitUserSelect = 'none';
          tab.style.webkitTapHighlightColor = 'rgba(64, 158, 255, 0.2)';
        });
      });
    },

    handleTabTouchStart(event) {
      const tab = event.currentTarget;
      tab.style.transform = 'scale(0.95)';
      tab.style.backgroundColor = '#d9ecff';
    },

    handleTabTouchEnd(event) {
      const tab = event.currentTarget;
      
      // 延迟恢复样式，提供视觉反馈
      setTimeout(() => {
        tab.style.transform = '';
        tab.style.backgroundColor = '';
      }, 150);
    },

    // 初始化滚动提示
    initScrollHint() {
      if (typeof window === 'undefined') return;
      
      // 检查是否为移动设备
      const isMobile = window.innerWidth <= 768 || 
        ('ontouchstart' in window) || 
        (navigator.maxTouchPoints > 0);
        
      if (!isMobile) return;
      
      // 显示滚动提示
      this.showScrollHint = true;
      
      // 添加滚动监听器来隐藏提示
      this.scrollHandler = () => {
        if (window.scrollY > 50) {
          this.showScrollHint = false;
          window.removeEventListener('scroll', this.scrollHandler);
        }
      };
      
      window.addEventListener('scroll', this.scrollHandler, { passive: true });
      
      // 3秒后自动隐藏提示
      setTimeout(() => {
        this.showScrollHint = false;
        if (this.scrollHandler) {
          window.removeEventListener('scroll', this.scrollHandler);
        }
      }, 3000);
    },
    
    async loadUserData() {
      try {
        const userProfile = await userService.getUserProfile();
        if (userProfile && userProfile.data) {
          // Extract first and last name from existing fullname if they don't exist separately
          const fullname = userProfile.data.fullname || (userProfile.data.first_name + ' ' + userProfile.data.last_name).trim();
          const firstName = userProfile.data.first_name || userProfile.data.firstName || '';
          const lastName = userProfile.data.last_name || userProfile.data.lastName || '';
          
          // If first and last names are empty but fullname exists, try to split fullname
          let derivedFirstName = firstName;
          let derivedLastName = lastName;
          if (!firstName && !lastName && fullname) {
            const nameParts = fullname.trim().split(/\s+/);
            if (nameParts.length >= 2) {
              derivedFirstName = nameParts[0];
              derivedLastName = nameParts.slice(1).join(' ');
            } else if (nameParts.length === 1) {
              derivedFirstName = nameParts[0];
              derivedLastName = '';
            }
          }
          
          this.userInfo = {
            firstName: derivedFirstName,
            lastName: derivedLastName,
            name: fullname,
            email: userProfile.data.email,
            username: userProfile.data.username,
            affiliation: userProfile.data.affiliation || '',
            phone: userProfile.data.phone || ''
          };
          // 保存原始数据用于重置
          this.originalUserInfo = { ...this.userInfo };
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
        this.$message.error('Failed to load user profile');
      }
    },
    
    async saveProfile() {
      try {
        const valid = await this.$refs.profileForm.validate();
        if (!valid) return;
        
        this.loading = true;
        
        // 准备保存的数据，包含分离的firstName和lastName
        const profileData = {
          ...this.userInfo,
          // 确保后端也能接收到分离的字段
          firstName: this.userInfo.firstName,
          lastName: this.userInfo.lastName,
          fullname: this.userInfo.name
        };
        
        // 调用实际的保存API
        await userService.updateProfile(profileData);
        
        this.$message.success('Profile saved successfully');
        this.originalUserInfo = { ...this.userInfo };
        this.lastAutoGeneratedName = this.userInfo.name; // 更新跟踪的自动生成名称
        
        // 更新localStorage中的用户信息，用于同步头部显示
        this.updateLocalStorageUser();
        
        // 触发父组件更新事件
        this.$emit('update');
        
      } catch (error) {
        console.error('Save profile failed:', error);
        this.$message.error(error || 'Save failed, please try again');
      } finally {
        this.loading = false;
      }
    },
    
    async changePassword() {
      try {
        const valid = await this.$refs.passwordForm.validate();
        if (!valid) return;
        
        // 如果密码修改被锁定，不允许提交
        if (this.passwordLocked) {
          this.$message.warning('Password change is temporarily disabled due to multiple failed attempts');
          return;
        }
        
        this.passwordLoading = true;
        
        // 调用修改密码API
        await userService.changePassword(this.passwordForm);
        
        this.$message.success('Password changed successfully');
        this.resetPasswordForm();
        
        // 密码修改成功，清除失败记录
        this.clearPasswordFailureState();
        
        // 提示用户重新登录
        this.$confirm('Password has been changed successfully. Please log in again to ensure security.', 'Password Changed', {
          confirmButtonText: 'Log in again',
          cancelButtonText: 'Continue using',
          type: 'success'
        }).then(() => {
          // 用户选择重新登录
          this.logout();
        }).catch(() => {
          // 用户选择继续使用
        });
        
      } catch (error) {
        console.error('Change password failed:', error);
        this.handlePasswordChangeError(error);
      } finally {
        this.passwordLoading = false;
      }
    },
    
    resetForm() {
      this.userInfo = { ...this.originalUserInfo };
      this.$refs.profileForm.clearValidate();
    },
    
    // 自动更新全名的方法
    updateFullName() {
      // 只有当用户没有手动修改过全名时才自动更新
      const autoGeneratedName = this.generateFullName();
      if (autoGeneratedName && (!this.userInfo.name || this.userInfo.name === this.lastAutoGeneratedName)) {
        this.userInfo.name = autoGeneratedName;
        this.lastAutoGeneratedName = autoGeneratedName;
      }
    },
    
    // 生成全名的辅助方法
    generateFullName() {
      const firstName = (this.userInfo.firstName || '').trim();
      const lastName = (this.userInfo.lastName || '').trim();
      
      if (firstName && lastName) {
        return `${firstName} ${lastName}`;
      } else if (firstName) {
        return firstName;
      } else if (lastName) {
        return lastName;
      }
      return '';
    },
    
    resetPasswordForm() {
      this.passwordForm = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      };
      if (this.$refs.passwordForm) {
        this.$refs.passwordForm.clearValidate();
      }
    },
    
    logout() {
      // 清除本地存储
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      
      // 清除store状态
      if (this.$store && this.$store.commit) {
        this.$store.commit('account/logout');
      }
      
      // 跳转到登录页
      this.$router.push('/login');
    },
    
    // 处理密码修改错误
    handlePasswordChangeError(error) {
      const errorMessage = error || 'Failed to change password, please try again';
      
      // 检查是否是当前密码错误
      if (typeof errorMessage === 'string' && errorMessage.toLowerCase().includes('current password is incorrect')) {
        // 增加密码尝试次数
        this.passwordAttempts++;
        console.log('Password attempts:', this.passwordAttempts);
        
        // 保存失败状态到localStorage
        this.savePasswordFailureState();
        
        // 如果失败次数达到3次，锁定密码修改功能
        if (this.passwordAttempts >= 3) {
          this.setPasswordLocked(15); // 锁定15分钟
          this.$message.error('Too many incorrect password attempts. Password change has been temporarily disabled for 15 minutes.');
        } else {
          const remainingAttempts = 3 - this.passwordAttempts;
          this.$message.error(`Current password is incorrect. ${remainingAttempts} attempts remaining before temporary lockout.`);
        }
      } else {
        // 其他错误不影响尝试次数
        this.$message.error(errorMessage);
      }
    },
    
    // 设置密码修改锁定状态
    setPasswordLocked(lockMinutes) {
      this.passwordLocked = true;
      this.lockRemainingTime = lockMinutes;
      
      // 保存锁定状态到localStorage
      const lockUntil = Date.now() + (lockMinutes * 60 * 1000);
      localStorage.setItem('passwordLockUntil', lockUntil.toString());
      localStorage.setItem('passwordAttempts', this.passwordAttempts.toString());
      
      // 启动倒计时
      this.startPasswordLockCountdown();
    },
    
    // 开始密码锁定倒计时
    startPasswordLockCountdown() {
      if (this.lockTimer) {
        clearInterval(this.lockTimer);
      }
      
      this.lockTimer = setInterval(() => {
        this.lockRemainingTime--;
        if (this.lockRemainingTime <= 0) {
          this.clearPasswordFailureState();
        }
      }, 60000); // 每分钟更新一次
    },
    
    // 清除密码修改失败状态
    clearPasswordFailureState() {
      this.passwordLocked = false;
      this.lockRemainingTime = 0;
      this.passwordAttempts = 0;
      
      if (this.lockTimer) {
        clearInterval(this.lockTimer);
        this.lockTimer = null;
      }
      
      // 清除localStorage中的状态
      localStorage.removeItem('passwordLockUntil');
      localStorage.removeItem('passwordAttempts');
    },
    
    // 保存密码修改失败状态
    savePasswordFailureState() {
      localStorage.setItem('passwordAttempts', this.passwordAttempts.toString());
    },
    
    // 检查保存的密码修改失败状态
    checkSavedPasswordFailureState() {
      const lockUntil = localStorage.getItem('passwordLockUntil');
      const savedAttempts = localStorage.getItem('passwordAttempts');
      
      if (lockUntil) {
        const now = Date.now();
        const lockTime = parseInt(lockUntil);
        
        if (now < lockTime) {
          // 仍在锁定期内
          const remainingMs = lockTime - now;
          this.lockRemainingTime = Math.ceil(remainingMs / 60000); // 转换为分钟
          this.passwordLocked = true;
          this.startPasswordLockCountdown();
        } else {
          // 锁定期已过，清除状态
          this.clearPasswordFailureState();
        }
      }
      
      if (savedAttempts) {
        this.passwordAttempts = parseInt(savedAttempts) || 0;
      }
    },

    // 邮箱管理方法
    async loadEmailInfo() {
      try {
        const emailInfo = await userService.getEmailInfo();
        if (emailInfo && emailInfo.data) {
          this.emailInfo = {
            primaryEmail: emailInfo.data.primaryEmail,
            backupEmail: emailInfo.data.backupEmail,
            backupEmailVerified: emailInfo.data.backupEmailVerified
          };
        }
      } catch (error) {
        console.error('Failed to load email info:', error);
        this.$message.error('Failed to load email information');
      }
    },

    async addBackupEmail() {
      try {
        const valid = await this.$refs.backupEmailForm.validate();
        if (!valid) return;

        this.emailLoading = true;

        await userService.addBackupEmail(this.backupEmailForm.email);
        
        this.$message.success('Backup email added successfully. Please check your email for verification instructions.');
        
        // 重新加载邮箱信息
        await this.loadEmailInfo();
        
        // 清空表单
        this.backupEmailForm.email = '';
        if (this.$refs.backupEmailForm) {
          this.$refs.backupEmailForm.clearValidate();
        }

      } catch (error) {
        console.error('Add backup email failed:', error);
        this.$message.error(error || 'Failed to add backup email');
      } finally {
        this.emailLoading = false;
      }
    },

    async verifyBackupEmail() {
      try {
        const valid = await this.$refs.verificationForm.validate();
        if (!valid) return;

        this.emailLoading = true;

        await userService.verifyBackupEmail(this.verificationForm.code);
        
        this.$message.success('Backup email verified successfully');
        
        // 重新加载邮箱信息
        await this.loadEmailInfo();
        
        // 清空验证码表单
        this.verificationForm.code = '';
        if (this.$refs.verificationForm) {
          this.$refs.verificationForm.clearValidate();
        }

      } catch (error) {
        console.error('Verify backup email failed:', error);
        this.$message.error(error || 'Failed to verify backup email');
      } finally {
        this.emailLoading = false;
      }
    },

    async resendVerification() {
      try {
        this.emailLoading = true;

        await userService.resendBackupVerification();
        
        this.$message.success('Verification email sent successfully');

      } catch (error) {
        console.error('Resend verification failed:', error);
        this.$message.error(error || 'Failed to resend verification email');
      } finally {
        this.emailLoading = false;
      }
    },

    async setBackupAsPrimary() {
      try {
        await this.$confirm(
          'Are you sure you want to set the backup email as your primary email? This will change your login email.',
          'Confirm Email Change',
          {
            confirmButtonText: 'Yes, Change',
            cancelButtonText: 'Cancel',
            type: 'warning'
          }
        );

        this.emailLoading = true;

        const result = await userService.setBackupAsPrimary();
        
        this.$message.success('Primary email changed successfully');
        
        // 重新加载邮箱信息和用户资料
        await this.loadEmailInfo();
        await this.loadUserData();

        // 提示用户下次登录需要使用新邮箱
        this.$alert(
          `Your primary email has been changed to ${result.data.newPrimaryEmail}. Please use this email for future logins.`,
          'Email Changed',
          {
            confirmButtonText: 'OK',
            type: 'success'
          }
        );

      } catch (error) {
        if (error !== 'cancel') {
          console.error('Set backup as primary failed:', error);
          this.$message.error(error || 'Failed to change primary email');
        }
      } finally {
        this.emailLoading = false;
      }
    },

    async confirmDeleteBackupEmail() {
      try {
        await this.$confirm(
          'Are you sure you want to remove the backup email? This action cannot be undone.',
          'Confirm Deletion',
          {
            confirmButtonText: 'Yes, Remove',
            cancelButtonText: 'Cancel',
            type: 'warning'
          }
        );

        this.emailLoading = true;

        await userService.deleteBackupEmail();
        
        this.$message.success('Backup email removed successfully');
        
        // 重新加载邮箱信息
        await this.loadEmailInfo();
        
        // 清空相关表单
        this.backupEmailForm.email = '';
        this.verificationForm.code = '';

      } catch (error) {
        if (error !== 'cancel') {
          console.error('Delete backup email failed:', error);
          this.$message.error(error || 'Failed to remove backup email');
        }
      } finally {
        this.emailLoading = false;
      }
    },

    // Username update methods
    async loadUsernameUpdateStatus() {
      try {
        const status = await userService.getUsernameUpdateStatus();
        if (status && status.data) {
          this.usernameUpdateStatus = status.data;
        }
      } catch (error) {
        console.error('Failed to load username update status:', error);
        // Don't show error message for this as it's not critical
      }
    },

    async proceedToVerification() {
      try {
        const valid = await this.$refs.usernameUpdateForm.validate();
        if (!valid) return;

        // Check if the new username is different from current
        if (this.usernameUpdateForm.newUsername === this.userInfo.username) {
          this.$message.warning('New username must be different from current username');
          return;
        }

        // 如果还没有验证，先进行验证
        if (this.usernameValidationStatus !== 'available') {
          await this.checkUsernameRealtime(this.usernameUpdateForm.newUsername);
          if (this.usernameValidationStatus !== 'available') {
            this.$message.error('Please enter a valid and available username');
            return;
          }
        }

        this.usernameUpdateStep = 2;
        this.verificationCodeSent = false;
      } catch (error) {
        console.error('Username validation failed:', error);
        this.$message.error('Username validation failed');
      }
    },

    // 实时用户名输入监听
    onUsernameInput() {
      this.resetUsernameValidation();
      
      // 清除之前的定时器
      if (this.usernameCheckTimeout) {
        clearTimeout(this.usernameCheckTimeout);
      }
      
      // 基本格式验证
      const username = this.usernameUpdateForm.newUsername.trim();
      if (!username) {
        return;
      }
      
      if (username.length < 3) {
        this.usernameValidationStatus = 'invalid';
        this.usernameValidationMessage = 'Username must be at least 3 characters';
        return;
      }
      
      if (username.length > 20) {
        this.usernameValidationStatus = 'invalid';
        this.usernameValidationMessage = 'Username must be no more than 20 characters';
        return;
      }
      
      if (username === this.userInfo.username) {
        this.usernameValidationStatus = 'invalid';
        this.usernameValidationMessage = 'This is your current username';
        return;
      }
      
      // 防抖检查
      this.usernameCheckTimeout = setTimeout(() => {
        this.checkUsernameRealtime(username);
      }, 500);
    },

    // 实时用户名检查
    async checkUsernameRealtime(username) {
      if (!username || username.length < 3) return;
      
      this.usernameValidationStatus = 'checking';
      this.showUsernameSuggestions = false;
      
      try {
        const response = await userService.checkUsernameAvailability(username);
        
        // 后端返回格式: {success: true, data: {available: true, message: "...", reserved: false, suggestions: []}}
        const result = response.data || response;
        
        if (result.available) {
          this.usernameValidationStatus = 'available';
          this.usernameValidationMessage = '';
        } else {
          this.usernameValidationStatus = result.reserved ? 'invalid' : 'unavailable';
          this.usernameValidationMessage = result.message || 'Username is not available';
          
          // 如果是保留用户名，获取建议
          if (result.reserved && result.suggestions) {
            this.usernameSuggestions = result.suggestions;
            this.showUsernameSuggestions = true;
          }
        }
      } catch (error) {
        console.error('Username check error:', error);
        this.usernameValidationStatus = 'invalid';
        this.usernameValidationMessage = 'Error checking username availability';
      }
    },

    // 重置用户名验证状态
    resetUsernameValidation() {
      this.usernameValidationStatus = null;
      this.usernameValidationMessage = '';
      this.showUsernameSuggestions = false;
      this.usernameSuggestions = [];
    },

    // 选择建议的用户名
    selectSuggestion(suggestion) {
      this.usernameUpdateForm.newUsername = suggestion;
      this.onUsernameInput();
    },

    async sendUsernameVerificationCode() {
      try {
        this.usernameLoading = true;

        await userService.sendUsernameVerification();
        
        this.$message.success('Verification code sent to your primary email address');
        this.verificationCodeSent = true;

      } catch (error) {
        console.error('Send username verification failed:', error);
        this.$message.error(error || 'Failed to send verification code');
      } finally {
        this.usernameLoading = false;
      }
    },

    async confirmUsernameUpdate() {
      try {
        const valid = await this.$refs.verificationCodeForm.validate();
        if (!valid) return;

        this.usernameLoading = true;

        const result = await userService.updateUsername(
          this.usernameUpdateForm.newUsername, 
          this.usernameUpdateForm.verificationCode
        );
        
        this.$message.success('Username updated successfully');
        
        // Update local user info
        this.userInfo.username = result.data.newUsername;
        this.originalUserInfo.username = result.data.newUsername;
        
        // Update localStorage user info to reflect in header
        this.updateLocalStorageUser();
        
        // Reload username update status
        await this.loadUsernameUpdateStatus();
        
        // Reset the form
        this.resetUsernameUpdate();

        // Emit update event to parent
        this.$emit('update');

      } catch (error) {
        console.error('Update username failed:', error);
        
        // 处理详细的错误信息
        if (error && typeof error === 'object' && error.message) {
          // 显示具体错误信息
          this.$message.error(error.message);
          
          // 如果有建议，显示建议
          if (error.suggestions && error.suggestions.length > 0) {
            this.$notify({
              title: 'Username Suggestions',
              message: `Try these alternatives: ${error.suggestions.join(', ')}`,
              type: 'info',
              duration: 8000
            });
            
            // 回到第一步让用户重新选择
            this.usernameUpdateStep = 1;
            this.verificationCodeSent = false;
          }
        } else {
          this.$message.error(error || 'Failed to update username');
        }
      } finally {
        this.usernameLoading = false;
      }
    },

    resetUsernameUpdate() {
      this.usernameUpdateStep = 1;
      this.verificationCodeSent = false;
      this.usernameUpdateForm = {
        newUsername: '',
        verificationCode: ''
      };
      
      // Clear form validation
      if (this.$refs.usernameUpdateForm) {
        this.$refs.usernameUpdateForm.clearValidate();
      }
      if (this.$refs.verificationCodeForm) {
        this.$refs.verificationCodeForm.clearValidate();
      }
    },

    formatDate(dateString) {
      if (!dateString) return 'Never';
      
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return 'Today';
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else {
        return date.toLocaleDateString();
      }
    },

    // 更新localStorage中的用户信息，用于同步头部显示
    updateLocalStorageUser() {
      try {
        const user = localStorage.getItem('user');
        if (user) {
          const userData = JSON.parse(user);
          // 更新用户信息
          userData.username = this.userInfo.username;
          userData.fullname = this.userInfo.name;
          userData.firstName = this.userInfo.firstName;
          userData.lastName = this.userInfo.lastName;
          userData.first_name = this.userInfo.firstName; // 兼容后端字段
          userData.last_name = this.userInfo.lastName;   // 兼容后端字段
          userData.email = this.userInfo.email;
          userData.affiliation = this.userInfo.affiliation;
          userData.phone = this.userInfo.phone;
          
          // 保存更新后的用户信息
          localStorage.setItem('user', JSON.stringify(userData));
          
          // 触发storage事件，让App组件能够检测到变化
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'user',
            newValue: JSON.stringify(userData),
            oldValue: user
          }));
        }
      } catch (error) {
        console.error('Failed to update localStorage user info:', error);
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
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.card-subtitle {
  color: #909399;
  font-size: 14px;
  margin: 0;
}

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

.profile-form {
  margin-top: 8px;
  padding: 16px 0;
}

.profile-form .el-form-item {
  margin-bottom: 28px;
}

.profile-form .el-input {
  width: 100%;
  max-width: 600px;
  font-size: 16px;
}

.profile-form .el-form-item__label {
  min-width: 140px;
  text-align: right;
}

/* 自定义按钮容器样式 */
.custom-form-buttons {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 15px;
  margin-top: 24px;
  padding: 0;
}

/* 自定义按钮基础样式 */
.custom-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 32px;
  font-size: 16px;
  font-weight: 500;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  outline: none;
  user-select: none;
  vertical-align: middle;
  line-height: 1;
  white-space: nowrap;
}

.custom-btn:focus {
  outline: 2px solid rgba(64, 158, 255, 0.3);
  outline-offset: 2px;
}

.custom-btn i {
  font-size: 14px;
}

/* 主要按钮样式 */
.custom-btn-primary {
  background-color: #409EFF;
  border-color: #409EFF;
  color: white;
}

.custom-btn-primary:hover:not(:disabled) {
  background-color: #66B1FF;
  border-color: #66B1FF;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.custom-btn-primary:active:not(:disabled) {
  background-color: #3A8EE6;
  border-color: #3A8EE6;
  transform: translateY(0);
}

.custom-btn-primary:disabled {
  background-color: #A0CFFF;
  border-color: #A0CFFF;
  cursor: not-allowed;
  opacity: 0.6;
}

/* 次要按钮样式 */
.custom-btn-secondary {
  background-color: #F5F7FA;
  border-color: #DCDFE6;
  color: #606266;
}

.custom-btn-secondary:hover:not(:disabled) {
  background-color: #ECF5FF;
  border-color: #409EFF;
  color: #409EFF;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.custom-btn-secondary:active:not(:disabled) {
  background-color: #D9ECFF;
  border-color: #3A8EE6;
  color: #3A8EE6;
  transform: translateY(0);
}

.custom-btn-secondary:disabled {
  background-color: #F5F7FA;
  border-color: #E4E7ED;
  color: #C0C4CC;
  cursor: not-allowed;
  opacity: 0.6;
}

/* 加载状态动画 */
.custom-btn .el-icon-loading {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.el-form-item__label {
  font-weight: 500;
  color: #606266;
  font-size: 16px;
  padding-right: 12px;
}

.el-input__inner {
  border-radius: 8px;
  transition: all 0.3s;
  padding: 12px 15px;
  font-size: 16px;
}

.el-input__inner:focus {
  border-color: #409EFF;
}

.el-button {
  border-radius: 8px;
  font-weight: 500;
}

.field-hint {
  margin-top: 5px;
  font-size: 12px;
  color: #909399;
  display: flex;
  align-items: center;
  gap: 4px;
}

.field-hint i {
  font-size: 14px;
}

/* Custom Tab Styles */
.custom-tabs {
  margin-bottom: 20px;
}

.custom-tabs-nav {
  display: flex;
  border-bottom: 2px solid #e4e7ed;
  position: relative;
}

.custom-tab-item {
  flex: 0 0 auto;
  padding: 14px 24px;
  font-size: 16px;
  font-weight: 500;
  color: #606266;
  cursor: pointer;
  position: relative;
  transition: all 0.3s ease;
  user-select: none;
  white-space: nowrap;
}

.custom-tab-item:hover {
  color: #409EFF;
  background-color: #f5f7fa;
}

.custom-tab-item.is-active {
  color: #409EFF;
  background-color: #ecf5ff;
}

.custom-tab-item.is-active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background-color: #409EFF;
}

.custom-tabs-content {
  padding-top: 20px;
}

.custom-tab-pane {
  min-height: 400px;
}

/* 移动端触摸优化 */
@media (hover: none) and (pointer: coarse) {
  /* 针对触摸设备的特殊样式 */
  .custom-tab-item {
    /* 确保足够的触摸目标大小 */
    min-height: 48px !important;
    min-width: 88px !important;
    touch-action: manipulation !important;
    -webkit-tap-highlight-color: rgba(64, 158, 255, 0.3) !important;
    cursor: pointer !important;
    user-select: none !important;
    -webkit-user-select: none !important;
    -moz-user-select: none !important;
    -ms-user-select: none !important;
  }
  
  .custom-tab-item:active {
    background-color: #d9ecff !important;
    transform: scale(0.95) !important;
    transition: all 0.1s ease !important;
  }
}

@media (max-width: 768px) {
  .custom-tab-item {
    /* 确保足够的触摸目标大小 */
    min-height: 48px !important;
    touch-action: manipulation !important;
    -webkit-tap-highlight-color: rgba(64, 158, 255, 0.2) !important;
    position: relative !important;
    overflow: hidden !important;
  }
  
  /* 为了确保点击区域覆盖整个tab，添加伪元素 */
  .custom-tab-item::before {
    content: '' !important;
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    z-index: 1 !important;
    cursor: pointer !important;
  }
  
  .custom-tab-item:active {
    background-color: #d9ecff !important;
    transform: scale(0.98) !important;
  }
  
  /* 确保tab文本在伪元素上方 */
  .custom-tab-item * {
    position: relative !important;
    z-index: 2 !important;
    pointer-events: none !important;
  }
  
  /* 移动端tab导航支持横向滚动 */
  .custom-tabs-nav {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  
  .custom-tabs-nav::-webkit-scrollbar {
    display: none;
  }
}

/* Password form specific styles */
.password-form {
  margin-top: 8px;
  padding: 16px 0;
}

.password-form .el-form-item {
  margin-bottom: 28px;
}

.password-form .el-input {
  width: 100%;
  max-width: 600px;
  font-size: 16px;
}

.password-form .el-form-item__label {
  min-width: 140px;
  text-align: right;
}

.password-form .el-form-item__label {
  color: #606266;
}

.password-form .el-input__inner {
  background-color: #fff;
}

.password-form .el-input__inner:focus {
  background-color: white;
  border-color: #409EFF;
}

/* Security styling for password fields */
.password-form {
  padding: 32px;
  border-radius: 8px;
}

.password-form .el-form-item {
  margin-bottom: 24px;
}

.password-form .el-form-item:last-child {
  padding: 20px 0 0 0;
}

/* 密码修改锁定警告样式 */
.password-locked-warning {
  margin-bottom: 24px;
}

.password-locked-warning .el-alert {
  border-radius: 8px;
}

/* 密码尝试次数警告样式 */
.password-attempt-warning {
  margin-top: 8px;
  font-size: 13px;
  color: #E6A23C;
  display: flex;
  align-items: center;
  gap: 6px;
}

.password-attempt-warning i {
  font-size: 14px;
}

/* 邮箱管理样式 */
.email-management {
  padding: 16px 0 24px 0;
}

.email-section {
  margin-bottom: 40px;
  padding-bottom: 32px;
  border-bottom: 1px solid #EBEEF5;
}

.email-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 20px 0;
}

.section-title i {
  color: #409EFF;
  font-size: 20px;
}

.email-info {
  background-color: #F5F7FA;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.email-display {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

/* 内联删除按钮样式 */
.inline-remove-btn {
  border-radius: 4px;
  font-size: 13px;
  padding: 6px 12px;
  height: auto;
  line-height: 1.2;
}

.inline-remove-btn:hover {
  background-color: #F78989;
  border-color: #F78989;
}

.email-address {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.email-note {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #909399;
}

.no-backup-email {
  text-align: center;
  padding: 40px 20px;
}

.empty-state {
  margin-bottom: 30px;
}

.empty-state i {
  font-size: 48px;
  color: #DCDFE6;
  margin-bottom: 16px;
}

.empty-state p {
  color: #909399;
  margin: 8px 0;
  font-size: 16px;
}

.empty-note {
  font-size: 14px !important;
  color: #C0C4CC !important;
}

.add-backup-form {
  max-width: 600px;
  margin: 0 auto;
  text-align: left;
}

.add-backup-form .el-form-item__label {
  min-width: 180px;
  text-align: right;
}

.verification-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #E4E7ED;
}

.verification-note {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #E6A23C;
  font-size: 14px;
  margin-bottom: 16px;
  padding: 12px;
  background-color: #FDF6EC;
  border-radius: 4px;
  border-left: 4px solid #E6A23C;
}

.verification-form {
  max-width: 600px;
}

.verification-form .el-form-item__label {
  min-width: 180px;
  text-align: right;
}

/* 验证码输入框样式 */
.verification-form .el-input {
  width: 100%;
  min-width: 280px;
}

.verification-form .el-input__inner {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 16px;
  letter-spacing: 2px;
  text-align: center;
}

/* 验证按钮容器 - 确保按钮不换行 */
.verification-actions {
  display: flex;
  gap: 16px;
  align-items: center;
  width: 100%;
  min-width: 350px; /* 确保容器有足够宽度 */
}

.verification-actions .action-btn {
  flex: 0 0 auto; /* 防止按钮被压缩 */
  min-width: 120px;
  white-space: nowrap;
}

/* 邮箱操作按钮容器 */
.email-actions-container {
  display: flex;
  gap: 16px;
  align-items: center;
  width: 100%;
  flex-wrap: wrap;
}

.email-actions-container .action-btn {
  flex: 0 0 auto;
  min-width: 140px;
}

/* 统一的按钮样式 */
.action-btn {
  border-radius: 8px;
  font-weight: 500;
  padding: 12px 20px;
  font-size: 14px;
  transition: all 0.3s ease;
  text-align: center;
}

.primary-btn {
  background-color: #409EFF;
  border-color: #409EFF;
  color: white;
}

.primary-btn:hover {
  background-color: #66B1FF;
  border-color: #66B1FF;
}

.secondary-btn {
  background-color: #F5F7FA;
  border-color: #DCDFE6;
  color: #606266;
}

.secondary-btn:hover {
  background-color: #ECF5FF;
  border-color: #409EFF;
  color: #409EFF;
}

.danger-btn {
  background-color: #F56C6C;
  border-color: #F56C6C;
  color: white;
}

.danger-btn:hover {
  background-color: #F78989;
  border-color: #F78989;
}

.backup-email-actions {
  margin-top: 16px;
  padding: 16px 20px;
  /* background-color: #FAFAFA; */
  border-radius: 8px;
  border: 1px solid #E4E7ED;
}

.backup-email-actions .el-button {
  border-radius: 6px;
}

.email-management-info {
  margin-top: 32px;
}

.info-card {
  background-color: #F0F9FF;
  border: 1px solid #B3E5FC;
  border-radius: 8px;
  padding: 20px;
}

.info-card h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #0277BD;
  margin: 0 0 12px 0;
  font-size: 16px;
}

.info-card h4 i {
  color: #03A9F4;
}

.info-card ul {
  margin: 0;
  padding-left: 20px;
  color: #37474F;
}

.info-card li {
  margin-bottom: 6px;
  line-height: 1.5;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .verification-actions {
    flex-direction: column;
    gap: 12px;
    min-width: auto;
  }
  
  .verification-actions .action-btn {
    width: 100%;
    min-width: auto;
  }
  
  .email-actions-container {
    flex-direction: column;
    gap: 12px;
  }
  
  .email-actions-container .action-btn {
    width: 100%;
    min-width: auto;
  }
  
  .add-backup-form {
    max-width: 100%;
  }
  
  .verification-form {
    max-width: 100%;
  }
}

@media (max-width: 480px) {
  .verification-actions {
    min-width: auto;
  }
  
  .verification-actions .action-btn {
    font-size: 13px;
    padding: 10px 16px;
  }
}

/* Username management styles */
.username-management {
  padding: 16px 0 24px 0;
}

.username-restriction-warning {
  margin-bottom: 24px;
}

.username-restriction-warning .el-alert {
  border-radius: 8px;
}

/* Current Username Info */
.current-username-info {
  margin-top: 16px;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #409EFF;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.info-label {
  color: #606266;
  font-weight: 500;
}

.info-value {
  color: #303133;
  font-weight: 600;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background-color: #e1f5fe;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #b3e5fc;
}

.last-updated-info {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #909399;
}

.last-updated-info i {
  color: #C0C4CC;
}

.username-update-form {
  margin-bottom: 40px;
}

.current-username-info {
  margin-bottom: 32px;
  padding: 20px;
  background-color: #F5F7FA;
  border-radius: 8px;
}

.username-display {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 12px 0;
}

.username-text {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.username-step {
  margin-bottom: 32px;
  padding: 24px;
  border: 1px solid #EBEEF5;
  border-radius: 8px;
}

.username-form {
  max-width: 600px;
}

.username-form .el-form-item__label {
  min-width: 180px;
  text-align: right;
}

/* 用户名验证反馈样式 */
.username-validation-feedback {
  margin-top: 8px;
}

.validation-message {
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.validation-message.checking {
  color: #909399;
}

.validation-message.available {
  color: #67C23A;
}

.validation-message.unavailable,
.validation-message.invalid {
  color: #F56C6C;
}

/* 用户名建议样式 */
.username-suggestions {
  margin-top: 12px;
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
  border-left: 3px solid #409EFF;
}

.suggestions-title {
  font-size: 13px;
  color: #606266;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.suggestions-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.suggestion-tag {
  cursor: pointer;
  transition: all 0.3s;
}

.suggestion-tag:hover {
  background-color: #409EFF;
  color: white;
  transform: translateY(-1px);
}

/* 用户名输入框状态指示 */
.el-input__suffix .el-icon-circle-check {
  color: #67C23A !important;
}

.el-input__suffix .el-icon-circle-close {
  color: #F56C6C !important;
}

.el-input__suffix .el-icon-loading {
  color: #909399 !important;
}

.username-rules {
  margin-top: 12px;
  padding: 16px;
  background-color: #F0F9FF;
  border-radius: 6px;
  border-left: 4px solid #409EFF;
}

.username-rules p {
  margin: 0 0 8px 0;
  color: #0277BD;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.username-rules ul {
  margin: 0;
  padding-left: 20px;
  color: #37474F;
}

.username-rules li {
  margin-bottom: 4px;
  line-height: 1.4;
}

.verification-info {
  margin-bottom: 24px;
}

.verification-notice {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 16px;
  background-color: #ECF5FF;
  border-radius: 6px;
  border-left: 4px solid #409EFF;
  margin-bottom: 16px;
}

.verification-notice i {
  color: #409EFF;
  font-size: 16px;
  margin-top: 2px;
}

.verification-notice span {
  color: #303133;
  line-height: 1.5;
}

.email-info span {
  color: #606266;
  font-size: 14px;
}

.email-info strong {
  color: #303133;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.verification-code-section {
  margin-top: 20px;
}

.step-navigation {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #EBEEF5;
}

.username-management-info {
  margin-top: 32px;
}

.username-management-info .info-card {
  background-color: #FFF7E6;
  border: 1px solid #FFD591;
  border-radius: 8px;
  padding: 20px;
}

.username-management-info .info-card h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #D48806;
  margin: 0 0 12px 0;
  font-size: 16px;
}

.username-management-info .info-card h4 i {
  color: #FA8C16;
}

.username-management-info .info-card ul {
  margin: 0;
  padding-left: 20px;
  color: #37474F;
}

.username-management-info .info-card li {
  margin-bottom: 6px;
  line-height: 1.5;
}

/* 移动端滚动提示样式 */
.scroll-hint-container {
  position: fixed;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1000;
  pointer-events: none;
}

.scroll-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background-color: rgba(64, 158, 255, 0.9);
  color: white;
  padding: 16px 4px;
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: scrollHintPulse 2s infinite ease-in-out;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  width: 16px;
  height: 120px;
  min-width: 16px;
  max-width: 16px;
}

.scroll-hint-icon {
  font-size: 14px;
  animation: scrollHintBounce 1.5s infinite ease-in-out;
  transform: rotate(0deg);
}

.scroll-hint-text {
  font-size: 8px;
  font-weight: 600;
  text-align: center;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  letter-spacing: 1px;
  line-height: 1;
}

@keyframes scrollHintPulse {
  0%, 100% {
    opacity: 0.8;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
}

@keyframes scrollHintBounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(3px);
  }
}

/* 在桌面端隐藏滚动提示 */
@media (min-width: 769px) {
  .scroll-hint-container {
    display: none !important;
  }
  
  /* 桌面端显示/隐藏控制 */
  .mobile-only {
    display: none !important;
  }
  
  .mobile-hidden {
    display: block !important;
  }
}

/* Responsive design for username management */
@media (max-width: 768px) {
  .profile-management {
    padding: 0;
  }
  
  /* 最强制的移动端表单垂直布局样式 */
  .profile-management >>> .el-form {
    width: 100% !important;
  }
  
  .profile-management >>> .el-form-item {
    display: block !important;
    flex-direction: column !important;
    width: 100% !important;
    margin-bottom: 20px !important;
  }
  
  .profile-management >>> .el-form-item__label {
    width: 100% !important;
    max-width: none !important;
    text-align: left !important;
    min-width: 0 !important;
    margin-bottom: 8px !important;
    float: none !important;
    display: block !important;
    padding-right: 0 !important;
    margin-right: 0 !important;
    line-height: 1.4 !important;
    font-size: 14px !important;
  }
  
  .profile-management >>> .el-form-item__content {
    margin-left: 0 !important;
    width: 100% !important;
    max-width: none !important;
    display: block !important;
  }
  
  .profile-management >>> .el-input {
    width: 100% !important;
    max-width: none !important;
  }
  
  .profile-management >>> .el-input__inner {
    width: 100% !important;
  }
  
  .profile-management .el-card {
    margin: 12px;
    border-radius: 12px;
  }
  
  .profile-management .el-card__body {
    padding: 16px;
  }
  
  .card-header {
    padding: 16px 0;
  }
  
  .card-title {
    font-size: 20px;
    margin-bottom: 8px;
  }
  
  .card-subtitle {
    font-size: 14px;
    line-height: 1.4;
  }
  
  /* 移动端自定义tabs样式 */
  .custom-tabs-nav {
    padding: 0 8px;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  
  .custom-tabs-nav::-webkit-scrollbar {
    display: none;
  }
  
  .custom-tab-item {
    padding: 12px 8px !important;
    font-size: 14px !important;
    min-height: 56px !important;
    line-height: 1.2 !important;
    min-width: 80px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    text-align: center !important;
    word-break: break-word !important;
    white-space: normal !important;
    flex: 1 1 auto !important;
  }
  
  .custom-tab-item.is-active::after {
    height: 3px !important;
  }
  
  .profile-form,
  .password-form {
    max-width: 100%;
  }
  
  .profile-form .el-form-item,
  .password-form .el-form-item {
    margin-bottom: 20px;
  }
  
  /* 移动端表单标签样式 - 已在上面定义，这里删除重复 */
  
  .profile-form .el-input,
  .password-form .el-input {
    max-width: none !important;
    width: 100% !important;
  }
  
  .field-hint,
  .password-attempt-warning {
    font-size: 12px;
    margin-top: 6px;
    line-height: 1.3;
    padding: 6px 8px;
    border-radius: 4px;
  }
  
  /* 移动端自定义按钮样式 */
  .custom-form-buttons {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
    margin-top: 20px;
  }
  
  .custom-btn {
    width: 100%;
    padding: 14px 16px;
    font-size: 14px;
    justify-content: center;
  }
  
  .username-step {
    padding: 16px;
    margin-bottom: 24px;
  }
  
  .current-username-info {
    padding: 16px;
    margin-bottom: 24px;
  }
  
  .username-form {
    max-width: 100%;
  }
  
  .verification-actions {
    flex-direction: column;
    gap: 12px;
  }
  
  .verification-actions .action-btn {
    width: 100%;
  }
  
  .email-actions-container {
    flex-direction: column;
    gap: 12px;
  }
  
  .email-actions-container .action-btn {
    width: 100%;
  }
  
  .add-backup-form,
  .verification-form {
    max-width: 100%;
  }
  
  /* 其他表单的标签和内容样式 - 已在上面统一定义，这里删除重复 */
  
  .add-backup-form .el-input,
  .verification-form .el-input,
  .username-form .el-input {
    width: 100% !important;
  }
  
  .password-locked-warning {
    margin-bottom: 16px;
  }
  
  .password-locked-warning .el-alert {
    font-size: 13px;
  }
  
  .username-display {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .username-text {
    font-size: 14px;
    word-break: break-all;
  }
  
  .info-value {
    font-size: 13px;
    word-break: break-all;
  }
  
  /* 移动端邮件管理样式优化 */
  .email-management {
    padding: 8px 0 16px 0 !important;
  }
  
  .email-section {
    margin-bottom: 24px !important;
    padding-bottom: 20px !important;
  }
  
  .email-section:last-child {
    margin-bottom: 0 !important;
  }
  
  .section-title {
    font-size: 16px !important;
    margin: 0 0 12px 0 !important;
  }
  
  .section-title i {
    font-size: 18px !important;
  }
  
  .email-info {
    padding: 16px !important;
    margin-bottom: 16px !important;
  }
  
  .no-backup-email {
    padding: 20px 12px !important;
  }
  
  .empty-state {
    margin-bottom: 20px !important;
  }
  
  .empty-state i {
    font-size: 36px !important;
    margin-bottom: 12px !important;
  }
  
  .empty-state p {
    font-size: 15px !important;
    margin: 6px 0 !important;
  }
  
  .verification-section {
    margin-top: 12px !important;
    padding-top: 12px !important;
  }
  
  .verification-note {
    margin-bottom: 12px !important;
    padding: 10px !important;
    font-size: 13px !important;
  }
  
  .backup-email-actions {
    margin-top: 12px !important;
    padding: 12px 16px !important;
  }
  
  .email-management-info {
    margin-top: 20px !important;
  }
  
  .email-management-info .info-card {
    padding: 16px !important;
  }
  
  .email-management-info .info-card h4 {
    font-size: 15px !important;
    margin: 0 0 10px 0 !important;
  }
  
  .email-management-info .info-card li {
    margin-bottom: 4px !important;
    font-size: 13px !important;
    line-height: 1.4 !important;
  }
  
  /* 移动端显示/隐藏控制 */
  .mobile-only {
    display: block !important;
  }
  
  .mobile-hidden {
    display: none !important;
  }
  
  /* 移动端用户名规则优化 */
  .mobile-only.username-rules {
    margin-top: 20px !important;
    padding: 14px !important;
  }
  
  .mobile-only.username-rules p {
    font-size: 14px !important;
    margin: 0 0 8px 0 !important;
  }
}

@media (max-width: 480px) {
  .profile-management .el-card {
    margin: 8px;
  }
  
  .profile-management .el-card__body {
    padding: 12px;
  }
  
  .card-header {
    padding: 12px 0;
  }
  
  .card-title {
    font-size: 18px;
  }
  
  .card-subtitle {
    font-size: 13px;
  }
  
  .custom-tab-item {
    padding: 16px 4px !important;
    font-size: 12px !important;
    min-height: 64px !important;
    line-height: 1.1 !important;
    min-width: 70px !important;
    flex: 1 !important;
    max-width: 25% !important;
  }
  
  /* 在小屏幕上让tab项平分宽度 */
  .custom-tabs-nav {
    width: 100% !important;
  }
  
  /* 480px以下屏幕的表单标签字体大小调整 */
  .profile-form >>> .el-form-item__label,
  .password-form >>> .el-form-item__label,
  .add-backup-form >>> .el-form-item__label,
  .verification-form >>> .el-form-item__label,
  .username-form >>> .el-form-item__label {
    font-size: 13px !important;
    margin-bottom: 6px !important;
  }
  
  .field-hint,
  .password-attempt-warning {
    font-size: 11px;
  }
  
  .custom-btn {
    padding: 12px 14px;
    font-size: 13px;
  }
  
  .save-btn,
  .action-btn {
    padding: 10px;
    font-size: 13px;
  }
  
  .username-step,
  .current-username-info {
    padding: 12px;
  }
  
  .username-text,
  .info-value {
    font-size: 12px;
  }
  
  .verification-actions .action-btn {
    font-size: 13px;
    padding: 10px 16px;
  }
  
  /* 480px以下邮件管理进一步优化 */
  .email-management {
    padding: 6px 0 12px 0 !important;
  }
  
  .email-section {
    margin-bottom: 20px !important;
    padding-bottom: 16px !important;
  }
  
  .section-title {
    font-size: 15px !important;
    margin: 0 0 10px 0 !important;
  }
  
  .section-title i {
    font-size: 16px !important;
  }
  
  .email-info {
    padding: 12px !important;
    margin-bottom: 12px !important;
  }
  
  .email-address {
    font-size: 14px !important;
  }
  
  .email-note {
    font-size: 12px !important;
  }
  
  .no-backup-email {
    padding: 16px 8px !important;
  }
  
  .empty-state {
    margin-bottom: 16px !important;
  }
  
  .empty-state i {
    font-size: 32px !important;
    margin-bottom: 10px !important;
  }
  
  .empty-state p {
    font-size: 14px !important;
    margin: 4px 0 !important;
  }
  
  .empty-note {
    font-size: 12px !important;
  }
  
  .verification-section {
    margin-top: 10px !important;
    padding-top: 10px !important;
  }
  
  .verification-note {
    margin-bottom: 10px !important;
    padding: 8px !important;
    font-size: 12px !important;
  }
  
  .backup-email-actions {
    margin-top: 10px !important;
    padding: 10px 12px !important;
  }
  
  .email-management-info {
    margin-top: 16px !important;
  }
  
  .email-management-info .info-card {
    padding: 12px !important;
  }
  
  .email-management-info .info-card h4 {
    font-size: 14px !important;
    margin: 0 0 8px 0 !important;
  }
  
  .email-management-info .info-card li {
    margin-bottom: 3px !important;
    font-size: 12px !important;
    line-height: 1.3 !important;
  }
  
  /* 480px以下移动端显示/隐藏控制 */
  .mobile-only {
    display: block !important;
  }
  
  .mobile-hidden {
    display: none !important;
  }
  
  /* 移动端用户名规则优化 */
  .mobile-only.username-rules {
    margin-top: 16px !important;
    padding: 12px !important;
    font-size: 13px !important;
  }
  
  .mobile-only.username-rules p {
    font-size: 13px !important;
    margin: 0 0 6px 0 !important;
  }
}
</style>
