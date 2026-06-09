export interface RhythmPoint {
  time: number;
  hit: boolean;
  result?: 'perfect' | 'good' | 'miss';
}

export interface RecipeStep {
  id: number;
  name: string;
  instruction: string;
  ingredient: 'tomato' | 'egg' | 'onion' | 'pan' | 'plate';
  rhythmPoints: RhythmPoint[];
  duration: number;
}

export interface Recipe {
  name: string;
  steps: RecipeStep[];
}

const createRhythmPoints = (times: number[]): RhythmPoint[] =>
  times.map((time) => ({ time, hit: false }));

export const tomatoEggRecipe: Recipe = {
  name: '番茄炒蛋',
  steps: [
    {
      id: 1,
      name: '清洗番茄',
      instruction: '点击清洗番茄',
      ingredient: 'tomato',
      rhythmPoints: createRhythmPoints([1000, 2000]),
      duration: 3000
    },
    {
      id: 2,
      name: '切番茄',
      instruction: '点击切番茄',
      ingredient: 'tomato',
      rhythmPoints: createRhythmPoints([1000, 1800, 2600]),
      duration: 3600
    },
    {
      id: 3,
      name: '打蛋',
      instruction: '点击打蛋',
      ingredient: 'egg',
      rhythmPoints: createRhythmPoints([1200, 2200]),
      duration: 3200
    },
    {
      id: 4,
      name: '热油',
      instruction: '点击下食材',
      ingredient: 'pan',
      rhythmPoints: createRhythmPoints([1500]),
      duration: 2500
    },
    {
      id: 5,
      name: '翻炒',
      instruction: '点击翻炒',
      ingredient: 'pan',
      rhythmPoints: createRhythmPoints([800, 1400, 2000, 2600]),
      duration: 3600
    },
    {
      id: 6,
      name: '装盘',
      instruction: '点击装盘',
      ingredient: 'plate',
      rhythmPoints: createRhythmPoints([1500]),
      duration: 2500
    }
  ]
};

export function getTotalRecipeDuration(recipe: Recipe): number {
  return recipe.steps.reduce((sum, step) => sum + step.duration, 0);
}

export function getCurrentStep(
  recipe: Recipe,
  elapsedTime: number
): { step: RecipeStep | null; stepIndex: number; stepTime: number } {
  let accumulated = 0;
  for (let i = 0; i < recipe.steps.length; i++) {
    const step = recipe.steps[i];
    if (elapsedTime < accumulated + step.duration) {
      return { step, stepIndex: i, stepTime: elapsedTime - accumulated };
    }
    accumulated += step.duration;
  }
  return { step: null, stepIndex: recipe.steps.length, stepTime: 0 };
}
