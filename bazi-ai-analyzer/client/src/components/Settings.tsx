import { useState, useEffect } from 'react';
import { DEFAULT_MODELS, DEFAULT_PROMPT_TEMPLATE, type ModelConfig, type PromptTemplate } from '../config/models';

interface SettingsProps {
  onClose: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<'models' | 'prompt'>('models');
  const [modelConfigs, setModelConfigs] = useState<ModelConfig[]>(DEFAULT_MODELS);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [promptTemplate, setPromptTemplate] = useState<PromptTemplate>(DEFAULT_PROMPT_TEMPLATE);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchModels();
    fetchPromptTemplate();
  }, []);

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/config/models');
      const data = await res.json();
      if (data.success) {
        setModelConfigs(data.data);
      }
    } catch (e) {
      console.error('Failed to fetch models:', e);
    }
  };

  const fetchPromptTemplate = async () => {
    try {
      const res = await fetch('/api/config/prompt');
      const data = await res.json();
      if (data.success) {
        setPromptTemplate(data.data);
      }
    } catch (e) {
      console.error('Failed to fetch prompt template:', e);
    }
  };

  const handleSaveModel = async (model: ModelConfig) => {
    setSaving(true);
    try {
      const updated = modelConfigs.map(m => m.id === model.id ? model : m);
      const res = await fetch('/api/config/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs: updated }),
      });
      const data = await res.json();
      if (data.success) {
        setModelConfigs(updated);
        setEditingModelId(null);
      }
    } catch (e) {
      console.error('Failed to save model:', e);
    }
    setSaving(false);
  };

  const handleSavePrompt = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/config/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: promptTemplate }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Prompt 模板已保存');
      }
    } catch (e) {
      console.error('Failed to save prompt:', e);
    }
    setSaving(false);
  };

  const providerIcons: Record<string, string> = {
    openai: '🤖',
    deepseek: '🌟',
    lmstudio: '🎬',
    ollama: '🦙',
    custom: '⚙️',
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙️ 设置</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="settings-tabs">
          <button
            className={`tab-btn ${activeTab === 'models' ? 'active' : ''}`}
            onClick={() => setActiveTab('models')}
          >
            模型配置
          </button>
          <button
            className={`tab-btn ${activeTab === 'prompt' ? 'active' : ''}`}
            onClick={() => setActiveTab('prompt')}
          >
            Prompt 模板
          </button>
        </div>

        <div className="settings-body">
          {activeTab === 'models' && (
            <div className="models-list">
              {modelConfigs.map(model => (
                <div key={model.id} className={`model-card ${editingModelId === model.id ? 'editing' : ''}`}>
                  <div className="model-header" onClick={() => setEditingModelId(editingModelId === model.id ? null : model.id)}>
                    <div className="model-info">
                      <span className="model-icon">{providerIcons[model.provider] || '⚙️'}</span>
                      <span className="model-name">{model.name}</span>
                      <span className={`model-status ${model.apiKey ? 'configured' : 'unconfigured'}`}>
                        {model.apiKey ? '已配置' : '未配置'}
                      </span>
                    </div>
                    <span className="expand-icon">{editingModelId === model.id ? '▲' : '▼'}</span>
                  </div>

                  {editingModelId === model.id && (
                    <div className="model-form">
                      <div className="form-group">
                        <label>API 地址</label>
                        <input
                          type="text"
                          value={model.baseUrl}
                          onChange={e => handleSaveModel({ ...model, baseUrl: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>模型名称</label>
                        <input
                          type="text"
                          value={model.model}
                          onChange={e => handleSaveModel({ ...model, model: e.target.value })}
                          placeholder={model.provider === 'lmstudio' ? '留空自动检测' : ''}
                        />
                      </div>
                      <div className="form-group">
                        <label>API Key</label>
                        <input
                          type="password"
                          value={model.apiKey}
                          onChange={e => handleSaveModel({ ...model, apiKey: e.target.value })}
                          placeholder={model.provider === 'lmstudio' ? 'LM Studio 无需 API Key' : '输入 API Key'}
                        />
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Temperature</label>
                          <input
                            type="number"
                            min="0"
                            max="2"
                            step="0.1"
                            value={model.temperature}
                            onChange={e => handleSaveModel({ ...model, temperature: parseFloat(e.target.value) })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Max Tokens</label>
                          <input
                            type="number"
                            value={model.maxTokens}
                            onChange={e => handleSaveModel({ ...model, maxTokens: parseInt(e.target.value) })}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'prompt' && (
            <div className="prompt-editor">
              <div className="form-group">
                <label>模板名称</label>
                <input
                  type="text"
                  value={promptTemplate.name}
                  onChange={e => setPromptTemplate({ ...promptTemplate, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>System Prompt</label>
                <textarea
                  rows={20}
                  value={promptTemplate.systemPrompt}
                  onChange={e => setPromptTemplate({ ...promptTemplate, systemPrompt: e.target.value })}
                />
                <div className="prompt-help">
                  提示词支持 Markdown 格式，可使用表格、列表等格式化文本
                </div>
              </div>
              <button className="btn btn-primary" onClick={handleSavePrompt} disabled={saving}>
                {saving ? '保存中...' : '保存模板'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
