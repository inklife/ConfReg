import BaseComponent from '../core/base-component.js';
import SharedStylesLoader from '../utils/shared-styles-loader.js';

/**
 * 注册管理组件 - 现代极简风格
 * 显示和管理用户注册信息，采用Material Design + Flat Design
 */
class SubmissionManager extends BaseComponent {
    constructor() {
        super();
        this.submissions = [];
        this.currentFilter = '';
        this.currentSort = 'created_desc';
        this.isLoading = false;
        this.currentPage = 1;
        this.pageSize = 5;
        this.totalPages = 0;
        this.currentSubmissionId = null;
        this.hasReceivedParameters = false;
        this.initialLoadTimeout = null;
        this.isSettingFilter = false; // 防止重复设置过滤器
        this.searchTerm = ''; // 添加搜索词属性
    }

    async render() {
        // 重置状态标记，确保每次渲染时都是清洁状态
        this.hasReceivedParameters = false;
        this.isSettingFilter = false;
        
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
            
            /* 注册管理组件特定样式 */
            .submissions-content .data-table td:nth-child(4),  /* 产品代码 */
            .submissions-content .data-table td:nth-child(5),  /* 价格 */
            .submissions-content .data-table td:nth-child(6),  /* 状态 */
            .submissions-content .data-table td:nth-child(7),  /* 提交时间 */
            .submissions-content .data-table td:nth-child(8) { /* 操作 */
                white-space: normal;
                overflow: visible;
                text-overflow: initial;
            }

            /* 注册类别角标 */
            .category-badge {
                display: inline-flex;
                align-items: center;
                padding: 2px 6px;
                margin-right: 6px;
                border-radius: 9999px;
                font-size: 11px;
                font-weight: 700;
                line-height: 1;
                vertical-align: middle;
                user-select: none;
            }

            .category-full {
                background: #e0f2fe; /* light blue */
                color: #0369a1;      /* deep blue */
                border: 1px solid #7dd3fc;
            }

            /* 手机端隐藏特定列 */
            @media (max-width: 768px) {
                .submissions-content .data-table th:nth-child(4),
                .submissions-content .data-table td:nth-child(4),
                .submissions-content .data-table th:nth-child(7),
                .submissions-content .data-table td:nth-child(7) {
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
                        <i class="fas fa-file-alt" style="color: #3b82f6;"></i>
                        注册管理
                    </h1>
                    <p class="page-subtitle">管理用户注册信息和审核状态</p>
                </div> -->

                <!-- 工具栏 -->
                <div class="toolbar">
                    <div class="toolbar-left">
                        <div class="search-filters">
                            <select class="filter-select" id="status-filter">
                                <option value="">全部状态</option>
                                <option value="pending">待审核</option>
                                <option value="approved">已通过</option>
                                <option value="rejected">已拒绝</option>
                                <option value="refunded">已退款</option>
                            </select>
                            <input type="text" class="search-input" id="search-input" placeholder="搜索姓名、邮箱或 Paper ID...">
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
                <div class="content-area submissions-content">
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th style="width: 14%;">姓名</th>
                                    <th style="width: 14%;">邮箱</th>
                                    <th style="width: 14%;">机构</th>
                                    <th style="width: 12%;">Paper ID</th>
                                    <th style="width: 10%;">产品代码</th>
                                    <th style="width: 8%;">总价</th>
                                    <th style="width: 8%;">状态</th>
                                    <th style="width: 9%;">提交时间</th>
                                    <th style="width: 11%;">操作</th>
                                </tr>
                            </thead>
                            <tbody id="submissions-tbody">
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
            </div>
        `;

        // 应用基础样式
        const baseStyleElement = this.createBaseStyles();
        if (baseStyleElement) {
            this.shadowRoot.appendChild(baseStyleElement);
        }
        this.shadowRoot.appendChild(container);

        // 等待下一个tick确保DOM渲染完成
        await new Promise(resolve => setTimeout(resolve, 0));

        this.bindEvents();
        
        // 延迟初始加载，给参数传递一些时间
        this.scheduleInitialLoad();
    }

    scheduleInitialLoad() {
        // 设置一个短暂延迟，等待可能的参数传递
        this.initialLoadTimeout = setTimeout(() => {
            if (!this.hasReceivedParameters) {
                this.loadSubmissions();
            }
        }, 200); // 200ms延迟，确保在参数传递(100ms)之后
    }

    bindEvents() {
        // 监听来自仪表盘的参数事件
        document.addEventListener('page-params', (e) => {
            if (e.detail.page === 'submissions' || e.detail.originalPage === 'submission-manager') {
                // 如果是新的导航，重置所有状态
                if (e.detail.isNewNavigation === true) {
                    this.hasReceivedParameters = false;
                    this.isSettingFilter = false;
                }
                
                // 防止重复处理同一个事件
                if (this.hasReceivedParameters && e.detail.isNewNavigation !== true) {
                    return;
                }
                
                this.hasReceivedParameters = true;
                
                // 取消默认的初始加载
                if (this.initialLoadTimeout) {
                    clearTimeout(this.initialLoadTimeout);
                    this.initialLoadTimeout = null;
                }
                
                const { params } = e.detail;
                if (params && params.filter) {
                    this.setFilter(params.filter);
                } else {
                    // 即使没有过滤参数，也需要加载数据
                    this.loadSubmissions();
                }
            }
        });

        // 状态筛选
        const statusFilter = this.shadowRoot.getElementById('status-filter');
        statusFilter?.addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.currentPage = 1;
            this.loadSubmissions();
        });

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
            
            // 移除实时搜索，避免数据闪烁
            // 现在只在回车或点击搜索按钮时搜索
        }
        
        // 搜索按钮
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.performSearch();
            });
        }

        // 刷新按钮（保留原有功能）
        const refreshBtn = this.shadowRoot.getElementById('refresh-btn');
        refreshBtn?.addEventListener('click', () => {
            this.loadSubmissions();
        });

        // 分页按钮
        const prevBtn = this.shadowRoot.getElementById('prev-page');
        const nextBtn = this.shadowRoot.getElementById('next-page');
        const jumpBtn = this.shadowRoot.getElementById('page-jump-btn');
        const jumpInput = this.shadowRoot.getElementById('page-jump-input');

        prevBtn?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadSubmissions();
            }
        });

        nextBtn?.addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.loadSubmissions();
            }
        });

        jumpBtn?.addEventListener('click', () => {
            const page = parseInt(jumpInput.value);
            if (page >= 1 && page <= this.totalPages) {
                this.currentPage = page;
                this.loadSubmissions();
            }
        });

        jumpInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                jumpBtn?.click();
            }
        });
    }

    disconnectedCallback() {
        // 清理超时
        if (this.initialLoadTimeout) {
            clearTimeout(this.initialLoadTimeout);
            this.initialLoadTimeout = null;
        }
        
        // 重置状态，为下次连接做准备
        this.hasReceivedParameters = false;
        this.isSettingFilter = false;
    }

    performSearch() {
        const searchInput = this.shadowRoot.getElementById('search-input');
        if (searchInput) {
            const newSearchTerm = (searchInput.value || '').trim();
            // 只在搜索词真正改变时才执行搜索
            if (newSearchTerm !== this.searchTerm) {
                this.searchTerm = newSearchTerm;
                this.currentPage = 1;
                this.loadSubmissions();
            }
        }
    }

    async loadSubmissions() {
        this.isLoading = true;
        this.showLoadingState();

        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.pageSize,
                sort: this.currentSort
            });

            if (this.currentFilter) {
                params.append('status', this.currentFilter);
            }

            if (this.searchTerm) {
                params.append('search', this.searchTerm);
            }

            const response = await fetch(`/admin/submissions?${params}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to load submissions');
            }

            const data = await response.json();
            
            if (data.success) {
                this.submissions = data.data.submissions || [];
                const pagination = data.data.pagination || {};
                this.totalPages = pagination.total || 1;
                
                this.renderSubmissions();
                this.updatePagination();
            } else {
                throw new Error(data.message || '加载数据失败');
            }
        } catch (error) {
            console.error('Error loading submissions:', error);
            this.showError('加载数据失败，请稍后重试');
        } finally {
            this.isLoading = false;
        }
    }

    renderSubmissions() {
        const tbody = this.shadowRoot.getElementById('submissions-tbody');
        if (!tbody) return;

        if (this.submissions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <h3>暂无数据</h3>
                        <p>当前筛选条件下没有找到注册记录</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.submissions.map(submission => {
            // 根据支付方式显示对应的总价和货币
            const isDomestic = submission.payment_method === 'domestic';
            const amount = isDomestic 
                ? (submission.total_amount_rmb || submission.product_price_rmb || '0')
                : (submission.total_amount_usd || submission.product_price || '0');
            const currency = isDomestic ? 'RMB' : 'USD';
            const priceDisplay = `${parseFloat(amount).toFixed(2)} ${currency}`;
            
            // 确定显示状态：如果已退款，优先显示退款状态
            const displayStatus = submission.is_refunded ? 'refunded' : submission.status;
            
            return `
            <tr>
                <td class="text-ellipsis" title="${submission.name || submission.fullname || submission.realname || '未提供'}">${submission.name || submission.fullname || submission.realname || '未提供'}</td>
                <td class="text-ellipsis" title="${submission.email || '未提供'}">${submission.email || '未提供'}</td>
                <td class="text-ellipsis" title="${submission.affiliation || '未提供'}">${submission.affiliation || '未提供'}</td>
                <td class="text-ellipsis" title="${submission.paper_id || '未提供'}">${submission.paper_id || '未提供'}</td>
                <td>
                    ${submission.registration_category === 'full' ? '<span class="category-badge category-full">FULL</span>' : ''}
                    ${submission.product_code || '未知'}
                </td>
                <td>${priceDisplay}</td>
                <td>
                    <span class="status-badge status-${displayStatus}">
                        ${this.getStatusText(displayStatus)}
                    </span>
                </td>
                <td>
                    <div class="submission-date">
                        ${this.formatDate(submission.submission_time || submission.created_at)}
                    </div>
                </td>
                <td>
                    <button class="btn btn-primary btn-sm view-submission-btn" data-submission-id="${submission.id}">
                        <i class="fas fa-eye"></i>
                        查看
                    </button>
                </td>
            </tr>
        `;
        }).join('');
        
        // 添加事件监听器
        this.addRowEventListeners();
    }

    addRowEventListeners() {
        const tbody = this.shadowRoot.getElementById('submissions-tbody');
        
        // 查看按钮
        tbody.querySelectorAll('.view-submission-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const submissionId = btn.getAttribute('data-submission-id');
                this.viewSubmission(submissionId);
            });
        });
    }

    showLoadingState() {
        const tbody = this.shadowRoot.getElementById('submissions-tbody');
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>正在加载数据...</p>
                </td>
            </tr>
        `;
    }

    showError(message) {
        const tbody = this.shadowRoot.getElementById('submissions-tbody');
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state">
                    <i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i>
                    <h3>加载失败</h3>
                    <p>${message}</p>
                </td>
            </tr>
        `;
    }

    updatePagination() {
        const paginationInfo = this.shadowRoot.getElementById('pagination-info');
        const prevBtn = this.shadowRoot.getElementById('prev-page');
        const nextBtn = this.shadowRoot.getElementById('next-page');
        const jumpInput = this.shadowRoot.getElementById('page-jump-input');

        if (paginationInfo) {
            const total = this.totalPages || 1;
            paginationInfo.textContent = `第 ${this.currentPage} 页，共 ${total} 页`;
        }

        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
        }

        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= this.totalPages;
        }

        if (jumpInput) {
            jumpInput.max = this.totalPages;
            jumpInput.placeholder = this.currentPage.toString();
        }
    }

    getStatusText(status) {
        const statusMap = {
            'pending': '待审核',
            'approved': '已通过',
            'rejected': '已拒绝',
            'refunded': '已退款'
        };
        return statusMap[status] || '未知';
    }

    // 注册类别中文映射：full -> 全额注册；attendee -> 参会注册；其他保持原文
    getRegistrationCategoryText(category) {
        if (!category) return '';
        const value = String(category).toLowerCase();
        if (value === 'full') return '全额注册';
        if (value === 'attendee') return '参会注册';
        return category; // 其他英文保持原样
    }

    formatDate(dateString) {
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
        } catch (error) {
            return '无效日期';
        }
    }

    // 查看详情方法（全局暴露）
    async viewSubmission(submissionId) {
        try {
            const response = await fetch(`/admin/submissions/${submissionId}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch submission details');
            }

            const data = await response.json();
            if (data.success) {
                this.createAndShowModal(data.data);
            } else {
                alert('获取详情失败：' + (data.message || '未知错误'));
            }
        } catch (error) {
            console.error('Error fetching submission details:', error);
            alert('获取详情失败，请稍后重试');
        }
    }

    createAndShowModal(submission) {
        // 移除现有的模态框
        const existingModal = document.getElementById('submission-modal-global');
        if (existingModal) {
            existingModal.remove();
        }

        // 创建新的模态框
        const modal = document.createElement('div');
        modal.id = 'submission-modal-global';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">
                            注册详情
                            <span class="id-badge">ID: ${submission.id}</span>
                        </h2>
                        <button class="modal-close close-modal-btn">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        ${this.generateModalContent(submission)}
                    </div>
                    <div class="modal-actions">
                        ${submission.status === 'pending' ? `
                            <button class="btn btn-success approve-submission-btn" data-submission-id="${submission.id}" 
                                    style="background: #10b981 !important; color: white !important; border: none !important;">
                                <i class="fas fa-check"></i>
                                批准
                            </button>
                            <button class="btn btn-danger reject-submission-btn" data-submission-id="${submission.id}">
                                <i class="fas fa-times"></i>
                                拒绝
                            </button>
                        ` : ''}
                        ${(submission.status === 'approved' || submission.status === 'rejected') ? `
                            <button class="btn btn-warning re-review-submission-btn" data-submission-id="${submission.id}">
                                <i class="fas fa-redo"></i>
                                重新审核
                            </button>
                        ` : ''}
                        <div class="delete-trigger-area" style="margin-right: auto;"></div>
                        <button class="btn btn-danger-outline delete-submission-btn" data-submission-id="${submission.id}" 
                                style="margin-right: auto; display: none;">
                            <i class="fas fa-trash-alt"></i>
                            删除注册
                        </button>
                        <button class="btn btn-secondary close-modal-btn">
                            关闭
                        </button>
                    </div>
                </div>
            </div>
        `;

        // 添加模态框样式
        const modalStyle = document.createElement('style');
        modalStyle.textContent = `
            #submission-modal-global .modal-overlay {
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

            #submission-modal-global .modal-content {
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

            #submission-modal-global .modal-header {
                padding: 20px 24px 0 24px;
                border-bottom: 1px solid #e5e7eb;
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
                flex-shrink: 0;
            }

            #submission-modal-global .modal-title {
                font-size: 20px;
                font-weight: 600;
                color: #111827;
                margin: 0;
                display: flex;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
            }

            #submission-modal-global .modal-close {
                background: none;
                border: none;
                font-size: 24px;
                color: #6b7280;
                cursor: pointer;
                padding: 8px;
                border-radius: 8px;
                transition: all 0.2s ease;
            }

            #submission-modal-global .modal-close:hover {
                background: #f3f4f6;
                color: #374151;
            }

            #submission-modal-global .modal-body {
                padding: 0 24px 16px 24px;
                overflow-y: auto;
                flex: 1;
                min-height: 0;
            }

            #submission-modal-global .detail-item {
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 1px solid #f3f4f6;
            }

            #submission-modal-global .detail-item:last-child {
                border-bottom: none;
                margin-bottom: 0;
            }

            #submission-modal-global .detail-label {
                font-size: 12px;
                color: #6b7280;
                font-weight: 500;
                margin-bottom: 2px;
                text-transform: uppercase;
                letter-spacing: 0.025em;
            }

            #submission-modal-global .detail-value {
                font-size: 14px;
                color: #111827;
                font-weight: 500;
            }

            #submission-modal-global .modal-actions {
                padding: 16px 24px;
                background: #f9fafb;
                border-top: 1px solid #e5e7eb;
                display: flex;
                gap: 12px;
                justify-content: flex-end;
                flex-shrink: 0;
            }

            #submission-modal-global .btn {
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

            /* 图片相关样式 */
            #submission-modal-global .detail-group {
                margin-bottom: 16px;
                padding-bottom: 12px;
                border-bottom: 2px solid #f3f4f6;
            }

            #submission-modal-global .detail-group:last-child {
                border-bottom: none;
                margin-bottom: 0;
            }

            #submission-modal-global .detail-group-title {
                font-size: 16px;
                font-weight: 600;
                color: #374151;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;
            }

            #submission-modal-global .detail-group-title i {
                color: #3b82f6;
            }

            #submission-modal-global .detail-group-title small {
                color: #6b7280;
                font-weight: 400;
                font-size: 13px;
            }

            #submission-modal-global .id-badge {
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

            #submission-modal-global .image-container {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-top: 12px;
            }

            #submission-modal-global .image-item {
                text-align: center;
            }

            #submission-modal-global .image-item .detail-label {
                margin-bottom: 8px;
                font-size: 13px;
            }

            #submission-modal-global .image-preview {
                width: 100%;
                max-width: 200px;
                height: 150px;
                object-fit: cover;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
                display: block;
                margin: 0 auto;
            }

            #submission-modal-global .image-preview:hover {
                transform: scale(1.05);
                border-color: #3b82f6;
                box-shadow: 0 8px 25px rgba(59, 130, 246, 0.15);
            }

            #submission-modal-global .pixel-voyager-link {
                display: block;
                text-decoration: none;
            }

            #submission-modal-global .no-image {
                width: 100%;
                max-width: 200px;
                height: 150px;
                background: #f9fafb;
                border: 2px dashed #d1d5db;
                border-radius: 8px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: #9ca3af;
                font-size: 13px;
                margin: 0 auto;
                text-align: center;
                gap: 4px;
            }

            /* PDF 预览样式 */
            #submission-modal-global .pdf-link {
                display: block;
                text-decoration: none;
            }

            #submission-modal-global .pdf-preview {
                width: 100%;
                max-width: 200px;
                height: 150px;
                background: linear-gradient(135deg, #fee2e2 0%, #fef3c7 100%);
                border: 2px solid #fca5a5;
                border-radius: 8px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s ease;
                margin: 0 auto;
            }

            #submission-modal-global .pdf-preview:hover {
                transform: scale(1.05);
                border-color: #dc2626;
                box-shadow: 0 8px 25px rgba(220, 38, 38, 0.15);
                background: linear-gradient(135deg, #fecaca 0%, #fef3c7 100%);
            }

            #submission-modal-global .pdf-preview i {
                transition: transform 0.3s ease;
            }

            #submission-modal-global .pdf-preview:hover i {
                transform: translateY(-4px);
            }

            #submission-modal-global .image-loading {
                width: 100%;
                max-width: 200px;
                height: 150px;
                background: #f9fafb;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #6b7280;
                font-size: 13px;
                margin: 0 auto;
            }

            #submission-modal-global .image-loading::before {
                content: '';
                width: 20px;
                height: 20px;
                border: 2px solid #e5e7eb;
                border-top: 2px solid #3b82f6;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-right: 8px;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            #submission-modal-global .detail-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 12px;
            }

            #submission-modal-global .detail-item .detail-value {
                word-break: break-word;
                word-wrap: break-word;
                overflow-wrap: break-word;
                max-width: 100%;
                line-height: 1.4;
            }

            /* 时间信息样式 */
            #submission-modal-global .time-info-container {
                display: flex;
                flex-wrap: wrap;
                gap: 16px;
                padding: 12px 16px;
                background: #f9fafb;
                border-radius: 8px;
                border: 1px solid #e5e7eb;
            }

            #submission-modal-global .time-item {
                display: flex;
                align-items: center;
                gap: 8px;
                white-space: nowrap;
            }

            #submission-modal-global .time-label {
                font-size: 13px;
                color: #6b7280;
                font-weight: 500;
            }

            #submission-modal-global .time-value {
                font-size: 14px;
                color: #111827;
                font-weight: 600;
                background: white;
                padding: 4px 8px;
                border-radius: 4px;
                border: 1px solid #d1d5db;
            }
                text-decoration: none;
                white-space: nowrap;
            }

            #submission-modal-global .btn-success {
                background: #10b981;
                color: white;
            }

            #submission-modal-global .btn-success:hover {
                background: #059669;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            }

            #submission-modal-global .btn-danger {
                background: #ef4444;
                color: white;
            }

            #submission-modal-global .btn-danger:hover {
                background: #dc2626;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
            }

            #submission-modal-global .btn-warning {
                background: #f59e0b;
                color: white;
            }

            #submission-modal-global .btn-warning:hover {
                background: #d97706;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
            }

            #submission-modal-global .btn-secondary {
                background: #f3f4f6;
                color: #374151;
                border: 1px solid #d1d5db;
            }

            #submission-modal-global .btn-secondary:hover {
                background: #e5e7eb;
                border-color: #9ca3af;
            }

            #submission-modal-global .btn-danger-outline {
                background: white;
                color: #dc2626;
                border: 2px solid #dc2626;
            }

            #submission-modal-global .btn-danger-outline:hover {
                background: #dc2626;
                color: white;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
            }

            #submission-modal-global .delete-trigger-area {
                width: 100px;
                height: 42px;
                cursor: default;
                flex-shrink: 0;
            }

            #submission-modal-global .status-badge {
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

            #submission-modal-global .status-pending {
                background: #fef3c7;
                color: #92400e;
            }

            #submission-modal-global .status-approved {
                background: #d1fae5;
                color: #065f46;
            }

            #submission-modal-global .status-rejected {
                background: #fee2e2;
                color: #991b1b;
            }

            #submission-modal-global .status-refunded {
                background: #f3e8ff;
                color: #6b21a8;
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

            /* 响应式设计 */
            @media (max-width: 768px) {
                #submission-modal-global .modal-content {
                    margin: 10px;
                    max-height: 90vh;
                }

                #submission-modal-global .detail-grid {
                    grid-template-columns: 1fr;
                    gap: 12px;
                }

                #submission-modal-global .modal-header {
                    padding: 20px 20px 0 20px;
                }

                #submission-modal-global .modal-body {
                    padding: 0 20px 20px 20px;
                }

                #submission-modal-global .modal-actions {
                    padding: 12px 20px;
                    flex-direction: column;
                }

                #submission-modal-global .modal-actions .btn {
                    width: 100%;
                    justify-content: center;
                }
            }

            @media (max-width: 480px) {
                #submission-modal-global .detail-grid {
                    grid-template-columns: 1fr;
                }
                
                #submission-modal-global .image-container {
                    grid-template-columns: 1fr;
                }
            }
        `;

        modal.appendChild(modalStyle);
        document.body.appendChild(modal);

        // 点击背景关闭模态框
        modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                modal.remove();
            }
        });

        // ESC键关闭模态框
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        // 添加模态框按钮事件监听器
        this.addModalEventListeners(modal, submission);
        
        // 设置图片处理
        this.setupImageHandlers(modal);
        
        // 初始化 PixelVoyager 图片查看器
        this.initializePixelVoyager(modal);
    }

    // 验证批准检查清单
    validateApprovalChecklist() {
        const modal = document.getElementById('submission-modal-global');
        if (!modal) return true; // 如果没有模态框，直接通过
        
        const checkboxes = modal.querySelectorAll('.checklist-checkbox');
        if (checkboxes.length === 0) return true; // 如果没有检查项，直接通过
        
        // 检查是否所有复选框都被选中
        return Array.from(checkboxes).every(cb => cb.checked);
    }

    // 生成检查清单项
    generateChecklistItems(submission) {
        const items = [
            {
                id: 'payment-received',
                label: '是否到账',
                hint: '确认款项已到账'
            },
            {
                id: 'registration-type-valid',
                label: '注册类型是否符合',
                hint: '覆盖paper的必须是full registration'
            },
            {
                id: 'early-bird-price',
                label: '价格是否是早鸟价',
                hint: '到账时间31日前适用早鸟价'
            },
            {
                id: 'identity-documents',
                label: '身份证明材料是否齐全',
                hint: '检查学生证、IEEE会员等证明文件'
            },
            {
                id: 'paper-id-valid',
                label: 'Paper ID是否在收录论文列表中',
                hint: '如适用，验证论文ID的有效性'
            }
        ];

        return items.map(item => `
            <div class="checklist-item">
                <label class="checklist-label">
                    <input type="checkbox" class="checklist-checkbox" data-check-id="${item.id}">
                    <span class="checklist-text">
                        <strong>${item.label}</strong>
                        <small>${item.hint}</small>
                    </span>
                </label>
            </div>
        `).join('');
    }

    generateModalContent(submission) {
        return `
            <!-- 基本信息 -->
            <div class="detail-group" style="margin-bottom: 0;">
                <h4 class="detail-group-title">
                    <i class="fas fa-user"></i>
                    基本信息
                </h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-label">姓名</div>
                        <div class="detail-value">${this.escapeHtml(submission.name || submission.fullname || submission.realname || '未填写')}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">邮箱</div>
                        <div class="detail-value">${this.escapeHtml(submission.email || '未填写')}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">机构</div>
                        <div class="detail-value">${this.escapeHtml(submission.affiliation || '未填写')}</div>
                    </div>
                </div>
            </div>

            <!-- 注册信息 -->
            <div class="detail-group" style="margin-bottom: 0;">
                <h4 class="detail-group-title">
                    <i class="fas fa-ticket-alt"></i>
                    注册信息
                </h4>
                <div class="detail-grid" style="margin-bottom: 0; gap: 8px;">
                    <div class="detail-item" style="margin-bottom: 0;">
                        <div class="detail-label">Paper ID</div>
                        <div class="detail-value">${this.escapeHtml(submission.paper_id || '未填写')}</div>
                    </div>
                    <div class="detail-item" style="margin-bottom: 0;">
                        <div class="detail-label">Paper Type</div>
                        <div class="detail-value">
                            ${(() => {
                                const paperType = submission.paper_type;
                                const typeMap = {
                                    'research': '<span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px;">Research Paper</span>',
                                    'poster': '<span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px;">Poster</span>',
                                    'none': '<span style="background: #f3f4f6; color: #6b7280; padding: 2px 8px; border-radius: 4px;">None</span>',
                                    'undefined': '<span style="background: #fecaca; color: #991b1b; padding: 2px 8px; border-radius: 4px;">未定义 (undefined)</span>',
                                    'null': '<span style="background: #fed7aa; color: #9a3412; padding: 2px 8px; border-radius: 4px;">空值 (null)</span>',
                                    '': '<span style="background: #e5e7eb; color: #374151; padding: 2px 8px; border-radius: 4px;">空字符串</span>'
                                };
                                // 直接检查真实值，不使用默认值
                                if (paperType === null) {
                                    return typeMap['null'];
                                } else if (paperType === undefined) {
                                    return typeMap['undefined'];
                                } else if (paperType === '') {
                                    return typeMap[''];
                                } else if (typeMap[paperType]) {
                                    return typeMap[paperType];
                                } else {
                                    return `<span style="background: #fee2e2; color: #7f1d1d; padding: 2px 8px; border-radius: 4px;">未知类型: ${this.escapeHtml(String(paperType))}</span>`;
                                }
                            })()}
                        </div>
                    </div>
                    <div class="detail-item" style="margin-bottom: 0;">
                        <div class="detail-label">注册类别</div>
                        <div class="detail-value">${this.escapeHtml(this.getRegistrationCategoryText(submission.registration_category) || '未知')}</div>
                    </div>
                    <div class="detail-item" style="margin-bottom: 0;">
                        <div class="detail-label">产品代码</div>
                        <div class="detail-value">
                            <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">
                                ${this.escapeHtml(submission.product_code || 'N/A')}
                            </code>
                        </div>
                    </div>
                    <div class="detail-item" style="margin-bottom: 0;">
                        <div class="detail-label">基础价格</div>
                        <div class="detail-value" style="color: #059669; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                            <span id="price-display-${submission.id}">
                                ${(() => {
                                    const isDomestic = submission.payment_method === 'domestic';
                                    const amount = isDomestic 
                                        ? (submission.product_price_rmb || 0)
                                        : (submission.product_price || 0);
                                    const currency = isDomestic ? 'RMB' : 'USD';
                                    return `${parseFloat(amount).toFixed(2)} ${currency}`;
                                })()}
                            </span>
                            <button 
                                class="btn btn-sm btn-outline-primary edit-price-btn" 
                                data-submission-id="${submission.id}"
                                style="padding: 2px 8px; font-size: 12px; border-radius: 4px; border: 1px solid #3b82f6; color: #3b82f6; background: white; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;"
                                title="编辑价格"
                            >
                                <i class="fas fa-edit" style="font-size: 11px;"></i>
                                编辑
                            </button>
                        </div>
                    </div>
                    <div class="detail-item" style="margin-bottom: 0;">
                        <div class="detail-label">论文页数</div>
                        <div class="detail-value">
                            ${submission.paper_pages ? `${submission.paper_pages} 页` : '未填写'}
                        </div>
                    </div>
                    <div class="detail-item" style="margin-bottom: 0;">
                        <div class="detail-label">超页费用</div>
                        <div class="detail-value" style="color: ${(submission.extra_page_fee_usd > 0 || submission.extra_page_fee_rmb > 0) ? '#dc2626' : '#6b7280'};">
                            ${(() => {
                                const isDomestic = submission.payment_method === 'domestic';
                                const extraFee = isDomestic 
                                    ? (submission.extra_page_fee_rmb || 0)
                                    : (submission.extra_page_fee_usd || 0);
                                const currency = isDomestic ? 'RMB' : 'USD';
                                return extraFee > 0 
                                    ? `${parseFloat(extraFee).toFixed(2)} ${currency}`
                                    : '无';
                            })()}
                        </div>
                    </div>
                    <div class="detail-item" style="margin-bottom: 0;">
                        <div class="detail-label">总价</div>
                        <div class="detail-value" style="color: #059669; font-weight: 700; font-size: 16px;">
                            ${(() => {
                                const isDomestic = submission.payment_method === 'domestic';
                                const totalAmount = isDomestic 
                                    ? (submission.total_amount_rmb || 0)
                                    : (submission.total_amount_usd || 0);
                                const currency = isDomestic ? 'RMB' : 'USD';
                                return `${parseFloat(totalAmount).toFixed(2)} ${currency}`;
                            })()}
                        </div>
                    </div>
                    <div class="detail-item" style="margin-bottom: 0;">
                        <div class="detail-label">状态</div>
                        <div class="detail-value">
                            <span class="status-badge status-${submission.is_refunded ? 'refunded' : (submission.status || 'pending')}">
                                ${this.getStatusText(submission.is_refunded ? 'refunded' : submission.status)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 时间信息 -->
            <div class="detail-group" style="padding-bottom: 0; margin-bottom: 0;">
                <h4 class="detail-group-title">
                    <i class="fas fa-clock"></i>
                    时间/备注
                </h4>
                <div class="time-info-container">
                    <div class="time-item">
                        <span class="time-label">提交时间:</span>
                        <span class="time-value">${this.formatDate(submission.submission_time || submission.created_at)}</span>
                    </div>
                    ${submission.review_time ? `
                        <div class="time-item">
                            <span class="time-label">审核时间:</span>
                            <span class="time-value">${this.formatDate(submission.review_time)}</span>
                        </div>
                    ` : ''}
                </div>
                ${submission.review_notes ? `
                    <div class="detail-item" style="margin-top: 12px;">
                        <div class="detail-label">审核备注</div>
                        <div class="detail-value">${this.escapeHtml(submission.review_notes)}</div>
                    </div>
                ` : ''}
                <div class="detail-item" style="margin-top: 12px;">
                    <div class="detail-label" style="display: flex; align-items: center; gap: 8px;">
                        凭证附言
                        <button 
                            class="btn btn-sm btn-outline-primary edit-payment-instructions-btn" 
                            data-submission-id="${submission.id}"
                            style="padding: 2px 8px; font-size: 12px; border-radius: 4px; border: 1px solid #3b82f6; color: #3b82f6; background: white; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;"
                            title="编辑凭证附言"
                        >
                            <i class="fas fa-edit" style="font-size: 11px;"></i>
                            编辑
                        </button>
                        ${!submission.payment_instructions ? `<span style="color: #9ca3af; font-size: 13px; font-weight: 400;">暂无</span>` : ''}
                    </div>
                    ${submission.payment_instructions ? `<div id="payment-instructions-display-${submission.id}" style="color: #374151; white-space: pre-wrap; margin-top: 4px; font-size: 14px;">${this.escapeHtml(submission.payment_instructions)}</div>` : `<div id="payment-instructions-display-${submission.id}" style="display: none;"></div>`}
                </div>
            </div>

            <!-- 支付凭证 -->
            ${(submission.screenshot || submission.proof) ? `
                <div class="detail-group">
                    <h4 class="detail-group-title">
                        <i class="fas fa-receipt"></i>
                        支付凭证
                        <small>（点击可查看完整文件）</small>
                    </h4>
                    <div class="image-container">
                        ${submission.screenshot ? `
                            <div class="image-item">
                                <div class="detail-label">支付截图</div>
                                <a href="/uploads/${submission.screenshot}" target="_blank" class="pixel-voyager-link">
                                    <img src="/uploads/${submission.screenshot}" 
                                         class="image-preview" 
                                         alt="支付截图" 
                                         title="点击放大查看"
                                         loading="lazy">
                                </a>
                            </div>
                        ` : ''}
                        ${submission.proof ? `
                            <div class="image-item">
                                <div class="detail-label">证明文件</div>
                                ${this.isProofPdf(submission.proof) ? `
                                    <a href="/uploads/${submission.proof}" target="_blank" class="pdf-link">
                                        <div class="pdf-preview">
                                            <i class="fas fa-file-pdf" style="font-size: 48px; color: #dc2626;"></i>
                                            <div style="margin-top: 12px; font-size: 14px; color: #374151; font-weight: 500;">PDF 文档</div>
                                            <div style="margin-top: 4px; font-size: 12px; color: #6b7280;">点击在新标签页中打开</div>
                                        </div>
                                    </a>
                                ` : `
                                    <a href="/uploads/${submission.proof}" target="_blank" class="pixel-voyager-link">
                                        <img src="/uploads/${submission.proof}" 
                                             class="image-preview" 
                                             alt="证明文件" 
                                             title="点击放大查看"
                                             loading="lazy">
                                    </a>
                                `}
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}

            <!-- 批准检查项 -->
            ${submission.status === 'pending' ? `
                <div class="detail-group" id="approval-checklist-section">
                    <h4 class="detail-group-title" style="color: #dc2626;">
                        <i class="fas fa-clipboard-check"></i>
                        批准前检查清单
                        <small style="color: #6b7280; font-weight: 400;">（所有项目必须勾选才能批准）</small>
                    </h4>
                    <div class="checklist-container">
                        ${this.generateChecklistItems(submission)}
                    </div>
                </div>
            ` : ''}
        `;
    }

    addModalEventListeners(modal, submission) {
        // 关闭按钮
        modal.querySelectorAll('.close-modal-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.remove();
            });
        });

        // 批准按钮
        modal.querySelectorAll('.approve-submission-btn').forEach(btn => {
            // 添加悬停效果
            btn.addEventListener('mouseenter', () => {
                btn.style.background = '#059669 !important';
                btn.style.transform = 'translateY(-1px)';
                btn.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
            });
            
            btn.addEventListener('mouseleave', () => {
                btn.style.background = '#10b981 !important';
                btn.style.transform = 'translateY(0)';
                btn.style.boxShadow = 'none';
            });
            
            btn.addEventListener('click', () => {
                const submissionId = btn.getAttribute('data-submission-id');
                this.approveSubmission(submissionId);
            });
        });

        // 拒绝按钮
        modal.querySelectorAll('.reject-submission-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const submissionId = btn.getAttribute('data-submission-id');
                this.rejectSubmission(submissionId);
            });
        });

        // 重新审核按钮
        modal.querySelectorAll('.re-review-submission-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const submissionId = btn.getAttribute('data-submission-id');
                this.reReviewSubmission(submissionId);
            });
        });

        // 删除触发区域 - 双击显示删除按钮
        const deleteTriggerArea = modal.querySelector('.delete-trigger-area');
        const deleteBtn = modal.querySelector('.delete-submission-btn');
        
        if (deleteTriggerArea && deleteBtn) {
            deleteTriggerArea.addEventListener('dblclick', () => {
                // 隐藏触发区域
                deleteTriggerArea.style.display = 'none';
                // 显示删除按钮
                deleteBtn.style.display = 'inline-flex';
            });
        }

        // 删除按钮
        modal.querySelectorAll('.delete-submission-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const submissionId = btn.getAttribute('data-submission-id');
                this.deleteSubmission(submissionId);
            });
        });

        // 编辑价格按钮
        modal.querySelectorAll('.edit-price-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const submissionId = btn.getAttribute('data-submission-id');
                this.editPrice(submissionId);
            });
        });

        // 编辑凭证附言按钮
        modal.querySelectorAll('.edit-payment-instructions-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const submissionId = btn.getAttribute('data-submission-id');
                this.editPaymentInstructions(submissionId);
            });
        });
    }

    // 显示批准前的检查清单弹窗
    async showApprovalChecklist(submissionId) {
        // 获取提交信息
        const submission = this.submissions.find(s => s.id === submissionId);
        if (!submission) {
            alert('未找到注册信息');
            return false;
        }

        return new Promise((resolve) => {
            // 创建检查清单弹窗
            const checklistModal = this.createChecklistModal(submission, resolve);
            document.body.appendChild(checklistModal);
        });
    }

    // 创建检查清单弹窗
    createChecklistModal(submission, resolve) {
        const modal = document.createElement('div');
        modal.id = 'approval-checklist-modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>批准前检查清单</h3>
                        <button class="close-btn" type="button">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p style="margin-bottom: 20px; color: #6b7280; font-size: 14px;">
                            请仔细检查以下项目，所有项目必须勾选才能批准注册申请。
                        </p>
                        <div class="checklist-container">
                            <!-- 检查项将在这里添加 -->
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary cancel-btn">取消</button>
                        <button class="btn btn-success confirm-btn" disabled>确认批准</button>
                    </div>
                </div>
            </div>
        `;

        // 添加事件监听器（下一步实现）
        this.setupChecklistModalEvents(modal, submission, resolve);
        
        return modal;
    }

    // 全局方法：批准
    async approveSubmission(submissionId) {
        // 检查是否所有检查项都已勾选
        const allChecked = this.validateApprovalChecklist();
        if (!allChecked) {
            alert('请完成下方所有检查项后再批准');
            return;
        }

        const notes = prompt('请输入批准备注（可选）:');
        if (notes === null) return; // 用户点击了取消

        if (!confirm('确定要批准这个注册申请吗？')) return;

        try {
            const response = await fetch(`/admin/submissions/${submissionId}/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ notes: notes || '' })
            });

            const data = await response.json();
            if (data.success) {
                alert('批准成功');
                const modal = document.getElementById('submission-modal-global');
                if (modal) modal.remove();
                this.loadSubmissions();
            } else {
                alert('批准失败：' + (data.message || '未知错误'));
            }
        } catch (error) {
            console.error('Error approving submission:', error);
            alert('批准失败，请稍后重试');
        }
    }

    // 全局方法：拒绝
    async rejectSubmission(submissionId) {
        const notes = prompt('请输入拒绝原因（可选）:');
        if (notes === null) return; // 用户点击了取消

        if (!confirm('确定要拒绝这个注册申请吗？')) return;

        try {
            const response = await fetch(`/admin/submissions/${submissionId}/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ notes: notes || '' })
            });

            const data = await response.json();
            if (data.success) {
                alert('拒绝成功');
                const modal = document.getElementById('submission-modal-global');
                if (modal) modal.remove();
                this.loadSubmissions();
            } else {
                alert('拒绝失败：' + (data.message || '未知错误'));
            }
        } catch (error) {
            console.error('Error rejecting submission:', error);
            alert('拒绝失败，请稍后重试');
        }
    }

    // 全局方法：重新审核
    async reReviewSubmission(submissionId) {
        if (!confirm('确定要重新审核这个注册申请吗？')) return;

        try {
            const response = await fetch(`/admin/submissions/${submissionId}/re-review`, {
                method: 'POST',
                credentials: 'include'
            });

            const data = await response.json();
            if (data.success) {
                alert('已重新设置为待审核状态');
                const modal = document.getElementById('submission-modal-global');
                if (modal) modal.remove();
                this.loadSubmissions();
            } else {
                alert('重新审核失败：' + (data.message || '未知错误'));
            }
        } catch (error) {
            console.error('Error re-reviewing submission:', error);
            alert('重新审核失败，请稍后重试');
        }
    }

    // 全局方法：编辑价格
    async editPrice(submissionId) {
        try {
            // 从 API 获取最新的提交信息
            const response = await fetch(`/admin/submissions/${submissionId}`, {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                alert('❌ 获取注册信息失败');
                return;
            }

            const result = await response.json();
            if (!result.success || !result.data) {
                alert('❌ 未找到注册信息');
                return;
            }

            const submission = result.data;
            const isDomestic = submission.payment_method === 'domestic';
            const currentPrice = isDomestic 
                ? (submission.product_price_rmb || 0)
                : (submission.product_price || 0);
            const currency = isDomestic ? 'RMB' : 'USD';

            // 提示用户输入新价格
            const newPriceStr = prompt(
                `当前价格：${parseFloat(currentPrice).toFixed(2)} ${currency}\n\n` +
                `请输入新的${currency}价格：`,
                parseFloat(currentPrice).toFixed(2)
            );

            // 用户取消
            if (newPriceStr === null) return;

            // 验证输入
            const newPrice = parseFloat(newPriceStr);
            if (isNaN(newPrice) || newPrice < 0) {
                alert('❌ 请输入有效的非负数价格');
                return;
            }

            // 确认更新
            if (!confirm(`确定要将价格从 ${parseFloat(currentPrice).toFixed(2)} ${currency} 更新为 ${newPrice.toFixed(2)} ${currency} 吗？`)) {
                return;
            }

            // 调用API更新价格
            const updateData = isDomestic 
                ? { price_rmb: newPrice }
                : { price_usd: newPrice };

            const updateResponse = await fetch(`/admin/submissions/${submissionId}/price`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(updateData)
            });

            const data = await updateResponse.json();
            if (data.success) {
                alert('✅ 价格更新成功');
                
                // 更新本地数据
                const submissionIndex = this.submissions.findIndex(s => s.id == submissionId);
                if (submissionIndex !== -1) {
                    if (isDomestic) {
                        this.submissions[submissionIndex].product_price_rmb = newPrice;
                        this.submissions[submissionIndex].total_amount_rmb = newPrice + (parseFloat(this.submissions[submissionIndex].extra_page_fee_rmb) || 0);
                    } else {
                        this.submissions[submissionIndex].product_price = newPrice;
                        this.submissions[submissionIndex].total_amount_usd = newPrice + (parseFloat(this.submissions[submissionIndex].extra_page_fee_usd) || 0);
                    }
                }

                // 更新弹窗中的显示（在全局 modal 中查找）
                const globalModal = document.getElementById('submission-modal-global');
                if (globalModal) {
                    const priceDisplay = globalModal.querySelector(`#price-display-${submissionId}`);
                    if (priceDisplay) {
                        // 只显示基础价格，不包含超页费用
                        priceDisplay.textContent = `${parseFloat(newPrice).toFixed(2)} ${currency}`;
                    }
                }

                // 重新加载列表以确保数据同步
                this.loadSubmissions();
            } else {
                alert('❌ 价格更新失败：' + (data.message || '未知错误'));
            }
        } catch (error) {
            console.error('Error updating price:', error);
            alert('❌ 价格更新失败，请稍后重试');
        }
    }

    // 全局方法：编辑凭证附言
    async editPaymentInstructions(submissionId) {
        try {
            // 从 API 获取最新的提交信息
            const response = await fetch(`/admin/submissions/${submissionId}`, {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                alert('❌ 获取注册信息失败');
                return;
            }

            const result = await response.json();
            if (!result.success || !result.data) {
                alert('❌ 未找到注册信息');
                return;
            }

            const submission = result.data;
            const currentInstructions = submission.payment_instructions || '';

            // 提示用户输入凭证附言
            const newInstructions = prompt(
                '请输入凭证附言（Payment Instructions）：\n\n' +
                '此字段用于记录与支付凭证相关的备注信息。',
                currentInstructions
            );

            // 用户取消
            if (newInstructions === null) return;

            // 调用API更新凭证附言
            const updateResponse = await fetch(`/admin/submissions/${submissionId}/payment-instructions`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ payment_instructions: newInstructions })
            });

            const data = await updateResponse.json();
            if (data.success) {
                alert('✅ 凭证附言更新成功');
                
                // 更新本地数据
                const submissionIndex = this.submissions.findIndex(s => s.id == submissionId);
                if (submissionIndex !== -1) {
                    this.submissions[submissionIndex].payment_instructions = newInstructions;
                }

                // 更新弹窗中的显示（在全局 modal 中查找）
                const globalModal = document.getElementById('submission-modal-global');
                if (globalModal) {
                    const instructionsDisplay = globalModal.querySelector(`#payment-instructions-display-${submissionId}`);
                    // 查找"暂无"标签（在编辑按钮后面的 span）
                    const editBtn = globalModal.querySelector(`.edit-payment-instructions-btn[data-submission-id="${submissionId}"]`);
                    const emptyLabel = editBtn ? editBtn.nextElementSibling : null;
                    
                    if (instructionsDisplay) {
                        if (newInstructions.trim()) {
                            instructionsDisplay.textContent = newInstructions;
                            instructionsDisplay.style.display = 'block';
                            instructionsDisplay.style.color = '#374151';
                            instructionsDisplay.style.whiteSpace = 'pre-wrap';
                            instructionsDisplay.style.marginTop = '4px';
                            instructionsDisplay.style.fontSize = '14px';
                            instructionsDisplay.className = '';
                            // 隐藏"暂无"标签
                            if (emptyLabel && emptyLabel.tagName === 'SPAN') {
                                emptyLabel.style.display = 'none';
                            }
                        } else {
                            instructionsDisplay.style.display = 'none';
                            // 显示"暂无"标签
                            if (emptyLabel && emptyLabel.tagName === 'SPAN') {
                                emptyLabel.style.display = 'inline';
                            } else if (editBtn) {
                                // 如果不存在则创建
                                const newLabel = document.createElement('span');
                                newLabel.style.cssText = 'color: #9ca3af; font-size: 13px; font-weight: 400;';
                                newLabel.textContent = '暂无';
                                editBtn.after(newLabel);
                            }
                        }
                    }
                }

                // 重新加载列表以确保数据同步
                this.loadSubmissions();
            } else {
                alert('❌ 凭证附言更新失败：' + (data.message || '未知错误'));
            }
        } catch (error) {
            console.error('Error updating payment instructions:', error);
            alert('❌ 凭证附言更新失败，请稍后重试');
        }
    }

    // 全局方法：删除注册（高危操作）
    async deleteSubmission(submissionId) {
        // 第一次确认
        if (!confirm('⚠️ 警告：删除操作不可恢复！\n\n确定要删除这条注册记录吗？')) {
            return;
        }

        // 要求输入确认文本
        const confirmationText = prompt(
            '这是一个高危操作，删除后将无法恢复！\n\n' +
            '如果确定要删除，请在下方输入【确认删除】四个字：'
        );

        // 检查是否取消或输入为空
        if (confirmationText === null || confirmationText.trim() === '') {
            return;
        }

        // 验证确认文本
        if (confirmationText.trim() !== '确认删除') {
            alert('❌ 确认文本不正确，删除操作已取消');
            return;
        }

        try {
            const response = await fetch(`/admin/submissions/${submissionId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ confirmation: confirmationText.trim() })
            });

            const data = await response.json();
            if (data.success) {
                alert('✅ 注册记录已成功删除');
                const modal = document.getElementById('submission-modal-global');
                if (modal) modal.remove();
                this.loadSubmissions();
            } else {
                alert('❌ 删除失败：' + (data.message || '未知错误'));
            }
        } catch (error) {
            console.error('Error deleting submission:', error);
            alert('❌ 删除失败，请稍后重试');
        }
    }

    setupImageHandlers(modal) {
        const images = modal.querySelectorAll('.image-preview');
        
        images.forEach(img => {
            // 设置初始状态
            img.style.opacity = '0';
            img.style.transition = 'opacity 0.3s ease';
            
            // 成功加载
            img.addEventListener('load', () => {
                img.style.opacity = '1';
            });
            
            // 加载失败
            img.addEventListener('error', () => {
                const container = img.closest('.image-item');
                if (container) {
                    // 从图片 src 中提取文件名
                    const fileName = this.extractFileName(img.src);
                    
                    container.innerHTML = `
                        <div class="detail-label">${img.alt}</div>
                        <div class="no-image">
                            <i class="fas fa-exclamation-triangle" style="color: #f59e0b; margin-bottom: 8px; font-size: 16px;"></i>
                            <div>图片加载失败</div>
                            <small style="color: #9ca3af; display: block; margin-top: 4px;">文件：${fileName}</small>
                            <small style="color: #9ca3af;">请检查文件是否存在</small>
                        </div>
                    `;
                }
            });
        });
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

    getStatusText(status) {
        const statusMap = {
            'pending': '待审核',
            'approved': '已通过',
            'rejected': '已拒绝',
            'refunded': '已退款'
        };
        return statusMap[status] || '未知';
    }

    // 设置筛选状态（用于从外部设置筛选条件）
    setFilter(filterValue) {
        // 防止重复调用
        if (this.isSettingFilter || this.currentFilter === filterValue) {
            return;
        }
        
        this.isSettingFilter = true;
        
        // 更新内部状态
        this.currentFilter = filterValue;
        this.currentPage = 1;
        
        // 更新筛选选择框的值
        const statusFilter = this.shadowRoot.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.value = filterValue;
        }
        
        // 重新加载数据
        this.loadSubmissions().finally(() => {
            this.isSettingFilter = false;
        });
    }

    formatDate(dateString) {
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
        } catch (error) {
            return '无效日期';
        }
    }

    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    extractFileName(url) {
        if (!url) return '未知文件';
        
        try {
            // 从 URL 中提取文件名
            const urlParts = url.split('/');
            const fileName = urlParts[urlParts.length - 1];
            
            // 如果有查询参数，去除它们
            const cleanFileName = fileName.split('?')[0];
            
            return cleanFileName || '未知文件';
        } catch (error) {
            return '未知文件';
        }
    }

    // 判断文件是否为 PDF
    isProofPdf(filename) {
        if (!filename) return false;
        
        try {
            // 获取文件扩展名
            const ext = filename.toLowerCase().split('.').pop();
            return ext === 'pdf';
        } catch (error) {
            return false;
        }
    }
}

// 注册组件
customElements.define('submission-manager', SubmissionManager);

// 全局暴露方法以供模态框使用
window.viewSubmission = (submissionId) => {
    const manager = document.querySelector('submission-manager');
    if (manager) {
        manager.viewSubmission(submissionId);
    }
};

window.approveSubmission = (submissionId) => {
    const manager = document.querySelector('submission-manager');
    if (manager) {
        manager.approveSubmission(submissionId);
    }
};

window.rejectSubmission = (submissionId) => {
    const manager = document.querySelector('submission-manager');
    if (manager) {
        manager.rejectSubmission(submissionId);
    }
};

window.reReviewSubmission = (submissionId) => {
    const manager = document.querySelector('submission-manager');
    if (manager) {
        manager.reReviewSubmission(submissionId);
    }
};

window.deleteSubmission = (submissionId) => {
    const manager = document.querySelector('submission-manager');
    if (manager) {
        manager.deleteSubmission(submissionId);
    }
};

export default SubmissionManager;
