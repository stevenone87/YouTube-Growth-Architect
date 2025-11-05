
import React from 'react';
import { CategoryWeights, CATEGORIES } from '../types';

interface WeightSlidersProps {
  weights: CategoryWeights;
  setWeights: React.Dispatch<React.SetStateAction<CategoryWeights | null>>;
}

const WeightSliders: React.FC<WeightSlidersProps> = ({ weights, setWeights }) => {
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
      } else { // This happens if one slider was at 100
        const evenDistribution = remainingTotal / (CATEGORIES.length - 1);
        for (const category of CATEGORIES) {
            if (category !== changedCategory) {
                newWeights[category] = evenDistribution;
            }
        }
      }

      // Normalize to ensure sum is exactly 100 due to floating point math
      // FIX: Explicitly type accumulator and value in reduce to prevent `unknown` type error.
      // The error was likely caused by the `CategoryWeights` import failing, making `newWeights` an `any` type.
      let currentSum = Object.values(newWeights).reduce((acc: number, w: number) => acc + w, 0);
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
    <div className="space-y-4">
      {CATEGORIES.map(category => (
        <div key={category}>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor={category} className="text-sm font-medium text-gray-300">{category}</label>
            <span className="text-sm font-mono bg-slate-700 text-teal-300 px-2 py-0.5 rounded">{Math.round(weights[category])}%</span>
          </div>
          <input
            id={category}
            type="range"
            min="0"
            max="100"
            value={weights[category]}
            onChange={(e) => handleSliderChange(category, parseInt(e.target.value, 10))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer range-lg accent-teal-400"
          />
        </div>
      ))}
    </div>
  );
};

export default WeightSliders;