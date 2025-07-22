/**
 * SessionManager - File-based session storage for transcription sessions
 * Handles persistence, retrieval, and management of transcription sessions
 */

import fs from "fs";
import path from "path";
import { TranscriptionSession, SessionStorage, VideoMetadata } from "../types";

export class SessionManager {
  private sessionsFilePath: string;
  private videoMetadataPath: string;
  private sessionsData: SessionStorage;

  constructor() {
    this.sessionsFilePath = path.join("data", "sessions.json");
    this.videoMetadataPath = path.join("videos", "metadata.json");
    this.sessionsData = this.loadSessions();
  }

  /**
   * Load sessions from file or create new storage if file doesn't exist
   */
  private loadSessions(): SessionStorage {
    try {
      if (fs.existsSync(this.sessionsFilePath)) {
        const data = fs.readFileSync(this.sessionsFilePath, "utf8");
        const parsed = JSON.parse(data) as SessionStorage;
        console.log(`📚 Loaded ${parsed.sessions.length} existing sessions`);
        return parsed;
      }
    } catch (error) {
      console.error("Error loading sessions file:", error);
    }

    // Create new storage structure
    const newStorage: SessionStorage = {
      sessions: [],
      lastUpdated: new Date().toISOString(),
    };

    this.saveSessions(newStorage);
    console.log("📚 Created new sessions storage file");
    return newStorage;
  }

  /**
   * Save sessions data to file
   */
  private saveSessions(data?: SessionStorage): void {
    try {
      const dataToSave = data || this.sessionsData;
      dataToSave.lastUpdated = new Date().toISOString();

      // Ensure data directory exists
      const dataDir = path.dirname(this.sessionsFilePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      fs.writeFileSync(
        this.sessionsFilePath,
        JSON.stringify(dataToSave, null, 2)
      );
    } catch (error) {
      console.error("Error saving sessions file:", error);
      throw new Error("Failed to save session data");
    }
  }

  /**
   * Create a new transcription session
   */
  public createSession(session: TranscriptionSession): void {
    try {
      // Check if session already exists
      const existingIndex = this.sessionsData.sessions.findIndex(
        (s) => s.id === session.id
      );
      if (existingIndex !== -1) {
        console.warn(`Session ${session.id} already exists, updating...`);
        this.sessionsData.sessions[existingIndex] = session;
      } else {
        this.sessionsData.sessions.push(session);
        console.log(
          `📝 Created new session: ${session.id} (${session.filename})`
        );
      }

      this.saveSessions();
    } catch (error) {
      console.error("Error creating session:", error);
      throw new Error("Failed to create session");
    }
  }

  /**
   * Update an existing session
   */
  public updateSession(
    sessionId: string,
    updates: Partial<TranscriptionSession>
  ): void {
    try {
      const sessionIndex = this.sessionsData.sessions.findIndex(
        (s) => s.id === sessionId
      );
      if (sessionIndex === -1) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Merge updates with existing session
      this.sessionsData.sessions[sessionIndex] = {
        ...this.sessionsData.sessions[sessionIndex],
        ...updates,
      };

      console.log(
        `📝 Updated session: ${sessionId} - status: ${
          updates.status || "unchanged"
        }`
      );
      this.saveSessions();
    } catch (error) {
      console.error("Error updating session:", error);
      throw new Error("Failed to update session");
    }
  }

  /**
   * Get a session by ID
   */
  public getSession(sessionId: string): TranscriptionSession | null {
    try {
      const session = this.sessionsData.sessions.find(
        (s) => s.id === sessionId
      );
      return session || null;
    } catch (error) {
      console.error("Error retrieving session:", error);
      return null;
    }
  }

  /**
   * Get all sessions, optionally filtered by status
   */
  public getAllSessions(
    status?: TranscriptionSession["status"]
  ): TranscriptionSession[] {
    try {
      if (status) {
        return this.sessionsData.sessions.filter((s) => s.status === status);
      }
      return [...this.sessionsData.sessions];
    } catch (error) {
      console.error("Error retrieving sessions:", error);
      return [];
    }
  }

  /**
   * Get sessions sorted by upload time (newest first)
   */
  public getRecentSessions(limit?: number): TranscriptionSession[] {
    try {
      const sorted = [...this.sessionsData.sessions].sort(
        (a, b) =>
          new Date(b.uploadTimestamp).getTime() -
          new Date(a.uploadTimestamp).getTime()
      );

      return limit ? sorted.slice(0, limit) : sorted;
    } catch (error) {
      console.error("Error retrieving recent sessions:", error);
      return [];
    }
  }

  /**
   * Delete a session and its associated video file
   */
  public deleteSession(sessionId: string): boolean {
    try {
      const sessionIndex = this.sessionsData.sessions.findIndex(
        (s) => s.id === sessionId
      );
      if (sessionIndex === -1) {
        console.warn(`Session ${sessionId} not found for deletion`);
        return false;
      }

      const session = this.sessionsData.sessions[sessionIndex];

      // Remove session from array
      this.sessionsData.sessions.splice(sessionIndex, 1);
      this.saveSessions();

      // Clean up associated video file if it exists
      if (session.videoUrl) {
        this.cleanupVideoFile(session.videoUrl);
      }

      console.log(`🗑️ Deleted session: ${sessionId} (${session.filename})`);
      return true;
    } catch (error) {
      console.error("Error deleting session:", error);
      return false;
    }
  }

  /**
   * Clean up video file associated with a session
   */
  private cleanupVideoFile(videoUrl: string): void {
    try {
      // Extract video ID from URL pattern /api/video/:videoId
      const videoIdMatch = videoUrl.match(/\/api\/video\/([^\/]+)/);
      if (!videoIdMatch) {
        console.warn("Could not extract video ID from URL:", videoUrl);
        return;
      }

      const videoId = videoIdMatch[1];
      const videoDir = "videos";

      // Find and delete the video file
      if (fs.existsSync(videoDir)) {
        const files = fs.readdirSync(videoDir);
        const videoFile = files.find((file) => file.startsWith(videoId));

        if (videoFile) {
          const filePath = path.join(videoDir, videoFile);
          fs.unlinkSync(filePath);
          console.log(`🗑️ Deleted video file: ${videoFile}`);
        }
      }
    } catch (error) {
      console.error("Error cleaning up video file:", error);
    }
  }

  /**
   * Get session statistics and summary
   */
  public getSessionsSummary(): {
    total: number;
    byStatus: Record<TranscriptionSession["status"], number>;
    totalSize: number;
    oldestSession?: string;
    newestSession?: string;
  } {
    try {
      const sessions = this.sessionsData.sessions;
      const summary = {
        total: sessions.length,
        byStatus: {
          queued: 0,
          processing: 0,
          completed: 0,
          error: 0,
        } as Record<TranscriptionSession["status"], number>,
        totalSize: 0,
        oldestSession: undefined as string | undefined,
        newestSession: undefined as string | undefined,
      };

      // Count by status
      sessions.forEach((session) => {
        summary.byStatus[session.status]++;
      });

      // Find oldest and newest sessions
      if (sessions.length > 0) {
        const sorted = [...sessions].sort(
          (a, b) =>
            new Date(a.uploadTimestamp).getTime() -
            new Date(b.uploadTimestamp).getTime()
        );
        summary.oldestSession = sorted[0].uploadTimestamp;
        summary.newestSession = sorted[sorted.length - 1].uploadTimestamp;
      }

      return summary;
    } catch (error) {
      console.error("Error generating sessions summary:", error);
      return {
        total: 0,
        byStatus: { queued: 0, processing: 0, completed: 0, error: 0 },
        totalSize: 0,
      };
    }
  }

  /**
   * Clean up temporary files and old sessions (maintenance function)
   */
  public performMaintenance(olderThanDays: number = 30): {
    deletedSessions: number;
    cleanedTempFiles: number;
  } {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      let deletedSessions = 0;
      let cleanedTempFiles = 0;

      // Clean up old error sessions
      const sessionsToDelete = this.sessionsData.sessions.filter(
        (session) =>
          session.status === "error" &&
          new Date(session.uploadTimestamp) < cutoffDate
      );

      sessionsToDelete.forEach((session) => {
        if (this.deleteSession(session.id)) {
          deletedSessions++;
        }
      });

      // Clean up temporary upload files
      const uploadsDir = "uploads";
      if (fs.existsSync(uploadsDir)) {
        const tempFiles = fs.readdirSync(uploadsDir);
        tempFiles.forEach((file) => {
          const filePath = path.join(uploadsDir, file);
          const stats = fs.statSync(filePath);

          if (stats.mtime < cutoffDate) {
            fs.unlinkSync(filePath);
            cleanedTempFiles++;
          }
        });
      }

      if (deletedSessions > 0 || cleanedTempFiles > 0) {
        console.log(
          `🧹 Maintenance complete: ${deletedSessions} sessions, ${cleanedTempFiles} temp files cleaned`
        );
      }

      return { deletedSessions, cleanedTempFiles };
    } catch (error) {
      console.error("Error during maintenance:", error);
      return { deletedSessions: 0, cleanedTempFiles: 0 };
    }
  }

  /**
   * Validate sessions data integrity
   */
  public validateSessions(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    try {
      // Check if sessions file is readable
      if (!fs.existsSync(this.sessionsFilePath)) {
        issues.push("Sessions file does not exist");
      }

      // Validate each session
      this.sessionsData.sessions.forEach((session, index) => {
        if (!session.id) {
          issues.push(`Session at index ${index} missing ID`);
        }
        if (!session.filename) {
          issues.push(`Session ${session.id} missing filename`);
        }
        if (
          !["queued", "processing", "completed", "error"].includes(
            session.status
          )
        ) {
          issues.push(
            `Session ${session.id} has invalid status: ${session.status}`
          );
        }
      });

      return {
        valid: issues.length === 0,
        issues,
      };
    } catch (error) {
      issues.push(
        `Validation error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      return { valid: false, issues };
    }
  }
}
