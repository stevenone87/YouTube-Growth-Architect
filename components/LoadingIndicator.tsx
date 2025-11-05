import React from 'react';
import { LoadingState } from '../types';

interface LoadingIndicatorProps {
  state: LoadingState;
}

// Fix: Add messages for new loading states and update existing ones for clarity.
const messages: Record<LoadingState, string> = {
  [LoadingState.IDLE]: '',
  [LoadingState.ANALYZING_SCRIPT]: 'Analyzing your script to create a brief...',
  [LoadingState.GENERATING_KIT]: 'Architecting your SEO & thumbnail concepts...',
  [LoadingState.EVALUATING_KIT]: 'Evaluating the initial kit with AI...',
  [LoadingState.REFINING_KIT]: 'Refining the kit based on your feedback...',
  [LoadingState.GENERATING_IMAGES]: 'Generating refined thumbnail images...',
};

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ state }) => {
  const message = messages[state] || 'Loading...';

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-slate-800/50 rounded-lg shadow-xl text-center">
      <div className="w-12 h-12 border-4 border-t-teal-400 border-r-teal-400 border-b-slate-600 border-l-slate-600 rounded-full animate-spin"></div>
      <p className="mt-4 text-lg font-semibold text-gray-300">{message}</p>
    </div>
  );
};

export default LoadingIndicator;
