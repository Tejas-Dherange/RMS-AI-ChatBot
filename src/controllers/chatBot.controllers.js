// import { chatModel } from "../utils/langChain.utils.js";
import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: "" });

const getSqlQuery = async (req, res) => {
  const { naturalQuery, tableSchema } = req.body;

  const prompt = `Schema:\n${tableSchema}\n\nQuery: ${naturalQuery}\n\nReturn only the SQL query, no explanations:`;

  try {
    // const response = await chatModel.generateContent(prompt);
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `${prompt}`, 
    });
    console.log(response.text);

    res.json({ sql: response.text.trim() });
  } catch (err) {
    res.status(500).json({ error: "Gemini error", details: err.message });
  }
};

export { getSqlQuery };
