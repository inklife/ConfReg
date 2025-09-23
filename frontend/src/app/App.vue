<template>
  <div class="auth-app">
    <!-- 顶部导航栏 -->
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary py-3">
      <div class="container-fluid px-4">
        <router-link to="/" class="navbar-brand fs-3">
          <i class="fas fa-lock me-2"></i>ICPADS2025 Registration
        </router-link>
        
        <!-- 未登录时显示登录/注册按钮 -->
        <div class="d-flex" v-if="!isLoggedIn">
          <router-link to="/login" class="btn btn-outline-light btn-lg mx-2">
            <i class="fas fa-sign-in-alt"></i> Login
          </router-link>
          <router-link to="/register" class="btn btn-light btn-lg">
            <i class="fas fa-user-plus"></i> Register
          </router-link>
        </div>
        
        <!-- 已登录时显示用户信息和退出按钮 -->
        <div class="d-flex align-items-center" v-else>
          <!-- 可点击的用户信息，进入用户面板 -->
                    <!-- 可点击的用户信息，进入用户面板 -->
          <router-link to="/dashboard" class="user-profile-link text-white text-decoration-none me-3" title="Click to enter user dashboard">
            <i class="fas fa-user-circle me-2"></i>
            <span class="username-text">{{ currentUser.username }}</span>
            <i class="fas fa-chevron-down ms-2 profile-arrow"></i>
          </router-link>
          <button @click="logout" class="btn btn-outline-light btn-lg">
            <i class="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </div>
    </nav>

    <!-- 主内容区 (调整高度) 4
    1-->
  <router-view></router-view>
    <!-- 底部栏 (新增) -->
    <footer class="footer bg-dark text-white py-4">
      <div class="container-fluid text-center px-4">
                           <p class="mb-2">
                        <a href="http://ieee-icpads.org.cn/" target="_blank">
                            <i class="fas fa-book me-2"></i>ICPADS2025 homepage
                        </a>
                    </p>
                    <p class="mb-0">
                            <i class="fas fa-globe me-2"></i>Contact: registration@ieee-icpads.org.cn
                    </p>
      </div>
    </footer>
  </div>
</template>

<script>
import axios from 'axios';
import config from 'config';
import { clearAllUserData } from '../_helpers/router';
axios.defaults.withCredentials = true;

export default {
  name: 'App',
  data() {
    return {
      isLoggedIn: false,
      currentUser: null,
      checkInterval: null
    }
  },
  computed: {
    displayUsername() {
      if (!this.currentUser) return '';
      
      // 优先显示用户的全名，如果没有则显示username
      // 这样避免显示冗长的邮箱地址
      return this.currentUser.fullname || this.currentUser.username || 'User';
    }
  },
  mounted() {
    this.checkAuthStatus();
    
    // 定期检查登录状态
    this.checkInterval = setInterval(() => {
      this.checkAuthStatus();
    }, 30000); // 每30秒检查一次
    
    // 监听localStorage变化（当用户在其他标签页登录/登出时）
    window.addEventListener('storage', this.handleStorageChange);
    
    // 监听路由变化
    this.$router.afterEach(() => {
      // 路由变化时立即检查，不延迟
      this.checkAuthStatus();
    });
  },
  
  beforeDestroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    window.removeEventListener('storage', this.handleStorageChange);
  },
  
  methods: {
    handleStorageChange(e) {
      if (e.key === 'user') {
        this.checkAuthStatus();
      }
    },
    
    checkAuthStatus() {
      // 检查localStorage中的用户信息
      const user = localStorage.getItem('user');
      const previousState = this.isLoggedIn;
      
      if (user) {
        try {
          const userData = JSON.parse(user);
          this.currentUser = userData;
          this.isLoggedIn = true;
          
          // 状态发生变化时触发全局事件
          if (!previousState) {
            this.$root.$emit('auth-status-changed', { isLoggedIn: true, user: userData });
          }
          
          // 可选：向后端验证token是否仍然有效（不阻塞UI）
          this.verifyToken();
        } catch (error) {
          console.error('解析用户信息失败:', error);
          this.clearAuthData();
        }
      } else {
        this.clearAuthData();
      }
    },
    
    async verifyToken() {
      try {
        // 使用完整路径
        const response = await axios.get('/api/auth/me', {
          withCredentials: true
        });
        
        if (!response.data.success) {
          this.clearAuthData();
        }
      } catch (error) {
        // 静默处理token验证失败，避免频繁提示
        console.warn('Token验证失败:', error);
        if (error.response && error.response.status === 401) {
          this.clearAuthData();
        }
      }
    },
    
    clearAuthData() {
      const wasLoggedIn = this.isLoggedIn;
      this.isLoggedIn = false;
      this.currentUser = null;
      
      // 状态发生变化时触发全局事件
      if (wasLoggedIn) {
        this.$root.$emit('auth-status-changed', { isLoggedIn: false, user: null });
      }
      
      // 只有当状态真正发生变化时才清理localStorage，避免无限循环
      if (wasLoggedIn && localStorage.getItem('user')) {
        clearAllUserData(); // 使用共享的清理函数
      }
    },
    
    async logout() {
      try {
        // 调用后端登出API，使用相对路径
        await axios.post('/api/auth/logout', {}, {
          withCredentials: true
        });
      } catch (error) {
        console.error('登出API调用失败:', error);
      } finally {
        // 无论API调用是否成功，都清理本地数据
        this.clearAuthData();
        
        // 显示成功消息
        if (this.$message) {
          this.$message.success('Successfully logged out');
        } else {
          console.log('已成功退出登录');
        }
        
        // 登出后根据当前页面决定跳转目标
        const currentPath = this.$route.path;
        if (currentPath === '/dashboard' || currentPath === '/userinfo') {
          // 从用户面板页面登出，跳转到会议参会信息页
          this.$router.push('/conference');
        } else if (currentPath === '/' || currentPath === '/conference' || currentPath === '/home' || currentPath === '/registration') {
          // 从会议参会信息页登出，跳转到登录页
          this.$router.push('/login');
        } else {
          // 其他页面登出，默认跳转到登录页
          this.$router.push('/login');
        }
      }
    }
  }
}
</script>

<style scoped>
.auth-app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f8f9fa;
}

.main-content {
  flex: 1;
  padding: 2rem 0;
}

.navbar {
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.card {
  border-radius: 12px !important;
}

.auth-form {
  font-size: 1.1rem;
}
                                                                                                                   
.footer {
  margin-top: auto;
}

/* 用户信息显示样式 */
.navbar .text-white {
  font-size: 1.1rem;
  font-weight: 500;
}

/* 用户头像链接样式 */
.user-profile-link {
  font-size: 1.1rem;
  font-weight: 500;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background-color: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.user-profile-link:hover {
  background-color: rgba(255, 255, 255, 0.2);
  color: white !important;
  text-decoration: none !important;
  border-color: rgba(255, 255, 255, 0.5);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.user-profile-link:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.username-text {
  font-weight: 600;
}

.profile-arrow {
  font-size: 0.8rem;
  opacity: 0.8;
  transition: transform 0.3s ease;
}

.user-profile-link:hover .profile-arrow {
  transform: translateY(1px);
  opacity: 1;
}

/* 登出按钮样式 */
.btn-outline-light:hover {
  background-color: rgba(255, 255, 255, 0.1);
  border-color: white;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .navbar-brand {
    font-size: 1.25rem !important;
  }
  .btn-lg {
    padding: 0.5rem 1rem;
  }
  
  /* 移动端导航栏去除边距 */
  .navbar .container-fluid {
    padding-left: 1rem !important;
    padding-right: 1rem !important;
  }
  
  /* 在小屏幕上简化用户名显示 */
  .user-profile-link {
    font-size: 0.95rem;
    max-width: 140px;
    padding: 0.4rem 0.6rem;
  }
  
  .username-text {
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .profile-arrow {
    font-size: 0.7rem;
  }
}

@media (max-width: 576px) {
  /* 第一行：标题 */
  .navbar .container-fluid {
    flex-wrap: wrap;
  }
  
  .navbar-brand {
    width: 100%;
    margin-bottom: 0.25rem;
    font-size: 1.1rem !important;
  }
  
  /* 第二行：用户信息和登出按钮 */
  .navbar .d-flex {
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    justify-content: flex-end;
  }
  
  /* 移动端底部栏去除边距 */
  .footer .container-fluid {
    padding-left: 1rem !important;
    padding-right: 1rem !important;
  }
  
  .user-profile-link {
    font-size: 0.85rem;
    padding: 0.25rem 0.4rem;
  }
  
  .username-text {
    max-width: 60px;
  }
  
  .btn-lg {
    padding: 0.25rem 0.5rem;
    font-size: 0.85rem;
  }
}
</style>