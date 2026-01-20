# 会议名称配置化改造说明

## 概述

将系统中硬编码的 "ICPADS 2025" 和 "ICPADS2025" 改为从环境变量中读取，提高系统的灵活性和可配置性。

## 环境变量配置

在 `.env` 文件中添加以下配置：

```bash
# 会议名称配置
CONFREG_CONFERENCE_NAME=ICPADS 2025
CONFREG_CONFERENCE_NAME_SHORT=ICPADS2025
```

这两个环境变量控制整个系统中显示的会议名称。

## 后端改动

### 1. 配置文件 (`server/src/config/email.js`)

- 添加了会议名称的环境变量读取
- 新增 `conference` 配置对象，导出会议名称供其他模块使用
- 邮件模板主题自动使用环境变量中的会议名称

```javascript
const CONFERENCE_NAME = process.env.CONFREG_CONFERENCE_NAME || 'ICPADS 2025';
const CONFERENCE_NAME_SHORT = process.env.CONFREG_CONFERENCE_NAME_SHORT || 'ICPADS2025';

const emailConfig = {
  // ...其他配置
  conference: {
    name: CONFERENCE_NAME,
    nameShort: CONFERENCE_NAME_SHORT
  }
};
```

### 2. 邮件服务 (`server/src/utils/emailService.js`)

- 所有邮件模板中的硬编码会议名称替换为变量
- 包括：
  - 邮箱验证邮件（中英文）
  - 密码重置邮件
  - 用户名更新验证邮件
  - 欢迎邮件

### 3. 邮件任务管理器 (`server/src/utils/emailTaskManager.js`)

- 群发邮件模板中的会议名称使用变量

### 4. 路由文件

修改了以下路由文件中的硬编码：

- `server/src/routes/auth-new.js` - 注册欢迎邮件
- `server/src/routes/admin.js` - 管理员通知邮件、数据库备份文件名
- `server/src/routes/submissions.js` - 注册提交通知邮件、PDF文件名
- `server/src/routes/admin-invoices.js` - 发票相关邮件
- `server/src/routes/backup-email.js` - 备用邮箱验证邮件
- `server/src/routes/email.js` - 邮件测试功能

### 5. PDF生成服务 (`server/src/services/pdfWorker.js`)

- 在 `renderTemplate` 函数中自动注入会议名称到所有模板
- 所有生成的PDF中会自动使用配置的会议名称

### 6. HTML模板

修改了以下PDF模板文件：

- `server/src/templates/receipt.html` - 收据模板
- `server/src/templates/registration-info.html` - 注册信息模板
- `server/src/templates/confirmation-letter.html` - 确认函模板
- `server/src/templates/meal-voucher.html` - 晚宴券模板

使用 `{{conferenceName}}` 和 `{{conferenceNameShort}}` 占位符。

### 7. 配置API (`server/src/routes/config.js`)

添加了会议名称到公共配置API：

```javascript
GET /api/config

返回：
{
  success: true,
  data: {
    conference: {
      name: "ICPADS 2025",
      nameShort: "ICPADS2025"
    },
    // ...其他配置
  }
}
```

## 前端改动

### 当前状态

前端Vue组件中的硬编码暂时保留，原因：

1. Vue组件需要在初始化时从API获取配置
2. 需要实现全局状态管理来共享会议名称
3. 涉及多个组件的改动较大

### 后续优化建议

前端可以通过以下方式使用会议配置：

```javascript
// 在Vue应用初始化时获取配置
async function loadConfig() {
  const response = await fetch('/api/config');
  const data = await response.json();
  
  // 存储到Vuex store或全局变量
  window.conferenceConfig = data.data.conference;
}

// 在组件中使用
computed: {
  conferenceName() {
    return window.conferenceConfig?.name || 'ICPADS 2025';
  }
}
```

建议在 `frontend/src/_store/` 中创建专门的配置模块来管理会议配置。

### 已修改的前端文件

- `frontend/src/index.html` - 页面标题添加TODO注释

## 管理后台改动

修改了以下管理后台静态页面：

- `server/public/admin/login.html` - 登录页标题
- `server/public/admin/index.html` - 管理首页标题
- `server/public/admin/backend/index.html` - 后台管理主页标题

这些页面已添加通用标题和TODO注释，建议后续通过JavaScript动态加载会议名称。

## 测试建议

### 1. 环境变量测试

修改 `.env` 文件中的会议名称，重启服务器，验证：

- 邮件中显示的会议名称
- 生成的PDF文档中的会议名称
- API返回的配置信息

### 2. 邮件测试

使用邮件测试API测试：

```bash
POST /api/email/test
{
  "to": "test@example.com",
  "subject": "测试邮件",
  "message": "测试内容"
}
```

验证邮件主题和内容中的会议名称是否正确。

### 3. PDF生成测试

生成各类PDF文档，验证：

- 收据(Receipt)
- 注册信息(Registration Info)
- 确认函(Confirmation Letter)
- 晚宴券(Meal Voucher)

确认PDF中的会议名称显示正确。

## 兼容性说明

- 如果不配置环境变量，系统会使用默认值 "ICPADS 2025" 和 "ICPADS2025"
- 所有改动向后兼容，不影响现有功能
- 数据库中存储的历史数据不受影响

## 文件清单

### 后端核心文件

```
server/
├── src/
│   ├── config/
│   │   └── email.js                    ✅ 添加会议名称配置
│   ├── utils/
│   │   ├── emailService.js             ✅ 替换所有邮件模板硬编码
│   │   └── emailTaskManager.js         ✅ 替换群发邮件模板硬编码
│   ├── routes/
│   │   ├── auth-new.js                 ✅ 替换邮件主题和内容
│   │   ├── admin.js                    ✅ 替换邮件和文件名
│   │   ├── submissions.js              ✅ 替换邮件和PDF文件名
│   │   ├── admin-invoices.js           ✅ 替换发票邮件主题
│   │   ├── backup-email.js             ✅ 替换验证邮件
│   │   ├── email.js                    ✅ 替换测试邮件
│   │   └── config.js                   ✅ 添加会议配置API
│   ├── services/
│   │   └── pdfWorker.js                ✅ PDF生成支持变量
│   └── templates/
│       ├── receipt.html                ✅ 使用{{conferenceName}}
│       ├── registration-info.html      ✅ 使用{{conferenceName}}
│       ├── confirmation-letter.html    ✅ 使用{{conferenceName}}
│       └── meal-voucher.html           ✅ 使用{{conferenceName}}
└── public/
    └── admin/
        ├── login.html                   ✅ 更新标题
        ├── index.html                   ✅ 更新标题
        └── backend/
            └── index.html               ✅ 更新标题
```

### 配置文件

```
.env                                     ✅ 添加会议名称变量
.env.example                             ✅ 添加会议名称示例
```

### 前端文件

```
frontend/src/
└── index.html                           ⚠️ 标题+TODO注释

注：其他前端文件保留硬编码，等待后续优化
```

## 未来改进

1. **前端全局配置**：实现Vuex配置模块，统一管理会议配置
2. **动态标题**：管理后台使用JavaScript动态设置页面标题
3. **多语言支持**：扩展配置支持多语言会议名称
4. **配置UI**：在管理后台添加配置管理界面
5. **文件名模板**：PDF文件名也支持配置化（如 `{conferenceShort}_Receipt_{id}.pdf`）

## 回滚方案

如果需要回滚到硬编码版本：

1. 从 `.env` 文件中移除会议名称配置
2. 系统会自动使用默认值 "ICPADS 2025"
3. 或者直接还原相关文件到之前的版本

## 联系与支持

如有问题或需要进一步优化，请联系开发团队。

---

**变更日期**: 2026年1月20日  
**变更人**: GitHub Copilot  
**影响范围**: 后端核心模块、邮件系统、PDF生成、配置API
