# Paper Type 功能更新说明

## 更新日期
2025-10-24

## 功能概述
在 Step2 个人信息页面添加了 Paper Type 选择功能，支持三种类型：
- Research Paper（研究论文）
- Poster（海报）
- None（无）

## 主要变更

### 1. 前端变更

#### Step2PersonalInfo.vue
- 添加了 `paperType` 字段，默认值为 `'research'`
- 添加 Paper Type 下拉选择框
- 根据注册类型（Full/Attendee）自动控制 Paper Type 的可编辑性
  - Full Registration: 可以选择任意类型
  - Attendee Registration: 自动设置为 None，且无法修改
- 当 Paper Type 为 None 时，Paper ID 和 Paper Pages 字段隐藏
- 添加了 `isFullRegistration` 计算属性来判断注册类型
- 添加了 `loadRegistrationCategory()` 方法从 localStorage 加载注册类型

#### Step3Payment.vue
- 更新了超页费用计算逻辑 `extraPageFee()`:
  - Research Paper: 8页内免费，第9-10页每页 $80
  - Poster: 2页内免费，第3-10页每页 $80
  - None: 不计算超页费用
- 更新了超页页数计算 `extraPagesCount()`
- 更新了显示逻辑，更清晰地显示超页范围

#### Step4Confirmation.vue
- 添加 `paper_type` 字段到提交数据中

### 2. 后端变更

#### 数据库模型 (RegistrationSubmission.js)
- 添加 `paper_type` 字段:
  ```javascript
  paper_type: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: 'research',
    validate: {
      isIn: {
        args: [['research', 'poster', 'none']],
        msg: 'Paper type must be research, poster, or none'
      }
    }
  }
  ```
  注意：SQLite 不支持 ENUM 类型，所以使用 TEXT + 验证器

#### API 路由 (submissions.js)
- 在 POST `/api/submissions/submit` 接口中添加 `paper_type` 参数处理
- 在获取注册信息的接口中返回 `paper_type` 字段
- 在更新和创建注册记录时保存 `paper_type`

#### 数据库迁移
- 创建了迁移文件 `20251024_add_paper_type.js`
- 创建了 JavaScript 迁移运行器 `run-js-migration.js`

## 部署步骤

### 1. 运行数据库迁移

✅ **已完成！** 数据库迁移已成功执行。

如果需要在其他环境重新运行：
```bash
cd server
node mgt/run-js-migration.js 20251024_add_paper_type.js
```

验证迁移：
```bash
node mgt/check-columns.js
```

### 2. 重启服务

```bash
# 前端
cd frontend
npm run build  # 如果是生产环境

# 后端
cd server
# 重启 Node.js 服务
```

## 功能逻辑

### Paper Type 控制规则

1. **注册类型为 Full Registration**
   - Paper Type 可以自由选择（research/poster/none）
   - 默认选中 research

2. **注册类型为 Attendee Registration**
   - Paper Type 自动设置为 none
   - Paper Type 下拉框禁用，无法修改
   - Paper ID 和 Paper Pages 字段隐藏

3. **Paper Type 为 None**
   - Paper ID 和 Paper Pages 字段隐藏或无法输入
   - 不计算超页费用

### 超页费用计算规则

1. **Research Paper**
   - 8页内: 免费
   - 第9页: $80 (¥600)
   - 第10页: $80 (¥600)
   - 最多10页

2. **Poster**
   - 2页内: 免费
   - 第3页及以上: 每页 $80 (¥600)
   - 最多10页

3. **None**
   - 不计算超页费用

## 兼容性说明

- 已有的注册记录会默认设置 `paper_type` 为 `'research'`
- 前端会正确读取和显示已有记录的 paper_type 信息
- 如果后端返回的数据没有 paper_type，前端会使用默认值 `'research'`

## 测试建议

1. 测试 Full Registration 下的所有 Paper Type 选项
2. 测试 Attendee Registration 下 Paper Type 自动设为 None
3. 测试不同 Paper Type 下的超页费用计算
4. 测试编辑已有注册记录时的 Paper Type 显示和保存
5. 测试 Paper Type 为 None 时 Paper ID 和 Pages 字段的隐藏/显示

## 注意事项

- 确保数据库迁移在部署代码前完成
- 建议先在测试环境验证功能
- 如需回滚，执行：`ALTER TABLE registration_submissions DROP COLUMN paper_type;`
