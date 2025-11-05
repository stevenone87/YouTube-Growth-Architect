// Fix: Create the actual type definitions that were missing.
export interface StrategicBrief {
  topic: string;
  audience: string;
  outcome: string;
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
}

export enum LoadingState {
  IDLE = 'IDLE',
  ANALYZING_SCRIPT = 'ANALYZING_SCRIPT',
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
