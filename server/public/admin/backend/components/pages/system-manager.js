import BaseComponent from '../core/base-component.js';

/**
 * 系统管理组件
 * 包含密码修改和导入导出功能
 */
class SystemManager extends BaseComponent {
    constructor() {
        super();
        this.passwordForm = {
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
        };
        this.isSubmitting = false;
    }

    render() {
        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: block;
                background: #f8f9fa;
                min-height: 100%;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            .settings-container {
                max-width: 1400px;
                margin: 0 auto;
                padding: 24px;
            }

            .settings-header {
                background: white;
                border-radius: 8px;
                padding: 24px;
                margin-bottom: 24px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }

            .settings-title {
                margin: 0 0 8px 0;
                font-size: 24px;
                font-weight: 600;
                color: #1a202c;
            }

            .settings-subtitle {
                margin: 0;
                color: #718096;
                font-size: 14px;
            }

            /* 左右布局 */
            .grid-container {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }

            .grid-item {
                width: 100%;
            }

            .feature-card {
                background: white;
                border-radius: 8px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                border: 1px solid #e2e8f0;
                transition: all 0.2s ease;
                overflow: hidden;
                display: flex;
                align-items: center;
                min-height: 80px;
            }

            .feature-card:hover {
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                transform: translateY(-2px);
            }

            .feature-header {
                padding: 16px 18px;
                background: #f8f9fa;
                border-right: 1px solid #e2e8f0;
                min-width: 200px;
                flex-shrink: 0;
                align-self: stretch;
                display: flex;
                flex-direction: column;
                justify-content: center;
            }

            .feature-title {
                margin: 0 0 4px 0;
                font-size: 18px;
                font-weight: 600;
                color: #2d3748;
            }

            .feature-description {
                margin: 0;
                font-size: 14px;
                color: #718096;
                line-height: 1.3;
            }

            .feature-body {
                padding: 20px 24px;
                display: flex;
                align-items: center;
                gap: 24px;
                flex: 1;
            }

            .feature-content {
                flex: 1;
                font-size: 14px;
                color: #4a5568;
                line-height: 1.4;
            }

            /* 表单样式 */
            .form-group {
                margin-bottom: 12px;
            }

            .form-label {
                display: block;
                margin-bottom: 6px;
                font-size: 14px;
                font-weight: 500;
                color: #374151;
            }

            .form-input {
                width: 100%;
                padding: 10px 12px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 14px;
                color: #374151;
                background: white;
                transition: all 0.2s ease;
                box-sizing: border-box;
            }

            .form-input:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }

            .form-input.error {
                border-color: #ef4444;
                box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
            }

            .file-input {
                display: none;
            }

            .file-upload-area {
                position: relative;
                border: 2px dashed #d1d5db;
                background: #fafafa;
                padding: 12px 20px;
                text-align: center;
                cursor: pointer;
                transition: all 0.2s ease;
                border-radius: 6px;
                min-height: 48px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
            }

            .file-upload-area:hover {
                border-color: #3b82f6;
                background: #f8faff;
            }

            .upload-icon {
                width: 20px;
                height: 20px;
                opacity: 0.6;
                flex-shrink: 0;
            }

            .upload-text {
                font-size: 14px;
                color: #374151;
                font-weight: 500;
                margin-right: 8px;
            }

            .upload-hint {
                font-size: 12px;
                color: #9ca3af;
            }

            .file-selected {
                background: #f0f9ff !important;
                border-color: #3b82f6 !important;
            }

            .selected-file-info {
                display: none;
                flex-direction: column;
                align-items: center;
                gap: 4px;
            }

            .selected-file-info.show {
                display: flex;
            }

            .selected-file-name {
                font-size: 14px;
                color: #1e40af;
                font-weight: 500;
                max-width: 200px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .selected-file-size {
                font-size: 12px;
                color: #6b7280;
            }

            .remove-file-btn {
                margin-top: 8px;
                padding: 6px 16px;
                background: #fee2e2;
                color: #dc2626;
                border: 1px solid #fecaca;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                min-width: 80px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
            }

            .remove-file-btn:hover {
                background: #fecaca;
                border-color: #f87171;
                transform: translateY(-1px);
            }

            .remove-file-btn:active {
                transform: translateY(0);
            }

            .form-error {
                margin-top: 4px;
                font-size: 13px;
                color: #ef4444;
                display: none;
            }

            .form-error.show {
                display: block;
            }

            .form-actions {
                display: flex;
                gap: 10px;
                flex-shrink: 0;
                min-width: 160px;
            }

            .btn-group {
                display: flex;
                width: 120px; /* 与单个图标按钮宽度一致 */
                border-radius: 6px;
                overflow: hidden;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                border: 1px solid #e2e8f0;
            }

            .btn-group .btn {
                flex: 1;
                margin: 0;
                border-radius: 0;
                border: none;
                position: relative;
                box-shadow: none;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
            }

            .btn-group .btn-group-left {
                border-top-left-radius: 6px;
                border-bottom-left-radius: 6px;
            }

            .btn-group .btn-group-right {
                border-top-right-radius: 6px;
                border-bottom-right-radius: 6px;
            }

            .btn-group .btn-group-left::after {
                display: none;
            }

            .form-row {
                display: flex;
                gap: 12px;
                align-items: flex-start;
            }

            .form-row .form-group {
                flex: 1;
            }

            /* 按钮样式 */
            .btn {
                padding: 10px 18px;
                border: none;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                text-decoration: none;
                justify-content: center;
                white-space: nowrap;
            }

            .btn-primary {
                background: #3b82f6;
                color: white;
            }

            .btn-primary:hover:not(:disabled) {
                background: #2563eb;
                transform: translateY(-1px);
            }

            .btn-success {
                background: #10b981;
                color: white;
            }

            .btn-success:hover:not(:disabled) {
                background: #059669;
                transform: translateY(-1px);
            }

            .btn-danger {
                background: #ef4444;
                color: white;
            }

            .btn-danger:hover:not(:disabled) {
                background: #dc2626;
                transform: translateY(-1px);
            }

            .btn-secondary {
                background: #f3f4f6;
                color: #374151;
                border: 1px solid #d1d5db;
            }

            .btn-secondary:hover:not(:disabled) {
                background: #e5e7eb;
            }

            .btn:disabled {
                background: #9ca3af;
                cursor: not-allowed;
                transform: none;
            }

            .btn-block {
                width: 100%;
            }

            /* 图标按钮样式 */
            .btn-icon {
                width: 120px;
                height: 60px;
                border-radius: 8px;
                border: none;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 24px;
                color: white;
                background: #3b82f6;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .btn-icon:hover:not(:disabled) {
                background: #2563eb;
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.15);
            }

            .btn-icon:disabled {
                background: #9ca3af;
                cursor: not-allowed;
                transform: none;
                box-shadow: 0 1px 2px rgba(0,0,0,0.1);
            }

            .loading-spinner {
                width: 12px;
                height: 12px;
                border: 2px solid transparent;
                border-top: 2px solid currentColor;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            /* 消息和结果 */
            .success-message {
                margin-bottom: 12px;
                padding: 10px 12px;
                background: #dcfce7;
                border: 1px solid #bbf7d0;
                border-radius: 6px;
                color: #166534;
                font-size: 14px;
                display: none;
            }

            .success-message.show {
                display: block;
            }

            .warning-box {
                margin-top: 8px;
                margin-bottom: 16px;
                padding: 10px;
                background: #fef3c7;
                border: 1px solid #fbbf24;
                border-radius: 6px;
                font-size: 13px;
                color: #92400e;
                font-weight: 500;
            }

            .import-results {
                margin-top: 16px;
                padding: 12px;
                border-radius: 6px;
                font-size: 14px;
                display: none;
            }

            .import-results.show {
                display: block;
            }

            .import-results.success {
                background: #dcfce7;
                border: 1px solid #bbf7d0;
                color: #166534;
            }

            .import-results.error {
                background: #fef2f2;
                border: 1px solid #fecaca;
                color: #dc2626;
            }

            .import-results.warning {
                background: #fef3c7;
                border: 1px solid #fbbf24;
                color: #92400e;
            }

            .results-title {
                font-weight: 600;
                margin-bottom: 6px;
            }

            .results-list {
                margin: 0;
                padding-left: 12px;
            }

            .results-list li {
                margin-bottom: 3px;
            }

            /* 响应式设计 */
            @media (max-width: 768px) {
                .settings-container {
                    padding: 12px;
                }

                .settings-header {
                    padding: 12px;
                }

                .feature-card {
                    flex-direction: column;
                    align-items: stretch;
                    min-height: auto;
                }

                .feature-header {
                    border-right: none;
                    border-bottom: 1px solid #e2e8f0;
                    min-width: auto;
                }

                .feature-body {
                    padding: 16px;
                    flex-direction: column;
                    align-items: stretch;
                    gap: 12px;
                }

                .form-row {
                    flex-direction: column;
                    gap: 8px;
                }

                .form-actions {
                    flex-direction: column;
                    min-width: auto;
                }

                .btn-group {
                    width: 100%;
                    flex-direction: column;
                    box-shadow: none;
                    border: none;
                }

                .btn-group .btn {
                    border-radius: 6px !important;
                    border: 1px solid #d1d5db !important;
                    margin-bottom: 8px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
                    height: 44px;
                }

                .btn-group .btn:last-child {
                    margin-bottom: 0;
                }

                .btn-group .btn-group-left::after {
                    display: none;
                }

                .btn {
                    justify-content: center;
                }
            }
        `;

        const container = document.createElement('div');
        container.className = 'settings-container';

        container.innerHTML = `
            <div class="grid-container">
                <!-- 数据导出 -->
                <div class="grid-item">
                    <div class="feature-card">
                        <div class="feature-header">
                            <h3 class="feature-title">数据导出</h3>
                            <p class="feature-description">备份数据库文件，用于迁移</p>
                        </div>
                        <div class="feature-body">
                            <div class="feature-content">
                                <p>自动创建带时间戳的备份文件，SQLite格式，包含所有用户和注册数据</p>
                            </div>
                            <div class="form-actions">
                                <button type="button" class="btn-icon" id="export-btn" title="导出数据库">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="7,10 12,15 17,10"></polyline>
                                        <line x1="12" y1="15" x2="12" y2="3"></line>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 导入管理员 -->
                <div class="grid-item">
                    <div class="feature-card">
                        <div class="feature-header">
                            <h3 class="feature-title">导入管理员</h3>
                            <p class="feature-description">通过邮箱列表批量管理权限</p>
                        </div>
                        <div class="feature-body">
                            <div class="feature-content">
                                <p>支持TXT和CSV格式文件。已有用户直接设为管理员。新用户自动创建管理员账户，默认密码：confreg2025</p>
                                <div class="form-group">
                                    <div class="file-upload-area" id="admin-upload-area">
                                        <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                            <path d="M12 2v6m0 0l3-3m-3 3l-3-3"/>
                                            <path d="M6 14.5c0-1.104.896-2 2-2h8c1.104 0 2 .896 2 2v4c0 1.104-.896 2-2 2H8c-1.104 0-2-.896-2-2v-4z"/>
                                        </svg>
                                        <div class="upload-text">点击选择文件或拖拽文件到此处</div>
                                        <div class="upload-hint">支持 TXT、CSV 格式，最大 10MB</div>
                                        <div class="selected-file-info" id="admin-file-info">
                                            <div class="selected-file-name" id="admin-file-name"></div>
                                            <div class="selected-file-size" id="admin-file-size"></div>
                                            <button type="button" class="remove-file-btn" id="admin-remove-btn">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                    <path d="M18 6L6 18M6 6l12 12"></path>
                                                </svg>
                                                移除文件
                                            </button>
                                        </div>
                                        <input 
                                            type="file" 
                                            id="admin-file" 
                                            class="file-input" 
                                            accept=".txt,.csv"
                                        >
                                    </div>
                                    <div class="form-error" id="admin-file-error"></div>
                                </div>
                            </div>
                            <div class="form-actions">
                                <button type="button" class="btn-icon" id="import-admin-btn" title="导入管理员" style="background: #10b981;">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="8.5" cy="7" r="4"></circle>
                                        <line x1="20" y1="8" x2="20" y2="14"></line>
                                        <line x1="23" y1="11" x2="17" y2="11"></line>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 导入数据库 -->
                <div class="grid-item">
                    <div class="feature-card">
                        <div class="feature-header">
                            <h3 class="feature-title">导入数据库</h3>
                            <p class="feature-description">完全替换当前数据库</p>
                        </div>
                        <div class="feature-body">
                            <div class="feature-content">
                                <p>支持SQLite数据库文件，自动备份当前数据库，完全覆盖现有数据</p>
                                <div class="warning-box">
                                    ⚠️ 此操作将完全覆盖当前数据，请谨慎操作！
                                </div>
                                <div class="form-group">
                                    <div class="file-upload-area" id="db-upload-area">
                                        <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                            <path d="M12 2v6m0 0l3-3m-3 3l-3-3"/>
                                            <path d="M6 14.5c0-1.104.896-2 2-2h8c1.104 0 2 .896 2 2v4c0 1.104-.896 2-2 2H8c-1.104 0-2-.896-2-2v-4z"/>
                                        </svg>
                                        <div class="upload-text">点击选择文件或拖拽文件到此处</div>
                                        <div class="upload-hint">支持 SQLite、DB 格式，最大 100MB</div>
                                        <div class="selected-file-info" id="db-file-info">
                                            <div class="selected-file-name" id="db-file-name"></div>
                                            <div class="selected-file-size" id="db-file-size"></div>
                                            <button type="button" class="remove-file-btn" id="db-remove-btn">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                    <path d="M18 6L6 18M6 6l12 12"></path>
                                                </svg>
                                                移除文件
                                            </button>
                                        </div>
                                        <input 
                                            type="file" 
                                            id="db-file" 
                                            class="file-input" 
                                            accept=".sqlite,.sqlite3,.db"
                                        >
                                    </div>
                                    <div class="form-error" id="db-file-error"></div>
                                </div>
                            </div>
                            <div class="form-actions">
                                <button type="button" class="btn-icon" id="import-db-btn" title="导入数据库" style="background: hsla(27, 100%, 57%, 1.00);">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14,2 14,8 20,8"></polyline>
                                        <line x1="12" y1="18" x2="12" y2="12"></line>
                                        <polyline points="9,15 12,12 15,15"></polyline>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 修改密码 -->
                <div class="grid-item">
                    <div class="feature-card">
                        <div class="feature-header">
                            <h3 class="feature-title">修改密码</h3>
                            <p class="feature-description">定期更改密码保护账户安全</p>
                        </div>
                        <div class="feature-body">
                            <div class="feature-content">
                                <div class="success-message" id="success-message">
                                    密码修改成功！建议您重新登录以确保安全。
                                </div>

                                <form id="password-form" class="compact-form">
                                    <div class="form-row">
                                        <div class="form-group">
                                            <label for="current-password" class="form-label">当前密码</label>
                                            <input 
                                                type="password" 
                                                id="current-password" 
                                                class="form-input" 
                                                placeholder="请输入当前密码"
                                                required
                                            >
                                            <div class="form-error" id="current-password-error"></div>
                                        </div>

                                        <div class="form-group">
                                            <label for="new-password" class="form-label">新密码</label>
                                            <input 
                                                type="password" 
                                                id="new-password" 
                                                class="form-input" 
                                                placeholder="至少6位字符"
                                                required
                                            >
                                            <div class="form-error" id="new-password-error"></div>
                                        </div>

                                        <div class="form-group">
                                            <label for="confirm-password" class="form-label">确认新密码</label>
                                            <input 
                                                type="password" 
                                                id="confirm-password" 
                                                class="form-input" 
                                                placeholder="再次输入新密码"
                                                required
                                            >
                                            <div class="form-error" id="confirm-password-error"></div>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="form-actions">
                                <div class="btn-group">
                                    <button type="submit" class="btn btn-primary btn-group-left" id="submit-btn" form="password-form" title="修改密码">
                                        <span class="btn-text">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                                                <polyline points="17,21 17,13 7,13 7,21"/>
                                                <polyline points="7,3 7,8 15,8"/>
                                            </svg>
                                        </span>
                                    </button>
                                    <button type="button" class="btn btn-secondary btn-group-right" id="reset-btn" title="重置表单">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                                            <path d="M21 3v5h-5"/>
                                            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                                            <path d="M3 21v-5h5"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="import-results" id="import-results"></div>
            </div>
        `;

        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(container);
    }

    setupEventListeners() {
        const form = this.shadowRoot.getElementById('password-form');
        const submitBtn = this.shadowRoot.getElementById('submit-btn');
        const resetBtn = this.shadowRoot.getElementById('reset-btn');

        // 密码修改功能
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handlePasswordChange();
        });

        resetBtn.addEventListener('click', () => {
            this.resetForm();
        });

        // 实时验证
        const inputs = this.shadowRoot.querySelectorAll('.form-input');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.clearError(input.id);
            });

            input.addEventListener('blur', () => {
                this.validateField(input.id);
            });
        });

        // 导入导出功能
        const exportBtn = this.shadowRoot.getElementById('export-btn');
        const importAdminBtn = this.shadowRoot.getElementById('import-admin-btn');
        const importDbBtn = this.shadowRoot.getElementById('import-db-btn');

        exportBtn.addEventListener('click', () => {
            this.handleExportDatabase();
        });

        importAdminBtn.addEventListener('click', () => {
            this.handleImportAdminEmails();
        });

        importDbBtn.addEventListener('click', () => {
            this.handleImportDatabase();
        });

        // 文件选择事件处理
        const adminFileInput = this.shadowRoot.getElementById('admin-file');
        const dbFileInput = this.shadowRoot.getElementById('db-file');
        const adminRemoveBtn = this.shadowRoot.getElementById('admin-remove-btn');
        const dbRemoveBtn = this.shadowRoot.getElementById('db-remove-btn');

        adminFileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e.target, 'admin');
        });

        dbFileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e.target, 'db');
        });

        adminRemoveBtn.addEventListener('click', () => {
            this.removeFile('admin');
        });

        dbRemoveBtn.addEventListener('click', () => {
            this.removeFile('db');
        });

        // 简化的文件上传区域点击处理
        const adminUploadArea = this.shadowRoot.getElementById('admin-upload-area');
        const dbUploadArea = this.shadowRoot.getElementById('db-upload-area');

        adminUploadArea.addEventListener('click', (e) => {
            // 如果点击的是移除按钮，不触发文件选择
            if (e.target.closest('.remove-file-btn')) {
                return;
            }
            adminFileInput.click();
        });

        dbUploadArea.addEventListener('click', (e) => {
            // 如果点击的是移除按钮，不触发文件选择
            if (e.target.closest('.remove-file-btn')) {
                return;
            }
            dbFileInput.click();
        });
    }

    async handlePasswordChange() {
        if (this.isSubmitting) return;

        const currentPassword = this.shadowRoot.getElementById('current-password').value.trim();
        const newPassword = this.shadowRoot.getElementById('new-password').value.trim();
        const confirmPassword = this.shadowRoot.getElementById('confirm-password').value.trim();

        // 验证表单
        if (!this.validateForm(currentPassword, newPassword, confirmPassword)) {
            return;
        }

        this.isSubmitting = true;
        this.updateSubmitButton(true);

        try {
            const response = await this.request('/admin/auth/change-password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                    confirmPassword
                })
            });

            if (response.success) {
                this.showSuccess();
                this.resetForm();
                
                // 3秒后自动跳转到登录页面
                setTimeout(() => {
                    this.showMessage('密码已修改，即将跳转到登录页面...', 'info');
                    setTimeout(() => {
                        window.location.href = '/login.html';
                    }, 2000);
                }, 3000);
            } else {
                this.showError('current-password', response.message || '密码修改失败');
            }

        } catch (error) {
            console.error('Password change error:', error);
            this.showError('current-password', '密码修改失败，请稍后重试');
        } finally {
            this.isSubmitting = false;
            this.updateSubmitButton(false);
        }
    }

    validateForm(currentPassword, newPassword, confirmPassword) {
        let isValid = true;

        // 验证当前密码
        if (!currentPassword) {
            this.showError('current-password', '请输入当前密码');
            isValid = false;
        }

        // 验证新密码
        if (!newPassword) {
            this.showError('new-password', '请输入新密码');
            isValid = false;
        } else if (newPassword.length < 6) {
            this.showError('new-password', '新密码至少需要6个字符');
            isValid = false;
        } else if (newPassword === currentPassword) {
            this.showError('new-password', '新密码不能与当前密码相同');
            isValid = false;
        }

        // 验证确认密码
        if (!confirmPassword) {
            this.showError('confirm-password', '请确认新密码');
            isValid = false;
        } else if (confirmPassword !== newPassword) {
            this.showError('confirm-password', '两次输入的密码不一致');
            isValid = false;
        }

        return isValid;
    }

    validateField(fieldId) {
        const field = this.shadowRoot.getElementById(fieldId);
        if (!field) return true;
        
        const value = field.value.trim();

        switch (fieldId) {
            case 'current-password':
                if (!value) {
                    this.showError(fieldId, '请输入当前密码');
                    return false;
                }
                break;

            case 'new-password':
                if (!value) {
                    this.showError(fieldId, '请输入新密码');
                    return false;
                } else if (value.length < 6) {
                    this.showError(fieldId, '新密码至少需要6个字符');
                    return false;
                }
                break;

            case 'confirm-password':
                const newPassword = this.shadowRoot.getElementById('new-password').value.trim();
                if (!value) {
                    this.showError(fieldId, '请确认新密码');
                    return false;
                } else if (value !== newPassword) {
                    this.showError(fieldId, '两次输入的密码不一致');
                    return false;
                }
                break;
        }

        this.clearError(fieldId);
        return true;
    }

    showError(fieldId, message) {
        const field = this.shadowRoot.getElementById(fieldId);
        const errorElement = this.shadowRoot.getElementById(fieldId + '-error');
        
        if (field && errorElement) {
            field.classList.add('error');
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
    }

    clearError(fieldId) {
        const field = this.shadowRoot.getElementById(fieldId);
        const errorElement = this.shadowRoot.getElementById(fieldId + '-error');
        
        if (field && errorElement) {
            field.classList.remove('error');
            errorElement.classList.remove('show');
            errorElement.textContent = '';
        }
    }

    showSuccess() {
        const successMessage = this.shadowRoot.getElementById('success-message');
        if (successMessage) {
            successMessage.classList.add('show');
            
            setTimeout(() => {
                successMessage.classList.remove('show');
            }, 5000);
        }
    }

    updateSubmitButton(isLoading) {
        const submitBtn = this.shadowRoot.getElementById('submit-btn');
        const btnText = submitBtn?.querySelector('.btn-text');
        
        if (submitBtn && btnText) {
            if (isLoading) {
                submitBtn.disabled = true;
                btnText.innerHTML = '<div class="loading-spinner"></div>';
                submitBtn.title = '正在修改...';
            } else {
                submitBtn.disabled = false;
                btnText.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                        <polyline points="17,21 17,13 7,13 7,21"/>
                        <polyline points="7,3 7,8 15,8"/>
                    </svg>
                `;
                submitBtn.title = '修改密码';
            }
        }
    }

    resetForm() {
        const form = this.shadowRoot.getElementById('password-form');
        if (form) {
            form.reset();
            
            // 清除所有错误状态
            const errorElements = this.shadowRoot.querySelectorAll('.form-error');
            errorElements.forEach(error => error.classList.remove('show'));
            
            const inputElements = this.shadowRoot.querySelectorAll('.form-input');
            inputElements.forEach(input => input.classList.remove('error'));
            
            // 隐藏成功消息
            const successMessage = this.shadowRoot.getElementById('success-message');
            if (successMessage) {
                successMessage.classList.remove('show');
            }
        }
    }

    // ==================== 导入导出功能方法 ====================

    async handleExportDatabase() {
        try {
            this.updateExportButton(true);

            const response = await this.request('/admin/backup/export', {
                method: 'GET'
            });

            if (response instanceof Blob) {
                // 创建下载链接
                const url = window.URL.createObjectURL(response);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                
                // 从响应头获取文件名或使用默认名称
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                a.download = `icpads2025_backup_${timestamp}.sqlite`;
                
                document.body.appendChild(a);
                a.click();
                
                // 清理
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                this.showMessage('数据库导出成功！', 'success');
            } else {
                throw new Error('导出失败：无效的响应格式');
            }

        } catch (error) {
            console.error('Export database error:', error);
            this.showMessage(`导出失败：${error.message}`, 'error');
        } finally {
            this.updateExportButton(false);
        }
    }

    async handleImportAdminEmails() {
        const fileInput = this.shadowRoot.getElementById('admin-file');
        const file = fileInput.files[0];

        if (!file) {
            this.showError('admin-file', '请选择要导入的文件');
            return;
        }

        // 验证文件类型
        const allowedTypes = ['.txt', '.csv'];
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        
        if (!allowedTypes.includes(fileExtension)) {
            this.showError('admin-file', '不支持的文件类型，请选择 .txt 或 .csv 文件');
            return;
        }

        try {
            this.updateImportAdminButton(true);
            this.clearError('admin-file');

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/admin/import/admin-emails', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            const result = await response.json();

            if (result.success) {
                this.showImportResults('success', '导入成功', [
                    `处理了 ${result.data.total} 个邮箱地址`,
                    `更新了 ${result.data.updated} 个现有用户为管理员`,
                    `创建了 ${result.data.created} 个新管理员用户`,
                    result.data.errors.length > 0 ? `${result.data.errors.length} 个邮箱处理失败` : null
                ].filter(Boolean));

                // 清空文件输入和显示
                fileInput.value = '';
                this.hideFileInfo('admin');
            } else {
                throw new Error(result.message || '导入失败');
            }

        } catch (error) {
            console.error('Import admin emails error:', error);
            this.showImportResults('error', '导入失败', [error.message]);
        } finally {
            this.updateImportAdminButton(false);
        }
    }

    async handleImportDatabase() {
        const fileInput = this.shadowRoot.getElementById('db-file');
        const file = fileInput.files[0];

        if (!file) {
            this.showError('db-file', '请选择要导入的数据库文件');
            return;
        }

        // 验证文件类型
        const allowedTypes = ['.sqlite', '.sqlite3', '.db'];
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        
        if (!allowedTypes.includes(fileExtension)) {
            this.showError('db-file', '不支持的文件类型，请选择 .sqlite、.sqlite3 或 .db 文件');
            return;
        }

        // 二次确认
        const confirmed = await this.showConfirmDialog(
            '确认导入数据库',
            '此操作将完全覆盖当前数据库，所有现有数据将被替换。当前数据会自动备份。\n\n您确定要继续吗？',
            '确认导入',
            '取消'
        );

        if (!confirmed) {
            return;
        }

        try {
            this.updateImportDbButton(true);
            this.clearError('db-file');

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/admin/import/database', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            const result = await response.json();

            if (result.success) {
                this.showImportResults('success', '数据库导入成功', [
                    '原数据库已自动备份',
                    '新数据库已导入成功',
                    '即将清除会话并跳转到首页'
                ]);

                // 清空文件输入和显示
                fileInput.value = '';
                this.hideFileInfo('db');

                // 3秒后清除session和cookie，跳转到首页
                setTimeout(() => {
                    this.clearSessionAndRedirect();
                }, 3000);
            } else {
                throw new Error(result.message || '数据库导入失败');
            }

        } catch (error) {
            console.error('Import database error:', error);
            this.showImportResults('error', '数据库导入失败', [error.message]);
        } finally {
            this.updateImportDbButton(false);
        }
    }

    showImportResults(type, title, messages) {
        const resultsDiv = this.shadowRoot.getElementById('import-results');
        if (resultsDiv) {
            resultsDiv.className = `import-results show ${type}`;
            
            let html = `<div class="results-title">${title}</div>`;
            if (messages.length > 0) {
                html += '<ul class="results-list">';
                messages.forEach(message => {
                    html += `<li>${message}</li>`;
                });
                html += '</ul>';
            }
            
            resultsDiv.innerHTML = html;
            
            // 自动隐藏成功消息
            if (type === 'success') {
                setTimeout(() => {
                    resultsDiv.classList.remove('show');
                }, 8000);
            }
        }
    }

    updateExportButton(isLoading) {
        const exportBtn = this.shadowRoot.getElementById('export-btn');
        
        if (exportBtn) {
            if (isLoading) {
                exportBtn.disabled = true;
                exportBtn.innerHTML = '<div class="loading-spinner"></div>';
                exportBtn.title = '正在导出...';
            } else {
                exportBtn.disabled = false;
                exportBtn.innerHTML = `
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7,10 12,15 17,10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                `;
                exportBtn.title = '导出数据库';
            }
        }
    }

    updateImportAdminButton(isLoading) {
        const importBtn = this.shadowRoot.getElementById('import-admin-btn');
        
        if (importBtn) {
            if (isLoading) {
                importBtn.disabled = true;
                importBtn.innerHTML = '<div class="loading-spinner"></div>';
                importBtn.title = '正在导入...';
            } else {
                importBtn.disabled = false;
                importBtn.innerHTML = `
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <line x1="20" y1="8" x2="20" y2="14"></line>
                        <line x1="23" y1="11" x2="17" y2="11"></line>
                    </svg>
                `;
                importBtn.title = '导入管理员';
            }
        }
    }

    updateImportDbButton(isLoading) {
        const importBtn = this.shadowRoot.getElementById('import-db-btn');
        
        if (importBtn) {
            if (isLoading) {
                importBtn.disabled = true;
                importBtn.innerHTML = '<div class="loading-spinner"></div>';
                importBtn.title = '正在导入...';
            } else {
                importBtn.disabled = false;
                importBtn.style.background = 'hsla(27, 100%, 57%, 1.00)';
                importBtn.innerHTML = `
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14,2 14,8 20,8"></polyline>
                        <line x1="12" y1="18" x2="12" y2="12"></line>
                        <polyline points="9,15 12,12 15,15"></polyline>
                    </svg>
                `;
                importBtn.title = '导入数据库';
            }
        }
    }

    async showConfirmDialog(title, message, confirmText, cancelText) {
        return new Promise((resolve) => {
            // 创建简单的确认对话框
            const confirmed = confirm(`${title}\n\n${message}`);
            resolve(confirmed);
        });
    }

    clearSessionAndRedirect() {
        // 清除所有cookie
        document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });

        // 清除sessionStorage和localStorage
        sessionStorage.clear();
        localStorage.clear();

        // 跳转到首页
        window.location.href = '/';
    }

    showMessage(message, type = 'info') {
        // 发送消息事件给父组件
        this.dispatchEvent(new CustomEvent('show-message', {
            detail: { message, type },
            bubbles: true
        }));
    }

    // ==================== 文件处理方法 ====================

    handleFileSelect(input, type) {
        const file = input.files[0];
        if (file) {
            this.showFileInfo(file, type);
            this.clearError(`${type}-file`);
        } else {
            this.hideFileInfo(type);
        }
    }

    showFileInfo(file, type) {
        const uploadArea = this.shadowRoot.getElementById(`${type}-upload-area`);
        const fileInfo = this.shadowRoot.getElementById(`${type}-file-info`);
        const fileName = this.shadowRoot.getElementById(`${type}-file-name`);
        const fileSize = this.shadowRoot.getElementById(`${type}-file-size`);
        const uploadText = uploadArea?.querySelector('.upload-text');
        const uploadHint = uploadArea?.querySelector('.upload-hint');
        const uploadIcon = uploadArea?.querySelector('.upload-icon');

        if (uploadArea && fileInfo && fileName && fileSize && uploadText && uploadHint && uploadIcon) {
            // 隐藏默认的上传提示
            uploadText.style.display = 'none';
            uploadHint.style.display = 'none';
            uploadIcon.style.display = 'none';

            // 显示文件信息
            fileName.textContent = file.name;
            fileSize.textContent = this.formatFileSize(file.size);
            fileInfo.classList.add('show');

            // 更改上传区域样式
            uploadArea.classList.add('file-selected');
        }
    }

    hideFileInfo(type) {
        const uploadArea = this.shadowRoot.getElementById(`${type}-upload-area`);
        const fileInfo = this.shadowRoot.getElementById(`${type}-file-info`);
        const uploadText = uploadArea?.querySelector('.upload-text');
        const uploadHint = uploadArea?.querySelector('.upload-hint');
        const uploadIcon = uploadArea?.querySelector('.upload-icon');

        if (uploadArea && fileInfo && uploadText && uploadHint && uploadIcon) {
            // 显示默认的上传提示
            uploadText.style.display = 'block';
            uploadHint.style.display = 'block';
            uploadIcon.style.display = 'block';

            // 隐藏文件信息
            fileInfo.classList.remove('show');

            // 恢复上传区域样式
            uploadArea.classList.remove('file-selected');
        }
    }

    removeFile(type) {
        const fileInput = this.shadowRoot.getElementById(`${type}-file`);
        if (fileInput) {
            fileInput.value = '';
            this.hideFileInfo(type);
            this.clearError(`${type}-file`);
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// 注册组件
if (!customElements.get('system-manager')) {
    customElements.define('system-manager', SystemManager);
}

export default SystemManager;
