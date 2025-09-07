# ICPADS 2025 Registration Server

一个完全独立的会议注册管理系统后端服务，使用 Node.js + SQLite + Sequelize。

## 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 初始化数据库
```bash
node mgt/init-db.js
```
这将自动：
- 创建所有必要的数据库表和索引
- 创建默认管理员用户 (admin/admin123456)
- 设置完整的数据库结构

#### 数据库管理选项
```bash
# 只初始化数据库结构（首次运行）
node mgt/init-db.js

# 仅重置数据库（清空所有数据）
node mgt/init-db.js --reset
```

### 3. 启动服务器
```bash
npm start
```

服务器将在 http://localhost:3000 启动。

### 推荐的部署流程
1. **开发环境**：`node mgt/init-db.js`（初始化数据库结构）
2. **生产环境**：`node mgt/init-db.js --reset`（重置并初始化数据库）

### 验证部署
```bash
# 检查数据库状态
sqlite3 ./database/icpads2025.sqlite "SELECT COUNT(*) as user_count FROM backend_userinfo; SELECT COUNT(*) as registration_count FROM RegistrationSubmissions;"

# 测试API可用性
curl http://localhost:3000/api/auth/status
```

## 功能特性

- 用户认证（注册、登录、登出）
- 会议注册提交（包含文件上传）
- 注册状态检查
- PDF收据生成和下载
- 统计数据（管理员功能）

## 技术栈

- **框架**: Express.js
- **数据库**: SQLite with Sequelize ORM
- **认证**: Session-based authentication
- **文件上传**: Multer
- **PDF生成**: PDFKit
- **安全**: Helmet, Rate limiting
- **验证**: Express-validator

## 项目结构

```
server/
├── mgt/
│   ├── init-db.js           # 数据库初始化脚本
│   ├── manage-logs.js       # 日志管理脚本
│   ├── manage-sqlite3.js    # SQLite管理脚本
│   ├── pre-start-check.js   # 启动前检查脚本
│   └── reset-admin.js       # 管理员重置脚本
├── start.js                 # 应用启动文件
├── src/
│   ├── app.js               # 主应用文件
│   ├── models/
│   │   ├── User.js         # 用户模型
│   │   └── RegistrationSubmission.js  # 注册提交模型
│   ├── routes/
│   │   ├── auth.js         # 认证路由
│   │   ├── submissions.js  # 注册提交路由
│   │   └── users.js        # 用户管理路由
│   ├── middleware/
│   │   └── auth.js         # 认证中间件
│   ├── utils/
│   │   ├── pdfGenerator.js # PDF生成工具
│   │   └── response.js     # 响应工具
│   └── config/
│       └── database.js     # 数据库配置
├── database/
│   └── icpads2025.sqlite   # SQLite数据库文件
├── uploads/                # 文件上传目录
├── public/                 # 静态文件目录
├── package.json
└── README.md
```

## API 端点

### 认证相关
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出  
- `POST /api/auth/register` - 用户注册
- `GET /api/auth/status` - 检查认证状态

### 注册提交相关
- `POST /api/submissions/submit` - 创建/更新注册提交
- `GET /api/submissions/check-registration` - 检查注册状态
- `GET /api/submissions/download_receipt` - 下载收据PDF
- `GET /api/submissions/stats` - 获取统计数据（管理员）

### 用户相关
- `GET /api/users/profile` - 获取用户资料
- `PUT /api/users/profile` - 更新用户资料

## 安装和运行

1. **安装依赖**:
   ```bash
   npm install
   ```

2. **配置环境变量**:
   复制并修改 `.env` 文件中的配置

3. **启动应用**:
   确保已初始化SQLite数据库：
   ```bash
   # 初始化数据库（首次运行时）
   npm run init-db
   
   # 开发模式
   npm run dev
   
   # 生产模式
   npm start
   ```

## 环境变量

```env
CONFREG_BE_PORT=3000
NODE_ENV=development
SESSION_SECRET=your-super-secret-session-key
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760
CORS_ORIGIN=http://localhost:8080
```

注意：使用SQLite数据库，不再需要数据库连接相关的环境变量。

## 数据模型

### User (用户)
- username: 用户名（用于登录）
- password: 密码（加密存储）
- fullname: 完整姓名

### RegistrationSubmission (注册提交)
- user: 用户引用
- name: 姓名
- email: 邮箱
- phone: 电话
- affiliation: 机构
- paper_id: 论文ID
- product_code: 产品代码
- product_price: 价格
- screenshot: 付款截图
- proof: 证明文件
- status: 状态（pending/approved/rejected）

## 数据库特性

- **嵌入式数据库**: 无需安装额外的数据库服务
- **文件存储**: 数据库文件位于 `./database/icpads2025.sqlite`
- **便携性**: 可以轻松备份和迁移数据库文件
- **开发友好**: 本地开发无需启动额外的数据库服务

## SQLite 优势

1. **零配置**: 无需安装和配置数据库服务器
2. **轻量级**: 占用资源少，启动快速
3. **ACID事务**: 完全支持ACID事务
4. **标准SQL**: 支持大部分标准SQL语法
5. **跨平台**: 数据库文件可在不同操作系统间移植
6. **可靠性**: 经过充分测试，广泛应用于生产环境

## 安全特性

- Helmet安全头
- 速率限制
- 输入验证
- 密码加密
- 安全的会话管理
- 文件上传限制

## 开发说明

- 使用nodemon进行开发时的自动重启
- 错误处理和日志记录
- 输入验证和数据清理
- CORS配置用于前端集成

## 部署

1. 设置生产环境变量
2. 复制SQLite数据库文件到生产环境
3. 使用PM2或其他进程管理器
4. 配置反向代理（Nginx）
5. 启用HTTPS

## 部署和环境一致性

### 重要：版本锁定
本项目锁定了关键依赖版本以确保部署一致性：
- **bcrypt: 6.0.0** (密码哈希库)
- **Node.js: 24.2.0** (运行时环境)

### 部署步骤
```bash
# 1. 使用正确的 Node.js 版本
nvm use  # 如果使用 nvm，会自动读取 .nvmrc

# 2. 严格按照锁定版本安装依赖
npm ci  # 而不是 npm install

# 3. 验证部署环境
./deployment-check.sh

# 4. 初始化数据库
node mgt/init-db.js
```

详细部署说明请参考 [BCRYPT_DEPLOYMENT.md](./BCRYPT_DEPLOYMENT.md)

## 数据库管理

### 管理脚本
项目提供了多个管理脚本，位于 `mgt/` 目录：

```bash
# 数据库初始化
node mgt/init-db.js

# 重置管理员密码
node mgt/reset-admin.js

# SQLite数据库管理
node mgt/manage-sqlite3.js

# 日志管理
node mgt/manage-logs.js

# 启动前检查
node mgt/pre-start-check.js
```

### 初始化
```bash
# 初始化数据库结构（首次部署）
node mgt/init-db.js

# 仅重置数据库结构，清空所有数据
node mgt/init-db.js --reset
```

### 数据库备份与恢复
```bash
# 备份当前数据库
cp ./database/icpads2025.sqlite ./backup/icpads2025_backup_$(date +%Y%m%d_%H%M%S).sqlite

# 恢复数据库备份
cp ./backup/icpads2025_backup_YYYYMMDD_HHMMSS.sqlite ./database/icpads2025.sqlite

# 验证数据库完整性
sqlite3 ./database/icpads2025.sqlite "PRAGMA integrity_check;"
```

### 数据库状态检查
```bash
# 查看数据库表结构
sqlite3 ./database/icpads2025.sqlite ".schema"

# 查看数据统计
sqlite3 ./database/icpads2025.sqlite "
SELECT 'Users' as table_name, COUNT(*) as count FROM backend_userinfo
UNION ALL
SELECT 'RegistrationSubmissions', COUNT(*) FROM RegistrationSubmissions;
"

# 检查外键约束
sqlite3 ./database/icpads2025.sqlite "PRAGMA foreign_key_check;"
```

## 故障排除

### 密码登录问题
如果遇到登录问题：

**问题症状**：
- 使用正确的用户名密码无法登录
- 提示"Wrong User or password"错误

**解决方案**：
1. **使用重置脚本**（推荐）：
   ```bash
   node mgt/reset-admin.js
   ```

2. **手动重置管理员密码**：
   ```bash
   node -e "
   const bcrypt = require('bcrypt');
   const sqlite3 = require('sqlite3').verbose();
   const db = new sqlite3.Database('./database/icpads2025.sqlite');
   bcrypt.hash('admin123456', 10).then(hash => {
     db.run('UPDATE backend_userinfo SET password = ? WHERE username = ?', [hash, 'admin'], (err) => {
       if (err) console.error(err);
       else console.log('管理员密码已重置为: admin123456');
       db.close();
     });
   });
   ```

**验证修复**：
- 管理员登录信息：用户名 `admin`，密码 `admin123456`
- 密码哈希应以 `$2a$` 或 `$2b$` 开头（bcrypt格式）

### 数据库连接问题
```bash
# 检查数据库文件是否存在
ls -la ./database/icpads2025.sqlite

# 检查数据库文件权限
chmod 664 ./database/icpads2025.sqlite

# 验证数据库完整性
sqlite3 ./database/icpads2025.sqlite "PRAGMA integrity_check;"
```

## 测试

```bash
npm test
```

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。
