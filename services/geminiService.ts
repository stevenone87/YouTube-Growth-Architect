
import { GoogleGenAI, Type } from '@google/genai';
import { PublishingKit, StrategicBrief, CategoryWeights, Scene } from '../types';

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
      description: "A professional script breakdown into scenes.",
      items: {
        type: Type.OBJECT,
        properties: {
          sceneNumber: { type: Type.INTEGER },
          visual: { type: Type.STRING, description: "Visual directions, camera angles, or on-screen graphics." },
          audio: { type: Type.STRING, description: "The script/dialogue or voiceover text." },
          duration: { type: Type.STRING, description: "Timing for this segment (e.g., '10s')." }
        },
        required: ['sceneNumber', 'visual', 'audio', 'duration']
      }
    }
  },
  required: ['titles', 'description', 'tags', 'thumbnails', 'scenes']
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

export const analyzeSourceForBrief = async (text: string, base64Image?: string): Promise<StrategicBrief> => {
    const parts: any[] = [
      { text: `Analyze the provided materials (text and optional image) to create a YouTube strategic brief. 
                If an image is provided, use it to infer tone, branding, or subject matter details.
                TEXT SOURCE: ${text}` }
    ];

    if (base64Image) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image.split(',')[1] || base64Image
        }
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: briefSchema,
        },
      });
  
      const result = JSON.parse(response.text.trim()) as StrategicBrief;
      if (base64Image) result.imageData = base64Image;
      return result;
    } catch (error) {
      console.error("Error analyzing source:", error);
      throw new Error("Failed to analyze the source material.");
    }
};

export const generatePublishingKit = async (brief: StrategicBrief): Promise<PublishingKit> => {
  const parts: any[] = [
    { text: `You are a world-class YouTube producer. Generate a Publishing Kit + Production Script.
             BRIEF:
             - Topic: ${brief.topic}
             - Audience: ${brief.audience}
             - Outcome: ${brief.outcome}` }
  ];

  if (brief.imageData) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: brief.imageData.split(',')[1] || brief.imageData
      }
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: publishingKitSchema,
      },
    });

    return JSON.parse(response.text.trim()) as PublishingKit;
  } catch (error) {
    console.error("Error generating kit:", error);
    throw new Error("Failed to generate the production blueprint.");
  }
};

export const evaluatePublishingKit = async (kit: PublishingKit): Promise<CategoryWeights> => {
  const prompt = `Distribute 100 points across categories for this kit: ${JSON.stringify(kit.titles)} | ${kit.description.substring(0, 100)}`;
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
    return { 'Clarity & Relevance': 20, 'Emotional Impact': 20, 'Curiosity Gap': 20, 'Visual Appeal': 20, 'SEO Strength': 20 };
  }
};

export const suggestWeights = async (brief: StrategicBrief): Promise<CategoryWeights> => {
  const prompt = `Ideal strategy weights for: ${brief.topic}. Focus on audience: ${brief.audience}. Sum to 100.`;
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
  const prompt = `Refine this YouTube kit. Selected Title: ${selectedTitle}. Focus on these weights: ${JSON.stringify(weights)}. Brief: ${JSON.stringify(brief)}. Original Kit: ${JSON.stringify(originalKit)}`;
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
    contents: { parts: [{ text: `YouTube Thumbnail, High Impact, 4k: ${prompt}` }] },
  });
  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (!part?.inlineData?.data) throw new Error("Image generation failed");
  return part.inlineData.data;
};
