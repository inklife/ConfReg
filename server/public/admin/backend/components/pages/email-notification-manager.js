import BaseComponent from '../core/base-component.js';

/**
 * 邮件通知管理组件
 * 提供邮件群发、收件人筛选、任务管理等功能
 */
class EmailNotificationManager extends BaseComponent {
    constructor() {
        super();
        this.filterType = 'all';
        this.filterSubType = 'all';
        this.recipients = [];
        this.recipientCount = 0;
        this.tasks = [];
        this.currentView = 'compose'; // 'compose' | 'tasks'
        this.isLoading = false;
        this.pollingInterval = null;
        this.globalModals = null; // 用于存储全局模态框容器
    }

    render() {
        const style = document.createElement('style');
        style.textContent = this.getStyles();
        this.shadowRoot.appendChild(style);

        const container = document.createElement('div');
        container.className = 'email-notification-container';
        container.innerHTML = this.getTemplate();
        this.shadowRoot.appendChild(container);

        // 创建全局模态框（挂载到 document.body）
        this.createGlobalModals();

        this.loadTemplateVariables();
        this.updateRecipientCount();
    }

    createGlobalModals() {
        // 如果已存在则先移除
        const existingModals = document.getElementById('email-notification-global-modals');
        if (existingModals) {
            existingModals.remove();
        }

        // 创建全局模态框容器
        this.globalModals = document.createElement('div');
        this.globalModals.id = 'email-notification-global-modals';
        this.globalModals.innerHTML = this.getGlobalModalsTemplate();
        this.globalModals.style.cssText = 'position: relative; z-index: 99999;';
        
        // 添加样式
        const style = document.createElement('style');
        style.textContent = this.getGlobalModalStyles();
        this.globalModals.prepend(style);
        
        document.body.appendChild(this.globalModals);
        
        // 绑定全局模态框事件
        this.bindGlobalModalEvents();
    }

    getGlobalModalStyles() {
        return `
            .global-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 99999;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s;
                margin: 0;
                padding: 0;
            }

            .global-modal-overlay.active {
                opacity: 1;
                visibility: visible;
            }

            .global-modal {
                background: white;
                border-radius: 12px;
                max-width: 650px;
                width: 90%;
                max-height: 85vh;
                overflow: auto;
                box-shadow: 0 25px 80px rgba(0, 0, 0, 0.3);
                margin: 20px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            }

            .global-modal-header {
                padding: 20px 24px;
                border-bottom: 1px solid #e5e7eb;
                display: flex;
                justify-content: space-between;
                align-items: center;
                position: sticky;
                top: 0;
                background: white;
                z-index: 1;
            }

            .global-modal-title {
                font-size: 18px;
                font-weight: 600;
                color: #111827;
                margin: 0;
            }

            .global-modal-close {
                width: 32px;
                height: 32px;
                border: none;
                background: #f3f4f6;
                border-radius: 8px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #6b7280;
                transition: all 0.2s;
                font-size: 18px;
            }

            .global-modal-close:hover {
                background: #e5e7eb;
                color: #111827;
            }

            .global-modal-body {
                padding: 24px;
            }

            .variable-list {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .variable-item {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                padding: 12px;
                background: #f9fafb;
                border-radius: 8px;
            }

            .variable-name {
                font-family: monospace;
                background: #e0e7ff;
                color: #3730a3;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 13px;
                white-space: nowrap;
            }

            .variable-desc {
                flex: 1;
            }

            .variable-desc-text {
                font-size: 14px;
                color: #374151;
                margin: 0 0 4px;
            }

            .variable-example {
                font-size: 12px;
                color: #6b7280;
            }

            .preview-content {
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                overflow: hidden;
            }

            .preview-iframe {
                width: 100%;
                min-height: 450px;
                border: none;
            }

            .preview-hint {
                margin-bottom: 12px;
                color: #6b7280;
                font-size: 13px;
            }
        `;
    }

    getGlobalModalsTemplate() {
        return `
            <!-- 模板变量说明模态框 -->
            <div class="global-modal-overlay" id="global-template-modal">
                <div class="global-modal">
                    <div class="global-modal-header">
                        <h3 class="global-modal-title">模板变量说明</h3>
                        <button class="global-modal-close" data-modal="global-template-modal">✕</button>
                    </div>
                    <div class="global-modal-body">
                        <p style="margin-bottom: 16px; color: #6b7280; font-size: 14px;">
                            在邮件主题和正文中使用以下变量，发送时会自动替换为对应收件人的实际信息。
                        </p>
                        <div class="variable-list" id="global-variable-list">
                            <!-- 变量列表将动态加载 -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- 预览模态框 -->
            <div class="global-modal-overlay" id="global-preview-modal">
                <div class="global-modal" style="max-width: 750px;">
                    <div class="global-modal-header">
                        <h3 class="global-modal-title">邮件预览</h3>
                        <button class="global-modal-close" data-modal="global-preview-modal">✕</button>
                    </div>
                    <div class="global-modal-body">
                        <p class="preview-hint">以下是使用示例数据的预览效果：</p>
                        <div class="preview-content">
                            <iframe class="preview-iframe" id="global-preview-iframe"></iframe>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    bindGlobalModalEvents() {
        // 关闭按钮事件
        this.globalModals.querySelectorAll('.global-modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                const modalId = btn.dataset.modal;
                this.hideGlobalModal(modalId);
            });
        });

        // 点击遮罩层关闭
        this.globalModals.querySelectorAll('.global-modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('active');
                }
            });
        });
    }

    showGlobalModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    }

    hideGlobalModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }

    getStyles() {
        return `
            :host {
                display: block;
                height: 100%;
                overflow: auto;
                background: #f9fafb;
            }

            * {
                box-sizing: border-box;
            }

            .email-notification-container {
                padding: 16px;
                max-width: 1200px;
                margin: 0 auto;
            }

            .page-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
            }

            .page-title {
                font-size: 24px;
                font-weight: 600;
                color: #111827;
                margin: 0;
            }

            .view-tabs {
                display: flex;
                gap: 8px;
            }

            .view-tab {
                padding: 10px 20px;
                border: none;
                background: #e5e7eb;
                color: #6b7280;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s;
            }

            .view-tab:hover {
                background: #d1d5db;
            }

            .view-tab.active {
                background: #3b82f6;
                color: white;
            }

            .card {
                background: white;
                border-radius: 12px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                padding: 16px;
                margin-bottom: 16px;
            }

            .card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }

            .card-title {
                font-size: 18px;
                font-weight: 600;
                color: #111827;
                margin: 0;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .info-icon {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: #3b82f6;
                color: white;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s;
            }

            .info-icon:hover {
                background: #2563eb;
                transform: scale(1.1);
            }

            .filter-section {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 12px;
            }

            .filter-group {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .filter-label {
                font-size: 14px;
                font-weight: 500;
                color: #374151;
            }

            .filter-select {
                padding: 10px 12px;
                border: 1px solid #d1d5db;
                border-radius: 8px;
                font-size: 14px;
                color: #111827;
                background: white;
                cursor: pointer;
                transition: all 0.2s;
            }

            .filter-select:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }

            .recipient-info {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .recipient-info i {
                color: #3b82f6;
                font-size: 18px;
            }

            .recipient-count {
                font-size: 14px;
                color: #1e40af;
                font-weight: 500;
            }

            .cc-section {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .cc-label {
                font-size: 14px;
                font-weight: 500;
                color: #374151;
                white-space: nowrap;
                flex-shrink: 0;
            }

            .cc-input {
                flex: 1;
                padding: 10px 12px;
                border: 1px solid #d1d5db;
                border-radius: 8px;
                font-size: 14px;
                color: #111827;
                transition: all 0.2s;
            }

            .cc-input:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }

            .email-compose {
                margin-bottom: 20px;
            }

            .subject-input {
                width: 100%;
                padding: 12px 16px;
                border: 1px solid #d1d5db;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 500;
                color: #111827;
                margin-bottom: 16px;
                transition: all 0.2s;
            }

            .subject-input:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }

            .content-textarea {
                width: 100%;
                min-height: 300px;
                padding: 16px;
                border: 1px solid #d1d5db;
                border-radius: 8px;
                font-size: 14px;
                line-height: 1.6;
                color: #111827;
                resize: vertical;
                font-family: inherit;
                transition: all 0.2s;
            }

            .content-textarea:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }

            .action-buttons {
                display: flex;
                justify-content: flex-end;
                gap: 12px;
                margin-top: 20px;
            }

            .btn {
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                transition: all 0.2s;
            }

            .btn-primary {
                background: #3b82f6;
                color: white;
            }

            .btn-primary:hover {
                background: #2563eb;
            }

            .btn-primary:disabled {
                background: #93c5fd;
                cursor: not-allowed;
            }

            .btn-secondary {
                background: #e5e7eb;
                color: #374151;
            }

            .btn-secondary:hover {
                background: #d1d5db;
            }

            /* 模态框样式 - 全屏覆盖 */
            .modal-overlay {
                position: fixed;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 99999;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s;
                margin: 0;
                padding: 0;
            }

            .modal-overlay.active {
                opacity: 1;
                visibility: visible;
            }

            .modal {
                background: white;
                border-radius: 12px;
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                margin: 20px;
            }

            .modal-header {
                padding: 20px 24px;
                border-bottom: 1px solid #e5e7eb;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .modal-title {
                font-size: 18px;
                font-weight: 600;
                color: #111827;
                margin: 0;
            }

            .modal-close {
                width: 32px;
                height: 32px;
                border: none;
                background: #f3f4f6;
                border-radius: 8px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #6b7280;
                transition: all 0.2s;
            }

            .modal-close:hover {
                background: #e5e7eb;
                color: #111827;
            }

            .modal-body {
                padding: 24px;
            }

            .variable-list {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .variable-item {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                padding: 12px;
                background: #f9fafb;
                border-radius: 8px;
            }

            .variable-name {
                font-family: monospace;
                background: #e0e7ff;
                color: #3730a3;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 13px;
                white-space: nowrap;
            }

            .variable-desc {
                flex: 1;
            }

            .variable-desc-text {
                font-size: 14px;
                color: #374151;
                margin: 0 0 4px;
            }

            .variable-example {
                font-size: 12px;
                color: #6b7280;
            }

            /* 任务列表样式 */
            .tasks-view {
                display: none;
            }

            .tasks-view.active {
                display: block;
            }

            .compose-view {
                display: none;
            }

            .compose-view.active {
                display: block;
            }

            .task-list {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }

            .task-item {
                padding: 20px;
                background: #f9fafb;
                border-radius: 8px;
                border: 1px solid #e5e7eb;
            }

            .task-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 12px;
            }

            .task-subject {
                font-size: 16px;
                font-weight: 500;
                color: #111827;
                margin: 0;
            }

            .task-status {
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 500;
            }

            .task-status.pending {
                background: #fef3c7;
                color: #92400e;
            }

            .task-status.running {
                background: #dbeafe;
                color: #1e40af;
            }

            .task-status.completed {
                background: #d1fae5;
                color: #065f46;
            }

            .task-status.failed {
                background: #fee2e2;
                color: #991b1b;
            }

            .task-status.cancelled {
                background: #f3f4f6;
                color: #6b7280;
            }

            .task-meta {
                display: flex;
                gap: 16px;
                font-size: 13px;
                color: #6b7280;
                margin-bottom: 12px;
            }

            .task-meta-item {
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .task-progress {
                margin-bottom: 12px;
            }

            .progress-bar {
                height: 8px;
                background: #e5e7eb;
                border-radius: 4px;
                overflow: hidden;
            }

            .progress-fill {
                height: 100%;
                background: #3b82f6;
                border-radius: 4px;
                transition: width 0.3s;
            }

            .progress-text {
                font-size: 12px;
                color: #6b7280;
                margin-top: 4px;
            }

            .task-actions {
                display: flex;
                gap: 8px;
            }

            .btn-small {
                padding: 6px 12px;
                font-size: 12px;
            }

            .btn-danger {
                background: #ef4444;
                color: white;
            }

            .btn-danger:hover {
                background: #dc2626;
            }

            .btn-warning {
                background: #f59e0b;
                color: white;
            }

            .btn-warning:hover {
                background: #d97706;
            }

            .empty-state {
                text-align: center;
                padding: 60px 20px;
                color: #6b7280;
            }

            .empty-state i {
                font-size: 48px;
                color: #d1d5db;
                margin-bottom: 16px;
            }

            .empty-state h3 {
                font-size: 18px;
                font-weight: 500;
                color: #374151;
                margin: 0 0 8px;
            }

            .empty-state p {
                font-size: 14px;
                margin: 0;
            }

            .loading-spinner {
                display: inline-block;
                width: 16px;
                height: 16px;
                border: 2px solid #e5e7eb;
                border-top-color: #3b82f6;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            /* 预览模态框 */
            .preview-modal .modal {
                max-width: 700px;
            }

            .preview-content {
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                overflow: hidden;
            }

            .preview-iframe {
                width: 100%;
                min-height: 400px;
                border: none;
            }

            .refresh-btn {
                padding: 8px 16px;
            }
        `;
    }

    getTemplate() {
        return `
            <div class="page-header">
                <h1 class="page-title">
                    <i class="fas fa-envelope"></i> 邮件通知
                </h1>
                <div class="view-tabs">
                    <button class="view-tab active" data-view="compose">
                        <i class="fas fa-edit"></i> 撰写邮件
                    </button>
                    <button class="view-tab" data-view="tasks">
                        <i class="fas fa-tasks"></i> 任务管理
                    </button>
                </div>
            </div>

            <!-- 撰写邮件视图 -->
            <div class="compose-view active">
                <!-- 收件人筛选 -->
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">
                            <i class="fas fa-users"></i> 收件人筛选
                        </h2>
                        <div class="recipient-info">
                            <i class="fas fa-info-circle"></i>
                            <span class="recipient-count" id="recipient-count">正在统计收件人...</span>
                        </div>
                    </div>
                    <div class="filter-section">
                        <div class="filter-group">
                            <label class="filter-label">筛选类别</label>
                            <select class="filter-select" id="filter-type">
                                <option value="all">全部用户</option>
                                <option value="registration">注册相关</option>
                                <option value="international">国外用户（国际支付）</option>
                                <option value="invoice">发票相关</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label class="filter-label">子类别</label>
                            <select class="filter-select" id="filter-subtype">
                                <option value="all">全部</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- 抄送设置 -->
                <div class="card">
                    <div class="cc-section">
                        <label class="cc-label">抄送</label>
                        <input type="text" class="cc-input" id="cc-list" placeholder="输入抄送邮箱，多个邮箱用逗号或分号分隔">
                    </div>
                </div>

                <!-- 邮件内容 -->
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">
                            <i class="fas fa-file-alt"></i> 邮件内容
                            <span class="info-icon" id="template-info-btn" title="查看模板变量说明">i</span>
                        </h2>
                    </div>
                    <div class="email-compose">
                        <input type="text" class="subject-input" id="email-subject" placeholder="Email subject...">
                        <textarea class="content-textarea" id="email-content" placeholder="Enter email content here...&#10;&#10;You can use template variables, for example:&#10;Dear {{username}},&#10;Your registration ID is {{registration_id}}..."></textarea>
                    </div>
                    <div class="action-buttons">
                        <button class="btn btn-secondary" id="preview-btn">
                            <i class="fas fa-eye"></i> 预览
                        </button>
                        <button class="btn btn-primary" id="send-btn">
                            <i class="fas fa-paper-plane"></i> 发送邮件
                        </button>
                    </div>
                </div>
            </div>

            <!-- 任务管理视图 -->
            <div class="tasks-view">
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">
                            <i class="fas fa-tasks"></i> 发送任务列表
                        </h2>
                        <button class="btn btn-secondary refresh-btn" id="refresh-tasks-btn">
                            <i class="fas fa-sync-alt"></i> 刷新
                        </button>
                    </div>
                    <div class="task-list" id="task-list">
                        <div class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <h3>暂无发送任务</h3>
                            <p>发送邮件后可在此查看任务进度</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // 视图切换
        this.shadowRoot.querySelectorAll('.view-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchView(e.target.dataset.view));
        });

        // 筛选类别变化
        const filterType = this.shadowRoot.getElementById('filter-type');
        filterType.addEventListener('change', () => {
            this.filterType = filterType.value;
            this.updateSubTypeOptions();
            this.updateRecipientCount();
        });

        // 子类别变化
        const filterSubType = this.shadowRoot.getElementById('filter-subtype');
        filterSubType.addEventListener('change', () => {
            this.filterSubType = filterSubType.value;
            this.updateRecipientCount();
        });

        // 模板变量说明按钮
        this.shadowRoot.getElementById('template-info-btn').addEventListener('click', () => {
            this.showTemplateModal();
        });

        // 预览按钮
        this.shadowRoot.getElementById('preview-btn').addEventListener('click', () => {
            this.previewEmail();
        });

        // 发送按钮
        this.shadowRoot.getElementById('send-btn').addEventListener('click', () => {
            this.sendEmail();
        });

        // 刷新任务按钮
        this.shadowRoot.getElementById('refresh-tasks-btn').addEventListener('click', () => {
            this.loadTasks();
        });
    }

    switchView(view) {
        this.currentView = view;
        
        // 更新标签状态
        this.shadowRoot.querySelectorAll('.view-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.view === view);
        });

        // 更新视图显示
        this.shadowRoot.querySelector('.compose-view').classList.toggle('active', view === 'compose');
        this.shadowRoot.querySelector('.tasks-view').classList.toggle('active', view === 'tasks');

        if (view === 'tasks') {
            this.loadTasks();
            this.startPolling();
        } else {
            this.stopPolling();
        }
    }

    updateSubTypeOptions() {
        const subTypeSelect = this.shadowRoot.getElementById('filter-subtype');
        let options = '';

        switch (this.filterType) {
            case 'all':
                options = '<option value="all">全部</option>';
                break;
            case 'registration':
            case 'international':
                options = `
                    <option value="all">全部</option>
                    <option value="approved">已通过</option>
                    <option value="pending">待审核</option>
                    <option value="rejected">已拒绝</option>
                    <option value="refunded">已退款</option>
                `;
                break;
            case 'invoice':
                options = `
                    <option value="all">全部</option>
                    <option value="pending_processing">待处理+处理中</option>
                    <option value="not_applied">未申请</option>
                    <option value="completed">已完成</option>
                    <option value="rejected">已拒绝</option>
                `;
                break;
        }

        subTypeSelect.innerHTML = options;
        this.filterSubType = 'all';
    }

    async updateRecipientCount() {
        const countElement = this.shadowRoot.getElementById('recipient-count');
        countElement.innerHTML = '<span class="loading-spinner"></span> 正在统计收件人...';

        try {
            const response = await this.request('/admin/email-notification/recipients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filterType: this.filterType,
                    filterSubType: this.filterSubType
                })
            });

            if (response.success) {
                this.recipientCount = response.data.count;
                this.recipients = response.data.recipients;
                countElement.textContent = `符合条件的收件人：${this.recipientCount} 人`;
            } else {
                countElement.textContent = '获取收件人数量失败';
            }
        } catch (error) {
            console.error('Error updating recipient count:', error);
            countElement.textContent = '获取收件人数量失败';
        }
    }

    async loadTemplateVariables() {
        try {
            const response = await this.request('/admin/email-notification/template-variables');
            
            if (response.success) {
                // 更新全局模态框中的变量列表
                const variableList = document.getElementById('global-variable-list');
                if (variableList) {
                    let html = '';
                    
                    for (const [key, info] of Object.entries(response.data)) {
                        html += `
                            <div class="variable-item">
                                <span class="variable-name">{{${key}}}</span>
                                <div class="variable-desc">
                                    <p class="variable-desc-text">${info.description}</p>
                                    <span class="variable-example">示例：${info.example}</span>
                                </div>
                            </div>
                        `;
                    }
                    
                    variableList.innerHTML = html;
                }
            }
        } catch (error) {
            console.error('Error loading template variables:', error);
        }
    }

    showTemplateModal() {
        this.showGlobalModal('global-template-modal');
    }

    hideModal(modalId) {
        // 兼容旧代码，同时支持全局模态框
        if (modalId.startsWith('global-')) {
            this.hideGlobalModal(modalId);
        } else {
            const shadowModal = this.shadowRoot.getElementById(modalId);
            if (shadowModal) {
                shadowModal.classList.remove('active');
            }
        }
    }

    async previewEmail() {
        const subject = this.shadowRoot.getElementById('email-subject').value;
        const content = this.shadowRoot.getElementById('email-content').value;

        if (!subject && !content) {
            this.showMessage('请先输入邮件主题或内容', 'warning');
            return;
        }

        // 使用真实的第一个收件人数据进行预览
        let sampleData = null;
        if (this.recipients && this.recipients.length > 0) {
            sampleData = this.recipients[0];
        }

        try {
            const response = await this.request('/admin/email-notification/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject, content, sampleData })
            });

            if (response.success) {
                const iframe = document.getElementById('global-preview-iframe');
                if (iframe) {
                    iframe.srcdoc = response.data.html;
                }
                
                // 更新预览提示文字
                const hintText = this.recipients && this.recipients.length > 0
                    ? `以下是发送给第一位收件人 (${this.recipients[0].email}) 的预览效果：`
                    : '以下是使用示例数据的预览效果（当前没有符合条件的收件人）：';
                
                const hintElement = this.globalModals.querySelector('.preview-hint');
                if (hintElement) {
                    hintElement.textContent = hintText;
                }
                
                this.showGlobalModal('global-preview-modal');
            }
        } catch (error) {
            console.error('Error previewing email:', error);
            this.showMessage('预览失败：' + error.message, 'error');
        }
    }

    async sendEmail() {
        const subject = this.shadowRoot.getElementById('email-subject').value.trim();
        const content = this.shadowRoot.getElementById('email-content').value.trim();
        const ccInput = this.shadowRoot.getElementById('cc-list').value.trim();

        if (!subject) {
            this.showMessage('请输入邮件主题', 'warning');
            return;
        }

        if (!content) {
            this.showMessage('请输入邮件内容', 'warning');
            return;
        }

        if (this.recipientCount === 0) {
            this.showMessage('没有符合条件的收件人', 'warning');
            return;
        }

        // 确认发送
        const confirmed = confirm(`确定要向 ${this.recipientCount} 位收件人发送邮件吗？\n\n邮件将以群发单显的方式逐一发送。`);
        if (!confirmed) return;

        const sendBtn = this.shadowRoot.getElementById('send-btn');
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<span class="loading-spinner"></span> 发送中...';

        try {
            // 解析抄送列表 - 支持多种分隔符、空白字符、全角半角混合
            const ccList = ccInput ? ccInput.split(/[,;，；\s]+/).map(e => e.trim()).filter(e => e) : [];

            const response = await this.request('/admin/email-notification/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject,
                    content,
                    filterType: this.filterType,
                    filterSubType: this.filterSubType,
                    ccList
                })
            });

            if (response.success) {
                this.showMessage(`邮件任务已创建，共 ${response.data.totalRecipients} 位收件人`, 'success');
                
                // 切换到任务视图
                this.switchView('tasks');
                
                // 清空表单
                this.shadowRoot.getElementById('email-subject').value = '';
                this.shadowRoot.getElementById('email-content').value = '';
            } else {
                this.showMessage('发送失败：' + response.message, 'error');
            }
        } catch (error) {
            console.error('Error sending email:', error);
            this.showMessage('发送失败：' + error.message, 'error');
        } finally {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 发送邮件';
        }
    }

    async loadTasks() {
        const taskList = this.shadowRoot.getElementById('task-list');
        
        try {
            const response = await this.request('/admin/email-notification/tasks?limit=20');
            
            if (response.success && response.data.tasks.length > 0) {
                taskList.innerHTML = response.data.tasks.map(task => this.renderTaskItem(task)).join('');
                
                // 绑定任务操作事件
                this.bindTaskActions();
            } else {
                taskList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <h3>暂无发送任务</h3>
                        <p>发送邮件后可在此查看任务进度</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading tasks:', error);
            taskList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>加载失败</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }

    renderTaskItem(task) {
        const progress = task.totalCount > 0 
            ? Math.round((task.successCount + task.failedCount) / task.totalCount * 100) 
            : 0;
        
        const statusClass = task.status;
        const statusText = {
            pending: '等待执行',
            running: '执行中',
            completed: '已完成',
            failed: '失败',
            cancelled: '已取消'
        }[task.status] || task.status;

        const createdTime = new Date(task.createdAt).toLocaleString('zh-CN');

        return `
            <div class="task-item" data-task-id="${task.id}">
                <div class="task-header">
                    <h4 class="task-subject">${this.escapeHtml(task.subject)}</h4>
                    <span class="task-status ${statusClass}">${statusText}</span>
                </div>
                <div class="task-meta">
                    <span class="task-meta-item">
                        <i class="fas fa-users"></i> ${task.totalCount} 收件人
                    </span>
                    <span class="task-meta-item">
                        <i class="fas fa-check-circle"></i> ${task.successCount} 成功
                    </span>
                    <span class="task-meta-item">
                        <i class="fas fa-times-circle"></i> ${task.failedCount} 失败
                    </span>
                    <span class="task-meta-item">
                        <i class="fas fa-clock"></i> ${createdTime}
                    </span>
                </div>
                <div class="task-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <span class="progress-text">${progress}% 完成</span>
                </div>
                <div class="task-actions">
                    ${task.status === 'running' ? `
                        <button class="btn btn-danger btn-small cancel-task-btn" data-task-id="${task.id}">
                            <i class="fas fa-stop"></i> 取消
                        </button>
                    ` : ''}
                    <button class="btn btn-secondary btn-small delete-task-btn" data-task-id="${task.id}" data-task-status="${task.status}">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                    <button class="btn btn-secondary btn-small view-task-btn" data-task-id="${task.id}">
                        <i class="fas fa-eye"></i> 详情
                    </button>
                    ${(task.status === 'completed' || task.status === 'cancelled' || task.status === 'failed') && task.failedCount > 0 ? `
                        <button class="btn btn-warning btn-small retry-task-btn" data-task-id="${task.id}">
                            <i class="fas fa-redo"></i> 重试失败(${task.failedCount})
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    bindTaskActions() {
        // 取消任务
        this.shadowRoot.querySelectorAll('.cancel-task-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const taskId = btn.dataset.taskId;
                if (confirm('确定要取消这个任务吗？')) {
                    await this.cancelTask(taskId);
                }
            });
        });

        // 删除任务
        this.shadowRoot.querySelectorAll('.delete-task-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const taskId = btn.dataset.taskId;
                const taskStatus = btn.dataset.taskStatus;
                
                let confirmMessage = '';
                if (taskStatus === 'running') {
                    confirmMessage = '⚠️ 该任务正在执行中！\n\n删除操作将：\n1. 立即取消当前任务\n2. 将未发送的邮件标记为已取消\n3. 删除任务记录\n\n确定要删除吗？';
                } else if (taskStatus === 'pending') {
                    confirmMessage = '确定要删除这个等待中的任务吗？\n任务记录将被永久删除。';
                } else {
                    confirmMessage = '确定要删除这个任务吗？\n任务记录将被永久删除。';
                }
                
                if (confirm(confirmMessage)) {
                    await this.deleteTask(taskId);
                }
            });
        });

        // 查看详情
        this.shadowRoot.querySelectorAll('.view-task-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const taskId = btn.dataset.taskId;
                await this.viewTaskDetails(taskId);
            });
        });

        // 重试失败的邮件
        this.shadowRoot.querySelectorAll('.retry-task-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const taskId = btn.dataset.taskId;
                await this.showRetryConfirmation(taskId);
            });
        });
    }

    async cancelTask(taskId) {
        try {
            const response = await this.request(`/admin/email-notification/tasks/${taskId}/cancel`, {
                method: 'POST'
            });
            
            if (response.success) {
                this.showMessage('任务已取消', 'success');
                this.loadTasks();
            } else {
                this.showMessage('取消失败：' + response.message, 'error');
            }
        } catch (error) {
            this.showMessage('取消失败：' + error.message, 'error');
        }
    }

    async deleteTask(taskId) {
        try {
            this.showMessage('正在删除任务...', 'info');
            
            const response = await this.request(`/admin/email-notification/tasks/${taskId}`, {
                method: 'DELETE'
            });
            
            if (response.success) {
                this.showMessage('✅ 任务已删除', 'success');
                this.loadTasks();
            } else {
                this.showMessage('❌ 删除失败：' + response.message, 'error');
            }
        } catch (error) {
            this.showMessage('❌ 删除失败：' + error.message, 'error');
        }
    }

    async viewTaskDetails(taskId) {
        try {
            const response = await this.request(`/admin/email-notification/tasks/${taskId}`);
            
            if (response.success) {
                const task = response.data;
                const failedRecipients = task.recipients.filter(r => r.status === 'failed' || r.status === 'cancelled');
                
                let details = `任务ID: ${task.id}\n`;
                details += `主题: ${task.subject}\n`;
                details += `状态: ${task.status}\n`;
                details += `总数: ${task.totalCount}\n`;
                details += `成功: ${task.successCount}\n`;
                details += `失败: ${task.failedCount}\n`;
                
                if (failedRecipients.length > 0) {
                    details += `\n失败的收件人:\n`;
                    failedRecipients.forEach(r => {
                        details += `- ${r.email} (${r.userData?.username || '未知'}): ${r.error || '未知错误'}\n`;
                    });
                }
                
                alert(details);
            }
        } catch (error) {
            this.showMessage('获取详情失败：' + error.message, 'error');
        }
    }

    async showRetryConfirmation(taskId) {
        try {
            // 获取失败的收件人列表
            const response = await this.request(`/admin/email-notification/tasks/${taskId}/failed-recipients`);
            
            if (!response.success) {
                this.showMessage('获取失败列表失败：' + response.message, 'error');
                return;
            }
            
            const failedRecipients = response.data;
            
            if (failedRecipients.length === 0) {
                this.showMessage('没有失败的邮件需要重试', 'info');
                return;
            }
            
            // 构建失败列表HTML
            let listHtml = '<div style="max-height: 400px; overflow-y: auto; margin: 20px 0;">';
            listHtml += '<table style="width: 100%; border-collapse: collapse;">';
            listHtml += '<thead><tr style="background: #f5f5f5; border-bottom: 2px solid #ddd;">';
            listHtml += '<th style="padding: 10px; text-align: left;">邮箱</th>';
            listHtml += '<th style="padding: 10px; text-align: left;">姓名</th>';
            listHtml += '<th style="padding: 10px; text-align: left;">注册ID</th>';
            listHtml += '<th style="padding: 10px; text-align: left;">失败原因</th>';
            listHtml += '</tr></thead><tbody>';
            
            failedRecipients.forEach((r, index) => {
                const bgColor = index % 2 === 0 ? '#fff' : '#f9f9f9';
                listHtml += `<tr style="background: ${bgColor}; border-bottom: 1px solid #eee;">`;
                listHtml += `<td style="padding: 8px;">${this.escapeHtml(r.email)}</td>`;
                listHtml += `<td style="padding: 8px;">${this.escapeHtml(r.userData?.username || '-')}</td>`;
                listHtml += `<td style="padding: 8px;">${this.escapeHtml(r.userData?.registration_id || '-')}</td>`;
                listHtml += `<td style="padding: 8px; font-size: 12px; color: #666;">${this.escapeHtml(r.error || '未知错误')}</td>`;
                listHtml += '</tr>';
            });
            
            listHtml += '</tbody></table></div>';
            
            // 显示确认对话框
            const confirmed = confirm(
                `发现 ${failedRecipients.length} 封失败的邮件需要重试。\n\n` +
                `点击"确定"将创建新的任务重新发送这些邮件。\n` +
                `点击"取消"放弃重试。`
            );
            
            if (confirmed) {
                await this.retryTask(taskId);
            }
            
        } catch (error) {
            this.showMessage('显示重试确认失败：' + error.message, 'error');
        }
    }

    async retryTask(taskId) {
        try {
            this.showMessage('正在创建重试任务...', 'info');
            
            const response = await this.request(`/admin/email-notification/tasks/${taskId}/retry`, {
                method: 'POST'
            });
            
            if (response.success) {
                this.showMessage(response.message || '重试任务已创建并开始执行', 'success');
                // 等待1秒后刷新任务列表
                setTimeout(() => {
                    this.loadTasks();
                }, 1000);
            } else {
                this.showMessage('重试失败：' + response.message, 'error');
            }
        } catch (error) {
            this.showMessage('重试失败：' + error.message, 'error');
        }
    }

    startPolling() {
        if (this.pollingInterval) return;
        
        this.pollingInterval = setInterval(() => {
            if (this.currentView === 'tasks') {
                this.loadTasks();
            }
        }, 5000); // 每5秒刷新一次
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showMessage(message, type = 'info') {
        // 使用自定义事件通知父组件显示消息
        this.dispatchEvent(new CustomEvent('show-message', {
            bubbles: true,
            composed: true,
            detail: { message, type }
        }));
    }

    // 简单的API请求方法
    async request(url, options = {}) {
        const response = await fetch(url, {
            ...options,
            credentials: 'include'
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(error.message || 'Request failed');
        }
        
        return response.json();
    }

    cleanup() {
        this.stopPolling();
        // 移除全局模态框
        if (this.globalModals && this.globalModals.parentNode) {
            this.globalModals.parentNode.removeChild(this.globalModals);
        }
    }
}

// 注册组件
if (!customElements.get('email-notification-manager')) {
    customElements.define('email-notification-manager', EmailNotificationManager);
}

export default EmailNotificationManager;
