/**
 * Simple Transcriptor - Frontend TypeScript Application
 * Handles UI interactions, file uploads, API communication, and real-time updates
 */
// ========================================
// Application Class
// ========================================
class SimpleTranscriptorApp {
    constructor() {
        this.currentView = "home";
        this.sessions = [];
        this.currentSession = null;
        this.pollingInterval = null;
        this.videoPlayer = null;
        this.init();
    }
    // ========================================
    // Initialization
    // ========================================
    async init() {
        console.log("🚀 Simple Transcriptor App initializing...");
        this.setupEventListeners();
        this.setupViewNavigation();
        this.setupFileUpload();
        this.setupVideoPlayer();
        await this.loadSessions();
        await this.updateStats();
        console.log("✅ App initialized successfully");
    }
    // ========================================
    // Event Listeners Setup
    // ========================================
    setupEventListeners() {
        // Navigation
        document.querySelectorAll(".nav-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                const target = e.currentTarget;
                const view = target.getAttribute("data-view");
                if (view)
                    this.switchView(view);
            });
        });
        // Action buttons
        const startTranscriptionBtn = document.getElementById("start-transcription");
        if (startTranscriptionBtn) {
            startTranscriptionBtn.addEventListener("click", () => this.switchView("upload"));
        }
        const viewAllSessionsBtn = document.getElementById("view-all-sessions");
        if (viewAllSessionsBtn) {
            viewAllSessionsBtn.addEventListener("click", () => this.switchView("sessions"));
        }
        const refreshSessionsBtn = document.getElementById("refresh-sessions");
        if (refreshSessionsBtn) {
            refreshSessionsBtn.addEventListener("click", () => this.loadSessions());
        }
        const backToSessionsBtn = document.getElementById("back-to-sessions");
        if (backToSessionsBtn) {
            backToSessionsBtn.addEventListener("click", () => this.switchView("sessions"));
        }
        const forceReloadBtn = document.getElementById("force-reload-session");
        if (forceReloadBtn) {
            forceReloadBtn.addEventListener("click", () => this.forceReloadCurrentSession());
        }
        // Export and copy functionality
        const exportBtn = document.getElementById("export-transcript");
        if (exportBtn) {
            exportBtn.addEventListener("click", () => this.exportTranscript());
        }
        const copyBtn = document.getElementById("copy-transcript");
        if (copyBtn) {
            copyBtn.addEventListener("click", () => this.copyTranscript());
        }
        // Health check
        const healthCheckBtn = document.getElementById("health-check");
        if (healthCheckBtn) {
            healthCheckBtn.addEventListener("click", () => this.checkSystemHealth());
        }
        // Status filter
        const statusFilter = document.getElementById("status-filter");
        if (statusFilter) {
            statusFilter.addEventListener("change", () => this.filterSessions());
        }
        // Panel toggles
        document.querySelectorAll(".panel-toggle").forEach((toggle) => {
            toggle.addEventListener("click", (e) => {
                const target = e.currentTarget;
                const panel = target.getAttribute("data-panel");
                if (panel)
                    this.togglePanel(panel);
            });
        });
        // JBA highlighting
        const highlightJBABtn = document.getElementById("highlight-jba");
        if (highlightJBABtn) {
            highlightJBABtn.addEventListener("click", () => this.toggleJBAHighlighting());
        }
    }
    // ========================================
    // View Management
    // ========================================
    setupViewNavigation() {
        // Handle browser back/forward
        window.addEventListener("popstate", (e) => {
            var _a;
            const view = ((_a = e.state) === null || _a === void 0 ? void 0 : _a.view) || "home";
            this.switchView(view, false);
        });
    }
    switchView(view, pushState = true) {
        console.log(`🔄 Switching to view: ${view}`);
        // Hide all views
        document
            .querySelectorAll(".view")
            .forEach((v) => v.classList.remove("active"));
        // Show target view
        const targetView = document.getElementById(`${view}-view`);
        if (targetView) {
            targetView.classList.add("active");
        }
        // Update navigation
        document
            .querySelectorAll(".nav-btn")
            .forEach((btn) => btn.classList.remove("active"));
        const activeBtn = document.querySelector(`[data-view="${view}"]`);
        if (activeBtn) {
            activeBtn.classList.add("active");
        }
        // Update browser history
        if (pushState) {
            history.pushState({ view }, "", `#${view}`);
        }
        this.currentView = view;
        // Trigger view-specific actions
        this.onViewChange(view);
    }
    onViewChange(view) {
        switch (view) {
            case "home":
                this.updateStats();
                this.loadRecentSessions();
                break;
            case "sessions":
                this.loadSessions();
                break;
            case "upload":
                this.resetUploadForm();
                break;
            case "results":
                // Results view is loaded when a session is selected
                break;
        }
    }
    // ========================================
    // File Upload Functionality
    // ========================================
    setupFileUpload() {
        const uploadArea = document.getElementById("upload-area");
        const fileInput = document.getElementById("file-input");
        const browseBtn = document.getElementById("browse-files");
        if (!uploadArea || !fileInput || !browseBtn)
            return;
        // Click to browse
        browseBtn.addEventListener("click", () => fileInput.click());
        uploadArea.addEventListener("click", () => fileInput.click());
        // File selection
        fileInput.addEventListener("change", (e) => {
            const target = e.target;
            if (target.files && target.files[0]) {
                this.handleFileSelection(target.files[0]);
            }
        });
        // Drag and drop
        uploadArea.addEventListener("dragover", (e) => {
            e.preventDefault();
            uploadArea.classList.add("dragover");
        });
        uploadArea.addEventListener("dragleave", () => {
            uploadArea.classList.remove("dragover");
        });
        uploadArea.addEventListener("drop", (e) => {
            var _a;
            e.preventDefault();
            uploadArea.classList.remove("dragover");
            const files = (_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.files;
            if (files && files[0]) {
                this.handleFileSelection(files[0]);
            }
        });
    }
    async handleFileSelection(file) {
        console.log(`📁 File selected: ${file.name} (${this.formatFileSize(file.size)})`);
        // Validate file
        const validation = this.validateFile(file);
        if (!validation.valid) {
            this.showNotification(validation.error || "Invalid file", "error");
            return;
        }
        // Show progress
        this.showUploadProgress(file.name);
        try {
            await this.uploadFile(file);
        }
        catch (error) {
            console.error("Upload error:", error);
            this.showNotification("Upload failed. Please try again.", "error");
            this.hideUploadProgress();
        }
    }
    validateFile(file) {
        const maxSize = 4.5 * 1024 * 1024 * 1024; // 4.5GB
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
        if (file.size > maxSize) {
            return { valid: false, error: "File size exceeds 4.5GB limit" };
        }
        if (!allowedTypes.includes(file.type)) {
            return { valid: false, error: `Unsupported file type: ${file.type}` };
        }
        return { valid: true };
    }
    async uploadFile(file) {
        const formData = new FormData();
        formData.append("video", file);
        try {
            const response = await fetch("/api/transcribe", {
                method: "POST",
                body: formData,
            });
            const result = await response.json();
            if (result.success && result.data) {
                const sessionId = result.data.sessionId;
                this.showNotification("Upload successful! Transcription started.", "success");
                this.hideUploadProgress();
                // Start polling for this session
                this.startPolling(sessionId);
                // Switch to sessions view
                this.switchView("sessions");
            }
            else {
                throw new Error(result.error || "Upload failed");
            }
        }
        catch (error) {
            console.error("Upload error:", error);
            throw error;
        }
    }
    showUploadProgress(filename) {
        const progressContainer = document.getElementById("upload-progress");
        const filenameElement = document.getElementById("progress-filename");
        if (progressContainer && filenameElement) {
            filenameElement.textContent = `Uploading: ${filename}`;
            progressContainer.classList.add("active");
        }
    }
    hideUploadProgress() {
        const progressContainer = document.getElementById("upload-progress");
        if (progressContainer) {
            progressContainer.classList.remove("active");
        }
    }
    resetUploadForm() {
        const fileInput = document.getElementById("file-input");
        if (fileInput) {
            fileInput.value = "";
        }
        this.hideUploadProgress();
    }
    // ========================================
    // Session Management
    // ========================================
    async loadSessions() {
        try {
            this.showLoading("Loading sessions...");
            const response = await fetch("/api/sessions");
            const result = await response.json();
            if (result.success && result.data) {
                this.sessions = result.data.sessions;
                this.renderSessions();
                console.log(`📚 Loaded ${this.sessions.length} sessions`);
                // Start polling for any active sessions (processing status)
                const activeSessions = this.sessions.filter((s) => s.status === "processing");
                if (activeSessions.length > 0) {
                    console.log(`🔄 Found ${activeSessions.length} active sessions, starting polling...`);
                    activeSessions.forEach((session) => {
                        this.startPolling(session.id);
                    });
                }
            }
            else {
                throw new Error(result.error || "Failed to load sessions");
            }
        }
        catch (error) {
            console.error("Error loading sessions:", error);
            this.showNotification("Failed to load sessions", "error");
        }
        finally {
            this.hideLoading();
        }
    }
    async loadRecentSessions() {
        try {
            const response = await fetch("/api/sessions?limit=6");
            const result = await response.json();
            if (result.success && result.data) {
                this.renderRecentSessions(result.data.sessions);
            }
        }
        catch (error) {
            console.error("Error loading recent sessions:", error);
        }
    }
    renderSessions() {
        const container = document.getElementById("sessions-list");
        if (!container)
            return;
        if (this.sessions.length === 0) {
            container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-file-audio"></i>
          <h4>No sessions found</h4>
          <p>Upload your first file to create a transcription session</p>
        </div>
      `;
            return;
        }
        container.innerHTML = this.sessions
            .map((session) => `
      <div class="session-card" onclick="app.viewSession('${session.id}')">
        <div class="session-header">
          <h4 class="session-title">${session.filename}</h4>
          <span class="session-status ${session.status}">${session.status}</span>
        </div>
        <div class="session-meta">
          <span><i class="fas fa-calendar"></i> ${this.formatDate(session.uploadTimestamp)}</span>
          ${session.transcriptionResults
            ? `<span><i class="fas fa-clock"></i> ${this.formatDuration(session.transcriptionResults)}</span>`
            : ""}
          ${session.transcriptionResults
            ? `<span><i class="fas fa-percentage"></i> ${Math.round(session.transcriptionResults.confidence * 100)}%</span>`
            : ""}
        </div>
        <div class="session-actions">
          ${session.status === "completed"
            ? `
            <button class="btn btn-small btn-primary" onclick="app.viewSession('${session.id}'); event.stopPropagation();">
              <i class="fas fa-eye"></i> View Results
            </button>
          `
            : ""}
          <button class="btn btn-small btn-secondary" onclick="app.deleteSession('${session.id}'); event.stopPropagation();">
            <i class="fas fa-trash"></i> Delete
          </button>
        </div>
      </div>
    `)
            .join("");
    }
    renderRecentSessions(sessions) {
        const container = document.getElementById("recent-sessions-grid");
        const emptyState = document.getElementById("empty-sessions");
        if (!container)
            return;
        if (sessions.length === 0) {
            if (emptyState)
                emptyState.style.display = "block";
            return;
        }
        if (emptyState)
            emptyState.style.display = "none";
        const recentSessionsHTML = sessions
            .slice(0, 6)
            .map((session) => `
      <div class="session-card" onclick="app.viewSession('${session.id}')">
        <div class="session-header">
          <h4 class="session-title">${session.filename}</h4>
          <span class="session-status ${session.status}">${session.status}</span>
        </div>
        <div class="session-meta">
          <span>${this.formatDate(session.uploadTimestamp)}</span>
        </div>
      </div>
    `)
            .join("");
        container.innerHTML = recentSessionsHTML;
    }
    filterSessions() {
        const statusFilter = document.getElementById("status-filter");
        const filterValue = statusFilter === null || statusFilter === void 0 ? void 0 : statusFilter.value;
        if (!filterValue) {
            this.renderSessions();
            return;
        }
        const filteredSessions = this.sessions.filter((session) => session.status === filterValue);
        const tempSessions = this.sessions;
        this.sessions = filteredSessions;
        this.renderSessions();
        this.sessions = tempSessions;
    }
    async viewSession(sessionId) {
        try {
            this.showLoading("Loading session details...");
            const response = await fetch(`/api/transcription/${sessionId}`);
            const result = await response.json();
            console.log("🔍 viewSession API Response:", result);
            if (result.success && result.data) {
                this.currentSession = result.data;
                console.log("🔍 Current session loaded:", this.currentSession);
                console.log("🔍 Transcription results:", this.currentSession.transcriptionResults);
                this.renderSessionResults();
                this.switchView("results");
            }
            else {
                throw new Error(result.error || "Failed to load session");
            }
        }
        catch (error) {
            console.error("Error loading session:", error);
            this.showNotification("Failed to load session details", "error");
        }
        finally {
            this.hideLoading();
        }
    }
    async deleteSession(sessionId) {
        if (!confirm("Are you sure you want to delete this session?")) {
            return;
        }
        try {
            const response = await fetch(`/api/sessions/${sessionId}`, {
                method: "DELETE",
            });
            const result = await response.json();
            if (result.success) {
                this.showNotification("Session deleted successfully", "success");
                await this.loadSessions();
                await this.updateStats();
            }
            else {
                throw new Error(result.error || "Failed to delete session");
            }
        }
        catch (error) {
            console.error("Error deleting session:", error);
            this.showNotification("Failed to delete session", "error");
        }
    }
    async forceReloadCurrentSession() {
        var _a;
        if (!this.currentSession) {
            this.showNotification("No session selected", "warning");
            return;
        }
        console.log(`🔄 Force reloading session: ${this.currentSession.id}`);
        try {
            this.showLoading("Force reloading session data...");
            const response = await fetch(`/api/transcription/${this.currentSession.id}`);
            const result = await response.json();
            console.log("🔄 Force reload API response:", result);
            if (result.success && result.data) {
                this.currentSession = result.data;
                console.log("🔄 Force reload - new session data:", this.currentSession);
                console.log("🔄 Force reload - transcription results:", this.currentSession.transcriptionResults);
                this.renderSessionResults();
                this.showNotification("Session data reloaded successfully", "success");
                console.log(`✅ Session reloaded - Status: ${(_a = this.currentSession) === null || _a === void 0 ? void 0 : _a.status}`);
            }
            else {
                throw new Error(result.error || "Failed to reload session");
            }
        }
        catch (error) {
            console.error("Error reloading session:", error);
            this.showNotification("Failed to reload session", "error");
        }
        finally {
            this.hideLoading();
        }
    }
    // ========================================
    // Results Display
    // ========================================
    renderSessionResults() {
        console.log("🎯 renderSessionResults() called");
        if (!this.currentSession) {
            console.log("❌ No current session to render");
            return;
        }
        const session = this.currentSession;
        console.log("🎯 Rendering session:", session.filename);
        console.log("🎯 Session status:", session.status);
        console.log("🎯 Has transcriptionResults?", !!session.transcriptionResults);
        // Update header
        this.updateElement("results-filename", session.filename);
        this.updateElement("results-status", session.status);
        this.updateElement("results-date", this.formatDate(session.uploadTimestamp));
        if (session.transcriptionResults) {
            this.updateElement("results-duration", this.formatDuration(session.transcriptionResults));
        }
        // Setup video player
        if (session.videoUrl) {
            this.setupVideoForSession(session.videoUrl);
        }
        // Render transcript
        if (session.transcriptionResults) {
            console.log("📝 About to render transcript...");
            this.renderTranscript(session.transcriptionResults);
            this.renderJBACodes(session.jbaResults || []);
            this.renderSpeakers(session.transcriptionResults.utterances || []);
            this.renderChapters(session.transcriptionResults.chapters || []);
            this.renderHighlights(session.transcriptionResults.auto_highlights_result);
            this.renderEntities(session.transcriptionResults.entities || []);
        }
        else {
            console.log("❌ No transcriptionResults to render");
        }
    }
    renderTranscript(results) {
        console.log("📝 renderTranscript() called with:", results);
        console.log("📝 Transcript text length:", results.text ? results.text.length : 0);
        console.log("📝 First 200 chars of transcript:", results.text ? results.text.substring(0, 200) : "NO TEXT");
        const container = document.getElementById("transcript-content");
        if (!container) {
            console.log("❌ Could not find transcript-content container");
            return;
        }
        console.log("📝 Found transcript container, rendering...");
        // SIMPLIFIED RENDERING FOR DEBUGGING
        const transcriptHTML = `
      <div class="transcript-text" style="background: #f0f0f0; padding: 20px; border: 2px solid red;">
        <h4>🚨 DEBUG: Transcript Text Below:</h4>
        <pre style="white-space: pre-wrap; font-family: Arial; font-size: 14px;">${results.text}</pre>
      </div>
      <div class="transcript-stats" style="background: yellow; padding: 10px;">
        <strong>Stats:</strong> 
        Confidence: ${Math.round(results.confidence * 100)}% | 
        Words: ${results.words.length} | 
        Characters: ${results.text.length}
      </div>
    `;
        console.log("📝 Setting innerHTML...");
        container.innerHTML = transcriptHTML;
        console.log("📝 Transcript rendered successfully");
    }
    renderJBACodes(jbaCodes) {
        const container = document.getElementById("jba-list");
        const countElement = document.getElementById("jba-count");
        if (!container || !countElement)
            return;
        countElement.textContent = `${jbaCodes.length} found`;
        if (jbaCodes.length === 0) {
            container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-search"></i>
          <p>No JBA codes detected in this transcription</p>
        </div>
      `;
            return;
        }
        container.innerHTML = jbaCodes
            .map((jba) => `
      <div class="jba-item" onclick="app.jumpToTimestamp(${jba.timestamp})">
        <div class="jba-code">${jba.code}</div>
        <div class="jba-timestamp">${this.formatTimestamp(jba.timestamp)}</div>
        <div class="jba-context">${this.escapeHtml(jba.context)}</div>
      </div>
    `)
            .join("");
    }
    renderSpeakers(utterances) {
        const container = document.getElementById("speakers-content");
        if (!container)
            return;
        const speakers = new Set(utterances.map((u) => u.speaker).filter(Boolean));
        container.innerHTML = Array.from(speakers)
            .map((speaker) => `
      <div class="speaker-item">
        <strong>Speaker ${speaker}</strong>
        <small>${utterances.filter((u) => u.speaker === speaker).length} utterances</small>
      </div>
    `)
            .join("");
    }
    renderChapters(chapters) {
        const container = document.getElementById("chapters-content");
        if (!container)
            return;
        if (chapters.length === 0) {
            container.innerHTML = "<p>No chapters available</p>";
            return;
        }
        container.innerHTML = chapters
            .map((chapter) => `
      <div class="chapter-item" onclick="app.jumpToTimestamp(${chapter.start})">
        <h5>${chapter.headline}</h5>
        <p>${chapter.summary}</p>
        <small>${this.formatTimestamp(chapter.start)} - ${this.formatTimestamp(chapter.end)}</small>
      </div>
    `)
            .join("");
    }
    renderHighlights(highlights) {
        const container = document.getElementById("highlights-content");
        if (!container)
            return;
        if (!highlights || !highlights.results || highlights.results.length === 0) {
            container.innerHTML = "<p>No highlights available</p>";
            return;
        }
        container.innerHTML = highlights.results
            .map((highlight) => `
      <div class="highlight-item">
        <strong>${highlight.text}</strong>
        <small>Mentioned ${highlight.count} times</small>
      </div>
    `)
            .join("");
    }
    renderEntities(entities) {
        const container = document.getElementById("entities-content");
        if (!container)
            return;
        if (entities.length === 0) {
            container.innerHTML = "<p>No entities detected</p>";
            return;
        }
        const entityTypes = [...new Set(entities.map((e) => e.entity_type))];
        container.innerHTML = entityTypes
            .map((type) => {
            const typeEntities = entities.filter((e) => e.entity_type === type);
            return `
        <div class="entity-group">
          <h6>${type}</h6>
          <div class="entity-list">
            ${typeEntities
                .map((entity) => `
              <span class="entity-tag">${entity.text}</span>
            `)
                .join("")}
          </div>
        </div>
      `;
        })
            .join("");
    }
    // ========================================
    // Video Player Integration
    // ========================================
    setupVideoPlayer() {
        this.videoPlayer = document.getElementById("video-player");
    }
    setupVideoForSession(videoUrl) {
        const videoSource = document.getElementById("video-source");
        if (this.videoPlayer && videoSource) {
            videoSource.src = videoUrl;
            this.videoPlayer.load();
        }
    }
    jumpToTimestamp(timestamp) {
        if (this.videoPlayer) {
            this.videoPlayer.currentTime = timestamp / 1000; // Convert milliseconds to seconds
            this.videoPlayer.play();
        }
    }
    // ========================================
    // Real-time Updates and Polling
    // ========================================
    startPolling(sessionId) {
        console.log(`🔄 Starting polling for session: ${sessionId}`);
        this.pollingInterval = window.setInterval(async () => {
            try {
                const response = await fetch(`/api/transcription/${sessionId}`);
                const result = await response.json();
                if (result.success && result.data) {
                    const session = result.data;
                    // Update session in local array
                    const index = this.sessions.findIndex((s) => s.id === sessionId);
                    if (index !== -1) {
                        this.sessions[index] = session;
                    }
                    else {
                        this.sessions.unshift(session);
                    }
                    // Update UI if needed
                    if (this.currentView === "sessions") {
                        this.renderSessions();
                    }
                    // Stop polling if completed or error
                    if (session.status === "completed" || session.status === "error") {
                        this.stopPolling();
                        if (session.status === "completed") {
                            this.showNotification(`Transcription completed: ${session.filename}`, "success");
                        }
                        else {
                            this.showNotification(`Transcription failed: ${session.filename}`, "error");
                        }
                        await this.updateStats();
                    }
                }
            }
            catch (error) {
                console.error("Polling error:", error);
            }
        }, 5000); // Poll every 5 seconds
    }
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            console.log("⏹️ Stopped polling");
        }
    }
    // ========================================
    // Statistics and Health
    // ========================================
    async updateStats() {
        try {
            const response = await fetch("/api/sessions-summary");
            const result = await response.json();
            if (result.success && result.data) {
                const stats = result.data;
                this.updateElement("total-sessions", stats.total.toString());
                this.updateElement("completed-sessions", stats.byStatus.completed.toString());
                this.updateElement("processing-sessions", stats.byStatus.processing.toString());
            }
        }
        catch (error) {
            console.error("Error updating stats:", error);
        }
    }
    async checkSystemHealth() {
        try {
            this.showLoading("Checking system health...");
            const response = await fetch("/api/health?detailed=true");
            const result = await response.json();
            if (result.status === "OK") {
                this.showNotification("All systems operational", "success");
            }
            else {
                this.showNotification("System issues detected", "warning");
            }
            console.log("System Health:", result);
        }
        catch (error) {
            console.error("Health check error:", error);
            this.showNotification("Health check failed", "error");
        }
        finally {
            this.hideLoading();
        }
    }
    // ========================================
    // Export and Copy Functionality
    // ========================================
    exportTranscript() {
        var _a;
        if (!((_a = this.currentSession) === null || _a === void 0 ? void 0 : _a.transcriptionResults)) {
            this.showNotification("No transcript to export", "warning");
            return;
        }
        const content = this.generateExportContent();
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${this.currentSession.filename}_transcript.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showNotification("Transcript exported successfully", "success");
    }
    copyTranscript() {
        var _a;
        if (!((_a = this.currentSession) === null || _a === void 0 ? void 0 : _a.transcriptionResults)) {
            this.showNotification("No transcript to copy", "warning");
            return;
        }
        const content = this.generateExportContent();
        navigator.clipboard
            .writeText(content)
            .then(() => {
            this.showNotification("Transcript copied to clipboard", "success");
        })
            .catch(() => {
            this.showNotification("Failed to copy transcript", "error");
        });
    }
    generateExportContent() {
        var _a;
        if (!((_a = this.currentSession) === null || _a === void 0 ? void 0 : _a.transcriptionResults))
            return "";
        const session = this.currentSession;
        const results = session.transcriptionResults;
        if (!results)
            return "";
        let content = `TRANSCRIPTION RESULTS\n`;
        content += `========================\n\n`;
        content += `File: ${session.filename}\n`;
        content += `Date: ${this.formatDate(session.uploadTimestamp)}\n`;
        content += `Confidence: ${Math.round(results.confidence * 100)}%\n\n`;
        content += `TRANSCRIPT\n`;
        content += `----------\n`;
        content += `${results.text}\n\n`;
        if (session.jbaResults && session.jbaResults.length > 0) {
            content += `JBA CODES (${session.jbaResults.length} found)\n`;
            content += `----------\n`;
            session.jbaResults.forEach((jba) => {
                content += `${this.formatTimestamp(jba.timestamp)} - ${jba.code}\n`;
                content += `Context: ${jba.context}\n\n`;
            });
        }
        return content;
    }
    // ========================================
    // UI Utility Functions
    // ========================================
    togglePanel(panelName) {
        const content = document.getElementById(`${panelName}-content`);
        const toggle = document.querySelector(`[data-panel="${panelName}"]`);
        if (content && toggle) {
            const isExpanded = content.classList.contains("expanded");
            if (isExpanded) {
                content.classList.remove("expanded");
                toggle.classList.remove("expanded");
            }
            else {
                content.classList.add("expanded");
                toggle.classList.add("expanded");
            }
        }
    }
    toggleJBAHighlighting() {
        // TODO: Implement JBA highlighting in transcript
        this.showNotification("JBA highlighting toggled", "info");
    }
    showNotification(message, type = "info") {
        const container = document.getElementById("notifications");
        if (!container)
            return;
        const notification = document.createElement("div");
        notification.className = `notification ${type}`;
        notification.innerHTML = `
      <div>${this.escapeHtml(message)}</div>
      <button onclick="this.parentElement.remove()" style="float: right; background: none; border: none; font-size: 18px; cursor: pointer;">&times;</button>
    `;
        container.appendChild(notification);
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
    showLoading(message = "Loading...") {
        const overlay = document.getElementById("loading-overlay");
        const messageElement = document.getElementById("loading-message");
        if (overlay && messageElement) {
            messageElement.textContent = message;
            overlay.classList.add("active");
        }
    }
    hideLoading() {
        const overlay = document.getElementById("loading-overlay");
        if (overlay) {
            overlay.classList.remove("active");
        }
    }
    updateElement(id, content) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = content;
        }
    }
    // ========================================
    // Utility Functions
    // ========================================
    formatFileSize(bytes) {
        const sizes = ["Bytes", "KB", "MB", "GB"];
        if (bytes === 0)
            return "0 Bytes";
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
    }
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    }
    formatTimestamp(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
    }
    formatDuration(results) {
        if (results.words && results.words.length > 0) {
            const lastWord = results.words[results.words.length - 1];
            return this.formatTimestamp(lastWord.end);
        }
        return "--:--";
    }
    escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }
}
// ========================================
// Application Initialization
// ========================================
let app;
document.addEventListener("DOMContentLoaded", () => {
    app = new SimpleTranscriptorApp();
    // Make app globally available for onclick handlers
    window.app = app;
});
