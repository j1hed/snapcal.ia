import { GoogleGenAI, Type } from "@google/genai";
import { MacroData } from "../types";

// The API key must be obtained exclusively from the environment variable process.env.API_KEY.
// This is compatible with Vercel and local setups as long as vite.config.ts defines process.env.
const apiKey = process.env.API_KEY || '';

// Initialize with a fallback to prevent immediate crash, but validation happens in the function
const ai = new GoogleGenAI({ apiKey: apiKey || 'fallback_key_to_init' });

export interface AIAnalysisResult extends MacroData {
  foodName: string;
  description: string;
  confidence: number;
}

export const analyzeFoodImage = async (base64Image: string): Promise<AIAnalysisResult> => {
  try {
    // Check for valid API key before making request
    if (!apiKey || apiKey === 'fallback_key_to_init') {
       console.error("API Key is missing.");
       // Provide a helpful message directing the user to the free key source
       throw new Error("Configuration Error: API Key is missing. Get a FREE key at https://aistudio.google.com/app/apikey and set it as API_KEY.");
    }

    // 1. Extract the actual MIME type from the base64 string (e.g., "image/png")
    const mimeMatch = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";

    // 2. Clean base64 string by removing the data URL prefix
    const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType, // Use the detected mime type
              data: cleanBase64
            }
          },
          {
            text: "Analyze this image of food. Identify the main dish or components. Estimate the total calories, protein, carbs, fat, fiber, sugar, sodium, and cholesterol for the entire visible portion. Provide a short description and a confidence score (0-100)."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            foodName: { type: Type.STRING, description: "Short, concise name of the food" },
            calories: { type: Type.INTEGER, description: "Total estimated calories" },
            protein: { type: Type.INTEGER, description: "Protein in grams" },
            carbs: { type: Type.INTEGER, description: "Carbohydrates in grams" },
            fat: { type: Type.INTEGER, description: "Fat in grams" },
            fiber: { type: Type.INTEGER, description: "Fiber in grams" },
            sugar: { type: Type.INTEGER, description: "Sugar in grams" },
            sodium: { type: Type.INTEGER, description: "Sodium in milligrams" },
            cholesterol: { type: Type.INTEGER, description: "Cholesterol in milligrams" },
            description: { type: Type.STRING, description: "A brief 1-sentence description of the food and portion" },
            confidence: { type: Type.INTEGER, description: "Confidence score 0-100" }
          },
          required: ["foodName", "calories", "protein", "carbs", "fat", "description", "confidence"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const result = JSON.parse(text) as AIAnalysisResult;
    return result;

  } catch (error: any) {
    console.error("AI Analysis failed:", error);
    
    // Check for common specific errors to give better feedback
    let errorMessage = "Could not identify food. Please try again.";
    
    if (error.message?.includes("400") || error.message?.includes("INVALID_ARGUMENT")) {
        errorMessage = "Image format error. Please try taking the photo again.";
    } else if (error.message?.includes("API Key") || error.message?.includes("Configuration Error")) {
        errorMessage = error.message; // Pass through our custom helpful message
    }

    // Fallback error object
    return {
      foodName: "Unknown Food",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      cholesterol: 0,
      description: errorMessage,
      confidence: 0
    };
  }
};