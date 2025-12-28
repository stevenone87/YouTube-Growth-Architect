
import { GoogleGenAI, Type } from '@google/genai';
import { PublishingKit, StrategicBrief, CategoryWeights } from '../types';

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    description: { type: Type.STRING, description: "Detailed video description with timestamps and links." },
    hashtags: { type: Type.STRING, description: "3-5 high-traffic hashtags starting with # (e.g., #SaaS #AI #Startup)." },
    tags: { type: Type.STRING, description: "Comma-separated SEO keywords for the tags field." },
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
  required: ['titles', 'description', 'hashtags', 'tags', 'thumbnails', 'scenes']
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
    const ai = getAI();
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
  const ai = getAI();
  const parts: any[] = [
    { text: `You are a world-class YouTube producer. Generate a Publishing Kit + Production Script.
             IMPORTANT: Include high-performing hashtags starting with # in the hashtags field.
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
  const ai = getAI();
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
  const ai = getAI();
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
  const ai = getAI();
  const prompt = `Refine this YouTube kit for maximum performance. 
  
  SELECTED STRATEGY: 
  - Main Title: "${selectedTitle}"
  - Strategic Priority Weights: ${JSON.stringify(weights)}
  
  BRIEF CONTEXT:
  - Topic: ${brief.topic}
  - Target Audience: ${brief.audience}
  
  TASK:
  1. Refine the metadata and scenes to align perfectly with the selected title and weights.
  2. Generate 3-5 relevant #hashtags for maximum platform visibility.
  3. CREATE THUMBNAIL CONCEPTS: These must be professional, high-impact, and clickable. 
     CRITICAL: The aiImagePrompt for each concept MUST LITERALLY INCLUDE the text of the selected title ("${selectedTitle}") as the primary focal text element to be displayed in the image.
     Describe a vivid, professional-grade visual composition that uses bold typography and cinematic aesthetics to command attention.`;
  
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

export const generateImageFromPrompt = async (prompt: string, title: string): Promise<string> => {
  const ai = getAI();
  const fullPrompt = `Professional YouTube thumbnail. 
  MANDATORY TEXT OVERLAY: "${title}". 
  VISUAL CONCEPT: ${prompt}. 
  STYLE: Cinematic lighting, ultra-detailed, high contrast, vibrant colors, professional composition (rule of thirds), 4k aesthetic. 
  Ensure text is bold, readable, and captures attention immediately.`;

  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: fullPrompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '16:9',
      },
    });

    const base64EncodeString: string = response.generatedImages[0].image.imageBytes;
    if (!base64EncodeString) {
      throw new Error("Imagen 4 returned an empty response.");
    }
    
    return base64EncodeString;
  } catch (error) {
    console.error("Imagen generation error:", error);
    throw error;
  }
};
