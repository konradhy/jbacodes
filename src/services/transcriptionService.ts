/**
 * TranscriptionService - AssemblyAI integration for audio/video transcription
 * Handles file uploading, transcription processing, and result retrieval
 */

import { AssemblyAI } from "assemblyai";
import fs from "fs";
import path from "path";
import axios from "axios";
import { AssemblyAIResults, TranscribeRequest } from "../types";

export class TranscriptionService {
  private client: AssemblyAI;
  private maxRetries: number;
  private retryDelay: number;
  private publicBaseUrl?: string;

  constructor() {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      throw new Error("ASSEMBLYAI_API_KEY environment variable is required");
    }

    this.client = new AssemblyAI({
      apiKey: apiKey,
    });

    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second base delay
    this.publicBaseUrl = process.env.PUBLIC_BASE_URL; // For URL-based uploads

    console.log("🎤 TranscriptionService initialized with AssemblyAI");
    if (this.publicBaseUrl) {
      console.log(`🌐 Public URL configured: ${this.publicBaseUrl}`);
    }
  }

  /**
   * Start transcription for a file
   * Uses direct upload for files ≤500MB, URL method for larger files
   */
  public async startTranscription(request: TranscribeRequest): Promise<string> {
    try {
      const fileSizeInMB = request.size / (1024 * 1024);
      const useDirectUpload = fileSizeInMB <= 500;

      console.log(
        `🎯 Starting transcription for ${
          request.filename
        } (${fileSizeInMB.toFixed(1)}MB)`
      );
      console.log(
        `📤 Upload method: ${useDirectUpload ? "direct" : "URL-based"}`
      );

      let transcriptParams: any;

      if (useDirectUpload) {
        // Direct file upload for smaller files
        transcriptParams = {
          audio: request.filePath,
          // Streamlined features - only keep what's essential
          auto_chapters: true,
          word_boost: ["JBA", "J B A", "J.B.A", "J-B-A"], // Boost JBA variations
          boost_param: "high",
        };
      } else {
        // URL-based upload for larger files
        if (!this.publicBaseUrl) {
          throw new Error(
            "PUBLIC_BASE_URL must be configured for files larger than 500MB"
          );
        }

        // Construct public URL for the file
        const videoId = path.basename(
          request.filePath,
          path.extname(request.filePath)
        );
        const publicUrl = `${this.publicBaseUrl}/api/video/${videoId}`;

        transcriptParams = {
          audio_url: publicUrl,
          auto_chapters: true,
          word_boost: ["JBA", "J B A", "J.B.A", "J-B-A"],
          boost_param: "high",
        };

        console.log(`🔗 Using public URL: ${publicUrl}`);
      }

      // Submit transcription with retry logic
      const transcript = await this.submitWithRetry(transcriptParams);

      console.log(`✅ Transcription submitted: ${transcript.id}`);
      return transcript.id;
    } catch (error) {
      console.error("Error starting transcription:", error);
      throw new Error(
        `Failed to start transcription: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get transcription status and results
   */
  public async getTranscriptionResults(
    transcriptionId: string
  ): Promise<AssemblyAIResults> {
    try {
      console.log(`📊 Checking transcription status: ${transcriptionId}`);

      const transcript = await this.client.transcripts.get(transcriptionId);

      // Map AssemblyAI response to our interface
      const results: AssemblyAIResults = {
        id: transcript.id,
        status: transcript.status,
        text: transcript.text || "",
        confidence: transcript.confidence || 0,
        words: transcript.words || [],
        chapters: transcript.chapters || undefined,
      };

      console.log(`📊 Transcription status: ${results.status}`);
      if (results.status === "completed") {
        console.log(`📝 Transcript length: ${results.text.length} characters`);
        console.log(
          `🎯 Confidence score: ${(results.confidence * 100).toFixed(1)}%`
        );
        if (results.chapters) {
          console.log(`📖 Chapters generated: ${results.chapters.length}`);
        }
      }

      return results;
    } catch (error) {
      console.error("Error retrieving transcription results:", error);
      throw new Error(
        `Failed to get transcription results: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Submit transcription request with retry logic for temporary failures
   */
  private async submitWithRetry(params: any): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🔄 Transcription attempt ${attempt}/${this.maxRetries}`);

        const transcript = await this.client.transcripts.submit(params);
        return transcript;
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ Transcription attempt ${attempt} failed:`, error);

        // Check if error is retryable (temporary server issues)
        if (this.isRetryableError(error)) {
          if (attempt < this.maxRetries) {
            const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
            console.log(`⏳ Retrying in ${delay}ms...`);
            await this.sleep(delay);
            continue;
          }
        }

        // If error is not retryable or we've exhausted retries, throw immediately
        throw error;
      }
    }

    throw (
      lastError || new Error("Failed to submit transcription after retries")
    );
  }

  /**
   * Check if an error is retryable (temporary server issues)
   */
  private isRetryableError(error: any): boolean {
    // Retry on 502 (Bad Gateway), 503 (Service Unavailable), 504 (Gateway Timeout)
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      return status === 502 || status === 503 || status === 504;
    }

    // Retry on network/connection errors
    if (
      error.code === "ECONNRESET" ||
      error.code === "ENOTFOUND" ||
      error.code === "ECONNREFUSED"
    ) {
      return true;
    }

    return false;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Poll transcription status until completion
   * Returns the final results when transcription is complete
   */
  public async pollTranscriptionStatus(
    transcriptionId: string,
    onProgress?: (status: string) => void
  ): Promise<AssemblyAIResults> {
    const pollInterval = 5000; // 5 seconds
    const maxPollTime = 30 * 60 * 1000; // 30 minutes max
    const startTime = Date.now();

    console.log(`🔄 Starting transcription polling for: ${transcriptionId}`);

    while (Date.now() - startTime < maxPollTime) {
      try {
        const results = await this.getTranscriptionResults(transcriptionId);

        // Notify progress callback
        if (onProgress) {
          onProgress(results.status);
        }

        switch (results.status) {
          case "completed":
            console.log(`✅ Transcription completed: ${transcriptionId}`);
            return results;

          case "error":
            throw new Error(`Transcription failed: ${transcriptionId}`);

          case "processing":
          case "queued":
            console.log(
              `⏳ Transcription ${results.status}: ${transcriptionId}`
            );
            await this.sleep(pollInterval);
            continue;

          default:
            console.warn(
              `❓ Unknown status '${results.status}' for transcription: ${transcriptionId}`
            );
            await this.sleep(pollInterval);
            continue;
        }
      } catch (error) {
        console.error("Error polling transcription status:", error);
        throw error;
      }
    }

    throw new Error(
      `Transcription polling timeout after ${
        maxPollTime / 1000 / 60
      } minutes: ${transcriptionId}`
    );
  }

  /**
   * Cancel a transcription
   */
  public async cancelTranscription(transcriptionId: string): Promise<boolean> {
    try {
      await this.client.transcripts.delete(transcriptionId);
      console.log(`🛑 Cancelled transcription: ${transcriptionId}`);
      return true;
    } catch (error) {
      console.error("Error cancelling transcription:", error);
      return false;
    }
  }

  /**
   * Get available audio formats and limits from AssemblyAI
   */
  public getSupportedFormats(): string[] {
    return [
      "mp3",
      "mp4",
      "m4a",
      "aac",
      "wav",
      "flac",
      "ogg",
      "webm",
      "mov",
      "avi",
      "mkv",
      "wmv",
      "3gp",
      "mpg",
      "mpeg",
    ];
  }

  /**
   * Validate file before transcription
   */
  public validateFile(
    filePath: string,
    contentType: string,
    size: number
  ): { valid: boolean; error?: string } {
    try {
      // Check file existence
      if (!fs.existsSync(filePath)) {
        return { valid: false, error: "File does not exist" };
      }

      // Check file size (4.5GB limit)
      const maxSize = 4.5 * 1024 * 1024 * 1024;
      if (size > maxSize) {
        return { valid: false, error: "File size exceeds 4.5GB limit" };
      }

      // Check content type
      const allowedTypes = [
        "video/mp4",
        "video/quicktime",
        "video/x-msvideo",
        "video/webm",
        "audio/mpeg",
        "audio/wav",
        "audio/mp4",
        "audio/aac",
        "audio/ogg",
      ];

      if (!allowedTypes.includes(contentType)) {
        return { valid: false, error: `Unsupported file type: ${contentType}` };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `File validation error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  /**
   * Clean up temporary files after transcription
   */
  public cleanupTemporaryFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Cleaned up temporary file: ${path.basename(filePath)}`);
      }
    } catch (error) {
      console.error("Error cleaning up temporary file:", error);
    }
  }

  /**
   * Get service health status
   */
  public async getServiceHealth(): Promise<{ healthy: boolean; details: any }> {
    try {
      // Simple test to check if AssemblyAI API is accessible
      // We'll just validate our API key by attempting to get account info
      const response = await axios.get(
        "https://api.assemblyai.com/v2/account",
        {
          headers: {
            Authorization: process.env.ASSEMBLYAI_API_KEY,
          },
        }
      );

      return {
        healthy: true,
        details: {
          api_accessible: true,
          account_valid: !!response.data,
        },
      };
    } catch (error) {
      console.error("AssemblyAI health check failed:", error);
      return {
        healthy: false,
        details: {
          api_accessible: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }
}
