# 八字 AI 分析器 (Bazi AI Analyzer)

基于传统命理学与现代 AI 技术的智能八字分析系统，提供精准的八字排盘、大运流年分析、以及 AI 智能问答功能。

## 项目架构

```
bazi-ai-analyzer/
├── client/          # React 前端应用
│   ├── src/
│   │   ├── App.tsx          # 主应用组件
│   │   ├── index.css       # 全局样式
│   │   └── utils/api.ts    # API 调用封装
│   └── package.json
├── server/         # Express 后端服务
│   ├── src/
│   │   ├── index.ts        # 服务器入口
│   │   ├── routes/bazi.ts   # 八字分析路由
│   │   └── services/deepseek.ts  # DeepSeek AI 服务
│   └── package.json
bazi-mcp/          # 八字 MCP 服务 (独立运行)
└── 全量事件预测清单说明.md  # 42项事件预测清单
```

## 功能特性

### 1. 八字排盘
- 根据出生日期时间精准计算八字
- 四柱天干地支、五行、阴阳、十神分析
- 纳音、旬、空亡、星运、自坐分析
- 神煞自动识别与分类
- 刑冲合会关系分析

### 2. 大运流年
- 精确计算起运年龄与日期
- 10 步大运，每步 10 年
- 每步大运包含完整 10 年流年
- 流年干支按公历年份正确排列
- 自动高亮显示当前年份所在大运

### 3. 命理基础分析
- **旺衰判断**：日主五行旺衰分析
- **格局判定**：比肩格、食神格、正官格等
- **喜忌神**：根据旺衰确定喜神、忌神
- **五行分布**：木火土金水占比统计
- **缺失五行**：命局中缺失的五行
- **婚姻分析**：配偶星、桃花星分析
- **财运分析**：财星状态、理财建议
- **事业分析**：官星、印星、事业方向

### 4. AI 智能问答
- 基于 DeepSeek AI 的专业命理解读
- 内置 42 项全量事件预测清单
- 支持婚姻、财运、事业、健康、学业等多维度咨询
- Markdown 格式化输出，优雅展示
- 支持流式输出，实时显示分析进度

## 技术栈

### 前端
- **React 18** - UI 框架
- **Vite** - 构建工具
- **react-markdown** - Markdown 渲染
- **remark-gfm** - GitHub  flavored Markdown 支持

### 后端
- **Express** - Web 框架
- **tsx** - TypeScript 执行器
- **DeepSeek API** - AI 命理解读

### MCP 服务
- **tyme4ts** - 八字计算核心库
- **MCP SDK** - Model Context Protocol 实现

## 快速开始

### 1. 安装依赖

```bash
# 安装 bazi-mcp 依赖
cd bazi-mcp
npm install

# 安装后端依赖
cd ../bazi-ai-analyzer/server
npm install

# 安装前端依赖
cd ../client
npm install
```

### 2. 启动服务

需要启动三个服务（分别在三个终端）：

```bash
# 终端 1: 启动八字 MCP 服务 (端口 3009)
cd bazi-mcp
npm start

# 终端 2: 启动后端 API (端口 3001)
cd bazi-ai-analyzer/server
npm run dev

# 终端 3: 启动前端 (端口 5173)
cd bazi-ai-analyzer/client
npm run dev
```

### 3. 访问应用

打开浏览器访问: http://localhost:5173

## 使用说明

### 获取八字信息
1. 选择出生日期（阳历）
2. 选择出生时间
3. 选择性别
4. 点击「开始分析」

系统将自动计算：
- 八字四柱
- 大运排列
- 基础命理分析

### 查看大运流年
- 大运以横向卡片展示
- 点击任意大运卡片查看该大运的 10 年流年
- 系统默认自动选中当前年份所在大运

### AI 智能问答
1. 点击「智能问答」按钮
2. 输入您想咨询的问题
3. 可选择快捷问题或自定义提问

**支持的问题类型：**
- 💍 婚姻感情：何时结婚、配偶特征、婚姻质量
- 💰 财运分析：财富运势、赚钱方向、理财建议
- 📈 事业方向：职业发展、贵人相助、创业时机
- 🏥 健康养生：需要注意的健康问题
- 📚 学业考试：学业运势、考试时间
- 🔮 综合预测：人生各阶段运势分析

### 点击格局查看详解
- 格局名称旁边有 ℹ️ 图标
- 点击可查看格局的详细解释

## API 接口

### 八字分析
```
POST /api/bazi/analyze
Content-Type: application/json

{
  "八字": "甲戌 乙亥 乙卯 癸未",
  "性别": "男",
  "阳历": "1994年11月25日",
  "年柱": {...},
  "月柱": {...},
  ...
}
```

### AI 问答
```
POST /api/bazi/ask
Content-Type: application/json

{
  "question": "我的财运如何？",
  "bazi": {...},
  "stream": false
}
```

### 健康检查
```
GET /api/bazi/health
```

## 环境变量

### bazi-mcp
- `PORT`: 服务端口，默认 3009

### bazi-ai-analyzer/server
- `DEEPSEEK_API_KEY`: DeepSeek API 密钥
- `NODE_TLS_REJECT_UNAUTHORIZED`: SSL 证书验证（开发环境设为 0）

## 项目结构详解

### bazi-mcp/src/lib/bazi.ts
八字计算核心逻辑：
- `SolarTime` / `LunarTime` - 时间转换
- `ChildLimit` - 起运计算
- `DecadeFortune` - 大运计算
- `YearFortune` - 流年计算

### bazi-ai-analyzer/server/src/routes/bazi.ts
命理分析算法：
- `analyzeWuXing` - 五行分析
- `analyzeWangShuai` - 旺衰判断
- `analyzePattern` - 格局判定
- `analyzeXiJiShen` - 喜忌神
- `analyzeTenGods` - 十神分析
- `analyzeShenSha` - 神煞分析
- `analyzeXingChong` - 刑冲合会
- `analyzeMarriage` - 婚姻分析
- `analyzeWealth` - 财运分析
- `analyzeCareer` - 事业分析

### bazi-ai-analyzer/server/src/services/deepseek.ts
AI 服务：
- `createDeepSeekStream` - 流式调用 DeepSeek API
- `buildBaziSystemPrompt` - 构建系统提示词
- `buildBaziUserPrompt` - 构建用户提示词
- 42 项全量事件清单内置

## 全量事件预测清单 (42项)

系统内置完整的命理事件预测体系：

### 一、婚恋关系 (E01-E10)
- E01 💍 结婚应期
- E02 💔 离婚/分手高风险期
- E03 ⚠️ 出轨/情感背叛风险期
- E04 🤝 复合/和好窗口
- E05 💘 桃花/恋爱机会期
- E06 💎 订婚应期
- E07 ❄️ 婚姻冷战/沟通危机
- E08 👥 第三者干扰期
- E09 💕 亲密关系和谐期
- E10 🌫️ 关系边界模糊期

### 二、生育与子女 (E11-E16)
- E11 🤰 怀孕应期
- E12 😢 流产/胎停风险期
- E13 👶 分娩时间预测
- E14 🧬 试管/备孕成功窗口
- E15 📚 子女学业天赋显现期
- E16 😤 亲子关系紧张期

### 三、学业与考试 (E17-E21)
- E17 🎓 毕业时间
- E18 📝 考试/升学成功期
- E19 ✈️ 出国留学窗口
- E20 📜 学术成果发表期
- E21 📚 学业受阻期

### 四、事业与财富 (E22-E29)
- E22 🔄 跳槽/转行窗口
- E23 🚀 创业启动期
- E24 📈 晋升/加薪应期
- E25 💰 意外之财
- E26 💸 债务/破财高风险期
- E27 📉 失业/裁员风险期
- E28 🤝 合伙/合作契机
- E29 ⚔️ 职场人际冲突期

### 五、健康与身心 (E30-E34)
- E30 🏥 手术/住院期
- E31 💊 慢性病复发期
- E32 😔 情绪低谷/焦虑期
- E33 🌿 康复/疗愈窗口
- E34 🚑 意外伤灾期

### 六、家庭与房产 (E35-E38)
- E35 🏠 购房应期
- E36 👨‍👩‍👧‍👦 家庭矛盾激化期
- E37 🏛️ 祖业/遗产获得期
- E38 📦 搬家/迁居窗口

### 七、人际与社交 (E39-E40)
- E39 🌟 贵人/导师出现期
- E40 🗡️ 朋友背叛/背刺风险

### 八、灵性与成长 (E41-E42)
- E41 🧘 觉醒/开悟期
- E42 🔄 人生方向重大转折

## 注意事项

1. **命理预测仅供参考**，人生选择需结合实际情况
2. 预测结果受出生时间准确性影响
3. 命运可通过后天努力改变
4. 重大决策建议咨询专业人士
5. 保持理性态度，不可过度依赖

## 相关项目

- [bazi-mcp](https://github.com/cantian-ai/bazi-mcp) - 八字 MCP 服务
- [Chinese Bazi Fortune Teller](https://chatgpt.com/g/g-67c3f7b74d148191a2167f44fd13412d-chinese-bazi-fortune-teller-can-tian-ba-zi-suan-ming-jing-zhun-pai-pan-jie-du) - GPT Store 应用

## 联系方式

- 邮箱：support@cantian.ai
- 网站：https://cantian.ai

---

*文档版本：v1.0*
*最后更新：2026-04-09*
