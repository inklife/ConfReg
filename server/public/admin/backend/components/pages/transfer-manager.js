import BaseComponent from '../core/base-component.js';
import SharedStylesLoader from '../utils/shared-styles-loader.js';

/**
 * 签转请求管理组件
 * 显示和管理用户的签转申请，现代极简风格
 */
class TransferManager extends BaseComponent {
    constructor() {
        super();
        this.transfers = [];
        this.currentFilter = ''; // 默认显示全部状态
        this.searchTerm = ''; // 搜索关键词
        this.isLoading = false;
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalPages = 0;
        this.totalTransfers = 0;
        this.selectedTransfer = null;
        this.statistics = {
            pending: 0,
            approved: 0,
            rejected: 0,
            total: 0
        };
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
            
            /* 签转管理组件特定样式 - 优化视觉舒适度 */
            .transfer-item {
                transition: all 0.2s ease;
                border-bottom: 1px solid #f1f5f9;
            }
            
            .transfer-item:hover {
                background: #f8fafc;
                transform: none;
                box-shadow: none;
            }
            
            .transfer-status {
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                display: inline-block;
            }
            
            .status-pending {
                background: #fef3c7;
                color: #92400e;
                border: 2px solid #fbbf24;
                box-shadow: 0 2px 4px rgba(251, 191, 36, 0.2);
            }
            
            .status-approved {
                background: #dcfce7;
                color: #14532d;
                border: 2px solid #22c55e;
                box-shadow: 0 2px 4px rgba(34, 197, 94, 0.2);
            }
            
            .status-rejected {
                background: #fee2e2;
                color: #7f1d1d;
                border: 2px solid #ef4444;
                box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);
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
            
            .attendee-comparison {
                display: grid;
                grid-template-columns: 1fr auto 1fr;
                gap: 20px;
                align-items: center;
                margin: 16px 0;
            }
            
            .attendee-box {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 16px;
            }
            
            .attendee-box h4 {
                margin: 0 0 12px 0;
                font-size: 16px;
                font-weight: 700;
                color: #1e293b;
            }
            
            .attendee-info {
                font-size: 14px;
                line-height: 1.5;
                color: #475569;
            }
            
            .attendee-info div {
                margin-bottom: 4px;
            }
            
            .attendee-info strong {
                color: #1e293b;
                font-weight: 600;
            }
            
            .arrow {
                font-size: 24px;
                color: #3b82f6;
                font-weight: bold;
            }
            
            .statistics-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 24px;
                margin-bottom: 32px;
            }
            
            .stat-card {
                background: white;
                border-radius: 16px;
                padding: 24px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                border: 1px solid #e5e7eb;
                text-align: center;
                transition: all 0.2s ease;
            }
            
            .stat-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            }
            
            .stat-number {
                font-size: 36px;
                font-weight: 700;
                margin-bottom: 8px;
                line-height: 1;
            }
            
            .stat-label {
                font-size: 16px;
                color: #6b7280;
                font-weight: 500;
            }
            
            .stat-pending .stat-number { color: #f59e0b; }
            .stat-approved .stat-number { color: #10b981; }
            .stat-rejected .stat-number { color: #ef4444; }
            .stat-total .stat-number { color: #3b82f6; }
            
            /* 操作按钮样式 */
            .action-buttons {
                display: flex;
                gap: 8px;
                align-items: center;
            }
            
            .btn-approve {
                background: #10b981;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .btn-approve:hover {
                background: #059669;
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
            }
            
            .btn-reject {
                background: #ef4444;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .btn-reject:hover {
                background: #dc2626;
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3);
            }
            
            .btn-re-review {
                background: #f59e0b;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .btn-re-review:hover {
                background: #d97706;
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(245, 158, 11, 0.3);
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
                .attendee-comparison {
                    grid-template-columns: 1fr;
                    gap: 12px;
                }
                
                .arrow {
                    text-align: center;
                    transform: rotate(90deg);
                }
                
                .statistics-grid {
                    grid-template-columns: repeat(2, 1fr);
                }
                
                .data-table th:nth-child(4),
                .data-table td:nth-child(4),
                .data-table th:nth-child(5),
                .data-table td:nth-child(5) {
                    display: none;
                }
            }
        `;

        await SharedStylesLoader.applyStyles(this.shadowRoot, [
            '/admin/backend/styles/shared-components.css'
        ], componentSpecificStyles);

        const container = document.createElement('div');
        container.innerHTML = `
            <div class="admin-container">
                <!-- 统计卡片 -->
                <div class="statistics-grid" id="statistics-grid">
                    <div class="stat-card stat-pending">
                        <div class="stat-number" id="stat-pending">0</div>
                        <div class="stat-label">待审核</div>
                    </div>
                    <div class="stat-card stat-approved">
                        <div class="stat-number" id="stat-approved">0</div>
                        <div class="stat-label">已批准</div>
                    </div>
                    <div class="stat-card stat-rejected">
                        <div class="stat-number" id="stat-rejected">0</div>
                        <div class="stat-label">已拒绝</div>
                    </div>
                    <div class="stat-card stat-total">
                        <div class="stat-number" id="stat-total">0</div>
                        <div class="stat-label">总计</div>
                    </div>
                </div>

                <!-- 工具栏 -->
                <div class="toolbar">
                    <div class="toolbar-left">
                        <div class="search-filters">
                            <select class="filter-select" id="status-filter">
                                <option value="">全部状态</option>
                                <option value="pending">待审核</option>
                                <option value="approved">已通过</option>
                                <option value="rejected">已拒绝</option>
                            </select>
                            <input type="text" 
                                   class="search-input" 
                                   id="search-input" 
                                   placeholder="搜索姓名或邮箱..." 
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
                <div class="content-area transfers-content">
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th style="width: 20%; padding: 18px 16px; font-size: 16px; font-weight: 700; color: #1f2937; letter-spacing: 0.025em;">申请信息</th>
                                    <th style="width: 25%; padding: 18px 16px; font-size: 16px; font-weight: 700; color: #1f2937; letter-spacing: 0.025em;">参会人变更</th>
                                    <th style="width: 15%; padding: 18px 16px; font-size: 16px; font-weight: 700; color: #1f2937; letter-spacing: 0.025em;">状态</th>
                                    <th style="width: 18%; padding: 18px 16px; font-size: 16px; font-weight: 700; color: #1f2937; letter-spacing: 0.025em;">申请时间</th>
                                    <th style="width: 22%; padding: 18px 16px; font-size: 16px; font-weight: 700; color: #1f2937; letter-spacing: 0.025em;">操作</th>
                                </tr>
                            </thead>
                            <tbody id="transfers-tbody">
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

        // 状态筛选
        const statusFilter = this.shadowRoot.getElementById('status-filter');
        statusFilter?.addEventListener('change', () => {
            this.currentFilter = statusFilter.value;
            this.currentPage = 1;
            this.loadTransfers();
        });

        // 刷新按钮
        const refreshBtn = this.shadowRoot.getElementById('refresh-btn');
        refreshBtn?.addEventListener('click', () => {
            this.loadTransfers();
            this.loadStatistics();
        });

        // 分页控制
        const prevPageBtn = this.shadowRoot.getElementById('prev-page');
        prevPageBtn?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadTransfers();
            }
        });

        const nextPageBtn = this.shadowRoot.getElementById('next-page');
        nextPageBtn?.addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.loadTransfers();
            }
        });

        // 页面跳转
        const pageJumpBtn = this.shadowRoot.getElementById('page-jump-btn');
        const pageJumpInput = this.shadowRoot.getElementById('page-jump-input');
        
        pageJumpBtn?.addEventListener('click', () => {
            const page = parseInt(pageJumpInput.value);
            if (page >= 1 && page <= this.totalPages) {
                this.currentPage = page;
                this.loadTransfers();
            }
        });

        pageJumpInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                pageJumpBtn.click();
            }
        });

        // 设置全局实例引用（用于按钮点击）
        window.transferManagerInstance = this;
    }

    connectedCallback() {
        super.connectedCallback();
        this.loadStatistics();
        this.loadTransfers();
        console.log('TransferManager component connected');
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

    /**
     * 加载统计信息
     */
    async loadStatistics() {
        try {
            const response = await this.request('/admin/transfers/transfer-stats');
            
            if (response.success) {
                this.statistics = response.data;
                this.renderStatistics();
            }
        } catch (error) {
            console.error('Load transfer statistics error:', error);
        }
    }

    /**
     * 渲染统计信息
     */
    renderStatistics() {
        const stats = this.statistics;
        
        const pendingEl = this.shadowRoot.getElementById('stat-pending');
        const approvedEl = this.shadowRoot.getElementById('stat-approved');
        const rejectedEl = this.shadowRoot.getElementById('stat-rejected');
        const totalEl = this.shadowRoot.getElementById('stat-total');
        
        if (pendingEl) pendingEl.textContent = stats.pending || 0;
        if (approvedEl) approvedEl.textContent = stats.approved || 0;
        if (rejectedEl) rejectedEl.textContent = stats.rejected || 0;
        if (totalEl) totalEl.textContent = stats.total || 0;
    }

    performSearch() {
        const searchInput = this.shadowRoot.getElementById('search-input');
        if (searchInput) {
            this.searchTerm = searchInput.value.trim();
            this.currentPage = 1; // 重置到第一页
            this.loadTransfers();
        }
    }

    /**
     * 加载签转申请列表
     */
    async loadTransfers() {
        try {
            this.showLoading();

            const params = new URLSearchParams({
                page: this.currentPage.toString(),
                limit: this.pageSize.toString()
            });

            if (this.currentFilter) {
                params.set('status', this.currentFilter);
            }

            if (this.searchTerm) {
                params.set('search', this.searchTerm);
            }

            const response = await this.request(`/admin/transfers/transfer-requests?${params}`);
            
            if (response.success) {
                this.transfers = response.data || [];
                this.totalTransfers = response.pagination?.totalRecords || 0;
                this.totalPages = response.pagination?.total || 1;
                this.renderTransfers();
                this.updatePagination();
            } else {
                this.showError('加载签转申请列表失败');
            }
        } catch (error) {
            console.error('Load transfers error:', error);
            this.showError('加载签转申请列表失败');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * 渲染签转申请列表
     */
    renderTransfers() {
        const tbody = this.shadowRoot.getElementById('transfers-tbody');
        if (!tbody) return;

        if (!this.transfers || this.transfers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-8">
                        <div class="empty-state">
                            <i class="fas fa-exchange-alt" style="font-size: 48px; color: #d1d5db; margin-bottom: 16px;"></i>
                            <p style="color: #6b7280; margin: 0;">暂无签转申请数据</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.transfers.map(transfer => {
            const statusText = this.getStatusText(transfer.status);
            const statusClass = this.getStatusClass(transfer.status);
            
            return `
                <tr class="transfer-item">
                    <td style="padding: 24px 16px;">
                        <div>
                            <div style="font-weight: 700; color: #0f172a; margin-bottom: 6px; font-size: 16px;">
                                注册 #${transfer.registration.id}
                            </div>
                            <div style="font-size: 14px; color: #64748b; margin-bottom: 4px;">
                                <strong>申请人:</strong> ${this.escapeHtml(transfer.requester.fullname || transfer.requester.email)}
                            </div>
                            <div style="font-size: 14px; color: #64748b;">
                                <strong>注册用户:</strong> ${this.escapeHtml(transfer.registration.user.fullname || transfer.registration.user.email)}
                            </div>
                        </div>
                    </td>
                    <td style="padding: 24px 16px;">
                        <div style="font-size: 14px; line-height: 1.4;">
                            <div style="margin-bottom: 8px;">
                                <span style="color: #475569;">从:</span> <strong>${this.escapeHtml(transfer.originalAttendee.name)}</strong>
                            </div>
                            <div>
                                <span style="color: #475569;">到:</span> <strong style="color: #3b82f6;">${this.escapeHtml(transfer.newAttendee.name)}</strong>
                            </div>
                        </div>
                    </td>
                    <td style="padding: 24px 16px;">
                        <span class="transfer-status status-${statusClass}">
                            ${statusText}
                        </span>
                    </td>
                    <td style="padding: 24px 16px;">
                        <div style="font-size: 15px; color: #1e293b; font-weight: 500;">
                            ${this.formatDateTime(transfer.requestTime)}
                        </div>
                        ${transfer.processTime ? `
                        <div style="font-size: 13px; color: #64748b; margin-top: 4px;">
                            处理: ${this.formatDateTime(transfer.processTime)}
                        </div>
                        ` : ''}
                    </td>
                    <td style="padding: 24px 16px;">
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-secondary" onclick="transferManagerInstance.viewTransferDetail(${transfer.id})" title="查看详情" style="padding: 8px 12px; font-size: 14px;">
                                <i class="fas fa-eye"></i>
                                <span style="margin-left: 6px;">详情</span>
                            </button>
                            ${transfer.status === 'pending' ? `
                            <button class="btn-approve" onclick="transferManagerInstance.processTransfer(${transfer.id}, 'approve')" title="批准">
                                <i class="fas fa-check"></i>
                                <span>批准</span>
                            </button>
                            <button class="btn-reject" onclick="transferManagerInstance.processTransfer(${transfer.id}, 'reject')" title="拒绝">
                                <i class="fas fa-times"></i>
                                <span>拒绝</span>
                            </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
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
            paginationInfo.textContent = `第 ${this.currentPage} 页，共 ${this.totalPages} 页 (共 ${this.totalTransfers} 个申请)`;
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
     * 查看签转申请详情
     */
    async viewTransferDetail(transferId) {
        try {
            this.showLoading();

            const response = await this.request(`/admin/transfers/transfer-requests/${transferId}`);
            
            if (response.success) {
                this.selectedTransfer = response.data;
                this.renderTransferDetail();
                this.showTransferDetailModal();
            } else {
                this.showError('加载签转申请详情失败');
            }
        } catch (error) {
            console.error('Load transfer detail error:', error);
            this.showError('加载签转申请详情失败');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * 显示签转详情模态框
     */
    showTransferDetailModal() {
        const modal = document.getElementById('transfer-detail-modal-global');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    /**
     * 渲染签转申请详情
     */
    renderTransferDetail() {
        const content = document.getElementById('transfer-detail-content-global');
        if (!content || !this.selectedTransfer) return;

        const transfer = this.selectedTransfer;
        const statusText = this.getStatusText(transfer.status);
        const statusClass = this.getStatusClass(transfer.status);

        content.innerHTML = `
            <div class="transfer-detail-header">
                <div class="transfer-detail-icon">
                    <i class="fas fa-exchange-alt"></i>
                </div>
                <div class="transfer-detail-info">
                    <h3>签转申请 #${transfer.id}</h3>
                    <p>状态: <span class="status-badge status-${statusClass}">${statusText}</span></p>
                </div>
            </div>

            <div class="detail-section">
                <h4>基本信息</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>申请编号</label>
                        <span>#${transfer.id}</span>
                    </div>
                    <div class="detail-item">
                        <label>注册编号</label>
                        <span>#${transfer.registration.id}</span>
                    </div>
                    <div class="detail-item">
                        <label>申请人</label>
                        <span>${this.escapeHtml(transfer.requester.fullname || transfer.requester.email)}</span>
                    </div>
                    <div class="detail-item">
                        <label>注册用户</label>
                        <span>${this.escapeHtml(transfer.registration.user.fullname || transfer.registration.user.email)}</span>
                    </div>
                    <div class="detail-item">
                        <label>申请时间</label>
                        <span>${this.formatDateTime(transfer.requestTime)}</span>
                    </div>
                    ${transfer.processTime ? `
                    <div class="detail-item">
                        <label>处理时间</label>
                        <span>${this.formatDateTime(transfer.processTime)}</span>
                    </div>
                    ` : ''}
                    ${transfer.processor ? `
                    <div class="detail-item">
                        <label>处理人</label>
                        <span>${this.escapeHtml(transfer.processor.fullname || transfer.processor.email)}</span>
                    </div>
                    ` : ''}
                </div>
            </div>

            <div class="detail-section">
                <h4>参会人信息变更</h4>
                <div class="attendee-comparison">
                    <div class="attendee-box">
                        <h5>原参会人</h5>
                        <div class="attendee-info">
                            <div><strong>姓名:</strong> ${this.escapeHtml(transfer.originalAttendee.name)}</div>
                            <div><strong>邮箱:</strong> ${this.escapeHtml(transfer.originalAttendee.email)}</div>
                            <div><strong>电话:</strong> ${this.escapeHtml(transfer.originalAttendee.phone || '未提供')}</div>
                            <div><strong>单位:</strong> ${this.escapeHtml(transfer.originalAttendee.affiliation || '未提供')}</div>
                        </div>
                    </div>
                    <div class="transfer-arrow">
                        →
                    </div>
                    <div class="attendee-box new-attendee">
                        <h5>新参会人</h5>
                        <div class="attendee-info">
                            <div><strong>姓名:</strong> ${this.escapeHtml(transfer.newAttendee.name)}</div>
                            <div><strong>邮箱:</strong> ${this.escapeHtml(transfer.newAttendee.email)}</div>
                            <div><strong>电话:</strong> ${this.escapeHtml(transfer.newAttendee.phone || '未提供')}</div>
                            <div><strong>单位:</strong> ${this.escapeHtml(transfer.newAttendee.affiliation || '未提供')}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h4>申请原因</h4>
                <div class="detail-item">
                    <span>${this.escapeHtml(transfer.reason)}</span>
                </div>
            </div>

            ${transfer.adminNotes ? `
            <div class="detail-section">
                <h4>管理员备注</h4>
                <div class="detail-item">
                    <span>${this.escapeHtml(transfer.adminNotes)}</span>
                </div>
            </div>
            ` : ''}

            ${transfer.status === 'pending' ? `
            <div class="detail-section">
                <h4>处理操作</h4>
                <div class="detail-item" style="margin-bottom: 16px;">
                    <label>处理备注（可选）</label>
                    <textarea id="admin-notes-input" placeholder="请输入处理备注..." style="width: 100%; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; min-height: 80px; resize: vertical; font-family: inherit;"></textarea>
                </div>
                
                <div class="action-buttons">
                    <button class="action-button approve-btn" onclick="transferManagerInstance.confirmProcessTransfer('approve')">
                        <i class="fas fa-check"></i>
                        <span>批准申请</span>
                    </button>
                    <button class="action-button reject-btn" onclick="transferManagerInstance.confirmProcessTransfer('reject')">
                        <i class="fas fa-times"></i>
                        <span>拒绝申请</span>
                    </button>
                </div>
            </div>
            ` : ''}

            ${(transfer.status === 'approved' || transfer.status === 'rejected') ? `
            <div class="detail-section">
                <h4>重新审核</h4>
                <div class="detail-item" style="margin-bottom: 16px;">
                    <p style="color: #6b7280; margin: 0 0 16px 0;">如需修改审核结果，可以重新审核此申请。重新审核后，申请状态将重置为"待审核"，您可以重新进行审批。</p>
                </div>
                
                <div class="action-buttons">
                    <button class="action-button re-review-btn" onclick="transferManagerInstance.reReviewTransfer(${transfer.id})" style="background: #f59e0b; color: white;">
                        <i class="fas fa-redo"></i>
                        <span>重新审核</span>
                    </button>
                </div>
            </div>
            ` : ''}
        `;
    }

    /**
     * 处理签转申请
     */
    async processTransfer(transferId, action) {
        if (!confirm(`确定要${action === 'approve' ? '批准' : '拒绝'}这个签转申请吗？`)) {
            return;
        }

        try {
            this.showLoading();

            const response = await this.request(`/admin/transfers/transfer-requests/${transferId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action,
                    adminNotes: ''
                })
            });

            if (response.success) {
                this.showSuccess(`签转申请已${action === 'approve' ? '批准' : '拒绝'}`);
                this.loadTransfers();
                this.loadStatistics();
            } else {
                this.showError(`${action === 'approve' ? '批准' : '拒绝'}签转申请失败: ${response.message}`);
            }
        } catch (error) {
            console.error('Process transfer error:', error);
            this.showError(`${action === 'approve' ? '批准' : '拒绝'}签转申请失败`);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * 从模态框确认处理签转申请
     */
    async confirmProcessTransfer(action) {
        const adminNotesTextarea = document.getElementById('admin-notes-input');
        const adminNotes = adminNotesTextarea ? adminNotesTextarea.value : '';

        if (!confirm(`确定要${action === 'approve' ? '批准' : '拒绝'}这个签转申请吗？`)) {
            return;
        }

        try {
            this.showLoading();

            const response = await this.request(`/admin/transfers/transfer-requests/${this.selectedTransfer.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action,
                    adminNotes
                })
            });

            if (response.success) {
                this.showSuccess(`签转申请已${action === 'approve' ? '批准' : '拒绝'}`);
                this.closeTransferDetailModal();
                this.loadTransfers();
                this.loadStatistics();
            } else {
                this.showError(`${action === 'approve' ? '批准' : '拒绝'}签转申请失败: ${response.message}`);
            }
        } catch (error) {
            console.error('Process transfer error:', error);
            this.showError(`${action === 'approve' ? '批准' : '拒绝'}签转申请失败`);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * 重新审核签转申请
     */
    async reReviewTransfer(transferId) {
        if (!confirm('确定要重新审核这个签转申请吗？重新审核后，申请状态将重置为"待审核"，您可以重新进行审批。')) {
            return;
        }

        try {
            this.showLoading();

            const response = await this.request(`/admin/transfers/transfer-requests/${transferId}/re-review`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.success) {
                this.showSuccess('签转申请已重新设置为待审核状态');
                this.closeTransferDetailModal();
                this.loadTransfers();
                this.loadStatistics();
            } else {
                this.showError(`重新审核失败: ${response.message}`);
            }
        } catch (error) {
            console.error('Re-review transfer error:', error);
            this.showError('重新审核失败，请稍后重试');
        } finally {
            this.hideLoading();
        }
    }



    /**
     * 创建全局模态框
     */
    createGlobalModal() {
        // 如果已经存在，先移除
        const existingModal = document.getElementById('transfer-detail-modal-global');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'transfer-detail-modal-global';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">签转申请详情</h3>
                        <button class="modal-close" id="close-transfer-detail-global">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="transfer-detail-content" id="transfer-detail-content-global">
                            <!-- 签转详情内容将在这里动态插入 -->
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 添加模态框样式
        const modalStyle = document.createElement('style');
        modalStyle.textContent = `
            #transfer-detail-modal-global .modal-overlay {
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

            #transfer-detail-modal-global .modal-content {
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                max-width: 800px;
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

            #transfer-detail-modal-global .modal-header {
                padding: 24px 24px 0 24px;
                border-bottom: 1px solid #e5e7eb;
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 24px;
            }

            #transfer-detail-modal-global .modal-title {
                font-size: 20px;
                font-weight: 500;
                color: #111827;
                margin: 0;
            }

            #transfer-detail-modal-global .modal-close {
                background: none;
                border: none;
                font-size: 24px;
                color: #6b7280;
                cursor: pointer;
                padding: 8px;
                border-radius: 8px;
                transition: all 0.2s ease;
            }

            #transfer-detail-modal-global .modal-close:hover {
                background: #f3f4f6;
                color: #374151;
            }

            #transfer-detail-modal-global .modal-body {
                padding: 0 24px 24px 24px;
            }

            #transfer-detail-modal-global .transfer-detail-header {
                display: flex;
                align-items: center;
                gap: 20px;
                margin-bottom: 28px;
                padding-bottom: 20px;
                border-bottom: 2px solid #e2e8f0;
            }

            #transfer-detail-modal-global .transfer-detail-icon {
                width: 88px;
                height: 88px;
                border-radius: 50%;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 700;
                font-size: 36px;
                box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
            }

            #transfer-detail-modal-global .transfer-detail-info h3 {
                margin: 0 0 8px 0;
                font-size: 28px;
                font-weight: 700;
                color: #0f172a;
                line-height: 1.2;
            }

            #transfer-detail-modal-global .transfer-detail-info p {
                margin: 0;
                color: #64748b;
                font-size: 18px;
                font-weight: 500;
            }

            #transfer-detail-modal-global .detail-section {
                margin-bottom: 20px;
            }

            #transfer-detail-modal-global .detail-section:last-child {
                margin-bottom: 0;
            }

            #transfer-detail-modal-global .detail-section h4 {
                margin: 0 0 12px 0;
                font-size: 16px;
                font-weight: 700;
                color: #111827;
            }

            #transfer-detail-modal-global .detail-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 16px;
            }

            #transfer-detail-modal-global .detail-item {
                background: #f8fafc;
                padding: 12px;
                border-radius: 8px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            }

            #transfer-detail-modal-global .detail-item label {
                display: block;
                font-size: 12px;
                color: #64748b;
                font-weight: 500;
                margin-bottom: 4px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            #transfer-detail-modal-global .detail-item span {
                display: block;
                font-size: 14px;
                color: #0f172a;
                font-weight: 500;
                line-height: 1.3;
            }

            #transfer-detail-modal-global .status-badge {
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 700;
                display: inline-block;
            }

            #transfer-detail-modal-global .status-pending {
                background: #fef3c7;
                color: #78350f;
                border: 2px solid #f59e0b;
                box-shadow: 0 2px 4px rgba(245, 158, 11, 0.2);
            }

            #transfer-detail-modal-global .status-approved {
                background: #dcfce7;
                color: #14532d;
                border: 2px solid #22c55e;
                box-shadow: 0 2px 4px rgba(34, 197, 94, 0.2);
            }

            #transfer-detail-modal-global .status-rejected {
                background: #fee2e2;
                color: #7f1d1d;
                border: 2px solid #ef4444;
                box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);
            }

            #transfer-detail-modal-global .attendee-comparison {
                display: flex;
                align-items: center;
                gap: 24px;
                margin: 20px 0;
                padding: 0;
                background: transparent;
                border: none;
                border-radius: 0;
            }

            #transfer-detail-modal-global .attendee-box {
                flex: 1;
                background: white;
                padding: 16px;
                border-radius: 8px;
                border: 1px solid #e5e7eb;
                box-shadow: none;
            }

            #transfer-detail-modal-global .attendee-box.new-attendee {
                border-color: #3b82f6;
                box-shadow: none;
            }

            #transfer-detail-modal-global .attendee-box h5 {
                margin: 0 0 12px 0;
                font-size: 16px;
                font-weight: 600;
                color: #374151;
                padding-bottom: 8px;
                border-bottom: 1px solid #e5e7eb;
            }

            #transfer-detail-modal-global .attendee-box.new-attendee h5 {
                color: #3b82f6;
                border-bottom-color: #3b82f6;
            }

            #transfer-detail-modal-global .attendee-info div {
                margin-bottom: 8px;
                line-height: 1.4;
                font-size: 15px;
            }

            #transfer-detail-modal-global .attendee-info div:last-child {
                margin-bottom: 0;
            }

            #transfer-detail-modal-global .attendee-info strong {
                color: #374151;
                margin-right: 8px;
                font-weight: 600;
                display: inline-block;
                min-width: 50px;
            }

            #transfer-detail-modal-global .transfer-arrow {
                font-size: 32px;
                color: #3b82f6;
                font-weight: bold;
                text-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
                animation: pulse 2s infinite;
            }

            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.7; }
                100% { opacity: 1; }
            }

            #transfer-detail-modal-global .action-buttons {
                display: flex;
                gap: 12px;
                margin-top: 24px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
            }

            #transfer-detail-modal-global .action-button {
                flex: 1;
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }

            #transfer-detail-modal-global .approve-btn {
                background: #22c55e;
                color: white;
            }

            #transfer-detail-modal-global .approve-btn:hover {
                background: #16a34a;
                transform: translateY(-1px);
            }

            #transfer-detail-modal-global .reject-btn {
                background: #ef4444;
                color: white;
            }

            #transfer-detail-modal-global .reject-btn:hover {
                background: #dc2626;
                transform: translateY(-1px);
            }

            #transfer-detail-modal-global .re-review-btn {
                background: #f59e0b;
                color: white;
            }

            #transfer-detail-modal-global .re-review-btn:hover {
                background: #d97706;
                transform: translateY(-1px);
            }

            /* 响应式样式 */
            @media (max-width: 768px) {
                #transfer-detail-modal-global .modal-content {
                    margin: 20px;
                    width: calc(100% - 40px);
                    max-height: calc(100vh - 40px);
                }

                #transfer-detail-modal-global .detail-grid {
                    grid-template-columns: 1fr;
                }

                #transfer-detail-modal-global .action-buttons {
                    flex-direction: column;
                }

                #transfer-detail-modal-global .attendee-comparison {
                    flex-direction: column;
                    gap: 16px;
                }

                #transfer-detail-modal-global .transfer-arrow {
                    transform: rotate(90deg);
                    font-size: 24px;
                }
            }
        `;

        document.head.appendChild(modalStyle);
        document.body.appendChild(modal);

        // 设置事件监听器
        modal.querySelector('#close-transfer-detail-global').addEventListener('click', () => {
            this.closeTransferDetailModal();
        });

        modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
            if (e.target === modal.querySelector('.modal-overlay')) {
                this.closeTransferDetailModal();
            }
        });
    }

    /**
     * 关闭签转详情模态框
     */
    closeTransferDetailModal() {
        const modal = document.getElementById('transfer-detail-modal-global');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * 获取状态文本
     */
    getStatusText(status) {
        const statusMap = {
            'pending': '待审核',
            'approved': '已批准',
            'rejected': '已拒绝'
        };
        return statusMap[status] || status;
    }

    /**
     * 获取状态CSS类名
     */
    getStatusClass(status) {
        const statusClassMap = {
            'pending': 'pending',
            'approved': 'approved',
            'rejected': 'rejected'
        };
        return statusClassMap[status] || 'pending';
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
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 显示成功信息
     */
    showSuccess(message) {
        console.log('TransferManager Success:', message);
        if (window.adminApp && typeof window.adminApp.showMessage === 'function') {
            window.adminApp.showMessage(message, 'success');
        }
    }

    /**
     * 显示错误信息
     */
    showError(message) {
        console.error('TransferManager Error:', message);
        if (window.adminApp && typeof window.adminApp.showMessage === 'function') {
            window.adminApp.showMessage(message, 'error');
        }
    }

    /**
     * 清理方法
     */
    cleanup() {
        // 清理全局实例引用
        if (window.transferManagerInstance === this) {
            delete window.transferManagerInstance;
        }
    }
}

// 注册组件
customElements.define('transfer-manager', TransferManager);

export default TransferManager;
