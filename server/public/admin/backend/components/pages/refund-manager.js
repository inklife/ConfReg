import BaseComponent from '../core/base-component.js';
import SharedStylesLoader from '../utils/shared-styles-loader.js';

/**
 * 退款管理组件 - 现代极简风格
 * 显示和管理退款请求，采用Material Design + Flat Design
 */
class RefundManager extends BaseComponent {
    constructor() {
        super();
        this.refunds = [];
        this.currentFilter = '';
        this.searchTerm = ''; // 搜索关键词
        this.currentSort = 'created_desc';
        this.isLoading = false;
        this.currentPage = 1;
        this.pageSize = 5;
        this.totalPages = 0;
        this.currentRefundId = null;
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
            
            /* 退款管理组件特定样式 */
            .refunds-content .data-table td:nth-child(4),  /* 退款金额 */
            .refunds-content .data-table td:nth-child(5),  /* 申请时间 */
            .refunds-content .data-table td:nth-child(6),  /* 状态 */
            .refunds-content .data-table td:nth-child(7) { /* 操作 */
                white-space: normal;
                overflow: visible;
                text-overflow: initial;
            }

            /* 手机端隐藏特定列 */
            @media (max-width: 768px) {
                .refunds-content .data-table th:nth-child(3),
                .refunds-content .data-table td:nth-child(3),
                .refunds-content .data-table th:nth-child(5),
                .refunds-content .data-table td:nth-child(5) {
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
                <!-- 页面标题 
                <div class="page-header">
                    <h1 class="page-title">
                        <i class="fas fa-undo-alt" style="color: #3b82f6;"></i>
                        退款管理
                    </h1>
                    <p class="page-subtitle">管理用户退款申请和处理状态</p>
                </div> -->

                <!-- 工具栏 -->
                <div class="toolbar">
                    <div class="toolbar-left">
                        <div class="search-filters">
                            <select class="filter-select" id="status-filter">
                                <option value="">全部状态</option>
                                <option value="pending">待处理</option>
                                <option value="approved">已批准</option>
                                <option value="rejected">已拒绝</option>
                                <option value="processed">已处理</option>
                            </select>
                            <input type="text" 
                                   class="search-input" 
                                   id="search-input" 
                                   placeholder="搜索申请人姓名或邮箱..." 
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
                <div class="content-area refunds-content">
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th style="width: 12%;">退款ID</th>
                                    <th style="width: 16%;">用户信息</th>
                                    <th style="width: 14%;">注册ID</th>
                                    <th style="width: 12%;">退款金额</th>
                                    <th style="width: 14%;">申请时间</th>
                                    <th style="width: 10%;">状态</th>
                                    <th style="width: 22%;">操作</th>
                                </tr>
                            </thead>
                            <tbody id="refunds-tbody">
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
                                <span style="font-size: 13px; color: #6b7280;">跳转到</span>
                                <input type="number" id="page-jump-input" min="1" placeholder="1">
                                <button class="btn btn-secondary btn-sm" id="page-jump-btn">
                                    <i class="fas fa-arrow-right"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 详情模态框将通过 JavaScript 动态添加到 document.body -->
            </div>
        `;

        // 应用样式
        await SharedStylesLoader.applyStyles(this.shadowRoot, [
            '/admin/backend/styles/shared-components.css'
        ], componentSpecificStyles);
        
        const baseStyleElement = this.createBaseStyles();
        if (baseStyleElement) {
            this.shadowRoot.appendChild(baseStyleElement);
        }
        this.shadowRoot.appendChild(container);

        // 设置事件监听器
        this.setupEventListeners();
        
        // 配置 PixelVoyager
        this.configurePixelVoyager();
        
        // 加载数据
        this.loadRefunds();
    }

    configurePixelVoyager() {
        // 确保 PixelVoyager 可用时进行配置
        const configureVoyager = () => {
            if (typeof PixelVoyager !== 'undefined' && PixelVoyager.configure) {
                try {
                    PixelVoyager.configure({
                        zoomMode: 'cursor',
                        cornerColor: 'rgba(59, 130, 246, 0.8)', // 蓝色主题色
                        moveThreshold: 3,
                        blockingDelay: 300
                    });
                    console.log('PixelVoyager configured successfully');
                } catch (error) {
                    console.warn('Failed to configure PixelVoyager:', error);
                }
            } else {
                // 如果还没加载，延迟重试
                setTimeout(configureVoyager, 200);
            }
        };
        
        // 延迟配置，确保 PixelVoyager 已加载
        setTimeout(configureVoyager, 100);
    }

    setupEventListeners() {
        const statusFilter = this.shadowRoot.getElementById('status-filter');
        const refreshBtn = this.shadowRoot.getElementById('refresh-btn');
        const prevPageBtn = this.shadowRoot.getElementById('prev-page');
        const nextPageBtn = this.shadowRoot.getElementById('next-page');
        const pageJumpBtn = this.shadowRoot.getElementById('page-jump-btn');
        const pageJumpInput = this.shadowRoot.getElementById('page-jump-input');

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

        // 状态过滤器
        statusFilter?.addEventListener('change', () => {
            this.currentFilter = statusFilter.value;
            this.currentPage = 1;
            this.loadRefunds();
        });

        // 刷新按钮
        refreshBtn?.addEventListener('click', () => {
            this.loadRefunds();
        });

        // 分页按钮
        prevPageBtn?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadRefunds();
            }
        });

        nextPageBtn?.addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.loadRefunds();
            }
        });

        // 页面跳转
        pageJumpBtn?.addEventListener('click', () => {
            this.jumpToPage();
        });

        pageJumpInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.jumpToPage();
            }
        });
    }

    performSearch() {
        const searchInput = this.shadowRoot.getElementById('search-input');
        if (searchInput) {
            this.searchTerm = searchInput.value.trim();
            this.currentPage = 1; // 重置到第一页
            this.loadRefunds();
        }
    }

    async loadRefunds() {
        try {
            this.setLoading(true);
            
            let url = `/admin/refund-requests?page=${this.currentPage}&limit=${this.pageSize}`;
            if (this.currentFilter) {
                url += `&status=${this.currentFilter}`;
            }
            if (this.searchTerm) {
                url += `&search=${encodeURIComponent(this.searchTerm)}`;
            }

            const response = await fetch(url, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                this.refunds = data.data.refundRequests || [];
                this.updatePagination(data.data.pagination || {
                    current: 1,
                    total: 1,
                    hasNext: false,
                    hasPrev: false
                });
                this.renderRefunds();
            } else {
                throw new Error(data.message || '加载退款列表失败');
            }

        } catch (error) {
            console.error('加载退款列表失败:', error);
            this.showError('加载退款列表失败: ' + error.message);
            this.renderEmptyState('加载失败');
        } finally {
            this.setLoading(false);
        }
    }

    renderRefunds() {
        const tbody = this.shadowRoot.getElementById('refunds-tbody');
        
        if (!this.refunds || this.refunds.length === 0) {
            this.renderEmptyState();
            return;
        }

        tbody.innerHTML = this.refunds.map(refund => `
            <tr>
                <td title="退款ID: ${this.escapeHtml(refund.id?.toString() || '未知')}">
                    <div style="font-weight: 500; color: #3b82f6;">
                        #${this.escapeHtml(refund.id?.toString() || '未知')}
                    </div>
                </td>
                <td title="${this.escapeHtml(refund.user?.email || refund.registration?.email || '未知邮箱')}">
                    <div style="font-weight: 500;">
                        ${this.escapeHtml(refund.user?.fullname || refund.registration?.name || '未知用户')}
                    </div>
                    <div style="font-size: 13px; color: #6b7280;">
                        ${this.escapeHtml(refund.user?.email || refund.registration?.email || '未知邮箱')}
                    </div>
                </td>
                <td title="注册ID: ${this.escapeHtml(refund.registrationId?.toString() || '未知')}">
                    <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 12px;">
                        #${this.escapeHtml(refund.registrationId?.toString() || '未知')}
                    </code>
                </td>
                <td>
                    <span class="amount">
                        ${this.formatRefundAmount(refund.refundAmount, refund.refundCurrency)}
                    </span>
                </td>
                <td>
                    <div class="refund-date">
                        ${this.formatDate(refund.requestTime)}
                    </div>
                </td>
                <td>
                    <span class="status-badge status-${refund.status || 'pending'}">
                        ${this.getStatusText(refund.status)}
                    </span>
                </td>
                <td>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button class="btn btn-primary btn-sm view-refund-btn" data-refund-id="${refund.id}">
                            <i class="fas fa-eye"></i>
                            查看
                        </button>
                        ${refund.status === 'pending' ? `
                            <button class="btn btn-success btn-sm approve-refund-btn" data-refund-id="${refund.id}">
                                <i class="fas fa-check"></i>
                                批准
                            </button>
                            <button class="btn btn-danger btn-sm reject-refund-btn" data-refund-id="${refund.id}">
                                <i class="fas fa-times"></i>
                                拒绝
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');

        // 添加事件监听器
        this.addRowEventListeners();
    }

    addRowEventListeners() {
        const tbody = this.shadowRoot.getElementById('refunds-tbody');
        
        // 查看按钮
        tbody.querySelectorAll('.view-refund-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const refundId = btn.getAttribute('data-refund-id');
                this.viewRefundDetails(refundId);
            });
        });

        // 批准按钮
        tbody.querySelectorAll('.approve-refund-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const refundId = btn.getAttribute('data-refund-id');
                this.updateRefundStatus(refundId, 'approved');
            });
        });

        // 拒绝按钮
        tbody.querySelectorAll('.reject-refund-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const refundId = btn.getAttribute('data-refund-id');
                this.updateRefundStatus(refundId, 'rejected');
            });
        });
    }

    renderEmptyState(message = '暂无退款申请') {
        const tbody = this.shadowRoot.getElementById('refunds-tbody');
        tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <i class="fas fa-undo-alt"></i>
                        <h3>${message}</h3>
                        <p>当前没有找到匹配的退款记录</p>
                    </div>
                </td>
            </tr>
        `;
    }

    setLoading(loading) {
        this.isLoading = loading;
        const tbody = this.shadowRoot.getElementById('refunds-tbody');
        
        if (loading) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="loading-state">
                            <div class="loading-spinner"></div>
                            <div>正在加载退款数据...</div>
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    updatePagination(pagination) {
        this.totalPages = pagination.total || 1;
        this.currentPage = pagination.current || 1;

        const paginationInfo = this.shadowRoot.getElementById('pagination-info');
        const prevBtn = this.shadowRoot.getElementById('prev-page');
        const nextBtn = this.shadowRoot.getElementById('next-page');
        const pageJumpInput = this.shadowRoot.getElementById('page-jump-input');

        if (paginationInfo) {
            paginationInfo.textContent = `第 ${this.currentPage} 页，共 ${this.totalPages} 页`;
        }

        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
        }

        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= this.totalPages;
        }

        if (pageJumpInput) {
            pageJumpInput.max = this.totalPages;
            pageJumpInput.placeholder = `1-${this.totalPages}`;
        }
    }

    jumpToPage() {
        const pageJumpInput = this.shadowRoot.getElementById('page-jump-input');
        const targetPage = parseInt(pageJumpInput.value);
        
        if (targetPage >= 1 && targetPage <= this.totalPages && targetPage !== this.currentPage) {
            this.currentPage = targetPage;
            this.loadRefunds();
        }
        
        pageJumpInput.value = '';
    }

    async viewRefundDetails(refundId) {
        try {
            this.currentRefundId = refundId;
            
            const response = await fetch(`/admin/refund-requests/${refundId}`, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                this.createAndShowModal(data.data);
            } else {
                throw new Error(data.message || '获取退款详情失败');
            }

        } catch (error) {
            console.error('获取退款详情失败:', error);
            this.showError('获取退款详情失败: ' + error.message);
        }
    }

    createAndShowModal(refund) {
        // 移除已存在的模态框
        const existingModal = document.getElementById('refund-modal-global');
        if (existingModal) {
            existingModal.remove();
        }

        // 创建模态框元素
        const modal = document.createElement('div');
        modal.id = 'refund-modal-global';
        modal.innerHTML = `
            <style>
                #refund-modal-global {
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

                .modal-content {
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

                .modal-header {
                    padding: 24px 24px 0 24px;
                    border-bottom: 1px solid #e5e7eb;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                }

                .modal-title {
                    font-size: 20px;
                    font-weight: 600;
                    color: #111827;
                    margin: 0;
                }

                .modal-close {
                    background: none;
                    border: none;
                    font-size: 24px;
                    color: #6b7280;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 8px;
                    transition: all 0.2s ease;
                }

                .modal-close:hover {
                    background: #f3f4f6;
                    color: #374151;
                }

                .modal-body {
                    padding: 0 24px 24px 24px;
                }

                .detail-item {
                    margin-bottom: 20px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid #f3f4f6;
                }

                .detail-item:last-child {
                    border-bottom: none;
                    margin-bottom: 0;
                }

                .detail-label {
                    font-size: 13px;
                    color: #6b7280;
                    font-weight: 500;
                    margin-bottom: 4px;
                    text-transform: uppercase;
                    letter-spacing: 0.025em;
                }

                .detail-value {
                    font-size: 15px;
                    color: #111827;
                    font-weight: 500;
                }

                .modal-actions {
                    padding: 16px 24px;
                    background: #f9fafb;
                    border-top: 1px solid #e5e7eb;
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                }

                .btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 16px;
                    border: none;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    text-decoration: none;
                    white-space: nowrap;
                }

                .btn-success {
                    background: #10b981;
                    color: white;
                }

                .btn-success:hover {
                    background: #059669;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                }

                .btn-danger {
                    background: #ef4444;
                    color: white;
                }

                .btn-danger:hover {
                    background: #dc2626;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
                }

                .btn-secondary {
                    background: #f3f4f6;
                    color: #374151;
                    border: 1px solid #d1d5db;
                }

                .btn-secondary:hover {
                    background: #e5e7eb;
                    border-color: #9ca3af;
                }

                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 14px;
                    border-radius: 12px;
                    font-size: 13px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.025em;
                }

                .status-pending {
                    background: #fef3c7;
                    color: #92400e;
                }

                .status-approved {
                    background: #d1fae5;
                    color: #065f46;
                }

                .status-rejected {
                    background: #fee2e2;
                    color: #991b1b;
                }

                .status-processed {
                    background: #dbeafe;
                    color: #1e40af;
                }
            </style>

            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">退款详情 - #${refund.id}</h3>
                    <button class="modal-close" onclick="this.closest('#refund-modal-global').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="modal-body">
                    <div class="detail-item">
                        <div class="detail-label">用户信息</div>
                        <div class="detail-value">
                            ${refund.user?.fullname || refund.registration?.name || '未知用户'}<br>
                            <span style="color: #6b7280; font-size: 14px;">${refund.user?.email || refund.registration?.email || '未知邮箱'}</span>
                        </div>
                    </div>

                    <div class="detail-item">
                        <div class="detail-label">注册ID</div>
                        <div class="detail-value">#${refund.registrationId || '未知'}</div>
                    </div>

                    <div class="detail-item">
                        <div class="detail-label">退款金额</div>
                        <div class="detail-value" style="color: #ef4444; font-family: 'Courier New', monospace;">
                            ${this.formatRefundAmount(refund.refundAmount, refund.refundCurrency)}
                        </div>
                    </div>

                    <div class="detail-item">
                        <div class="detail-label">退款原因</div>
                        <div class="detail-value">${refund.reason || '未提供'}</div>
                    </div>

                    ${refund.bankInfo ? `
                        <div class="detail-item" style="grid-column: 1 / -1; border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 8px;">
                            <div class="detail-label" style="font-size: 16px; font-weight: 600; margin-bottom: 12px;">
                                <i class="fas fa-university" style="color: #3b82f6;"></i> 银行信息
                            </div>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; padding: 12px; background: #f9fafb; border-radius: 8px;">
                                <div>
                                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">账户持有人</div>
                                    <div style="font-weight: 500;">${this.escapeHtml(refund.bankInfo.accountName || '未提供')}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">银行名称</div>
                                    <div style="font-weight: 500;">${this.escapeHtml(refund.bankInfo.bankName || '未提供')}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">账号</div>
                                    <div style="font-weight: 500; font-family: 'Courier New', monospace; user-select: all;">${this.escapeHtml(refund.bankInfo.accountNumber || '未提供')}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">SWIFT/BIC Code</div>
                                    <div style="font-weight: 500; font-family: 'Courier New', monospace; user-select: all;">${this.escapeHtml(refund.bankInfo.swiftCode || '未提供')}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">国家/地区</div>
                                    <div style="font-weight: 500;">${this.escapeHtml(refund.bankInfo.country || '未提供')}</div>
                                </div>
                            </div>
                        </div>
                    ` : ''}

                    <div class="detail-item">
                        <div class="detail-label">申请时间</div>
                        <div class="detail-value">${this.formatDateTime(refund.requestTime)}</div>
                    </div>

                    <div class="detail-item">
                        <div class="detail-label">当前状态</div>
                        <div class="detail-value">
                            <span class="status-badge status-${refund.status || 'pending'}">
                                ${this.getStatusText(refund.status)}
                            </span>
                        </div>
                    </div>

                    ${refund.processTime ? `
                        <div class="detail-item">
                            <div class="detail-label">处理时间</div>
                            <div class="detail-value">${this.formatDateTime(refund.processTime)}</div>
                        </div>
                    ` : ''}

                    ${refund.adminNotes ? `
                        <div class="detail-item">
                            <div class="detail-label">管理员备注</div>
                            <div class="detail-value">${refund.adminNotes}</div>
                        </div>
                    ` : ''}
                </div>

                ${refund.status === 'pending' ? `
                    <div class="modal-actions">
                        <button class="btn btn-secondary" onclick="this.closest('#refund-modal-global').remove()">
                            <i class="fas fa-times"></i>
                            关闭
                        </button>
                        <button class="btn btn-danger" onclick="window.refundManagerInstance.updateRefundStatus('${refund.id}', 'rejected'); this.closest('#refund-modal-global').remove()">
                            <i class="fas fa-times"></i>
                            拒绝退款
                        </button>
                        <button class="btn btn-success" onclick="window.refundManagerInstance.updateRefundStatus('${refund.id}', 'approved'); this.closest('#refund-modal-global').remove()">
                            <i class="fas fa-check"></i>
                            批准退款
                        </button>
                    </div>
                ` : `
                    <div class="modal-actions">
                        <button class="btn btn-secondary" onclick="this.closest('#refund-modal-global').remove()">
                            <i class="fas fa-times"></i>
                            关闭
                        </button>
                        ${(refund.status === 'approved' || refund.status === 'rejected' || refund.status === 'processed') ? `
                            <button class="btn btn-warning" onclick="window.refundManagerInstance.reReviewRefund('${refund.id}'); this.closest('#refund-modal-global').remove()" style="background: #f59e0b; border-color: #f59e0b; color: white;">
                                <i class="fas fa-redo"></i>
                                重新审核
                            </button>
                        ` : ''}
                    </div>
                `}
            </div>
        `;

        // 添加到 body
        document.body.appendChild(modal);

        // 设置全局引用以便在模态框中调用方法
        window.refundManagerInstance = this;

        // ESC 键关闭模态框
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        // 点击背景关闭模态框
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        });
    }

    async updateRefundStatus(refundId, status) {
        try {
            const response = await fetch(`/admin/refund-requests/${refundId}`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                this.showSuccess(`退款状态已更新为: ${this.getStatusText(status)}`);
                this.loadRefunds(); // 重新加载数据
            } else {
                throw new Error(data.message || '更新退款状态失败');
            }

        } catch (error) {
            console.error('更新退款状态失败:', error);
            this.showError('更新退款状态失败: ' + error.message);
        }
    }

    async reReviewRefund(refundId) {
        if (!confirm('确定要重新审核这个退款申请吗？重新审核后，申请状态将重置为"待处理"，您可以重新进行审批。')) {
            return;
        }

        try {
            const response = await fetch(`/admin/refund-requests/${refundId}/re-review`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                this.showSuccess('退款申请已重新设置为待处理状态');
                this.loadRefunds(); // 重新加载数据
            } else {
                throw new Error(data.message || '重新审核失败');
            }

        } catch (error) {
            console.error('重新审核失败:', error);
            this.showError('重新审核失败: ' + error.message);
        }
    }

    getStatusText(status) {
        const statusMap = {
            'pending': '待处理',
            'approved': '已批准',
            'rejected': '已拒绝',
            'processed': '已处理'
        };
        return statusMap[status] || '未知状态';
    }

    formatDate(dateString) {
        if (!dateString) return '未知时间';
        
        try {
            const date = new Date(dateString);
            return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
        } catch (error) {
            return '无效日期';
        }
    }

    formatDateTime(dateString) {
        if (!dateString) return '未知时间';
        
        try {
            const date = new Date(dateString);
            return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        } catch (error) {
            return '无效日期';
        }
    }

    formatRefundAmount(amount, currency) {
        if (!amount) return '$0.00';
        const formattedAmount = parseFloat(amount).toFixed(2);
        const curr = currency || 'USD';
        if (curr === 'RMB') {
            return `¥${formattedAmount} RMB`;
        }
        return `$${formattedAmount} USD`;
    }

    maskAccountNumber(accountNumber) {
        if (!accountNumber || accountNumber === '未提供') return accountNumber;
        const str = accountNumber.toString();
        if (str.length <= 8) {
            return '*'.repeat(str.length);
        }
        // 显示前4位和后4位，中间用*代替
        const start = str.slice(0, 4);
        const end = str.slice(-4);
        const maskLength = Math.max(0, str.length - 8);
        return `${start}${'*'.repeat(maskLength)}${end}`;
    }

    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }

    showError(message) {
        // 这里可以显示错误消息，例如使用 toast 或 alert
        console.error(message);
        alert('错误: ' + message);
    }

    showSuccess(message) {
        // 这里可以显示成功消息，例如使用 toast 或 alert
        console.log(message);
        alert('成功: ' + message);
    }
}

// 自定义元素注册
customElements.define('refund-manager', RefundManager);

export default RefundManager;
