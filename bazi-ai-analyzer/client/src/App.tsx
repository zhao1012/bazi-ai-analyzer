import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import html2canvas from 'html2canvas';
import Settings from './components/Settings';
import { analyzeBazi, type BaziData, type AnalysisResult } from './utils/api';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_QUESTIONS = [
  '分析我的婚姻感情运势',
  '分析我的财运运势',
  '分析我的事业发展趋势',
  '分析我的健康运势',
  '分析我的学业考试运势',
  '分析我的大运走势',
  '分析我的贵人运势',
  '分析我的整体命运走向',
];

function App() {
  const [solarDate, setSolarDate] = useState('1994-11-25');
  const [solarTime, setSolarTime] = useState('14:20');
  const [gender, setGender] = useState('1');
  const [baziData, setBaziData] = useState<BaziData | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPatternModal, setShowPatternModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedDaYunIndex, setSelectedDaYunIndex] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [answering, setAnswering] = useState(false);
  const [answeringQuestion, setAnsweringQuestion] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const exportCardRef = useRef<HTMLDivElement>(null);

  const handleExportImage = async () => {
    if (!exportCardRef.current) return;
    try {
      const element = exportCardRef.current;
      const originalOverflow = element.style.overflow;
      const originalMaxHeight = element.style.maxHeight;
      element.style.overflow = 'visible';
      element.style.maxHeight = 'none';

      const answerContent = element.querySelector('.export-answer-content') as HTMLElement;
      const originalAnswerOverflow = answerContent?.style.overflow;
      const originalAnswerMaxHeight = answerContent?.style.maxHeight;
      if (answerContent) {
        answerContent.style.overflow = 'visible';
        answerContent.style.maxHeight = 'none';
      }

      const canvas = await html2canvas(element, {
        backgroundColor: '#faf7f2',
        scale: 2,
        useCORS: true,
        logging: false,
        height: element.scrollHeight,
        windowHeight: element.scrollHeight,
      });

      element.style.overflow = originalOverflow;
      element.style.maxHeight = originalMaxHeight;
      if (answerContent) {
        answerContent.style.overflow = originalAnswerOverflow || '';
        answerContent.style.maxHeight = originalAnswerMaxHeight || '';
      }

      const link = document.createElement('a');
      link.download = `八字分析_${baziData?.八字 || 'result'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (showModal) {
      scrollToBottom();
    }
  }, [messages, showModal]);

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');

    try {
      const datetime = `${solarDate}T${solarTime}:00+08:00`;

      const response = await fetch('/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'getBaziDetail',
            arguments: {
              solarDatetime: datetime,
              gender: parseInt(gender),
            },
          },
          id: 1,
        }),
      });

      const data = await response.json();
      const baziResult = JSON.parse(data.result?.content?.[0]?.text || '{}');

      setBaziData(baziResult);

      const currentYear = new Date().getFullYear();
      const dayunIndex = baziResult.大运?.大运?.findIndex(
        (d: any) => currentYear >= d.开始年份 && currentYear <= d.结束
      );
      setSelectedDaYunIndex(dayunIndex >= 0 ? dayunIndex : null);

      const analysis = await analyzeBazi(baziResult);
      setAnalysisResult(analysis);

      setMessages([]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      setError(`获取八字信息失败: ${errorMessage}`);
      console.error('Full error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickQuestion = async (question: string) => {
    if (!baziData || answering) return;
    setShowModal(true);
    await handleAsk(question);
  };

  const handleAsk = async (question?: string) => {
    const q = question || inputQuestion.trim();
    if (!q || !baziData || answering) return;

    setAnswering(true);
    setAnsweringQuestion(q);
    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: q,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputQuestion('');

    const tempMessageId = Date.now() + 1;

    const assistantMessage: Message = {
      id: tempMessageId,
      role: 'assistant',
      content: '',
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const response = await fetch('/api/bazi/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, bazi: baziData, analysis: analysisResult, stream: true }),
      });

      if (!response.ok) {
        throw new Error('Request failed');
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
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'chunk') {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === tempMessageId ? { ...msg, content: msg.content + parsed.content } : msg
                  )
                );
              } else if (parsed.type === 'done') {
                break;
              } else if (parsed.type === 'error') {
                throw new Error(parsed.message);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempMessageId ? { ...msg, content: '抱歉，发生了错误：' + (err instanceof Error ? err.message : '未知错误') } : msg
        )
      );
    } finally {
      setAnswering(false);
      setAnsweringQuestion('');
    }
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const renderWuxingBar = () => {
    if (!baziData) return null;
    const distribution = analysisResult?.wuXing?.五行分布 || { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    const max = Math.max(...Object.values(distribution), 1);
    return (
      <div className="wuxing-bar">
        {Object.entries(distribution).map(([element, count]) => (
          <div key={element} className="wuxing-item">
            <div className="wuxing-label">{element}</div>
            <div className="wuxing-track">
              <div
                className={`wuxing-fill wuxing-${element}`}
                style={{ height: `${(count / max) * 100}%` }}
              />
            </div>
            <div className="wuxing-count">{count}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1>八字AI分析器</h1>
            <p>基于传统命理学的智能八字分析问答系统</p>
          </div>
          <button className="settings-btn" onClick={() => setShowSettings(true)} title="设置">⚙️</button>
        </div>
      </header>

      <div className="main-content">
        <div className="left-panel">
          <div className="panel input-panel">
            <h2 className="panel-title">基本信息录入</h2>

            <div className="input-group">
              <label>出生日期（阳历）</label>
              <input
                type="date"
                value={solarDate}
                onChange={(e) => setSolarDate(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label>出生时间</label>
              <input
                type="time"
                value={solarTime}
                onChange={(e) => setSolarTime(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label>性别</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="1">男</option>
                <option value="0">女</option>
              </select>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleAnalyze}
              disabled={loading}
              style={{ width: '100%', marginTop: '10px' }}
            >
              {loading ? '分析中...' : '开始分析'}
            </button>

            {error && <div className="error">{error}</div>}

            {baziData && (
              <button
                className="btn btn-secondary"
                onClick={() => setShowModal(true)}
                style={{ width: '100%', marginTop: '16px' }}
              >
                🤙 智能问答
              </button>
            )}
          </div>
        </div>

        <div className="right-panel">
          {baziData ? (
            <div className="panel bazi-detail-panel">
              <h2 className="panel-title">八字详细信息</h2>

              <div className="bazi-header-section">
                <div className="bazi-code-lg">{baziData.八字}</div>
                <div className="basic-info-lg">
                  {baziData.阳历} | {baziData.生肖} | {baziData.性别}
                </div>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span className="summary-label">日主</span>
                    <span className="summary-value">{baziData.日主}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">旺衰</span>
                    <span className="summary-value">{analysisResult?.wangShuai?.旺衰}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">格局</span>
                    <span
                      className="summary-value clickable-info"
                      onClick={() => setShowPatternModal(true)}
                      title="点击查看格局详解"
                    >
                      {analysisResult?.pattern?.格局} ℹ️
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">喜神</span>
                    <span className="summary-value">{analysisResult?.xiJiShen?.喜神?.join('、')}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">忌神</span>
                    <span className="summary-value">{analysisResult?.xiJiShen?.忌神?.join('、')}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">缺失五行</span>
                    <span className="summary-value">{analysisResult?.wuXing?.缺失五行?.join('、') || '无'}</span>
                  </div>
                </div>
              </div>

              <div className="bazi-detail-content">
                <div className="four-pillars">
                  <div className="pillar-section">
                    <h3 className="pillar-title">年柱 · {baziData.年柱?.天干?.天干}{baziData.年柱?.地支?.地支}</h3>
                    <div className="pillar-info">
                      <p>天干：{baziData.年柱?.天干?.天干}（{baziData.年柱?.天干?.五行}、{baziData.年柱?.天干?.阴阳}、{baziData.年柱?.天干?.十神}）</p>
                      <p>地支：{baziData.年柱?.地支?.地支}（{baziData.年柱?.地支?.五行}、{baziData.年柱?.地支?.阴阳}）</p>
                      <p>藏干：{baziData.年柱?.地支?.藏干?.主气?.天干}、{baziData.年柱?.地支?.藏干?.中气?.天干}、{baziData.年柱?.地支?.藏干?.余气?.天干}</p>
                      <p>纳音：{baziData.年柱?.纳音}</p>
                      <p>星运：{baziData.年柱?.星运} | 自坐：{baziData.年柱?.自坐}</p>
                      <p>空亡：{baziData.年柱?.空亡}</p>
                    </div>
                    <div className="shensha-list">
                      {baziData.神煞?.年柱?.map((sha, i) => (
                        <span key={i} className="shensha-tag">{sha}</span>
                      ))}
                    </div>
                  </div>

                  <div className="pillar-section">
                    <h3 className="pillar-title">月柱 · {baziData.月柱?.天干?.天干}{baziData.月柱?.地支?.地支}</h3>
                    <div className="pillar-info">
                      <p>天干：{baziData.月柱?.天干?.天干}（{baziData.月柱?.天干?.五行}、{baziData.月柱?.天干?.阴阳}、{baziData.月柱?.天干?.十神}）</p>
                      <p>地支：{baziData.月柱?.地支?.地支}（{baziData.月柱?.地支?.五行}、{baziData.月柱?.地支?.阴阳}）</p>
                      <p>藏干：{baziData.月柱?.地支?.藏干?.主气?.天干}、{baziData.月柱?.地支?.藏干?.中气?.天干}</p>
                      <p>纳音：{baziData.月柱?.纳音}</p>
                      <p>星运：{baziData.月柱?.星运} | 自坐：{baziData.月柱?.自坐}</p>
                      <p>空亡：{baziData.月柱?.空亡}</p>
                    </div>
                    <div className="shensha-list">
                      {baziData.神煞?.月柱?.map((sha, i) => (
                        <span key={i} className="shensha-tag">{sha}</span>
                      ))}
                    </div>
                  </div>

                  <div className="pillar-section">
                    <h3 className="pillar-title">日柱 · {baziData.日柱?.天干?.天干}{baziData.日柱?.地支?.地支}</h3>
                    <div className="pillar-info">
                      <p>天干：{baziData.日柱?.天干?.天干}（{baziData.日柱?.天干?.五行}、{baziData.日柱?.天干?.阴阳}）</p>
                      <p>地支：{baziData.日柱?.地支?.地支}（{baziData.日柱?.地支?.五行}、{baziData.日柱?.地支?.阴阳}）</p>
                      <p>藏干：{baziData.日柱?.地支?.藏干?.主气?.天干}</p>
                      <p>纳音：{baziData.日柱?.纳音}</p>
                      <p>星运：{baziData.日柱?.星运} | 自坐：{baziData.日柱?.自坐}</p>
                      <p>空亡：{baziData.日柱?.空亡}</p>
                    </div>
                    <div className="shensha-list">
                      {baziData.神煞?.日柱?.map((sha, i) => (
                        <span key={i} className="shensha-tag">{sha}</span>
                      ))}
                    </div>
                  </div>

                  <div className="pillar-section">
                    <h3 className="pillar-title">时柱 · {baziData.时柱?.天干?.天干}{baziData.时柱?.地支?.地支}</h3>
                    <div className="pillar-info">
                      <p>天干：{baziData.时柱?.天干?.天干}（{baziData.时柱?.天干?.五行}、{baziData.时柱?.天干?.阴阳}、{baziData.时柱?.天干?.十神}）</p>
                      <p>地支：{baziData.时柱?.地支?.地支}（{baziData.时柱?.地支?.五行}、{baziData.时柱?.地支?.阴阳}）</p>
                      <p>藏干：{baziData.时柱?.地支?.藏干?.主气?.天干}、{baziData.时柱?.地支?.藏干?.中气?.天干}、{baziData.时柱?.地支?.藏干?.余气?.天干}</p>
                      <p>纳音：{baziData.时柱?.纳音}</p>
                      <p>星运：{baziData.时柱?.星运} | 自坐：{baziData.时柱?.自坐}</p>
                      <p>空亡：{baziData.时柱?.空亡}</p>
                    </div>
                    <div className="shensha-list">
                      {baziData.神煞?.时柱?.map((sha, i) => (
                        <span key={i} className="shensha-tag">{sha}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="other-info">
                  <div className="other-section">
                    <h3>胎元·命宫·身宫</h3>
                    <div className="other-grid">
                      <div><span>胎元：</span>{baziData.胎元}</div>
                      <div><span>胎息：</span>{baziData.胎息}</div>
                      <div><span>命宫：</span>{baziData.命宫}</div>
                      <div><span>身宫：</span>{baziData.身宫}</div>
                    </div>
                  </div>

                  <div className="other-section">
                    <h3>大运</h3>
                    <p className="dayun-info">起运年龄：{analysisResult?.大运?.起运年龄 || baziData.大运?.起运年龄}岁 | 起运日期：{baziData.大运?.起运日期}</p>
                    <div className="dayun-row">
                      {baziData.大运?.大运?.map((d, i) => (
                        <div
                          key={i}
                          className={`dayun-chip ${selectedDaYunIndex === i ? 'active' : ''}`}
                          onClick={() => setSelectedDaYunIndex(selectedDaYunIndex === i ? null : i)}
                        >
                          <span className="dayun-chip-ganzhi">{d.干支}</span>
                          <span className="dayun-chip-age">{d.开始年龄}-{d.结束年龄}</span>
                        </div>
                      ))}
                    </div>
                    {selectedDaYunIndex !== null && baziData.大运?.大运?.[selectedDaYunIndex]?.流年 && (
                      <div className="liunian-row">
                        <div className="liunian-title">流年：{baziData.大运?.大运?.[selectedDaYunIndex]?.干支} 大运</div>
                        <div className="liunian-chips">
                          {baziData.大运?.大运?.[selectedDaYunIndex]?.流年?.map((ln: any, j: number) => (
                            <div key={j} className="liunian-chip">
                              <span className="liunian-year">{ln.年份}</span>
                              <span className="liunian-ganzhi">{ln.干支}</span>
                              <span className="liunian-yun">{ln.流年运}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="other-section">
                    <h3>刑冲合会</h3>
                    <div className="xingchong-list">
                      {analysisResult?.xingChong?.刑冲合会?.map((item, i) => (
                        <div key={i} className="xingchong-item">{item}</div>
                      )) || <p>无特殊刑冲合会</p>}
                    </div>
                  </div>

                  <div className="other-section">
                    <h3>五行分布</h3>
                    {renderWuxingBar()}
                    {analysisResult?.wuXing?.缺失五行?.length > 0 && (
                      <p className="missing-wuxing">缺失五行：{analysisResult.wuXing.缺失五行.join('、')}</p>
                    )}
                  </div>

                  <div className="shensha-detailed-section">
                    <h3>神煞对原局的影响</h3>
                    {analysisResult?.shenSha?.重要神煞 && analysisResult.shenSha.重要神煞.length > 0 && (
                      <div className="shensha-tags-detailed">
                        {analysisResult.shenSha.重要神煞.map((sha: string, i: number) => {
                          const shaClass = sha.includes('贵') ? 'sha-贵' : sha.includes('财') ? 'sha-财' : sha.includes('官') ? 'sha-官' : sha.includes('文') ? 'sha-文' : sha.includes('福') ? 'sha-福' : 'sha-注意';
                          return <span key={i} className={`shensha-tag ${shaClass}`}>{sha}</span>;
                        })}
                      </div>
                    )}
                    {analysisResult?.shenSha?.影响分析 && (
                      <p className="shensha-impact">{analysisResult.shenSha.影响分析}</p>
                    )}
                    {analysisResult?.shenSha?.详细解释 && (
                      <div className="shensha-explanation">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysisResult.shenSha.详细解释}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="panel empty-state">
              <div className="empty-icon">☯️</div>
              <p>请在左侧输入出生信息并点击「开始分析」</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>智能问答</h2>
              <div className="modal-header-actions">
                <button className="export-btn" onClick={() => setShowExportModal(true)}>📤 导出</button>
                <button className="modal-close" onClick={closeModal}>×</button>
              </div>
            </div>

            <div className="quick-questions">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  className="quick-btn"
                  onClick={() => handleQuickQuestion(q)}
                  disabled={answering}
                >
                  {q}
                </button>
              ))}
            </div>

            <div className="chat-messages">
              {messages.length === 0 && (
                <div className="chat-empty">
                  问我任何关于您的婚姻、财运、事业、健康、学业等方面的问题
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`message ${msg.role}`}>
                  <div className="sender">{msg.role === 'user' ? '您' : 'AI命理师'}</div>
                  <div className="content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              ))}
              {answering && (
                <div className="message assistant answering">
                  <div className="answering-header">
                    <span className="sender">AI命理师</span>
                    <span className="answering-question">分析中：{answeringQuestion}</span>
                  </div>
                  <div className="thinking-dots">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form
              className="chat-input-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleAsk();
              }}
            >
              <input
                type="text"
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                placeholder="输入您的问题..."
                disabled={answering}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={answering || !inputQuestion.trim()}
              >
                发送
              </button>
            </form>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal-content export-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>导出分析结果</h2>
              <button className="modal-close" onClick={() => setShowExportModal(false)}>×</button>
            </div>
            <div className="export-preview" ref={exportCardRef}>
              <div className="export-card">
                <div className="export-header">
                  <h3>八字命理分析报告</h3>
                  <div className="export-bazi">{baziData?.八字}</div>
                </div>
                <div className="export-info">
                  <span>{baziData?.阳历}</span>
                  <span>{baziData?.性别}</span>
                  <span>{baziData?.生肖}</span>
                </div>
                <div className="export-summary">
                  <div className="export-item">
                    <span className="label">日主</span>
                    <span className="value">{baziData?.日主}</span>
                  </div>
                  <div className="export-item">
                    <span className="label">旺衰</span>
                    <span className="value">{analysisResult?.wangShuai?.旺衰}</span>
                  </div>
                  <div className="export-item">
                    <span className="label">格局</span>
                    <span className="value">{analysisResult?.pattern?.格局}</span>
                  </div>
                  <div className="export-item">
                    <span className="label">喜神</span>
                    <span className="value">{analysisResult?.xiJiShen?.喜神?.join('、')}</span>
                  </div>
                  <div className="export-item">
                    <span className="label">忌神</span>
                    <span className="value">{analysisResult?.xiJiShen?.忌神?.join('、')}</span>
                  </div>
                </div>
                {messages.length > 0 && (
                  <div className="export-qa">
                    {messages.filter(m => m.role === 'assistant').slice(-1).map((msg, idx) => (
                      <div key={idx} className="export-qa-item">
                        <div className="export-question">问：{messages[messages.indexOf(msg) - 1]?.content?.slice(0, 100)}</div>
                        <div className="export-answer-content">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="export-footer">
                  <span>由 DeepSeek AI 生成</span>
                </div>
              </div>
            </div>
            <div className="export-actions">
              <button className="btn btn-primary" onClick={handleExportImage}>📤 导出为图片</button>
            </div>
          </div>
        </div>
      )}

      {showPatternModal && analysisResult?.pattern && (
        <div className="modal-overlay" onClick={() => setShowPatternModal(false)}>
          <div className="modal-content pattern-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>格局详解：{analysisResult.pattern.格局}</h2>
              <button className="modal-close" onClick={() => setShowPatternModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p className="pattern-explanation">{analysisResult.pattern.说明}</p>
              <div className="pattern-advice">
                <h4>格局分析</h4>
                <p>您的命局属于<strong>{analysisResult.pattern.格局}</strong>，{analysisResult.pattern.说明}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <Settings onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

export default App;