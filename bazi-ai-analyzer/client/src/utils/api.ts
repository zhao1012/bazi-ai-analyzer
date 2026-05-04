const API_BASE = '/api/bazi';

export interface BaziData {
  性别: string;
  阳历: string;
  农历: string;
  八字: string;
  生肖: string;
  日主: string;
  年柱: any;
  月柱: any;
  日柱: any;
  时柱: any;
  胎元: string;
  胎息: string;
  命宫: string;
  身宫: string;
  神煞: {
    年柱: string[];
    月柱: string[];
    日柱: string[];
    时柱: string[];
  };
  大运: {
    起运年龄: number;
    起运日期: string;
    大运: Array<{
      干支: string;
      开始年份: number;
      结束: number;
      天干十神: string;
      地支十神: string[];
      地支藏干: string[];
      开始年龄: number;
      结束年龄: number;
    }>;
  };
  刑冲合会: any;
}

export interface AnalysisResult {
  basic: {
    性别: string;
    八字: string;
    日主: string;
    五行分析: string;
  };
  wangShuai: {
    旺衰: string;
    说明: string;
  };
  pattern: {
    格局: string;
    说明: string;
  };
  xiJiShen: {
    喜神: string[];
    忌神: string[];
    说明: string;
  };
  tenGods: {
    年干十神: string;
    月干十神: string;
    时干十神: string;
    分析: string;
  };
  shenSha: {
    重要神煞: string[];
    影响分析: string;
    详细解释: string;
  };
  wuXing: {
    五行分布: Record<string, number>;
    缺失五行: string[];
    分析: string;
  };
  xingChong: {
    刑冲合会: string[];
    影响: string;
  };
  marriage: {
    星运分析: string;
    神煞分析: string;
    大运分析: string;
    建议: string;
  };
  wealth: {
    财星分析: string;
    大运分析: string;
    建议: string;
  };
  career: {
    官星分析: string;
    格局分析: string;
    建议: string;
  };
}

export async function analyzeBazi(bazi: BaziData): Promise<AnalysisResult> {
  const response = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bazi),
  });

  if (!response.ok) {
    throw new Error('Analysis failed');
  }

  return response.json();
}

export async function askQuestion(
  question: string,
  bazi: BaziData,
  analysis?: AnalysisResult
): Promise<{ answer: string; topic: string }> {
  const response = await fetch(`${API_BASE}/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question, bazi, analysis }),
  });

  if (!response.ok) {
    throw new Error('Question answering failed');
  }

  return response.json();
}

export function askQuestionStream(
  question: string,
  bazi: BaziData,
  analysis?: AnalysisResult,
  onChunk?: (chunk: string) => void,
  onDone?: () => void,
  onError?: (error: Error) => void
): EventSource | null {
  const es = new EventSource(`${API_BASE}/ask?question=${encodeURIComponent(question)}&stream=true`);

  let answer = '';

  es.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'chunk') {
        answer += data.content;
        onChunk?.(data.content);
      } else if (data.type === 'done') {
        es.close();
        onDone?.();
      } else if (data.type === 'error') {
        es.close();
        onError?.(new Error(data.message));
      }
    } catch (e) {
      // Ignore parse errors
    }
  };

  es.onerror = (error) => {
    es.close();
    onError?.(new Error('Stream connection error'));
  };

  return es;
}