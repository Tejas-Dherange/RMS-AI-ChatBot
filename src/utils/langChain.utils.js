import dotenv from "dotenv";
dotenv.config();

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import db from "../libs/db.js";

const schema = `
model JobOrder {
  id                        Int      @id @default(autoincrement())
  orgCode                   String   // Organization code (e.g., "C3M", "C3V")
  ticketNo                  String   // Unique ticket number format: ORG-MONTH-NUMBER
  jobOrderNo                String   // Job order reference number
  printedBy                 String   // Employee who printed the job
  jobStatus                 String   // Status: "Open", "Closed", "In Progress", etc.
  ticketGenDateTime         DateTime // When ticket was first generated
  originalTicketGenDateTime DateTime // Original generation time
  jobPrintDateTime          DateTime // When job was printed
  gapTicketToPrint          Float?   // Hours between ticket generation and printing
  materialIssueDateTime     DateTime // When materials were issued
  materialDeliveredDateTime DateTime // When materials were delivered
  gapIssueToDelivery        Float?   // Hours between issue and delivery
  materialAckDateTime       DateTime // When delivery was acknowledged
  gapDeliveryToAck          Float?   // Hours between delivery and acknowledgment
  gapTicketToAck            Float?   // Total hours from ticket to acknowledgment
  ticketStatus              String   // Ticket status: "OPEN", "CLOSE", etc.
  remarks                   String?  // Additional remarks
  ospJobs                   String?  // OSP (Outside Processing) jobs indicator
  gapTicketToDelivery       Float?   // Hours from ticket to delivery
  agingBucket               String?  // Time categorization: "LESS THAN 4 HOURS", "MORE THAN 4 HOURS"
  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt
}

Common field values:
- orgCode: C3M, C3V, etc.
- jobStatus: Open, Closed, In Progress, Pending
- ticketStatus: OPEN, CLOSE
- agingBucket: "LESS THAN 4 HOURS", "MORE THAN 4 HOURS"
- ospJobs: "OSP JOBS" or null
`;

const parser = StructuredOutputParser.fromNamesAndDescriptions({
  query_type: "Type of query: 'database' for data queries, 'general' for explanations, 'analysis' for insights",
  is_prisma: "true or false — whether a Prisma database query is needed",
  prisma_code: "Prisma query object as JSON string if database query needed",
  prisma_method: "Prisma method: findMany, findFirst, findUnique, aggregate, groupBy, count",
  chat_response: "User-friendly response with __placeholders__ for dynamic data",
  explanation: "Additional context or explanation about the data/process"
});

// Comprehensive prompt template
const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are an AI assistant for a Resource Management System (RMS) that helps users understand job orders, tickets, and workflow processes.

Database Schema:
{schema}

🔐 ACCESS RESTRICTIONS:
You have **read-only** access to the database.
You are strictly **not allowed to create, update, delete, or modify** any data.
Use only the following Prisma operations:
- findMany
- findFirst
- count
- groupBy
- aggregate

❌ Do not use: create, update, delete, upsert, or executeRaw

You can handle three types of queries:
1. DATABASE QUERIES - When users ask for specific data
2. GENERAL QUESTIONS - When users ask about processes, definitions, or explanations
3. ANALYSIS REQUESTS - When users want insights, trends, or summaries

PRISMA QUERY EXAMPLES:

For findMany (get multiple records):
{{"where": {{"jobStatus": "Closed"}}, "take": 10}}

For groupBy (group and count):
{{"by": ["orgCode"], "_count": {{"_all": true}}}}

For aggregate (calculations):
{{"_count": {{"_all": true}}, "_avg": {{"gapTicketToAck": true}}}}

For count (simple counting):
{{"where": {{"jobStatus": "Open"}}}}

For complex filtering:
{{"where": {{"AND": [{{"jobStatus": "Closed"}}, {{"orgCode": "C3M"}}]}}}}

For date filtering:
{{"where": {{"ticketGenDateTime": {{"gte": "2025-04-01T00:00:00.000Z"}}}}}}

RESPONSE GUIDELINES:
- For data queries: Generate appropriate Prisma query and user-friendly response
- For general questions: Provide explanations without database queries
- Use __placeholders__ like __count__, __orgCode__, __averageTime__ for dynamic values
- Be conversational and helpful
- If query is ambiguous, make reasonable assumptions

Format:
{format_instructions}`
  ],
  ["human", "{input}"],
]);

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash",
  maxOutputTokens: 3000,
  temperature: 0.1,
  apiKey: process.env.GEMINI_API_KEY,
});

export async function askGemini(userQuery) {
  try {
    // console.log("User Query:", userQuery);
    
    // Create the chain
    const chain = prompt.pipe(model).pipe(parser);
    
    // Get AI response
    const parsed = await chain.invoke({
      input: userQuery,
      schema,
      format_instructions: parser.getFormatInstructions(),
    });

    console.log("Parsed Response:", parsed);

    // Handle different query types
    if (parsed.query_type === 'general' || !parsed.is_prisma) {
      return {
        type: 'general',
        response: parsed.chat_response,
        explanation: parsed.explanation,
        rows: [],
        sql: null,
        prisma_method: "none"
      };
    }

    // Handle database queries
    const prismaQueryObject = JSON.parse(parsed.prisma_code);
    console.log("Generated Prisma Query:", JSON.stringify(prismaQueryObject, null, 2));
    
    let rows = [];
    let processedData = {};

    // Fix common groupBy issues
    if (parsed.prisma_method === "groupBy" && prismaQueryObject.groupBy) {
      prismaQueryObject.by = prismaQueryObject.groupBy;
      delete prismaQueryObject.groupBy;
      if (prismaQueryObject.select) {
        delete prismaQueryObject.select;
      }
    }

    // Execute appropriate Prisma method
    switch (parsed.prisma_method) {
      case "findMany":
        rows = await db.jobOrder.findMany(prismaQueryObject);
        processedData.count = rows.length;
        break;
      
      case "groupBy":
        rows = await db.jobOrder.groupBy(prismaQueryObject);
        processedData.groups = rows.length;
        break;
      
      case "aggregate":
        const aggregateResult = await db.jobOrder.aggregate(prismaQueryObject);
        rows = [aggregateResult];
        processedData = { ...aggregateResult };
        break;
      
      case "count":
        const count = await db.jobOrder.count(prismaQueryObject);
        rows = [];
        processedData.count = count;
        break;
      
      case "findFirst":
        const firstResult = await db.jobOrder.findFirst(prismaQueryObject);
        rows = firstResult ? [firstResult] : [];
        processedData.found = !!firstResult;
        break;
      
      case "findUnique":
        const uniqueResult = await db.jobOrder.findUnique(prismaQueryObject);
        rows = uniqueResult ? [uniqueResult] : [];
        processedData.found = !!uniqueResult;
        break;
      
      default:
        throw new Error("Unsupported Prisma method: " + parsed.prisma_method);
    }

    // Enhanced placeholder replacement
    let summary = parsed.chat_response;
    
    // Replace common placeholders
    summary = summary.replace(/__count__/g, processedData.count || rows.length || 0);
    summary = summary.replace(/__total__/g, processedData.count || rows.length || 0);
    
    // Replace aggregate placeholders
    if (processedData._avg) {
      Object.keys(processedData._avg).forEach(key => {
        const value = processedData._avg[key];
        summary = summary.replace(new RegExp(`__avg_${key}__`, 'g'), value ? value.toFixed(2) : 'N/A');
        summary = summary.replace(new RegExp(`__average_${key}__`, 'g'), value ? value.toFixed(2) : 'N/A');
      });
    }

    if (processedData._sum) {
      Object.keys(processedData._sum).forEach(key => {
        summary = summary.replace(new RegExp(`__sum_${key}__`, 'g'), processedData._sum[key] || 0);
      });
    }

    if (processedData._max) {
      Object.keys(processedData._max).forEach(key => {
        summary = summary.replace(new RegExp(`__max_${key}__`, 'g'), processedData._max[key] || 'N/A');
      });
    }

    if (processedData._min) {
      Object.keys(processedData._min).forEach(key => {
        summary = summary.replace(new RegExp(`__min_${key}__`, 'g'), processedData._min[key] || 'N/A');
      });
    }

    // Replace field-based placeholders from first row
    if (rows.length > 0 && rows[0]) {
      Object.keys(rows[0]).forEach(key => {
        const value = rows[0][key];
        summary = summary.replace(new RegExp(`__${key}__`, 'g'), value || 'N/A');
      });
    }

    // Replace any remaining placeholders
    summary = summary.replace(/__([a-zA-Z0-9_]+)__/g, (match, key) => {
      return processedData[key] || 'N/A';
    });

    return {
      type: 'database',
      response: summary,
      explanation: parsed.explanation,
      sql: parsed.prisma_code,
      rows: rows.slice(0, 50), // Limit rows for performance
      total_rows: rows.length,
      prisma_method: parsed.prisma_method,
      query_type: parsed.query_type
    };

  } catch (err) {
    console.error("RMS Chatbot error:", err);
    
    // Provide helpful error response
    return {
      type: 'error',
      response: "I encountered an issue processing your request. Could you please rephrase your question or try asking about specific job orders, tickets, or organizational data?",
      explanation: "The system had trouble understanding or executing your query.",
      error: err.message,
      rows: [],
      sql: null,
      prisma_method: "error"
    };
  }
}

// Utility function to get data insights
export async function getRMSInsights() {
  try {
    const insights = await Promise.all([
      db.jobOrder.count(),
      db.jobOrder.count({ where: { jobStatus: 'Open' } }),
      db.jobOrder.count({ where: { jobStatus: 'Closed' } }),
      db.jobOrder.groupBy({
        by: ['orgCode'],
        _count: { _all: true }
      }),
      db.jobOrder.aggregate({
        _avg: { gapTicketToAck: true },
        _max: { gapTicketToAck: true },
        _min: { gapTicketToAck: true }
      })
    ]);

    return {
      totalJobs: insights[0],
      openJobs: insights[1],
      closedJobs: insights[2],
      orgBreakdown: insights[3],
      avgProcessingTime: insights[4]
    };
  } catch (error) {
    console.error("Error getting insights:", error);
    return null;
  }
}

// Sample questions the chatbot can handle:
export const sampleQuestions = [
  // Data Queries
  "How many job orders are currently open?",
  "Show me all tickets from organization C3M",
  "What's the average processing time for job orders?",
  "List recent closed tickets",
  "Which organization has the most job orders?",
  
  // Analysis Queries
  "Show me jobs that took more than 4 hours to complete",
  "What's the trend in job processing times?",
  "Which employees are most productive?",
  "Analyze OSP jobs performance",
  
  // General Questions
  "What is a job order?",
  "Explain the ticket workflow process",
  "What does gap time mean?",
  "How is aging bucket calculated?",
  "What are OSP jobs?"
];