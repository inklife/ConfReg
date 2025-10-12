export const invoiceService = {
  // 获取用户的注册记录（用于发票申请）
  async getRegistrations() {
    const response = await fetch(`/api/invoices/registrations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load registration records');
    }

    const data = await response.json();
    
    // 服务器返回的数据已经包含了所有已批准的注册记录和对应的发票请求
    return { registrations: data.registrations || [] };
  },

  // 提交发票申请
  async createRequest(requestData) {
    const response = await fetch(`/api/invoices/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to submit invoice request');
    }

    return response.json();
  },

  // 获取用户的发票申请列表
  async getMyRequests() {
    const response = await fetch(`/api/invoices/my-requests`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to load invoice requests');
    }

    return response.json();
  },

  // 获取发票申请详情
  async getRequestDetails(requestId) {
    const response = await fetch(`/api/invoices/request/${requestId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to load invoice request details');
    }

    return response.json();
  },

  // 下载发票文件
  async downloadFile(fileId) {
    const response = await fetch(`/api/invoices/download/${fileId}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to download file');
    }

    return response.blob();
  },

  // 取消发票申请
  async cancelRequest(requestId) {
    const response = await fetch(`/api/invoices/request/${requestId}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to cancel invoice request');
    }

    return response.json();
  }
};

// 管理员发票服务
export const adminInvoiceService = {
  // 获取所有发票申请（管理员）
  async getAllRequests(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = `/admin/invoices/requests${queryParams ? '?' + queryParams : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authService.getToken()}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to load invoice requests');
    }

    return response.json();
  },

  // 获取发票申请详情（管理员）
  async getRequestDetails(requestId) {
    const response = await fetch(`/admin/invoices/request/${requestId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authService.getToken()}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to load invoice request details');
    }

    return response.json();
  },

  // 更新发票申请状态（管理员）
  async updateRequestStatus(requestId, statusData) {
    const response = await fetch(`/admin/invoices/request/${requestId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authService.getToken()}`
      },
      body: JSON.stringify(statusData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update status');
    }

    return response.json();
  },

  // 上传发票文件（管理员）
  async uploadInvoiceFile(requestId, file) {
    const formData = new FormData();
    formData.append('invoice', file);

    const response = await fetch(`/admin/invoices/request/${requestId}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authService.getToken()}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload file');
    }

    return response.json();
  },

  // 删除发票文件（管理员）
  async deleteInvoiceFile(fileId) {
    const response = await fetch(`/admin/invoices/file/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authService.getToken()}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete file');
    }

    return response.json();
  },

  // 下载发票文件（管理员）
  async downloadFile(fileId) {
    const response = await fetch(`/admin/invoices/download/${fileId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authService.getToken()}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to download file');
    }

    return response.blob();
  },

  // 获取发票申请统计信息（管理员）
  async getStatistics() {
    const response = await fetch(`/admin/invoices/statistics`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authService.getToken()}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to load statistics');
    }

    return response.json();
  }
};
