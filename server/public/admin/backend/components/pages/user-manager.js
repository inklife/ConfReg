import BaseComponent from '../core/base-component.js';
import SharedStylesLoader from '../utils/shared-styles-loader.js';

/**
 * 用户管理组件
 * 显示和管理系统用户，现代极简风格
 */
class UserManager extends BaseComponent {
    constructor() {
        super();
        this.users = [];
        this.currentFilter = '';
        this.searchTerm = ''; // 搜索关键词
        this.isLoading = false;
        this.currentPage = 1;
        this.pageSize = 5;
        this.totalPages = 0;
        this.totalUsers = 0;
        this.currentUserId = null;
    }

    async render() {
        // 使用基础组件的样式
        const baseStyles = this.createBaseStyles();
        
        // 应用共享样式和组件特定样式
        const componentSpecificStyles = `
            :host {
                display: block;
                padding: 32px;
                background: #f8fafc;
                min-height: calc(100vh - 120px);
                position: relative;
            }
            
            /* 用户管理组件特定样式 - 优化视觉舒适度 */
            .user-item {
                transition: all 0.2s ease;
                border-bottom: 1px solid #f1f5f9;
            }
            
            .user-item:hover {
                background: #f8fafc;
                transform: none; /* 移除抖动效果 */
                box-shadow: none;
            }
            
            .user-avatar {
                width: 56px; /* 进一步增大头像 */
                height: 56px;
                border-radius: 50%;
                background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 700;
                font-size: 20px; /* 增大字体 */
                text-transform: uppercase;
                box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
                flex-shrink: 0; /* 防止头像被压缩 */
                min-width: 56px; /* 确保最小宽度 */
            }
            
            /* 表格样式优化 */
            .data-table {
                table-layout: fixed; /* 固定表格布局 */
                width: 100%;
            }
            
            .data-table td:first-child,
            .data-table th:first-child {
                min-width: 200px; /* 确保用户信息列有足够宽度 */
            }
            
            .data-table td:nth-child(2),
            .data-table th:nth-child(2) {
                min-width: 180px; /* 确保邮箱列有足够宽度 */
            }
            
            /* 操作按钮样式 */
            .btn-warning {
                background: #f59e0b;
                color: white;
                border: 1px solid #f59e0b;
            }
            
            .btn-warning:hover {
                background: #d97706;
                border-color: #d97706;
            }
            
            .btn-success {
                background: #10b981;
                color: white;
                border: 1px solid #10b981;
            }
            
            .btn-success:hover {
                background: #059669;
                border-color: #059669;
            }
            
            .btn-danger {
                background: #ef4444;
                color: white;
                border: 1px solid #ef4444;
            }
            
            .btn-danger:hover {
                background: #dc2626;
                border-color: #dc2626;
            }
            
            /* 空状态样式 */
            .empty-state {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-align: center;
                padding: 40px 20px;
            }
            
            .role-badge {
                padding: 0; /* 完全去除内边距 */
                border-radius: 16px;
                font-size: 16px; /* 进一步增大字体 */
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                display: inline-block;
            }
            
            .role-admin {
                background: #fef3c7;
                color: #78350f;
                border: 2px solid #f59e0b;
                box-shadow: 0 2px 4px rgba(245, 158, 11, 0.2);
            }
            
            .role-user {
                background: #dbeafe;
                color: #1e3a8a;
                border: 2px solid #3b82f6;
                box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
            }
            
            .status-badge {
                padding: 8px 16px; /* 保持原有内边距 */
                border-radius: 20px;
                font-size: 14px; /* 恢复原有字体大小 */
                font-weight: 700;
                display: inline-block;
            }
            
            .status-active {
                background: #dcfce7;
                color: #14532d;
                border: 2px solid #22c55e;
                box-shadow: 0 2px 4px rgba(34, 197, 94, 0.2);
            }
            
            .status-inactive {
                background: #fee2e2;
                color: #7f1d1d;
                border: 2px solid #ef4444;
                box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);
            }
            
            .status-pending {
                background: #fef3c7;
                color: #92400e;
                border: 1px solid #fbbf24;
            }
            
            /* 用户详情模态框样式 */
            .user-detail-content {
                /* 移除之前的padding和max-height，让modal-body控制 */
            }
            
            .user-detail-header {
                display: flex;
                align-items: center;
                gap: 16px;
                margin-bottom: 24px;
                padding-bottom: 16px;
                border-bottom: 1px solid #e5e7eb;
            }
            
            .user-detail-avatar {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 700;
                font-size: 24px;
                text-transform: uppercase;
            }
            
            .user-detail-info h3 {
                margin: 0 0 4px 0;
                font-size: 20px;
                font-weight: 500;
                color: #1f2937;
            }
            
            .user-detail-info p {
                margin: 0;
                color: #6b7280;
                font-size: 14px;
            }
            
            .detail-section {
                margin-bottom: 24px;
            }
            
            .detail-section:last-child {
                margin-bottom: 0;
            }
            
            .detail-section h4 {
                margin: 0 0 12px 0;
                font-size: 16px;
                font-weight: 500;
                color: #374151;
            }
            
            .detail-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 16px;
            }
            
            .detail-item {
                background: #f9fafb;
                padding: 12px;
                border-radius: 8px;
                border: 1px solid #e5e7eb;
            }
            
            .detail-item label {
                display: block;
                font-size: 12px;
                color: #6b7280;
                font-weight: 500;
                margin-bottom: 4px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .detail-item span {
                display: block;
                font-size: 14px;
                color: #1f2937;
                font-weight: 500;
            }
            
            .registrations-list {
                max-height: 300px;
                overflow-y: auto;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                background: white;
            }
            
            .registration-item {
                padding: 12px 16px;
                border-bottom: 1px solid #e5e7eb;
            }
            
            .registration-item:last-child {
                border-bottom: none;
            }
            
            .registration-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }
            
            .registration-name {
                font-weight: 500;
                color: #1f2937;
            }
            
            .registration-details {
                font-size: 12px;
                color: #6b7280;
                line-height: 1.4;
            }
            
            .registration-details div {
                margin-bottom: 2px;
            }
            
            .registration-details div:last-child {
                margin-bottom: 0;
            }
            
            /* 加载动画样式 - 正常模式 */
            .loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255, 255, 255, 0.9);
                display: none;  /* 默认隐藏 */
                align-items: center;
                justify-content: center;
                z-index: 1000;
                backdrop-filter: blur(4px);
                -webkit-backdrop-filter: blur(4px);
            }
            
            .loading-overlay.show {
                display: flex;  /* 显示时使用flex布局 */
            }
            
            .spinner {
                width: 32px;
                height: 32px;
                border: 3px solid #e5e7eb;
                border-top: 3px solid #4f46e5;
                border-radius: 50%;
                animation: spin 1s linear infinite; /* 恢复旋转动画 */
            }
            
            /* 也覆盖共享样式中的loading-spinner动画 */
            .loading-spinner {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 24px; /* 进一步增大间距，解决重叠问题 */
                padding: 30px; /* 增大内边距 */
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 25px -8px rgba(0, 0, 0, 0.1);
                animation: none !important; /* 禁用任何动画 */
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .loading-spinner span {
                font-size: 16px; /* 增大字体 */
                color: #6b7280;
                font-weight: 500;
                white-space: nowrap;
                margin-top: 12px; /* 进一步增加顶部间距 */
            }
            
            /* 响应式样式 */
            @media (max-width: 768px) {
                .data-table th:nth-child(4),
                .data-table td:nth-child(4),
                .data-table th:nth-child(5),
                .data-table td:nth-child(5) {
                    display: none;
                }
                
                .detail-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;

        await SharedStylesLoader.applyStyles(this.shadowRoot, [
            '/admin/backend/styles/shared-components.css'
        ], componentSpecificStyles);

        const container = document.createElement('div');
        container.innerHTML = `
            <div class="admin-container">
                <!-- 工具栏 -->
                <div class="toolbar">
                    <div class="toolbar-left">
                        <div class="search-filters">
                            <select class="filter-select" id="role-filter">
                                <option value="">全部角色</option>
                                <option value="admin">管理员</option>
                                <option value="user">普通用户</option>
                            </select>
                            <input type="text" 
                                   class="search-input" 
                                   id="search-input" 
                                   placeholder="搜索用户名或邮箱..." 
                                   value="">
                        </div>
                        <button class="btn btn-primary" id="search-btn">
                            <i class="fas fa-search"></i>
                            搜索
                        </button>
                    </div>
                    
                    <div class="toolbar-right">
                    </div>
                </div>

                <!-- 主内容区域 -->
                <div class="content-area users-content">
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th style="width: 25%; padding: 18px 16px; font-size: 16px; font-weight: 700; color: #1f2937; letter-spacing: 0.025em;">用户信息</th>
                                    <th style="width: 25%; padding: 18px 16px; font-size: 16px; font-weight: 700; color: #1f2937; letter-spacing: 0.025em;">邮箱</th>
                                    <th style="width: 12%; padding: 18px 16px; font-size: 16px; font-weight: 700; color: #1f2937; letter-spacing: 0.025em;">角色</th>
                                    <th style="width: 10%; padding: 18px 16px; font-size: 16px; font-weight: 700; color: #1f2937; letter-spacing: 0.025em;">状态</th>
                                    <th style="width: 15%; padding: 18px 16px; font-size: 16px; font-weight: 700; color: #1f2937; letter-spacing: 0.025em;">注册时间</th>
                                    <th style="width: 13%; padding: 18px 16px; font-size: 16px; font-weight: 700; color: #1f2937; letter-spacing: 0.025em;">操作</th>
                                </tr>
                            </thead>
                            <tbody id="users-tbody">
                                <!-- 数据将在这里动态插入 -->
                            </tbody>
                        </table>
                    </div>

                    <!-- 分页 -->
                    <div class="pagination-container">
                        <div class="pagination-info" id="pagination-info">
                            第 1 页，共 1 页
                        </div>
                        
                        <div class="pagination-controls">
                            <div class="pagination-nav">
                                <button class="btn btn-secondary btn-sm" id="prev-page" disabled>
                                    <i class="fas fa-chevron-left"></i>
                                    上一页
                                </button>
                                <button class="btn btn-secondary btn-sm" id="next-page" disabled>
                                    下一页
                                    <i class="fas fa-chevron-right"></i>
                                </button>
                            </div>
                            
                            <div class="page-jump">
                                <span style="font-size: 15px; color: #475569; font-weight: 500;">跳转到</span>
                                <input type="number" id="page-jump-input" min="1" placeholder="1">
                                <button class="btn btn-secondary btn-sm" id="page-jump-btn">
                                    <i class="fas fa-arrow-right"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 加载动画 -->
            <div class="loading-overlay" id="loading-overlay" style="display: none;">
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <span>加载中...</span>
                </div>
            </div>
        `;

        this.shadowRoot.appendChild(baseStyles);
        this.shadowRoot.appendChild(container);

        // 创建全局模态框（在document.body中）
        this.createGlobalModal();

        this.setupEventListeners();
    }

    /**
     * 创建全局模态框
     */
    createGlobalModal() {
        // 如果已经存在，先移除
        const existingModal = document.getElementById('user-detail-modal-global');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'user-detail-modal-global';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">用户详情</h3>
                        <button class="modal-close" id="close-user-detail-global">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="user-detail-content" id="user-detail-content-global">
                            <!-- 用户详情内容将在这里动态插入 -->
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 添加模态框样式
        const modalStyle = document.createElement('style');
        modalStyle.textContent = `
            #user-detail-modal-global .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.6);
                z-index: 99;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                animation: fadeIn 0.3s ease-out;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            #user-detail-modal-global .modal-content {
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                max-width: 700px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                animation: modalSlideIn 0.3s ease-out;
            }

            @keyframes modalSlideIn {
                from {
                    opacity: 0;
                    transform: scale(0.95) translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }

            #user-detail-modal-global .modal-header {
                padding: 24px 24px 0 24px;
                border-bottom: 1px solid #e5e7eb;
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 24px;
            }

            #user-detail-modal-global .modal-title {
                font-size: 20px;
                font-weight: 500;
                color: #111827;
                margin: 0;
            }

            #user-detail-modal-global .modal-close {
                background: none;
                border: none;
                font-size: 24px;
                color: #6b7280;
                cursor: pointer;
                padding: 8px;
                border-radius: 8px;
                transition: all 0.2s ease;
            }

            #user-detail-modal-global .modal-close:hover {
                background: #f3f4f6;
                color: #374151;
            }

            #user-detail-modal-global .modal-body {
                padding: 0 24px 24px 24px;
            }

            #user-detail-modal-global .user-detail-header {
                display: flex;
                align-items: center;
                gap: 20px;
                margin-bottom: 28px;
                padding-bottom: 20px;
                border-bottom: 2px solid #e2e8f0;
            }

            #user-detail-modal-global .user-detail-avatar {
                width: 88px; /* 进一步增大头像 */
                height: 88px;
                border-radius: 50%;
                background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 700;
                font-size: 36px; /* 增大字体 */
                text-transform: uppercase;
                box-shadow: 0 6px 20px rgba(79, 70, 229, 0.3);
            }

            #user-detail-modal-global .user-detail-info h3 {
                margin: 0 0 8px 0;
                font-size: 28px; /* 增大标题字体 */
                font-weight: 700;
                color: #0f172a;
                line-height: 1.2;
            }

            #user-detail-modal-global .user-detail-info p {
                margin: 0;
                color: #64748b;
                font-size: 18px; /* 增大副标题字体 */
                font-weight: 500;
            }

            #user-detail-modal-global .detail-section {
                margin-bottom: 24px;
            }

            #user-detail-modal-global .detail-section:last-child {
                margin-bottom: 0;
            }

            #user-detail-modal-global .detail-section h4 {
                margin: 0 0 16px 0;
                font-size: 18px; /* 增大字体 */
                font-weight: 700;
                color: #111827;
            }

            #user-detail-modal-global .detail-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); /* 增大最小宽度 */
                gap: 20px; /* 增大间距 */
            }

            #user-detail-modal-global .detail-item {
                background: #f8fafc;
                padding: 16px; /* 增大内边距 */
                border-radius: 12px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            }

            #user-detail-modal-global .detail-item label {
                display: block;
                font-size: 13px; /* 增大字体 */
                color: #64748b;
                font-weight: 500;
                margin-bottom: 6px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            #user-detail-modal-global .detail-item span {
                display: block;
                font-size: 15px; /* 增大字体 */
                color: #0f172a;
                font-weight: 500;
                line-height: 1.4;
            }

            #user-detail-modal-global .role-badge {
                padding: 0;
                border-radius: 16px;
                font-size: 16px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                display: inline-block;
            }

            #user-detail-modal-global .role-admin {
                background: #fef3c7;
                color: #78350f;
                border: 2px solid #f59e0b;
                box-shadow: 0 2px 4px rgba(245, 158, 11, 0.2);
            }

            #user-detail-modal-global .role-user {
                background: #dbeafe;
                color: #1e3a8a;
                border: 2px solid #3b82f6;
                box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
            }

            #user-detail-modal-global .status-badge {
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 700;
                display: inline-block;
            }

            #user-detail-modal-global .status-active {
                background: #dcfce7;
                color: #14532d;
                border: 2px solid #22c55e;
                box-shadow: 0 2px 4px rgba(34, 197, 94, 0.2);
            }

            #user-detail-modal-global .status-inactive {
                background: #fee2e2;
                color: #7f1d1d;
                border: 2px solid #ef4444;
                box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);
            }

            #user-detail-modal-global .status-pending {
                background: #fef3c7;
                color: #92400e;
                border: 1px solid #fbbf24;
            }

            #user-detail-modal-global .registrations-list {
                max-height: 300px;
                overflow-y: auto;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                background: white;
            }

            #user-detail-modal-global .registration-item {
                padding: 12px 16px;
                border-bottom: 1px solid #e5e7eb;
            }

            #user-detail-modal-global .registration-item:last-child {
                border-bottom: none;
            }

            #user-detail-modal-global .registration-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }

            #user-detail-modal-global .registration-name {
                font-weight: 500;
                color: #1f2937;
            }

            #user-detail-modal-global .registration-details {
                font-size: 12px;
                color: #6b7280;
                line-height: 1.4;
            }

            #user-detail-modal-global .registration-details div {
                margin-bottom: 2px;
            }

            #user-detail-modal-global .registration-details div:last-child {
                margin-bottom: 0;
            }

            /* 响应式样式 */
            @media (max-width: 768px) {
                #user-detail-modal-global .modal-content {
                    margin: 20px;
                    width: calc(100% - 40px);
                    max-height: calc(100vh - 40px);
                }

                #user-detail-modal-global .detail-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;

        document.head.appendChild(modalStyle);
        document.body.appendChild(modal);

        // 设置事件监听器
        modal.querySelector('#close-user-detail-global').addEventListener('click', () => {
            this.closeUserDetailModal();
        });

        modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
            if (e.target === modal.querySelector('.modal-overlay')) {
                this.closeUserDetailModal();
            }
        });
    }

    setupEventListeners() {
        // 搜索功能
        const searchInput = this.shadowRoot.getElementById('search-input');
        const searchBtn = this.shadowRoot.getElementById('search-btn');
        
        if (searchInput) {
            // 输入框回车事件
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.performSearch();
                }
            });
        }
        
        // 搜索按钮
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.performSearch();
            });
        }

        // 角色筛选
        const roleFilter = this.shadowRoot.getElementById('role-filter');
        roleFilter?.addEventListener('change', () => {
            this.currentFilter = roleFilter.value;
            this.currentPage = 1;
            this.loadUsers();
        });

        // 刷新按钮
        const refreshBtn = this.shadowRoot.getElementById('refresh-btn');
        refreshBtn?.addEventListener('click', () => {
            this.loadUsers();
        });

        // 分页控制
        const prevPageBtn = this.shadowRoot.getElementById('prev-page');
        prevPageBtn?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadUsers();
            }
        });

        const nextPageBtn = this.shadowRoot.getElementById('next-page');
        nextPageBtn?.addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.loadUsers();
            }
        });

        // 页面跳转
        const pageJumpBtn = this.shadowRoot.getElementById('page-jump-btn');
        const pageJumpInput = this.shadowRoot.getElementById('page-jump-input');
        
        pageJumpBtn?.addEventListener('click', () => {
            const page = parseInt(pageJumpInput.value);
            if (page >= 1 && page <= this.totalPages) {
                this.currentPage = page;
                this.loadUsers();
            }
        });

        pageJumpInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                pageJumpBtn.click();
            }
        });

        // 注意：模态框事件监听器已在createGlobalModal中设置
    }

    connectedCallback() {
        super.connectedCallback();
        this.loadUsers();
        console.log('UserManager component connected');
    }

    /**
     * 显示加载状态
     */
    showLoading() {
        this.isLoading = true;
        const loadingOverlay = this.shadowRoot.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
        }
    }

    /**
     * 隐藏加载状态
     */
    hideLoading() {
        this.isLoading = false;
        const loadingOverlay = this.shadowRoot.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    performSearch() {
        const searchInput = this.shadowRoot.getElementById('search-input');
        if (searchInput) {
            this.searchTerm = searchInput.value.trim();
            this.currentPage = 1; // 重置到第一页
            this.loadUsers();
        }
    }

    /**
     * 加载用户列表
     */
    async loadUsers() {
        try {
            this.showLoading();

            const params = new URLSearchParams({
                page: this.currentPage.toString(),
                limit: this.pageSize.toString()
            });

            if (this.currentFilter) {
                params.set('role', this.currentFilter);
            }

            if (this.searchTerm) {
                params.set('search', this.searchTerm);
            }

            const response = await this.request(`/admin/users?${params}`);
            
            if (response.success) {
                this.users = response.data || [];
                this.totalUsers = response.pagination?.totalRecords || 0;
                this.totalPages = response.pagination?.total || 1;
                this.renderUsers();
                this.updatePagination();
            } else {
                this.showError('加载用户列表失败');
            }
        } catch (error) {
            console.error('Load users error:', error);
            this.showError('加载用户列表失败');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * 渲染用户列表
     */
    renderUsers() {
        const tbody = this.shadowRoot.getElementById('users-tbody');
        if (!tbody) return;

        if (!this.users || this.users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-8">
                        <div class="empty-state">
                            <i class="fas fa-users" style="font-size: 48px; color: #d1d5db; margin-bottom: 16px;"></i>
                            <p style="color: #6b7280; margin: 0;">暂无用户数据</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.users.map(user => {
            const roleText = this.getUserRole(user);
            const statusText = user.is_active ? '活跃' : '禁用';
            const registrationCount = user.submission_count || 0;
            
            return `
                <tr class="user-item">
                    <td style="padding: 24px 16px;">
                        <div style="display: flex; align-items: center; gap: 18px; min-width: 0;">
                            <div class="user-avatar" style="flex-shrink: 0;">
                                ${this.getUserInitials(user.fullname || user.username)}
                            </div>
                            <div style="min-width: 0; flex: 1;">
                                <div style="font-weight: 700; color: #0f172a; margin-bottom: 6px; font-size: 16px; line-height: 1.3; word-break: break-word;">
                                    ${this.escapeHtml(user.fullname || user.username)}
                                </div>
                                <div style="font-size: 14px; color: #64748b; font-weight: 500; word-break: break-word;">
                                    @${this.escapeHtml(user.username)}
                                </div>
                            </div>
                        </div>
                    </td>
                    <td style="padding: 24px 16px; min-width: 0;">
                        <span style="color: #1e293b; font-size: 15px; font-weight: 500; word-break: break-all; display: block;">
                            ${this.escapeHtml(user.email)}
                        </span>
                    </td>
                    <td style="padding: 24px 16px;">
                        <span class="role-badge role-${roleText.toLowerCase()}">
                            ${roleText}
                        </span>
                    </td>
                    <td style="padding: 24px 16px;">
                        <span class="status-badge status-${user.is_active ? 'active' : 'inactive'}">
                            ${statusText}
                        </span>
                    </td>
                    <td style="padding: 24px 16px;">
                        <div style="font-size: 15px; color: #1e293b; font-weight: 500;">
                            ${this.formatDate(user.date_joined)}
                        </div>
                    </td>
                    <td style="padding: 24px 16px;">
                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                            <button class="btn btn-sm btn-secondary" onclick="userManagerInstance.viewUserDetail(${user.id})" title="查看详情" style="padding: 8px 12px; font-size: 13px; font-weight: 500;">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${user.is_active ? `
                                <button class="btn btn-sm btn-warning" onclick="userManagerInstance.freezeUser(${user.id})" title="冻结用户" style="padding: 8px 12px; font-size: 13px; font-weight: 500;">
                                    <i class="fas fa-snowflake"></i>
                                </button>
                            ` : `
                                <button class="btn btn-sm btn-success" onclick="userManagerInstance.unfreezeUser(${user.id})" title="解冻用户" style="padding: 8px 12px; font-size: 13px; font-weight: 500;">
                                    <i class="fas fa-fire"></i>
                                </button>
                            `}
                            ${this.isAdmin(user) ? `
                                <button class="btn btn-sm btn-danger" onclick="userManagerInstance.removeAdmin(${user.id})" title="取消管理员" style="padding: 8px 12px; font-size: 13px; font-weight: 500;">
                                    <i class="fas fa-user-minus"></i>
                                </button>
                            ` : `
                                <button class="btn btn-sm btn-primary" onclick="userManagerInstance.setAdmin(${user.id})" title="设为管理员" style="padding: 8px 12px; font-size: 13px; font-weight: 500;">
                                    <i class="fas fa-user-plus"></i>
                                </button>
                            `}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // 设置全局实例引用（用于按钮点击）
        window.userManagerInstance = this;
    }

    /**
     * 更新分页信息
     */
    updatePagination() {
        const paginationInfo = this.shadowRoot.getElementById('pagination-info');
        const prevPageBtn = this.shadowRoot.getElementById('prev-page');
        const nextPageBtn = this.shadowRoot.getElementById('next-page');
        const pageJumpInput = this.shadowRoot.getElementById('page-jump-input');

        if (paginationInfo) {
            paginationInfo.textContent = `第 ${this.currentPage} 页，共 ${this.totalPages} 页 (共 ${this.totalUsers} 个用户)`;
        }

        if (prevPageBtn) {
            prevPageBtn.disabled = this.currentPage <= 1;
        }

        if (nextPageBtn) {
            nextPageBtn.disabled = this.currentPage >= this.totalPages;
        }

        if (pageJumpInput) {
            pageJumpInput.max = this.totalPages.toString();
            pageJumpInput.placeholder = this.currentPage.toString();
        }
    }

    /**
     * 查看用户详情
     */
    async viewUserDetail(userId) {
        try {
            this.currentUserId = userId;
            this.showLoading();

            const response = await this.request(`/admin/users/${userId}`);
            
            if (response.success) {
                this.renderUserDetail(response.data);
                this.showUserDetailModal();
            } else {
                this.showError('加载用户详情失败');
            }
        } catch (error) {
            console.error('Load user detail error:', error);
            this.showError('加载用户详情失败');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * 渲染用户详情
     */
    renderUserDetail(data) {
        const { user, submissions } = data;
        const content = document.getElementById('user-detail-content-global');
        
        if (!content) return;

        const roleText = this.getUserRole(user);
        const statusText = user.is_active ? '活跃' : '禁用';

        content.innerHTML = `
            <div class="user-detail-header">
                <div class="user-detail-avatar">
                    ${this.getUserInitials(user.fullname || user.username)}
                </div>
                <div class="user-detail-info">
                    <h3>${this.escapeHtml(user.fullname || user.username)}</h3>
                    <p>@${this.escapeHtml(user.username)} • ${roleText} • ${statusText}</p>
                </div>
            </div>

            <div class="detail-section">
                <h4>基本信息</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>用户名</label>
                        <span>${this.escapeHtml(user.username)}</span>
                    </div>
                    <div class="detail-item">
                        <label>全名</label>
                        <span>${this.escapeHtml(user.fullname || '未设置')}</span>
                    </div>
                    <div class="detail-item">
                        <label>邮箱</label>
                        <span>${this.escapeHtml(user.email)}</span>
                    </div>
                    <div class="detail-item">
                        <label>角色</label>
                        <span class="role-badge role-${roleText.toLowerCase()}">${roleText}</span>
                    </div>
                    <div class="detail-item">
                        <label>状态</label>
                        <span class="status-badge status-${user.is_active ? 'active' : 'inactive'}">${statusText}</span>
                    </div>
                    <div class="detail-item">
                        <label>注册时间</label>
                        <span>${this.formatDateTime(user.date_joined)}</span>
                    </div>
                    <div class="detail-item">
                        <label>最后登录</label>
                        <span>${user.last_login ? this.formatDateTime(user.last_login) : '从未登录'}</span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h4>注册记录 (${submissions ? submissions.length : 0} 条)</h4>
                ${this.renderUserRegistrations(submissions)}
            </div>
        `;
    }

    /**
     * 渲染用户注册记录
     */
    renderUserRegistrations(submissions) {
        if (!submissions || submissions.length === 0) {
            return `
                <div style="text-align: center; padding: 40px; color: #6b7280;">
                    <i class="fas fa-file-alt" style="font-size: 32px; margin-bottom: 8px; opacity: 0.5;"></i>
                    <p style="margin: 0;">该用户暂无注册记录</p>
                </div>
            `;
        }

        return `
            <div class="registrations-list">
                ${submissions.map(submission => `
                    <div class="registration-item">
                        <div class="registration-header">
                            <span class="registration-name">${this.escapeHtml(submission.name)}</span>
                            <span class="status-badge status-${this.getStatusClass(submission.status)}">
                                ${this.getStatusText(submission.status)}
                            </span>
                        </div>
                        <div class="registration-details">
                            <div><strong>邮箱:</strong> ${this.escapeHtml(submission.email)}</div>
                            <div><strong>产品:</strong> ${this.escapeHtml(submission.product_code)} - $${submission.product_price}</div>
                            <div><strong>提交时间:</strong> ${this.formatDateTime(submission.submission_time)}</div>
                            ${submission.review_time ? `<div><strong>审核时间:</strong> ${this.formatDateTime(submission.review_time)}</div>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * 显示用户详情模态框
     */
    showUserDetailModal() {
        const modal = document.getElementById('user-detail-modal-global');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * 关闭用户详情模态框
     */
    closeUserDetailModal() {
        const modal = document.getElementById('user-detail-modal-global');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
        this.currentUserId = null;
    }

    /**
     * 判断用户是否为管理员
     */
    isAdmin(user) {
        return user.is_superuser || user.role === 'admin';
    }

    /**
     * 冻结用户
     */
    async freezeUser(userId) {
        if (!confirm('确定要冻结这个用户吗？冻结后用户将无法登录系统。')) {
            return;
        }

        try {
            this.showLoading();

            const response = await this.request(`/admin/users/${userId}/freeze`, {
                method: 'POST'
            });

            if (response.success) {
                this.showSuccess('用户已冻结');
                this.loadUsers(); // 重新加载用户列表
            } else {
                this.showError(response.message || '冻结用户失败');
            }
        } catch (error) {
            console.error('Freeze user error:', error);
            this.showError('冻结用户失败');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * 解冻用户
     */
    async unfreezeUser(userId) {
        if (!confirm('确定要解冻这个用户吗？解冻后用户将恢复正常使用权限。')) {
            return;
        }

        try {
            this.showLoading();

            const response = await this.request(`/admin/users/${userId}/unfreeze`, {
                method: 'POST'
            });

            if (response.success) {
                this.showSuccess('用户已解冻');
                this.loadUsers(); // 重新加载用户列表
            } else {
                this.showError(response.message || '解冻用户失败');
            }
        } catch (error) {
            console.error('Unfreeze user error:', error);
            this.showError('解冻用户失败');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * 设为管理员
     */
    async setAdmin(userId) {
        if (!confirm('确定要将此用户设为管理员吗？管理员将拥有系统管理权限。')) {
            return;
        }

        try {
            this.showLoading();

            const response = await this.request(`/admin/users/${userId}/set-admin`, {
                method: 'POST'
            });

            if (response.success) {
                this.showSuccess('用户已设为管理员');
                this.loadUsers(); // 重新加载用户列表
            } else {
                this.showError(response.message || '设置管理员失败');
            }
        } catch (error) {
            console.error('Set admin error:', error);
            this.showError('设置管理员失败');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * 取消管理员
     */
    async removeAdmin(userId) {
        if (!confirm('确定要取消此用户的管理员权限吗？用户将失去系统管理权限。')) {
            return;
        }

        try {
            this.showLoading();

            const response = await this.request(`/admin/users/${userId}/remove-admin`, {
                method: 'POST'
            });

            if (response.success) {
                this.showSuccess('管理员权限已取消');
                this.loadUsers(); // 重新加载用户列表
            } else {
                this.showError(response.message || '取消管理员权限失败');
            }
        } catch (error) {
            console.error('Remove admin error:', error);
            this.showError('取消管理员权限失败');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * 获取用户角色文本
     */
    getUserRole(user) {
        if (user.is_superuser || user.role === 'admin' || user.username === 'admin') {
            return '管理员';
        }
        return '普通用户';
    }

    /**
     * 获取用户姓名首字母
     */
    getUserInitials(name) {
        if (!name) return '?';
        const words = name.trim().split(/\s+/);
        if (words.length === 1) {
            return words[0].charAt(0);
        }
        return words[0].charAt(0) + words[words.length - 1].charAt(0);
    }

    /**
     * 获取状态文本
     */
    getStatusText(status) {
        const statusMap = {
            'pending': '待审核',
            'approved': '已通过',
            'rejected': '已拒绝',
            'paid': '已支付'
        };
        return statusMap[status] || status;
    }

    /**
     * 获取状态CSS类名
     */
    getStatusClass(status) {
        const statusClassMap = {
            'pending': 'pending',
            'approved': 'active',
            'rejected': 'inactive',
            'paid': 'active'
        };
        return statusClassMap[status] || 'pending';
    }

    /**
     * 格式化日期
     */
    formatDate(dateString) {
        if (!dateString) return '未知';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } catch (e) {
            return '未知';
        }
    }

    /**
     * 格式化日期时间
     */
    formatDateTime(dateString) {
        if (!dateString) return '未知';
        try {
            const date = new Date(dateString);
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return '未知';
        }
    }

    /**
     * 转义HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 显示成功信息
     */
    showSuccess(message) {
        console.log('UserManager Success:', message);
        // 这里可以显示用户友好的成功提示
        if (window.adminApp && typeof window.adminApp.showMessage === 'function') {
            window.adminApp.showMessage(message, 'success');
        }
    }

    /**
     * 显示错误信息
     */
    showError(message) {
        console.error('UserManager Error:', message);
        // 这里可以显示用户友好的错误提示
        if (window.adminApp && typeof window.adminApp.showMessage === 'function') {
            window.adminApp.showMessage(message, 'error');
        }
    }

    /**
     * 清理方法
     * 清理全局模态框和实例引用
     */
    cleanup() {
        // 清理全局模态框
        const modal = document.getElementById('user-detail-modal-global');
        if (modal) {
            modal.remove();
        }
        
        // 清理全局实例引用
        if (window.userManagerInstance === this) {
            delete window.userManagerInstance;
        }
    }
}

// 注册组件
customElements.define('user-manager', UserManager);

export default UserManager;
