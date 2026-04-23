// 模拟数据 - 全部写死在前端

export interface AgentStatus {
  id: number
  name: string
  icon: string
  status: 'running' | 'processing' | 'idle' | 'completed' | 'error'
  currentTask: string
  detail?: string[]
  hasLogs?: boolean
  recentLogs?: { time: string; step: string; status: string; detail: string }[]
}

export interface StatCard {
  label: string
  value: number
  trend: number
  suffix: string
  agent: string
}

export interface LogEntry {
  time: string
  agent: number
  icon: string
  message: string
  highlight?: boolean
  outputData?: any
  rawStatus?: string
  stepName?: string
}

export interface Teacher {
  id: string
  name: string
  avatar: string
  subject: string
  grade: string
  tags: string[]
  pushCount: number
  adoptRate: number
  radar: { dim: string; value: number }[]
  history: { date: string; title: string; status: 'adopted' | 'pending' | 'rejected'; feedback?: string }[]
}

export interface Courseware {
  id: string
  title: string
  platform: 'feixiang' | 'laoshibang' | 'self_skill'
  platformLabel: string
  screenshot: string
  scores: { d1: number; d2: number; d3: number; d4: number }
  composite: number
  pros: string[]
  cons: string[]
}

export interface PushRecord {
  id: string
  time: string
  teacher: string
  title: string
  platform: string
  source: string
  score: number
  status: 'adopted' | 'pending' | 'rejected'
  feedback?: string
}

export interface CompetitorItem {
  rank: number
  title: string
  platform: string
  grade: string
  subject: string
  author: string
  stars: number
  views: number
  favRate: string
  url: string
}

// ========== 统计卡片 ==========
export const statCards: StatCard[] = [
  { label: '今日感知', value: 15, trend: 20, suffix: '个需求', agent: 'Agent①' },
  { label: '今日生成', value: 15, trend: 15, suffix: '个课件', agent: 'Agent②' },
  { label: '评审通过', value: 12, trend: 10, suffix: '通过率80%', agent: 'Agent③' },
  { label: '推送成功', value: 12, trend: 0, suffix: '覆盖3位教师', agent: 'Agent④' },
]

// ========== Agent状态 ==========
export const agentStatuses: AgentStatus[] = [
  {
    id: 1, name: '需求感知引擎', icon: '🔍', status: 'running',
    currentTask: '扫描飞象热门课件',
    detail: [
      '正在抓取飞象老师热门榜单...',
      '发现新课件: "分数大小比较"(数学/三年级)',
      '匹配教师需求: 王老师(数学/三年级)',
      '→ 触发生产任务',
    ]
  },
  {
    id: 2, name: '课件生产车间', icon: '🏭', status: 'processing',
    currentTask: '生成"分数大小比较"V1',
    detail: [
      '🧠 教研大脑: 规划拖拽交互+阶梯难度',
      '🎨 资产车间: [3/4] 生成中... 披萨底盘✅ 厨师✅ 标签🔄',
      '💻 代码合成: 等待资产完成',
      '📊 当前体积: 38KB',
    ]
  },
  {
    id: 3, name: 'AI评审团', icon: '🧑‍⚖️', status: 'idle',
    currentTask: '等待课件输入',
    detail: [
      'A1 知识审查员: 🟢就绪',
      'A2 教学设计师: 🟢就绪',
      'B  QA工程师:  🟢就绪',
      'C  视觉设计师: 🟢就绪',
    ]
  },
  {
    id: 4, name: '课件推送中心', icon: '📤', status: 'idle',
    currentTask: '等待评审结果',
    detail: [
      '上次推送: 22:45 → 李老师(英语)',
      '今日推送: 5次',
      '待反馈: 2条',
    ]
  },
]

// ========== 实时日志 ==========
export const mockLogs: LogEntry[] = [
  { time: '23:19:20', agent: 4, icon: '📤', message: '推送给王老师（飞书卡片），等待反馈...' },
  { time: '23:19:15', agent: 3, icon: '→', message: '评审通过，传递给Agent④推送' },
  { time: '23:19:10', agent: 3, icon: '📊', message: '评审完成：d1=4 d2=4 d3=3 d4=3 → 综合3.60 ✅通过', highlight: true },
  { time: '23:18:35', agent: 3, icon: '🧑‍⚖️', message: '4人评审团启动：A1知识审查 | A2教学设计 | B QA测试 | C视觉评审' },
  { time: '23:18:30', agent: 2, icon: '✅', message: '飞象V1生成完成(52KB)，传递给Agent③评审', highlight: true },
  { time: '23:16:02', agent: 2, icon: '🏭', message: '开始生成"分数大小比较"互动课件，平台：飞象+老师帮+自研' },
  { time: '23:15:45', agent: 1, icon: '→', message: '触发生产任务，传递给Agent②' },
  { time: '23:15:32', agent: 1, icon: '🔍', message: '发现飞象热门课件"分数大小比较"，匹配教师：王老师（数学/三年级）' },
  { time: '23:10:15', agent: 4, icon: '📤', message: '推送给李老师（飞书卡片）：英语字母闯关' },
  { time: '23:09:50', agent: 3, icon: '📊', message: '评审完成：d1=4 d2=3 d3=4 d4=3 → 综合3.50 ✅通过', highlight: true },
  { time: '23:05:20', agent: 2, icon: '✅', message: '"英语字母闯关"V5迭代完成(67KB)' },
  { time: '22:58:00', agent: 3, icon: '🔴', message: '评审未通过(3.20 < 3.50)，触发逆向修复 → Agent②', highlight: true },
  { time: '22:55:30', agent: 2, icon: '🔄', message: '[Trigger] 接收修正意见，V2版本重构中...' },
]

// ========== 教师画像 ==========
export const teachers: Teacher[] = [
  {
    id: 't1', name: '王芳', avatar: '👩‍🏫', subject: '数学', grade: '三年级',
    tags: ['游戏化教学', '注重基础', '喜欢动画', '偏好中等难度'],
    pushCount: 15, adoptRate: 80,
    radar: [
      { dim: '游戏化偏好', value: 4 },
      { dim: '互动深度', value: 3 },
      { dim: '视觉要求', value: 4 },
      { dim: '知识密度', value: 3 },
      { dim: '难度偏好', value: 3 },
      { dim: '反馈详细度', value: 4 },
    ],
    history: [
      { date: '4/16', title: '分数大小比较', status: 'pending' },
      { date: '4/16', title: '两位数加减法闯关', status: 'adopted', feedback: '学生很喜欢' },
      { date: '4/15', title: '钉子板围图', status: 'adopted' },
      { date: '4/14', title: '乘法口诀大冒险', status: 'rejected', feedback: '难度偏高' },
    ]
  },
  {
    id: 't2', name: '李明', avatar: '👨‍🏫', subject: '英语', grade: '二年级',
    tags: ['互动练习', '喜欢音效', '注重发音', '偏好简单'],
    pushCount: 10, adoptRate: 70,
    radar: [
      { dim: '游戏化偏好', value: 3 },
      { dim: '互动深度', value: 2 },
      { dim: '视觉要求', value: 3 },
      { dim: '知识密度', value: 4 },
      { dim: '难度偏好', value: 2 },
      { dim: '反馈详细度', value: 3 },
    ],
    history: [
      { date: '4/16', title: '英语字母闯关', status: 'pending' },
      { date: '4/15', title: '英语单词消消乐', status: 'rejected', feedback: '难度偏高' },
      { date: '4/14', title: '自然拼读练习', status: 'adopted', feedback: '很实用' },
    ]
  },
  {
    id: 't3', name: '张敏', avatar: '👩‍🏫', subject: '语文', grade: '一年级',
    tags: ['趣味识字', '喜欢故事', '注重拼音', '偏好可爱风格'],
    pushCount: 8, adoptRate: 87,
    radar: [
      { dim: '游戏化偏好', value: 5 },
      { dim: '互动深度', value: 3 },
      { dim: '视觉要求', value: 5 },
      { dim: '知识密度', value: 2 },
      { dim: '难度偏好', value: 2 },
      { dim: '反馈详细度', value: 4 },
    ],
    history: [
      { date: '4/16', title: '拼音消消乐', status: 'adopted', feedback: '孩子们玩得很开心' },
      { date: '4/15', title: '汉字描红练习', status: 'adopted' },
      { date: '4/14', title: '声母韵母配对', status: 'adopted', feedback: '非常好' },
    ]
  },
]

// ========== 课件对比 ==========
export const coursewareComparison: Courseware[] = [
  {
    id: 'c1', title: '10以内加法', platform: 'feixiang', platformLabel: '飞象老师',
    screenshot: '',
    scores: { d1: 4, d2: 3, d3: 2, d4: 3 },
    composite: 3.10,
    pros: ['3D素材质量高', '视觉风格统一'],
    cons: ['交互卡顿(iframe嵌套)', 'DOM混淆影响测试'],
  },
  {
    id: 'c2', title: '10以内加法', platform: 'laoshibang', platformLabel: '老师帮',
    screenshot: '',
    scores: { d1: 4, d2: 4, d3: 3, d4: 2 },
    composite: 3.35,
    pros: ['教学设计严谨', '错误反馈细腻'],
    cons: ['视觉粗糙', '配色单调'],
  },
  {
    id: 'c3', title: '10以内加法', platform: 'self_skill', platformLabel: '自研Skill',
    screenshot: '',
    scores: { d1: 4, d2: 4, d3: 4, d4: 3 },
    composite: 3.85,
    pros: ['交互流畅(无iframe)', 'DOM干净可测试', '全自动迭代'],
    cons: ['素材依赖即梦', '偶有emoji降级'],
  },
]

export const coursewareVersions = [
  { version: 'V1', feixiang: 2.8, laoshibang: 3.0, self_skill: 2.5 },
  { version: 'V2', feixiang: 2.9, laoshibang: 3.1, self_skill: 3.0 },
  { version: 'V3', feixiang: 3.0, laoshibang: 3.2, self_skill: 3.4 },
  { version: 'V4', feixiang: 3.0, laoshibang: 3.3, self_skill: 3.6 },
  { version: 'V5', feixiang: 3.1, laoshibang: 3.35, self_skill: 3.85 },
]

// ========== 推送记录 ==========
export const pushRecords: PushRecord[] = [
  { id: 'mock-1', time: '4/16 23:19', teacher: '王芳', title: '分数大小比较', platform: '自研', source: 'self_skill', score: 3.85, status: 'pending' },
  { id: 'mock-2', time: '4/16 22:45', teacher: '李明', title: '英语字母闯关', platform: '飞象', source: 'feixiang', score: 3.60, status: 'pending' },
  { id: 'mock-3', time: '4/16 21:30', teacher: '张敏', title: '拼音消消乐', platform: '自研', source: 'self_skill', score: 3.90, status: 'adopted', feedback: '孩子们玩得很开心' },
  { id: 'mock-4', time: '4/16 20:15', teacher: '王芳', title: '两位数加减法闯关', platform: '老师帮', source: 'laoshibang', score: 3.50, status: 'adopted', feedback: '学生很喜欢' },
  { id: 'mock-5', time: '4/16 19:00', teacher: '李明', title: '英语单词消消乐', platform: '飞象', source: 'feixiang', score: 3.40, status: 'rejected', feedback: '难度偏高' },
  { id: 'mock-6', time: '4/16 18:30', teacher: '王芳', title: '钉子板围图', platform: '自研', source: 'self_skill', score: 4.10, status: 'adopted' },
  { id: 'mock-7', time: '4/16 17:00', teacher: '张敏', title: '汉字描红练习', platform: '老师帮', source: 'laoshibang', score: 3.55, status: 'adopted' },
  { id: 'mock-8', time: '4/15 23:00', teacher: '王芳', title: '乘法口诀大冒险', platform: '飞象', source: 'feixiang', score: 3.20, status: 'rejected', feedback: '难度偏高' },
]

// ========== 竞品监控 ==========
export const competitorData: CompetitorItem[] = [
  { rank: 1, title: 'AI口算大冒险', platform: '飞象老师', grade: '一年级', subject: '数学', author: '飞象教研组', stars: 2340, views: 18500, favRate: '12.6%', url: '#' },
  { rank: 2, title: '英语自然拼读闯关', platform: '飞象老师', grade: '二年级', subject: '英语', author: '飞象教研组', stars: 1890, views: 15200, favRate: '12.4%', url: '#' },
  { rank: 3, title: '古诗词飞花令', platform: '老师帮', grade: '三年级', subject: '语文', author: '好未来教研', stars: 1650, views: 12800, favRate: '12.9%', url: '#' },
  { rank: 4, title: '分数披萨大作战', platform: '飞象老师', grade: '三年级', subject: '数学', author: '飞象教研组', stars: 1420, views: 11000, favRate: '12.9%', url: '#' },
  { rank: 5, title: '看图写话小达人', platform: '老师帮', grade: '一年级', subject: '语文', author: '好未来教研', stars: 1380, views: 10500, favRate: '13.1%', url: '#' },
  { rank: 6, title: '时钟认读大闯关', platform: '飞象老师', grade: '二年级', subject: '数学', author: '飞象教研组', stars: 1200, views: 9800, favRate: '12.2%', url: '#' },
  { rank: 7, title: '英语颜色配对', platform: '老师帮', grade: '一年级', subject: '英语', author: '好未来教研', stars: 1150, views: 9200, favRate: '12.5%', url: '#' },
  { rank: 8, title: '拼音声母韵母大冒险', platform: '飞象老师', grade: '一年级', subject: '语文', author: '飞象教研组', stars: 1080, views: 8500, favRate: '12.7%', url: '#' },
  { rank: 9, title: '20以内退位减法', platform: '老师帮', grade: '二年级', subject: '数学', author: '好未来教研', stars: 980, views: 7800, favRate: '12.6%', url: '#' },
  { rank: 10, title: '英语动物单词连连看', platform: '飞象老师', grade: '二年级', subject: '英语', author: '飞象教研组', stars: 920, views: 7200, favRate: '12.8%', url: '#' },
]

// ========== 评审动画数据 ==========
export interface ReviewAnimation {
  reviewers: { id: string; name: string; role: string; dimension: string; score: number; comment: string }[]
  weights: { d1: number; d2: number; d3: number; d4: number }
  composite: number
  passed: boolean
}

export const mockReviewAnimation: ReviewAnimation = {
  reviewers: [
    { id: 'a1', name: 'A1', role: '知识审查员', dimension: 'd1', score: 4, comment: '逐题验证: Q1✅ Q2✅ Q3✅ Q4⚠️选项干扰项偏弱' },
    { id: 'a2', name: 'A2', role: '教学设计师', dimension: 'd2', score: 3, comment: '防挫败机制✅ 脚手架✅ 反馈机制⚠️略生硬' },
    { id: 'b', name: 'B', role: 'QA工程师', dimension: 'd3', score: 4, comment: 'Browser Use 15/15步骤通过 ✅' },
    { id: 'c', name: 'C', role: '视觉设计师', dimension: 'd4', score: 3, comment: '配色✅ 布局✅ 素材质量⚠️1个emoji降级' },
  ],
  weights: { d1: 0.25, d2: 0.35, d3: 0.20, d4: 0.20 },
  composite: 3.45,
  passed: false,
}

// ========== 飞象K6年级与学科结构剖析 ==========
export const feixiangK6Structure = [
  { grade: '幼儿园', 语文: 1200, 数学: 1800, 英语: 800 },
  { grade: '一年级', 语文: 2100, 数学: 3500, 英语: 1600 },
  { grade: '二年级', 语文: 1800, 数学: 3200, 英语: 1400 },
  { grade: '三年级', 语文: 2500, 数学: 4200, 英语: 2000 },
  { grade: '四年级', 语文: 2200, 数学: 3800, 英语: 2400 },
  { grade: '五年级', 语文: 2600, 数学: 4500, 英语: 2800 },
  { grade: '六年级', 语文: 2000, 数学: 3600, 英语: 2200 },
]

// ========== 飞象K6各年级内容消费分布 ==========
export const feixiangK6Consumption = [
  { grade: '幼儿园', views: 32000, favorites: 4800, conversionRate: 15.0 },
  { grade: '一年级', views: 58000, favorites: 8120, conversionRate: 14.0 },
  { grade: '二年级', views: 45000, favorites: 5850, conversionRate: 13.0 },
  { grade: '三年级', views: 62000, favorites: 8680, conversionRate: 14.0 },
  { grade: '四年级', views: 53000, favorites: 6890, conversionRate: 13.0 },
  { grade: '五年级', views: 67000, favorites: 10050, conversionRate: 15.0 },
  { grade: '六年级', views: 48000, favorites: 5760, conversionRate: 12.0 },
]

// ========== 趋势图数据 ==========
export const trendData = [
  { date: '4/10', feixiang: 5, laoshibang: 3, self: 2 },
  { date: '4/11', feixiang: 7, laoshibang: 4, self: 3 },
  { date: '4/12', feixiang: 6, laoshibang: 5, self: 4 },
  { date: '4/13', feixiang: 8, laoshibang: 4, self: 5 },
  { date: '4/14', feixiang: 9, laoshibang: 6, self: 5 },
  { date: '4/15', feixiang: 7, laoshibang: 5, self: 6 },
  { date: '4/16', feixiang: 10, laoshibang: 7, self: 8 },
]

export const qualityTrend = [
  { date: '4/10', feixiang: 3.1, laoshibang: 3.2, self: 3.3 },
  { date: '4/11', feixiang: 3.2, laoshibang: 3.3, self: 3.4 },
  { date: '4/12', feixiang: 3.1, laoshibang: 3.2, self: 3.5 },
  { date: '4/13', feixiang: 3.3, laoshibang: 3.4, self: 3.6 },
  { date: '4/14', feixiang: 3.2, laoshibang: 3.3, self: 3.5 },
  { date: '4/15', feixiang: 3.3, laoshibang: 3.5, self: 3.7 },
  { date: '4/16', feixiang: 3.3, laoshibang: 3.4, self: 3.8 },
]
