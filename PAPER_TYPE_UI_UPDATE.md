# Paper Type UI 更新说明

## 更新日期
2025-10-24 (第二次更新)

## 主要变更

### 1. Paper Type 选择方式改为单选按钮（Radio Button）
- ✅ 从下拉选择框改为3个圆点式单选按钮
- ✅ 选项：Research Paper | Poster | None
- ✅ 添加了自定义样式，美观且易用
- ✅ 移动端优化为垂直排列

### 2. Paper ID 和 Paper Pages 字段必填
- ✅ 当 Paper Type 为 Research Paper 或 Poster 时，这两个字段变为必填
- ✅ 添加了必填验证规则
- ✅ Paper Type 为 None 时，这两个字段隐藏

### 3. Paper Pages 上限提升至 16 页
- ✅ 前端验证：1-16 页
- ✅ 后端验证：1-16 页
- ✅ 模型验证：1-16 页
- ✅ 提示文本不显示具体上限数字

## 修改的文件

### 前端
1. **Step2PersonalInfo.vue**
   - 将 `el-select` 改为 `el-radio-group`
   - Paper ID 和 Paper Pages 添加 `required` 属性
   - 更新验证规则，支持 1-16 页
   - 添加单选按钮样式
   - 更新提示文本，不显示上限

### 后端
1. **RegistrationSubmission.js (模型)**
   - 更新 paper_pages 验证：1-16 页
   - 更新错误消息

2. **submissions.js (路由)**
   - 更新 paper_pages 验证：1-16 页
   - 更新错误消息为通用提示

## 验证规则

### Paper ID
- 必填（当 Paper Type 为 research 或 poster）
- 必须是数字且不以 0 开头
- 正则：`/^[1-9]\d*$/`

### Paper Pages
- 必填（当 Paper Type 为 research 或 poster）
- 必须是 1-16 之间的数字
- 正则：`/^([1-9]|1[0-6])$/`

## 超页费用计算（未改变）
- Research Paper: 8页内免费，超出每页 $80
- Poster: 2页内免费，超出每页 $80

## 测试建议
1. 测试单选按钮在 Full Registration 下可以切换
2. 测试 Attendee Registration 下自动设为 None 且禁用
3. 测试 Paper Type 为 research/poster 时 Paper ID 和 Pages 必填验证
4. 测试 Paper Pages 输入 1-16 页的验证
5. 测试移动端单选按钮的垂直排列显示
