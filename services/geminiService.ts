import { GoogleGenAI, Type, Modality } from '@google/genai';
// Fix: Add CategoryWeights to imports
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
        model: 'gemini-2.5-pro',
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
      throw new Error("Failed to analyze the script. The model may have returned an unexpected format.");
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
        -   **Intrigue-Driven:** Create a curiosity gap or ask a provocative question. Make the user NEED to know the answer.
        -   **Keyword-Focused:** Prioritize clear, searchable terms that the target audience would use to find this content.

    2.  **Optimized Description:**
        -   Start with a strong, engaging hook that reiterates the video's core promise.
        -   Provide a detailed summary of what the video covers.
        -   Include placeholder timestamps for chapters (e.g., (00:00) Introduction).
        -   End with 3-5 relevant hashtags.

    3.  **Tags:**
        -   Provide a comma-separated string of 10-15 highly relevant keywords. Mix broad and specific long-tail keywords.

    4.  **High-CTR Thumbnail Concepts (3 distinct concepts):**
        -   For each concept, provide:
            -   **Concept Name & Psychology:** A name for the concept and a brief explanation of the psychological principle it leverages (e.g., "The Transformation," "The Shocking Result," "The Clear Value").
            -   **Visual Description:** A detailed plan for the visual elements, layout, color scheme, and any text overlays. Be specific.
            -   **AI Image Prompt:** A concise, copy-paste-ready prompt for a modern AI image generator (like DALL-E 3 or Midjourney) to create the main visual for the thumbnail. The prompt should be evocative and artistic.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
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
    throw new Error("Failed to generate the publishing kit. The model may have returned an unexpected format.");
  }
};

// Fix: Add missing evaluatePublishingKit function
export const evaluatePublishingKit = async (kit: PublishingKit): Promise<CategoryWeights> => {
  const prompt = `
    You are a YouTube strategy analyst. You are tasked with evaluating a "Publishing Kit" generated by another AI.
    Your goal is to provide a quantitative analysis based on five key performance indicators.
    Provide a score for each category. The scores must be integers and their sum must be exactly 100, representing a percentage distribution of strategic strength.
    Be critical and create a varied distribution, don't just assign 20 to each.

    **Publishing Kit to Analyze:**
    ---
    Titles: ${JSON.stringify(kit.titles)}
    Description: ${kit.description}
    Tags: ${kit.tags}
    Thumbnail Concepts: ${JSON.stringify(kit.thumbnails)}
    ---

    **Evaluation Categories & Schema:**
    Return a JSON object with scores for each category.
  `;

  const evaluationSchema = {
    type: Type.OBJECT,
    properties: {
      'Clarity & Relevance': { type: Type.INTEGER, description: "Score for clarity and relevance. How well do the assets match search intent?" },
      'Emotional Impact': { type: Type.INTEGER, description: "Score for emotional resonance. How strongly do assets evoke emotion?" },
      'Curiosity Gap': { type: Type.INTEGER, description: "Score for creating curiosity. How effectively do assets make a user want to know more?" },
      'Visual Appeal': { type: Type.INTEGER, description: "Score for potential visual appeal of thumbnails based on their descriptions." },
      'SEO Strength': { type: Type.INTEGER, description: "Score for search engine optimization of title, description, and tags." },
    },
    required: ['Clarity & Relevance', 'Emotional Impact', 'Curiosity Gap', 'Visual Appeal', 'SEO Strength']
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: evaluationSchema,
      },
    });

    const jsonString = response.text.trim();
    const parsed = JSON.parse(jsonString) as CategoryWeights;
    
    // Fallback normalization in case the model doesn't return a sum of 100
    let total = Object.values(parsed).reduce((sum: number, value: any) => sum + value, 0);
    if (total !== 100 && total > 0) {
        const normalized: { [key: string]: number } = {};
        let roundedSum = 0;
        Object.keys(parsed).forEach((key, index, arr) => {
            const val = (parsed[key] / total) * 100;
            normalized[key] = Math.round(val);
            roundedSum += normalized[key];
            if (index === arr.length - 1) {
                const diff = 100 - roundedSum;
                normalized[key] += diff;
            }
        });
        return normalized as CategoryWeights;
    }
    return parsed;
  } catch (error) {
    console.error("Error evaluating publishing kit:", error);
    throw new Error("Failed to evaluate the publishing kit.");
  }
};

// Fix: Add missing refinePublishingKit function
export const refinePublishingKit = async (brief: StrategicBrief, originalKit: PublishingKit, selectedTitle: string, weights: CategoryWeights): Promise<PublishingKit> => {
  const prompt = `
    You are an expert YouTube strategist, acting as a "refinement engine".
    You will be given an initial "Publishing Kit", a preferred title selected by the user, and a set of weights indicating which areas to improve.
    Your task is to generate a *new, improved* Publishing Kit that incorporates this feedback.

    **Original Strategic Brief:**
    - Topic: ${brief.topic}
    - Audience: ${brief.audience}
    - Outcome: ${brief.outcome}

    **Original Publishing Kit:**
    ---
    ${JSON.stringify(originalKit, null, 2)}
    ---

    **User Feedback:**
    - **Selected Primary Title:** "${selectedTitle}"
    - **Refinement Weights (Focus Areas):**
      ${Object.entries(weights).map(([key, value]) => `- ${key}: ${Math.round(value)}%`).join('\n')}

    **Refinement Instructions:**
    1.  **Analyze the feedback:** The selected title is a strong signal of the user's preferred angle. The weights tell you which strategic levers to pull harder. A high weight means that category is very important.
    2.  **Rewrite Titles:** The selected title should now become the "Benefit-Driven" or "Intrigue-Driven" title, whichever is more appropriate. Then, generate two *new* alternative titles that align with the chosen direction but also consider the weights. For example, if "SEO Strength" is high, make the alternatives more keyword-rich.
    3.  **Enhance Description & Tags:** Rewrite the description and tags to better align with the selected title's angle and the specified weights. If 'Emotional Impact' is high, use more evocative language.
    4.  **Re-imagine Thumbnails:** This is crucial. Generate three **new and distinct** thumbnail concepts. These new concepts should be heavily inspired by the selected title and the feedback weights. For example, if "Visual Appeal" is weighted highly, describe more dynamic and eye-catching scenes. If "Curiosity Gap" is high, describe visuals that create mystery.
    5.  **Maintain Schema:** The output must be a valid JSON object matching the required Publishing Kit schema. Do not just modify the old kit; generate a fresh one based on the feedback.

    Generate the new, refined Publishing Kit.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: publishingKitSchema,
      },
    });

    const jsonString = response.text.trim();
    return JSON.parse(jsonString) as PublishingKit;
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
        parts: [{ text: prompt }],
      },
      config: {
          responseModalities: [Modality.IMAGE],
      },
    });

    // Find the first part that contains inline image data
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
    if (imagePart && imagePart.inlineData) {
      return imagePart.inlineData.data;
    }
    
    throw new Error("No image data found in the model's response.");
  } catch (error) {
    console.error("Error generating image:", error);
    throw new Error("Failed to generate the image from the prompt.");
  }
};
export const generateSlideSuggestions = async (brief: StrategicBrief, kit: PublishingKit): Promise<string[]> => {
  const slideSuggestionSchema = {
    type: Type.OBJECT,
    properties: {
      suggestions: {
        type: Type.ARRAY,
        description: "A list of actionable suggestions for the presentation slides.",
        items: {
          type: Type.STRING,
          description: "A single, concise suggestion."
        }
      }
    },
    required: ['suggestions']
  };

  const prompt = `
    You are a presentation design expert. Based on the provided strategic brief and publishing kit,
    generate a list of 5-7 actionable suggestions to improve the quality of the presentation slides.
    Focus on visual storytelling, clarity, and audience engagement.

    **Strategic Brief:**
    - Topic: ${brief.topic}
    - Audience: ${brief.audience}
    - Outcome: ${brief.outcome}

    **Publishing Kit:**
    - Title: ${kit.titles.benefitDriven}
    - Description: ${kit.description}

    Generate a JSON object containing a list of suggestions.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-pro',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: slideSuggestionSchema,
      },
    });

    const jsonString = response.text.trim();
    const parsed = JSON.parse(jsonString) as { suggestions: string[] };
    return parsed.suggestions;
  } catch (error) {
    console.error("Error generating slide suggestions:", error);
    throw new Error("Failed to generate slide suggestions.");
  }
};
