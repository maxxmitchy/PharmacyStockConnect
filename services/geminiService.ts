import { GoogleGenAI, Type } from "@google/genai";
import { InquiryConfig } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generatePharmacyMessage = async (
  pharmacyName: string,
  config: InquiryConfig
): Promise<string> => {
  try {
    const prompt = `
      Write a WhatsApp message to a pharmacy named "${pharmacyName}".
      I am inquiring about the availability of the product: "${config.productName}".
      Additional context: ${config.additionalNotes}.
      Tone: ${config.tone}.
      
      Keep it short, direct, and ready to send. Do not include placeholders like "[Your Name]" unless absolutely necessary, but prefer generic closings like "Thanks".
      Maximum 3 sentences.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        maxOutputTokens: 100,
        temperature: 0.7,
      }
    });

    return response.text?.trim() || `Hello ${pharmacyName}, do you have ${config.productName} in stock?`;
  } catch (error) {
    console.error("Error generating message:", error);
    return `Hello ${pharmacyName}, do you have ${config.productName} in stock?`;
  }
};

export const batchGenerateMessages = async (
    pharmacies: {name: string}[],
    config: InquiryConfig
): Promise<string[]> => {
    // For bulk operations, we might want a single template generation to save tokens/time,
    // or parallel requests. Here we stick to a template approach for speed if the list is long.
    
    // However, for the best "AI" experience, let's ask Gemini to create a template with a placeholder
    // and we replace it locally.
    
    try {
        const prompt = `
          Create a generic WhatsApp message template to ask a pharmacy if they have a product.
          Product: "${config.productName}"
          Notes: ${config.additionalNotes}
          Tone: ${config.tone}
          
          Use "{{PHARMACY_NAME}}" as the placeholder for the pharmacy name.
          Keep it short and concise.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const template = response.text?.trim() || "Hi {{PHARMACY_NAME}}, do you have availability for " + config.productName + "?";
        
        return pharmacies.map(p => template.replace("{{PHARMACY_NAME}}", p.name));
    } catch (error) {
        console.error("Batch gen error", error);
        return pharmacies.map(p => `Hi ${p.name}, checking stock for ${config.productName}.`);
    }
}
