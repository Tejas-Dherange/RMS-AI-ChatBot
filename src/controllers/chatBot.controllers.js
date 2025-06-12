// import { chatModel } from "../utils/langChain.utils.js";
import { GoogleGenAI } from "@google/genai";
import xlsx from "xlsx";
import path from "path";
import { fileURLToPath } from "url";
import db from "../libs/db.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function reviveDates(obj) {
  if (Array.isArray(obj)) return obj.map(reviveDates);
  if (obj && typeof obj === 'object') {
    const newObj = {};
    for (const key in obj) {
      if (
        typeof obj[key] === 'string' &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(obj[key])
      ) {
        newObj[key] = new Date(obj[key]);
      } else {
        newObj[key] = reviveDates(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
}

const getSqlQuery = async (req, res) => {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "",
  });

  const { naturalQuery } = req.body;

  const prompt = `
You are an assistant that converts natural language into Prisma ORM queries for a PostgreSQL database...
Use this database model:

model JobOrder {
  id                        Int      @id @default(autoincrement())
  orgCode                   String
  ticketNo                  String
  jobOrderNo                String
  printedBy                 String
  jobStatus                 String
  ticketGenDateTime         DateTime
  jobPrintDateTime          DateTime
  materialIssueDateTime     DateTime
  materialDeliveredDateTime DateTime
  materialAckDateTime       DateTime
  ticketStatus              String
  remarks                   String?
  ospJobs                   String?
  gapTicketToPrint          Float?
  gapIssueToDelivery        Float?
  gapDeliveryToAck          Float?
  gapTicketToAck            Float?
  gapTicketToDelivery       Float?
  agingBucket               String?
  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt
}

Respond in **strict JSON format**:
{
  "is_prisma": true or false,
  "prisma_code": "PRISMA_QUERY_OBJECT_AS_JSON",
  "prisma_method": "findMany" | "aggregate" | "groupBy",
  "chat_response": "RESPONSE_IF_NOT_QUERY"
}

- Only return the object that would be passed to the specified Prisma method in the "prisma_code" field, as a stringified JSON object. Do NOT include any code, function calls, or await statements.
- For date/time filters, use ISO 8601 strings (e.g., "2025-06-11T00:00:00.000Z").
- For aggregations (like counts, averages, groupings), use Prisma's \`aggregate\` or \`groupBy\` object format.
- If no query is needed, set "is_prisma": false and write a chatbot reply instead.

**Examples:**

User: "Find jobs acknowledged in the last 24 hours."
Output:
{
  "is_prisma": true,
  "prisma_method": "findMany",
  "prisma_code": "{ \\"where\\": { \\"materialAckDateTime\\": { \\"gte\\": \\"2025-06-11T10:00:00.000Z\\" } } }",
  "chat_response": ""
}

User: "How many jobs fall under each aging bucket?"
Output:
{
  "is_prisma": true,
  "prisma_method": "groupBy",
  "prisma_code": "{ \\"by\\": [\\"agingBucket\\"], \\"_count\\": { \\"_all\\": true } }",
  "chat_response": ""
}

User input:
${naturalQuery}
`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `${prompt}`,
    });

    let text = result.text || "";
    text = text.replace(/^```json|```$/g, "").trim();

    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      return res
        .status(400)
        .json({ error: "Invalid JSON from Gemini", raw: text });
    }

    if (json.is_prisma && json.prisma_code && json.prisma_method) {
      let prismaQuery = {};
      try {
        prismaQuery = JSON.parse(json.prisma_code);
        prismaQuery = reviveDates(prismaQuery);
      } catch (e) {
        return res.status(400).json({ error: "Invalid prisma_code object", raw: json.prisma_code });
      }
      let result;
      if (json.prisma_method === "findMany") {
        result = await db.jobOrder.findMany(prismaQuery);
      } else if (json.prisma_method === "aggregate") {
        result = await db.jobOrder.aggregate(prismaQuery);
      } else if (json.prisma_method === "groupBy") {
        result = await db.jobOrder.groupBy(prismaQuery);
      } else {
        return res.status(400).json({ error: "Unknown prisma_method" });
      }
      return res.json(result);
    } else {
      return res.json({ message: json.chat_response || "No query to run." });
    }
  } catch (err) {
    res.status(500).json({ error: "Gemini Error", details: err.message });
  }
};

const seedDb = async (req, res) => {
  try {
    const filePath = path.join(
      __dirname,
      "../../Job-Order-Performance-Report .xlsx",
    );
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet).slice(0, 500);

    for (const row of data) {
      await db.jobOrder.create({
        data: {
          orgCode: String(row["ORG CODE"] || ""),
          ticketNo: String(row["TICKET NO"] || ""),
          jobOrderNo: String(row["Job Order NO"] || ""),
          printedBy: String(row["IV PRINTED BY"] || ""),
          jobStatus: String(row["JOB STATUS"] || ""),
          ticketGenDateTime: new Date(row["TICKET GEN DATE & TIME"]),
          jobPrintDateTime: new Date(row["1ST JOB PRINT DATE &TIME"]),
          materialIssueDateTime: new Date(
            row["LAST MATERIAL ISSUE DATE & TIME"],
          ),
          materialDeliveredDateTime: new Date(
            row["Material Delivered Date & TIME"],
          ),
          materialAckDateTime: new Date(row["Material Ack Date & TIME"]),
          ticketStatus: String(row["TIcket Status"] || ""),
          remarks: row["Remarks"] ? String(row["Remarks"]) : null,
          ospJobs: row["Osp Jobs"] ? String(row["Osp Jobs"]) : null,
          gapTicketToPrint:
            parseFloat(
              row["Total gap - Ticket Generation to Ticket Print by RMS (Hrs)"],
            ) || null,
          gapIssueToDelivery:
            parseFloat(row["Total gap -Mat Issue to Mat Deliver (Hrs)"]) ||
            null,
          gapDeliveryToAck:
            parseFloat(
              row["Total gap -Mat Deliver to Mat Acknowledgement (Hrs)"],
            ) || null,
          gapTicketToAck:
            parseFloat(
              row[
                "Total gap - Ticket Generation to Mat Acknowledgement  (Hrs)"
              ],
            ) || null,
          gapTicketToDelivery:
            parseFloat(row["Total gap - Ticket Generation to Mat del(Hrs)"]) ||
            null,
          agingBucket: row['Aging Bucket :"Performance category']
            ? String(row['Aging Bucket :"Performance category'])
            : null,
        },
      });
    }

    res.status(200).json({ message: "✅ Database seeded successfully." });
  } catch (error) {
    console.error("❌ Error:", error.message);
    res
      .status(500)
      .json({ error: "Failed to seed data", details: error.message });
  }
};
export { getSqlQuery, seedDb };
