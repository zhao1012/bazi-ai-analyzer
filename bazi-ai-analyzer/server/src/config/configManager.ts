import { DEFAULT_MODELS, DEFAULT_PROMPT_TEMPLATE, type ModelConfig, type PromptTemplate } from './models';

const CONFIG_DIR = process.env.CONFIG_DIR || './config';
const MODEL_CONFIG_FILE = `${CONFIG_DIR}/models.json`;
const PROMPT_CONFIG_FILE = `${CONFIG_DIR}/prompt.json`;

export function getModelConfigs(): ModelConfig[] {
  try {
    const fs = require('fs');
    if (fs.existsSync(MODEL_CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(MODEL_CONFIG_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading model config:', e);
  }
  return DEFAULT_MODELS;
}

export function saveModelConfigs(configs: ModelConfig[]): boolean {
  try {
    const fs = require('fs');
    const path = require('path');
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(MODEL_CONFIG_FILE, JSON.stringify(configs, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('Error saving model config:', e);
    return false;
  }
}

export function getActiveModelConfig(): ModelConfig | undefined {
  const configs = getModelConfigs();
  return configs.find(c => c.apiKey) || configs[0];
}

export function getPromptTemplate(): PromptTemplate {
  try {
    const fs = require('fs');
    if (fs.existsSync(PROMPT_CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(PROMPT_CONFIG_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading prompt template:', e);
  }
  return DEFAULT_PROMPT_TEMPLATE;
}

export function savePromptTemplate(template: PromptTemplate): boolean {
  try {
    const fs = require('fs');
    const path = require('path');
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(PROMPT_CONFIG_FILE, JSON.stringify(template, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('Error saving prompt template:', e);
    return false;
  }
}
