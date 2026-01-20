import 'core-js/stable';
import Vue from 'vue';
import VeeValidate from 'vee-validate';

// 引入全局样式
import './assets/styles/global.css';

// 动态导入 Bootstrap JS（这样 webpack 会处理 hash）
import('./assets/js/bootstrap.bundle.min.js');

// import { testLogin } from './_services/user.service'

// testLogin()

import { store } from './_store';
import router from './_helpers/router';
import ElementUI, { Form } from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import App from './app/App';
import axios from 'axios'
import Vueaxios from 'vue-axios'
import DownloadManagerPlugin from './_helpers/downloadManagerPlugin';
import GlobalSSEManagerPlugin from './_services/globalSSEManagerPlugin';

// 设置axios全局配置
const config = require('config');
// 移除 baseURL 配置，直接在请求中使用完整路径
// axios.defaults.baseURL = config.apiUrl; 
axios.defaults.withCredentials = true;

// 添加请求拦截器用于调试
axios.interceptors.request.use(
  config => {
    console.log('Axios Request:', {
      url: config.url,
      method: config.method,
      withCredentials: config.withCredentials,
      headers: config.headers,
      cookies: document.cookie // 添加当前cookie信息
    });
    return config;
  },
  error => {
    console.error('Axios Request Error:', error);
    return Promise.reject(error);
  }
);

// 添加响应拦截器用于调试
axios.interceptors.response.use(
  response => {
    console.log('Axios Response:', {
      url: response.config.url,
      status: response.status,
      headers: response.headers,
      setCookie: response.headers['set-cookie'] // 检查Set-Cookie头
    });
    return response;
  },
  error => {
    console.error('Axios Response Error:', {
      url: error.config && error.config.url,
      status: error.response && error.response.status,
      message: error.message
    });
    return Promise.reject(error);
  }
);

//Vue.use(VueAxios,axios);
//Vue.prototype.$test = axios
Vue.prototype.$http = axios; // 添加这行使组件可以使用this.$http
Vue.use(VeeValidate);
Vue.use(ElementUI);
Vue.use(DownloadManagerPlugin);
Vue.use(GlobalSSEManagerPlugin);
// setup fake backend
// import { configureFakeBackend } from './_helpers';
// configureFakeBackend();
//Vue.component(Button.name, Button);
//Vue.component(Select.name, Select);
//Vue.use(Form);

// 在应用启动时加载全局配置（会议名称等）
store.dispatch('config/fetchConfig').then(() => {
  console.log('✅ Global config loaded');
}).catch(err => {
  console.warn('⚠️ Failed to load global config, using defaults:', err);
});

new Vue({
    el: '#app',
    router,
    store,
    render: h => h(App)
});