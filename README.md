# ICPADS 2025 会议注册系统

一个完整的会议注册管理系统，包含前端用户界面和后端API服务。该系统专为学术会议注册设计，支持用户注册、论文提交、付款管理和管理员后台等功能。

## 项目架构

```
2025.06.ConfReg/
├── frontend/          # Vue.js 前端应用
│   ├── src/
│   │   ├── app/         # 主应用组件
│   │   ├── components/  # 可复用组件
│   │   ├── conference/  # 会议相关页面
│   │   ├── login/       # 登录模块
│   │   ├── register/    # 注册模块
│   │   ├── userinfo/    # 用户信息模块
│   │   ├── _helpers/    # 工具函数
│   │   ├── _services/   # API服务
│   │   └── _store/      # Vuex状态管理
│   └── assets/          # 静态资源
└── server/            # Node.js 后端服务
    ├── src/
    │   ├── routes/      # API路由
    │   ├── models/      # 数据模型
    │   ├── middleware/  # 中间件
    │   └── utils/       # 工具函数
    ├── database/        # SQLite数据库
    ├── uploads/         # 文件上传存储
    └── mgt/            # 管理脚本
```

## 技术栈

### 前端
- **框架**: Vue.js 2.6
- **状态管理**: Vuex
- **路由**: Vue Router
- **UI组件**: Element UI
- **HTTP客户端**: Axios
- **构建工具**: Webpack
- **样式**: CSS + PostCSS + Tailwind CSS

### 后端
- **运行时**: Node.js 24.2.0
- **框架**: Express.js
- **数据库**: SQLite + Sequelize ORM
- **认证**: Session-based authentication + bcrypt
- **文件处理**: Multer
- **PDF生成**: PDFKit
- **安全**: Helmet, Rate limiting, CORS

## 功能特性

### 用户功能
- ✅ 用户注册与登录
- ✅ 会议注册提交
- ✅ 文件上传（付款凭证、身份证明等）
- ✅ 注册状态查询
- ✅ PDF收据下载
- ✅ 个人信息管理

### 管理员功能
- ✅ 注册审核管理
- ✅ 用户管理
- ✅ 统计数据查看
- ✅ 系统配置

### 系统特性
- 🔒 安全的用户认证
- 📱 响应式设计
- 🚀 RESTful API
- 📄 自动PDF生成
- 💾 SQLite嵌入式数据库
- 📊 实时数据统计

## 快速开始

### 环境要求

- Node.js >= 18.0.0 (推荐 24.2.0)
- npm >= 8.0.0
- 现代浏览器（支持ES6+）

### 1. 克隆项目

```bash
git clone <repository-url>
cd 2025.06.ConfReg
```

### 2. 后端设置

```bash
cd server

# 安装依赖
npm install

# 初始化数据库
npm run init-db

# 启动后端服务
npm run dev
```

后端服务将在 http://localhost:3000 启动

### 3. 前端设置

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端应用将在 http://localhost:8080 启动

### 4. 默认管理员账户

- **用户名**: admin
- **密码**: admin123456

## 开发指南

### 前端开发

```bash
cd frontend

# 开发模式
npm run dev

# 生产构建
npm run build

# 启动开发服务器
npm start
```

#### 前端目录结构

```
frontend/src/
├── app/              # 主应用组件
├── components/       # 公共组件
├── conference/       # 会议注册相关页面
├── login/           # 登录页面
├── register/        # 用户注册页面
├── userinfo/        # 用户信息页面
├── _helpers/        # 工具函数和辅助文件
│   ├── auth-header.js     # 认证头处理
│   ├── router.js          # 路由配置
│   └── downloadManagerPlugin.js  # 下载管理插件
├── _services/       # API服务层
│   ├── user.service.js    # 用户相关API
│   └── globalSSEManagerPlugin.js  # SSE管理
├── _store/          # Vuex状态管理
└── assets/          # 静态资源
    ├── styles/      # 样式文件
    └── images/      # 图片资源
```

### 后端开发

```bash
cd server

# 开发模式（自动重启）
npm run dev

# 生产模式
npm start

# 初始化数据库
npm run init-db

# 重置数据库
npm run init-db-reset
```

#### 后端目录结构

```
server/src/
├── app.js           # 应用入口
├── routes/          # API路由
│   ├── auth.js      # 认证相关路由
│   ├── submissions.js  # 注册提交路由
│   └── users.js     # 用户管理路由
├── models/          # 数据模型
│   ├── User.js      # 用户模型
│   └── RegistrationSubmission.js  # 注册提交模型
├── middleware/      # 中间件
│   └── auth.js      # 认证中间件
├── services/        # 业务服务
├── utils/           # 工具函数
│   ├── pdfGenerator.js  # PDF生成
│   └── response.js      # 响应格式化
└── config/          # 配置文件
    └── database.js  # 数据库配置
```

## API 文档

### 认证接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/logout` | 用户登出 |
| POST | `/api/auth/register` | 用户注册 |
| GET | `/api/auth/status` | 检查认证状态 |

### 注册提交接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/submissions/submit` | 提交/更新注册信息 |
| GET | `/api/submissions/check-registration` | 检查注册状态 |
| GET | `/api/submissions/download_receipt` | 下载收据PDF |
| GET | `/api/submissions/stats` | 获取统计数据（管理员） |

### 用户管理接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/users/profile` | 获取用户资料 |
| PUT | `/api/users/profile` | 更新用户资料 |

## 配置说明

### 环境变量

创建 `server/.env` 文件：

```env
# 服务器配置
CONFREG_BE_PORT=3000
NODE_ENV=development

# 安全配置
SESSION_SECRET=your-super-secret-session-key-change-in-production

# 文件上传配置
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760

# CORS配置
CORS_ORIGIN=http://localhost:8080

# 数据库配置（SQLite - 无需额外配置）
# 数据库文件将自动创建在 ./database/icpads2025.sqlite
```

### 前端配置

`frontend/src/config/` 中的配置文件：

```javascript
// 开发环境
export default {
  apiUrl: 'http://localhost:3000/api'
};

// 生产环境
export default {
  apiUrl: '/api'
};
```

## 部署指南

### 生产环境部署

#### 1. 后端部署

```bash
cd server

# 使用正确的Node.js版本
nvm use 24.2.0

# 安装生产依赖
npm ci --production

# 初始化生产数据库
NODE_ENV=production npm run init-db

# 使用PM2启动（推荐）
npm install -g pm2
pm2 start src/app.js --name "icpads2025-backend"
```

#### 2. 前端部署

```bash
cd frontend

# 构建生产版本
npm run build

# 将dist/目录部署到Web服务器
# 或配置nginx代理
```

#### 3. Nginx配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端API代理
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 文件上传（如果需要）
    location /uploads/ {
        root /path/to/server;
    }
}
```

### Docker 部署（可选）

```dockerfile
# 后端 Dockerfile
FROM node:24.2.0-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production

COPY . .
RUN npm run init-db

EXPOSE 3000
CMD ["npm", "start"]
```

## 数据库管理

### 管理脚本

```bash
cd server

# 初始化数据库
node mgt/init-db.js

# 重置管理员密码
node mgt/reset-admin.js

# 数据库备份
cp ./database/icpads2025.sqlite ./backup/backup_$(date +%Y%m%d_%H%M%S).sqlite

# 数据库状态检查
sqlite3 ./database/icpads2025.sqlite "
SELECT 'Users' as table_name, COUNT(*) as count FROM backend_userinfo
UNION ALL  
SELECT 'Registrations', COUNT(*) FROM RegistrationSubmissions;
"
```

### 数据库架构

#### 用户表 (backend_userinfo)
```sql
CREATE TABLE backend_userinfo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    fullname VARCHAR(255),
    createdAt DATETIME,
    updatedAt DATETIME
);
```

#### 注册提交表 (RegistrationSubmissions)
```sql
CREATE TABLE RegistrationSubmissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(255),
    affiliation VARCHAR(255),
    paper_id VARCHAR(255),
    product_code VARCHAR(255),
    product_price DECIMAL(10,2),
    screenshot TEXT,
    proof TEXT,
    status VARCHAR(255) DEFAULT 'pending',
    createdAt DATETIME,
    updatedAt DATETIME,
    FOREIGN KEY (userId) REFERENCES backend_userinfo(id)
);
```

## 故障排除

### 常见问题

#### 1. 无法登录
```bash
# 重置管理员密码
cd server
node mgt/reset-admin.js
```

#### 2. 数据库连接错误
```bash
# 检查数据库文件
ls -la ./database/icpads2025.sqlite

# 重新初始化
npm run init-db
```

#### 3. 文件上传失败
- 检查 `uploads/` 目录权限
- 确认文件大小限制
- 查看服务器日志

#### 4. 前端API请求失败
- 检查CORS配置
- 确认后端服务运行状态
- 查看浏览器网络面板

### 日志查看

```bash
# 后端日志
cd server
ls -la logs/

# 实时查看日志
tail -f logs/server_*.log
```

## 开发工具推荐

### VS Code 扩展
- Vue Language Features (Vetur)
- ESLint
- Prettier
- Auto Rename Tag
- GitLens

### 调试工具
- Vue.js devtools (浏览器扩展)
- Postman (API测试)
- SQLite Browser (数据库查看)

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 开发规范

- 使用ES6+语法
- 遵循Vue.js风格指南
- 编写清晰的注释
- 保持代码整洁
- 添加适当的错误处理

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 联系信息

- 项目维护者: ICPADS 2025 Team
- 邮箱: [联系邮箱]
- 项目地址: [项目仓库URL]

## 更新日志

### v1.0.0 (2025-09-08)
- ✅ 初始版本发布
- ✅ 用户注册登录功能
- ✅ 会议注册提交
- ✅ 文件上传处理
- ✅ PDF收据生成
- ✅ 管理员后台
- ✅ SQLite数据库集成

---

**注意**: 这是一个学术会议注册系统，请确保在生产环境中修改默认密码和安全配置。
