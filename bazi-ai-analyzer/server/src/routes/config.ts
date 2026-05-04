import express from 'express';
import { getModelConfigs, saveModelConfigs, getPromptTemplate, savePromptTemplate } from '../config/configManager.js';
import type { ModelConfig, PromptTemplate } from '../config/models.js';

const router = express.Router();

router.get('/config/models', (req, res) => {
  const configs = getModelConfigs();
  res.json({ success: true, data: configs });
});

router.post('/config/models', (req, res) => {
  const configs: ModelConfig[] = req.body.configs;
  if (!configs) {
    return res.status(400).json({ success: false, error: 'No configs provided' });
  }
  const saved = saveModelConfigs(configs);
  res.json({ success: saved });
});

router.get('/config/prompt', (req, res) => {
  const template = getPromptTemplate();
  res.json({ success: true, data: template });
});

router.post('/config/prompt', (req, res) => {
  const template: PromptTemplate = req.body.template;
  if (!template) {
    return res.status(400).json({ success: false, error: 'No template provided' });
  }
  const saved = savePromptTemplate(template);
  res.json({ success: saved });
});

export default router;
