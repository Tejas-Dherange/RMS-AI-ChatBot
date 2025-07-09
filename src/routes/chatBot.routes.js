// import express from "express";
// import { getSqlQuery, langChainOutput, seedDb } from "../controllers/chatBot.controllers.js";

// const router = express.Router();

// router.post("/", getSqlQuery);
// router.post("/lang", langChainOutput);
// router.get("/seed", seedDb);

// export default router;
// src/routes/excelBot.routes.js
import express from "express";
import multer from "multer";
import path from "path";
import {
  loadExcelFile,
  uploadExcelFile,
  askExcelQuestion,
  getExcelInfo,
} from "../controllers/chatBot.controllers.js";

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

const fileFilter = (req, file, cb) => {
  // Accept only Excel files
  if (
    file.mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.mimetype === "application/vnd.ms-excel"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only Excel files (.xlsx, .xls) are allowed!"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Routes
router.get("/load", loadExcelFile); // Load default Excel file
router.post("/upload", upload.single("file"), uploadExcelFile); // Upload new Excel file
router.post("/ask", askExcelQuestion); // Ask questions about Excel data
router.get("/info", getExcelInfo); // Get current Excel file info

export default router;
