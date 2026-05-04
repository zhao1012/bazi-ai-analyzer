import { Router } from 'express';
import { createDeepSeekStream, buildBaziSystemPrompt, buildBaziUserPrompt } from '../services/deepseek.js';

export const baziRouter = Router();

interface BaziDetail {
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
  刑冲合会: {
    年: any;
    月: any;
    日: any;
    时: any;
  };
}

interface AnalysisResult {
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

function analyzeWuXing(bazi: BaziDetail): { distribution: Record<string, number>; missing: string[]; analysis: string } {
  const wuxingMap: Record<string, string[]> = {
    '木': ['甲', '乙', '寅', '卯'],
    '火': ['丙', '丁', '巳', '午'],
    '土': ['戊', '己', '辰', '戌', '丑', '未'],
    '金': ['庚', '辛', '申', '酉'],
    '水': ['壬', '癸', '亥', '子']
  };

  const allChars = [
    bazi.年柱?.天干?.天干, bazi.年柱?.地支?.地支,
    bazi.月柱?.天干?.天干, bazi.月柱?.地支?.地支,
    bazi.日柱?.天干?.天干, bazi.日柱?.地支?.地支,
    bazi.时柱?.天干?.天干, bazi.时柱?.地支?.地支
  ].filter(Boolean) as string[];

  const distribution: Record<string, number> = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };

  for (const char of allChars) {
    for (const [wuxing, chars] of Object.entries(wuxingMap)) {
      if (chars.includes(char)) {
        distribution[wuxing]++;
        break;
      }
    }
  }

  const missing = Object.entries(distribution)
    .filter(([_, count]) => count === 0)
    .map(([wuxing, _]) => wuxing);

  const max = Math.max(...Object.values(distribution));
  const min = Math.min(...Object.values(distribution));
  const strongest = Object.entries(distribution).find(([_, count]) => count === max)?.[0] || '';
  const weakest = Object.entries(distribution).find(([_, count]) => count === min && count > 0)?.[0] || '';

  let analysis = `五行分布：木${distribution['木']}、火${distribution['火']}、土${distribution['土']}、金${distribution['金']}、水${distribution['水']}。`;
  if (missing.length > 0) {
    analysis += `缺失五行：${missing.join('、')}。`;
  }
  analysis += `${strongest}气最旺，${weakest || missing[0] || '水'}气较弱。`;

  return { distribution, missing, analysis };
}

function analyzeWangShuai(bazi: BaziDetail): { wangShuai: string; description: string } {
  const riGan = bazi.日柱?.天干?.天干 || '';
  const riZhi = bazi.日柱?.地支?.地支 || '';
  const yueZhi = bazi.月柱?.地支?.地支 || '';

  const wuxingPosMap: Record<string, string> = {
    '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
    '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水'
  };

  const riWuXing = wuxingPosMap[riGan];
  const monthWuXingMap: Record<string, string> = {
    '寅': '木', '卯': '木', '巳': '火', '午': '火',
    '辰': '土', '戌': '土', '丑': '土', '未': '土',
    '申': '金', '酉': '金', '亥': '水', '子': '水'
  };
  const monthWuXing = monthWuXingMap[yueZhi];

  let wangShuai = '';
  let description = '';

  if (riWuXing === monthWuXing) {
    if (riWuXing === '木') {
      wangShuai = '旺';
      description = '日主甲乙木生当月，木气旺盛，身旺无疑。';
    } else if (riWuXing === '火') {
      wangShuai = '旺';
      description = '日主丙丁火生当月，火气旺盛，身旺无疑。';
    } else if (riWuXing === '土') {
      wangShuai = '旺';
      description = '日主戊己土生当月，土气旺盛，身旺无疑。';
    } else if (riWuXing === '金') {
      wangShuai = '旺';
      description = '日主庚辛金生当月，金气旺盛，身旺无疑。';
    } else if (riWuXing === '水') {
      wangShuai = '旺';
      description = '日主壬癸水生当月，水气旺盛，身旺无疑。';
    }
  } else {
    const riMonthRelation: Record<string, Record<string, string>> = {
      '木': { '火': '相生旺', '土': '被克弱', '金': '被克弱', '水': '生身旺' },
      '火': { '木': '被生旺', '土': '相生旺', '金': '被克弱', '水': '被克弱' },
      '土': { '火': '被生旺', '金': '相生旺', '木': '被克弱', '水': '被克弱' },
      '金': { '土': '被生旺', '水': '相生旺', '火': '被克弱', '木': '被克弱' },
      '水': { '金': '被生旺', '木': '相生旺', '火': '被克弱', '土': '被克弱' }
    };

    const relation = riMonthRelation[riWuXing]?.[monthWuXing] || '平和';
    if (relation.includes('旺')) {
      wangShuai = relation.includes('生') ? '偏旺' : '旺';
    } else if (relation.includes('弱')) {
      wangShuai = '弱';
    } else {
      wangShuai = '平和';
    }
    description = `日主${riGan}${riWuXing}，月令${yueZhi}${monthWuXing}，${riWuXing}与${monthWuXing}关系为${relation}。`;
  }

  const riZhiXingYun = bazi.日柱?.星运 || '';
  if (riZhiXingYun) {
    description += `日支${bazi.日柱?.地支?.地支}星运为${riZhiXingYun}。`;
  }

  return { wangShuai, description };
}

function analyzePattern(bazi: BaziDetail): { pattern: string; description: string } {
  const riGan = bazi.日柱?.天干?.天干 || '';
  const yueGan = bazi.月柱?.天干?.天干 || '';
  const nianGan = bazi.年柱?.天干?.天干 || '';
  const shiGan = bazi.时柱?.天干?.天干 || '';

  const wuxingMap: Record<string, string> = {
    '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
    '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水'
  };

  const riWuXing = wuxingMap[riGan];
  const yueWuXing = wuxingMap[yueGan];
  const nianWuXing = wuxingMap[nianGan];
  const shiWuXing = wuxingMap[shiGan];

  let pattern = '';
  let description = '';

  if (riWuXing === yueWuXing) {
    pattern = '比肩格';
    description = `日主${riGan}与月令同气，月干${yueGan}为比肩，身旺之象。`;
  } else if (riWuXing === nianWuXing) {
    pattern = '年上格';
    description = `日主${riGan}得年干${nianGan}相帮。`;
  } else if (riWuXing === shiWuXing) {
    pattern = '时上格';
    description = `日主${riGan}得时干${shiGan}相帮。`;
  } else {
    const generateMap: Record<string, string> = {
      '甲': { '丙': '食神', '丁': '伤官', '戊': '正财', '己': '偏财', '庚': '正官', '辛': '七杀', '壬': '正印', '癸': '偏印' },
      '乙': { '丙': '正印', '丁': '偏印', '戊': '正官', '己': '七杀', '庚': '正财', '辛': '偏财', '壬': '伤官', '癸': '食神' }
    };

    const patternGan = generateMap[riGan]?.[yueGan];
    if (patternGan) {
      pattern = `${patternGan}格`;
      description = `月干${yueGan}为${patternGan}，格局为${pattern}。`;
    } else {
      pattern = '普通格局';
      description = '八字组合较为平和，无特殊格局。';
    }
  }

  return { pattern, description };
}

function analyzeXiJiShen(bazi: BaziDetail, wangShuai: string): { xiShen: string[]; jiShen: string[]; description: string } {
  const wuxingMap: Record<string, string> = {
    '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
    '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水'
  };

  const riWuXing = wuxingMap[bazi.日柱?.天干?.天干] || '';
  const riGan = bazi.日柱?.天干?.天干 || '';

  const sheng: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
  const ke: Record<string, string> = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' };
  const shengBy: Record<string, string> = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' };
  const keBy: Record<string, string> = { '木': '金', '火': '水', '土': '木', '金': '火', '水': '土' };

  let xiShen: string[] = [];
  let jiShen: string[] = [];

  if (wangShuai.includes('旺') || wangShuai === '强' || wangShuai === '偏旺' || wangShuai === '旺') {
    xiShen.push(ke[riWuXing]);
    xiShen.push(sheng[riWuXing]);
    jiShen.push(riWuXing);
    jiShen.push(shengBy[riWuXing]);
  } else if (wangShuai.includes('弱') || wangShuai === '偏弱' || wangShuai === '弱') {
    xiShen.push(shengBy[riWuXing]);
    xiShen.push(sheng[riWuXing]);
    jiShen.push(ke[riWuXing]);
    jiShen.push(keBy[riWuXing]);
  } else {
    xiShen.push(shengBy[riWuXing]);
    jiShen.push(ke[riWuXing]);
  }

  xiShen = [...new Set(xiShen.filter(w => !jiShen.includes(w)))];
  const description = `日主${riWuXing}气(${riGan}木)，${wangShuai}。喜${xiShen.join('、')}，忌${jiShen.join('、')}。`;

  return { xiShen, jiShen, description };
}

function analyzeTenGods(bazi: BaziDetail): { nianGanShiShen: string; yueGanShiShen: string; shiGanShiShen: string; analysis: string } {
  const nianGanShiShen = bazi.年柱?.天干?.十神 || '';
  const yueGanShiShen = bazi.月柱?.天干?.十神 || '';
  const shiGanShiShen = bazi.时柱?.天干?.十神 || '';

  let analysis = '';
  if (yueGanShiShen.includes('官') || yueGanShiShen.includes('杀')) {
    analysis += '月干带官杀，利于仕途发展。';
  } else if (yueGanShiShen.includes('财')) {
    analysis += '月干带财星，利于财运。';
  } else if (yueGanShiShen.includes('印')) {
    analysis += '月干带印星，利于学业文化。';
  } else if (yueGanShiShen.includes('食') || yueGanShiShen.includes('伤')) {
    analysis += '月干带食伤，利于技艺创作。';
  } else if (yueGanShiShen.includes('比') || yueGanShiShen.includes('劫')) {
    analysis += '月干带比劫，利于竞争发展。';
  }

  return { nianGanShiShen, yueGanShiShen, shiGanShiShen, analysis };
}

const shenShaDescriptions: Record<string, string> = {
  '天乙贵人': '最吉利的贵人星，主贵人相助、逢凶化吉，命主一生多遇贵人，遇事有助力。',
  '天官贵人': '主仕途顺利、官运亨通，适合从事公职或管理工作。',
  '月德贵人': '吉星，主善良温和，一生平安，遇险有救，化险为夷。',
  '福星贵人': '吉星，主福气深厚，衣食无忧，一生少忧少虑。',
  '太极贵人': '主聪慧智慧，悟性强，利于学术研究和文化修养。',
  '天德贵人': '大吉之星，主仁厚善良，一生少病少灾，遇事多逢贵人。',
  '文昌': '主聪明好学，文采出众，利于学业、考试、文学艺术等领域。',
  '文星': '同文昌，主学业有成，文思敏捷。',
  '桃花': '主异性缘好，感情丰富，但也需注意烂桃花和感情纠纷。',
  '寡宿': '主孤独感，感情不顺，需注意经营感情，避免孤寂。',
  '孤辰': '主性格孤僻或独居倾向，不利婚姻，需多交游。',
  '华盖': '主清高孤傲，有艺术天赋，适合研究玄学、宗教、哲学。',
  '羊刃': '主刚烈果断，有冲劲但易冲动，需注意意外伤害。',
  '金舆': '主富贵，有车有房，生活富足。',
  '天罗地网': '主困局束缚，需注意防范小人陷害和意外灾祸。',
  '劫煞': '主破财或意外损失，需谨慎理财，避免投机。',
  '天喜': '吉星，主喜事临门，利于结婚、生子、升迁等喜庆事。',
  '驿马': '主奔波奔波，适合外地发展，多动多利，利于贸易出差。',
  '将星': '主领导才能，有指挥统御能力，适合管理岗位。',
  '亡神': '主消耗破耗，易有意外损失，需注意守财。',
  '勾绞煞': '主是非纠纷、小人陷害，需谨慎交友。',
  '童子煞': '主早年多磨难，需注意健康，度过幼年后可转运。',
  '空亡': '主虚而不实，所求难成，需注意防范空欢喜。',
  '国印': '主权力地位，有官运，适合公职或体制内工作。',
  '词馆': '主文学才能，适合从事文学、教育、传媒等行业。',
};

function analyzeShenSha(bazi: BaziDetail): { importantShenSha: string[]; impactAnalysis: string; detailedAnalysis: string } {
  const allShenSha: Array<{ name: string; zhu: string }> = [];
  for (const [zhu, shas] of Object.entries(bazi.神煞 || {})) {
    if (Array.isArray(shas)) {
      for (const sha of shas) {
        allShenSha.push({ name: sha, zhu });
      }
    }
  }

  const guìRén = ['天乙贵人', '天官贵人', '月德贵人', '福星贵人', '太极贵人', '天德贵人'];
  const tàiShen = ['财神', '金舆'];
  const guānShén = ['正官', '七杀', '国印', '将星'];
  const wénXing = ['文昌', '文星', '词馆'];
  const xìngFú = ['天喜', '福星贵人'];
  const xiōng = ['桃花', '寡宿', '孤辰', '童子煞', '天罗地网', '劫煞', '勾绞煞', '空亡'];

  const important: string[] = [];
  let detailedAnalysis = '### 神煞详解\n\n';

  for (const { name, zhu } of allShenSha) {
    const desc = shenShaDescriptions[name];
    if (desc) {
      const zhuLabel = zhu === '年柱' ? '年' : zhu === '月柱' ? '月' : zhu === '日柱' ? '日' : '时';
      if (guìRén.includes(name)) {
        important.push(`【贵】${name}`);
        detailedAnalysis += `**${zhuLabel}柱 ${name}**：${desc}\n\n`;
      } else if (tàiShen.includes(name)) {
        important.push(`【财】${name}`);
        detailedAnalysis += `**${zhuLabel}柱 ${name}**：${desc}\n\n`;
      } else if (guānShén.includes(name)) {
        important.push(`【官】${name}`);
        detailedAnalysis += `**${zhuLabel}柱 ${name}**：${desc}\n\n`;
      } else if (wénXing.includes(name)) {
        important.push(`【文】${name}`);
        detailedAnalysis += `**${zhuLabel}柱 ${name}**：${desc}\n\n`;
      } else if (xìngFú.includes(name)) {
        important.push(`【福】${name}`);
        detailedAnalysis += `**${zhuLabel}柱 ${name}**：${desc}\n\n`;
      } else if (xiōng.includes(name)) {
        important.push(`【注意】${name}`);
        detailedAnalysis += `**${zhuLabel}柱 ${name}**：${desc}\n\n`;
      } else {
        detailedAnalysis += `**${zhuLabel}柱 ${name}**：${desc}\n\n`;
      }
    }
  }

  let impactAnalysis = '';
  if (important.filter(s => s.includes('【贵】')).length >= 2) {
    impactAnalysis += '命带多处贵人，一生多有助力。';
  }
  if (important.some(s => s.includes('【财】'))) {
    impactAnalysis += '命带财星，财运较好。';
  }
  if (important.some(s => s.includes('【官】'))) {
    impactAnalysis += '命带官星，有仕途机缘。';
  }
  if (important.some(s => s.includes('【文】'))) {
    impactAnalysis += '命带文星，利于学业文化。';
  }
  if (important.some(s => s.includes('【福】'))) {
    impactAnalysis += '命带福星，福气深厚。';
  }
  if (important.filter(s => s.includes('【注意】')).length >= 2) {
    impactAnalysis += '命带多处不利神煞，需注意化解。';
  } else if (important.some(s => s.includes('【注意】'))) {
    impactAnalysis += '命带个别不利神煞，适当注意即可。';
  }

  return { importantShenSha: important.slice(0, 12), impactAnalysis, detailedAnalysis };
}

function analyzeXingChong(bazi: BaziDetail): { items: string[]; impact: string } {
  const items: string[] = [];

  const addIfExists = (type: string, list: any[]) => {
    if (list && Array.isArray(list)) {
      for (const item of list) {
        if (item.知识点) {
          items.push(`${type}: ${item.知识点}`);
        }
      }
    }
  };

  for (const [zhu, data] of Object.entries(bazi.刑冲合会 || {})) {
    const zhuData = data as any;
    addIfExists(`${zhu}柱`, zhuData.地支?.合 || []);
    addIfExists(`${zhu}柱`, zhuData.地支?.半合 || []);
    addIfExists(`${zhu}柱`, zhuData.地支?.三合 || []);
    addIfExists(`${zhu}柱`, zhuData.地支?.冲 || []);
    addIfExists(`${zhu}柱`, zhuData.地支?.刑 || []);
    addIfExists(`${zhu}柱`, zhuData.地支?.破 || []);
    addIfExists(`${zhu}柱`, zhuData.地支?.害 || []);
    addIfExists(`${zhu}柱`, zhuData.地支?.暗合 || []);
    addIfExists(`${zhu}柱`, zhuData.地支?.拱 || []);
  }

  let impact = '';
  if (items.some(i => i.includes('三合') || i.includes('半合'))) {
    impact += '命带合局，人际关系好，利于合作。';
  }
  if (items.some(i => i.includes('冲'))) {
    impact += '命带冲克，早年或有一定波动。';
  }
  if (items.some(i => i.includes('刑'))) {
    impact += '命带刑局，需注意是非纠纷。';
  }

  return { items: items.slice(0, 8), impact };
}

function analyzeMarriage(bazi: BaziDetail, wangShuai: string, pattern: string): { xingYun: string; shenSha: string; daYun: string; suggestion: string } {
  const riZhi = bazi.日柱?.地支?.地支 || '';
  const riZhiXingYun = bazi.日柱?.星运 || '';
  const riZhiZiZuo = bazi.日柱?.自坐 || '';

  let xingYun = `日支${riZhi}，星运${riZhiXingYun}，自坐${riZhiZiZuo}。`;
  if (riZhiZiZuo === '临官' || riZhiZiZuo === '帝旺') {
    xingYun += '日坐旺地，配偶能力强。';
  } else if (riZhiZiZuo === '冠带') {
    xingYun += '日坐冠带，婚姻体面。';
  } else if (riZhiZiZuo === '衰' || riZhiZiZuo === '病') {
    xingYun += '日坐衰地，需注意婚姻经营。';
  } else if (riZhiZiZuo === '墓' || riZhiZiZuo === '绝') {
    xingYun += '日坐墓绝，婚姻来得较晚或不易。';
  }

  let shenSha = '';
  const riShenSha = bazi.神煞?.日柱 || [];
  if (riShenSha.includes('桃花')) {
    shenSha += '命带桃花，异性缘佳；';
  }
  if (riShenSha.includes('禄神')) {
    shenSha += '日坐禄神，配偶财运好；';
  }
  if (riShenSha.includes('寡宿') || riShenSha.includes('孤辰')) {
    shenSha += '注意婚缘缘分问题；';
  }

  let daYun = '';
  const daYunList = bazi.大运?.大运;
  if (daYunList && Array.isArray(daYunList)) {
    const marriageYun = daYunList.find((d: any) =>
      d.干支.includes('财') || d.干支.includes('官') ||
      d.天干十神.includes('财') || d.天干十神.includes('官')
    );
    if (marriageYun) {
      daYun += `${marriageYun.开始年龄}-${marriageYun.结束年龄}岁行${marriageYun.干支}大运，利婚恋。`;
    }
  }

  let suggestion = '建议晚婚为宜，注重双方五行互补。';
  if (wangShuai.includes('旺')) {
    suggestion = '身旺者宜找互补五行伴侣，旺水木为佳。';
  } else if (wangShuai.includes('弱')) {
    suggestion = '身弱者宜找帮身五行伴侣，旺木火为佳。';
  }

  return { xingYun, shenSha, daYun, suggestion };
}

function analyzeWealth(bazi: BaziDetail, wangShuai: string): { caiXing: string; daYun: string; suggestion: string } {
  const nianZhiCai = bazi.年柱?.地支?.藏干?.主气?.天干 || '';
  const shiZhiCai = bazi.时柱?.地支?.藏干?.主气?.天干 || '';

  let caiXing = '财星分析：';
  if (nianZhiCai.includes('戊') || nianZhiCai.includes('己')) {
    caiXing += '年支藏财，根基较好；';
  }
  if (shiZhiCai.includes('戊') || shiZhiCai.includes('己')) {
    caiXing += '时支藏财，晚景富裕；';
  }

  const caiInShenSha = (bazi.神煞?.年柱 && bazi.神煞.年柱.includes('金舆')) || (bazi.神煞?.时柱 && bazi.神煞.时柱.includes('金舆'));
  if (caiInShenSha) {
    caiXing += '命带金舆，财运享通。';
  }

  let daYun = '';
  const dayunListWealth = bazi.大运?.大运;
  if (dayunListWealth && Array.isArray(dayunListWealth)) {
    const wealthYun = dayunListWealth.find((d: any) =>
      d.天干十神.includes('财') || (d.地支十神 && d.地支十神.some((s: string) => s.includes('财')))
    );
    if (wealthYun) {
      daYun += `${wealthYun.开始年龄}-${wealthYun.结束年龄}岁行${wealthYun.干支}大运，正财当令，财运亨通。`;
    }
  }

  let suggestion = '宜从事与土、金相关行业。';
  if (wangShuai.includes('旺')) {
    suggestion = '身旺财旺，宜积极进取，创业投资皆宜。';
  } else if (wangShuai.includes('弱')) {
    suggestion = '身弱财旺，宜稳定理财，不宜冒险。';
  }

  return { caiXing, daYun, suggestion };
}

function analyzeCareer(bazi: BaziDetail, wangShuai: string, pattern: string): { guanXing: string; geJu: string; suggestion: string } {
  const guanXing = bazi.神煞?.月柱?.includes('正官') || bazi.神煞?.月柱?.includes('七杀');
  let guanZhang = '官星分析：';
  if (guanXing) {
    guanZhang += '月柱带官杀，适合仕途管理。';
  } else {
    guanZhang += '官杀不显，宜专业技术发展。';
  }

  let geJu = `格局为${pattern}。`;
  if (pattern.includes('官') || pattern.includes('杀')) {
    geJu += '适合管理、仕途。';
  } else if (pattern.includes('财')) {
    geJu += '适合经营、投资。';
  } else if (pattern.includes('印')) {
    geJu += '适合学术、教育。';
  } else if (pattern.includes('食') || pattern.includes('伤')) {
    geJu += '适合技艺、创新。';
  } else if (pattern.includes('比')) {
    geJu += '适合竞争、合伙。';
  }

  let suggestion = '宜稳定发展，积累人脉资源。';
  if (wangShuai.includes('旺')) {
    suggestion = '身旺能担官杀，宜积极进取，敢于担当。';
  } else if (wangShuai.includes('弱')) {
    suggestion = '身弱难担官杀，宜稳扎稳打，提升实力。';
  }

  return { guanXing: guanZhang, geJu, suggestion };
}

baziRouter.post('/analyze', async (req, res) => {
  try {
    const bazi: BaziDetail = req.body;

    if (!bazi || !bazi.八字) {
      res.status(400).json({ error: 'Invalid Bazi data' });
      return;
    }

    let wuxing, wangShuai, pattern, xiJiShen, tenGods, shenSha, xingChong, marriage, wealth, career;

    try {
      wuxing = analyzeWuXing(bazi);
    } catch (e) { console.error('wuxing error:', e); throw e; }

    try {
      wangShuai = analyzeWangShuai(bazi);
    } catch (e) { console.error('wangShuai error:', e); throw e; }

    try {
      pattern = analyzePattern(bazi);
    } catch (e) { console.error('pattern error:', e); throw e; }

    try {
      xiJiShen = analyzeXiJiShen(bazi, wangShuai.wangShuai);
    } catch (e) { console.error('xiJiShen error:', e); throw e; }

    try {
      tenGods = analyzeTenGods(bazi);
    } catch (e) { console.error('tenGods error:', e); throw e; }

    try {
      shenSha = analyzeShenSha(bazi);
    } catch (e) { console.error('shenSha error:', e); throw e; }

    try {
      xingChong = analyzeXingChong(bazi);
    } catch (e) { console.error('xingChong error:', e); throw e; }

    try {
      marriage = analyzeMarriage(bazi, wangShuai.wangShuai, pattern.pattern);
    } catch (e) { console.error('marriage error:', e); throw e; }

    try {
      wealth = analyzeWealth(bazi, wangShuai.wangShuai);
    } catch (e) { console.error('wealth error:', e); throw e; }

    try {
      career = analyzeCareer(bazi, wangShuai.wangShuai, pattern.pattern);
    } catch (e) { console.error('career error:', e); throw e; }

    const result: AnalysisResult = {
      basic: {
        性别: bazi.性别,
        八字: bazi.八字,
        日主: bazi.日主,
        五行分析: wuxing.analysis
      },
      wangShuai: {
        旺衰: wangShuai.wangShuai,
        说明: wangShuai.description
      },
      pattern: {
        格局: pattern.pattern,
        说明: pattern.description
      },
      xiJiShen: {
        喜神: xiJiShen.xiShen,
        忌神: xiJiShen.jiShen,
        说明: xiJiShen.description
      },
      tenGods: {
        年干十神: tenGods.nianGanShiShen,
        月干十神: tenGods.yueGanShiShen,
        时干十神: tenGods.shiGanShiShen,
        分析: tenGods.analysis
      },
      shenSha: {
        重要神煞: shenSha.importantShenSha,
        影响分析: shenSha.impactAnalysis,
        详细解释: shenSha.detailedAnalysis
      },
      wuXing: {
        五行分布: wuxing.distribution,
        缺失五行: wuxing.missing,
        分析: wuxing.analysis
      },
      xingChong: {
        刑冲合会: xingChong.items,
        影响: xingChong.impact
      },
      marriage: marriage,
      wealth: wealth,
      career: career
    };

    res.json(result);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

baziRouter.post('/ask', async (req, res) => {
  try {
    const { question, bazi, analysis, stream } = req.body;

    if (!question || !bazi) {
      res.status(400).json({ error: 'Missing question or bazi data' });
      return;
    }

    const apiKey = process.env.DEEPSEEK_API_KEY || 'sk-a1ea4013afd1422d99a27f0d9f96cd72';

    const systemPrompt = buildBaziSystemPrompt();
    const userPrompt = buildBaziUserPrompt(bazi, analysis, question);

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      await createDeepSeekStream({
        apiKey,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        onChunk: (chunk) => {
          res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
        },
        onComplete: () => {
          res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
          res.end();
        },
        onError: (error) => {
          res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
          res.end();
        }
      });
    } else {
      const answer = await getDeepSeekAnswer(apiKey, systemPrompt, userPrompt);
      res.json({ answer, topic: detectTopic(question) });
    }
  } catch (error) {
    console.error('Ask error:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'Unknown error');
    res.status(500).json({ error: 'Failed to generate answer: ' + (error instanceof Error ? error.message : String(error)) });
  }
});

async function getDeepSeekAnswer(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let fullAnswer = '';

    createDeepSeekStream({
      apiKey,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
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

function detectTopic(question: string): string {
  const q = question.toLowerCase();
  if (q.includes('婚') || q.includes('姻') || q.includes('感情')) return '婚姻';
  if (q.includes('财') || q.includes('钱') || q.includes('富')) return '财运';
  if (q.includes('事') || q.includes('业') || q.includes('工')) return '事业';
  if (q.includes('健') || q.includes('病')) return '健康';
  if (q.includes('学') || q.includes('考')) return '学业';
  if (q.includes('大运') || q.includes('流年')) return '大运';
  return '综合';
}

function generateMarriageAnswer(bazi: BaziDetail, analysis: any): string {
  let answer = `关于您的婚姻分析：\n\n`;

  answer += `【星运分析】${analysis?.marriage?.xingYun || bazi.日柱.星运 || '平和'}\n\n`;

  if (bazi.神煞.日柱.includes('桃花')) {
    answer += `【桃花影响】您命带桃花，异性缘较佳，魅力较强。但桃花过重也可能导致感情困扰。\n`;
  }

  if (bazi.神煞.日柱.includes('禄神')) {
    answer += `【禄神影响】日坐禄神，配偶条件较好，财运不错。\n`;
  }

  if (bazi.神煞.日柱.includes('寡宿') || bazi.神煞.日柱.includes('孤辰')) {
    answer += `【注意事项】命带寡宿或孤辰，婚缘可能来得较晚，或有孤独感，宜主动社交。\n`;
  }

  const riZhiZiZuo = bazi.日柱.自坐;
  answer += `【日坐分析】${riZhiZiZuo}，`;
  if (riZhiZiZuo === '临官') answer += '配偶能力强，婚姻关系稳定。\n';
  else if (riZhiZiZuo === '帝旺') answer += '婚姻中占有欲较强。\n';
  else if (riZhiZiZuo === '冠带') answer += '婚姻体面，仪式感强。\n';
  else if (riZhiZiZuo === '衰') answer += '需双方共同维护婚姻。\n';
  else if (riZhiZiZuo === '病') answer += '注意身体健康对婚姻的影响。\n';
  else if (riZhiZiZuo === '墓') answer += '婚姻来之不易，珍惜缘分。\n';
  else if (riZhiZiZuo === '绝') answer += '晚婚倾向，早年感情波动。\n';
  else answer += '婚姻平和稳定。\n';

  answer += `\n【大运建议】${analysis?.marriage?.daYun || '注意大运流年的影响'}\n`;
  answer += `\n【综合建议】${analysis?.marriage?.suggestion || '建议晚婚为宜，注重双方五行互补。'}`;

  return answer;
}

function generateWealthAnswer(bazi: BaziDetail, analysis: any): string {
  let answer = `关于您的财运分析：\n\n`;

  answer += `【财星分布】\n`;
  const nianZhiCai = bazi.年柱.地支.藏干?.主气?.天干 || '';
  const yueZhiCai = bazi.月柱.地支.藏干?.主气?.天干 || '';
  const riZhiCai = bazi.日柱.地支.藏干?.主气?.天干 || '';
  const shiZhiCai = bazi.时柱.地支.藏干?.主气?.天干 || '';

  if (nianZhiCai) answer += `年支藏${nianZhiCai}，`;
  if (yueZhiCai) answer += `月支藏${yueZhiCai}，`;
  if (riZhiCai) answer += `日支藏${riZhiCai}，`;
  if (shiZhiCai) answer += `时支藏${shiZhiCai}。\n`;

  answer += `\n【神煞分析】\n`;
  if (bazi.神煞.年柱.includes('金舆')) {
    answer += `命带金舆，财运享通，富有之命。\n`;
  }
  if (bazi.神煞.月柱.includes('天喜')) {
    answer += `带天喜星，财运有惊喜。\n`;
  }
  if (bazi.神煞.时柱.includes('驿马')) {
    answer += `时柱带驿马，财运走动中求。\n`;
  }

  answer += `\n【五行与财运】\n`;
  answer += `${analysis?.wuXing?.分析 || ''}\n`;

  answer += `\n【大运财运】\n`;
  answer += `${analysis?.wealth?.daYun || '需结合大运具体分析'}\n`;

  answer += `\n【财运建议】${analysis?.wealth?.suggestion || '宜从事与土、金相关行业。'}`;

  return answer;
}

function generateCareerAnswer(bazi: BaziDetail, analysis: any): string {
  let answer = `关于您的事业分析：\n\n`;

  answer += `【格局分析】${analysis?.pattern?.格局 || '普通格局'}\n`;
  answer += `${analysis?.pattern?.说明 || ''}\n\n`;

  answer += `【官星分析】\n`;
  if (bazi.神煞.月柱.includes('正官') || bazi.神煞.月柱.includes('七杀')) {
    answer += `月柱带官杀，适合管理岗位，有仕途机缘。\n`;
  } else {
    answer += `官杀不显，宜专业技术方向发展。\n`;
  }

  answer += `\n【印星分析】\n`;
  if (bazi.神煞.年柱.includes('天德贵人') || bazi.神煞.月柱.includes('天德贵人')) {
    answer += `带天德贵人，有贵人扶持事业。\n`;
  }
  if (bazi.神煞.时柱.includes('天乙贵人')) {
    answer += `时柱带天乙贵人，晚事业有成。\n`;
  }

  answer += `\n【神煞建议】\n`;
  answer += `${analysis?.shenSha?.impactAnalysis || ''}\n`;

  answer += `\n【事业建议】${analysis?.career?.suggestion || '宜稳定发展，积累人脉资源。'}`;

  return answer;
}

function generateHealthAnswer(bazi: BaziDetail, analysis: any): string {
  let answer = `关于您的健康分析：\n\n`;

  answer += `【五行与健康】\n`;
  const wuxing = analysis?.wuXing || { distribution: { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 }, missing: [] };
  const missing = wuxing.missing as string[] || [];

  if (missing.includes('木')) {
    answer += `木气不足，需注意肝胆、筋骨方面。\n`;
  }
  if (missing.includes('火')) {
    answer += `火气不足，需注意心血管、眼睛方面。\n`;
  }
  if (missing.includes('土')) {
    answer += `土气不足，需注意脾胃、消化方面。\n`;
  }
  if (missing.includes('金')) {
    answer += `金气不足，需注意肺脏、呼吸方面。\n`;
  }
  if (missing.includes('水')) {
    answer += `水气不足，需注意肾脏、泌尿方面。\n`;
  }

  if (missing.length === 0) {
    answer += `五行齐全，身体较为平衡。\n`;
  }

  answer += `\n【日主分析】\n`;
  const riGan = bazi.日主;
  answer += `日主${riGan}，`;
  if (riGan === '甲' || riGan === '乙') {
    answer += '木性人，注意肝胆健康。\n';
  } else if (riGan === '丙' || riGan === '丁') {
    answer += '火性人，注意心血管健康。\n';
  } else if (riGan === '戊' || riGan === '己') {
    answer += '土性人，注意脾胃健康。\n';
  } else if (riGan === '庚' || riGan === '辛') {
    answer += '金性人，注意肺脏健康。\n';
  } else if (riGan === '壬' || riGan === '癸') {
    answer += '水性人，注意肾脏健康。\n';
  }

  answer += `\n【健康建议】保持五行平衡，注意相应脏腑保养，规律作息。`;

  return answer;
}

function generateStudyAnswer(bazi: BaziDetail, analysis: any): string {
  let answer = `关于您的学业分析：\n\n`;

  answer += `【印星分析】\n`;
  const nianZhiYin = bazi.年柱.地支.藏干?.主气?.天干 || '';
  const yueZhiYin = bazi.月柱.地支.藏干?.主气?.天干 || '';
  const riZhiYin = bazi.日柱.地支.藏干?.主气?.天干 || '';
  const shiZhiYin = bazi.时柱.地支.藏干?.主气?.天干 || '';

  const hasYin = [nianZhiYin, yueZhiYin, riZhiYin, shiZhiYin].some(y => y === '壬' || y === '癸' || y === '丙' || y === '丁');
  if (hasYin) {
    answer += `命中带印，学业运佳，有学习天赋。\n`;
  } else {
    answer += `印星一般，需靠后天努力。\n`;
  }

  answer += `\n【神煞分析】\n`;
  if (bazi.神煞.年柱.includes('文昌') || bazi.神煞.月柱.includes('文昌')) {
    answer += `带文昌星，学术成就可期。\n`;
  }
  if (bazi.神煞.时柱.includes('华盖')) {
    answer += `时柱带华盖，适合深学研究。\n`;
  }

  answer += `\n【十神分析】\n`;
  answer += `${analysis?.tenGods?.analysis || ''}\n`;

  answer += `\n【学业建议】${bazi.日主}日主，适合学习专业技术，或可考虑继续深造。}`;

  return answer;
}

function generateDaYunAnswer(bazi: BaziDetail, analysis: any): string {
  let answer = `关于您的大运分析：\n\n`;

  answer += `【起运信息】\n`;
  answer += `起运年龄：${bazi.大运.起运年龄}岁\n`;
  answer += `起运日期：${bazi.大运.起运日期}\n\n`;

  answer += `【大运概览】\n`;
  for (const dayun of bazi.大运.大运.slice(0, 5)) {
    answer += `${dayun.开始年龄}-${dayun.结束年龄}岁：${dayun.干支}（${dayun.天干十神}）\n`;
  }

  answer += `\n【重点大运分析】\n`;
  const keyDayun = bazi.大运.大运.find(d =>
    d.天干十神.includes('官') || d.天干十神.includes('财') ||
    d.天干十神.includes('印')
  );
  if (keyDayun) {
    answer += `${keyDayun.开始年龄}-${keyDayun.结束年龄}岁行${keyDayun.干支}大运，${keyDayun.天干十神}当令，`;
    if (keyDayun.天干十神.includes('官')) {
      answer += '利仕途发展。\n';
    } else if (keyDayun.天干十神.includes('财')) {
      answer += '利财运积累。\n';
    } else if (keyDayun.天干十神.includes('印')) {
      answer += '利学业名声。\n';
    }
  }

  answer += `\n【大运建议】大运期间宜积极进取，把握机遇，谨慎决策。`;

  return answer;
}

function generateGeneralAnswer(bazi: BaziDetail, analysis: any): string {
  let answer = `您的八字综合分析：\n\n`;

  answer += `【基本信息】\n`;
  answer += `八字：${bazi.八字}\n`;
  answer += `日主：${bazi.日主}\n`;
  answer += `生肖：${bazi.生肖}\n\n`;

  answer += `【旺衰格局】\n`;
  answer += `旺衰：${analysis?.wangShuai?.旺衰 || '待分析'}\n`;
  answer += `格局：${analysis?.pattern?.格局 || '待分析'}\n`;
  answer += `喜神：${analysis?.xiJiShen?.喜神?.join('、') || '待分析'}\n`;
  answer += `忌神：${analysis?.xiJiShen?.忌神?.join('、') || '待分析'}\n\n`;

  answer += `【五行分析】\n`;
  answer += `${analysis?.wuXing?.分析 || ''}\n\n`;

  answer += `【神煞要点】\n`;
  answer += `${analysis?.shenSha?.importantShenSha?.join('\n') || '无特殊神煞'}\n\n`;

  answer += `【综合建议】\n`;
  answer += `根据您的八字特点，建议在婚姻、财运、事业等方面注重五行平衡，把握大运流年的机遇。`;

  return answer;
}

export { type BaziDetail, type AnalysisResult };