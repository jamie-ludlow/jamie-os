export type AIModelOption = {
  value: string;
  label: string;
  provider: 'anthropic' | 'openai' | 'google';
  fallback?: boolean;
};

export const AI_MODEL_OPTIONS: AIModelOption[] = [
  { value: 'gpt-4.1', label: 'GPT-4.1', provider: 'openai' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', provider: 'openai' },
  { value: 'gpt-4o', label: 'GPT-4o', provider: 'openai' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai' },
  { value: 'claude-opus-4-6', label: 'Claude Opus 4.6', provider: 'anthropic' },
  { value: 'gemma-4', label: 'Gemma 4', provider: 'google', fallback: true },
];

export const DEFAULT_AI_MODEL = 'gpt-4.1';
export const GEMMA_BACKUP_MODEL = 'gemma-4' as const;

export function getAIModelLabel(model: string) {
  return AI_MODEL_OPTIONS.find((option) => option.value === model)?.label ?? model;
}

export function getFallbackModel(primaryModel: string) {
  return primaryModel === GEMMA_BACKUP_MODEL ? null : GEMMA_BACKUP_MODEL;
}
