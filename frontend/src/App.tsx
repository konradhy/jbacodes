import React, { useState, useEffect } from "react";
import "./App.css";

// Types (we'll import these from the backend later)
interface TranscriptionSession {
  id: string;
  filename: string;
  uploadTimestamp: string;
  status: "queued" | "processing" | "completed" | "error";
  assemblyaiId?: string;
  transcriptionResults?: any;
  jbaResults?: any[];
  videoUrl?: string;
  errorMessage?: string;
}

interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Helper Components
const formatTimestamp = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const formatDuration = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  }
  return `${minutes}m ${remainingSeconds}s`;
};

// Main App Component
function App() {
  const [currentView, setCurrentView] = useState<
    "home" | "upload" | "sessions" | "results"
  >("home");
  const [sessions, setSessions] = useState<TranscriptionSession[]>([]);
  const [currentSession, setCurrentSession] =
    useState<TranscriptionSession | null>(null);
  const [loading, setLoading] = useState(false);

  // Load sessions on component mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/sessions");
      const result: APIResponse = await response.json();

      if (result.success && result.data) {
        setSessions(result.data.sessions);
        console.log(`📚 Loaded ${result.data.sessions.length} sessions`);
      }
    } catch (error) {
      console.error("Error loading sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const viewSession = async (sessionId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/transcription/${sessionId}`);
      const result: APIResponse = await response.json();

      console.log("🔍 Session API Response:", result);
      console.log("🔍 Raw result.data:", result.data);
      console.log(
        "🔍 result.data.transcriptionResults:",
        result.data?.transcriptionResults
      );

      if (result.success && result.data) {
        setCurrentSession(result.data);
        setCurrentView("results");
        console.log("✅ Session loaded:", result.data);
        console.log(
          "✅ Session transcriptionResults:",
          result.data.transcriptionResults
        );
      }
    } catch (error) {
      console.error("Error loading session:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-brand">
          <h1>🎤 Simple Transcriptor</h1>
        </div>
        <div className="nav-links">
          <button
            className={`nav-btn ${currentView === "home" ? "active" : ""}`}
            onClick={() => setCurrentView("home")}
          >
            Home
          </button>
          <button
            className={`nav-btn ${currentView === "upload" ? "active" : ""}`}
            onClick={() => setCurrentView("upload")}
          >
            Upload
          </button>
          <button
            className={`nav-btn ${currentView === "sessions" ? "active" : ""}`}
            onClick={() => setCurrentView("sessions")}
          >
            Sessions
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {currentView === "home" && (
          <HomeView
            sessions={sessions}
            onViewSessions={() => setCurrentView("sessions")}
            onStartTranscription={() => setCurrentView("upload")}
          />
        )}
        {currentView === "upload" && (
          <UploadView onUploadComplete={loadSessions} />
        )}
        {currentView === "sessions" && (
          <SessionsView
            sessions={sessions}
            onViewSession={viewSession}
            onRefresh={loadSessions}
            loading={loading}
          />
        )}
        {currentView === "results" && currentSession && (
          <ResultsView
            session={currentSession}
            onBack={() => setCurrentView("sessions")}
          />
        )}
      </main>

      {/* Loading Overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Home View Component
const HomeView: React.FC<{
  sessions: TranscriptionSession[];
  onViewSessions: () => void;
  onStartTranscription: () => void;
}> = ({ sessions, onViewSessions, onStartTranscription }) => {
  const completedSessions = sessions.filter(
    (s) => s.status === "completed"
  ).length;
  const processingSessions = sessions.filter(
    (s) => s.status === "processing"
  ).length;

  return (
    <div className="home-view">
      <div className="hero-section">
        <h2>Welcome to Simple Transcriptor</h2>
        <p>
          Upload audio or video files and get AI-powered transcriptions with
          speaker detection, chapters, and more.
        </p>
        <div className="hero-actions">
          <button
            className="btn btn-primary btn-large"
            onClick={onStartTranscription}
          >
            🎤 Start Transcription
          </button>
          <button
            className="btn btn-secondary btn-large"
            onClick={onViewSessions}
          >
            📚 View All Sessions
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>{sessions.length}</h3>
          <p>Total Sessions</p>
        </div>
        <div className="stat-card">
          <h3>{completedSessions}</h3>
          <p>Completed</p>
        </div>
        <div className="stat-card">
          <h3>{processingSessions}</h3>
          <p>Processing</p>
        </div>
      </div>

      {sessions.length > 0 && (
        <div className="recent-sessions">
          <h3>Recent Sessions</h3>
          <div className="sessions-grid">
            {sessions.slice(0, 3).map((session) => (
              <div key={session.id} className="session-card">
                <h4>{session.filename}</h4>
                <span className={`status ${session.status}`}>
                  {session.status}
                </span>
                <p>{new Date(session.uploadTimestamp).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Upload View Component
const UploadView: React.FC<{
  onUploadComplete: () => void;
}> = ({ onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [extractAudio, setExtractAudio] = useState(true);
  const [ffmpegAvailable, setFfmpegAvailable] = useState<boolean | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Check FFmpeg availability on component mount
  useEffect(() => {
    checkFFmpegStatus();
  }, []);

  const checkFFmpegStatus = async () => {
    try {
      const response = await fetch("/api/ffmpeg-status");
      const result = await response.json();
      setFfmpegAvailable(result.success && result.data?.available);
    } catch (error) {
      console.error("Error checking FFmpeg status:", error);
      setFfmpegAvailable(false);
    }
  };

  const isVideoFile = (file: File): boolean => {
    return (
      file.type.startsWith("video/") ||
      [".mp4", ".mov", ".avi", ".webm", ".mkv"].some((ext) =>
        file.name.toLowerCase().endsWith(ext)
      )
    );
  };

  const getEstimatedReduction = (file: File): number => {
    if (!isVideoFile(file)) return 0;
    return Math.round(file.size * 0.08); // ~8% of original size
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);

    const formData = new FormData();
    formData.append("video", file);

    // Use new endpoint if extracting audio
    const shouldExtractAudio =
      extractAudio && ffmpegAvailable === true && isVideoFile(file);
    formData.append("extractAudio", shouldExtractAudio.toString());

    try {
      console.log(
        `📁 Uploading: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`
      );

      if (shouldExtractAudio) {
        const estimatedSize = getEstimatedReduction(file);
        console.log(
          `🎵 Audio extraction enabled - estimated size reduction: ${(
            (file.size - estimatedSize) /
            1024 /
            1024
          ).toFixed(1)}MB`
        );
      }

      const endpoint = shouldExtractAudio
        ? "/api/transcribe-with-audio"
        : "/api/transcribe";
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const result: APIResponse = await response.json();

      if (result.success) {
        console.log("✅ Upload successful!");
        onUploadComplete();
        alert(
          `Upload successful! Transcription started.${
            result.data?.audioExtracted
              ? " Audio extraction used for better performance!"
              : ""
          }`
        );
      } else {
        throw new Error(result.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setSelectedFile(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUploadConfirm = () => {
    if (selectedFile) {
      handleFileUpload(selectedFile);
    }
  };

  return (
    <div className="upload-view">
      <h2>Upload File for Transcription</h2>

      {!selectedFile ? (
        <>
          <div
            className={`upload-area ${dragOver ? "dragover" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById("fileInput")?.click()}
          >
            <div className="upload-icon">📁</div>
            <h3>Drop your file here</h3>
            <p>or click to browse</p>
            <small>Supports MP4, MOV, MP3, WAV, etc. Max 4.5GB</small>
          </div>

          <input
            id="fileInput"
            type="file"
            accept="video/*,audio/*"
            style={{ display: "none" }}
            onChange={handleFileSelect}
          />
        </>
      ) : uploading ? (
        <div className="upload-progress">
          <div className="spinner"></div>
          <p>
            {extractAudio && isVideoFile(selectedFile)
              ? "Extracting audio and starting transcription..."
              : "Uploading and starting transcription..."}
          </p>
        </div>
      ) : (
        <div className="upload-confirmation">
          <div className="file-preview">
            <h3>📄 {selectedFile.name}</h3>
            <p>Size: {(selectedFile.size / 1024 / 1024).toFixed(2)}MB</p>
            <p>Type: {selectedFile.type || "Unknown"}</p>
          </div>

          {ffmpegAvailable && isVideoFile(selectedFile) && (
            <div className="audio-extraction-option">
              <div className="option-header">
                <h4>🎵 Audio Extraction (Recommended)</h4>
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={extractAudio}
                    onChange={(e) => setExtractAudio(e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  Extract audio before transcription
                </label>
              </div>

              {extractAudio && (
                <div className="extraction-benefits">
                  <div className="benefit-item">
                    <span className="benefit-icon">⚡</span>
                    <span>Faster upload (~92% size reduction)</span>
                  </div>
                  <div className="benefit-item">
                    <span className="benefit-icon">💰</span>
                    <span>Lower bandwidth usage</span>
                  </div>
                  <div className="benefit-item">
                    <span className="benefit-icon">🎯</span>
                    <span>Optimized for transcription quality</span>
                  </div>
                  <div className="size-estimate">
                    <small>
                      Estimated upload size: ~
                      {(
                        getEstimatedReduction(selectedFile) /
                        1024 /
                        1024
                      ).toFixed(1)}
                      MB (vs {(selectedFile.size / 1024 / 1024).toFixed(1)}MB
                      original)
                    </small>
                  </div>
                </div>
              )}
            </div>
          )}

          {!ffmpegAvailable && isVideoFile(selectedFile) && (
            <div className="ffmpeg-warning">
              <p>⚠️ FFmpeg not available - video will be uploaded directly</p>
              <small>
                Install FFmpeg to enable audio extraction for faster uploads
              </small>
            </div>
          )}

          <div className="upload-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setSelectedFile(null)}
            >
              ← Choose Different File
            </button>
            <button
              className="btn btn-primary btn-large"
              onClick={handleUploadConfirm}
            >
              🚀 Start Transcription
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Sessions View Component
const SessionsView: React.FC<{
  sessions: TranscriptionSession[];
  onViewSession: (id: string) => void;
  onRefresh: () => void;
  loading: boolean;
}> = ({ sessions, onViewSession, onRefresh, loading }) => {
  return (
    <div className="sessions-view">
      <div className="sessions-header">
        <h2>All Sessions</h2>
        <button
          className="btn btn-secondary"
          onClick={onRefresh}
          disabled={loading}
        >
          🔄 Refresh
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="empty-state">
          <h3>No sessions found</h3>
          <p>Upload your first file to create a transcription session</p>
        </div>
      ) : (
        <div className="sessions-list">
          {sessions.map((session) => (
            <div key={session.id} className="session-item">
              <div className="session-info">
                <h4>{session.filename}</h4>
                <p>{new Date(session.uploadTimestamp).toLocaleString()}</p>
                <span className={`status ${session.status}`}>
                  {session.status}
                </span>
              </div>
              <div className="session-actions">
                {session.status === "completed" && (
                  <button
                    className="btn btn-primary"
                    onClick={() => onViewSession(session.id)}
                  >
                    View Results
                  </button>
                )}
                <button className="btn btn-secondary">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Results View Component
const ResultsView: React.FC<{
  session: TranscriptionSession;
  onBack: () => void;
}> = ({ session, onBack }) => {
  console.log("🎯 Rendering results for session:", session);
  console.log("🎯 Transcription results:", session.transcriptionResults);

  return (
    <div className="results-view">
      <div className="results-header">
        <div className="session-info">
          <h2>{session.filename}</h2>
          <div className="session-meta">
            <span className={`status ${session.status}`}>{session.status}</span>
            <span>{new Date(session.uploadTimestamp).toLocaleString()}</span>
          </div>
        </div>
        <div className="results-actions">
          <button className="btn btn-secondary" onClick={onBack}>
            ← Back to Sessions
          </button>
        </div>
      </div>

      {/* Video Player */}
      {session.videoUrl && (
        <div className="video-section">
          <video controls className="video-player">
            <source src={session.videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      )}

      {/* Main Results Area */}
      <div className="results-main">
        {/* Transcript Panel */}
        <div className="transcript-panel">
          <div className="panel-header">
            <h3>Transcript</h3>
            <div className="transcript-controls">
              <button className="btn btn-small">📋 Copy</button>
              <button className="btn btn-small">💾 Export</button>
            </div>
          </div>
          <div className="transcript-content">
            {session.transcriptionResults ? (
              <>
                <div className="transcript-text">
                  {session.transcriptionResults.text.split("\n").map(
                    (paragraph: string, index: number) =>
                      paragraph.trim() && (
                        <p key={index} className="transcript-paragraph">
                          {paragraph.trim()}
                        </p>
                      )
                  )}
                </div>
                <div className="transcript-stats">
                  <small>
                    Confidence:{" "}
                    {Math.round(session.transcriptionResults.confidence * 100)}%
                    | Words: {session.transcriptionResults.words?.length || 0} |
                    Characters: {session.transcriptionResults.text?.length || 0}
                  </small>
                </div>
              </>
            ) : (
              <div className="no-transcript">
                <p>No transcript available yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Analysis Grid */}
        <div className="analysis-grid">
          {/* JBA Codes Panel */}
          <div className="analysis-panel">
            <div className="panel-header">
              <h3>🏛️ JBA Codes</h3>
              <span className="badge">
                {session.jbaResults?.length || 0} found
              </span>
            </div>
            <div className="panel-content">
              {session.jbaResults && session.jbaResults.length > 0 ? (
                <div className="jba-list">
                  {session.jbaResults.map((jba, index) => (
                    <div key={index} className="jba-item">
                      <div className="jba-code">{jba.code}</div>
                      <div className="jba-context">{jba.context}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-panel">
                  <p>No JBA codes detected</p>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Chapters Panel */}
          <div className="analysis-panel enhanced-chapters">
            <div className="panel-header">
              <h3>📖 Smart Chapters</h3>
              <span className="badge">
                {session.transcriptionResults?.chapters?.length || 0} chapters
              </span>
            </div>
            <div className="panel-content">
              {session.transcriptionResults?.chapters &&
              session.transcriptionResults.chapters.length > 0 ? (
                <div className="chapters-list enhanced">
                  {session.transcriptionResults.chapters.map(
                    (chapter: any, index: number) => (
                      <div
                        key={index}
                        className="chapter-item enhanced"
                        onClick={() => {
                          // TODO: Add video player timestamp jumping
                          console.log(`Jump to ${chapter.start}s`);
                        }}
                      >
                        <div className="chapter-header">
                          <div className="chapter-number">#{index + 1}</div>
                          <div className="chapter-info">
                            <h5>{chapter.headline}</h5>
                            <div className="chapter-timing">
                              <span className="start-time">
                                {formatTimestamp(chapter.start)}
                              </span>
                              <span className="duration">
                                ({formatDuration(chapter.end - chapter.start)})
                              </span>
                            </div>
                          </div>
                        </div>
                        <p className="chapter-summary">{chapter.summary}</p>
                        <div className="chapter-actions">
                          <button className="btn btn-small btn-primary">
                            🎬 Jump to Chapter
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="empty-panel">
                  <div className="empty-icon">📖</div>
                  <h4>No chapters available</h4>
                  <p>
                    Chapters will be automatically generated from your audio
                    content to help you navigate through different topics and
                    sections.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
