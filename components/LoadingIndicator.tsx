
import React from 'react';
import { LoadingState } from '../types';

interface LoadingIndicatorProps {
  state: LoadingState;
}

const messages: Record<LoadingState, string> = {
  [LoadingState.IDLE]: '',
  [LoadingState.ANALYZING_SOURCE]: 'Decoding visual & textual strategic DNA...',
  [LoadingState.GENERATING_KIT]: 'Generating SEO elements & Production Blueprint...',
  [LoadingState.EVALUATING_KIT]: 'Running competitive analysis on initial draft...',
  [LoadingState.REFINING_KIT]: 'Applying high-fidelity refinements to script & metadata...',
  [LoadingState.GENERATING_IMAGES]: 'Synthesizing final high-CTR visual concepts...',
};

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ state }) => {
  const message = messages[state] || 'Processing...';

  return (
    <div className="flex flex-col items-center justify-center p-20 bg-slate-900/50 border border-slate-800 rounded-3xl shadow-2xl text-center max-w-xl mx-auto">
      <div className="w-16 h-16 border-4 border-t-teal-400 border-r-teal-500 border-b-transparent border-l-transparent rounded-full animate-spin mb-8"></div>
      <p className="text-xl font-black text-gray-200 uppercase tracking-widest">{message}</p>
      <div className="mt-4 flex gap-1">
        <div className="w-1 h-1 bg-teal-500 animate-pulse"></div>
        <div className="w-1 h-1 bg-teal-500 animate-pulse delay-75"></div>
        <div className="w-1 h-1 bg-teal-500 animate-pulse delay-150"></div>
      </div>
    </div>
  );
};

export default LoadingIndicator;
