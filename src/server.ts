/**
 * Simple Transcriptor - Express Server
 * Main application entry point with file upload handling and API endpoints
 */

import express from "express";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import {
  APIResponse,
  TranscriptionSession,
  HealthCheckResponse,
  TranscribeRequest,
} from "./types";
import { SessionManager } from "./services/sessionManager";
import { TranscriptionService } from "./services/transcriptionService";
import { AudioExtractionService } from "./services/audioExtractionService";
import { JBADetectionService } from "./services/jbaDetectionService";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Validate required environment variables
if (!process.env.ASSEMBLYAI_API_KEY) {
  console.error("ASSEMBLYAI_API_KEY environment variable is required");
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("frontend/dist"));

// Ensure required directories exist
const requiredDirectories = ["uploads", "videos", "data", "dist"];
requiredDirectories.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Initialize services
const sessionManager = new SessionManager();
const transcriptionService = new TranscriptionService();
const audioExtractionService = new AudioExtractionService();
const jbaDetectionService = new JBADetectionService();

// Configure Multer for file uploads (4.5GB limit)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `${uniqueId}${extension}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 4.5 * 1024 * 1024 * 1024, // 4.5GB in bytes
  },
  fileFilter: (req, file, cb) => {
    // Check file types
    const allowedTypes = [
      "video/mp4",
      "video/quicktime", // MOV
      "video/x-msvideo", // AVI
      "audio/mpeg", // MP3
      "audio/wav",
      "audio/mp4", // M4A
      "audio/aac",
      "audio/ogg",
      "video/webm",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Unsupported file type: ${file.mimetype}. Supported formats: MP4, MOV, AVI, MP3, WAV, M4A, AAC, OGG, WEBM`
        )
      );
    }
  },
});

// API Routes

/**
 * Health check endpoint
 */
app.get("/api/health", async (req, res) => {
  try {
    // Check AssemblyAI service health
    const assemblyHealth = await transcriptionService.getServiceHealth();

    // Check session storage integrity
    const sessionValidation = sessionManager.validateSessions();

    const healthCheck: HealthCheckResponse = {
      status:
        assemblyHealth.healthy && sessionValidation.valid ? "OK" : "ERROR",
      timestamp: new Date().toISOString(),
      services: {
        assemblyai: assemblyHealth.healthy,
        fileSystem:
          fs.existsSync("uploads") &&
          fs.existsSync("videos") &&
          fs.existsSync("data"),
        sessions: sessionValidation.valid,
      },
    };

    // Add detailed information if requested
    if (req.query.detailed === "true") {
      (healthCheck as any).details = {
        assemblyai: assemblyHealth.details,
        sessions: sessionValidation.issues,
        sessionCount: sessionManager.getAllSessions().length,
      };
    }

    const statusCode = healthCheck.status === "OK" ? 200 : 503;
    res.status(statusCode).json(healthCheck);
  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({
      status: "ERROR",
      timestamp: new Date().toISOString(),
      services: {
        assemblyai: false,
        fileSystem: false,
        sessions: false,
      },
    });
  }
});

/**
 * Upload file and start transcription (original endpoint)
 */
app.post("/api/transcribe", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      } as APIResponse);
    }

    const sessionId = uuidv4();
    const originalFilename = req.file.originalname;
    const uploadedFilePath = req.file.path;

    console.log(`New transcription session: ${sessionId}`);
    console.log(`File: ${originalFilename} (${req.file.size} bytes)`);

    // Validate file before processing
    const validation = transcriptionService.validateFile(
      uploadedFilePath,
      req.file.mimetype,
      req.file.size
    );

    if (!validation.valid) {
      // Clean up uploaded file
      fs.unlinkSync(uploadedFilePath);
      return res.status(400).json({
        success: false,
        error: validation.error,
      } as APIResponse);
    }

    // Create permanent copy in videos directory
    const videoId = uuidv4();
    const extension = path.extname(originalFilename);
    const permanentPath = path.join("videos", `${videoId}${extension}`);

    // Copy file to permanent storage
    fs.copyFileSync(uploadedFilePath, permanentPath);

    // Create session record
    const session: TranscriptionSession = {
      id: sessionId,
      filename: originalFilename,
      uploadTimestamp: new Date().toISOString(),
      status: "queued",
      videoUrl: `/api/video/${videoId}`,
    };

    // Save session to storage
    sessionManager.createSession(session);

    // Start transcription process
    const transcribeRequest: TranscribeRequest = {
      sessionId: sessionId,
      filename: originalFilename,
      filePath: permanentPath,
      contentType: req.file.mimetype,
      size: req.file.size,
    };

    // Start transcription in background
    transcriptionService
      .startTranscription(transcribeRequest)
      .then((transcriptionId) => {
        // Update session with AssemblyAI ID
        sessionManager.updateSession(sessionId, {
          assemblyaiId: transcriptionId,
          status: "processing",
        });

        // Start polling for results in background
        transcriptionService
          .pollTranscriptionStatus(transcriptionId, (status) => {
            sessionManager.updateSession(sessionId, { status: status as any });
          })
          .then(async (results) => {
            // Transcription completed successfully
            sessionManager.updateSession(sessionId, {
              status: "completed",
              transcriptionResults: results,
            });

            // Automatically trigger JBA detection if available
            if (jbaDetectionService.isAvailable()) {
              try {
                console.log(
                  `🏛️ Starting automatic JBA detection for session ${sessionId}...`
                );
                const jbaResults = await jbaDetectionService.detectJBACodes(
                  results
                );

                sessionManager.updateSession(sessionId, {
                  jbaResults: jbaResults.codes,
                  expectedCodeCount: jbaResults.expectedCount?.count,
                });

                console.log(
                  `🏛️ Automatic JBA detection completed: ${jbaResults.codes.length} codes found`
                );
              } catch (error) {
                console.warn(
                  `⚠️ Automatic JBA detection failed for session ${sessionId}:`,
                  error
                );
                // Don't fail the whole transcription if JBA detection fails
              }
            } else {
              console.log(
                `⚠️ JBA detection not available - skipping automatic detection`
              );
            }
          })
          .catch((error) => {
            console.error(
              `Transcription failed for session ${sessionId}:`,
              error
            );
            sessionManager.updateSession(sessionId, {
              status: "error",
              errorMessage: error.message,
            });
          });
      })
      .catch((error) => {
        console.error(
          `Failed to start transcription for session ${sessionId}:`,
          error
        );
        sessionManager.updateSession(sessionId, {
          status: "error",
          errorMessage: error.message,
        });
      })
      .finally(() => {
        // Clean up temporary uploaded file
        transcriptionService.cleanupTemporaryFile(uploadedFilePath);
      });

    res.json({
      success: true,
      data: {
        sessionId: sessionId,
        message:
          "Transcription started. Check status with /api/transcription/{sessionId}",
      },
    } as APIResponse);
  } catch (error) {
    console.error("Upload error:", error);

    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          success: false,
          error: "File too large. Maximum size is 4.5GB.",
        } as APIResponse);
      }
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    } as APIResponse);
  }
});

/**
 * Upload file with audio extraction option and start transcription
 */
app.post(
  "/api/transcribe-with-audio",
  upload.single("video"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded",
        } as APIResponse);
      }

      const extractAudio = req.body.extractAudio === "true";
      const sessionId = uuidv4();
      const originalFilename = req.file.originalname;
      const uploadedFilePath = req.file.path;

      console.log(`New transcription session: ${sessionId}`);
      console.log(`File: ${originalFilename} (${req.file.size} bytes)`);
      console.log(`Extract audio: ${extractAudio}`);

      // Validate file before processing
      const validation = transcriptionService.validateFile(
        uploadedFilePath,
        req.file.mimetype,
        req.file.size
      );

      if (!validation.valid) {
        // Clean up uploaded file
        fs.unlinkSync(uploadedFilePath);
        return res.status(400).json({
          success: false,
          error: validation.error,
        } as APIResponse);
      }

      // Create permanent copy in videos directory
      const videoId = uuidv4();
      const extension = path.extname(originalFilename);
      const permanentPath = path.join("videos", `${videoId}${extension}`);

      // Copy file to permanent storage
      fs.copyFileSync(uploadedFilePath, permanentPath);

      // Create session record
      const session: TranscriptionSession = {
        id: sessionId,
        filename: originalFilename,
        uploadTimestamp: new Date().toISOString(),
        status: "queued",
        videoUrl: `/api/video/${videoId}`,
      };

      // Save session to storage
      sessionManager.createSession(session);

      // Determine if we should extract audio
      let fileToTranscribe = permanentPath;
      let extractionUsed = false;

      if (
        extractAudio &&
        audioExtractionService.needsAudioExtraction(
          permanentPath,
          req.file.mimetype
        )
      ) {
        try {
          console.log(`🎵 Extracting audio for better performance...`);

          // Choose optimal format based on file size
          const fileSize = fs.statSync(permanentPath).size;
          const optimalFormat =
            audioExtractionService.getOptimalFormat(fileSize);
          const quality = fileSize > 500 * 1024 * 1024 ? "medium" : "high";

          console.log(
            `📊 Using ${optimalFormat} format with ${quality} quality for ${(
              fileSize /
              (1024 * 1024)
            ).toFixed(1)}MB file`
          );

          fileToTranscribe = await audioExtractionService.extractAudio(
            permanentPath,
            {
              format: optimalFormat,
              quality: quality,
            }
          );
          extractionUsed = true;

          // Update session with extraction info
          sessionManager.updateSession(sessionId, {
            status: "processing",
          });

          // Log size reduction
          const originalStats = fs.statSync(permanentPath);
          const audioStats = fs.statSync(fileToTranscribe);
          const reduction =
            ((originalStats.size - audioStats.size) / originalStats.size) * 100;
          console.log(
            `📊 File size reduced by ${reduction.toFixed(1)}% for transcription`
          );
        } catch (error) {
          console.warn(
            `⚠️ Audio extraction failed, using original file:`,
            error
          );
          fileToTranscribe = permanentPath;
          extractionUsed = false;
        }
      }

      // Start transcription process
      const transcribeRequest: TranscribeRequest = {
        sessionId: sessionId,
        filename: originalFilename,
        filePath: fileToTranscribe,
        contentType: extractionUsed
          ? `audio/${path.extname(fileToTranscribe).substring(1)}`
          : req.file.mimetype,
        size: fs.statSync(fileToTranscribe).size,
      };

      // Start transcription in background
      transcriptionService
        .startTranscription(transcribeRequest)
        .then((transcriptionId) => {
          // Update session with AssemblyAI ID
          sessionManager.updateSession(sessionId, {
            assemblyaiId: transcriptionId,
            status: "processing",
          });

          // Start polling for results in background
          transcriptionService
            .pollTranscriptionStatus(transcriptionId, (status) => {
              sessionManager.updateSession(sessionId, {
                status: status as any,
              });
            })
            .then((results) => {
              // Transcription completed successfully
              sessionManager.updateSession(sessionId, {
                status: "completed",
                transcriptionResults: results,
              });
            })
            .catch((error) => {
              console.error(
                `Transcription failed for session ${sessionId}:`,
                error
              );
              sessionManager.updateSession(sessionId, {
                status: "error",
                errorMessage: error.message,
              });
            })
            .finally(() => {
              // Clean up extracted audio file if it was created
              if (extractionUsed && fileToTranscribe !== permanentPath) {
                audioExtractionService.cleanupAudioFile(fileToTranscribe);
              }
            });
        })
        .catch((error) => {
          console.error(
            `Failed to start transcription for session ${sessionId}:`,
            error
          );
          sessionManager.updateSession(sessionId, {
            status: "error",
            errorMessage: error.message,
          });
        })
        .finally(() => {
          // Clean up temporary uploaded file
          transcriptionService.cleanupTemporaryFile(uploadedFilePath);
        });

      res.json({
        success: true,
        data: {
          sessionId: sessionId,
          message:
            "Transcription started. Check status with /api/transcription/{sessionId}",
          audioExtracted: extractionUsed,
        },
      } as APIResponse);
    } catch (error) {
      console.error("Error in transcribe-with-audio endpoint:", error);
      res.status(500).json({
        success: false,
        error: "Failed to process upload",
      } as APIResponse);
    }
  }
);

/**
 * Check FFmpeg availability
 */
app.get("/api/ffmpeg-status", async (req, res) => {
  try {
    const status = await audioExtractionService.validateFFmpeg();
    res.json({
      success: true,
      data: status,
    } as APIResponse);
  } catch (error) {
    console.error("Error checking FFmpeg status:", error);
    res.json({
      success: false,
      data: {
        available: false,
        error: "Could not check FFmpeg status",
      },
    } as APIResponse);
  }
});

/**
 * Check JBA detection service availability
 */
app.get("/api/jba-status", (req, res) => {
  try {
    const status = jbaDetectionService.getStatus();
    res.json({
      success: true,
      data: status,
    } as APIResponse);
  } catch (error) {
    console.error("Error checking JBA status:", error);
    res.json({
      success: false,
      data: {
        available: false,
        error: "Could not check JBA status",
      },
    } as APIResponse);
  }
});

/**
 * Manually trigger JBA detection for a session
 */
app.post("/api/detect-jba/:sessionId", async (req, res) => {
  try {
    const sessionId = req.params.sessionId;

    console.log(`🏛️ Manual JBA detection requested for session: ${sessionId}`);

    // Get session from storage
    const session = sessionManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: "Session not found",
      } as APIResponse);
    }

    if (!session.transcriptionResults) {
      return res.status(400).json({
        success: false,
        error: "No transcription results available for JBA detection",
      } as APIResponse);
    }

    if (!jbaDetectionService.isAvailable()) {
      return res.status(503).json({
        success: false,
        error: "JBA detection service not available - check OPENROUTER_API_KEY",
      } as APIResponse);
    }

    // Trigger JBA detection
    const jbaResults = await jbaDetectionService.detectJBACodes(
      session.transcriptionResults,
      {
        confidenceThreshold: 0.6, // Slightly lower threshold for manual detection
      }
    );

    // Update session with results
    sessionManager.updateSession(sessionId, {
      jbaResults: jbaResults.codes,
      expectedCodeCount: jbaResults.expectedCount?.count,
    });

    console.log(
      `✅ Manual JBA detection completed for session ${sessionId}: ${jbaResults.codes.length} codes found`
    );

    res.json({
      success: true,
      data: {
        sessionId: sessionId,
        jbaResults: jbaResults.codes,
        expectedCodeCount: jbaResults.expectedCount?.count,
        message: `JBA detection completed: ${jbaResults.codes.length} codes found`,
      },
    } as APIResponse);
  } catch (error) {
    console.error("Error in manual JBA detection:", error);
    res.status(500).json({
      success: false,
      error: "JBA detection failed",
    } as APIResponse);
  }
});

/**
 * Get transcription status and results
 */
app.get("/api/transcription/:id", (req, res) => {
  try {
    const sessionId = req.params.id;

    console.log(`📊 Retrieving session: ${sessionId}`);

    // Get session from storage
    const session = sessionManager.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: "Session not found",
      } as APIResponse);
    }

    // Return session data based on status
    const responseData: any = {
      id: session.id,
      filename: session.filename,
      status: session.status,
      uploadTimestamp: session.uploadTimestamp,
      videoUrl: session.videoUrl,
    };

    // Add transcription-specific data if available
    if (session.assemblyaiId) {
      responseData.assemblyaiId = session.assemblyaiId;
    }

    if (session.transcriptionResults) {
      responseData.transcriptionResults = session.transcriptionResults;
    }

    if (session.jbaResults) {
      responseData.jbaResults = session.jbaResults;
    }

    if (session.errorMessage) {
      responseData.errorMessage = session.errorMessage;
    }

    res.json({
      success: true,
      data: responseData,
    } as APIResponse);
  } catch (error) {
    console.error("Error retrieving session:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve session",
    } as APIResponse);
  }
});

/**
 * Get all sessions (recent first)
 */
app.get("/api/sessions", (req, res) => {
  try {
    const limit = req.query.limit
      ? parseInt(req.query.limit as string)
      : undefined;
    const status = req.query.status as
      | TranscriptionSession["status"]
      | undefined;

    let sessions: TranscriptionSession[];

    if (status) {
      sessions = sessionManager.getAllSessions(status);
    } else {
      sessions = sessionManager.getRecentSessions(limit);
    }

    res.json({
      success: true,
      data: {
        sessions: sessions,
        count: sessions.length,
      },
    } as APIResponse);
  } catch (error) {
    console.error("Error retrieving sessions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve sessions",
    } as APIResponse);
  }
});

/**
 * Delete a session
 */
app.delete("/api/sessions/:sessionId", (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const deleted = sessionManager.deleteSession(sessionId);

    if (deleted) {
      res.json({
        success: true,
        message: "Session deleted successfully",
      } as APIResponse);
    } else {
      res.status(404).json({
        success: false,
        error: "Session not found",
      } as APIResponse);
    }
  } catch (error) {
    console.error("Error deleting session:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete session",
    } as APIResponse);
  }
});

/**
 * Get session summary and statistics
 */
app.get("/api/sessions-summary", (req, res) => {
  try {
    const summary = sessionManager.getSessionsSummary();

    res.json({
      success: true,
      data: summary,
    } as APIResponse);
  } catch (error) {
    console.error("Error retrieving sessions summary:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve sessions summary",
    } as APIResponse);
  }
});

/**
 * Stream video with range request support
 */
app.get("/api/video/:videoId", (req, res) => {
  const videoId = req.params.videoId;

  try {
    // Find video file
    const videoDir = "videos";
    const files = fs.readdirSync(videoDir);
    const videoFile = files.find((file) => file.startsWith(videoId));

    if (!videoFile) {
      return res.status(404).json({
        success: false,
        error: "Video not found",
      } as APIResponse);
    }

    const videoPath = path.join(videoDir, videoFile);
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Parse range header
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      // Set appropriate headers for range request
      res.status(206);
      res.set({
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize.toString(),
        "Content-Type": "video/mp4", // TODO: Detect actual content type
      });

      // Create read stream for the requested range
      const stream = fs.createReadStream(videoPath, { start, end });
      stream.pipe(res);
    } else {
      // Send entire file
      res.set({
        "Content-Length": fileSize.toString(),
        "Content-Type": "video/mp4", // TODO: Detect actual content type
      });

      const stream = fs.createReadStream(videoPath);
      stream.pipe(res);
    }
  } catch (error) {
    console.error("Video streaming error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to stream video",
    } as APIResponse);
  }
});

/**
 * Serve main application page
 */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
});

// Error handling middleware
app.use(
  (
    error: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Server error:", error);

    if (error instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        error: `Upload error: ${error.message}`,
      } as APIResponse);
    }

    res.status(500).json({
      success: false,
      error: "Internal server error",
    } as APIResponse);
  }
);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Simple Transcriptor server running on port ${PORT}`);
  console.log(`📁 Upload directory: ${path.resolve("uploads")}`);
  console.log(`🎥 Videos directory: ${path.resolve("videos")}`);
  console.log(`💾 Data directory: ${path.resolve("data")}`);
  console.log(
    `🔑 AssemblyAI API key: ${
      process.env.ASSEMBLYAI_API_KEY ? "configured" : "missing"
    }`
  );
});
