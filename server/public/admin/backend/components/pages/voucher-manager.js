import BaseComponent from '../core/base-component.js';
import SharedStylesLoader from '../utils/shared-styles-loader.js';

/**
 * 餐券管理组件 - 现代极简风格
 * 显示和管理餐券购买请求，采用Material Design + Flat Design
 */
class VoucherManager extends BaseComponent {
    constructor() {
        super();
        this.vouchers = [];
        this.currentFilter = '';
        this.searchTerm = '';
        this.currentSort = 'created_desc';
        this.isLoading = false;
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalPages = 0;
        this.currentVoucherId = null;
        this.statistics = {
            pending: { count: 0, total_quantity: 0, total_amount: 0 },
            approved: { count: 0, total_quantity: 0, total_amount: 0 },
            rejected: { count: 0, total_quantity: 0, total_amount: 0 }
        };
    }

    async render() {
        const baseStyles = this.createBaseStyles();
        
        const componentSpecificStyles = `
            :host {
                display: block;
                padding: 32px;
                background: #f8fafc;
                min-height: calc(100vh - 120px);
                position: relative;
            }

            /* 加载覆盖层 */
            .loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255, 255, 255, 0.9);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            }

            .loading-spinner {
                width: 48px;
                height: 48px;
                border: 4px solid var(--gray-200);
                border-top-color: var(--blue-500);
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            .loading-text {
                margin-top: 16px;
                color: var(--gray-600);
                font-size: 14px;
            }
            
            /* 餐券管理组件特定样式 */
            
            /* 表格样式 - 与发票管理页面统一 */
            .voucher-table {
                width: 100%;
                border-collapse: collapse;
            }

            .voucher-table th {
                background: var(--gray-50);
                padding: 16px;
                text-align: left;
                font-weight: 600;
                color: var(--gray-700);
                font-size: 15px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                border-bottom: 1px solid var(--gray-200);
            }

            .voucher-table td {
                padding: 20px 16px;
                border-bottom: 1px solid var(--gray-200);
                font-size: 16px;
                color: var(--gray-700);
                vertical-align: top;
                line-height: 1.6;
            }

            .voucher-table tbody tr {
                transition: all 0.2s ease;
                position: relative;
            }

            .voucher-table tbody tr:hover {
                background: var(--gray-50);
                z-index: 0;
            }

            /* ID 列样式 */
            .voucher-table td:nth-child(1) {
                font-weight: 600;
                color: var(--blue-600);
            }

            /* 购买人姓名加粗 */
            .voucher-table td:nth-child(2) {
                font-weight: 500;
                color: var(--gray-900);
            }

            /* 邮箱样式 */
            .voucher-table td:nth-child(3) {
                color: var(--gray-600);
                font-size: 14px;
                font-family: 'Courier New', monospace;
            }

            /* 数量样式 */
            .voucher-table td:nth-child(4) {
                font-weight: 600;
                color: var(--purple-600);
            }

            /* 金额样式优化 */
            .voucher-table td:nth-child(5) {
                font-weight: 600;
                color: var(--green-600);
                font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
            }

            .voucher-table td:nth-child(5) small {
                display: block;
                color: var(--gray-500);
                font-size: 12px;
                margin-top: 2px;
                font-weight: 400;
            }

            /* 支付方式徽章 */
            .payment-badge {
                display: inline-flex;
                align-items: center;
                padding: 8px 12px;
                border-radius: var(--radius);
                font-size: 14px;
                font-weight: 500;
                gap: 6px;
            }

            .payment-badge.domestic {
                background: #dbeafe;
                color: #1e40af;
            }

            .payment-badge.international {
                background: #fef3c7;
                color: #92400e;
            }

            /* 状态徽章 - 与发票管理页面统一 */
            .status-badge {
                display: inline-flex;
                align-items: center;
                padding: 8px 12px;
                border-radius: var(--radius);
                font-size: 14px;
                font-weight: 500;
                gap: 6px;
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

            /* 操作按钮容器 */
            .actions-cell {
                display: flex;
                gap: 6px;
                align-items: center;
                flex-wrap: nowrap;
                min-width: 180px;
            }

            .actions-cell .btn {
                flex-shrink: 0;
                transition: all 0.2s ease;
                position: relative;
                z-index: 1;
                padding: 6px 12px;
                font-size: 14px;
                border-radius: 8px;
                white-space: nowrap;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border: 1px solid;
                font-weight: 500;
            }

            /* 主要按钮样式 - 蓝色查看 */
            .btn-action-primary {
                background: #eff6ff;
                border-color: #3b82f6;
                color: #2563eb;
            }

            .btn-action-primary:hover {
                background: #3b82f6 !important;
                border-color: #2563eb !important;
                color: white !important;
                box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
            }

            /* 成功按钮样式 - 绿色批准 */
            .btn-action-success {
                background: #f0fdf4;
                border-color: #22c55e;
                color: #16a34a;
            }

            .btn-action-success:hover {
                background: #22c55e !important;
                border-color: #16a34a !important;
                color: white !important;
                box-shadow: 0 2px 8px rgba(34, 197, 94, 0.25);
            }

            /* 危险按钮样式 - 红色拒绝 */
            .btn-action-danger {
                background: #fef2f2;
                border-color: #f87171;
                color: #dc2626;
            }

            .btn-action-danger:hover {
                background: #f87171 !important;
                border-color: #dc2626 !important;
                color: white !important;
                box-shadow: 0 2px 8px rgba(248, 113, 113, 0.25);
            }

            /* 加载和空状态 */
            .loading-state {
                padding: 60px 20px;
                text-align: center;
                color: var(--gray-500);
                font-size: 16px;
            }

            .loading-spinner {
                display: inline-block;
                width: 32px;
                height: 32px;
                border: 3px solid var(--gray-200);
                border-radius: 50%;
                border-top-color: var(--blue-500);
                animation: spin 1s linear infinite;
                margin-bottom: 16px;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            .empty-icon {
                font-size: 48px;
                color: var(--gray-300);
                margin-bottom: 16px;
            }

            /* 分页样式 - 与发票管理页面统一 */
            .pagination {
                padding: 20px 24px;
                background: #f9fafb;
                border-top: 1px solid #e5e7eb;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 16px;
            }

            .pagination-info {
                color: #6b7280;
                font-size: 16px;
                flex: 1;
            }

            .pagination-controls {
                display: flex;
                gap: 8px;
                align-items: center;
            }

            /* 手机端隐藏特定列 */
            @media (max-width: 768px) {
                .voucher-table th:nth-child(3),
                .voucher-table td:nth-child(3),
                .voucher-table th:nth-child(6),
                .voucher-table td:nth-child(6) {
                    display: none;
                }

                .voucher-table th,
                .voucher-table td {
                    padding: 12px 8px;
                    font-size: 14px;
                }

                .actions-cell {
                    flex-direction: column;
                    gap: 4px;
                }

                .actions-cell .btn {
                    width: 100%;
                    font-size: 12px;
                    padding: 4px 8px;
                }

                .pagination {
                    flex-direction: column;
                    gap: 12px;
                }

                .pagination-info {
                    width: 100%;
                    text-align: center;
                }
            }

            .screenshot-preview {
                max-width: 100%;
                height: auto;
                border-radius: 8px;
                margin-top: 12px;
                border: 1px solid var(--gray-200);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }

            .voucher-code {
                font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
                font-weight: 600;
                color: var(--blue-600);
                background: var(--blue-50);
                padding: 6px 12px;
                border-radius: 6px;
                border: 1px solid var(--blue-200);
                letter-spacing: 1px;
            }

            /* 内容区域 */
            .content-area {
                background: white;
                border-radius: 12px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }

            .table-container {
                overflow-x: auto;
            }

            /* 空状态样式 - 与发票管理页面统一 */
            .empty-state {
                padding: 60px 20px;
                text-align: center;
                color: var(--gray-500);
                font-size: 16px;
            }

            /* 统计卡片样式 */
            .statistics-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 24px;
            }

            .stat-card {
                background: white;
                padding: 24px;
                border-radius: 12px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                transition: all 0.3s ease;
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                border-top: 3px solid transparent;
            }

            .stat-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
            }

            .stat-card.stat-pending {
                border-top-color: #f59e0b;
            }

            .stat-card.stat-approved {
                border-top-color: #10b981;
            }

            .stat-card.stat-rejected {
                border-top-color: #ef4444;
            }

            .stat-card.stat-total {
                border-top-color: #3b82f6;
            }

            .stat-number {
                font-size: 36px;
                font-weight: 700;
                line-height: 1;
                margin-bottom: 8px;
            }

            .stat-card.stat-pending .stat-number {
                color: #f59e0b;
            }

            .stat-card.stat-approved .stat-number {
                color: #10b981;
            }

            .stat-card.stat-rejected .stat-number {
                color: #ef4444;
            }

            .stat-card.stat-total .stat-number {
                color: #3b82f6;
            }

            .stat-label {
                font-size: 14px;
                font-weight: 500;
                color: var(--gray-600);
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
            }

            .stat-detail {
                font-size: 12px;
                color: var(--gray-500);
                margin-top: 4px;
            }

            /* 状态徽章增强 */
            .badge {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 6px 14px;
                border-radius: 14px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                min-width: 80px;
            }

            .badge-warning {
                background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                color: #92400e;
                border: 1px solid #fcd34d;
                box-shadow: 0 2px 4px rgba(245, 158, 11, 0.1);
            }

            .badge-success {
                background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
                color: #065f46;
                border: 1px solid #6ee7b7;
                box-shadow: 0 2px 4px rgba(16, 185, 129, 0.1);
            }

            .badge-danger {
                background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
                color: #991b1b;
                border: 1px solid #fca5a5;
                box-shadow: 0 2px 4px rgba(239, 68, 68, 0.1);
            }

            /* 手机端适配 */
            @media (max-width: 768px) {
                .vouchers-content .data-table th:nth-child(3),
                .vouchers-content .data-table td:nth-child(3) {
                    display: none;
                }
            }
        `;

        // 添加全局模态框样式到 document head
        this.addGlobalModalStyles();

        await SharedStylesLoader.applyStyles(this.shadowRoot, [
            '/admin/backend/styles/shared-components.css'
        ], componentSpecificStyles);

        const container = document.createElement('div');
        container.innerHTML = `
            <div class="admin-container">
                <!-- 加载覆盖层 -->
                <div id="loading-overlay" class="loading-overlay" style="display: none;">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">加载中...</div>
                </div>

                <!-- 工具栏 -->
                <div class="toolbar">
                    <div class="toolbar-left">
                        <div class="search-filters">
                            <select class="filter-select" id="status-filter">
                                <option value="">全部状态</option>
                                <option value="pending">待审核</option>
                                <option value="approved">已批准</option>
                                <option value="rejected">已拒绝</option>
                            </select>
                            <input type="text" 
                                   class="search-input" 
                                   id="search-input" 
                                   placeholder="搜索姓名、邮箱或餐券代码..." 
                                   value="">
                        </div>
                        <button class="btn btn-primary" id="search-btn">
                            <i class="fas fa-search"></i>
                            搜索
                        </button>
                    </div>
                    
                    <div class="toolbar-right">
                        <button class="btn" id="refresh-btn">
                            <i class="fas fa-sync-alt"></i>
                            刷新
                        </button>
                    </div>
                </div>

                <!-- 统计卡片 -->
                <div class="statistics-grid" id="statistics-grid">
                    <div class="stat-card stat-pending">
                        <div class="stat-number" id="pending-count">0</div>
                        <div class="stat-label">待审核</div>
                        <div class="stat-detail" id="pending-detail">0 张餐券</div>
                    </div>
                    <div class="stat-card stat-approved">
                        <div class="stat-number" id="approved-count">0</div>
                        <div class="stat-label">已批准</div>
                        <div class="stat-detail" id="approved-detail">0 张餐券</div>
                    </div>
                    <div class="stat-card stat-rejected">
                        <div class="stat-number" id="rejected-count">0</div>
                        <div class="stat-label">已拒绝</div>
                        <div class="stat-detail" id="rejected-detail">0 张餐券</div>
                    </div>
                    <div class="stat-card stat-total">
                        <div class="stat-number" id="total-vouchers">0</div>
                        <div class="stat-label">总餐券数</div>
                        <div class="stat-detail" id="total-amount">$0</div>
                    </div>
                </div>

                <!-- 主内容区域 -->
                <div class="content-area vouchers-content">
                    <div class="table-container">
                        <table class="voucher-table" id="vouchers-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>购买人</th>
                                    <th>邮箱</th>
                                    <th>数量</th>
                                    <th>金额</th>
                                    <th>支付方式</th>
                                    <th>状态</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody id="vouchers-tbody">
                                <!-- 数据将在这里动态插入 -->
                            </tbody>
                        </table>
                    </div>

                    <!-- 分页 -->
                    <div class="pagination" id="pagination-section">
                        <div class="pagination-info" id="pagination-info">
                            显示第 1-10 项，共 0 项
                        </div>
                        <div class="pagination-controls" id="pagination-controls">
                            <!-- 分页控件将通过JavaScript生成 -->
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.shadowRoot.appendChild(container);
        this.setupEventListeners();
        this.setupPaginationListeners();
        await this.loadVouchers();
    }

    setupEventListeners() {
        const statusFilter = this.shadowRoot.getElementById('status-filter');
        const searchInput = this.shadowRoot.getElementById('search-input');
        const searchBtn = this.shadowRoot.getElementById('search-btn');
        const refreshBtn = this.shadowRoot.getElementById('refresh-btn');

        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.currentFilter = statusFilter.value;
                this.currentPage = 1;
                this.loadVouchers();
            });
        }

        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.searchTerm = searchInput.value.trim();
                this.currentPage = 1;
                this.loadVouchers();
            });
        }

        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchTerm = searchInput.value.trim();
                    this.currentPage = 1;
                    this.loadVouchers();
                }
            });
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadVouchers();
            });
        }
    }

    async loadVouchers() {
        try {
            this.showLoading();

            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.pageSize
            });

            if (this.currentFilter) {
                params.append('status', this.currentFilter);
            }

            if (this.searchTerm) {
                params.append('search', this.searchTerm);
            }

            console.log('🔍 Loading vouchers with params:', params.toString());

            const response = await fetch(`/admin/vouchers?${params.toString()}`, {
                credentials: 'include'
            });

            console.log('📥 Response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Response error:', errorData);
                throw new Error('Failed to load vouchers');
            }

            const data = await response.json();
            console.log('📊 Vouchers data received:', {
                success: data.success,
                vouchersCount: data.vouchers?.length || 0,
                statistics: data.statistics,
                pagination: data.pagination
            });

            if (data.success) {
                this.vouchers = data.vouchers || [];
                this.statistics = data.statistics || {};
                this.totalPages = data.pagination?.totalPages || 1;
                console.log('✅ Data assigned, rendering...');
                this.updateStatistics();
                this.renderVouchersTable();
                this.renderPagination();
            }
        } catch (error) {
            console.error('❌ Load vouchers error:', error);
            this.showError('加载餐券失败: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    updateStatistics() {
        // 更新待审核统计
        const pendingCount = this.shadowRoot.getElementById('pending-count');
        const pendingDetail = this.shadowRoot.getElementById('pending-detail');
        if (pendingCount && this.statistics.pending) {
            pendingCount.textContent = this.statistics.pending.count || 0;
            pendingDetail.textContent = `${this.statistics.pending.total_quantity || 0} 张餐券`;
        }

        // 更新已批准统计
        const approvedCount = this.shadowRoot.getElementById('approved-count');
        const approvedDetail = this.shadowRoot.getElementById('approved-detail');
        if (approvedCount && this.statistics.approved) {
            approvedCount.textContent = this.statistics.approved.count || 0;
            approvedDetail.textContent = `${this.statistics.approved.total_quantity || 0} 张餐券`;
        }

        // 更新已拒绝统计
        const rejectedCount = this.shadowRoot.getElementById('rejected-count');
        const rejectedDetail = this.shadowRoot.getElementById('rejected-detail');
        if (rejectedCount && this.statistics.rejected) {
            rejectedCount.textContent = this.statistics.rejected.count || 0;
            rejectedDetail.textContent = `${this.statistics.rejected.total_quantity || 0} 张餐券`;
        }

        // 更新总计
        const totalVouchers = this.shadowRoot.getElementById('total-vouchers');
        const totalAmount = this.shadowRoot.getElementById('total-amount');
        if (totalVouchers) {
            const total = Object.values(this.statistics).reduce((sum, stat) => {
                return sum + (stat.total_quantity || 0);
            }, 0);
            totalVouchers.textContent = total;
        }
        if (totalAmount) {
            const amount = Object.values(this.statistics).reduce((sum, stat) => {
                return sum + (stat.total_amount || 0);
            }, 0);
            totalAmount.textContent = `$${amount.toFixed(2)}`;
        }
    }

    renderVouchersTable() {
        console.log('🎨 Rendering vouchers table, count:', this.vouchers.length);
        const tbody = this.shadowRoot.getElementById('vouchers-tbody');
        if (!tbody) {
            console.error('❌ tbody not found!');
            return;
        }

        if (this.vouchers.length === 0) {
            console.log('ℹ️ No vouchers to display');
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <div class="empty-icon">
                            <i class="fas fa-ticket-alt"></i>
                        </div>
                        <p>暂无餐券购买请求</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.vouchers.map(voucher => this.renderVoucherRow(voucher)).join('');
        this.attachTableEventListeners();
    }

    renderVoucherRow(voucher) {
        const statusClass = this.getStatusClass(voucher.status);
        const statusText = this.getStatusText(voucher.status);
        const paymentMethodClass = voucher.payment_method === 'domestic' ? 'domestic' : 'international';
        const paymentMethodText = voucher.payment_method === 'domestic' ? '国内支付' : '国际转账';
        const paymentMethodIcon = voucher.payment_method === 'domestic' ? '🇨🇳' : '🌍';

        return `
            <tr data-voucher-id="${voucher.id}">
                <td>#${voucher.id}</td>
                <td>${this.escapeHtml(voucher.attendee_name)}</td>
                <td>${this.escapeHtml(voucher.email)}</td>
                <td>${voucher.quantity} 张</td>
                <td>$${voucher.total_amount_usd}<br><small>¥${voucher.total_amount_rmb}</small></td>
                <td>
                    <span class="payment-badge ${paymentMethodClass}">
                        <i class="fas fa-circle" style="font-size: 8px;"></i>
                        ${paymentMethodText}
                    </span>
                </td>
                <td>
                    <span class="status-badge status-${statusClass}">
                        <i class="fas fa-circle" style="font-size: 8px;"></i>
                        ${statusText}
                    </span>
                </td>
                <td>
                    <div class="actions-cell">
                        <button class="btn btn-view btn-action-primary view-voucher" data-id="${voucher.id}" title="查看详情">
                            <i class="fas fa-eye"></i>
                            查看
                        </button>
                        ${voucher.status === 'pending' ? `
                            <button class="btn btn-approve btn-action-success approve-voucher" data-id="${voucher.id}" title="批准餐券">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="btn btn-reject btn-action-danger reject-voucher" data-id="${voucher.id}" title="拒绝餐券">
                                <i class="fas fa-times"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }

    attachTableEventListeners() {
        // 查看详情
        this.shadowRoot.querySelectorAll('.view-voucher').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                this.viewVoucherDetails(id);
            });
        });

        // 批准
        this.shadowRoot.querySelectorAll('.approve-voucher').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                this.approveVoucher(id);
            });
        });

        // 拒绝
        this.shadowRoot.querySelectorAll('.reject-voucher').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                this.rejectVoucher(id);
            });
        });
    }

    async viewVoucherDetails(id) {
        try {
            const response = await fetch(`/admin/vouchers/${id}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to load voucher details');
            }

            const data = await response.json();

            if (data.success) {
                this.showVoucherDetailsModal(data.voucher);
            }
        } catch (error) {
            console.error('View voucher error:', error);
            this.showError('加载餐券详情失败');
        }
    }

    showVoucherDetailsModal(voucher) {
        const statusText = this.getStatusText(voucher.status);
        const paymentMethodText = voucher.payment_method === 'domestic' ? '国内支付' : '国际转账';

        const modal = document.createElement('div');
        modal.id = 'voucher-modal-global';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">
                            餐券详情
                            <span class="id-badge">ID: ${voucher.id}</span>
                        </h2>
                        <button class="modal-close close-modal-btn">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <!-- 基本信息 -->
                        <div class="detail-group">
                            <h4 class="detail-group-title">
                                <i class="fas fa-user"></i>
                                基本信息
                            </h4>
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <div class="detail-label">购买人姓名</div>
                                    <div class="detail-value">${this.escapeHtml(voucher.attendee_name)}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">邮箱</div>
                                    <div class="detail-value">${this.escapeHtml(voucher.email)}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">数量</div>
                                    <div class="detail-value">${voucher.quantity} 张</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">总金额</div>
                                    <div class="detail-value" style="color: #059669; font-weight: 600;">
                                        $${voucher.total_amount_usd} (¥${voucher.total_amount_rmb})
                                    </div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">支付方式</div>
                                    <div class="detail-value">${paymentMethodText}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">状态</div>
                                    <div class="detail-value">
                                        <span class="status-badge status-${voucher.status || 'pending'}">
                                            ${statusText}
                                        </span>
                                    </div>
                                </div>
                                ${voucher.voucher_code ? `
                                <div class="detail-item">
                                    <div class="detail-label">餐券代码</div>
                                    <div class="detail-value">
                                        <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">
                                            ${voucher.voucher_code}
                                        </code>
                                    </div>
                                </div>
                                ` : ''}
                                <div class="detail-item">
                                    <div class="detail-label">购买时间</div>
                                    <div class="detail-value">${this.formatDate(voucher.created_at)}</div>
                                </div>
                            </div>
                        </div>

                        ${voucher.payment_screenshot ? `
                        <!-- 支付截图 -->
                        <div class="detail-group">
                            <h4 class="detail-group-title">
                                <i class="fas fa-image"></i>
                                支付截图
                            </h4>
                            <div class="image-container">
                                <div class="image-item">
                                    <a href="${voucher.payment_screenshot}" class="pixel-voyager-link" target="_blank">
                                        <img src="${voucher.payment_screenshot}" class="image-preview" alt="支付截图">
                                    </a>
                                </div>
                            </div>
                        </div>
                        ` : ''}

                        ${voucher.admin_notes ? `
                        <!-- 管理员备注 -->
                        <div class="detail-group">
                            <h4 class="detail-group-title">
                                <i class="fas fa-sticky-note"></i>
                                管理员备注
                            </h4>
                            <div class="detail-item">
                                <div class="detail-value">${this.escapeHtml(voucher.admin_notes)}</div>
                            </div>
                        </div>
                        ` : ''}

                        ${voucher.reviewer ? `
                        <!-- 审核信息 -->
                        <div class="detail-group">
                            <h4 class="detail-group-title">
                                <i class="fas fa-user-check"></i>
                                审核信息
                            </h4>
                            <div class="detail-item">
                                <div class="detail-label">审核人</div>
                                <div class="detail-value">${this.escapeHtml(voucher.reviewer.name)}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">审核时间</div>
                                <div class="detail-value">${this.formatDate(voucher.reviewed_at)}</div>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-secondary close-modal-btn">
                            关闭
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 点击背景关闭模态框
        modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                modal.remove();
            }
        });

        // 关闭按钮事件
        const closeButtons = modal.querySelectorAll('.close-modal-btn');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                modal.remove();
            });
        });

        // ESC键关闭模态框
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        // 初始化图片查看器
        this.initializePixelVoyager(modal);
    }

    async approveVoucher(id) {
        if (!confirm('确认批准此餐券购买请求吗？')) {
            return;
        }

        const notes = prompt('请输入备注（可选）：');

        try {
            const response = await fetch(`/admin/vouchers/${id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    status: 'approved',
                    admin_notes: notes || ''
                })
            });

            if (!response.ok) {
                throw new Error('Failed to approve voucher');
            }

            const data = await response.json();

            if (data.success) {
                this.showSuccess('餐券已批准');
                await this.loadVouchers();
            }
        } catch (error) {
            console.error('Approve voucher error:', error);
            this.showError('批准餐券失败');
        }
    }

    async rejectVoucher(id) {
        const notes = prompt('请输入拒绝原因：');

        if (notes === null) {
            return; // 用户取消
        }

        if (!notes.trim()) {
            alert('请输入拒绝原因');
            return;
        }

        try {
            const response = await fetch(`/admin/vouchers/${id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    status: 'rejected',
                    admin_notes: notes
                })
            });

            if (!response.ok) {
                throw new Error('Failed to reject voucher');
            }

            const data = await response.json();

            if (data.success) {
                this.showSuccess('餐券已拒绝');
                await this.loadVouchers();
            }
        } catch (error) {
            console.error('Reject voucher error:', error);
            this.showError('拒绝餐券失败');
        }
    }

    renderPagination() {
        const paginationInfo = this.shadowRoot.getElementById('pagination-info');
        const paginationControls = this.shadowRoot.getElementById('pagination-controls');
        
        if (!paginationInfo || !paginationControls) return;
        
        const start = (this.currentPage - 1) * this.pageSize + 1;
        const end = Math.min(this.currentPage * this.pageSize, this.vouchers.length);
        const total = this.vouchers.length;
        
        paginationInfo.textContent = `显示第 ${start}-${end} 项，共 ${total} 项`;
        
        paginationControls.innerHTML = `
            <button class="btn btn-sm btn-prev" ${this.currentPage <= 1 ? 'disabled' : ''} 
                    data-page="${this.currentPage - 1}">
                <i class="fas fa-chevron-left"></i>
                上一页
            </button>
            <span style="padding: 0 16px; color: var(--gray-600); font-size: 16px;">
                第 ${this.currentPage} 页，共 ${this.totalPages} 页
            </span>
            <button class="btn btn-sm btn-next" ${this.currentPage >= this.totalPages ? 'disabled' : ''}
                    data-page="${this.currentPage + 1}">
                下一页
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        
        // 重新设置分页事件监听器
        this.setupPaginationEventListeners();
    }
    
    setupPaginationListeners() {
        // 这个方法现在由 setupPaginationEventListeners 替代
    }

    setupPaginationEventListeners() {
        const prevBtn = this.shadowRoot.querySelector('.btn-prev');
        const nextBtn = this.shadowRoot.querySelector('.btn-next');
        
        if (prevBtn && !prevBtn.disabled) {
            prevBtn.addEventListener('click', () => {
                const page = parseInt(prevBtn.dataset.page);
                if (page >= 1) {
                    this.currentPage = page;
                    this.loadVouchers();
                }
            });
        }
        
        if (nextBtn && !nextBtn.disabled) {
            nextBtn.addEventListener('click', () => {
                const page = parseInt(nextBtn.dataset.page);
                if (page <= this.totalPages) {
                    this.currentPage = page;
                    this.loadVouchers();
                }
            });
        }
    }

    getStatusClass(status) {
        const statusMap = {
            'pending': 'pending',
            'approved': 'approved',
            'rejected': 'rejected'
        };
        return statusMap[status] || 'pending';
    }

    getStatusText(status) {
        const statusMap = {
            'pending': '待审核',
            'approved': '已批准',
            'rejected': '已拒绝'
        };
        return statusMap[status] || status;
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    initializePixelVoyager(modal) {
        // 为动态生成的内容初始化 PixelVoyager
        setTimeout(() => {
            if (typeof PixelVoyager !== 'undefined') {
                try {
                    // 获取模态框内的所有图片链接
                    const imageLinks = modal.querySelectorAll('.pixel-voyager-link');
                    
                    if (imageLinks.length > 0) {
                        // 为每个链接添加点击事件来手动调用 PixelVoyager
                        imageLinks.forEach((link, index) => {
                            link.addEventListener('click', (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                
                                // 使用 PixelVoyager.openImage API 直接打开图片
                                const imageUrl = link.getAttribute('href');
                                if (imageUrl) {
                                    PixelVoyager.openImage(imageUrl);
                                }
                            });
                        });
                        
                        console.log(`PixelVoyager configured for ${imageLinks.length} images in modal`);
                    }
                } catch (error) {
                    console.warn('Failed to configure PixelVoyager:', error);
                }
            } else {
                console.warn('PixelVoyager not available, images will open in new tab');
            }
        }, 100);
    }

    addGlobalModalStyles() {
        // 检查是否已经添加过样式
        if (document.getElementById('voucher-modal-styles')) {
            return;
        }

        const styleElement = document.createElement('style');
        styleElement.id = 'voucher-modal-styles';
        styleElement.textContent = `
            #voucher-modal-global .modal-overlay {
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
            }

            #voucher-modal-global .modal-content {
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                max-width: 720px;
                width: 100%;
                max-height: 85vh;
                display: flex;
                flex-direction: column;
                animation: modalFadeIn 0.3s ease-out;
            }

            @keyframes modalFadeIn {
                from {
                    opacity: 0;
                    transform: scale(0.95) translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }

            #voucher-modal-global .modal-header {
                padding: 20px 24px 0 24px;
                border-bottom: 1px solid #e5e7eb;
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
                flex-shrink: 0;
            }

            #voucher-modal-global .modal-title {
                font-size: 20px;
                font-weight: 600;
                color: #111827;
                margin: 0;
                display: flex;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
            }

            #voucher-modal-global .id-badge {
                display: inline-flex;
                align-items: center;
                background: #e0f2fe;
                color: #0277bd;
                font-size: 12px;
                font-weight: 600;
                padding: 3px 8px;
                border-radius: 4px;
                border: 1px solid #81d4fa;
                font-family: 'Courier New', monospace;
                letter-spacing: 0.5px;
                margin-left: 4px;
            }

            #voucher-modal-global .modal-close {
                background: none;
                border: none;
                font-size: 24px;
                color: #6b7280;
                cursor: pointer;
                padding: 8px;
                border-radius: 8px;
                transition: all 0.2s ease;
            }

            #voucher-modal-global .modal-close:hover {
                background: #f3f4f6;
                color: #374151;
            }

            #voucher-modal-global .modal-body {
                padding: 0 24px 16px 24px;
                overflow-y: auto;
                flex: 1;
                min-height: 0;
            }

            #voucher-modal-global .detail-group {
                margin-bottom: 16px;
                padding-bottom: 12px;
                border-bottom: 2px solid #f3f4f6;
            }

            #voucher-modal-global .detail-group:last-child {
                border-bottom: none;
                margin-bottom: 0;
            }

            #voucher-modal-global .detail-group-title {
                font-size: 16px;
                font-weight: 600;
                color: #374151;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            #voucher-modal-global .detail-group-title i {
                color: #3b82f6;
            }

            #voucher-modal-global .detail-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 12px;
            }

            #voucher-modal-global .detail-item {
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 1px solid #f3f4f6;
            }

            #voucher-modal-global .detail-item:last-child {
                border-bottom: none;
                margin-bottom: 0;
            }

            #voucher-modal-global .detail-label {
                font-size: 12px;
                color: #6b7280;
                font-weight: 500;
                margin-bottom: 2px;
                text-transform: uppercase;
                letter-spacing: 0.025em;
            }

            #voucher-modal-global .detail-value {
                font-size: 14px;
                color: #111827;
                font-weight: 500;
                word-break: break-word;
            }

            #voucher-modal-global .image-container {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-top: 12px;
            }

            #voucher-modal-global .image-item {
                text-align: center;
            }

            #voucher-modal-global .image-preview {
                width: 100%;
                max-width: 300px;
                height: auto;
                max-height: 400px;
                object-fit: contain;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
                display: block;
                margin: 0 auto;
            }

            #voucher-modal-global .image-preview:hover {
                transform: scale(1.05);
                border-color: #3b82f6;
                box-shadow: 0 8px 25px rgba(59, 130, 246, 0.15);
            }

            #voucher-modal-global .pixel-voyager-link {
                display: block;
                text-decoration: none;
            }

            #voucher-modal-global .modal-actions {
                padding: 16px 24px;
                background: #f9fafb;
                border-top: 1px solid #e5e7eb;
                display: flex;
                gap: 12px;
                justify-content: flex-end;
                flex-shrink: 0;
            }

            #voucher-modal-global .btn {
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
            }

            #voucher-modal-global .btn-secondary {
                background: #f3f4f6;
                color: #374151;
                border: 1px solid #d1d5db;
            }

            #voucher-modal-global .btn-secondary:hover {
                background: #e5e7eb;
                border-color: #9ca3af;
            }

            #voucher-modal-global .status-badge {
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

            #voucher-modal-global .status-pending {
                background: #fef3c7;
                color: #92400e;
            }

            #voucher-modal-global .status-approved {
                background: #d1fae5;
                color: #065f46;
            }

            #voucher-modal-global .status-rejected {
                background: #fee2e2;
                color: #991b1b;
            }

            /* 响应式设计 */
            @media (max-width: 768px) {
                #voucher-modal-global .modal-content {
                    margin: 10px;
                    max-height: 90vh;
                }

                #voucher-modal-global .detail-grid {
                    grid-template-columns: 1fr;
                }

                #voucher-modal-global .modal-header {
                    padding: 20px 20px 0 20px;
                }

                #voucher-modal-global .modal-body {
                    padding: 0 20px 20px 20px;
                }

                #voucher-modal-global .modal-actions {
                    padding: 12px 20px;
                    flex-direction: column;
                }

                #voucher-modal-global .modal-actions .btn {
                    width: 100%;
                    justify-content: center;
                }

                #voucher-modal-global .image-container {
                    grid-template-columns: 1fr;
                }
            }
        `;
        
        document.head.appendChild(styleElement);
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
     * 显示成功消息
     */
    showSuccess(message) {
        this.showToast(message, 'success');
    }

    /**
     * 显示错误消息
     */
    showError(message) {
        this.showToast(message, 'error');
    }

    /**
     * 显示提示消息
     */
    showToast(message, type = 'info') {
        // 创建toast元素
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        // 添加toast样式（如果还没有）
        if (!this.shadowRoot.querySelector('#toast-styles')) {
            const toastStyles = document.createElement('style');
            toastStyles.id = 'toast-styles';
            toastStyles.textContent = `
                .toast {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 16px 24px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    z-index: 10000;
                    animation: slideIn 0.3s ease-out;
                }

                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }

                .toast-content {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .toast-success {
                    border-left: 4px solid var(--green-500);
                }

                .toast-success i {
                    color: var(--green-500);
                }

                .toast-error {
                    border-left: 4px solid var(--red-500);
                }

                .toast-error i {
                    color: var(--red-500);
                }

                .toast-info {
                    border-left: 4px solid var(--blue-500);
                }

                .toast-info i {
                    color: var(--blue-500);
                }
            `;
            this.shadowRoot.appendChild(toastStyles);
        }

        // 添加到shadow root
        this.shadowRoot.appendChild(toast);

        // 3秒后自动移除
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// 注册组件
customElements.define('voucher-manager', VoucherManager);

export default VoucherManager;
