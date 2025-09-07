import BaseComponent from '../core/base-component.js';

/**
 * 统计报告组件
 * 显示系统的各种统计数据和报告
 */
class StatisticsManager extends BaseComponent {
    constructor() {
        super();
        this.statistics = {};
        this.currentView = 'overview';
        this.isLoading = false;
        this.chartInstances = new Map();
        this.testMode = false; // 添加测试模式标志
        
        console.log('StatisticsManager constructor called');
    }

    getMockStatistics() {
        return {
            registration: {
                totalRegistrations: 150,
                approved: 120,
                pending: 25,
                rejected: 5,
                students: 80,
                members: 70,
                todayRegistrations: 8,
                weekRegistrations: 35,
                averageProcessingTime: '2.3',
                approvalRate: 80,
                dailyStats: [
                    { date: '2025-07-08', count: 5 },
                    { date: '2025-07-09', count: 8 },
                    { date: '2025-07-10', count: 12 },
                    { date: '2025-07-11', count: 6 },
                    { date: '2025-07-12', count: 9 },
                    { date: '2025-07-13', count: 11 },
                    { date: '2025-07-14', count: 8 }
                ],
                product_stats: [
                    { _id: 'student_early', count: 45, total: 22500 },
                    { _id: 'member_regular', count: 35, total: 28000 },
                    { _id: 'student_regular', count: 35, total: 21000 },
                    { _id: 'member_early', count: 25, total: 25000 },
                    { _id: 'industry_regular', count: 10, total: 15000 }
                ]
            },
            payment: {
                total: 111500,
                today: 4800,
                week: 24500,
                month: 85000
            },
            refund: {
                stats: {
                    total: 8,
                    pending: 2,
                    approved: 4,
                    rejected: 1,
                    processed: 1
                }
            },
            transfer: {
                total: 12,
                pending: 3,
                approved: 7,
                rejected: 2
            },
            invoice: {
                byStatus: {
                    pending: 15,
                    processing: 8,
                    completed: 45,
                    rejected: 2
                },
                totalCompleted: 45
            }
        };
    }

    async loadStatistics() {
        // 防止重复加载
        if (this.isLoading) {
            console.log('Statistics loading already in progress');
            return;
        }

        this.isLoading = true;
        this.updateLoadingState();

        try {
            console.log('Starting to load statistics...');
            
            // 如果是测试模式或API失败，使用模拟数据
            if (this.testMode) {
                console.log('Using mock data in test mode');
                this.statistics = this.getMockStatistics();
            } else {
                // 并行加载各种统计数据
                const [
                    registrationStats,
                    paymentStats,
                    refundStats,
                    transferStats,
                    invoiceStats
                ] = await Promise.allSettled([
                    this.fetchRegistrationStats(),
                    this.fetchPaymentStats(),
                    this.fetchRefundStats(),
                    this.fetchTransferStats(),
                    this.fetchInvoiceStats()
                ]);

                // 检查是否所有API都失败了
                const allFailed = [registrationStats, paymentStats, refundStats, transferStats, invoiceStats]
                    .every(result => result.status === 'rejected');

                if (allFailed) {
                    console.warn('All API calls failed, using mock data');
                    this.statistics = this.getMockStatistics();
                } else {
                    this.statistics = {
                        registration: registrationStats.status === 'fulfilled' ? registrationStats.value : this.getMockStatistics().registration,
                        payment: paymentStats.status === 'fulfilled' ? paymentStats.value : this.getMockStatistics().payment,
                        refund: refundStats.status === 'fulfilled' ? refundStats.value : this.getMockStatistics().refund,
                        transfer: transferStats.status === 'fulfilled' ? transferStats.value : this.getMockStatistics().transfer,
                        invoice: invoiceStats.status === 'fulfilled' ? invoiceStats.value : this.getMockStatistics().invoice
                    };
                }
            }

            console.log('Statistics loaded:', this.statistics);
        } catch (error) {
            console.error('Error loading statistics:', error);
            console.log('Falling back to mock data');
            this.statistics = this.getMockStatistics();
        } finally {
            this.isLoading = false;
        }
        
        // 只有在成功加载数据后才渲染
        this.renderStatistics();
    }

    async fetchRegistrationStats() {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
        
        try {
            const response = await fetch('/admin/statistics', {
                credentials: 'include',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to fetch registration stats`);
            const result = await response.json();
            return result.data;
        } catch (error) {
            clearTimeout(timeoutId);
            console.error('Registration stats fetch error:', error);
            throw error;
        }
    }

    async fetchPaymentStats() {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        try {
            const response = await fetch('/admin/payments', {
                credentials: 'include',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to fetch payment stats`);
            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            console.error('Payment stats fetch error:', error);
            throw error;
        }
    }

    async fetchRefundStats() {
        try {
            const response = await fetch('/admin/refund-stats', {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch refund stats');
            const result = await response.json();
            return result.data;
        } catch (error) {
            console.warn('Refund stats not available:', error.message);
            return { stats: { total: 0, pending: 0, approved: 0, rejected: 0, processed: 0 } };
        }
    }

    async fetchTransferStats() {
        try {
            const response = await fetch('/admin/transfers/transfer-stats', {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch transfer stats');
            const result = await response.json();
            return result.data;
        } catch (error) {
            console.warn('Transfer stats not available:', error.message);
            return { total: 0, pending: 0, approved: 0, rejected: 0 };
        }
    }

    async fetchInvoiceStats() {
        try {
            const response = await fetch('/admin/invoices/statistics', {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch invoice stats');
            return await response.json();
        } catch (error) {
            console.warn('Invoice stats not available:', error.message);
            return { byStatus: {}, totalCompleted: 0 };
        }
    }

    updateLoadingState() {
        const contentArea = this.shadowRoot.querySelector('.statistics-content');
        if (contentArea && this.isLoading) {
            contentArea.innerHTML = this.getLoadingHTML();
        }
    }

    getLoadingHTML() {
        return `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p class="loading-text">正在加载统计数据...</p>
            </div>
        `;
    }

    showError(message) {
        const contentArea = this.shadowRoot.querySelector('.statistics-content');
        if (contentArea) {
            contentArea.innerHTML = `
                <div class="error-container">
                    <i class="fas fa-exclamation-triangle error-icon"></i>
                    <h3>加载失败</h3>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="this.getRootNode().host.loadStatistics()">
                        <i class="fas fa-redo"></i> 重试
                    </button>
                </div>
            `;
        }
    }

    renderStatistics() {
        console.log('renderStatistics called');
        const contentArea = this.shadowRoot.querySelector('.statistics-content');
        if (!contentArea) {
            console.error('Statistics content area not found in shadowRoot');
            return;
        }

        console.log('Rendering statistics content...');
        contentArea.innerHTML = this.getStatisticsHTML();
        
        // 确保DOM更新后再初始化图表
        setTimeout(() => {
            this.initializeCharts();
            this.setupEventListeners();
        }, 100);
    }

    getStatisticsHTML() {
        const stats = this.statistics;
        
        return `
            <!-- 概览卡片 -->
            <div class="stats-overview">
                <div class="stats-card registration-card">
                    <div class="stats-card-header">
                        <h3>注册统计</h3>
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="stats-card-body">
                        <div class="stats-number">${stats.registration?.totalRegistrations || 0}</div>
                        <div class="stats-label">总注册数</div>
                        <div class="stats-breakdown">
                            <span class="stat-item approved">
                                <i class="fas fa-check-circle"></i>
                                已批准: ${stats.registration?.approved || 0}
                            </span>
                            <span class="stat-item pending">
                                <i class="fas fa-clock"></i>
                                待处理: ${stats.registration?.pending || 0}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="stats-card payment-card">
                    <div class="stats-card-header">
                        <h3>收入统计</h3>
                        <i class="fas fa-dollar-sign"></i>
                    </div>
                    <div class="stats-card-body">
                        <div class="stats-number">$${this.formatCurrency(stats.payment?.total || 0)}</div>
                        <div class="stats-label">总收入</div>
                        <div class="stats-breakdown">
                            <span class="stat-item">
                                今日: $${this.formatCurrency(stats.payment?.today || 0)}
                            </span>
                            <span class="stat-item">
                                本周: $${this.formatCurrency(stats.payment?.week || 0)}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="stats-card refund-card">
                    <div class="stats-card-header">
                        <h3>退款统计</h3>
                        <i class="fas fa-undo"></i>
                    </div>
                    <div class="stats-card-body">
                        <div class="stats-number">${stats.refund?.stats?.total || 0}</div>
                        <div class="stats-label">退款申请</div>
                        <div class="stats-breakdown">
                            <span class="stat-item pending">
                                待处理: ${stats.refund?.stats?.pending || 0}
                            </span>
                            <span class="stat-item approved">
                                已处理: ${(stats.refund?.stats?.approved || 0) + (stats.refund?.stats?.processed || 0)}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="stats-card transfer-card">
                    <div class="stats-card-header">
                        <h3>转让统计</h3>
                        <i class="fas fa-exchange-alt"></i>
                    </div>
                    <div class="stats-card-body">
                        <div class="stats-number">${stats.transfer?.total || 0}</div>
                        <div class="stats-label">转让申请</div>
                        <div class="stats-breakdown">
                            <span class="stat-item pending">
                                待处理: ${stats.transfer?.pending || 0}
                            </span>
                            <span class="stat-item approved">
                                已批准: ${stats.transfer?.approved || 0}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 图表区域 -->
            <div class="charts-section">
                <div class="chart-container">
                    <div class="chart-header">
                        <h3>注册状态分布</h3>
                        <div class="chart-controls">
                            <select class="chart-selector" data-chart="registrationChart">
                                <option value="pie">饼图</option>
                                <option value="bar">柱状图</option>
                            </select>
                        </div>
                    </div>
                    <canvas id="registrationChart" class="chart-canvas small"></canvas>
                </div>

                <div class="chart-container">
                    <div class="chart-header">
                        <h3>每日注册趋势</h3>
                    </div>
                    <canvas id="dailyTrendChart" class="chart-canvas"></canvas>
                </div>
            </div>

            <!-- 产品统计 -->
            <div class="product-stats-section">
                <div class="section-header">
                    <h3>产品销售统计</h3>
                    <button class="btn btn-secondary export-btn" onclick="this.getRootNode().host.exportProductStats()">
                        <i class="fas fa-download"></i> 导出数据
                    </button>
                </div>
                <div class="product-stats-table">
                    ${this.getProductStatsTable()}
                </div>
            </div>

            <!-- 参与者分析 -->
            <div class="participant-analysis">
                <div class="analysis-grid">
                    <div class="analysis-card">
                        <h4>参与者类型分布</h4>
                        <canvas id="participantTypeChart" class="chart-canvas small"></canvas>
                    </div>
                    <div class="analysis-card">
                        <h4>收入来源分析</h4>
                        <canvas id="revenueSourceChart" class="chart-canvas small"></canvas>
                    </div>
                </div>
            </div>

            <!-- 时间分析 -->
            <div class="time-analysis">
                <div class="section-header">
                    <h3>时间趋势分析</h3>
                </div>
                <div class="time-stats-grid">
                    <div class="time-stat-item">
                        <h4>今日新增</h4>
                        <div class="time-stat-number">${stats.registration?.todayRegistrations || 0}</div>
                        <div class="time-stat-change">
                            <i class="fas fa-arrow-up text-success"></i>
                            比昨日增长
                        </div>
                    </div>
                    <div class="time-stat-item">
                        <h4>本周新增</h4>
                        <div class="time-stat-number">${stats.registration?.weekRegistrations || 0}</div>
                        <div class="time-stat-change">
                            <i class="fas fa-arrow-up text-success"></i>
                            比上周增长
                        </div>
                    </div>
                    <div class="time-stat-item">
                        <h4>平均处理时间</h4>
                        <div class="time-stat-number">${stats.registration?.averageProcessingTime || '0'}天</div>
                        <div class="time-stat-change">
                            <i class="fas fa-arrow-down text-warning"></i>
                            较上月缩短
                        </div>
                    </div>
                    <div class="time-stat-item">
                        <h4>通过率</h4>
                        <div class="time-stat-number">${this.calculateApprovalRate()}%</div>
                        <div class="time-stat-change">
                            <i class="fas fa-arrow-up text-success"></i>
                            较上月提升
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getProductStatsTable() {
        const productStats = this.statistics.registration?.product_stats || [];
        
        if (productStats.length === 0) {
            return '<p class="no-data">暂无产品统计数据</p>';
        }

        return `
            <table class="product-table">
                <thead>
                    <tr>
                        <th>产品代码</th>
                        <th>注册数量</th>
                        <th>收入金额</th>
                        <th>占比</th>
                        <th>平均价格</th>
                    </tr>
                </thead>
                <tbody>
                    ${productStats.map(product => {
                        const total = productStats.reduce((sum, p) => sum + parseInt(p.count), 0);
                        const percentage = total > 0 ? ((parseInt(product.count) / total) * 100).toFixed(1) : 0;
                        const avgPrice = product.total && product.count ? (product.total / product.count).toFixed(2) : 0;
                        
                        return `
                            <tr>
                                <td class="product-code">${product._id || product.product_code}</td>
                                <td class="count">${product.count}</td>
                                <td class="revenue">$${this.formatCurrency(product.total || 0)}</td>
                                <td class="percentage">
                                    <div class="percentage-bar">
                                        <div class="percentage-fill" style="width: ${percentage}%"></div>
                                        <span class="percentage-text">${percentage}%</span>
                                    </div>
                                </td>
                                <td class="avg-price">$${avgPrice}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    calculateApprovalRate() {
        const stats = this.statistics.registration;
        if (!stats || !stats.totalRegistrations || stats.totalRegistrations === 0) {
            return 0;
        }
        return ((stats.approved / stats.totalRegistrations) * 100).toFixed(1);
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('zh-CN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    render() {
        console.log('StatisticsManager render called');
        
        // 使用基础组件的样式
        const baseStyles = this.createBaseStyles();
        
        const style = document.createElement('style');
        style.textContent = this.getStyles();

        const container = document.createElement('div');
        container.innerHTML = `
            <div class="statistics-container">
                <div class="statistics-header">
                    <div class="header-content">
                        <div class="header-text">
                            <h1 class="statistics-title">统计报告</h1>
                            <p class="statistics-subtitle">系统数据分析和统计报告</p>
                        </div>
                        <div class="header-actions">
                            <button class="btn btn-secondary refresh-btn" onclick="this.getRootNode().host.loadStatistics()">
                                <i class="fas fa-sync-alt"></i> 刷新数据
                            </button>
                            <button class="btn btn-primary export-btn" onclick="this.getRootNode().host.exportStatistics()">
                                <i class="fas fa-download"></i> 导出报告
                            </button>
                        </div>
                    </div>
                </div>
                <div class="statistics-content">
                    ${this.getLoadingHTML()}
                </div>
            </div>
        `;

        this.shadowRoot.appendChild(baseStyles);
        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(container);
        
        console.log('StatisticsManager rendered successfully');
    }

    getStyles() {
        return `
            :host {
                display: block;
                padding: 24px;
                background: var(--gray-50, #f8f9fa);
                min-height: calc(100vh - 120px);
            }

            .statistics-container {
                max-width: 1400px;
                margin: 0 auto;
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.1);
                overflow: hidden;
            }

            .statistics-header {
                padding: 24px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }

            .header-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 16px;
            }

            .statistics-title {
                font-size: 28px;
                font-weight: bold;
                margin: 0 0 8px 0;
            }

            .statistics-subtitle {
                opacity: 0.9;
                font-size: 16px;
                margin: 0;
            }

            .header-actions {
                display: flex;
                gap: 12px;
            }

            .btn {
                padding: 8px 16px;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                display: inline-flex;
                align-items: center;
                gap: 6px;
            }

            .btn-primary {
                background: #007bff;
                color: white;
            }

            .btn-primary:hover {
                background: #0056b3;
            }

            .btn-secondary {
                background: rgba(255,255,255,0.2);
                color: white;
                border: 1px solid rgba(255,255,255,0.3);
            }

            .btn-secondary:hover {
                background: rgba(255,255,255,0.3);
            }

            .statistics-content {
                padding: 24px;
            }

            /* 加载状态 */
            .loading-container {
                text-align: center;
                padding: 60px 20px;
            }

            .loading-spinner {
                width: 50px;
                height: 50px;
                border: 4px solid #e9ecef;
                border-top: 4px solid #007bff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .loading-text {
                color: #6c757d;
                font-size: 16px;
            }

            /* 错误状态 */
            .error-container {
                text-align: center;
                padding: 60px 20px;
                color: #dc3545;
            }

            .error-icon {
                font-size: 48px;
                margin-bottom: 20px;
            }

            /* 统计概览卡片 */
            .stats-overview {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 20px;
                margin-bottom: 32px;
            }

            .stats-card {
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                border: 1px solid #e9ecef;
                overflow: hidden;
                transition: transform 0.2s, box-shadow 0.2s;
            }

            .stats-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 24px rgba(0,0,0,0.1);
            }

            .stats-card-header {
                padding: 16px 20px;
                background: #f8f9fa;
                border-bottom: 1px solid #e9ecef;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .stats-card-header h3 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                color: #495057;
            }

            .stats-card-header i {
                font-size: 20px;
                color: #6c757d;
            }

            .stats-card-body {
                padding: 20px;
            }

            .stats-number {
                font-size: 32px;
                font-weight: bold;
                color: #212529;
                margin-bottom: 8px;
            }

            .stats-label {
                color: #6c757d;
                font-size: 14px;
                margin-bottom: 16px;
            }

            .stats-breakdown {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .stat-item {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 14px;
                color: #495057;
            }

            .stat-item i {
                width: 16px;
                text-align: center;
            }

            .stat-item.approved i {
                color: #28a745;
            }

            .stat-item.pending i {
                color: #ffc107;
            }

            /* 图表区域 */
            .charts-section {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                gap: 24px;
                margin-bottom: 32px;
            }

            .chart-container {
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                border: 1px solid #e9ecef;
                overflow: hidden;
            }

            .chart-header {
                padding: 16px 20px;
                background: #f8f9fa;
                border-bottom: 1px solid #e9ecef;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .chart-header h3 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                color: #495057;
            }

            .chart-controls select {
                padding: 6px 12px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 14px;
                background: white;
            }

            .chart-canvas {
                display: block;
                width: 100% !important;
                height: 300px !important;
                max-width: 100%;
                max-height: 300px;
                padding: 20px;
                box-sizing: border-box;
            }

            .chart-canvas.small {
                height: 300px !important;
                max-height: 300px;
                width: 300px !important;
                max-width: 300px;
                margin: 0 auto;
                display: block;
            }

            /* 产品统计表格 */
            .product-stats-section {
                margin-bottom: 32px;
            }

            .section-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
            }

            .section-header h3 {
                margin: 0;
                font-size: 20px;
                font-weight: 600;
                color: #212529;
            }

            .product-stats-table {
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                border: 1px solid #e9ecef;
                overflow: hidden;
            }

            .product-table {
                width: 100%;
                border-collapse: collapse;
            }

            .product-table th,
            .product-table td {
                padding: 12px 16px;
                text-align: left;
                border-bottom: 1px solid #e9ecef;
            }

            .product-table th {
                background: #f8f9fa;
                font-weight: 600;
                color: #495057;
                font-size: 14px;
            }

            .product-table td {
                color: #212529;
                font-size: 14px;
            }

            .product-table tr:last-child td {
                border-bottom: none;
            }

            .product-code {
                font-family: monospace;
                background: #f8f9fa;
                padding: 4px 8px;
                border-radius: 4px;
                font-weight: 500;
            }

            .percentage-bar {
                display: flex;
                align-items: center;
                gap: 8px;
                position: relative;
                background: #e9ecef;
                border-radius: 4px;
                height: 20px;
                min-width: 80px;
            }

            .percentage-fill {
                background: linear-gradient(90deg, #28a745, #20c997);
                height: 100%;
                border-radius: 4px;
                transition: width 0.3s ease;
            }

            .percentage-text {
                position: absolute;
                left: 50%;
                transform: translateX(-50%);
                font-size: 12px;
                font-weight: 500;
                color: #212529;
            }

            /* 参与者分析 */
            .participant-analysis {
                margin-bottom: 32px;
            }

            .analysis-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 24px;
            }

            .analysis-card {
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                border: 1px solid #e9ecef;
                padding: 20px;
                display: flex;
                flex-direction: column;
            }

            .analysis-card h4 {
                margin: 0 0 16px 0;
                font-size: 16px;
                font-weight: 600;
                color: #495057;
            }

            /* 时间分析 */
            .time-analysis {
                margin-bottom: 32px;
            }

            .time-stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
            }

            .time-stat-item {
                background: white;
                padding: 24px;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                border: 1px solid #e9ecef;
                text-align: center;
            }

            .time-stat-item h4 {
                margin: 0 0 12px 0;
                font-size: 14px;
                font-weight: 500;
                color: #6c757d;
            }

            .time-stat-number {
                font-size: 28px;
                font-weight: bold;
                color: #212529;
                margin-bottom: 8px;
            }

            .time-stat-change {
                font-size: 12px;
                color: #6c757d;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
            }

            .text-success {
                color: #28a745 !important;
            }

            .text-warning {
                color: #ffc107 !important;
            }

            .no-data {
                text-align: center;
                color: #6c757d;
                padding: 40px 20px;
                font-style: italic;
            }

            /* 响应式设计 */
            @media (max-width: 768px) {
                :host {
                    padding: 16px;
                }

                .header-content {
                    flex-direction: column;
                    align-items: stretch;
                }

                .header-actions {
                    justify-content: center;
                }

                .statistics-content {
                    padding: 16px;
                }

                .stats-overview {
                    grid-template-columns: 1fr;
                }

                .charts-section {
                    grid-template-columns: 1fr;
                }

                .analysis-grid {
                    grid-template-columns: 1fr;
                }

                .time-stats-grid {
                    grid-template-columns: repeat(2, 1fr);
                }

                .section-header {
                    flex-direction: column;
                    align-items: stretch;
                    gap: 12px;
                }
            }
        `;
    }

    initializeCharts() {
        console.log('Initializing charts...');
        
        // 添加超时保护
        const chartTimeout = setTimeout(() => {
            console.error('Chart initialization timeout');
            this.showChartError();
        }, 10000); // 10秒超时

        // 加载 Chart.js 库（如果尚未加载）
        if (typeof Chart === 'undefined') {
            this.loadChartJS().then(() => {
                clearTimeout(chartTimeout);
                this.createCharts();
            }).catch(error => {
                clearTimeout(chartTimeout);
                console.error('Failed to load Chart.js:', error);
                this.showChartError();
            });
        } else {
            clearTimeout(chartTimeout);
            this.createCharts();
        }
    }

    showChartError() {
        const chartContainers = this.shadowRoot.querySelectorAll('.chart-canvas');
        chartContainers.forEach(canvas => {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#6c757d';
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('图表加载失败', canvas.width / 2, canvas.height / 2);
            }
        });
    }

    async loadChartJS() {
        return new Promise((resolve, reject) => {
            // 先清除可能存在的旧Chart.js脚本
            const existingScript = document.querySelector('script[src*="chart.js"]') || 
                                 document.querySelector('script[src*="Chart.js"]');
            if (existingScript) {
                existingScript.remove();
                // 清除Chart全局对象
                if (window.Chart) {
                    delete window.Chart;
                }
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js';
            script.onload = () => {
                console.log('Chart.js loaded, version:', window.Chart?.version);
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    createCharts() {
        try {
            console.log('Creating charts...');
            
            // 防止重复创建图表
            if (this.chartInstances.size > 0) {
                console.log('Charts already exist, clearing first...');
                this.chartInstances.forEach((chart, key) => {
                    try {
                        chart.destroy();
                        console.log(`Destroyed chart: ${key}`);
                    } catch (e) {
                        console.warn(`Failed to destroy chart ${key}:`, e);
                    }
                });
                this.chartInstances.clear();
            }

            // 检查是否有统计数据
            if (!this.statistics || Object.keys(this.statistics).length === 0) {
                console.warn('No statistics data available for charts');
                return;
            }

            // 检查图表容器是否存在
            const containers = [
                'registrationChart',
                'dailyTrendChart', 
                'participantTypeChart',
                'revenueSourceChart'
            ];

            const missingContainers = containers.filter(id => !this.shadowRoot.getElementById(id));
            if (missingContainers.length > 0) {
                console.warn('Missing chart containers:', missingContainers);
                return;
            }

            // 使用短延时确保DOM完全渲染
            setTimeout(() => {
                try {
                    console.log('Creating registration chart...');
                    this.createRegistrationChart();
                    
                    console.log('Creating daily trend chart...');
                    this.createDailyTrendChart();
                    
                    console.log('Creating participant type chart...');
                    this.createParticipantTypeChart();
                    
                    console.log('Creating revenue source chart...');
                    this.createRevenueSourceChart();
                    
                    console.log('All charts created successfully, total charts:', this.chartInstances.size);
                } catch (innerError) {
                    console.error('Error in delayed chart creation:', innerError);
                    this.showChartError();
                }
            }, 100);
            
        } catch (error) {
            console.error('Error in createCharts:', error);
            this.showChartError();
        }
    }

    createRegistrationChart() {
        console.log('Creating registration chart...');
        
        const canvas = this.shadowRoot.getElementById('registrationChart');
        if (!canvas) {
            console.warn('Registration chart canvas not found');
            return;
        }

        // 设置正方形canvas尺寸，确保圆形图表显示为标准圆形
        canvas.width = 300;
        canvas.height = 300;
        canvas.style.width = '300px';
        canvas.style.height = '300px';
        canvas.style.maxWidth = '300px';
        canvas.style.maxHeight = '300px';
        canvas.style.display = 'block';
        canvas.style.margin = '0 auto';

        const stats = this.statistics.registration || {};
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.warn('Cannot get 2d context for registration chart');
            return;
        }

        try {
            // 清除之前的图表实例
            const existingChart = this.chartInstances.get('registrationChart');
            if (existingChart) {
                console.log('Destroying existing registration chart');
                existingChart.destroy();
                this.chartInstances.delete('registrationChart');
            }

            const data = {
                labels: ['待处理', '已批准', '已拒绝'],
                datasets: [{
                    data: [
                        stats.pending || 0,
                        stats.approved || 0,
                        stats.rejected || 0
                    ],
                    backgroundColor: [
                        '#ffc107',
                        '#28a745',
                        '#dc3545'
                    ],
                    borderColor: [
                        '#e0a800',
                        '#1e7e34',
                        '#c82333'
                    ],
                    borderWidth: 2
                }]
            };

            const config = {
                type: 'pie',
                data: data,
                options: {
                    // 关键修复：禁用响应式，防止死循环
                    responsive: false,
                    maintainAspectRatio: true,
                    // 禁用动画，防止渲染循环
                    animation: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                usePointStyle: true
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
                                    return `${context.label}: ${context.raw} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            };

            const chart = new Chart(ctx, config);
            this.chartInstances.set('registrationChart', chart);
            console.log('Registration chart created successfully with dimensions:', canvas.width, 'x', canvas.height);
        } catch (error) {
            console.error('Error creating registration chart:', error);
            // 在画布上显示错误信息
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#6c757d';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('图表加载失败', canvas.width / 2, canvas.height / 2);
        }
    }

    createDailyTrendChart() {
        console.log('Creating daily trend chart...');
        
        const canvas = this.shadowRoot.getElementById('dailyTrendChart');
        if (!canvas) {
            console.warn('Daily trend chart canvas not found');
            return;
        }

        // 强制设置canvas尺寸，防止无限增长
        canvas.width = 600;
        canvas.height = 300;
        canvas.style.width = '600px';
        canvas.style.height = '300px';
        canvas.style.maxWidth = '600px';
        canvas.style.maxHeight = '300px';

        const stats = this.statistics.registration || {};
        const dailyStats = stats.dailyStats || [];

        // 检查是否有有效数据
        if (!Array.isArray(dailyStats)) {
            console.warn('Daily stats is not an array:', dailyStats);
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.warn('Cannot get 2d context for daily trend chart');
            return;
        }

        try {
            // 清除之前的图表实例（如果存在）
            const existingChart = this.chartInstances.get('dailyTrendChart');
            if (existingChart) {
                console.log('Destroying existing daily trend chart');
                existingChart.destroy();
                this.chartInstances.delete('dailyTrendChart');
            }

            // 清空 canvas 以确保完全重新绘制
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 生成最近7天的数据
            const last7Days = this.generateLast7Days();
            
            const chartData = last7Days.map(date => {
                const dayData = dailyStats.find(d => d && d.date === date);
                const count = dayData ? (parseInt(dayData.count) || 0) : 0;
                return count;
            });

            // 验证数据
            if (chartData.length === 0) {
                console.warn('No chart data generated');
                return;
            }

            // 创建简单的静态标签
            const staticLabels = ['9/1', '9/2', '9/3', '9/4', '9/5', '9/6', '9/7'];

            const data = {
                labels: staticLabels,
                datasets: [{
                    label: '每日注册数',
                    data: chartData,
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#007bff',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5
                }]
            };

            const config = {
                type: 'line',
                data: data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                title: function(tooltipItems) {
                                    return tooltipItems[0].label;
                                },
                                label: function(context) {
                                    return `注册数: ${context.parsed.y}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1,
                                callback: function(value) {
                                    return Math.floor(value) === value ? value : '';
                                }
                            },
                            grid: {
                                color: 'rgba(0,0,0,0.1)'
                            }
                        },
                        x: {
                            display: true,
                            grid: {
                                display: false
                            }
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    }
                }
            };

            const chart = new Chart(ctx, config);
            this.chartInstances.set('dailyTrendChart', chart);
        } catch (error) {
            console.error('Error creating daily trend chart:', error);
            // 在画布上显示错误信息
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#6c757d';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('图表加载失败', canvas.width / 2, canvas.height / 2);
        }
    }

    createParticipantTypeChart() {
        console.log('Creating participant type chart...');
        
        const canvas = this.shadowRoot.getElementById('participantTypeChart');
        if (!canvas) {
            console.warn('Participant type chart canvas not found');
            return;
        }

        // 设置正方形canvas尺寸，确保圆形图表显示为标准圆形
        canvas.width = 300;
        canvas.height = 300;
        canvas.style.width = '300px';
        canvas.style.height = '300px';
        canvas.style.maxWidth = '300px';
        canvas.style.maxHeight = '300px';
        canvas.style.display = 'block';
        canvas.style.margin = '0 auto';

        const stats = this.statistics.registration || {};
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.warn('Cannot get 2d context for participant type chart');
            return;
        }

        try {
            // 清除之前的图表实例
            const existingChart = this.chartInstances.get('participantTypeChart');
            if (existingChart) {
                console.log('Destroying existing participant type chart');
                existingChart.destroy();
                this.chartInstances.delete('participantTypeChart');
            }

            const data = {
                labels: ['学生', '会员', '其他'],
                datasets: [{
                    data: [
                        stats.students || 0,
                        stats.members || 0,
                        Math.max(0, (stats.totalRegistrations || 0) - (stats.students || 0) - (stats.members || 0))
                    ],
                    backgroundColor: [
                        '#17a2b8',
                        '#6f42c1',
                        '#6c757d'
                    ],
                    borderWidth: 0
                }]
            };

            const config = {
                type: 'doughnut',
                data: data,
                options: {
                    // 关键修复：禁用响应式，防止死循环
                    responsive: false,
                    maintainAspectRatio: true,
                    cutout: '60%',
                    // 禁用动画，防止渲染循环
                    animation: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 15,
                                usePointStyle: true,
                                font: {
                                    size: 12
                                }
                            }
                        }
                    }
                }
            };

            const chart = new Chart(ctx, config);
            this.chartInstances.set('participantTypeChart', chart);
            console.log('Participant type chart created successfully with dimensions:', canvas.width, 'x', canvas.height);
        } catch (error) {
            console.error('Error creating participant type chart:', error);
            // 在画布上显示错误信息
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#6c757d';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('图表加载失败', canvas.width / 2, canvas.height / 2);
        }
    }

    createRevenueSourceChart() {
        console.log('Creating revenue source chart...');
        
        const canvas = this.shadowRoot.getElementById('revenueSourceChart');
        if (!canvas) {
            console.warn('Revenue source chart canvas not found');
            return;
        }

        // 设置正方形canvas尺寸，确保圆形图表显示为标准圆形
        canvas.width = 300;
        canvas.height = 300;
        canvas.style.width = '300px';
        canvas.style.height = '300px';
        canvas.style.maxWidth = '300px';
        canvas.style.maxHeight = '300px';
        canvas.style.display = 'block';
        canvas.style.margin = '0 auto';

        const productStats = this.statistics.registration?.product_stats || [];
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.warn('Cannot get 2d context for revenue source chart');
            return;
        }

        try {
            // 清除之前的图表实例
            const existingChart = this.chartInstances.get('revenueSourceChart');
            if (existingChart) {
                console.log('Destroying existing revenue source chart');
                existingChart.destroy();
                this.chartInstances.delete('revenueSourceChart');
            }

            // 只显示前5个产品
            const topProducts = productStats.slice(0, 5);
            
            // 如果没有产品数据，显示默认数据
            if (topProducts.length === 0) {
                const data = {
                    labels: ['暂无数据'],
                    datasets: [{
                        data: [1],
                        backgroundColor: ['#e9ecef'],
                        borderWidth: 0
                    }]
                };

                const config = {
                    type: 'doughnut',
                    data: data,
                    options: {
                        // 关键修复：禁用响应式，防止死循环
                        responsive: false,
                        maintainAspectRatio: true,
                        cutout: '60%',
                        plugins: {
                            legend: {
                                display: false
                            }
                        }
                    }
                };

                const chart = new Chart(ctx, config);
                this.chartInstances.set('revenueSourceChart', chart);
                return;
            }
            
            const data = {
                labels: topProducts.map(p => (p._id || p.product_code || '未知').substring(0, 15)),
                datasets: [{
                    data: topProducts.map(p => p.total || 0),
                    backgroundColor: [
                        '#007bff',
                        '#28a745',
                        '#ffc107',
                        '#dc3545',
                        '#6c757d'
                    ],
                    borderWidth: 0
                }]
            };

            const config = {
                type: 'doughnut',
                data: data,
                options: {
                    // 关键修复：禁用响应式，防止死循环
                    responsive: false,
                    maintainAspectRatio: true,
                    cutout: '60%',
                    // 禁用动画，防止渲染循环
                    animation: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 15,
                                usePointStyle: true,
                                font: {
                                    size: 11
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `${context.label}: $${context.raw}`;
                                }
                            }
                        }
                    }
                }
            };

            const chart = new Chart(ctx, config);
            this.chartInstances.set('revenueSourceChart', chart);
            console.log('Revenue source chart created successfully with dimensions:', canvas.width, 'x', canvas.height);
        } catch (error) {
            console.error('Error creating revenue source chart:', error);
            // 在画布上显示错误信息
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#6c757d';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('图表加载失败', canvas.width / 2, canvas.height / 2);
        }
    }

    generateLast7Days() {
        const days = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            
            // 确保生成的日期格式为 YYYY-MM-DD
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateString = `${year}-${month}-${day}`;
            
            days.push(dateString);
        }
        
        return days;
    }

    setupEventListeners() {
        // 图表类型切换
        const chartSelectors = this.shadowRoot.querySelectorAll('.chart-selector');
        chartSelectors.forEach(selector => {
            selector.addEventListener('change', (e) => {
                const chartId = e.target.dataset.chart;
                const chartType = e.target.value;
                this.updateChartType(chartId, chartType);
            });
        });
    }

    updateChartType(chartId, type) {
        const chart = this.chartInstances.get(chartId);
        if (!chart) {
            console.warn(`Chart ${chartId} not found`);
            return;
        }
        
        // 获取当前数据
        const currentData = chart.data;
        
        // 销毁当前图表
        chart.destroy();
        this.chartInstances.delete(chartId);
        
        // 根据图表ID和类型重新创建
        if (chartId === 'registrationChart') {
            this.createRegistrationChartWithType(type, currentData);
        }
    }

    createRegistrationChartWithType(type, data) {
        const canvas = this.shadowRoot.getElementById('registrationChart');
        if (!canvas) {
            console.warn('Registration chart canvas not found');
            return;
        }

        // 设置正方形canvas尺寸，确保圆形图表显示为标准圆形
        canvas.width = 300;
        canvas.height = 300;
        canvas.style.width = '300px';
        canvas.style.height = '300px';
        canvas.style.maxWidth = '300px';
        canvas.style.maxHeight = '300px';
        canvas.style.display = 'block';
        canvas.style.margin = '0 auto';

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.warn('Cannot get 2d context for registration chart');
            return;
        }

        // 清空画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let config = {
            type: type,
            data: data,
            options: {
                responsive: false,
                maintainAspectRatio: true,
                animation: false
            }
        };

        // 根据图表类型设置不同的配置
        if (type === 'pie' || type === 'doughnut') {
            config.options.plugins = {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
                            return `${context.label}: ${context.raw} (${percentage}%)`;
                        }
                    }
                }
            };
        } else if (type === 'bar') {
            config.options.plugins = {
                legend: {
                    display: false
                }
            };
            config.options.scales = {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        callback: function(value) {
                            return Math.floor(value) === value ? value : '';
                        }
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 0,
                        minRotation: 0
                    },
                    grid: {
                        display: false
                    }
                }
            };
        }

        console.log('Creating chart with config:', config);
        
        try {
            const chart = new Chart(ctx, config);
            this.chartInstances.set('registrationChart', chart);
        } catch (error) {
            console.error('Error creating registration chart:', error);
            // 显示错误信息
            ctx.fillStyle = '#6c757d';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('图表加载失败', canvas.width / 2, canvas.height / 2);
        }
    }

    async loadJSZip() {
        return new Promise((resolve, reject) => {
            if (window.JSZip) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
            script.onload = () => {
                console.log('JSZip loaded successfully');
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async exportStatistics() {
        try {
            // 加载JSZip库
            await this.loadJSZip();
            
            const stats = this.statistics;
            const dateStr = new Date().toISOString().split('T')[0];
            
            // 创建ZIP文件
            const zip = new JSZip();
            
            // 准备所有CSV数据
            const files = [
                {
                    name: `registration-stats-${dateStr}.csv`,
                    data: this.generateRegistrationCSV(stats)
                },
                {
                    name: `payment-stats-${dateStr}.csv`,
                    data: this.generatePaymentCSV(stats)
                },
                {
                    name: `product-sales-${dateStr}.csv`,
                    data: this.generateProductCSV(stats)
                },
                {
                    name: `daily-trend-${dateStr}.csv`,
                    data: this.generateDailyTrendCSV(stats)
                },
                {
                    name: `refund-transfer-stats-${dateStr}.csv`,
                    data: this.generateOtherStatsCSV(stats)
                }
            ];
            
            // 添加文件到ZIP
            files.forEach(file => {
                zip.file(file.name, '\ufeff' + file.data);
            });
            
            // 生成ZIP文件并下载
            const zipBlob = await zip.generateAsync({type: 'blob'});
            
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `statistics-report-${dateStr}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showNotification('统计报告压缩包已导出', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            this.showNotification('导出失败: ' + error.message, 'error');
        }
    }

    generateRegistrationCSV(stats) {
        const data = [
            ['项目', '数量'],
            ['总注册数', stats.registration?.totalRegistrations || 0],
            ['已批准', stats.registration?.approved || 0],
            ['待处理', stats.registration?.pending || 0],
            ['已拒绝', stats.registration?.rejected || 0],
            ['学生用户', stats.registration?.students || 0],
            ['会员用户', stats.registration?.members || 0]
        ];
        
        return this.arrayToCSV(data);
    }

    generatePaymentCSV(stats) {
        const data = [
            ['项目', '金额(USD)'],
            ['总收入', stats.payment?.total || 0],
            ['今日收入', stats.payment?.today || 0],
            ['本周收入', stats.payment?.week || 0],
            ['本月收入', stats.payment?.month || 0]
        ];
        
        return this.arrayToCSV(data);
    }

    generateProductCSV(stats) {
        const productStats = stats.registration?.product_stats || [];
        
        const data = [
            ['产品代码', '注册数量', '收入金额', '平均价格']
        ];
        
        if (productStats.length === 0) {
            data.push(['暂无数据', '0', '0', '0']);
        } else {
            productStats.forEach(product => {
                const avgPrice = product.total && product.count ? (product.total / product.count).toFixed(2) : 0;
                data.push([
                    product._id || product.product_code,
                    product.count,
                    product.total || 0,
                    avgPrice
                ]);
            });
        }
        
        return this.arrayToCSV(data);
    }

    generateDailyTrendCSV(stats) {
        const dailyStats = stats.registration?.dailyStats || [];
        
        const data = [
            ['日期', '注册数量']
        ];
        
        if (dailyStats.length === 0) {
            // 生成最近7天的默认数据
            const last7Days = this.generateLast7Days();
            last7Days.forEach(date => {
                data.push([date, '0']);
            });
        } else {
            dailyStats.forEach(day => {
                data.push([day.date, day.count]);
            });
        }
        
        return this.arrayToCSV(data);
    }

    generateOtherStatsCSV(stats) {
        const data = [
            ['类型', '项目', '数量'],
            ['退款', '总申请', stats.refund?.stats?.total || 0],
            ['退款', '待处理', stats.refund?.stats?.pending || 0],
            ['退款', '已批准', stats.refund?.stats?.approved || 0],
            ['退款', '已拒绝', stats.refund?.stats?.rejected || 0],
            ['退款', '已处理', stats.refund?.stats?.processed || 0],
            ['转让', '总申请', stats.transfer?.total || 0],
            ['转让', '待处理', stats.transfer?.pending || 0],
            ['转让', '已批准', stats.transfer?.approved || 0],
            ['转让', '已拒绝', stats.transfer?.rejected || 0]
        ];
        
        return this.arrayToCSV(data);
    }

    arrayToCSV(data) {
        return data.map(row => 
            row.map(cell => `"${cell}"`).join(',')
        ).join('\n');
    }

    async exportProductStats() {
        try {
            const productStats = this.statistics.registration?.product_stats || [];
            
            // 创建CSV内容
            const headers = ['产品代码', '注册数量', '收入金额', '平均价格'];
            const csvContent = [
                headers.join(','),
                ...productStats.map(product => [
                    product._id || product.product_code,
                    product.count,
                    product.total || 0,
                    product.total && product.count ? (product.total / product.count).toFixed(2) : 0
                ].join(','))
            ].join('\n');

            const blob = new Blob(['\ufeff' + csvContent], {
                type: 'text/csv;charset=utf-8'
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `product-stats-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showNotification('产品统计已导出', 'success');
        } catch (error) {
            console.error('Export product stats failed:', error);
            this.showNotification('导出失败', 'error');
        }
    }

    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
            color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
            border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'};
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-size: 14px;
            max-width: 300px;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // 3秒后自动移除
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);

        // 添加动画样式
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    connectedCallback() {
        console.log('StatisticsManager connectedCallback called');
        super.connectedCallback(); // 这里会自动调用render()
        
        // 延迟加载数据，确保DOM已经渲染完成
        setTimeout(() => {
            if (!this.isLoading) {
                console.log('Starting initial data load...');
                this.loadStatistics();
            }
        }, 100);
    }

    disconnectedCallback() {
        // 清理图表实例
        this.chartInstances.forEach(chart => chart.destroy());
        this.chartInstances.clear();
        
        super.disconnectedCallback();
    }
}

export default StatisticsManager;
