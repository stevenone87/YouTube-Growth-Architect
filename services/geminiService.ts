
import { GoogleGenAI, Type } from '@google/genai';
import { PublishingKit, StrategicBrief, CategoryWeights } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const publishingKitSchema = {
  type: Type.OBJECT,
  properties: {
    titles: {
      type: Type.OBJECT,
      properties: {
        benefitDriven: { type: Type.STRING },
        intrigueDriven: { type: Type.STRING },
        keywordFocused: { type: Type.STRING },
      },
      required: ['benefitDriven', 'intrigueDriven', 'keywordFocused']
    },
    description: { type: Type.STRING },
    tags: { type: Type.STRING },
    thumbnails: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          conceptName: { type: Type.STRING },
          psychology: { type: Type.STRING },
          visualDescription: { type: Type.STRING },
          aiImagePrompt: { type: Type.STRING }
        },
        required: ['conceptName', 'psychology', 'visualDescription', 'aiImagePrompt']
      }
    },
    scenes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sceneNumber: { type: Type.INTEGER },
          visual: { type: Type.STRING },
          audio: { type: Type.STRING },
          duration: { type: Type.STRING },
          retentionTactic: { type: Type.STRING, description: "Specific tactic to keep viewers watching (e.g. 'Pattern Interrupt', 'Loop Opening')." }
        },
        required: ['sceneNumber', 'visual', 'audio', 'duration', 'retentionTactic']
      }
    },
    hooks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          style: { type: Type.STRING, description: "e.g. 'Negative Framing', 'Authority', 'Story Start'" },
          script: { type: Type.STRING },
          psychology: { type: Type.STRING }
        },
        required: ['style', 'script', 'psychology']
      }
    },
    persona: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        painPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
        motivations: { type: Type.STRING }
      },
      required: ['name', 'painPoints', 'motivations']
    },
    competitorGap: { type: Type.STRING, description: "Analysis of why this specific angle beats existing content." }
  },
  required: ['titles', 'description', 'tags', 'thumbnails', 'scenes', 'hooks', 'persona', 'competitorGap']
};

const briefSchema = {
    type: Type.OBJECT,
    properties: {
      topic: { type: Type.STRING },
      audience: { type: Type.STRING },
      outcome: { type: Type.STRING },
    },
    required: ['topic', 'audience', 'outcome']
};

export const analyzeSourceForBrief = async (text: string): Promise<StrategicBrief> => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze this text and create a YouTube strategic brief.
                  TEXT SOURCE: ${text}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: briefSchema,
        },
      });
      return JSON.parse(response.text.trim()) as StrategicBrief;
    } catch (error) {
      console.error("Error analyzing source:", error);
      throw new Error("Failed to analyze the text material.");
    }
};

export const generatePublishingKit = async (brief: StrategicBrief): Promise<PublishingKit> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `You are a high-level YouTube Content Strategist. Based on the brief, generate a comprehensive Publishing Kit + Production Script.
                 Focus deeply on viewer psychology and retention.
                 BRIEF:
                 - Topic: ${brief.topic}
                 - Audience: ${brief.audience}
                 - Outcome: ${brief.outcome}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: publishingKitSchema,
      },
    });
    return JSON.parse(response.text.trim()) as PublishingKit;
  } catch (error) {
    console.error("Error generating kit:", error);
    throw new Error("Failed to generate the strategic blueprint.");
  }
};

export const evaluatePublishingKit = async (kit: PublishingKit): Promise<CategoryWeights> => {
  const prompt = `Evaluate this YouTube strategy. Rate 0-100 for each category. Sum doesn't need to be 100, these are independent ratings.
                  Kit Data: ${JSON.stringify(kit.titles)} | ${kit.competitorGap}`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            'Clarity & Relevance': { type: Type.INTEGER },
            'Emotional Impact': { type: Type.INTEGER },
            'Curiosity Gap': { type: Type.INTEGER },
            'Visual Appeal': { type: Type.INTEGER },
            'SEO Strength': { type: Type.INTEGER },
          },
          required: ['Clarity & Relevance', 'Emotional Impact', 'Curiosity Gap', 'Visual Appeal', 'SEO Strength']
        }
      },
    });
    return JSON.parse(response.text.trim());
  } catch (err) {
    return { 'Clarity & Relevance': 50, 'Emotional Impact': 50, 'Curiosity Gap': 50, 'Visual Appeal': 50, 'SEO Strength': 50 };
  }
};

export const suggestWeights = async (brief: StrategicBrief): Promise<CategoryWeights> => {
  const prompt = `Identify target weight distributions for: ${brief.topic}. Focus on audience: ${brief.audience}. Sum must be 100.`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          'Clarity & Relevance': { type: Type.INTEGER },
          'Emotional Impact': { type: Type.INTEGER },
          'Curiosity Gap': { type: Type.INTEGER },
          'Visual Appeal': { type: Type.INTEGER },
          'SEO Strength': { type: Type.INTEGER },
        }
      }
    }
  });
  return JSON.parse(response.text.trim());
};

export const refinePublishingKit = async (brief: StrategicBrief, originalKit: PublishingKit, selectedTitle: string, weights: CategoryWeights): Promise<PublishingKit> => {
  const prompt = `Synthesize a high-fidelity YouTube strategy. Selected Title: ${selectedTitle}. Targeted Strategy Weights: ${JSON.stringify(weights)}. Original Kit: ${JSON.stringify(originalKit)}`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: publishingKitSchema,
    },
  });
  return JSON.parse(response.text.trim());
};

export const generateImageFromPrompt = async (prompt: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: `YouTube Thumbnail Style, Vivid, High Definition: ${prompt}` }] },
  });
  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (!part?.inlineData?.data) throw new Error("Image generation failed");
  return part.inlineData.data;
};
