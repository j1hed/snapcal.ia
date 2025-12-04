import { GoogleGenAI, Type } from "@google/genai";
import { MacroData } from "../types";

// Initialize the client
// Use a fallback to prevent the app from crashing immediately on load if the key is missing.
// The actual API call will fail later with a clear error if the key is invalid.
const apiKey = process.env.API_KEY || 'placeholder_key_to_prevent_crash';
const ai = new GoogleGenAI({ apiKey });

export interface AIAnalysisResult extends MacroData {
  foodName: string;
  description: string;
  confidence: number;
}

export const analyzeFoodImage = async (base64Image: string): Promise<AIAnalysisResult> => {
  try {
    if (apiKey === 'placeholder_key_to_prevent_crash') {
       throw new Error("API Key is missing. Please set the API_KEY environment variable.");
    }

    // Clean base64 string if it contains the data:image prefix
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
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

  } catch (error) {
    console.error("AI Analysis failed:", error);
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
      description: "Could not identify food. Please try again.",
      confidence: 0
    };
  }
};