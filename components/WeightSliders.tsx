
import React from 'react';
import { CategoryWeights, CATEGORIES } from '../types';
import { SparklesIcon, RefreshCwIcon } from './Icons';

interface WeightSlidersProps {
  weights: CategoryWeights;
  setWeights: React.Dispatch<React.SetStateAction<CategoryWeights | null>>;
  onAiSuggest?: () => void;
  isSuggesting?: boolean;
}

const WeightSliders: React.FC<WeightSlidersProps> = ({ weights, setWeights, onAiSuggest, isSuggesting }) => {
  
  const applyWeights = (newWeights: CategoryWeights) => {
    setWeights(newWeights);
  };

  const handleReset = () => {
    applyWeights({
      'Clarity & Relevance': 20,
      'Emotional Impact': 20,
      'Curiosity Gap': 20,
      'Visual Appeal': 20,
      'SEO Strength': 20
    });
  };

  const handlePreset = (type: 'viral' | 'seo' | 'visual') => {
    switch (type) {
      case 'viral':
        applyWeights({
          'Clarity & Relevance': 10,
          'Emotional Impact': 35,
          'Curiosity Gap': 35,
          'Visual Appeal': 15,
          'SEO Strength': 5
        });
        break;
      case 'seo':
        applyWeights({
          'Clarity & Relevance': 30,
          'Emotional Impact': 5,
          'Curiosity Gap': 5,
          'Visual Appeal': 20,
          'SEO Strength': 40
        });
        break;
      case 'visual':
        applyWeights({
          'Clarity & Relevance': 10,
          'Emotional Impact': 10,
          'Curiosity Gap': 20,
          'Visual Appeal': 50,
          'SEO Strength': 10
        });
        break;
    }
  };

  const handleSliderChange = (changedCategory: string, newValue: number) => {
    setWeights(prevWeights => {
      if (!prevWeights) return null;

      const oldWeight = prevWeights[changedCategory];
      const sumOfOtherWeights = 100 - oldWeight;

      const newWeights: CategoryWeights = { ...prevWeights };
      newWeights[changedCategory] = newValue;
      
      const remainingTotal = 100 - newValue;
      
      if (sumOfOtherWeights > 0) {
        for (const category of CATEGORIES) {
          if (category !== changedCategory) {
            const proportion = prevWeights[category] / sumOfOtherWeights;
            newWeights[category] = proportion * remainingTotal;
          }
        }
      } else {
        const evenDistribution = remainingTotal / (CATEGORIES.length - 1);
        for (const category of CATEGORIES) {
            if (category !== changedCategory) {
                newWeights[category] = evenDistribution;
            }
        }
      }

      let roundedWeights: CategoryWeights = {};
      let roundedSum = 0;

      Object.keys(newWeights).forEach(cat => {
        const rounded = Math.round(newWeights[cat]);
        roundedWeights[cat] = rounded;
        roundedSum += rounded;
      });

      let diff = 100 - roundedSum;
      if (diff !== 0) {
          const catToAdjust = Object.keys(roundedWeights).reduce((a, b) => roundedWeights[a] > roundedWeights[b] ? a : b);
          roundedWeights[catToAdjust] += diff;
      }
      
      return roundedWeights;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button 
          onClick={onAiSuggest} 
          disabled={isSuggesting}
          className="flex-1 flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 text-white text-xs font-bold py-2 px-3 rounded-md transition-all whitespace-nowrap"
        >
          {isSuggesting ? <RefreshCwIcon className="h-3 w-3 animate-spin" /> : <SparklesIcon className="h-3 w-3" />}
          AI Best Strategy
        </button>
        <button 
          onClick={() => handlePreset('viral')} 
          className="bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 text-purple-200 text-xs font-bold py-2 px-3 rounded-md transition-all"
        >
          Viral Focus
        </button>
        <button 
          onClick={() => handlePreset('seo')} 
          className="bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/50 text-blue-200 text-xs font-bold py-2 px-3 rounded-md transition-all"
        >
          SEO Heavy
        </button>
        <button 
          onClick={handleReset} 
          className="bg-slate-700 hover:bg-slate-600 text-gray-300 text-xs font-bold py-2 px-3 rounded-md transition-all"
        >
          Reset
        </button>
      </div>

      <div className="space-y-4">
        {CATEGORIES.map(category => (
          <div key={category}>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor={category} className="text-xs font-medium text-gray-400 uppercase tracking-tight">{category}</label>
              <span className="text-xs font-mono bg-slate-700 text-teal-300 px-2 py-0.5 rounded">{Math.round(weights[category])}%</span>
            </div>
            <input
              id={category}
              type="range"
              min="0"
              max="100"
              value={weights[category]}
              onChange={(e) => handleSliderChange(category, parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer range-lg accent-teal-400"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeightSliders;
