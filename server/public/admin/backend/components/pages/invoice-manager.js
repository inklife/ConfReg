import BaseComponent from '../core/base-component.js';

/**
 * 发票管理组件
 * 显示和管理发票信息
 */
class InvoiceManager extends BaseComponent {
    constructor() {
        super();
        this.invoices = [];
        this.currentFilter = 'all';
        this.isLoading = false;
        this.isRendered = false; // 添加渲染状态标记
        this.statistics = {
            pending: 0,
            processing: 0,
            completed: 0,
            rejected: 0,
            totalCompleted: 0
        };
        this.pagination = {
            page: 1,
            limit: 5,
            total: 0,
            totalPages: 1
        };
        this.selectedInvoice = null;
        this.selectedFile = null;
        this.uploading = false;
        this.currentUploadRequest = null;
        this.searchTerm = ''; // 初始化为空字符串
        this.statusFilter = '';
    }

    async loadData() {
        console.log('InvoiceManager: Loading data...');
        try {
            await Promise.all([
                this.loadStatistics(),
                this.loadInvoices()
            ]);
            console.log('InvoiceManager: Data loaded successfully');
        } catch (error) {
            console.error('InvoiceManager: Error loading data:', error);
            this.showError('数据加载失败');
        }
    }

    async loadStatistics() {
        try {
            console.log('InvoiceManager: Loading statistics...');
            const response = await fetch('/admin/invoices/statistics', {
                credentials: 'include'
            });
            
            if (!response.ok) {
                console.error('Statistics API error:', response.status, response.statusText);
                throw new Error(`Statistics API error: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('InvoiceManager: Statistics loaded:', data);
            this.statistics = data;
            this.updateStatisticsDisplay();
        } catch (error) {
            console.error('Error loading statistics:', error);
            // 设置默认统计数据以避免界面卡住
            this.statistics = {
                byStatus: { pending: 0, processing: 0, completed: 0, rejected: 0 },
                totalCompleted: 0
            };
            this.updateStatisticsDisplay();
            this.showError('加载统计数据失败');
        }
    }

    async loadInvoices(page = 1) {
        try {
            console.log('InvoiceManager: Loading invoices, page:', page);
            this.isLoading = true;
            this.updateInvoicesDisplay(); // 立即显示加载状态
            
            this.pagination.page = page;
            
            const params = new URLSearchParams({
                page: page,
                limit: this.pagination.limit
            });
            
            if (this.statusFilter) {
                params.append('status', this.statusFilter);
            }
            
            if (this.searchTerm) {
                params.append('search', this.searchTerm);
            }
            
            const response = await fetch(`/admin/invoices/requests?${params}`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                console.error('Invoices API error:', response.status, response.statusText);
                throw new Error(`Invoices API error: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('InvoiceManager: Invoices loaded:', data);
            
            this.invoices = data.requests || [];
            this.pagination = {
                page: data.page || 1,
                limit: data.limit || 20,
                total: data.total || 0,
                totalPages: data.totalPages || 1
            };
            
            this.updateInvoicesDisplay();
            this.updatePaginationDisplay();
        } catch (error) {
            console.error('Error loading invoices:', error);
            // 设置空数据以避免界面卡住
            this.invoices = [];
            this.pagination = { page: 1, limit: 20, total: 0, totalPages: 1 };
            this.updateInvoicesDisplay();
            this.updatePaginationDisplay();
            this.showError('加载发票数据失败');
        } finally {
            this.isLoading = false;
            this.updateInvoicesDisplay(); // 确保移除加载状态
        }
    }

    updateStatisticsDisplay() {
        const statElements = {
            'stat-pending': this.statistics.byStatus?.pending || 0,
            'stat-processing': this.statistics.byStatus?.processing || 0,
            'stat-completed': this.statistics.byStatus?.completed || 0,
            'stat-rejected': this.statistics.byStatus?.rejected || 0,
            'stat-amount': `$${(this.statistics.totalCompleted || 0).toLocaleString()}`
        };
        
        Object.entries(statElements).forEach(([id, value]) => {
            const element = this.shadowRoot.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    updateInvoicesDisplay() {
        const tbody = this.shadowRoot.getElementById('invoice-tbody');
        if (!tbody) return;
        
        if (this.isLoading) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="loading-state">
                        <div class="loading-spinner"></div>
                        <p>加载中...</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        if (this.invoices.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <div class="empty-icon">
                            <i class="fas fa-file-invoice"></i>
                        </div>
                        <p>暂无发票申请</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = this.invoices.map(invoice => this.renderInvoiceRow(invoice)).join('');
        
        // 重新设置表格按钮事件监听器
        this.setupTableEventListeners();
    }

    renderActionButtons(invoice) {
        const status = invoice.status || 'pending';
        const invoiceId = invoice.id;
        const buttonStyle = "padding: 6px 8px; font-size: 14px; margin-left: 4px; border-radius: 8px; white-space: nowrap; min-width: 36px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid; transition: all 0.2s ease; font-weight: 500;";
        
        switch (status) {
            case 'pending':
                return `
                    <button class="btn btn-process btn-action-success" data-invoice-id="${invoiceId}" title="开始处理" style="${buttonStyle} background: #f0fdf4; border-color: #22c55e; color: #16a34a;">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="btn btn-reject btn-action-danger" data-invoice-id="${invoiceId}" title="拒绝申请" style="${buttonStyle} background: #fef2f2; border-color: #f87171; color: #dc2626;">
                        <i class="fas fa-times"></i>
                    </button>
                `;
            case 'processing':
                return `
                    <button class="btn btn-complete btn-action-success" data-invoice-id="${invoiceId}" title="标记完成" style="${buttonStyle} background: #f0fdf4; border-color: #22c55e; color: #16a34a;">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn btn-reject btn-action-danger" data-invoice-id="${invoiceId}" title="拒绝申请" style="${buttonStyle} background: #fef2f2; border-color: #f87171; color: #dc2626;">
                        <i class="fas fa-times"></i>
                    </button>
                `;
            case 'completed':
                return `
                    <button class="btn btn-re-review btn-action-secondary" data-invoice-id="${invoiceId}" title="重新审核" style="${buttonStyle} background: #f8fafc; border-color: #94a3b8; color: #475569;">
                        <i class="fas fa-redo"></i>
                    </button>
                `;
            case 'rejected':
                return `
                    <button class="btn btn-re-review btn-action-secondary" data-invoice-id="${invoiceId}" title="重新审核" style="${buttonStyle} background: #f8fafc; border-color: #94a3b8; color: #475569;">
                        <i class="fas fa-redo"></i>
                    </button>
                `;
            default:
                return '';
        }
    }

    renderInvoiceRow(invoice) {
        console.log('Rendering invoice row:', invoice); // 添加调试日志
        
        const statusColors = {
            pending: 'status-pending',
            processing: 'status-processing',
            completed: 'status-completed',
            rejected: 'status-rejected'
        };
        
        const statusTexts = {
            pending: '待处理',
            processing: '处理中',
            completed: '已完成',
            rejected: '已拒绝'
        };
        
        // 安全地访问嵌套属性
        const userName = invoice.user?.fullname || invoice.user?.username || '未知用户';
        const userEmail = invoice.user?.email || '未知邮箱';
        const invoiceTitle = invoice.invoiceTitle || '未指定';
        const content = invoice.content || '会议注册费用';
        const invoiceType = invoice.invoiceType === 'electronic' ? '电子发票' : '纸质发票';
        const status = invoice.status || 'pending';
        const amount = `${invoice.invoiceAmount || invoice.amount || '0'} ${invoice.invoiceCurrency || 'RMB'}`;
        const requestedAt = invoice.requestedAt || invoice.created_at || new Date().toISOString();
        const filesCount = invoice.files ? invoice.files.length : 0;
        
        return `
            <tr data-invoice-id="${invoice.id}">
                <td>
                    <div>
                        <div style="font-weight: 500; margin-bottom: 6px; font-size: 16px;">${userName}</div>
                        <div style="font-size: 14px; color: var(--gray-500); margin-bottom: 2px;">${userEmail}</div>
                        <div style="font-size: 14px; color: var(--gray-500);">发票ID: #${invoice.id}</div>
                    </div>
                </td>
                <td>
                    <div>
                        <div style="font-weight: 500; margin-bottom: 6px; font-size: 16px;">${invoiceTitle}</div>
                        <div style="font-size: 14px; color: var(--gray-500); margin-bottom: 2px;">${content}</div>
                        <div style="font-size: 14px; color: var(--gray-500);">
                            ${invoiceType}
                        </div>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${statusColors[status]}">
                        <i class="fas fa-circle" style="font-size: 8px;"></i>
                        ${statusTexts[status]}
                    </span>
                    ${filesCount > 0 ? 
                        `<div style="font-size: 14px; color: var(--green-600); margin-top: 6px;">
                            <i class="fas fa-paperclip"></i> ${filesCount} 个文件
                        </div>` : ''
                    }
                </td>
                <td style="font-weight: 500; font-size: 16px;">${amount}</td>
                <td style="font-size: 15px; color: var(--gray-600);">
                    ${new Date(requestedAt).toLocaleString('zh-CN')}
                </td>
                <td>
                    <div class="actions-cell">
                        <button class="btn btn-view btn-action-primary" data-invoice-id="${invoice.id}" title="查看详情" style="padding: 6px 12px; font-size: 14px; border-radius: 8px; white-space: nowrap; background: #eff6ff; border: 1px solid #3b82f6; color: #2563eb; transition: all 0.2s ease; font-weight: 500;">
                            <i class="fas fa-eye"></i>
                            查看
                        </button>
                        ${this.renderActionButtons(invoice)}
                    </div>
                </td>
            </tr>
        `;
    }

    updatePaginationDisplay() {
        const paginationInfo = this.shadowRoot.getElementById('pagination-info');
        const paginationControls = this.shadowRoot.getElementById('pagination-controls');
        
        if (!paginationInfo || !paginationControls) return;
        
        const start = (this.pagination.page - 1) * this.pagination.limit + 1;
        const end = Math.min(this.pagination.page * this.pagination.limit, this.pagination.total);
        
        paginationInfo.textContent = `显示第 ${start}-${end} 项，共 ${this.pagination.total} 项`;
        
        paginationControls.innerHTML = `
            <button class="btn btn-sm btn-prev" ${this.pagination.page <= 1 ? 'disabled' : ''} 
                    data-page="${this.pagination.page - 1}">
                <i class="fas fa-chevron-left"></i>
                上一页
            </button>
            <span style="padding: 0 16px; color: var(--gray-600); font-size: 16px;">
                第 ${this.pagination.page} 页，共 ${this.pagination.totalPages} 页
            </span>
            <button class="btn btn-sm btn-next" ${this.pagination.page >= this.pagination.totalPages ? 'disabled' : ''}
                    data-page="${this.pagination.page + 1}">
                下一页
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        
        // 重新设置分页事件监听器
        this.setupPaginationEventListeners();
    }

    async render() {
        // 防止重复渲染
        if (this.isRendered) {
            return;
        }
        
        // 使用基础组件的样式
        const baseStyles = this.createBaseStyles();
        
        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: block;
                padding: 24px;
                background: var(--gray-50);
                min-height: calc(100vh - 120px);
            }

            .invoices-container {
                max-width: 1400px;
                margin: 0 auto;
                position: relative;
                z-index: 1;
            }

            .header-section {
                background: var(--white);
                border-radius: var(--radius-lg);
                box-shadow: var(--shadow);
                padding: 24px;
                margin-bottom: 24px;
            }

            .header-title {
                font-size: 28px;
                font-weight: 700;
                color: var(--gray-900);
                margin: 0 0 8px 0;
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .header-subtitle {
                color: var(--gray-600);
                font-size: 16px;
                margin: 0;
            }

            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 16px;
                margin-bottom: 24px;
            }

            .stat-card {
                background: var(--white);
                border-radius: var(--radius-lg);
                box-shadow: var(--shadow);
                padding: 20px;
                text-align: center;
                transition: all 0.2s ease;
            }

            .stat-card:hover {
                transform: translateY(-2px);
                box-shadow: var(--shadow-md);
            }

            .stat-value {
                font-size: 32px;
                font-weight: 700;
                margin-bottom: 8px;
            }

            .stat-label {
                color: var(--gray-600);
                font-size: 15px;
                font-weight: 500;
            }

            .stat-pending { color: var(--yellow-600); }
            .stat-processing { color: var(--blue-600); }
            .stat-completed { color: var(--green-600); }
            .stat-rejected { color: var(--red-600); }
            .stat-amount { color: var(--purple-600); }

            .main-content {
                background: var(--white);
                border-radius: var(--radius-lg);
                box-shadow: var(--shadow);
                overflow: hidden;
            }

            .content-header {
                padding: 20px 24px;
                border-bottom: 1px solid var(--gray-200);
                display: flex;
                justify-content: between;
                align-items: center;
                flex-wrap: wrap;
                gap: 16px;
            }

            .search-filters {
                display: flex;
                gap: 12px;
                align-items: center;
                flex-wrap: wrap;
            }

            .filter-select {
                padding: 10px 14px;
                border: 1px solid var(--gray-300);
                border-radius: var(--radius);
                font-size: 16px;
                background: var(--white);
                color: var(--gray-700);
                min-width: 140px;
            }

            .search-input {
                padding: 10px 14px;
                border: 1px solid var(--gray-300);
                border-radius: var(--radius);
                font-size: 16px;
                width: 260px;
                background: var(--white);
            }

            .table-container {
                overflow-x: auto;
            }

            .invoice-table {
                width: 100%;
                border-collapse: collapse;
            }

            .invoice-table th {
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

            .invoice-table td {
                padding: 20px 16px;
                border-bottom: 1px solid var(--gray-200);
                font-size: 16px;
                color: var(--gray-700);
                vertical-align: top;
                line-height: 1.6;
            }

            .invoice-table tbody tr {
                transition: all 0.2s ease;
                position: relative;
            }

            .invoice-table tbody tr:hover {
                background: var(--gray-50);
                z-index: 0;
            }

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

            .status-processing {
                background: #dbeafe;
                color: #1e40af;
            }

            .status-completed {
                background: #d1fae5;
                color: #065f46;
            }

            .status-rejected {
                background: #fee2e2;
                color: #991b1b;
            }

            .actions-cell {
                display: flex;
                gap: 6px;
                align-items: center;
                flex-wrap: nowrap;
                min-width: 180px;
                overflow-x: auto;
                position: relative;
                z-index: 1;
            }

            .actions-cell .btn {
                flex-shrink: 0;
                transition: all 0.2s ease;
                position: relative;
                z-index: 1;
            }

            /* 主要按钮悬停效果 - 蓝色 */
            .btn-action-primary:hover {
                background: #3b82f6 !important;
                border-color: #2563eb !important;
                color: white !important;
                box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
            }

            /* 成功按钮悬停效果 - 绿色 */
            .btn-action-success:hover {
                background: #22c55e !important;
                border-color: #16a34a !important;
                color: white !important;
                box-shadow: 0 2px 8px rgba(34, 197, 94, 0.25);
            }

            /* 危险按钮悬停效果 - 红色 */
            .btn-action-danger:hover {
                background: #f87171 !important;
                border-color: #dc2626 !important;
                color: white !important;
                box-shadow: 0 2px 8px rgba(248, 113, 113, 0.25);
            }

            /* 次要按钮悬停效果 - 灰色 */
            .btn-action-secondary:hover {
                background: #94a3b8 !important;
                border-color: #64748b !important;
                color: white !important;
                box-shadow: 0 2px 8px rgba(148, 163, 184, 0.25);
            }

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

            .empty-state {
                padding: 60px 20px;
                text-align: center;
                color: var(--gray-500);
                font-size: 16px;
            }

            .empty-icon {
                font-size: 48px;
                color: var(--gray-300);
                margin-bottom: 16px;
            }

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

            /* 特定组件样式 */
            .detail-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
            }

            .detail-section {
                border: 1px solid var(--gray-200);
                border-radius: var(--radius);
                padding: 16px;
            }

            .detail-title {
                font-weight: 600;
                color: var(--gray-900);
                margin-bottom: 12px;
                font-size: 14px;
            }

            .detail-row {
                display: flex;
                justify-content: between;
                margin-bottom: 8px;
                font-size: 14px;
            }

            .detail-label {
                color: var(--gray-600);
                font-weight: 500;
            }

            .detail-value {
                color: var(--gray-900);
            }

            .file-list {
                margin-top: 16px;
            }

            .file-item {
                display: flex;
                justify-content: between;
                align-items: center;
                padding: 12px;
                background: var(--gray-50);
                border-radius: var(--radius);
                margin-bottom: 8px;
            }

            .file-info {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .upload-area {
                border: 2px dashed var(--gray-300);
                border-radius: var(--radius);
                padding: 24px;
                text-align: center;
                margin-top: 16px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .upload-area:hover {
                border-color: var(--blue-500);
                background: var(--blue-50);
            }

            .upload-area.dragover {
                border-color: var(--blue-500);
                background: var(--blue-50);
            }

            /* 动画定义 */
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

            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            /* 响应式设计 */
            @media (max-width: 768px) {
                :host {
                    padding: 16px;
                }

                .stats-grid {
                    grid-template-columns: repeat(2, 1fr);
                    gap: 12px;
                }

                .content-header {
                    flex-direction: column;
                    align-items: stretch;
                }

                .search-filters {
                    flex-direction: column;
                    gap: 8px;
                }

                .search-input {
                    width: 100%;
                }

                .invoice-table {
                    font-size: 15px;
                }

                .invoice-table th,
                .invoice-table td {
                    padding: 12px 8px;
                }

                .actions-cell {
                    flex-direction: column;
                    gap: 4px;
                    min-width: auto;
                }

                .actions-cell .btn {
                    width: 100%;
                    justify-content: center;
                }

                .detail-grid {
                    grid-template-columns: 1fr;
                }

                .modal {
                    margin: 10px;
                    max-height: calc(100vh - 20px);
                }
            }

            /* 表格行悬停效果 */
            .invoice-table tbody tr {
                transition: all 0.2s ease;
            }

            /* 加载状态动画 */
            .stat-card {
                animation: fadeInUp 0.4s ease;
            }

            .stat-card:nth-child(1) { animation-delay: 0.1s; }
            .stat-card:nth-child(2) { animation-delay: 0.2s; }
            .stat-card:nth-child(3) { animation-delay: 0.3s; }
            .stat-card:nth-child(4) { animation-delay: 0.4s; }
            .stat-card:nth-child(5) { animation-delay: 0.5s; }

            /* 模态框动画 */
            .modal-overlay {
                animation: fadeIn 0.3s ease;
            }

            .modal {
                animation: fadeInUp 0.3s ease;
            }

            /* 按钮禁用状态 */
            .btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                pointer-events: none;
            }

            /* 状态徽章图标动画 */
            .status-badge i {
                animation: pulse 2s infinite;
            }

            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }

            .status-completed .fa-circle {
                animation: none;
            }
        `;

        const container = document.createElement('div');
        container.className = 'invoices-container';
        container.innerHTML = `
            <!-- 页面头部 
            <div class="header-section">
                <h1 class="header-title">
                    <i class="fas fa-file-invoice"></i>
                    发票管理
                </h1>
                <p class="header-subtitle">管理和处理系统发票申请</p>
            </div>
            -->

            <!-- 主要内容区域 -->
            <div class="main-content">
                <div class="content-header">
                    <div class="search-filters">
                        <select class="filter-select" id="status-filter">
                            <option value="">全部状态</option>
                            <option value="pending">待处理</option>
                            <option value="processing">处理中</option>
                            <option value="completed">已完成</option>
                            <option value="rejected">已拒绝</option>
                        </select>
                        <input type="text" class="search-input" id="search-input" placeholder="搜索发票ID、申请人姓名、邮箱...">
                    </div>
                    <div style="display: flex; gap: 12px;">
                        <button class="btn btn-primary" id="search-btn">
                            <i class="fas fa-search"></i>
                            搜索
                        </button>
                        <button class="btn btn-success" id="export-pending-btn" title="导出（CSV格式）">
                            <i class="fas fa-file-export"></i>
                            导出
                        </button>
                    </div>
                </div>

                <div class="table-container">
                    <table class="invoice-table">
                        <thead>
                            <tr>
                                <th>申请信息</th>
                                <th>发票详情</th>
                                <th>状态</th>
                                <th>金额</th>
                                <th>申请时间</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody id="invoice-tbody">
                            <!-- 数据将通过JavaScript填充 -->
                        </tbody>
                    </table>
                </div>

                <div class="pagination" id="pagination-section">
                    <div class="pagination-info" id="pagination-info">
                        显示第 1-10 项，共 0 项
                    </div>
                    <div class="pagination-controls" id="pagination-controls">
                        <!-- 分页控件将通过JavaScript生成 -->
                    </div>
                </div>
            </div>
        `;

        this.shadowRoot.appendChild(baseStyles);
        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(container);

        // 创建全局模态框（在document.body中）
        this.createGlobalModals();

        // 设置事件监听器
        this.setupEventListeners();
        
        // 确保 DOM 更新后再加载数据
        setTimeout(async () => {
            await this.loadData();
        }, 100);
        
        // 标记为已渲染
        this.isRendered = true;
    }

    /**
     * 创建全局模态框（在document.body中）
     */
    createGlobalModals() {
        // 移除现有的模态框
        this.removeGlobalModals();

        // 创建详情模态框
        this.createDetailsModal();
        
        // 创建上传模态框
        this.createUploadModal();
    }

    /**
     * 移除全局模态框
     */
    removeGlobalModals() {
        const detailsModal = document.getElementById('invoice-details-modal-global');
        if (detailsModal) {
            detailsModal.remove();
        }
        
        const uploadModal = document.getElementById('invoice-upload-modal-global');
        if (uploadModal) {
            uploadModal.remove();
        }
        
        const registrationModal = document.getElementById('registration-details-modal-global');
        if (registrationModal) {
            registrationModal.remove();
        }
    }

    /**
     * 创建详情模态框
     */
    createDetailsModal() {
        const modal = document.createElement('div');
        modal.id = 'invoice-details-modal-global';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">发票申请详情</h2>
                        <button class="modal-close" id="close-invoice-details-global">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body" id="invoice-details-modal-body">
                        <!-- 详情内容将通过JavaScript填充 -->
                    </div>
                </div>
            </div>
        `;

        // 添加样式
        const modalStyle = document.createElement('style');
        modalStyle.textContent = `
            #invoice-details-modal-global {
                --white: #ffffff;
                --gray-50: #f9fafb;
                --gray-100: #f3f4f6;
                --gray-200: #e5e7eb;
                --gray-300: #d1d5db;
                --gray-400: #9ca3af;
                --gray-500: #6b7280;
                --gray-600: #4b5563;
                --gray-700: #374151;
                --gray-800: #1f2937;
                --gray-900: #111827;
                --blue-500: #3b82f6;
                --blue-600: #2563eb;
                --green-500: #10b981;
                --green-600: #059669;
                --red-500: #ef4444;
                --red-600: #dc2626;
                --yellow-500: #f59e0b;
                --yellow-600: #d97706;
                --radius: 8px;
                --radius-lg: 12px;
                --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
                --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            }

            #invoice-details-modal-global .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.6);
                z-index: 9999;
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

            #invoice-details-modal-global .modal-content {
                background: var(--white);
                border-radius: 16px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
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

            /* 模态框头部 */
            #invoice-details-modal-global .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 24px 24px 16px 24px;
                border-bottom: 1px solid var(--gray-200);
            }

            #invoice-details-modal-global .modal-title {
                font-size: 20px;
                font-weight: 600;
                color: var(--gray-900);
                margin: 0;
            }

            #invoice-details-modal-global .modal-close {
                background: none;
                border: none;
                padding: 8px;
                cursor: pointer;
                color: var(--gray-400);
                border-radius: 6px;
                transition: all 0.2s ease;
                font-size: 16px;
            }

            #invoice-details-modal-global .modal-close:hover {
                background: var(--gray-100);
                color: var(--gray-600);
            }

            /* 模态框主体 */
            #invoice-details-modal-global .modal-body {
                padding: 24px;
            }

            /* 模态框内容样式 */
            #invoice-details-modal-global .detail-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
            }

            #invoice-details-modal-global .detail-section {
                border: 1px solid var(--gray-200);
                border-radius: var(--radius);
                padding: 16px;
                background: var(--gray-50);
            }

            #invoice-details-modal-global .detail-title {
                font-weight: 600;
                color: var(--gray-900);
                margin-bottom: 12px;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            #invoice-details-modal-global .detail-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                font-size: 14px;
                align-items: flex-start;
            }

            #invoice-details-modal-global .detail-row:last-child {
                margin-bottom: 0;
            }

            #invoice-details-modal-global .detail-label {
                color: var(--gray-600);
                font-weight: 500;
                min-width: 80px;
                flex-shrink: 0;
            }

            #invoice-details-modal-global .detail-value {
                color: var(--gray-900);
                font-weight: 500;
                text-align: right;
                word-break: break-word;
            }

            #invoice-details-modal-global .file-list {
                margin-top: 16px;
            }

            #invoice-details-modal-global .file-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px;
                background: var(--white);
                border-radius: var(--radius);
                margin-bottom: 8px;
                border: 1px solid var(--gray-200);
                transition: all 0.2s ease;
            }

            #invoice-details-modal-global .file-item:hover {
                box-shadow: var(--shadow);
                border-color: var(--gray-300);
            }

            #invoice-details-modal-global .file-item:last-child {
                margin-bottom: 0;
            }

            #invoice-details-modal-global .file-info {
                display: flex;
                align-items: center;
                gap: 8px;
                flex: 1;
            }

            #invoice-details-modal-global .file-icon {
                color: var(--blue-500);
                font-size: 16px;
                width: 20px;
                text-align: center;
            }

            #invoice-details-modal-global .file-details {
                flex: 1;
            }

            #invoice-details-modal-global .file-name {
                font-weight: 500;
                color: var(--gray-900);
                font-size: 14px;
                margin-bottom: 2px;
            }

            #invoice-details-modal-global .file-size {
                color: var(--gray-500);
                font-size: 12px;
            }

            /* 按钮样式 */
            #invoice-details-modal-global .btn {
                padding: 8px 16px;
                border-radius: var(--radius);
                border: 1px solid var(--gray-300);
                background: var(--white);
                color: var(--gray-700);
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                gap: 6px;
            }

            #invoice-details-modal-global .btn:hover {
                background: var(--gray-50);
                border-color: var(--gray-400);
            }

            #invoice-details-modal-global .btn-primary {
                background: var(--blue-500);
                border-color: var(--blue-500);
                color: white;
            }

            #invoice-details-modal-global .btn-primary:hover {
                background: var(--blue-600);
                border-color: var(--blue-600);
            }

            #invoice-details-modal-global .btn-success {
                background: var(--green-500);
                border-color: var(--green-500);
                color: white;
            }

            #invoice-details-modal-global .btn-success:hover {
                background: var(--green-600);
                border-color: var(--green-600);
            }

            #invoice-details-modal-global .btn-sm {
                padding: 6px 12px;
                font-size: 12px;
            }

            /* 状态徽章 */
            #invoice-details-modal-global .status-badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 500;
            }

            #invoice-details-modal-global .status-pending {
                background: #fef3c7;
                color: #d97706;
            }

            #invoice-details-modal-global .status-processing {
                background: #dbeafe;
                color: #2563eb;
            }

            #invoice-details-modal-global .status-completed {
                background: #d1fae5;
                color: #059669;
            }

            #invoice-details-modal-global .status-rejected {
                background: #fee2e2;
                color: #dc2626;
            }

            /* 金额显示 */
            #invoice-details-modal-global .amount-display {
                font-size: 18px;
                font-weight: 600;
                color: var(--green-600);
            }

            /* 文件编辑样式 */
            #invoice-details-modal-global .file-actions {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            #invoice-details-modal-global .file-edit-actions {
                display: flex;
                align-items: center;
                gap: 4px;
            }

            #invoice-details-modal-global .file-edit-actions .btn {
                padding: 4px 8px;
                font-size: 12px;
                min-width: 32px;
                justify-content: center;
            }

            #invoice-details-modal-global .btn-move-up,
            #invoice-details-modal-global .btn-move-down {
                background: var(--gray-100);
                border-color: var(--gray-300);
                color: var(--gray-600);
            }

            #invoice-details-modal-global .btn-move-up:hover,
            #invoice-details-modal-global .btn-move-down:hover {
                background: var(--gray-200);
                border-color: var(--gray-400);
            }

            #invoice-details-modal-global .btn-move-up:disabled,
            #invoice-details-modal-global .btn-move-down:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            #invoice-details-modal-global .btn-delete-file {
                background: var(--red-50);
                border-color: var(--red-200);
                color: var(--red-600);
            }

            #invoice-details-modal-global .btn-delete-file:hover {
                background: var(--red-100);
                border-color: var(--red-300);
            }

            #invoice-details-modal-global .file-edit-controls {
                background: var(--gray-50);
                padding: 16px;
                border-radius: var(--radius);
                border: 1px solid var(--gray-200);
            }

            #invoice-details-modal-global .btn-warning {
                background: var(--yellow-500);
                border-color: var(--yellow-500);
                color: white;
            }

            #invoice-details-modal-global .btn-warning:hover {
                background: var(--yellow-600);
                border-color: var(--yellow-600);
            }
        `;

        modal.appendChild(modalStyle);
        document.body.appendChild(modal);

        // 设置事件监听器
        modal.querySelector('#close-invoice-details-global').addEventListener('click', () => {
            this.hideDetailsModal();
        });

        modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
            if (e.target === modal.querySelector('.modal-overlay')) {
                this.hideDetailsModal();
            }
        });
    }

    /**
     * 创建上传模态框
     */
    createUploadModal() {
        const modal = document.createElement('div');
        modal.id = 'invoice-upload-modal-global';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">上传发票文件</h2>
                        <button class="modal-close" id="close-invoice-upload-global">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="upload-area" id="upload-area-global">
                            <i class="fas fa-cloud-upload-alt" style="font-size: 48px; color: var(--gray-400); margin-bottom: 16px;"></i>
                            <p style="margin: 0 0 8px 0; font-weight: 500;">点击选择文件或拖拽文件到此处</p>
                            <p style="margin: 0; color: var(--gray-500); font-size: 14px;">支持 PDF、JPG、PNG 格式，最大 10MB</p>
                            <input type="file" id="file-input-global" accept=".pdf,.jpg,.jpeg,.png" style="display: none;">
                        </div>
                        <div id="upload-progress-global" style="display: none; margin-top: 16px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span>上传进度</span>
                                <span id="upload-percent-global">0%</span>
                            </div>
                            <div style="background: var(--gray-200); height: 8px; border-radius: 4px; overflow: hidden;">
                                <div id="upload-progress-bar-global" style="background: var(--blue-500); height: 100%; width: 0%; transition: width 0.3s ease;"></div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button class="btn" id="cancel-upload-global">取消</button>
                        <button class="btn btn-primary" id="confirm-upload-global" disabled>上传文件</button>
                    </div>
                </div>
            </div>
        `;

        // 添加样式
        const modalStyle = document.createElement('style');
        modalStyle.textContent = `
            #invoice-upload-modal-global {
                --white: #ffffff;
                --gray-50: #f9fafb;
                --gray-100: #f3f4f6;
                --gray-200: #e5e7eb;
                --gray-300: #d1d5db;
                --gray-400: #9ca3af;
                --gray-500: #6b7280;
                --gray-600: #4b5563;
                --gray-700: #374151;
                --gray-800: #1f2937;
                --gray-900: #111827;
                --blue-500: #3b82f6;
                --blue-600: #2563eb;
                --green-500: #10b981;
                --green-600: #059669;
                --red-500: #ef4444;
                --red-600: #dc2626;
                --yellow-500: #f59e0b;
                --yellow-600: #d97706;
                --radius: 8px;
                --radius-lg: 12px;
                --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
                --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            }

            #invoice-upload-modal-global .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.6);
                z-index: 9999;
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

            #invoice-upload-modal-global .modal-content {
                background: var(--white);
                border-radius: 16px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                max-width: 600px;
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

            /* 模态框头部 */
            #invoice-upload-modal-global .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 24px 24px 16px 24px;
                border-bottom: 1px solid var(--gray-200);
            }

            #invoice-upload-modal-global .modal-title {
                font-size: 20px;
                font-weight: 600;
                color: var(--gray-900);
                margin: 0;
            }

            #invoice-upload-modal-global .modal-close {
                background: none;
                border: none;
                padding: 8px;
                cursor: pointer;
                color: var(--gray-400);
                border-radius: 6px;
                transition: all 0.2s ease;
                font-size: 16px;
            }

            #invoice-upload-modal-global .modal-close:hover {
                background: var(--gray-100);
                color: var(--gray-600);
            }

            /* 模态框主体 */
            #invoice-upload-modal-global .modal-body {
                padding: 24px;
            }

            /* 上传区域 */
            #invoice-upload-modal-global .upload-area {
                border: 2px dashed var(--gray-300);
                border-radius: var(--radius-lg);
                padding: 40px 20px;
                text-align: center;
                background: var(--gray-50);
                transition: all 0.2s ease;
                cursor: pointer;
            }

            #invoice-upload-modal-global .upload-area:hover {
                border-color: var(--blue-400);
                background: var(--blue-50);
            }

            #invoice-upload-modal-global .upload-area.dragover {
                border-color: var(--blue-500);
                background: var(--blue-50);
            }

            #invoice-upload-modal-global .upload-area i {
                display: block;
                font-size: 48px;
                color: var(--gray-400);
                margin-bottom: 16px;
            }

            #invoice-upload-modal-global .upload-area p {
                margin: 0;
                color: var(--gray-600);
            }

            #invoice-upload-modal-global .upload-area p:first-of-type {
                font-weight: 500;
                margin-bottom: 8px;
                color: var(--gray-700);
            }

            /* 进度条 */
            #invoice-upload-modal-global .upload-progress {
                margin-top: 16px;
            }

            #invoice-upload-modal-global .progress-info {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                font-size: 14px;
                color: var(--gray-600);
            }

            #invoice-upload-modal-global .progress-bar-container {
                background: var(--gray-200);
                height: 8px;
                border-radius: 4px;
                overflow: hidden;
            }

            #invoice-upload-modal-global .progress-bar {
                background: var(--blue-500);
                height: 100%;
                width: 0%;
                transition: width 0.3s ease;
                border-radius: 4px;
            }

            /* 模态框底部 */
            #invoice-upload-modal-global .modal-actions {
                display: flex;
                justify-content: flex-end;
                gap: 12px;
                padding: 16px 24px 24px 24px;
                border-top: 1px solid var(--gray-200);
            }

            /* 按钮样式 */
            #invoice-upload-modal-global .btn {
                padding: 10px 20px;
                border-radius: var(--radius);
                border: 1px solid var(--gray-300);
                background: var(--white);
                color: var(--gray-700);
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                display: inline-flex;
                align-items: center;
                gap: 6px;
            }

            #invoice-upload-modal-global .btn:hover {
                background: var(--gray-50);
                border-color: var(--gray-400);
            }

            #invoice-upload-modal-global .btn:disabled {
                background: var(--gray-100);
                color: var(--gray-400);
                cursor: not-allowed;
                border-color: var(--gray-200);
            }

            #invoice-upload-modal-global .btn:disabled:hover {
                background: var(--gray-100);
                border-color: var(--gray-200);
            }

            #invoice-upload-modal-global .btn-primary {
                background: var(--blue-500);
                border-color: var(--blue-500);
                color: white;
            }

            #invoice-upload-modal-global .btn-primary:hover:not(:disabled) {
                background: var(--blue-600);
                border-color: var(--blue-600);
            }

            #invoice-upload-modal-global .btn-primary:disabled {
                background: var(--gray-300);
                border-color: var(--gray-300);
                color: var(--gray-500);
            }

            /* 文件预览 */
            #invoice-upload-modal-global .file-preview {
                margin-top: 16px;
                padding: 12px;
                background: var(--gray-50);
                border-radius: var(--radius);
                border: 1px solid var(--gray-200);
            }

            #invoice-upload-modal-global .file-preview .file-info {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            #invoice-upload-modal-global .file-preview .file-icon {
                color: var(--blue-500);
                font-size: 16px;
            }

            #invoice-upload-modal-global .file-preview .file-name {
                font-weight: 500;
                color: var(--gray-900);
            }

            #invoice-upload-modal-global .file-preview .file-size {
                color: var(--gray-500);
                font-size: 12px;
            }
        `;

        modal.appendChild(modalStyle);
        document.body.appendChild(modal);

        // 设置事件监听器
        modal.querySelector('#close-invoice-upload-global').addEventListener('click', () => {
            this.hideUploadModal();
        });

        modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
            if (e.target === modal.querySelector('.modal-overlay')) {
                this.hideUploadModal();
            }
        });

        // 设置文件上传功能
        this.setupFileUploadGlobal();
    }

    setupEventListeners() {
        // 状态筛选器
        const statusFilter = this.shadowRoot.getElementById('status-filter');
        if (statusFilter) {
            // 移除旧的监听器（如果存在）
            if (this._statusFilterHandler) {
                statusFilter.removeEventListener('change', this._statusFilterHandler);
            }
            this._statusFilterHandler = (e) => {
                this.statusFilter = e.target.value || '';
                this.loadInvoices(1);
            };
            statusFilter.addEventListener('change', this._statusFilterHandler);
        }
        
        // 搜索输入框
        const searchInput = this.shadowRoot.getElementById('search-input');
        if (searchInput) {
            // 移除旧的监听器（如果存在）
            if (this._searchInputHandler) {
                searchInput.removeEventListener('keypress', this._searchInputHandler);
            }
            // 输入框回车事件
            this._searchInputHandler = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault(); // 防止表单提交
                    this.performSearch();
                }
            };
            searchInput.addEventListener('keypress', this._searchInputHandler);
            
            // 移除实时搜索，避免数据闪烁
            // 现在只在回车或点击搜索按钮时搜索
        }
        
        // 搜索按钮
        const searchBtn = this.shadowRoot.getElementById('search-btn');
        if (searchBtn) {
            // 移除旧的监听器（如果存在）
            if (this._searchBtnHandler) {
                searchBtn.removeEventListener('click', this._searchBtnHandler);
            }
            this._searchBtnHandler = () => {
                this.performSearch();
            };
            searchBtn.addEventListener('click', this._searchBtnHandler);
        }
        
        // 导出按钮
        const exportPendingBtn = this.shadowRoot.getElementById('export-pending-btn');
        if (exportPendingBtn) {
            // 移除旧的监听器（如果存在）
            if (this._exportPendingBtnHandler) {
                exportPendingBtn.removeEventListener('click', this._exportPendingBtnHandler);
            }
            this._exportPendingBtnHandler = () => {
                this.exportPendingInvoices();
            };
            exportPendingBtn.addEventListener('click', this._exportPendingBtnHandler);
        }
        
        // 设置表格和分页事件监听器
        this.setupTableEventListeners();
        this.setupPaginationEventListeners();
    }

    performSearch() {
        const searchInput = this.shadowRoot.getElementById('search-input');
        if (searchInput) {
            const newSearchTerm = (searchInput.value || '').trim();
            // 只在搜索词真正改变时才执行搜索
            if (newSearchTerm !== this.searchTerm) {
                this.searchTerm = newSearchTerm;
                this.loadInvoices(1);
            }
        }
    }

    setupTableEventListeners() {
        // 表格按钮事件委托
        const tableContainer = this.shadowRoot.getElementById('invoice-tbody');
        if (tableContainer) {
            // 移除之前的监听器（如果存在）
            if (this._tableClickHandler) {
                tableContainer.removeEventListener('click', this._tableClickHandler);
            }
            
            // 创建新的事件处理器，使用箭头函数保持 this 上下文
            this._tableClickHandler = (e) => {
                const button = e.target.closest('button');
                if (!button) return;
                
                const invoiceId = parseInt(button.dataset.invoiceId);
                
                if (button.classList.contains('btn-view')) {
                    this.viewDetails(invoiceId);
                } else if (button.classList.contains('btn-upload')) {
                    this.showUploadModal(invoiceId);
                } else if (button.classList.contains('btn-process')) {
                    this.updateStatus(invoiceId, 'processing');
                } else if (button.classList.contains('btn-complete')) {
                    this.updateStatus(invoiceId, 'completed');
                } else if (button.classList.contains('btn-reject')) {
                    this.updateStatus(invoiceId, 'rejected');
                } else if (button.classList.contains('btn-re-review')) {
                    this.reReviewInvoice(invoiceId);
                }
            };
            
            // 添加新的监听器
            tableContainer.addEventListener('click', this._tableClickHandler);
        }
    }

    setupPaginationEventListeners() {
        // 分页按钮事件委托
        const paginationControls = this.shadowRoot.getElementById('pagination-controls');
        if (paginationControls) {
            // 移除之前的监听器（如果存在）
            if (this._paginationClickHandler) {
                paginationControls.removeEventListener('click', this._paginationClickHandler);
            }
            
            // 创建新的事件处理器，使用箭头函数保持 this 上下文
            this._paginationClickHandler = (e) => {
                const button = e.target.closest('button');
                if (!button || button.disabled) return;
                
                const page = parseInt(button.dataset.page);
                if (page && page !== this.pagination.page) {
                    this.loadInvoices(page);
                }
            };
            
            // 添加新的监听器
            paginationControls.addEventListener('click', this._paginationClickHandler);
        }
    }

    setupFileUploadGlobal() {
        const uploadArea = document.getElementById('upload-area-global');
        const fileInput = document.getElementById('file-input-global');
        const confirmUpload = document.getElementById('confirm-upload-global');
        const cancelUpload = document.getElementById('cancel-upload-global');
        
        if (!uploadArea || !fileInput) return;
        
        // 点击上传区域选择文件
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });
        
        // 文件选择
        fileInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });
        
        // 拖拽上传
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });
        
        // 确认上传
        if (confirmUpload) {
            confirmUpload.addEventListener('click', () => {
                this.uploadFile();
            });
        }
        
        // 取消上传
        if (cancelUpload) {
            cancelUpload.addEventListener('click', () => {
                this.hideUploadModal();
            });
        }
    }

    handleFileSelect(file) {
        if (!file) return;
        
        // 验证文件类型
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            this.showError('只支持 PDF、JPG、PNG 格式的文件');
            return;
        }
        
        // 验证文件大小（10MB）
        if (file.size > 10 * 1024 * 1024) {
            this.showError('文件大小不能超过 10MB');
            return;
        }
        
        this.selectedFile = file;
        
        // 更新上传区域显示
        const uploadArea = document.getElementById('upload-area-global');
        if (uploadArea) {
            uploadArea.innerHTML = `
                <i class="fas fa-file-check" style="font-size: 48px; color: var(--green-500); margin-bottom: 16px;"></i>
                <p style="margin: 0 0 8px 0; font-weight: 500;">${file.name}</p>
                <p style="margin: 0; color: var(--gray-500); font-size: 14px;">${this.formatFileSize(file.size)}</p>
            `;
        }
        
        // 启用上传按钮
        const confirmUpload = document.getElementById('confirm-upload-global');
        if (confirmUpload) {
            confirmUpload.disabled = false;
        }
    }

    async uploadFile() {
        if (!this.selectedFile || !this.currentUploadRequest) return;
        
        try {
            this.uploading = true;
            const formData = new FormData();
            formData.append('invoice', this.selectedFile);
            
            // 显示上传进度
            const uploadProgress = document.getElementById('upload-progress-global');
            if (uploadProgress) {
                uploadProgress.style.display = 'block';
            }
            
            const response = await fetch(`/admin/invoices/request/${this.currentUploadRequest}/upload`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            
            if (!response.ok) throw new Error('文件上传失败');
            
            const result = await response.json();
            console.log('Upload success, result:', result); // 调试日志
            console.log('Current upload request ID:', this.currentUploadRequest); // 调试日志
            
            // 保存当前上传请求ID，因为hideUploadModal会清空它
            const uploadRequestId = this.currentUploadRequest;
            
            this.showSuccess('文件上传成功');
            this.hideUploadModal();
            
            // 直接更新前端视图，而不是重新拉取数据
            this.updateViewAfterFileUpload(result.file, uploadRequestId);
            
        } catch (error) {
            console.error('Upload error:', error);
            this.showError(error.message || '文件上传失败');
        } finally {
            this.uploading = false;
        }
    }

    async viewDetails(invoiceId) {
        try {
            const response = await fetch(`/admin/invoices/request/${invoiceId}`, {
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error('获取详情失败');
            
            const data = await response.json();
            console.log('Invoice details response:', data); // 添加调试日志
            
            // API 返回的数据格式是 { request: {...} }
            const invoice = data.request || data;
            this.showDetailsModal(invoice);
            
        } catch (error) {
            console.error('Error loading details:', error);
            this.showError('获取详情失败');
        }
    }

    async updateStatus(invoiceId, newStatus) {
        const statusTexts = {
            processing: '开始处理',
            completed: '标记完成',
            rejected: '拒绝申请'
        };
        
        // 如果是标记完成，检查是否有文件
        if (newStatus === 'completed') {
            const invoice = this.invoices.find(inv => inv.id === invoiceId);
            if (!invoice || !invoice.files || invoice.files.length === 0) {
                const confirmWithoutFiles = confirm(
                    '该发票申请当前没有上传任何文件，确定要标记为完成吗？\n\n' +
                    '建议先上传发票文件再标记完成。'
                );
                if (!confirmWithoutFiles) {
                    return; // 用户取消操作
                }
            }
        }
        
        const adminNotes = prompt(`请输入${statusTexts[newStatus]}的备注（可选）:`);
        
        // 如果用户点击取消，prompt返回null，应该中止操作
        if (adminNotes === null) {
            return; // 用户取消操作
        }
        
        try {
            const response = await fetch(`/admin/invoices/request/${invoiceId}/status`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: newStatus,
                    adminNotes: adminNotes || ''
                })
            });
            
            if (!response.ok) throw new Error('状态更新失败');
            
            this.showSuccess(`状态已更新为${statusTexts[newStatus]}`);
            this.loadData(); // 重新加载数据和统计
            
        } catch (error) {
            console.error('Error updating status:', error);
            this.showError('状态更新失败');
        }
    }

    showFileEditMode(invoiceId) {
        // 显示编辑控件
        const editControls = document.querySelector('.file-edit-controls');
        if (editControls) {
            editControls.style.display = 'block';
        }

        // 显示所有文件的编辑按钮
        const editActions = document.querySelectorAll('.file-edit-actions');
        editActions.forEach(action => {
            action.style.display = 'flex';
        });

        // 隐藏编辑文件按钮
        const editButton = document.querySelector('.btn[onclick*="showFileEditMode"]');
        if (editButton) {
            editButton.style.display = 'none';
        }

        // 设置当前编辑的发票ID
        this.currentEditingInvoiceId = invoiceId;

        // 更新文件按钮状态
        this.updateFileButtonStates(invoiceId);

        // 设置文件操作事件监听器
        this.setupFileEditListeners();
    }

    cancelFileEdit(invoiceId) {
        // 隐藏编辑控件
        const editControls = document.querySelector('.file-edit-controls');
        if (editControls) {
            editControls.style.display = 'none';
        }

        // 隐藏所有文件的编辑按钮
        const editActions = document.querySelectorAll('.file-edit-actions');
        editActions.forEach(action => {
            action.style.display = 'none';
        });

        // 显示编辑文件按钮
        const editButton = document.querySelector('.btn[onclick*="showFileEditMode"]');
        if (editButton) {
            editButton.style.display = 'inline-flex';
        }

        this.currentEditingInvoiceId = null;
    }

    setupFileEditListeners() {
        const modalBody = document.getElementById('invoice-details-modal-body');
        if (!modalBody) return;

        // 移除之前的编辑监听器
        if (this._fileEditClickHandler) {
            modalBody.removeEventListener('click', this._fileEditClickHandler);
        }

        // 添加文件编辑事件监听器
        this._fileEditClickHandler = (e) => {
            const button = e.target.closest('button');
            if (!button) return;

            const fileId = parseInt(button.dataset.fileId);
            const index = parseInt(button.dataset.index);

            if (button.classList.contains('btn-move-up')) {
                this.moveFile(fileId, index, 'up');
            } else if (button.classList.contains('btn-move-down')) {
                this.moveFile(fileId, index, 'down');
            } else if (button.classList.contains('btn-delete-file')) {
                this.deleteFile(fileId);
            } else if (button.classList.contains('btn-save-order')) {
                this.saveFileOrder();
            }
        };

        modalBody.addEventListener('click', this._fileEditClickHandler);
    }

    moveFile(fileId, currentIndex, direction) {
        const container = document.querySelector(`#file-list-container-${this.currentEditingInvoiceId}`);
        if (!container) return;

        const fileItems = Array.from(container.querySelectorAll('.file-item'));
        const currentItem = fileItems[currentIndex];
        
        if (direction === 'up' && currentIndex > 0) {
            const prevItem = fileItems[currentIndex - 1];
            container.insertBefore(currentItem, prevItem);
        } else if (direction === 'down' && currentIndex < fileItems.length - 1) {
            const nextItem = fileItems[currentIndex + 1];
            container.insertBefore(nextItem, currentItem);
        }

        // 更新索引和按钮状态
        this.updateFileIndices(container);
    }

    updateFileIndices(container) {
        const fileItems = container.querySelectorAll('.file-item');
        fileItems.forEach((item, index) => {
            item.dataset.index = index;
            
            const moveUpBtn = item.querySelector('.btn-move-up');
            const moveDownBtn = item.querySelector('.btn-move-down');
            
            if (moveUpBtn) {
                moveUpBtn.dataset.index = index;
                moveUpBtn.disabled = index === 0;
            }
            
            if (moveDownBtn) {
                moveDownBtn.dataset.index = index;
                moveDownBtn.disabled = index === fileItems.length - 1;
            }
        });
    }

    async deleteFile(fileId) {
        if (!confirm('确定要删除这个文件吗？此操作不可撤销。')) {
            return;
        }

        try {
            const response = await fetch(`/admin/invoices/file/${fileId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '删除文件失败');
            }

            // 从界面中移除文件项
            const fileItem = document.querySelector(`[data-file-id="${fileId}"]`);
            const invoiceId = this.currentEditingInvoiceId;
            
            if (fileItem) {
                fileItem.remove();
            }

            // 更新文件索引
            const container = document.querySelector(`#file-list-container-${invoiceId}`);
            if (container) {
                this.updateFileIndices(container);
            }

            this.showSuccess('文件已删除');
            
            // 直接更新视图，而不是重新拉取数据
            this.updateViewAfterFileDelete(fileId, invoiceId);

        } catch (error) {
            console.error('Delete file error:', error);
            this.showError('删除文件失败: ' + error.message);
        }
    }

    async saveFileOrder() {
        const container = document.querySelector(`#file-list-container-${this.currentEditingInvoiceId}`);
        if (!container) return;

        const fileItems = container.querySelectorAll('.file-item');
        const fileOrder = Array.from(fileItems).map((item, index) => ({
            fileId: parseInt(item.dataset.fileId),
            order: index
        }));

        try {
            const response = await fetch(`/admin/invoices/request/${this.currentEditingInvoiceId}/files/reorder`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fileOrder })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '保存文件顺序失败');
            }

            this.showSuccess('文件顺序已保存');
            
            // 刷新列表以确保顺序同步
            await this.loadData();

        } catch (error) {
            console.error('Save file order error:', error);
            this.showError('保存文件顺序失败: ' + error.message);
        }
    }

    async reReviewInvoice(invoiceId) {
        if (!confirm('确定要重新审核这个发票申请吗？重新审核后，申请状态将重置为"待处理"，您可以重新进行审批。')) {
            return;
        }

        try {
            const response = await fetch(`/admin/invoices/request/${invoiceId}/re-review`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '重新审核失败');
            }
            
            this.showSuccess('发票申请已重新设置为待处理状态');
            this.loadData(); // 重新加载数据和统计
            
        } catch (error) {
            console.error('Error re-reviewing invoice:', error);
            this.showError('重新审核失败: ' + error.message);
        }
    }

    showUploadModal(requestId) {
        this.currentUploadRequest = requestId;
        this.selectedFile = null;
        
        // 重置上传区域
        const uploadArea = document.getElementById('upload-area-global');
        if (uploadArea) {
            uploadArea.innerHTML = `
                <i class="fas fa-cloud-upload-alt" style="font-size: 48px; color: var(--gray-400); margin-bottom: 16px;"></i>
                <p style="margin: 0 0 8px 0; font-weight: 500;">点击选择文件或拖拽文件到此处</p>
                <p style="margin: 0; color: var(--gray-500); font-size: 14px;">支持 PDF、JPG、PNG 格式，最大 10MB</p>
            `;
        }
        
        // 重置文件输入和按钮状态
        const fileInput = document.getElementById('file-input-global');
        if (fileInput) {
            fileInput.value = '';
        }
        
        const confirmUpload = document.getElementById('confirm-upload-global');
        if (confirmUpload) {
            confirmUpload.disabled = true;
        }
        
        const uploadProgress = document.getElementById('upload-progress-global');
        if (uploadProgress) {
            uploadProgress.style.display = 'none';
        }
        
        const uploadModal = document.getElementById('invoice-upload-modal-global');
        if (uploadModal) {
            uploadModal.style.display = 'flex';
        }
    }

    hideUploadModal() {
        const uploadModal = document.getElementById('invoice-upload-modal-global');
        if (uploadModal) {
            uploadModal.style.display = 'none';
        }
        this.currentUploadRequest = null;
        this.selectedFile = null;
    }

    // 文件上传成功后直接更新主列表视图
    updateViewAfterFileUpload(newFile, uploadRequestId) {
        // 如果没有传入ID，尝试使用实例变量（向后兼容）
        const invoiceId = uploadRequestId || this.currentUploadRequest;
        
        console.log('updateViewAfterFileUpload called with:', newFile); // 调试日志
        console.log('Looking for invoice row with ID:', invoiceId); // 调试日志
        
        // 更新主列表中对应发票的文件数量显示
        const invoiceRow = document.querySelector(`tr[data-invoice-id="${invoiceId}"]`);
        console.log('Found invoice row:', invoiceRow); // 调试日志
        
        if (invoiceRow) {
            const statusCell = invoiceRow.children[2]; // 状态列
            console.log('Status cell:', statusCell); // 调试日志
            
            const existingFileInfo = statusCell.querySelector('.fas.fa-paperclip');
            console.log('Existing file info:', existingFileInfo); // 调试日志
            
            if (existingFileInfo) {
                // 已有文件信息，更新数量
                const fileInfoDiv = existingFileInfo.parentElement;
                const currentCount = parseInt(fileInfoDiv.textContent.match(/(\d+)\s*个文件/)?.[1]) || 0;
                console.log('Current file count:', currentCount); // 调试日志
                
                fileInfoDiv.innerHTML = `<i class="fas fa-paperclip"></i> ${currentCount + 1} 个文件`;
                console.log('Updated file count to:', currentCount + 1); // 调试日志
            } else {
                // 没有文件信息，添加新的
                console.log('No existing file info, adding new'); // 调试日志
                const statusBadge = statusCell.querySelector('.status-badge');
                console.log('Status badge:', statusBadge); // 调试日志
                
                const fileInfoHtml = `
                    <div style="font-size: 14px; color: var(--green-600); margin-top: 6px;">
                        <i class="fas fa-paperclip"></i> 1 个文件
                    </div>
                `;
                statusBadge.insertAdjacentHTML('afterend', fileInfoHtml);
                console.log('Added new file info'); // 调试日志
            }
        } else {
            console.error('Invoice row not found for ID:', invoiceId); // 调试日志
        }
        
        // 更新内存中的数据（如果有的话）
        if (this.invoices) {
            const invoice = this.invoices.find(inv => inv.id === invoiceId);
            if (invoice) {
                if (!invoice.files) {
                    invoice.files = [];
                }
                invoice.files.push(newFile);
                console.log('Updated invoice data in memory'); // 调试日志
            }
        }
        
        // 如果详情模态框打开，也更新模态框中的文件列表
        this.updateDetailsModalAfterFileUpload(invoiceId, newFile);
        
        // 重新绑定事件监听器
        this.rebindDetailsModalEvents();
    }

    // 文件上传成功后直接更新详情模态框
    updateDetailsModalAfterFileUpload(invoiceId, newFile) {
        const detailsModal = document.getElementById('invoice-details-modal-global');
        if (!detailsModal || detailsModal.style.display !== 'flex') {
            return; // 模态框未打开，无需更新
        }

        // 查找文件列表容器
        let fileListContainer = document.querySelector(`#file-list-container-${invoiceId}`);
        
        // 如果没有找到容器，说明当前是"暂无文件"状态，需要重建文件列表结构
        if (!fileListContainer) {
            const fileListDiv = document.querySelector('.file-list');
            if (fileListDiv) {
                // 检查当前是否在编辑模式下
                const editControls = document.querySelector('.file-edit-controls');
                const isEditMode = editControls && editControls.style.display !== 'none';
                
                // 替换整个文件列表区域
                const fileName = newFile.originalName || `文件_${newFile.id}`;
                const uploadTime = newFile.uploadedAt || new Date().toISOString();
                
                fileListDiv.innerHTML = `
                    <div class="detail-title">
                        <i class="fas fa-paperclip"></i> 发票文件 (1)
                        <button class="btn btn-sm btn-primary" onclick="window.invoiceManagerInstance.showUploadModal(${invoiceId})" style="margin-left: 12px; padding: 4px 8px; font-size: 12px;">
                            <i class="fas fa-plus"></i> 添加文件
                        </button>
                    </div>
                    <div id="file-list-container-${invoiceId}">
                        <div class="file-item" data-file-id="${newFile.id}" data-index="0">
                            <div class="file-info">
                                <i class="fas fa-file-pdf" style="color: var(--red-500);"></i>
                                <span>${fileName}</span>
                                <span style="color: var(--gray-500); font-size: 12px;">
                                    ${new Date(uploadTime).toLocaleString('zh-CN')}
                                </span>
                            </div>
                            <div class="file-actions">
                                <button class="btn btn-sm btn-download" data-file-id="${newFile.id}" data-file-name="${fileName}">
                                    <i class="fas fa-download"></i>
                                    下载
                                </button>
                                <div class="file-edit-actions" style="display: ${isEditMode ? 'flex' : 'none'};">
                                    <button class="btn btn-sm btn-secondary btn-move-up" data-file-id="${newFile.id}" data-index="0" disabled>
                                        <i class="fas fa-arrow-up"></i>
                                    </button>
                                    <button class="btn btn-sm btn-secondary btn-move-down" data-file-id="${newFile.id}" data-index="0">
                                        <i class="fas fa-arrow-down"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger btn-delete-file" data-file-id="${newFile.id}">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="file-edit-controls" style="display: none; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--gray-200);">
                        <div style="margin-bottom: 12px;">
                            <button class="btn btn-primary btn-add-file" onclick="window.invoiceManagerInstance.showUploadModal(${invoiceId})">
                                <i class="fas fa-plus"></i> 添加文件
                            </button>
                            <button class="btn btn-success btn-save-order" data-invoice-id="${invoiceId}">
                                <i class="fas fa-save"></i> 保存顺序
                            </button>
                            <button class="btn btn-secondary btn-cancel-edit" onclick="window.invoiceManagerInstance.cancelFileEdit(${invoiceId})">
                                <i class="fas fa-times"></i> 取消编辑
                            </button>
                        </div>
                    </div>
                `;
                
                // 更新所有文件的按钮状态
                this.updateFileButtonStates(invoiceId);
                return;
            }
        }

        // 如果容器存在，直接添加新文件项
        if (fileListContainer) {
            const fileIndex = fileListContainer.children.length;
            const fileName = newFile.originalName || `文件_${newFile.id}`;
            const uploadTime = newFile.uploadedAt || new Date().toISOString();
            
            // 检查当前是否在编辑模式下
            const editControls = document.querySelector('.file-edit-controls');
            const isEditMode = editControls && editControls.style.display !== 'none';
            
            const newFileHtml = `
                <div class="file-item" data-file-id="${newFile.id}" data-index="${fileIndex}">
                    <div class="file-info">
                        <i class="fas fa-file-pdf" style="color: var(--red-500);"></i>
                        <span>${fileName}</span>
                        <span style="color: var(--gray-500); font-size: 12px;">
                            ${new Date(uploadTime).toLocaleString('zh-CN')}
                        </span>
                    </div>
                    <div class="file-actions">
                        <button class="btn btn-sm btn-download" data-file-id="${newFile.id}" data-file-name="${fileName}">
                            <i class="fas fa-download"></i>
                            下载
                        </button>
                        <div class="file-edit-actions" style="display: ${isEditMode ? 'flex' : 'none'};">
                            <button class="btn btn-sm btn-secondary btn-move-up" data-file-id="${newFile.id}" data-index="${fileIndex}" ${fileIndex === 0 ? 'disabled' : ''}>
                                <i class="fas fa-arrow-up"></i>
                            </button>
                            <button class="btn btn-sm btn-secondary btn-move-down" data-file-id="${newFile.id}" data-index="${fileIndex}">
                                <i class="fas fa-arrow-down"></i>
                            </button>
                            <button class="btn btn-sm btn-danger btn-delete-file" data-file-id="${newFile.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            fileListContainer.insertAdjacentHTML('beforeend', newFileHtml);
            
            // 更新所有文件的按钮状态（索引和disabled状态）
            this.updateFileButtonStates(invoiceId);
            
            // 更新文件数量显示
            const fileCountElement = document.querySelector('.detail-title .fas.fa-paperclip').parentElement;
            if (fileCountElement) {
                const currentText = fileCountElement.textContent;
                const currentCount = parseInt(currentText.match(/\((\d+)\)/)?.[1]) || 0;
                fileCountElement.innerHTML = fileCountElement.innerHTML.replace(/\(\d+\)/, `(${currentCount + 1})`);
            }
        }
    }

    // 更新文件列表中所有上移/下移按钮的 disabled 状态
    updateFileButtonStates(invoiceId) {
        const fileListContainer = document.querySelector(`#file-list-container-${invoiceId}`);
        if (!fileListContainer) return;
        
        const fileItems = fileListContainer.querySelectorAll('.file-item');
        const totalFiles = fileItems.length;
        
        fileItems.forEach((fileItem, index) => {
            // 更新 data-index 属性
            fileItem.setAttribute('data-index', index);
            
            // 更新按钮的 data-index 属性和 disabled 状态
            const moveUpBtn = fileItem.querySelector('.btn-move-up');
            const moveDownBtn = fileItem.querySelector('.btn-move-down');
            
            if (moveUpBtn) {
                moveUpBtn.setAttribute('data-index', index);
                moveUpBtn.disabled = (index === 0); // 第一个文件不能上移
            }
            
            if (moveDownBtn) {
                moveDownBtn.setAttribute('data-index', index);
                moveDownBtn.disabled = (index === totalFiles - 1); // 最后一个文件不能下移
            }
        });
    }

    // 重新绑定详情模态框的事件监听器
    rebindDetailsModalEvents() {
        const modalBody = document.getElementById('invoice-details-modal-body');
        if (!modalBody) return;
        
        // 移除之前的事件监听器
        if (this._detailsModalClickHandler) {
            modalBody.removeEventListener('click', this._detailsModalClickHandler);
        }
        
        // 重新绑定事件监听器
        this._detailsModalClickHandler = (e) => {
            // 注册系统编号链接
            const registrationLink = e.target.closest('.registration-link');
            if (registrationLink) {
                e.preventDefault();
                const registrationId = registrationLink.dataset.registrationId;
                this.showRegistrationDetails(registrationId);
                return;
            }
            
            // 下载按钮
            const downloadBtn = e.target.closest('.btn-download');
            if (downloadBtn) {
                const fileId = parseInt(downloadBtn.dataset.fileId);
                const fileName = downloadBtn.dataset.fileName;
                this.downloadFile(fileId, fileName);
                return;
            }
            
            // 删除按钮
            const deleteBtn = e.target.closest('.btn-delete-file');
            if (deleteBtn) {
                const fileId = parseInt(deleteBtn.dataset.fileId);
                this.deleteFile(fileId);
                return;
            }
            
            // 保存顺序按钮
            const saveOrderBtn = e.target.closest('.btn-save-order');
            if (saveOrderBtn) {
                const invoiceId = parseInt(saveOrderBtn.dataset.invoiceId);
                this.saveFileOrder(invoiceId);
                return;
            }
        };
        
        modalBody.addEventListener('click', this._detailsModalClickHandler);
    }

    // 文件删除成功后直接更新视图
    updateViewAfterFileDelete(deletedFileId, invoiceId) {
        // 更新主列表中对应发票的文件数量显示
        const invoiceRow = document.querySelector(`tr[data-invoice-id="${invoiceId}"]`);
        if (invoiceRow) {
            const statusCell = invoiceRow.children[2]; // 状态列
            const fileInfo = statusCell.querySelector('.fas.fa-paperclip');
            
            if (fileInfo) {
                const fileInfoDiv = fileInfo.parentElement;
                const currentCount = parseInt(fileInfoDiv.textContent.match(/(\d+)\s*个文件/)?.[1]) || 0;
                const newCount = Math.max(0, currentCount - 1);
                
                if (newCount === 0) {
                    // 没有文件了，移除文件信息
                    fileInfoDiv.remove();
                } else {
                    // 更新文件数量
                    fileInfoDiv.innerHTML = `<i class="fas fa-paperclip"></i> ${newCount} 个文件`;
                }
            }
        }
        
        // 更新内存中的数据（如果有的话）
        if (this.invoices) {
            const invoice = this.invoices.find(inv => inv.id === invoiceId);
            if (invoice && invoice.files) {
                invoice.files = invoice.files.filter(file => file.id !== deletedFileId);
            }
        }
        
        // 更新详情模态框中的文件数量显示
        const fileCountElement = document.querySelector('.detail-title .fas.fa-paperclip')?.parentElement;
        if (fileCountElement) {
            const currentText = fileCountElement.textContent;
            const currentCount = parseInt(currentText.match(/\((\d+)\)/)?.[1]) || 0;
            const newCount = Math.max(0, currentCount - 1);
            fileCountElement.innerHTML = fileCountElement.innerHTML.replace(/\(\d+\)/, `(${newCount})`);
            
            // 如果没有文件了，显示占位符
            if (newCount === 0) {
                const fileListContainer = document.querySelector(`#file-list-container-${invoiceId}`);
                if (fileListContainer && fileListContainer.children.length === 0) {
                    const fileListDiv = fileListContainer.closest('.file-list');
                    if (fileListDiv) {
                        fileListDiv.innerHTML = `
                            <div class="detail-title">
                                <i class="fas fa-paperclip"></i> 发票文件 (0)
                                <button class="btn btn-sm btn-primary" onclick="window.invoiceManagerInstance.showUploadModal(${invoiceId})" style="margin-left: 12px; padding: 4px 8px; font-size: 12px;">
                                    <i class="fas fa-plus"></i> 添加文件
                                </button>
                            </div>
                            <div style="text-align: center; padding: 20px; color: var(--gray-500);">
                                <i class="fas fa-file" style="font-size: 24px; margin-bottom: 8px;"></i>
                                <p style="margin: 0;">暂无文件，点击上方按钮添加</p>
                            </div>
                        `;
                    }
                }
            }
        }
        
        // 更新剩余文件的按钮状态（索引和disabled状态）
        this.updateFileButtonStates(invoiceId);
    }

    // 刷新详情模态框的通用方法
    async refreshDetailsModal(invoiceId) {
        const detailsModal = document.getElementById('invoice-details-modal-global');
        if (!detailsModal || detailsModal.style.display !== 'flex') {
            return; // 模态框未打开，无需刷新
        }

        try {
            const response = await fetch(`/admin/invoices/request/${invoiceId}`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                const updatedInvoice = data.request || data;
                
                const modalBody = document.getElementById('invoice-details-modal-body');
                if (modalBody) {
                    modalBody.innerHTML = this.renderInvoiceDetails(updatedInvoice);
                    
                    // 重新绑定事件监听器
                    if (this._detailsModalClickHandler) {
                        modalBody.removeEventListener('click', this._detailsModalClickHandler);
                    }
                    
                    this._detailsModalClickHandler = (e) => {
                        const button = e.target.closest('.btn-download');
                        if (button) {
                            const fileId = parseInt(button.dataset.fileId);
                            const fileName = button.dataset.fileName;
                            this.downloadFile(fileId, fileName);
                        }
                    };
                    
                    modalBody.addEventListener('click', this._detailsModalClickHandler);
                }
            }
        } catch (error) {
            console.warn('刷新详情模态框失败:', error);
        }
    }

    showDetailsModal(invoice) {
        const modalBody = document.getElementById('invoice-details-modal-body');
        if (!modalBody) return;
        
        modalBody.innerHTML = this.renderInvoiceDetails(invoice);
        
        // 移除之前的事件监听器（如果存在）
        if (this._detailsModalClickHandler) {
            modalBody.removeEventListener('click', this._detailsModalClickHandler);
        }
        
        // 为下载按钮和注册链接添加事件监听器，使用箭头函数保持 this 上下文
        this._detailsModalClickHandler = (e) => {
            // 注册系统编号链接
            const registrationLink = e.target.closest('.registration-link');
            if (registrationLink) {
                e.preventDefault();
                const registrationId = registrationLink.dataset.registrationId;
                this.showRegistrationDetails(registrationId);
                return;
            }
            
            // 下载按钮
            const button = e.target.closest('.btn-download');
            if (button) {
                const fileId = parseInt(button.dataset.fileId);
                const fileName = button.dataset.fileName;
                this.downloadFile(fileId, fileName);
            }
        };
        
        modalBody.addEventListener('click', this._detailsModalClickHandler);
        
        // 设置全局实例引用以便模态框中的按钮调用
        window.invoiceManagerInstance = this;
        
        const modal = document.getElementById('invoice-details-modal-global');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    hideDetailsModal() {
        const modal = document.getElementById('invoice-details-modal-global');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    renderInvoiceDetails(invoice) {
        console.log('Rendering invoice details:', invoice); // 添加调试日志
        console.log('Contact info:', {
            contactName: invoice.contactName,
            contactPhone: invoice.contactPhone,
            contactEmail: invoice.contactEmail
        });
        
        // 安全地访问嵌套属性
        const userName = invoice.user?.fullname || invoice.user?.username || '未知用户';
        const userEmail = invoice.user?.email || '未知邮箱';
        const invoiceTitle = invoice.invoiceTitle || '未指定';
        const invoiceType = invoice.invoiceType === 'electronic' ? '电子发票' : '纸质发票';
        const content = invoice.content || '会议注册费用';
        const amount = `${invoice.invoiceAmount || invoice.amount || '0'} ${invoice.invoiceCurrency || 'RMB'}`;
        const requestedAt = invoice.requestedAt || invoice.created_at || new Date().toISOString();
        
        return `
            <div class="detail-grid">
                <div class="detail-section">
                    <div class="detail-title">
                        <i class="fas fa-user"></i> 申请人信息
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">姓名:</span>
                        <span class="detail-value">${userName}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">邮箱:</span>
                        <span class="detail-value">${userEmail}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">申请时间:</span>
                        <span class="detail-value">${new Date(requestedAt).toLocaleString('zh-CN')}</span>
                    </div>
                </div>
                
                ${invoice.contactName || invoice.contactPhone || invoice.contactEmail ? `
                <div class="detail-section">
                    <div class="detail-title">
                        <i class="fas fa-address-card"></i> 联系人信息
                    </div>
                    ${invoice.contactName ? `
                    <div class="detail-row">
                        <span class="detail-label">联系人姓名:</span>
                        <span class="detail-value">${invoice.contactName}</span>
                    </div>
                    ` : ''}
                    ${invoice.contactPhone ? `
                    <div class="detail-row">
                        <span class="detail-label">联系电话:</span>
                        <span class="detail-value">${invoice.contactPhone}</span>
                    </div>
                    ` : ''}
                    ${invoice.contactEmail ? `
                    <div class="detail-row">
                        <span class="detail-label">联系邮箱:</span>
                        <span class="detail-value">${invoice.contactEmail}</span>
                    </div>
                    ` : ''}
                </div>
                ` : ''}
                
                <div class="detail-section">
                    <div class="detail-title">
                        <i class="fas fa-file-invoice"></i> 发票信息
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">发票抬头:</span>
                        <span class="detail-value">${invoiceTitle}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">发票类型:</span>
                        <span class="detail-value">${invoiceType}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">发票类别:</span>
                        <span class="detail-value">${invoice.invoiceCategory === 'vat' ? '增值税专用发票' : '普通发票'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">发票内容:</span>
                        <span class="detail-value">${content}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">发票金额:</span>
                        <span class="detail-value" style="font-weight: 600; color: var(--green-600);">${amount}</span>
                    </div>
                    ${invoice.registrationSystemNo ? `
                    <div class="detail-row">
                        <span class="detail-label">注册系统编号:</span>
                        <span class="detail-value">
                            <a href="#" 
                               class="registration-link" 
                               data-registration-id="${invoice.registrationSystemNo}"
                               style="color: var(--blue-600); text-decoration: none; font-weight: 600; cursor: pointer; transition: all 0.2s ease; border-bottom: 1px dashed var(--blue-400);">
                                #${invoice.registrationSystemNo}
                            </a>
                        </span>
                    </div>
                    ` : ''}
                </div>
                
                ${invoice.taxNumber ? `
                <div class="detail-section">
                    <div class="detail-title">
                        <i class="fas fa-building"></i> 企业信息
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">纳税人识别号:</span>
                        <span class="detail-value">${invoice.taxNumber}</span>
                    </div>
                    ${invoice.invoiceCategory === 'vat' ? `
                        ${invoice.registeredAddress ? `
                        <div class="detail-row">
                            <span class="detail-label">注册地址:</span>
                            <span class="detail-value">${invoice.registeredAddress}</span>
                        </div>
                        ` : ''}
                        ${invoice.registeredPhone ? `
                        <div class="detail-row">
                            <span class="detail-label">注册电话:</span>
                            <span class="detail-value">${invoice.registeredPhone}</span>
                        </div>
                        ` : ''}
                        ${invoice.bankAccount ? `
                        <div class="detail-row">
                            <span class="detail-label">银行账号:</span>
                            <span class="detail-value">${invoice.bankAccount}</span>
                        </div>
                        ` : ''}
                        ${invoice.bankName ? `
                        <div class="detail-row">
                            <span class="detail-label">开户行:</span>
                            <span class="detail-value">${invoice.bankName}</span>
                        </div>
                        ` : ''}
                    ` : ''}
                </div>
                ` : ''}
                
                ${invoice.invoiceType === 'paper' && invoice.mailingAddress ? `
                <div class="detail-section">
                    <div class="detail-title">
                        <i class="fas fa-map-marker-alt"></i> 邮寄信息
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">邮寄地址:</span>
                        <span class="detail-value">${invoice.mailingAddress}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">收件人:</span>
                        <span class="detail-value">${invoice.recipient || '未知'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">联系电话:</span>
                        <span class="detail-value">${invoice.recipientPhone || '未知'}</span>
                    </div>
                </div>
                ` : ''}
            </div>
            
            ${invoice.notes ? `
            <div class="detail-section" style="margin-top: 20px;">
                <div class="detail-title">
                    <i class="fas fa-comment"></i> 用户备注
                </div>
                <p style="margin: 8px 0 0 0; color: var(--gray-700);">${invoice.notes}</p>
            </div>
            ` : ''}
            
            ${invoice.adminNotes ? `
            <div class="detail-section" style="margin-top: 20px;">
                <div class="detail-title">
                    <i class="fas fa-sticky-note"></i> 管理员备注
                </div>
                <p style="margin: 8px 0 0 0; color: var(--gray-700);">${invoice.adminNotes}</p>
            </div>
            ` : ''}
            
            ${invoice.files && invoice.files.length > 0 ? `
            <div class="file-list">
                <div class="detail-title">
                    <i class="fas fa-paperclip"></i> 发票文件 (${invoice.files.length})
                    ${['processing', 'completed'].includes(invoice.status) ? `
                        <button class="btn btn-sm btn-primary" onclick="window.invoiceManagerInstance.showFileEditMode(${invoice.id})" style="margin-left: 12px; padding: 4px 8px; font-size: 12px;">
                            <i class="fas fa-edit"></i> 编辑文件
                        </button>
                    ` : ''}
                </div>
                <div id="file-list-container-${invoice.id}">
                    ${invoice.files.map((file, index) => {
                        const fileName = file.originalName || `文件_${file.id}`;
                        const uploadTime = file.uploadedAt || file.created_at || new Date().toISOString();
                        return `
                        <div class="file-item" data-file-id="${file.id}" data-index="${index}">
                            <div class="file-info">
                                <i class="fas fa-file-pdf" style="color: var(--red-500);"></i>
                                <span>${fileName}</span>
                                <span style="color: var(--gray-500); font-size: 12px;">
                                    ${new Date(uploadTime).toLocaleString('zh-CN')}
                                </span>
                            </div>
                            <div class="file-actions">
                                <button class="btn btn-sm btn-download" data-file-id="${file.id}" data-file-name="${fileName}">
                                    <i class="fas fa-download"></i>
                                    下载
                                </button>
                                <div class="file-edit-actions" style="display: none;">
                                    <button class="btn btn-sm btn-secondary btn-move-up" data-file-id="${file.id}" data-index="${index}" ${index === 0 ? 'disabled' : ''}>
                                        <i class="fas fa-arrow-up"></i>
                                    </button>
                                    <button class="btn btn-sm btn-secondary btn-move-down" data-file-id="${file.id}" data-index="${index}" ${index === invoice.files.length - 1 ? 'disabled' : ''}>
                                        <i class="fas fa-arrow-down"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger btn-delete-file" data-file-id="${file.id}">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
                ${['processing', 'completed'].includes(invoice.status) ? `
                <div class="file-edit-controls" style="display: none; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--gray-200);">
                    <div style="margin-bottom: 12px;">
                        <button class="btn btn-primary btn-add-file" onclick="window.invoiceManagerInstance.showUploadModal(${invoice.id})">
                            <i class="fas fa-plus"></i> 添加文件
                        </button>
                        <button class="btn btn-success btn-save-order" data-invoice-id="${invoice.id}">
                            <i class="fas fa-save"></i> 保存顺序
                        </button>
                        <button class="btn btn-secondary btn-cancel-edit" onclick="window.invoiceManagerInstance.cancelFileEdit(${invoice.id})">
                            <i class="fas fa-times"></i> 取消编辑
                        </button>
                    </div>
                </div>
                ` : ''}
            </div>
            ` : ['processing', 'completed'].includes(invoice.status) ? `
            <div class="file-list">
                <div class="detail-title">
                    <i class="fas fa-paperclip"></i> 发票文件 (0)
                    <button class="btn btn-sm btn-primary" onclick="window.invoiceManagerInstance.showUploadModal(${invoice.id})" style="margin-left: 12px; padding: 4px 8px; font-size: 12px;">
                        <i class="fas fa-plus"></i> 添加文件
                    </button>
                </div>
                <div style="text-align: center; padding: 20px; color: var(--gray-500);">
                    <i class="fas fa-file" style="font-size: 24px; margin-bottom: 8px;"></i>
                    <p style="margin: 0;">暂无文件，点击上方按钮添加</p>
                </div>
            </div>
            ` : ''}

            <!-- 操作按钮区域 -->
            <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--gray-200);">
                <div class="detail-title" style="margin-bottom: 16px;">
                    <i class="fas fa-cogs"></i> 操作选项
                </div>
                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                    ${this.renderModalActionButtons(invoice)}
                </div>
            </div>
        `;
    }

    renderModalActionButtons(invoice) {
        const status = invoice.status || 'pending';
        const invoiceId = invoice.id;
        const buttonStyle = "padding: 8px 16px; font-size: 14px; border-radius: 6px; font-weight: 500; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; border: 1px solid; transition: all 0.2s ease;";
        
        switch (status) {
            case 'pending':
                return `
                    <button class="btn btn-process" data-invoice-id="${invoiceId}" onclick="window.invoiceManagerInstance.updateStatus(${invoiceId}, 'processing'); document.getElementById('invoice-details-modal-global').style.display='none';" style="${buttonStyle} background: var(--blue-500); border-color: var(--blue-500); color: white;">
                        <i class="fas fa-play"></i>
                        开始处理
                    </button>
                    <button class="btn btn-reject" data-invoice-id="${invoiceId}" onclick="window.invoiceManagerInstance.updateStatus(${invoiceId}, 'rejected'); document.getElementById('invoice-details-modal-global').style.display='none';" style="${buttonStyle} background: var(--red-500); border-color: var(--red-500); color: white;">
                        <i class="fas fa-times"></i>
                        拒绝申请
                    </button>
                `;
            case 'processing':
                return `
                    <button class="btn btn-complete" onclick="window.invoiceManagerInstance.updateStatus(${invoiceId}, 'completed'); document.getElementById('invoice-details-modal-global').style.display='none';" style="${buttonStyle} background: var(--green-600); border-color: var(--green-600); color: white;">
                        <i class="fas fa-check"></i>
                        标记完成
                    </button>
                    <button class="btn btn-reject" onclick="window.invoiceManagerInstance.updateStatus(${invoiceId}, 'rejected'); document.getElementById('invoice-details-modal-global').style.display='none';" style="${buttonStyle} background: var(--red-500); border-color: var(--red-500); color: white;">
                        <i class="fas fa-times"></i>
                        拒绝申请
                    </button>
                `;
            case 'completed':
                return `
                    <button class="btn btn-re-review" onclick="window.invoiceManagerInstance.reReviewInvoice(${invoiceId}); document.getElementById('invoice-details-modal-global').style.display='none';" style="${buttonStyle} background: var(--yellow-500); border-color: var(--yellow-500); color: white;">
                        <i class="fas fa-redo"></i>
                        重新审核
                    </button>
                `;
            case 'rejected':
                return `
                    <button class="btn btn-re-review" onclick="window.invoiceManagerInstance.reReviewInvoice(${invoiceId}); document.getElementById('invoice-details-modal-global').style.display='none';" style="${buttonStyle} background: var(--yellow-500); border-color: var(--yellow-500); color: white;">
                        <i class="fas fa-redo"></i>
                        重新审核
                    </button>
                `;
            default:
                return '';
        }
    }

    async downloadFile(fileId, fileName) {
        try {
            console.log('Downloading file:', fileId, fileName); // 添加调试日志
            
            const response = await fetch(`/admin/invoices/download/${fileId}`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Download failed:', response.status, errorText);
                throw new Error('文件下载失败');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName || `file_${fileId}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            this.showSuccess('文件下载成功');
            
        } catch (error) {
            console.error('Download error:', error);
            this.showError('文件下载失败: ' + error.message);
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type) {
        // 创建简单的toast通知
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            background: ${type === 'success' ? '#10b981' : '#ef4444'};
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

    connectedCallback() {
        // 调用父类方法，但父类的 render() 会被子类的 render() 重写
        super.connectedCallback();
        console.log('InvoiceManager component connected, starting initialization...');
        
        // 真实数据加载（稍微延迟以确保 DOM 完全准备）
        setTimeout(async () => {
            try {
                await this.loadData();
            } catch (error) {
                console.error('Failed to load invoice data:', error);
                this.testDataDisplay(); // 如果加载失败，使用测试数据
            }
        }, 300);
    }
    
    testDataDisplay() {
        console.log('InvoiceManager: Using test data display...');
        
        // 设置测试统计数据
        this.statistics = {
            byStatus: { pending: 1, processing: 0, completed: 0, rejected: 0 },
            totalCompleted: 0
        };
        this.updateStatisticsDisplay();
        
        // 设置测试发票数据
        this.invoices = [];
        this.isLoading = false;
        this.updateInvoicesDisplay();
        this.updatePaginationDisplay();
        
        console.log('InvoiceManager: Test data display completed');
    }

    async showRegistrationDetails(registrationId) {
        try {
            console.log('Loading registration details for ID:', registrationId);
            
            const response = await fetch(`/admin/submissions/${registrationId}`, {
                credentials: 'include'
            });
            
            console.log('Registration API response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Registration API error:', response.status, errorText);
                throw new Error('获取注册信息失败');
            }
            
            const data = await response.json();
            console.log('Registration data received:', data);
            
            const registration = data.data || data;
            
            // 显示注册详情模态框
            this.showRegistrationModal(registration);
            
        } catch (error) {
            console.error('Error loading registration details:', error);
            this.showError('获取注册信息失败: ' + error.message);
        }
    }

    showRegistrationModal(registration) {
        console.log('Showing registration modal for:', registration);
        
        // 创建或获取注册详情模态框
        let modal = document.getElementById('registration-details-modal-global');
        if (!modal) {
            console.log('Creating registration modal...');
            this.createRegistrationModal();
            modal = document.getElementById('registration-details-modal-global');
        }
        
        console.log('Modal element:', modal);
        
        // 填充内容
        const modalBody = modal.querySelector('.modal-body');
        console.log('Modal body:', modalBody);
        
        if (modalBody) {
            modalBody.innerHTML = this.renderRegistrationDetails(registration);
            console.log('Modal body content updated');
        }
        
        // 显示模态框
        modal.style.display = 'flex';
        console.log('Modal display set to flex');
    }

    createRegistrationModal() {
        const modal = document.createElement('div');
        modal.id = 'registration-details-modal-global';
        modal.style.display = 'none';
        
        // 添加样式
        const modalStyle = document.createElement('style');
        modalStyle.textContent = `
            #registration-details-modal-global {
                --white: #ffffff;
                --gray-50: #f9fafb;
                --gray-100: #f3f4f6;
                --gray-200: #e5e7eb;
                --gray-300: #d1d5db;
                --gray-400: #9ca3af;
                --gray-500: #6b7280;
                --gray-600: #4b5563;
                --gray-700: #374151;
                --gray-800: #1f2937;
                --gray-900: #111827;
                --blue-500: #3b82f6;
                --blue-600: #2563eb;
                --green-500: #10b981;
                --green-600: #059669;
                --red-500: #ef4444;
                --red-600: #dc2626;
                --yellow-500: #f59e0b;
                --yellow-600: #d97706;
                --radius: 8px;
                --radius-lg: 12px;
                --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
                --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            }

            #registration-details-modal-global .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.6);
                z-index: 9999;
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

            #registration-details-modal-global .modal-content {
                background: var(--white);
                border-radius: 16px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                max-width: 900px;
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

            #registration-details-modal-global .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 24px 24px 16px 24px;
                border-bottom: 1px solid var(--gray-200);
            }

            #registration-details-modal-global .modal-title {
                font-size: 20px;
                font-weight: 600;
                color: var(--gray-900);
                margin: 0;
            }

            #registration-details-modal-global .modal-close {
                background: none;
                border: none;
                padding: 8px;
                cursor: pointer;
                color: var(--gray-400);
                border-radius: 6px;
                transition: all 0.2s ease;
                font-size: 16px;
            }

            #registration-details-modal-global .modal-close:hover {
                background: var(--gray-100);
                color: var(--gray-600);
            }

            #registration-details-modal-global .modal-body {
                padding: 24px;
            }

            #registration-details-modal-global .detail-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 20px;
            }

            #registration-details-modal-global .detail-section {
                border: 1px solid var(--gray-200);
                border-radius: var(--radius);
                padding: 16px;
                background: var(--gray-50);
            }

            #registration-details-modal-global .detail-title {
                font-weight: 600;
                color: var(--gray-900);
                margin-bottom: 12px;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            #registration-details-modal-global .detail-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                font-size: 14px;
                align-items: flex-start;
            }

            #registration-details-modal-global .detail-row:last-child {
                margin-bottom: 0;
            }

            #registration-details-modal-global .detail-label {
                color: var(--gray-600);
                font-weight: 500;
                min-width: 80px;
                flex-shrink: 0;
            }

            #registration-details-modal-global .detail-value {
                color: var(--gray-900);
                font-weight: 500;
                text-align: right;
                word-break: break-word;
            }
        `;
        
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content" style="max-width: 900px;">
                    <div class="modal-header">
                        <h2 class="modal-title">注册信息详情</h2>
                        <button class="modal-close" id="close-registration-details-global">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body" id="registration-details-modal-body">
                        <!-- 详情内容将通过JavaScript填充 -->
                    </div>
                </div>
            </div>
        `;

        modal.appendChild(modalStyle);
        document.body.appendChild(modal);

        // 设置关闭事件
        modal.querySelector('#close-registration-details-global').addEventListener('click', () => {
            modal.style.display = 'none';
        });

        modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
            if (e.target === modal.querySelector('.modal-overlay')) {
                modal.style.display = 'none';
            }
        });
    }

    renderRegistrationDetails(registration) {
        console.log('Rendering registration with data:', registration);
        
        // 提取数据
        const fullName = registration.name || registration.fullName || '未填写';
        const email = registration.email || '未填写';
        const phone = registration.phone || '未提供';
        const affiliation = registration.affiliation || '未填写';
        const paperId = registration.paper_id || '未提供';
        const paperType = registration.paper_type || 'research';
        const paperPages = registration.paper_pages || 0;
        const productCode = registration.product_code || '未知';
        const registrationCategory = registration.registration_category || '未知';
        const paymentMethod = registration.payment_method === 'domestic' ? '国内支付' : '国际支付';
        
        // 费用信息
        const isDomestic = registration.payment_method === 'domestic';
        const totalAmount = isDomestic ? registration.total_amount_rmb : registration.total_amount_usd;
        const currency = isDomestic ? 'RMB' : 'USD';
        const extraPageFee = isDomestic ? registration.extra_page_fee_rmb : registration.extra_page_fee_usd;
        
        // 状态转换
        const statusMap = {
            'pending': '待审核',
            'approved': '已批准',
            'rejected': '已拒绝',
            'paid': '已支付'
        };
        const status = statusMap[registration.status] || registration.status;
        
        // 分类转换
        const categoryMap = {
            'attendee': '仅参会',
            'full': '全额注册'
        };
        const category = categoryMap[registrationCategory] || registrationCategory;
        
        // 时间格式化
        const submissionTime = registration.submission_time 
            ? new Date(registration.submission_time).toLocaleString('zh-CN')
            : '未知';
        const reviewTime = registration.review_time 
            ? new Date(registration.review_time).toLocaleString('zh-CN')
            : '未审核';
        
        return `
            <div class="detail-grid">
                <div class="detail-section">
                    <div class="detail-title">
                        <i class="fas fa-id-card"></i> 基本信息
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">注册编号:</span>
                        <span class="detail-value">#${registration.id}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">姓名:</span>
                        <span class="detail-value">${fullName}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">邮箱:</span>
                        <span class="detail-value">${email}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">手机:</span>
                        <span class="detail-value">${phone}</span>
                    </div>
                    ${affiliation ? `
                    <div class="detail-row">
                        <span class="detail-label">单位/机构:</span>
                        <span class="detail-value">${affiliation}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="detail-section">
                    <div class="detail-title">
                        <i class="fas fa-file-alt"></i> 论文信息
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Paper Type:</span>
                        <span class="detail-value">
                            ${(() => {
                                const typeMap = {
                                    'research': '<span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Research Paper</span>',
                                    'poster': '<span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Poster</span>',
                                    'none': '<span style="background: #f3f4f6; color: #6b7280; padding: 2px 8px; border-radius: 4px; font-size: 12px;">None</span>'
                                };
                                return typeMap[paperType] || typeMap['research'];
                            })()}
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">论文ID:</span>
                        <span class="detail-value">${paperId}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">页数:</span>
                        <span class="detail-value">${paperPages} 页</span>
                    </div>
                    ${extraPageFee > 0 ? `
                    <div class="detail-row">
                        <span class="detail-label">超页费:</span>
                        <span class="detail-value" style="color: var(--red-600);">
                            ${extraPageFee} ${currency}
                        </span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="detail-section">
                    <div class="detail-title">
                        <i class="fas fa-shopping-cart"></i> 注册信息
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">注册类型:</span>
                        <span class="detail-value">${productCode}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">注册类别:</span>
                        <span class="detail-value">${category}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">支付方式:</span>
                        <span class="detail-value">${paymentMethod}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">费用:</span>
                        <span class="detail-value" style="font-weight: 600; color: var(--green-600);">
                            ${totalAmount} ${currency}
                        </span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <div class="detail-title">
                        <i class="fas fa-clock"></i> 时间信息
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">提交时间:</span>
                        <span class="detail-value">${submissionTime}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">审核时间:</span>
                        <span class="detail-value">${reviewTime}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">状态:</span>
                        <span class="detail-value">
                            <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; background: ${
                                registration.status === 'approved' ? '#d1fae5' : 
                                registration.status === 'rejected' ? '#fee2e2' : 
                                '#fef3c7'
                            }; color: ${
                                registration.status === 'approved' ? '#065f46' : 
                                registration.status === 'rejected' ? '#991b1b' : 
                                '#92400e'
                            };">
                                ${status}
                            </span>
                        </span>
                    </div>
                    ${registration.is_refunded ? `
                    <div class="detail-row">
                        <span class="detail-label">退款状态:</span>
                        <span class="detail-value" style="color: var(--red-600);">已退款</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            ${registration.review_notes ? `
            <div class="detail-section" style="margin-top: 20px;">
                <div class="detail-title">
                    <i class="fas fa-comment"></i> 审核备注
                </div>
                <p style="margin: 8px 0 0 0; color: var(--gray-700);">${registration.review_notes}</p>
            </div>
            ` : ''}
        `;
    }

    /**
     * 导出发票申请为CSV文件（UTF-8 with BOM）
     */
    async exportPendingInvoices() {
        try {
            // 显示加载提示
            const exportBtn = this.shadowRoot.getElementById('export-pending-btn');
            if (exportBtn) {
                exportBtn.disabled = true;
                exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 导出中...';
            }

            // 获取所有发票申请（不限制状态）
            const response = await fetch('/admin/invoices/requests?limit=10000', {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('获取发票申请失败');
            }

            const data = await response.json();
            const pendingInvoices = data.requests || [];

            if (pendingInvoices.length === 0) {
                this.showError('暂无发票申请');
                return;
            }

            // 定义CSV列头（与弹窗显示字段一致）
            const headers = [
                '发票ID',
                '发票状态',
                'Paper ID',
                '姓名',
                '邮箱',
                '申请时间',
                '联系人姓名',
                '联系电话',
                '联系邮箱',
                '发票抬头',
                '发票类型',
                '发票类别',
                '发票内容',
                '发票金额',
                '币种',
                '注册系统编号',
                '纳税人识别号',
                '注册地址',
                '注册电话',
                '银行账号',
                '开户行',
                '邮寄地址',
                '收件人',
                '收件人电话',
                '用户备注'
            ];

            // 准备CSV数据
            const csvRows = [];
            
            // 添加列头
            csvRows.push(headers.join(','));

            // 添加数据行
            for (const invoice of pendingInvoices) {
                const invoiceId = invoice.id || '';
                const invoiceStatus = (() => {
                    const statusMap = {
                        pending: '待处理',
                        processing: '处理中',
                        completed: '已完成',
                        rejected: '已拒绝'
                    };
                    return statusMap[invoice.status] || invoice.status || '';
                })();
                const paperId = invoice.registration?.paper_id || '';
                const userName = invoice.user?.fullname || invoice.user?.username || '';
                const userEmail = invoice.user?.email || '';
                const requestedAt = invoice.requestedAt || invoice.created_at || '';
                const contactName = invoice.contactName || '';
                const contactPhone = invoice.contactPhone || '';
                const contactEmail = invoice.contactEmail || '';
                const invoiceTitle = invoice.invoiceTitle || '';
                const invoiceType = invoice.invoiceType === 'electronic' ? '电子发票' : '纸质发票';
                const invoiceCategory = invoice.invoiceCategory === 'vat' ? '增值税专用发票' : '普通发票';
                const content = invoice.content || '';
                const invoiceAmount = invoice.invoiceAmount || invoice.amount || '0';
                const currency = invoice.invoiceCurrency || 'RMB';
                const registrationSystemNo = invoice.registrationSystemNo || '';
                const taxNumber = invoice.taxNumber || '';
                const registeredAddress = invoice.registeredAddress || '';
                const registeredPhone = invoice.registeredPhone || '';
                const bankAccount = invoice.bankAccount || '';
                const bankName = invoice.bankName || '';
                const mailingAddress = invoice.mailingAddress || '';
                const recipient = invoice.recipient || '';
                const recipientPhone = invoice.recipientPhone || '';
                const notes = invoice.notes || '';

                const row = [
                    this.escapeCSV(invoiceId),
                    this.escapeCSV(invoiceStatus),
                    this.escapeCSV(paperId),
                    this.escapeCSV(userName),
                    this.escapeCSV(userEmail),
                    this.escapeCSV(new Date(requestedAt).toLocaleString('zh-CN')),
                    this.escapeCSV(contactName),
                    this.escapeCSVAsText(contactPhone),  // 强制为文本
                    this.escapeCSV(contactEmail),
                    this.escapeCSV(invoiceTitle),
                    this.escapeCSV(invoiceType),
                    this.escapeCSV(invoiceCategory),
                    this.escapeCSV(content),
                    this.escapeCSV(invoiceAmount),
                    this.escapeCSV(currency),
                    this.escapeCSVAsText(registrationSystemNo),  // 强制为文本
                    this.escapeCSVAsText(taxNumber),  // 强制为文本
                    this.escapeCSV(registeredAddress),
                    this.escapeCSVAsText(registeredPhone),  // 强制为文本
                    this.escapeCSVAsText(bankAccount),  // 强制为文本
                    this.escapeCSV(bankName),
                    this.escapeCSV(mailingAddress),
                    this.escapeCSV(recipient),
                    this.escapeCSVAsText(recipientPhone),  // 强制为文本
                    this.escapeCSV(notes)
                ];

                csvRows.push(row.join(','));
            }

            // 生成CSV内容，添加UTF-8 BOM
            const BOM = '\uFEFF';
            const csvContent = BOM + csvRows.join('\n');

            // 创建下载链接
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            // 生成文件名：发票申请_YYYYMMDD_HHMMSS.csv
            const now = new Date();
            const timestamp = now.getFullYear() + 
                            String(now.getMonth() + 1).padStart(2, '0') + 
                            String(now.getDate()).padStart(2, '0') + '_' +
                            String(now.getHours()).padStart(2, '0') + 
                            String(now.getMinutes()).padStart(2, '0') + 
                            String(now.getSeconds()).padStart(2, '0');
            link.download = `发票申请_${timestamp}.csv`;
            
            // 触发下载
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            this.showSuccess(`成功导出 ${pendingInvoices.length} 条发票申请`);

        } catch (error) {
            console.error('导出失败:', error);
            this.showError('导出失败: ' + error.message);
        } finally {
            // 恢复按钮状态
            const exportBtn = this.shadowRoot.getElementById('export-pending-btn');
            if (exportBtn) {
                exportBtn.disabled = false;
                exportBtn.innerHTML = '<i class="fas fa-file-export"></i> 导出';
            }
        }
    }

    /**
     * 转义CSV字段（处理逗号、引号、换行符）
     */
    escapeCSV(value) {
        if (value === null || value === undefined) {
            return '';
        }
        
        // 转换为字符串
        const str = String(value);
        
        // 如果包含逗号、引号或换行符，需要用引号包裹，并转义引号
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        
        return str;
    }

    /**
     * 转义CSV字段并强制标记为文本格式（防止Excel将数字字符串转为数值）
     * 使用制表符前缀的方式，这是最兼容的方法
     */
    escapeCSVAsText(value) {
        if (value === null || value === undefined || value === '') {
            return '';
        }
        
        // 转换为字符串
        const str = String(value);
        
        // 在字符串前添加制表符，强制Excel识别为文本
        // 同时处理可能包含的特殊字符
        const textValue = '\t' + str;
        
        // 如果包含逗号、引号或换行符，需要用引号包裹，并转义引号
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return `"${textValue.replace(/"/g, '""')}"`;
        }
        
        return `"${textValue}"`;
    }

    disconnectedCallback() {
        // 清理全局模态框
        this.removeGlobalModals();
        
        // 调用父类清理方法
        if (super.disconnectedCallback) {
            super.disconnectedCallback();
        }
    }
}

// 只在尚未注册时才注册组件
if (!customElements.get('invoice-manager')) {
    customElements.define('invoice-manager', InvoiceManager);
}

export default InvoiceManager;
