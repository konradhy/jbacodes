/**
 * AudioExtractionService - FFmpeg integration for extracting audio from video files
 * Reduces file sizes by 80-95% before sending to AssemblyAI
 */

import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";

export class AudioExtractionService {
  private outputFormat: string;
  private audioQuality: string;

  constructor() {
    this.outputFormat = "mp3"; // Better compression than WAV, compatible with AssemblyAI
    this.audioQuality = "44100"; // 44.1kHz sample rate
    console.log("🎵 AudioExtractionService initialized");
  }

  /**
   * Extract audio from video file to reduce upload size
   * Returns path to the extracted audio file
   */
  public async extractAudio(
    videoPath: string,
    options?: {
      format?: "wav" | "mp3" | "flac";
      quality?: "high" | "medium" | "low";
    }
  ): Promise<string> {
    const format = options?.format || this.outputFormat;
    const audioPath = videoPath.replace(path.extname(videoPath), `.${format}`);

    console.log(`🎵 Extracting audio from: ${path.basename(videoPath)}`);
    console.log(`📁 Output: ${path.basename(audioPath)}`);

    return new Promise((resolve, reject) => {
      let command = ffmpeg(videoPath)
        .output(audioPath)
        .audioCodec(this.getAudioCodec(format))
        .audioFrequency(parseInt(this.audioQuality))
        .audioChannels(2)
        .noVideo(); // Remove video stream

      // Set quality based on options - use compressed formats to reduce size
      if (format === "wav") {
        // For WAV, use a lower bit depth to reduce size
        command = command.audioBitrate("256k");
      } else if (format === "mp3") {
        // For MP3, use a reasonable bitrate
        if (options?.quality === "high") {
          command = command.audioBitrate("192k");
        } else if (options?.quality === "medium") {
          command = command.audioBitrate("128k");
        } else if (options?.quality === "low") {
          command = command.audioBitrate("96k");
        } else {
          command = command.audioBitrate("128k");
        }
      } else if (format === "flac") {
        // FLAC is already compressed
        command = command.audioQuality(5); // Medium quality (0-10 scale)
      }

      command
        .on("start", (commandLine) => {
          console.log(`🔄 FFmpeg command: ${commandLine}`);
        })
        .on("progress", (progress) => {
          console.log(
            `⏳ Audio extraction progress: ${Math.round(
              progress.percent || 0
            )}%`
          );
        })
        .on("end", () => {
          console.log(
            `✅ Audio extraction completed: ${path.basename(audioPath)}`
          );

          // Log file size comparison
          this.logSizeComparison(videoPath, audioPath);
          resolve(audioPath);
        })
        .on("error", (err) => {
          console.error("❌ Audio extraction failed:", err.message);
          reject(new Error(`Audio extraction failed: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Check if a file is a video that needs audio extraction
   */
  public needsAudioExtraction(filePath: string, mimeType: string): boolean {
    const videoMimeTypes = [
      "video/mp4",
      "video/quicktime", // MOV
      "video/x-msvideo", // AVI
      "video/webm",
      "video/x-ms-wmv", // WMV
      "video/x-flv", // FLV
    ];

    const videoExtensions = [
      ".mp4",
      ".mov",
      ".avi",
      ".webm",
      ".wmv",
      ".flv",
      ".mkv",
    ];
    const extension = path.extname(filePath).toLowerCase();

    return (
      videoMimeTypes.includes(mimeType) || videoExtensions.includes(extension)
    );
  }

  /**
   * Get estimated file size reduction
   */
  public getEstimatedReduction(originalSize: number): {
    estimatedAudioSize: number;
    reductionPercentage: number;
  } {
    // Video files typically have 90-95% size reduction when extracting audio
    const estimatedAudioSize = Math.round(originalSize * 0.08); // ~8% of original size
    const reductionPercentage = 92;

    return { estimatedAudioSize, reductionPercentage };
  }

  /**
   * Clean up extracted audio file after processing
   */
  public cleanupAudioFile(audioPath: string): void {
    try {
      if (fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
        console.log(`🗑️ Cleaned up audio file: ${path.basename(audioPath)}`);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to cleanup audio file: ${audioPath}`, error);
    }
  }

  /**
   * Validate FFmpeg installation
   */
  public async validateFFmpeg(): Promise<{
    available: boolean;
    version?: string;
    error?: string;
  }> {
    return new Promise((resolve) => {
      ffmpeg.getAvailableFormats((err, formats) => {
        if (err) {
          resolve({
            available: false,
            error:
              "FFmpeg not found. Please install FFmpeg to enable audio extraction.",
          });
        } else {
          // Get FFmpeg version
          ffmpeg().getAvailableCodecs((err, codecs) => {
            resolve({
              available: true,
              version: "Available with audio/video codec support",
            });
          });
        }
      });
    });
  }

  /**
   * Get appropriate audio codec for format
   */
  private getAudioCodec(format: string): string {
    switch (format) {
      case "mp3":
        return "libmp3lame";
      case "flac":
        return "flac";
      case "wav":
      default:
        return "pcm_s16le"; // 16-bit PCM for WAV
    }
  }

  /**
   * Get appropriate output format based on file size
   * Uses more compressed formats for larger files
   */
  public getOptimalFormat(fileSize: number): "mp3" | "flac" | "wav" {
    const fileSizeMB = fileSize / (1024 * 1024);

    if (fileSizeMB > 500) {
      return "mp3"; // Best compression for large files
    } else if (fileSizeMB > 100) {
      return "flac"; // Good quality and compression for medium files
    } else {
      return "wav"; // Best quality for small files
    }
  }

  /**
   * Log file size comparison
   */
  private logSizeComparison(videoPath: string, audioPath: string): void {
    try {
      const videoStats = fs.statSync(videoPath);
      const audioStats = fs.statSync(audioPath);

      const videoSizeMB = videoStats.size / 1024 / 1024;
      const audioSizeMB = audioStats.size / 1024 / 1024;
      const reduction =
        ((videoStats.size - audioStats.size) / videoStats.size) * 100;

      console.log(`📊 Size comparison:`);
      console.log(`   Video: ${videoSizeMB.toFixed(1)}MB`);
      console.log(`   Audio: ${audioSizeMB.toFixed(1)}MB`);
      console.log(
        `   Reduction: ${reduction.toFixed(1)}% (${(
          videoSizeMB - audioSizeMB
        ).toFixed(1)}MB saved)`
      );
    } catch (error) {
      console.warn("⚠️ Could not calculate size comparison:", error);
    }
  }
}
