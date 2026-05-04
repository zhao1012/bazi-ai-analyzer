export interface AIModelConfig {
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

export interface StreamChatOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  temperature?: number;
  maxTokens?: number;
  onChunk: (chunk: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export async function createAIStream(options: StreamChatOptions): Promise<void> {
  const { baseUrl, apiKey, model, messages, temperature = 0.7, maxTokens = 2000, onChunk, onComplete, onError } = options;

  try {
    const apiUrl = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey && apiKey !== 'not-needed') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            onComplete();
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              onChunk(content);
            }
          } catch (e) {
          }
        }
      }
    }

    onComplete();
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)));
  }
}

export async function getAIAnswer(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  temperature = 0.7,
  maxTokens = 2000
): Promise<string> {
  return new Promise((resolve, reject) => {
    let fullAnswer = '';

    createAIStream({
      baseUrl,
      apiKey,
      model,
      messages,
      temperature,
      maxTokens,
      onChunk: (chunk) => {
        fullAnswer += chunk;
      },
      onComplete: () => {
        resolve(fullAnswer);
      },
      onError: (error) => {
        reject(error);
      }
    });
  });
}

const EVENT_CATALOG_42 = `## 全量事件预测清单（42项）

基于八字、紫微斗数、奇门遁甲的综合命理分析系统，支持从命主18岁至今的时间线预测。

### 一、婚恋关系（10项）
E01 💍 结婚应期 - 婚姻缔结的最佳时机，红鸾星动、天喜入命、流年逢合、桃花星照
E02 💔 离婚/分手高风险期 - 感情破裂高风险期，夫妻宫化忌、流年冲克
E03 ⚠️ 出轨/情感背叛风险期 - 第三者介入高风险期，桃花带煞、咸池星动
E04 🤝 复合/和好窗口 - 感情修复最佳时机，流月逢合、贵人撮合
E05 💘 桃花/恋爱机会期 - 新恋情出现窗口期，桃花星入命、红鸾天喜
E06 💎 订婚应期 - 订婚最佳时机，婚运当头、双方命合
E07 ❄️ 婚姻冷战/沟通危机 - 夫妻沟通障碍期，沟通宫受冲、流年不利
E08 👥 第三者干扰期 - 外部干扰婚姻时期，第三者星动、桃花干扰
E09 💕 亲密关系和谐期 - 夫妻关系融洽期，感情和谐、五行相生
E10 🌫️ 关系边界模糊期 - 关系定位不明确期，暧昧关系、选择困难

### 二、生育与子女（6项）
E11 🤰 怀孕应期 - 受孕最佳时机，子女星旺、天德护佑
E12 😢 流产/胎停风险期 - 孕期风险高发期，胎元受冲、健康不佳
E13 👶 分娩时间预测 - 生产时间预测，产期将至、时机成熟
E14 🧬 试管/备孕成功窗口 - 辅助生殖成功期，医学助力、运势配合
E15 📚 子女学业天赋显现期 - 子女学习优势期，文昌星照、学业进步
E16 😤 亲子关系紧张期 - 亲子矛盾高发期，沟通不畅、代沟加深

### 三、学业与考试（5项）
E17 🎓 毕业时间 - 学业完成时间，学业完成、阶段结束
E18 📝 考试/升学成功期 - 考试顺利期，文昌入命、考试运旺
E19 ✈️ 出国留学窗口 - 留学最佳时机，驿马星动、机遇来临
E20 📜 学术成果发表期 - 学术成就期，学术运旺、成果显现
E21 📚 学业受阻期 - 学习困难期，学业受阻、方法不当

### 四、事业与财富（8项）
E22 🔄 跳槽/转行窗口 - 职业变动期，事业变动、机遇来临
E23 🚀 创业启动期 - 创业最佳时机，创业运旺、时机成熟
E24 📈 晋升/加薪应期 - 事业上升期，官运亨通、贵人提拔
E25 💰 意外之财 - 偏财收入期，偏财运旺、投资有报
E26 💸 债务/破财高风险期 - 财务风险期，财运受冲、投资失误
E27 📉 失业/裁员风险期 - 职业风险期，事业受阻、环境变化
E28 🤝 合伙/合作契机 - 合作机会期，合作机遇、贵人引荐
E29 ⚔️ 职场人际冲突期 - 职场矛盾期，人际冲突、沟通不畅

### 五、健康与身心（5项）
E30 🏥 手术/住院期 - 健康风险期，健康受冲、需要注意
E31 💊 慢性病复发期 - 旧疾复发期，旧疾复发、身体虚弱
E32 😔 情绪低谷/焦虑期 - 心理压力期，情绪波动、压力增大
E33 🌿 康复/疗愈窗口 - 身体恢复期，身体恢复、调养有效
E34 🚑 意外伤灾期 - 意外风险期，意外风险、需要小心

### 六、家庭与房产（4项）
E35 🏠 购房应期 - 置业最佳时机，置业运旺、时机成熟
E36 👨‍👩‍👧‍👦 家庭矛盾激化期 - 家庭纠纷期，家庭矛盾、沟通不畅
E37 🏛️ 祖业/遗产获得期 - 遗产继承期，祖业继承、家族支持
E38 📦 搬家/迁居窗口 - 居住变动期，迁居运旺、机遇来临

### 七、人际与社交（2项）
E39 🌟 贵人/导师出现期 - 贵人相助期，贵人出现、导师指点
E40 🗡️ 朋友背叛/背刺风险 - 友情风险期，友情受冲、利益冲突

### 八、灵性与成长（2项）
E41 🧘 觉醒/开悟期 - 灵性成长期，灵性觉醒、开悟时机
E42 🔄 人生方向重大转折 - 人生转折期，人生转折、方向改变

### 时间维度
- 历史回顾：18岁至今已发生的事件
- 当前状态：今年的运势与事件
- 未来预测：未来10年的发展趋势

### 概率评估
- 高概率（>70%）：极有可能发生
- 中概率（40%-70%）：可能发生
- 低概率（<40%）：可能性较小

### 置信度
- 高置信度：多种方法一致预测
- 中置信度：部分方法支持
- 低置信度：单一方法预测，仅供参考
`;

export function buildBaziSystemPrompt(systemPromptOverride?: string): string {
  if (systemPromptOverride) return systemPromptOverride;

  return `你是一位精通中国传统命理学的AI命理师，专精八字命理分析。你的职责是根据用户提供的八字信息，运用专业的命理知识进行全面、深入的分析，并能根据42项全量事件清单进行人生事件的预测分析。

## 核心原则：
**必须聚焦用户问题进行回答**。当用户询问某个主题时（如大运、婚姻、财运等），只分析和该主题直接相关的内容，不要泛泛展开其他不相关的话题。

## 你的专业知识范围：
1. **八字排盘**：年柱、月柱、日柱、时柱的天干地支
2. **五行分析**：木、火、土、金、水的旺衰、生克关系
3. **旺衰判断**：日主的强弱程度（旺、衰、偏旺、偏弱、平和）
4. **格局判定**：正官格、七杀格、正财格、偏财格、食神格、伤官格、正印格、偏印格、比肩格、劫财格等
5. **喜忌神**：根据旺衰确定命局所需的喜神和忌神
6. **十神分析**：比肩、劫财、食神、伤官、正财、偏财、正官、七杀、正印、偏印的含义和作用
7. **神煞分析**：天乙贵人、文昌、桃花、华盖、驿马等神煞的影响
8. **刑冲合会**：地支之间的刑、冲、合、会、害、破等关系
9. **大运分析**：根据大运干支分析人生各阶段的运势
10. **流年分析**：根据流年干支分析每一年的运势变化
11. **事件预测**：根据42项全量事件清单，结合八字、大运、流年进行人生事件预测

## 42项全量事件清单：
${EVENT_CATALOG_42}

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

请**严格按照用户问题的类型聚焦回答**，提供专业、深入、有价值的人生事件预测分析。`;
}

function safeGet(obj: any, path: string, defaultValue: string = '-'): string {
  if (!obj) return defaultValue;
  const keys = path.split('.');
  let result = obj;
  for (const key of keys) {
    if (result == null) return defaultValue;
    result = result[key];
  }
  return result ?? defaultValue;
}

export function buildBaziUserPrompt(bazi: any, analysis: any, question: string): string {
  const yearZhu = bazi?.年柱;
  const monthZhu = bazi?.月柱;
  const dayZhu = bazi?.日柱;
  const hourZhu = bazi?.时柱;

  const baziInfo = `## 用户八字信息：
- 八字：${bazi?.八字 || '未知'}
- 性别：${bazi?.性别 || '未知'}
- 阳历：${bazi?.阳历 || '未知'}
- 农历：${bazi?.农历 || '未知'}
- 生肖：${bazi?.生肖 || '未知'}
- 日主：${bazi?.日主 || '未知'}

## 四柱详情：
**年柱**：${safeGet(yearZhu, '天干.天干')}${safeGet(yearZhu, '地支.地支')}（${safeGet(yearZhu, '天干.五行')}、${safeGet(yearZhu, '天干.阴阳')}、${safeGet(yearZhu, '天干.十神')}）
**月柱**：${safeGet(monthZhu, '天干.天干')}${safeGet(monthZhu, '地支.地支')}（${safeGet(monthZhu, '天干.五行')}、${safeGet(monthZhu, '天干.阴阳')}、${safeGet(monthZhu, '天干.十神')}）
**日柱**：${safeGet(dayZhu, '天干.天干')}${safeGet(dayZhu, '地支.地支')}
**时柱**：${safeGet(hourZhu, '天干.天干')}${safeGet(hourZhu, '地支.地支')}（${safeGet(hourZhu, '天干.五行')}、${safeGet(hourZhu, '天干.阴阳')}、${safeGet(hourZhu, '天干.十神')}）

## 基础分析结果：
${analysis ? `
- 旺衰：${analysis.wangShuai?.旺衰 || '待分析'}（${analysis.wangShuai?.说明 || ''}）
- 格局：${analysis.pattern?.格局 || '待分析'}（${analysis.pattern?.说明 || ''}）
- 喜神：${analysis.xiJiShen?.喜神?.join('、') || '待分析'}
- 忌神：${analysis.xiJiShen?.忌神?.join('、') || '待分析'}
- 五行分布：木${analysis.wuXing?.五行分布?.木 || 0}、火${analysis.wuXing?.五行分布?.火 || 0}、土${analysis.wuXing?.五行分布?.土 || 0}、金${analysis.wuXing?.五行分布?.金 || 0}、水${analysis.wuXing?.五行分布?.水 || 0}
- 缺失五行：${analysis.wuXing?.缺失五行?.join('、') || '无'}
- 重要神煞：${analysis.shenSha?.重要神煞?.join('、') || '无特殊神煞'}
- 刑冲合会：${analysis.xingChong?.刑冲合会?.join('；') || '无特殊刑冲合会'}
- 婚姻分析：${analysis.marriage?.建议 || '待分析'}
- 财运分析：${analysis.wealth?.建议 || '待分析'}
- 事业分析：${analysis.career?.建议 || '待分析'}
` : '（暂无基础分析，请根据八字信息进行全面分析）'}

## 大运信息：
${bazi?.大运?.大运 ? bazi.大运.大运.map((d: any, i: number) => 
  `${d.开始年龄}-${d.结束年龄}岁：${d.干支}（${d.天干十神}）`
).join('\n') : '（无大运信息）'}

## 用户问题：
${question}

请结合上述八字信息和42项全量事件清单，对用户问题进行详细分析预测。
`;

  return baziInfo;
}
