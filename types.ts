
export interface StrategicBrief {
  topic: string;
  audience: string;
  outcome: string;
}

export interface Scene {
  sceneNumber: number;
  visual: string;
  audio: string;
  duration: string;
  retentionTactic: string;
}

export interface HookVariation {
  style: string;
  script: string;
  psychology: string;
}

export interface AudiencePersona {
  name: string;
  painPoints: string[];
  motivations: string;
}

export interface ThumbnailConcept {
  conceptName: string;
  psychology: string;
  visualDescription: string;
  aiImagePrompt: string;
}

export interface PublishingKit {
  titles: {
    benefitDriven: string;
    intrigueDriven: string;
    keywordFocused: string;
  };
  description: string;
  tags: string;
  thumbnails: ThumbnailConcept[];
  scenes: Scene[];
  hooks: HookVariation[];
  persona: AudiencePersona;
  competitorGap: string;
}

export enum LoadingState {
  IDLE = 'IDLE',
  ANALYZING_SOURCE = 'ANALYZING_SOURCE',
  GENERATING_KIT = 'GENERATING_KIT',
  EVALUATING_KIT = 'EVALUATING_KIT',
  REFINING_KIT = 'REFINING_KIT',
  GENERATING_IMAGES = 'GENERATING_IMAGES',
}

export const CATEGORIES = [
  'Clarity & Relevance',
  'Emotional Impact',
  'Curiosity Gap',
  'Visual Appeal',
  'SEO Strength'
];

export type CategoryWeights = {
  [key: string]: number;
};
