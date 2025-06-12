
import { GoogleGenerativeAI } from '@google/generative-ai';

// const chatModel = new GoogleGenerativeAI({
//   apiKey: process.env.GEMINI_API_KEY,
//   model: "models/chat-bison-001", // use Gemini 1.5 or latest
// });

const genAI = new GoogleGenerativeAI( process.env.GEMINI_API_KEY  || "");

 const chatModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
export { chatModel };
 