import Vue from 'vue';
import Router from 'vue-router';

import Step1ProductSelection from '../conference/Step1ProductSelection'
import Step2PersonalInfo from '../conference/Step2PersonalInfo'
import Step3Payment from '../conference/Step3Payment'
import Step4Confirmation from '../conference/Step4Confirmation'
import Step5Receipt from '../conference/Step5Receipt'
import LoginPage from '../login/LoginPage'
import RegisterPage from '../register/RegisterPage'
import ForgotPasswordPage from '../login/ForgotPasswordPage'
import ResetPasswordPage from '../login/ResetPasswordPage'
import UserDashboard from '../userinfo/UserDashboard.vue'
import HomePage from '../components/HomePage.vue'

Vue.use(Router);

// 清理所有用户相关的localStorage数据
function clearAllUserData() {
  console.log('🧹 清理所有用户数据...');
  
  // 清理用户认证信息
  localStorage.removeItem('user');
  
  // 清理文档任务相关的localStorage
  // 获取所有localStorage键
  const keys = Object.keys(localStorage);
  
  // 清理所有以 'documentTasks_user_' 开头的键（按用户ID存储的任务）
  keys.forEach(key => {
    if (key.startsWith('documentTasks_user_')) {
      console.log(`🗑️ 清理任务存储: ${key}`);
      localStorage.removeItem(key);
    }
  });
  
  // 清理通用任务存储键（兼容旧版本）
  const taskKeys = [
    'documentTasks', 
    'documentPendingTasks',
    'documentProgress',
    'documentDownloadHistory'
  ];
  
  taskKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      console.log(`🗑️ 清理通用任务存储: ${key}`);
      localStorage.removeItem(key);
    }
  });
  
  // 清理其他可能的用户设置
  localStorage.removeItem('autoDownload');
  localStorage.removeItem('lastUserId');
  
  console.log('✅ 用户数据清理完成');
}

// 导出清理函数供其他模块使用
export { clearAllUserData };

const router = new Router({
  mode: 'history',
  routes: [
    { path: '/', component: HomePage }, // 使用HomePage组件，让路由守卫处理逻辑
    { path: '/home', redirect: '/' }, // 修改：保持向后兼容
    { path: '/registration', redirect: '/' }, // 修改：保持向后兼容
    
    // 新的步骤化注册流程
    { path: '/conference', redirect: '/conference/step1' },
    { path: '/conference/step1', component: Step1ProductSelection },
    { path: '/conference/step2', component: Step2PersonalInfo },
    { path: '/conference/step3', component: Step3Payment },
    { path: '/conference/step4', component: Step4Confirmation },
    { path: '/conference/step5', component: Step5Receipt },
    
    { path: '/dashboard', component: UserDashboard },
    { path: '/user/dashboard', component: UserDashboard },
    { path: '/login', component: LoginPage },
    { path: '/register', component: RegisterPage },
    { path: '/forgot-password', component: ForgotPasswordPage },
    { path: '/reset-password', component: ResetPasswordPage },
    // { path: '/courseinfo', component: CourseInfo },
    // { path: '/courselist', component: CourseList },
    // { path: '/addquestion', component: AddQuestion },
    // { path: '/qazone', component: QAZone },
    // { path: '/userinfo', component: UserInfo },
    
    // 重定向处理
    { path: '*', redirect: '/' }
  ]
});

router.beforeEach(async (to, from, next) => {
  console.log(`Router - Navigation: ${from.path || 'initial'} → ${to.path}`);
  
  // redirect to login page if not logged in and trying to access a restricted page
  const publicPages = ['/login', '/register', '/forgot-password', '/reset-password'];
  const authRequired = !publicPages.includes(to.path);
  const loggedIn = localStorage.getItem('user');
  console.log('User logged in:', !!loggedIn);
  console.log('Auth required:', authRequired);
  
  if (authRequired && !loggedIn) {
    console.log('Router - Redirecting to login (not authenticated)');
    return next('/login');
  }

  // 如果用户已登录且正在访问根路径或登录页面，先验证认证状态
  if (loggedIn && (to.path === '/' || to.path === '/login')) {
    // 检查是否是管理员跳转中，如果是则不处理
    if (sessionStorage.getItem('adminRedirect') === 'true') {
      console.log('Router - Admin redirect in progress, skipping normal flow');
      return next();
    }
    
    console.log('Router - LocalStorage shows user logged in, verifying with backend...');
    try {
      // 先验证认证状态，而不是直接跳转
      const axios = (await import('axios')).default;
      const authResponse = await axios.get('/api/auth/me', {
        withCredentials: true
      });
      
      if (authResponse.data.success) {
        console.log('Router - Backend auth verified, checking registration status...');
        
        // 对普通用户检查注册状态，决定跳转目标
        try {
          const registrationResponse = await axios.get('/api/submissions/check-registration', {
            withCredentials: true
          });
          
          if (registrationResponse.data.approved) {
            // 用户注册已批准
            if (to.path === '/' && from.path === '/dashboard') {
              // 如果是从dashboard点击首页，让用户进入会议注册编辑模式
              console.log('Router - User navigating from dashboard to home, redirecting to conference step5 for editing');
              return next('/conference/step5');
            } else {
              // 其他情况跳转到用户面板
              console.log('Router - User registration approved, redirecting to dashboard');
              return next('/dashboard');
            }
          } else if (registrationResponse.data.has_submission) {
            console.log('Router - User has pending registration, redirecting to step5');
            return next('/conference/step5');
          } else {
            console.log('Router - User needs to register, redirecting to conference');
            return next('/conference/step1');
          }
        } catch (regError) {
          console.error('Router - Registration check failed, defaulting to conference:', regError);
          return next('/conference/step1');
        }
      } else {
        console.log('Router - Backend auth failed, clearing localStorage and staying on login');
        clearAllUserData();
        if (to.path === '/') {
          return next('/login');
        }
        // 如果已经在登录页面，继续
      }
    } catch (error) {
      console.error('Router - Auth verification failed:', error);
      clearAllUserData();
      if (to.path === '/') {
        return next('/login');
      }
      // 如果已经在登录页面，继续
    }
  }

  // 检查会议注册状态 - 只在从登录页或根路径进入会议流程时检查
  // 如果用户从dashboard进入conference，说明用户想要修改，应该允许直接进入
  const isFromDashboard = from.path === '/dashboard' || from.path === '/user/dashboard';
  const isGoingToConference = to.path.startsWith('/conference') || to.path === '/conference';
  
  if (loggedIn && isFromDashboard && isGoingToConference) {
    console.log('Router - User navigating from dashboard to conference (edit mode), allowing direct access');
    return next();
  }
  
  if (loggedIn && isEnteringConferenceFlow(to, from)) {
    console.log('Router - Checking existing registration...');
    try {
      const registrationData = await checkExistingRegistration();
      if (registrationData) {
        if (registrationData.approved) {
          console.log('Router - Found approved registration, redirecting to dashboard');
          return next('/dashboard');
        } else {
          console.log('Router - Found existing registration, redirecting to step5');
          return next('/conference/step5');
        }
      } else {
        console.log('Router - No existing registration found, proceeding normally');
      }
    } catch (error) {
      console.error('Router - Failed to check registration status:', error);
      // 检查失败不影响正常流程
    }
  } else {
    console.log('Router - Skipping registration check (internal navigation or no auth required)');
  }

  next();
});

// 判断是否是从外部进入会议流程
function isEnteringConferenceFlow(to, from) {
  const conferenceRoutes = ['/conference/step1', '/conference/step2', '/conference/step3', '/conference/step4'];
  const isToConference = conferenceRoutes.includes(to.path) || to.path === '/conference' || to.path === '/';
  
  // 更精确的"外部进入"判断
  // 如果是从dashboard进入conference，说明用户想要修改注册信息，应该允许
  const isFromDashboard = from.path === '/dashboard' || from.path === '/user/dashboard';
  const isFromOutside = !from.path || 
                       from.path === '/login' || 
                       from.path === '/register' || 
                       (!from.path.startsWith('/conference') && isToConference && !isFromDashboard);
  
  const shouldCheck = isToConference && isFromOutside;
  
  console.log('Router - isEnteringConferenceFlow check:', {
    to: to.path,
    from: from.path || 'initial',
    isToConference,
    isFromOutside,
    isFromDashboard,
    shouldCheck
  });
  
  return shouldCheck;
}

// 检查现有注册状态
async function checkExistingRegistration() {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.id) return null;

    // 动态导入以避免循环依赖
    const axios = (await import('axios')).default;
    
    const response = await axios.get('/api/submissions/check-registration', {
      withCredentials: true
    });
    
    console.log('Router - Check existing registration response:', response.data);
    
    if (response.data.success && response.data.has_submission) {
      // 保存后端数据到localStorage
      await saveBackendDataToLocalStorage(response.data, user.id);
      return {
        approved: response.data.approved,
        has_submission: response.data.has_submission,
        data: response.data
      };
    }
    
    return null;
    
  } catch (error) {
    console.error('Router - Failed to check existing registration:', error);
    return null;
  }
}

// 保存后端数据到localStorage
async function saveBackendDataToLocalStorage(backendData, userId) {
  if (!userId || !backendData.registration_data) return;
  
  const regData = backendData.registration_data;
  const images = backendData.images || {};
  
  try {
    const getStorageKey = (baseName) => `${baseName}_${userId}`;
    
    // 保存产品选择数据
    const productData = {
      code: regData.product_code,
      price: regData.product_price,
      description: getProductDescription(regData.product_code)
    };
    localStorage.setItem(getStorageKey('conferenceProductSelection'), JSON.stringify(productData));
    
    // 保存用户信息
    const userInfo = {
      name: regData.name,
      email: regData.email,
      phone: regData.phone,
      affiliation: regData.affiliation,
      paperTitle: regData.paper_id
    };
    localStorage.setItem(getStorageKey('conferenceUserInfo'), JSON.stringify(userInfo));
    
    // 加载并保存图片
    if (images.proof) {
      await loadAndSaveImage(images.proof, getStorageKey('conferenceProofFile'));
    }
    
    if (images.screenshot) {
      await loadAndSaveImage(images.screenshot, getStorageKey('conferencePaymentProof'));
    }
    
    // 保存注册完成状态
    localStorage.setItem(getStorageKey('conferenceRegistrationComplete'), 'true');
    if (backendData.registration_id) {
      localStorage.setItem(getStorageKey('conferenceRegistrationId'), backendData.registration_id.toString());
    }
    
    console.log('Router - Backend data saved to localStorage for user:', userId);
    
  } catch (error) {
    console.warn('Router - Failed to save backend data to localStorage:', error);
  }
}

function getProductDescription(productCode) {
  const products = [
    { code: 'IEEE Member Registration', description: 'For IEEE members with valid membership' },
    { code: 'Non-Member Registration', description: 'For non-IEEE members' },
    { code: 'Student-member Registration', description: 'For students with IEEE membership' },
    { code: 'Student-non-member Registration', description: 'For students without IEEE membership' }
  ];
  
  const product = products.find(p => p.code === productCode);
  return product ? product.description : '';
}

async function loadAndSaveImage(imageUrl, storageKey) {
  try {
    // 检查本地是否已有图片
    if (localStorage.getItem(storageKey)) {
      console.log(`Router - Image already exists in localStorage for key: ${storageKey}`);
      return;
    }
    
    const axios = (await import('axios')).default;
    const config = (await import('config')).default;
    
    // 动态构建图片URL
    let fullUrl;
    if (imageUrl.startsWith('http')) {
      fullUrl = imageUrl;
    } else {
      // 直接从浏览器地址栏推断 baseUrl
      // 比如 http://localhost:3000/admin/#submissions
      // 获得 baseUrl = http://localhost:3000
      const baseUrl = window.location.origin;
      const cleanPath = imageUrl.startsWith('/uploads/') ? imageUrl : `/uploads/${imageUrl}`;
      fullUrl = `${baseUrl}${cleanPath}`;
    }
    
    console.log(`Router - Loading image from: ${fullUrl}`);
    
    const response = await axios.get(fullUrl, {
      responseType: 'blob',
      withCredentials: true
    });
    
    const blob = response.data;
    const reader = new FileReader();
    
    return new Promise((resolve, reject) => {
      reader.onload = () => {
        const base64Data = reader.result;
        localStorage.setItem(storageKey, base64Data);
        console.log(`Router - Image loaded and saved to localStorage: ${storageKey}`);
        resolve();
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    
  } catch (error) {
    console.warn(`Router - Failed to load image ${imageUrl}:`, error);
  }
}

// 添加全局路由错误处理，防止重复导航错误
const originalPush = Router.prototype.push;
const originalReplace = Router.prototype.replace;

Router.prototype.push = function push(location, onResolve, onReject) {
  if (onResolve || onReject) {
    return originalPush.call(this, location, onResolve, onReject);
  }
  return originalPush.call(this, location).catch((err) => {
    if (err.name !== 'NavigationDuplicated') {
      console.error('Navigation error:', err);
    }
  });
};

Router.prototype.replace = function replace(location, onResolve, onReject) {
  if (onResolve || onReject) {
    return originalReplace.call(this, location, onResolve, onReject);
  }
  return originalReplace.call(this, location).catch((err) => {
    if (err.name !== 'NavigationDuplicated') {
      console.error('Navigation error:', err);
    }
  });
};

export default router;


