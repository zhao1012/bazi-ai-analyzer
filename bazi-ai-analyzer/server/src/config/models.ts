export interface ModelConfig {
  id: string;
  name: string;
  provider: 'openai' | 'deepseek' | 'lmstudio' | 'ollama' | 'custom';
  baseUrl: string;
  model: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
  enableStream: boolean;
}

export const DEFAULT_MODELS: ModelConfig[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    apiKey: '',
    temperature: 0.7,
    maxTokens: 2000,
    enableStream: true,
  },
  {
    id: 'openai',
    name: 'OpenAI GPT-4o',
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    apiKey: '',
    temperature: 0.7,
    maxTokens: 2000,
    enableStream: true,
  },
  {
    id: 'lmstudio',
    name: 'LM Studio (本地)',
    provider: 'lmstudio',
    baseUrl: 'http://localhost:1234/v1',
    model: '',
    apiKey: 'not-needed',
    temperature: 0.7,
    maxTokens: 2000,
    enableStream: true,
  },
  {
    id: 'ollama',
    name: 'Ollama (本地)',
    provider: 'ollama',
    baseUrl: 'http://localhost:11434/v1',
    model: 'qwen2.5',
    apiKey: '',
    temperature: 0.7,
    maxTokens: 2000,
    enableStream: true,
  },
];

export interface PromptTemplate {
  id: string;
  name: string;
  systemPrompt: string;
  eventCatalog?: string;
}

export const DEFAULT_PROMPT_TEMPLATE: PromptTemplate = {
  id: 'default',
  name: '默认命理分析模板',
  systemPrompt: `你是一位精通中国传统命理学的AI命理师，专精八字命理分析。你的职责是根据用户提供的八字信息，运用专业的命理知识进行全面、深入的分析，并能根据42项全量事件清单进行人生事件的预测分析。

## 核心原则：
**必须聚焦用户问题进行回答**。当用户询问某个主题时（如大运、婚姻、财运等），只分析和该主题直接相关的内容，不要泛泛展开其他不相关的话题。

## 回答要求：
1. **聚焦问题**：只回答用户询问的主题，不主动延伸其他不相关话题
2. **专业性**：使用准确的命理学术语，展现深厚的专业知识
3. **条理性**：分析要有逻辑，层次分明，便于理解
4. **实用性**：给出具体的建议和指导，而不仅仅是理论分析
5. **个性化**：根据八字特点进行针对性分析，不泛泛而谈
6. **事件预测**：当用户询问婚恋、事业、财运、健康等话题时，结合42项事件清单进行分析
7. **时间精确**：尽可能给出具体年份、月份的时间预测
8. **语气**：专业但亲切，像一位经验丰富的命理师在谆谆教导

## 问题类型与聚焦范围：

| 用户问 | 只分析 |
|--------|--------|
| 大运走势 | 该大运的干支、喜忌、五行生克、流年变化，不要谈婚姻 |
| 婚姻感情 | 配偶星、桃花、日支、婚龄、婚姻质量，不谈大运 |
| 财运 | 财星、理财、赚钱方向、破财风险，不主动谈学业 |
| 事业 | 官星、印星、职业方向、贵人，不主动谈健康 |
| 健康 | 五行缺失、薄弱环节、养生建议 |
| 学业考试 | 文昌、印星、学习能力、考试时机 |
| 贵人运 | 贵人星、神煞中人缘贵人之象 |
| 整体命运 | 全面分析所有维度 |

请**严格按照用户问题的类型聚焦回答**，提供专业、深入、有价值的人生事件预测分析。`,
};
