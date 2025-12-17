
import { GoogleGenAI, Type } from '@google/genai';
import { PublishingKit, StrategicBrief, CategoryWeights } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const publishingKitSchema = {
  type: Type.OBJECT,
  properties: {
    titles: {
      type: Type.OBJECT,
      description: "Three distinct title options based on different psychological triggers.",
      properties: {
        benefitDriven: { type: Type.STRING, description: "A title that clearly states the value to the viewer." },
        intrigueDriven: { type: Type.STRING, description: "A title that creates a curiosity gap." },
        keywordFocused: { type: Type.STRING, description: "A title heavily weighted for search engine discoverability." },
      },
      required: ['benefitDriven', 'intrigueDriven', 'keywordFocused']
    },
    description: {
      type: Type.STRING,
      description: "A well-structured, multi-paragraph description template including a hook, summary, placeholder timestamps, and hashtags."
    },
    tags: {
      type: Type.STRING,
      description: "A comma-separated string of 10-15 relevant keywords and long-tail keywords."
    },
    thumbnails: {
      type: Type.ARRAY,
      description: "Three distinct, high-CTR thumbnail concepts.",
      items: {
        type: Type.OBJECT,
        properties: {
          conceptName: { type: Type.STRING, description: "A title for the concept." },
          psychology: { type: Type.STRING, description: "The psychological principle it uses to attract clicks." },
          visualDescription: { type: Type.STRING, description: "A detailed description of the visual elements, layout, color scheme, and text overlays." },
          aiImagePrompt: { type: Type.STRING, description: "A ready-to-use prompt for an AI image generator to create the visual base." }
        },
        required: ['conceptName', 'psychology', 'visualDescription', 'aiImagePrompt']
      }
    }
  },
  required: ['titles', 'description', 'tags', 'thumbnails']
};

const briefSchema = {
    type: Type.OBJECT,
    properties: {
      topic: { type: Type.STRING, description: "A concise, descriptive topic for the video based on the script." },
      audience: { type: Type.STRING, description: "The specific target audience this script is intended for." },
      outcome: { type: Type.STRING, description: "The single most important value, skill, or takeaway a viewer gets from this script." },
    },
    required: ['topic', 'audience', 'outcome']
};

export const analyzeScriptForBrief = async (script: string): Promise<StrategicBrief> => {
    const prompt = `
      You are an expert YouTube producer. Read the following video script/tutorial text and extract the core strategic information. Your goal is to distill this text into a concise, actionable brief.

      **Full Script/Text:**
      ---
      ${script}
      ---

      Based *only* on the text provided, determine the following:
      1.  **topic:** What is the main subject? Be specific.
      2.  **audience:** Who is this content for? (e.g., "Beginner developers," "Advanced Excel users").
      3.  **outcome:** What is the single key takeaway or result for the viewer? (e.g., "They will be able to build a simple web app").

      Provide the output in a structured JSON format.
    `;
  
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: briefSchema,
        },
      });
  
      const jsonString = response.text.trim();
      return JSON.parse(jsonString) as StrategicBrief;
    } catch (error) {
      console.error("Error analyzing script:", error);
      throw new Error("Failed to analyze the script.");
    }
};

export const generatePublishingKit = async (brief: StrategicBrief): Promise<PublishingKit> => {
  const prompt = `
    You are an expert YouTube strategist and growth hacker. Your task is to take a user's video concept and generate a complete "Publishing Kit" to maximize its discoverability and click-through rate.

    **User's Strategic Brief:**
    - **Video Topic:** ${brief.topic}
    - **Target Audience:** ${brief.audience}
    - **Key Outcome for Viewer:** ${brief.outcome}

    Based on this brief, generate the following assets in a structured JSON format:

    1.  **Optimized Titles (3 options):**
        -   **Benefit-Driven:** Focus on the value and "what's in it for me" for the viewer.
        -   **Intrigue-Driven:** Create a curiosity gap or ask a provocative question.
        -   **Keyword-Focused:** Prioritize clear, searchable terms.

    2.  **Optimized Description:**
        -   Start with a hook, provide a summary, include placeholder timestamps, and end with 3-5 hashtags.

    3.  **Tags:**
        -   Provide a comma-separated string of 10-15 highly relevant keywords.

    4.  **High-CTR Thumbnail Concepts (3 distinct concepts):**
        -   Provide Concept Name, Psychology, Visual Description, and AI Image Prompt.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: publishingKitSchema,
      },
    });

    const jsonString = response.text.trim();
    return JSON.parse(jsonString) as PublishingKit;
  } catch (error) {
    console.error("Error generating publishing kit:", error);
    throw new Error("Failed to generate the publishing kit.");
  }
};

const evaluationSchema = {
  type: Type.OBJECT,
  properties: {
    'Clarity & Relevance': { type: Type.INTEGER, description: "Score (0-100)" },
    'Emotional Impact': { type: Type.INTEGER, description: "Score (0-100)" },
    'Curiosity Gap': { type: Type.INTEGER, description: "Score (0-100)" },
    'Visual Appeal': { type: Type.INTEGER, description: "Score (0-100)" },
    'SEO Strength': { type: Type.INTEGER, description: "Score (0-100)" },
  },
  required: ['Clarity & Relevance', 'Emotional Impact', 'Curiosity Gap', 'Visual Appeal', 'SEO Strength']
};

export const evaluatePublishingKit = async (kit: PublishingKit): Promise<CategoryWeights> => {
  const prompt = `
    Analyze this YouTube Publishing Kit and distribute 100 percentage points across these strategic categories based on its CURRENT strength.
    
    Titles: ${JSON.stringify(kit.titles)}
    Description: ${kit.description}
    Thumbnail Concepts: ${JSON.stringify(kit.thumbnails)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: evaluationSchema,
      },
    });

    const parsed = JSON.parse(response.text.trim()) as CategoryWeights;
    return normalizeWeights(parsed);
  } catch (error) {
    console.error("Error evaluating publishing kit:", error);
    throw new Error("Failed to evaluate the publishing kit.");
  }
};

export const suggestWeights = async (brief: StrategicBrief, kit: PublishingKit): Promise<CategoryWeights> => {
  const prompt = `
    Based on the following video brief, what is the IDEAL weight distribution for refinement? 
    Should we focus more on SEO, Curiosity, or Emotion?
    
    Brief: Topic "${brief.topic}", Audience "${brief.audience}", Outcome "${brief.outcome}"
    
    Distribute exactly 100 points across the categories.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: evaluationSchema,
      },
    });

    const parsed = JSON.parse(response.text.trim()) as CategoryWeights;
    return normalizeWeights(parsed);
  } catch (error) {
    console.error("Error suggesting weights:", error);
    throw new Error("Failed to get AI weight suggestion.");
  }
};

const normalizeWeights = (weights: CategoryWeights): CategoryWeights => {
    let total = Object.values(weights).reduce((sum, val) => sum + val, 0);
    if (total === 0) return {
      'Clarity & Relevance': 20,
      'Emotional Impact': 20,
      'Curiosity Gap': 20,
      'Visual Appeal': 20,
      'SEO Strength': 20
    };
    
    const normalized: any = {};
    let roundedSum = 0;
    const keys = Object.keys(weights);
    keys.forEach((key, index) => {
        const val = (weights[key] / total) * 100;
        normalized[key] = Math.round(val);
        roundedSum += normalized[key];
        if (index === keys.length - 1) {
            normalized[key] += (100 - roundedSum);
        }
    });
    return normalized;
};

export const refinePublishingKit = async (brief: StrategicBrief, originalKit: PublishingKit, selectedTitle: string, weights: CategoryWeights): Promise<PublishingKit> => {
  const prompt = `
    Refine the YouTube Publishing Kit.
    Selected Title: "${selectedTitle}"
    Target Weights: ${JSON.stringify(weights)}
    Original Brief: ${JSON.stringify(brief)}
    Original Kit: ${JSON.stringify(originalKit)}
    
    Generate a NEW kit that shifts the strategy towards the higher weighted categories while keeping the core topic.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: publishingKitSchema,
      },
    });

    return JSON.parse(response.text.trim()) as PublishingKit;
  } catch (error) {
    console.error("Error refining publishing kit:", error);
    throw new Error("Failed to refine the publishing kit.");
  }
};

export const generateImageFromPrompt = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `High quality YouTube thumbnail art, vibrant, professional, click-worthy: ${prompt}` }],
      },
      // Note: responseMimeType and responseSchema are NOT supported for gemini-2.5-flash-image
    });

    // Fix: Correctly iterate through parts to find the image part (inlineData) as per @google/genai guidelines.
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return part.inlineData.data;
        }
      }
    }
    throw new Error("No image data found in response parts.");
  } catch (error) {
    console.error("Error generating image:", error);
    throw new Error("Failed to generate image.");
  }
};
