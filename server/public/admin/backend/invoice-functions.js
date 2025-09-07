// 加载发票申请列表
async function loadInvoices(page = 1, status = '') {
    try {
        showLoading(true);
        currentInvoicePage = page;
        currentInvoiceStatus = status;
        
        // 构建请求URL
        let url = `/admin/invoices/requests?page=${page}&limit=10`;
        if (status) {
            url += `&status=${status}`;
        }
        
        const response = await fetch(url, {
            credentials: 'include'
        });
        
        const data = await response.json();
        displayInvoices(data.requests, data.page, data.totalPages);
        updateInvoiceStats();
        
        showLoading(false);
    } catch (error) {
        console.error('加载发票申请失败:', error);
        showError('加载发票申请失败');
        showLoading(false);
    }
}

// 显示发票申请列表
function displayInvoices(invoices, currentPage, totalPages) {
    const tbody = document.getElementById('invoice-table-body');
    const pagination = document.getElementById('invoice-pagination');
    
    if (!tbody || !pagination) {
        console.error('发票表格元素未找到');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (invoices.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="8" class="text-center">无符合条件的发票申请</td>
        `;
        tbody.appendChild(row);
    } else {
        invoices.forEach(invoice => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${invoice.id}</td>
                <td>${invoice.user ? `${invoice.user.fullname} (${invoice.user.email})` : '未知用户'}</td>
                <td>${invoice.invoiceTitle}</td>
                <td>${invoice.invoiceType === 'electronic' ? '电子发票' : '纸质发票'}</td>
                <td>${invoice.amount}</td>
                <td>
                    <span class="status-badge ${getInvoiceStatusClass(invoice.status)}">
                        ${getInvoiceStatusText(invoice.status)}
                    </span>
                </td>
                <td>${new Date(invoice.requestedAt).toLocaleString()}</td>
                <td class="actions">
                    <button class="btn btn-sm btn-primary" onclick="viewInvoiceDetails(${invoice.id})" title="查看详情">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    // 生成分页控件
    pagination.innerHTML = '';
    if (totalPages > 1) {
        const paginationContainer = document.createElement('div');
        paginationContainer.className = 'pagination-controls';
        
        // 上一页按钮
        const prevBtn = document.createElement('button');
        prevBtn.innerHTML = '&laquo; 上一页';
        prevBtn.className = 'btn btn-sm ' + (currentPage > 1 ? 'btn-primary' : 'btn-disabled');
        prevBtn.disabled = currentPage <= 1;
        prevBtn.addEventListener('click', () => loadInvoices(currentPage - 1, currentInvoiceStatus));
        paginationContainer.appendChild(prevBtn);
        
        // 页码指示器
        const pageIndicator = document.createElement('span');
        pageIndicator.className = 'page-indicator';
        pageIndicator.textContent = `第 ${currentPage} 页，共 ${totalPages} 页`;
        paginationContainer.appendChild(pageIndicator);
        
        // 下一页按钮
        const nextBtn = document.createElement('button');
        nextBtn.innerHTML = '下一页 &raquo;';
        nextBtn.className = 'btn btn-sm ' + (currentPage < totalPages ? 'btn-primary' : 'btn-disabled');
        nextBtn.disabled = currentPage >= totalPages;
        nextBtn.addEventListener('click', () => loadInvoices(currentPage + 1, currentInvoiceStatus));
        paginationContainer.appendChild(nextBtn);
        
        pagination.appendChild(paginationContainer);
    }
}

// 更新发票统计信息
async function updateInvoiceStats() {
    try {
        const response = await fetch('/admin/invoices/statistics', {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        // 更新主管理页面中的统计数据（正确的ID）
        const pendingElement = document.getElementById('invoice-pending-count');
        const processingElement = document.getElementById('invoice-processing-count');
        const completedElement = document.getElementById('invoice-completed-count');
        const rejectedElement = document.getElementById('invoice-rejected-count');
        
        if (pendingElement) pendingElement.textContent = data.byStatus?.pending || 0;
        if (processingElement) processingElement.textContent = data.byStatus?.processing || 0;
        if (completedElement) completedElement.textContent = data.byStatus?.completed || 0;
        if (rejectedElement) rejectedElement.textContent = data.byStatus?.rejected || 0;
        
        // 如果存在总金额元素，也更新它（这个元素在老版本的页面中存在）
        const totalElement = document.getElementById('total-invoice-amount');
        if (totalElement) {
            totalElement.textContent = `$${(data.totalCompleted || 0).toLocaleString()}`;
        }
        
    } catch (error) {
        console.error('加载发票统计失败:', error);
    }
}

// 刷新发票列表
function refreshInvoices() {
    loadInvoices(1, currentInvoiceStatus);
}

// 过滤发票列表
function filterInvoices() {
    const statusFilter = document.getElementById('invoice-status-filter');
    const status = statusFilter.value;
    loadInvoices(1, status);
}

// 获取发票状态对应的CSS类
function getInvoiceStatusClass(status) {
    switch (status) {
        case 'pending':
            return 'status-pending';
        case 'processing':
            return 'status-processing';
        case 'completed':
            return 'status-approved';
        case 'rejected':
            return 'status-rejected';
        default:
            return '';
    }
}

// 获取发票状态对应的文本
function getInvoiceStatusText(status) {
    switch (status) {
        case 'pending':
            return '待处理';
        case 'processing':
            return '处理中';
        case 'completed':
            return '已完成';
        case 'rejected':
            return '已拒绝';
        default:
            return status;
    }
}

// 查看发票详情
function viewInvoiceDetails(invoiceId) {
    // 在新窗口中打开发票管理详细页面
    window.open(`invoice-management.html?id=${invoiceId}`, '_blank');
}
