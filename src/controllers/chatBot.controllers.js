// import { chatModel } from "../utils/langChain.utils.js";
import { GoogleGenAI } from "@google/genai";
import xlsx from "xlsx";
import path from "path";
import { fileURLToPath } from "url";
import db from "../libs/db.js";
import { askGemini } from "../utils/langChain.utils.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function reviveDates(obj) {
  if (Array.isArray(obj)) return obj.map(reviveDates);
  if (obj && typeof obj === "object") {
    const newObj = {};
    for (const key in obj) {
      if (
        typeof obj[key] === "string" &&
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
  originalTicketGenDateTime DateTime
  jobPrintDateTime          DateTime
  gapTicketToPrint          Float?
  materialIssueDateTime     DateTime
  materialDeliveredDateTime DateTime
  gapIssueToDelivery        Float?
  materialAckDateTime       DateTime
  gapDeliveryToAck          Float?
  gapTicketToAck            Float?
  ticketStatus              String
  remarks                   String?
  ospJobs                   String?
  gapTicketToDelivery       Float?
  agingBucket               String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
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
        return res
          .status(400)
          .json({ error: "Invalid prisma_code object", raw: json.prisma_code });
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
    const data = xlsx.utils.sheet_to_json(sheet, { raw: false }).slice(0,2000);

    const parseCustomDate = (dateString) => {
      if (!dateString || typeof dateString !== "string") {
        return null;
      }

      const trimmed = dateString.trim();
      // console.log(`Parsing: "${trimmed}"`);

      // Try multiple formats that Excel might return
      const formats = [
        // 24-hour format: DD-MM-YYYY HH:MM
        {
          regex: /^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{1,2})$/,
          parse: (match) => {
            const [, day, month, year, hour, minute] = match;
            return new Date(
              Number(year),
              Number(month) - 1,
              Number(day),
              Number(hour),
              Number(minute)
            );
          }
        },
        // 12-hour format: DD-MM-YYYY HH:MM:SS AM/PM
        {
          regex: /^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})\s+(AM|PM)$/i,
          parse: (match) => {
            const [, day, month, year, hours, minutes, seconds, meridian] = match;
            let hour24 = Number(hours);
            
            if (meridian.toUpperCase() === "PM" && hour24 !== 12) {
              hour24 += 12;
            } else if (meridian.toUpperCase() === "AM" && hour24 === 12) {
              hour24 = 0;
            }

            return new Date(
              Number(year),
              Number(month) - 1,
              Number(day),
              hour24,
              Number(minutes),
              Number(seconds)
            );
          }
        },
        // 12-hour format without seconds: DD-MM-YYYY HH:MM AM/PM
        {
          regex: /^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{1,2})\s+(AM|PM)$/i,
          parse: (match) => {
            const [, day, month, year, hours, minutes, meridian] = match;
            let hour24 = Number(hours);
            
            if (meridian.toUpperCase() === "PM" && hour24 !== 12) {
              hour24 += 12;
            } else if (meridian.toUpperCase() === "AM" && hour24 === 12) {
              hour24 = 0;
            }

            return new Date(
              Number(year),
              Number(month) - 1,
              Number(day),
              hour24,
              Number(minutes)
            );
          }
        },
        // Excel might also return numbers (serial dates)
        {
          regex: /^\d+(\.\d+)?$/,
          parse: (match) => {
            const serial = Number(match[0]);
            // Excel serial date conversion
            const excelEpoch = new Date(1899, 11, 30);
            return new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
          }
        }
      ];

      for (const format of formats) {
        const match = trimmed.match(format.regex);
        if (match) {
          try {
            const date = format.parse(match);
            if (!isNaN(date.getTime())) {
              // console.log(`✅ Parsed "${trimmed}" -> ${date}`);
              return date;
            }
          } catch (e) {
            console.log(`❌ Parse error for "${trimmed}":`, e.message);
          }
        }
      }

      console.log(`❌ No format matched for: "${trimmed}"`);
      return null;
    };

    let successCount = 0;
    let errorCount = 0;

    for (const [index, row] of data.entries()) {
      try {
        // console.log(`\n--- Processing Row ${index + 1} ---`);

        // Debug: Show raw values first
        // console.log(`Raw TICKET GEN: "${row["TICKET GEN DATE & TIME"]}" (${typeof row["TICKET GEN DATE & TIME"]})`);
        // console.log(`Raw Material Ack: "${row["Material Ack Date & TIME"]}" (${typeof row["Material Ack Date & TIME"]})`);

        // Parse required dates
        const ticketGenDateTime = parseCustomDate(row["TICKET GEN DATE & TIME"]);
        const materialAckDateTime = parseCustomDate(row["Material Ack Date & TIME"]);

        // Check if required dates are present
        if (!ticketGenDateTime) {
          console.error(`Row ${index + 1}: Failed to parse ticketGenDateTime`);
          errorCount++;
          continue;
        }

        if (!materialAckDateTime) {
          console.error(`Row ${index + 1}: Failed to parse materialAckDateTime`);
          errorCount++;
          continue;
        }

        await db.jobOrder.create({
          data: {
            orgCode: String(row["ORG CODE"] || "").trim(),
            ticketNo: String(row["TICKET NO"] || "").trim(),
            jobOrderNo: String(row["Job Order NO"] || "").trim(),
            printedBy: String(row["IV PRINTED BY"] || "").trim(),
            jobStatus: String(row["JOB STATUS"] || "").trim(),
            ticketGenDateTime: ticketGenDateTime,
            originalTicketGenDateTime: parseCustomDate(
              row["ORGINAL TICKET GENERATE  DATE & TIME"]
            ),
            jobPrintDateTime: parseCustomDate(row["1ST JOB PRINT DATE &TIME"]),
            materialIssueDateTime: parseCustomDate(
              row["LAST MATERIAL ISSUE DATE & TIME"]
            ),
            materialDeliveredDateTime: parseCustomDate(
              row["Material Delivered Date & TIME"]
            ),
            materialAckDateTime: materialAckDateTime,
            ticketStatus: String(row["TIcket Status"] || "").trim(),
            remarks: row["Remarks"] ? String(row["Remarks"]).trim() : null,
            ospJobs: row["Osp Jobs"] ? String(row["Osp Jobs"]).trim() : null,
            gapTicketToPrint:
              parseFloat(
                row["Total gap - Ticket Generation to Ticket Print by RMS (Hrs)"]
              ) || null,
            gapIssueToDelivery:
              parseFloat(row["Total gap -Mat Issue to Mat Deliver (Hrs)"]) || null,
            gapDeliveryToAck:
              parseFloat(
                row["Total gap -Mat Deliver to Mat Acknowledgement (Hrs)"]
              ) || null,
            gapTicketToAck:
              parseFloat(
                row["Total gap - Ticket Generation to Mat Acknowledgement  (Hrs)"]
              ) || null,
            gapTicketToDelivery:
              parseFloat(row["Total gap - Ticket Generation to Mat del(Hrs)"]) || null,
            agingBucket: row['Aging Bucket :"Performance category']
              ? String(row['Aging Bucket :"Performance category']).trim()
              : null,
          },
        });

        // console.log(`✅ Row ${index + 1} inserted successfully`);
        // console.log(`   Ticket Gen Time: ${ticketGenDateTime}`);
        // console.log(`   Material Ack Time: ${materialAckDateTime}`);
        successCount++;

      } catch (rowError) {
        console.error(`❌ Error processing row ${index + 1}:`, rowError.message);
        errorCount++;
      }
    }

    res.status(200).json({
      message: "✅ Database seeding completed",
      success: successCount,
      errors: errorCount,
      total: data.length,
    });

  } catch (error) {
    console.error("❌ Seeding Error:", error.message);
    res.status(500).json({ 
      error: "Failed to seed data", 
      details: error.message 
    });
  }
};

const langChainOutput=async(req,res)=>{
  const { naturalQuery } = req.body;

  const ans =await askGemini(naturalQuery);

  return res.status(200).json({
    message:"output fetched succesfully",
    data:ans
  })
}
export { getSqlQuery, seedDb ,langChainOutput};
