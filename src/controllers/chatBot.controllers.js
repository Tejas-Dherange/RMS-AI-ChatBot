// src/controllers/excelBot.controllers.js
import { GoogleGenAI } from "@google/genai";
import xlsx from "xlsx";
import path from "path";
import { fileURLToPath } from "url";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import _ from "lodash";
import fs from "fs";
import {LRUCache} from "lru-cache";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  MAX_ROWS_IN_MEMORY: 50000,
  MAX_SAMPLE_SIZE: 1000,
  QUERY_CACHE_SIZE: 100,
  QUERY_CACHE_TTL: 1000 * 60 * 15, // 15 minutes
  MAX_RESULT_ROWS: 1000,
  CHUNK_SIZE: 10000
};

// Enhanced data store with metadata
class ExcelDataStore {
  constructor() {
    this.data = null;
    this.headers = [];
    this.filename = "";
    this.metadata = {};
    this.indexes = new Map(); // For indexed columns
    this.queryCache = new LRUCache({
      max: CONFIG.QUERY_CACHE_SIZE,
      ttl: CONFIG.QUERY_CACHE_TTL
    });
  }

  loadData(data, filename) {
    this.data = data;
    this.headers = data.length > 0 ? Object.keys(data[0]) : [];
    this.filename = filename;
    this.metadata = this.analyzeData(data);
    this.buildIndexes();
    this.queryCache.clear();
  }

  analyzeData(data) {
    if (!data || data.length === 0) return {};

    const sample = data.slice(0, Math.min(1000, data.length));
    const metadata = {
      rowCount: data.length,
      columnCount: this.headers.length,
      columnTypes: {},
      uniqueValues: {},
      statistics: {}
    };

    this.headers.forEach(header => {
      const values = sample.map(row => row[header]).filter(val => val != null && val !== '');
      
      // Determine data type
      const numericValues = values.filter(val => !isNaN(val) && !isNaN(parseFloat(val)));
      const dateValues = values.filter(val => this.isDateString(val));
      
      if (numericValues.length > values.length * 0.8) {
        metadata.columnTypes[header] = 'number';
        const nums = numericValues.map(v => parseFloat(v));
        metadata.statistics[header] = {
          min: Math.min(...nums),
          max: Math.max(...nums),
          avg: nums.reduce((a, b) => a + b, 0) / nums.length
        };
      } else if (dateValues.length > values.length * 0.5) {
        metadata.columnTypes[header] = 'date';
      } else {
        metadata.columnTypes[header] = 'string';
      }

      // Store unique values for categorical columns
      const uniqueVals = [...new Set(values)];
      if (uniqueVals.length <= 50) {
        metadata.uniqueValues[header] = uniqueVals;
      }
    });

    return metadata;
  }

  buildIndexes() {
    // Build indexes for commonly filtered columns
    const categoricalColumns = Object.entries(this.metadata.uniqueValues)
      .filter(([_, values]) => values.length <= 20)
      .map(([col, _]) => col);

    categoricalColumns.forEach(column => {
      const index = new Map();
      this.data.forEach((row, rowIndex) => {
        const value = row[column];
        if (!index.has(value)) {
          index.set(value, []);
        }
        index.get(value).push(rowIndex);
      });
      this.indexes.set(column, index);
    });
  }

  isDateString(str) {
    return !isNaN(Date.parse(str)) && isNaN(parseFloat(str));
  }

  getCachedQuery(key) {
    return this.queryCache.get(key);
  }

  setCachedQuery(key, result) {
    this.queryCache.set(key, result);
  }

  getIndexedRows(column, value) {
    const index = this.indexes.get(column);
    return index ? index.get(value) || [] : null;
  }
}

// Global data store
const dataStore = new ExcelDataStore();

// Optimized file loading with streaming for large files
const loadExcelFile = async (req, res) => {
  try {
    const filePath = path.join(__dirname, "../../Job-Order-Performance-Report .xlsx");
    
    // Check file size first]
    const stats = fs.statSync(filePath);
    const fileSizeMB = stats.size / (1024 * 1024);
    
    if (fileSizeMB > 100) {
      return res.status(413).json({
        success: false,
        error: "File too large. Maximum size is 100MB."
      });
    }

    // Read Excel file with optimized options
    const workbook = xlsx.readFile(filePath, {
      cellDates: true,
      cellNF: false,
      cellText: false
    });
    
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with optimized settings
    const data = xlsx.utils.sheet_to_json(sheet, { 
      raw: false,
      defval: '',
      blankrows: false // Skip blank rows
    });
    
    // Validate data size
    if (data.length > CONFIG.MAX_ROWS_IN_MEMORY) {
      return res.status(413).json({
        success: false,
        error: `Dataset too large. Maximum ${CONFIG.MAX_ROWS_IN_MEMORY} rows supported.`
      });
    }

    dataStore.loadData(data, "Job-Order-Performance-Report.xlsx");
    
    console.log(`Excel file loaded: ${data.length} rows, ${dataStore.headers.length} columns`);
    
    res.status(200).json({
      success: true,
      message: "Excel file loaded successfully",
      rowCount: data.length,
      columns: dataStore.headers,
      columnTypes: dataStore.metadata.columnTypes,
      filename: dataStore.filename,
      sampleData: data.slice(0, 3),
      fileSize: `${fileSizeMB.toFixed(2)}MB`
    });
    
  } catch (error) {
    console.error("Error loading Excel file:", error);
    res.status(500).json({
      success: false,
      error: "Failed to load Excel file",
      details: error.message
    });
  }
};

// Optimized file upload with validation
const uploadExcelFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No Excel file uploaded"
      });
    }

    // Validate file type
    const allowedTypes = ['.xlsx', '.xls', '.csv'];
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    if (!allowedTypes.includes(fileExt)) {
      return res.status(400).json({
        success: false,
        error: "Invalid file type. Only Excel (.xlsx, .xls) and CSV files are supported."
      });
    }
    
    // Read file based on type
    let data;
    if (fileExt === '.csv') {
      const csvData = await fs.readFileSync(req.file.path, 'utf8');
      data = await parseCsvData(csvData);
    } else {
      const workbook = xlsx.readFile(req.file.path, {
        cellDates: true,
        cellNF: false,
        cellText: false
      });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      data = xlsx.utils.sheet_to_json(sheet, { 
        raw: false,
        defval: '',
        blankrows: false
      });
    }
    
    // Validate data size
    if (data.length > CONFIG.MAX_ROWS_IN_MEMORY) {
      return res.status(413).json({
        success: false,
        error: `Dataset too large. Maximum ${CONFIG.MAX_ROWS_IN_MEMORY} rows supported.`
      });
    }

    dataStore.loadData(data, req.file.originalname);
    
    // Clean up uploaded file
    await fs.unlinkSync(req.file.path);
    
    res.status(200).json({
      success: true,
      message: "Excel file uploaded and processed successfully",
      rowCount: data.length,
      columns: dataStore.headers,
      columnTypes: dataStore.metadata.columnTypes,
      filename: dataStore.filename,
      sampleData: data.slice(0, 3)
    });
    
  } catch (error) {
    console.error("Error processing uploaded Excel file:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process Excel file",
      details: error.message
    });
  }
};

// Optimized question processing with caching
const askExcelQuestion = async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Question is required"
      });
    }
    
    if (!dataStore.data || dataStore.data.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No Excel data loaded. Please load an Excel file first."
      });
    }
    
    // Check cache first
    const cacheKey = `${question.toLowerCase().trim()}_${dataStore.filename}`;
    const cached = dataStore.getCachedQuery(cacheKey);
    if (cached) {
      return res.status(200).json({
        success: true,
        data: { ...cached, fromCache: true }
      });
    }
    
    const result = await processExcelQuestion(question);
    
    // Cache the result
    dataStore.setCachedQuery(cacheKey, result);
    
    res.status(200).json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error("Error processing Excel question:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process question",
      details: error.message
    });
  }
};

// Optimized question processing
async function processExcelQuestion(userQuestion) {
  try {
    const schemaDescription = createOptimizedSchema();
    
    const parser = StructuredOutputParser.fromNamesAndDescriptions({
      query_type: "Type of analysis: 'filter', 'aggregate', 'groupby', 'sort', 'general'",
      operation: "What operation to perform on the data",
      filters: "JSON string of filters to apply",
      groupBy: "Fields to group by (if applicable)",
      aggregations: "What to calculate (count, sum, average, etc.)",
      sortBy: "Field to sort by (if applicable)",
      response: "Human-friendly response with __placeholders__ for dynamic data",
      explanation: "Brief explanation of what the analysis shows"
    });
    
    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        `You are an AI assistant that analyzes Excel data efficiently.

Current Excel File: {filename}
Total Rows: {rowCount}
Columns: {headers}

Column Types: {columnTypes}
Available Unique Values: {uniqueValues}

Sample Data (first 2 rows):
{sampleData}

OPTIMIZATION GUIDELINES:
- Use indexed columns when possible: {indexedColumns}
- For large datasets, prefer filtering before grouping
- Use specific filters to reduce processing time
- Leverage pre-calculated statistics when available

{format_instructions}`
      ],
      ["human", "{input}"],
    ]);
    
    const model = new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash",
      maxOutputTokens: 2000,
      temperature: 0.1,
      apiKey: process.env.GEMINI_API_KEY,
    });
    
    const chain = prompt.pipe(model).pipe(parser);
    
    const parsed = await chain.invoke({
      input: userQuestion,
      filename: dataStore.filename,
      rowCount: dataStore.data.length,
      headers: dataStore.headers.join(", "),
      columnTypes: JSON.stringify(dataStore.metadata.columnTypes),
      uniqueValues: JSON.stringify(dataStore.metadata.uniqueValues),
      indexedColumns: Array.from(dataStore.indexes.keys()).join(", "),
      sampleData: JSON.stringify(dataStore.data.slice(0, 2), null, 2),
      format_instructions: parser.getFormatInstructions(),
    });
    
    // Execute optimized analysis
    const analysisResult = await executeOptimizedAnalysis(parsed);
    
    // Always include the filtered data in the response for the frontend
    return {
      type: parsed.query_type,
      question: userQuestion,
      response: replacePlaceholders(parsed.response, analysisResult),
      explanation: parsed.explanation,
      operation: parsed.operation,
      data: analysisResult.data, // <-- this is the filtered/grouped rows
      rows: analysisResult.data, // <-- add this for explicitness (frontend expects rows)
      summary: analysisResult.summary,
      filename: dataStore.filename,
      rowsAnalyzed: dataStore.data.length,
      processingTime: analysisResult.processingTime
    };
    
  } catch (error) {
    console.error("Error in processExcelQuestion:", error);
    return {
      type: 'error',
      response: "I encountered an issue analyzing the Excel data. Please try rephrasing your question.",
      error: error.message,
      data: [],
      filename: dataStore.filename
    };
  }
}

// Optimized schema creation
function createOptimizedSchema() {
  const schema = dataStore.headers.map(header => {
    const type = dataStore.metadata.columnTypes[header] || 'string';
    const stats = dataStore.metadata.statistics[header];
    const uniqueVals = dataStore.metadata.uniqueValues[header];
    
    let description = `${header} (${type})`;
    
    if (stats) {
      description += ` - Range: ${stats.min} to ${stats.max}, Avg: ${stats.avg.toFixed(2)}`;
    } else if (uniqueVals) {
      description += ` - Values: ${uniqueVals.slice(0, 5).join(', ')}${uniqueVals.length > 5 ? '...' : ''}`;
    }
    
    return description;
  }).join('\n');
  
  return schema;
}

// Optimized analysis execution
async function executeOptimizedAnalysis(parsed) {
  const startTime = Date.now();
  
  try {
    let result = dataStore.data;
    let summary = {};
    
    // Optimize filter execution using indexes
    if (parsed.filters && parsed.filters !== "{}") {
      const filters = JSON.parse(parsed.filters);
      result = await filterDataOptimized(result, filters);
      summary.filtered = true;
      summary.filteredCount = result.length;
    }
    
    // Process in chunks for large datasets
    if (result.length > CONFIG.CHUNK_SIZE) {
      result = await processInChunks(result, parsed);
    } else {
      // Apply other operations
      if (parsed.groupBy && parsed.groupBy !== "none") {
        result = groupDataOptimized(result, parsed.groupBy, parsed.aggregations);
        summary.grouped = true;
        summary.groupCount = result.length;
      }
      
      if (parsed.sortBy && parsed.sortBy !== "none") {
        result = sortDataOptimized(result, parsed.sortBy);
        summary.sorted = true;
      }
      
      if (parsed.aggregations && !summary.grouped) {
        const aggregationResult = calculateAggregationsOptimized(result, parsed.aggregations);
        summary = { ...summary, ...aggregationResult };
      }
    }
    
    // Limit results for performance
    const limitedResult = result.slice(0, CONFIG.MAX_RESULT_ROWS);
    
    return {
      data: limitedResult,
      total: result.length,
      summary: summary,
      originalCount: dataStore.data.length,
      processingTime: Date.now() - startTime
    };
    
  } catch (error) {
    console.error("Error executing optimized analysis:", error);
    return {
      data: [],
      total: 0,
      summary: { error: error.message },
      originalCount: dataStore.data.length,
      processingTime: Date.now() - startTime
    };
  }
}

// Optimized filtering using indexes
async function filterDataOptimized(data, filters) {
  const indexedFilters = {};
  const nonIndexedFilters = {};
  
  // Separate indexed and non-indexed filters
  Object.entries(filters).forEach(([field, condition]) => {
    if (dataStore.indexes.has(field) && typeof condition === 'string') {
      indexedFilters[field] = condition;
    } else {
      nonIndexedFilters[field] = condition;
    }
  });
  
  let result = data;
  
  // Use indexes for simple equality filters
  if (Object.keys(indexedFilters).length > 0) {
    const indexedRowIndices = new Set();
    
    Object.entries(indexedFilters).forEach(([field, value]) => {
      const rowIndices = dataStore.getIndexedRows(field, value);
      if (rowIndices) {
        if (indexedRowIndices.size === 0) {
          rowIndices.forEach(idx => indexedRowIndices.add(idx));
        } else {
          // Intersection for multiple indexed filters
          const intersection = new Set();
          rowIndices.forEach(idx => {
            if (indexedRowIndices.has(idx)) intersection.add(idx);
          });
          indexedRowIndices.clear();
          intersection.forEach(idx => indexedRowIndices.add(idx));
        }
      }
    });
    
    result = Array.from(indexedRowIndices).map(idx => data[idx]);
  }
  
  // Apply non-indexed filters
  if (Object.keys(nonIndexedFilters).length > 0) {
    result = result.filter(row => {
      return Object.entries(nonIndexedFilters).every(([field, condition]) => {
        return evaluateFilterCondition(row[field], condition);
      });
    });
  }
  
  return result;
}

// Helper function to evaluate filter conditions
function evaluateFilterCondition(value, condition) {
  if (typeof condition === 'object' && condition !== null) {
    return Object.entries(condition).every(([op, condValue]) => {
      switch (op) {
        case '$gte': return parseFloat(value) >= parseFloat(condValue);
        case '$lte': return parseFloat(value) <= parseFloat(condValue);
        case '$gt': return parseFloat(value) > parseFloat(condValue);
        case '$lt': return parseFloat(value) < parseFloat(condValue);
        case '$ne': return value != condValue;
        case '$in': return Array.isArray(condValue) && condValue.includes(value);
        case '$contains': return String(value).toLowerCase().includes(String(condValue).toLowerCase());
        default: return value == condValue;
      }
    });
  } else {
    return String(value).toLowerCase() === String(condition).toLowerCase();
  }
}

// Optimized grouping with pre-aggregation
function groupDataOptimized(data, groupByFields, aggregations) {
  const groupByArray = Array.isArray(groupByFields) ? groupByFields : [groupByFields];
  
  // Use lodash for efficient grouping
  const grouped = _.groupBy(data, row => {
    return groupByArray.map(field => row[field]).join('|');
  });
  
  const numericFields = getNumericFields(data[0] || {});
  
  return Object.entries(grouped).map(([key, rows]) => {
    const keyValues = key.split('|');
    const groupResult = {};
    
    // Add group fields
    groupByArray.forEach((field, index) => {
      groupResult[field] = keyValues[index];
    });
    
    // Add count
    groupResult.count = rows.length;
    
    // Calculate aggregations efficiently
    if (aggregations && aggregations !== "count") {
      numericFields.forEach(field => {
        const values = rows.map(row => parseFloat(row[field])).filter(val => !isNaN(val));
        if (values.length > 0) {
          // Use single pass for multiple aggregations
          let sum = 0, min = Infinity, max = -Infinity;
          values.forEach(val => {
            sum += val;
            if (val < min) min = val;
            if (val > max) max = val;
          });
          
          groupResult[`${field}_sum`] = sum;
          groupResult[`${field}_avg`] = sum / values.length;
          groupResult[`${field}_min`] = min;
          groupResult[`${field}_max`] = max;
        }
      });
    }
    
    return groupResult;
  });
}

// Optimized sorting
function sortDataOptimized(data, sortBy) {
  const [field, direction = 'asc'] = sortBy.split(':');
  const isNumeric = dataStore.metadata.columnTypes[field] === 'number';
  
  return [...data].sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];
    
    if (isNumeric) {
      const numA = parseFloat(aVal) || 0;
      const numB = parseFloat(bVal) || 0;
      return direction === 'desc' ? numB - numA : numA - numB;
    }
    
    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();
    
    if (direction === 'desc') {
      return bStr.localeCompare(aStr);
    }
    return aStr.localeCompare(bStr);
  });
}

// Optimized aggregations
function calculateAggregationsOptimized(data, aggregationType) {
  const result = { count: data.length };
  const numericFields = getNumericFields(data[0] || {});
  
  numericFields.forEach(field => {
    const values = data.map(row => parseFloat(row[field])).filter(val => !isNaN(val));
    if (values.length > 0) {
      // Single pass calculation
      let sum = 0, min = Infinity, max = -Infinity;
      values.forEach(val => {
        sum += val;
        if (val < min) min = val;
        if (val > max) max = val;
      });
      
      result[`${field}_sum`] = sum;
      result[`${field}_avg`] = sum / values.length;
      result[`${field}_min`] = min;
      result[`${field}_max`] = max;
    }
  });
  
  return result;
}

// Process large datasets in chunks
async function processInChunks(data, parsed) {
  const chunks = [];
  for (let i = 0; i < data.length; i += CONFIG.CHUNK_SIZE) {
    chunks.push(data.slice(i, i + CONFIG.CHUNK_SIZE));
  }
  
  const results = await Promise.all(chunks.map(async chunk => {
    if (parsed.groupBy && parsed.groupBy !== "none") {
      return groupDataOptimized(chunk, parsed.groupBy, parsed.aggregations);
    }
    return chunk;
  }));
  
  // Merge results
  return results.flat();
}

// Helper functions
function getNumericFields(sampleRow) {
  return Object.keys(sampleRow).filter(key => {
    return dataStore.metadata.columnTypes[key] === 'number';
  });
}

function replacePlaceholders(response, analysisResult) {
  let result = response;
  
  result = result.replace(/__count__/g, analysisResult.summary.filteredCount || analysisResult.total || 0);
  result = result.replace(/__total__/g, analysisResult.total || 0);
  result = result.replace(/__processing_time__/g, `${analysisResult.processingTime}ms`);
  
  Object.entries(analysisResult.summary).forEach(([key, value]) => {
    result = result.replace(new RegExp(`__${key}__`, 'g'), value);
  });
  
  result = result.replace(/__([a-zA-Z0-9_]+)__/g, (match, key) => {
    return analysisResult.summary[key] || 'N/A';
  });
  
  return result;
}

// CSV parsing helper
async function parseCsvData(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.replace(/"/g, '').trim());
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
}

// Get optimized Excel info
const getExcelInfo = async (req, res) => {
  try {
    if (!dataStore.data) {
      return res.status(400).json({
        success: false,
        error: "No Excel file loaded"
      });
    }
    
    res.status(200).json({
      success: true,
      filename: dataStore.filename,
      rowCount: dataStore.data.length,
      columnCount: dataStore.headers.length,
      columns: dataStore.headers,
      columnTypes: dataStore.metadata.columnTypes,
      statistics: dataStore.metadata.statistics,
      uniqueValues: dataStore.metadata.uniqueValues,
      indexedColumns: Array.from(dataStore.indexes.keys()),
      cacheStats: {
        size: dataStore.queryCache.size,
        maxSize: CONFIG.QUERY_CACHE_SIZE
      },
      sampleData: dataStore.data.slice(0, 5)
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get Excel info",
      details: error.message
    });
  }
};

export { 
  loadExcelFile, 
  uploadExcelFile, 
  askExcelQuestion, 
  getExcelInfo,
  processExcelQuestion 
};