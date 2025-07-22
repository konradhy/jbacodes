# Simple Transcriptor - Requirements Document

## Overview
Simple Transcriptor is a modern web-based application for transcribing video and audio files using AI. It combines AssemblyAI's speech-to-text service with advanced AI-powered JBA code detection, video playback synchronization, and comprehensive session management.

## Core Business Requirements

### 1. File Upload & Processing
**Requirement**: Users can upload video/audio files for transcription
- **Supported Formats**: MP4, MOV, AVI, MP3, WAV, M4A, AAC, OGG, WEBM
- **File Size Limit**: 4.5GB maximum
- **Upload Methods**: 
  - Drag and drop interface
  - Click to browse file system
- **File Handling Strategy**:
  - Files ≤500MB: Direct upload to AssemblyAI
  - Files >500MB: URL-based transcription (requires public server access)
- **File Storage**: 
  - Temporary files stored in `uploads/` during processing
  - Permanent copies stored in `videos/` with UUID naming
  - Automatic cleanup of temporary files

### 2. Speech-to-Text Transcription
**Requirement**: Convert audio/video to text using AssemblyAI
- **Base Transcription**: High-quality speech-to-text conversion
- **Streamlined Features**:
  - Auto-generated chapters (up to 15 chapters)
  - Word-level timestamps
  - Confidence scores
  - JBA code boosting with word variations
- **Error Handling**: Retry logic for temporary API failures (502, 503, 504 errors)
- **Progress Tracking**: Real-time status updates (queued → processing → completed/error)

### 3. JBA Code Detection (Advanced AI Feature)
**Requirement**: Detect and analyze JBA codes in transcripts using AI
- **Detection Variations**:
  - Standard: "JBA"
  - Spaced: "J B A" 
  - Dotted: "J.B.A"
  - Hyphenated: "J-B-A", "JBA-123"
  - Lowercase: "jba"
  - Spoken: "jay bee ay"
  - Extended: "JBA123", "JBA-45-B"
- **AI Processing**: Use OpenRouter/Claude 3.5 Sonnet for intelligent detection
- **Output Requirements**:
  - Normalized code format
  - Original text as found in transcript
  - Surrounding context
  - Precise timestamps (millisecond accuracy)
  - Confidence scores (0.0-1.0)
  - Variation type classification
- **Integration**: Automatic processing when transcription completes

### 4. Video Playback & Navigation
**Requirement**: Synchronized video player with transcript interaction
- **Video Player Features**:
  - Standard HTML5 video controls
  - Range request support for efficient streaming
  - Multiple format support
  - Auto-detection of content type
- **Synchronization Features**:
  - Click JBA codes to jump to timestamps
  - Current time highlighting in transcript
  - Chapter navigation
  - Clickable word-level timestamps
- **Video Serving**: REST endpoint with range request support for large files

### 5. Session Management
**Requirement**: Persistent storage and management of transcription sessions
- **Storage Method**: File-based local storage (not browser localStorage)
- **Session Data Structure**:
  - Unique session ID
  - Original filename
  - Upload timestamp
  - Processing status
  - Transcription results
  - Video URL references
  - Error messages
- **Storage Locations**:
  - Sessions: `data/sessions.json`
  - Videos: `videos/` directory
  - Metadata: `videos/metadata.json`
- **Session Operations**:
  - Create new sessions
  - Track processing status
  - Retrieve session history
  - Delete sessions
  - Export session summaries

### 6. User Interface Requirements
**Requirement**: Modern, responsive web interface
- **Homepage Features**:
  - New transcription button
  - Recent transcriptions grid
  - Session history with status indicators
- **Upload Interface**:
  - Drag-and-drop zone with visual feedback
  - File type and size validation
  - Upload progress indication
- **Results Interface**:
  - Transcript display with formatting and confidence scores
  - Video player integration with chapter navigation
  - Enhanced chapters panel with timestamp jumping
  - JBA codes panel (collapsible)
  - Export options (copy, download)
  - Navigation between sessions
- **Enhanced Chapter Features**:
  - Smart chapter grid layout
  - Click-to-jump timestamp navigation
  - Chapter numbering and duration display
  - Interactive chapter cards with summaries
- **Responsive Design**: Works on desktop and mobile devices

## Technical Requirements

### Backend Architecture
- **Framework**: Node.js with Express.js
- **Language**: TypeScript with strict type checking
- **API Design**: RESTful endpoints with proper HTTP status codes
- **File Handling**: Multer for multipart uploads with size/type validation
- **Error Handling**: Comprehensive error catching with user-friendly messages
- **CORS**: Cross-origin resource sharing enabled
- **Environment**: dotenv for configuration management

### Frontend Architecture
- **Technology**: Vanilla TypeScript (no framework dependencies)
- **Styling**: Modern CSS3 with gradients and animations
- **Icons**: Font Awesome 6.x
- **Fonts**: Google Fonts (Inter family)
- **Build Process**: TypeScript compilation to JavaScript
- **No Build Tools**: Direct TypeScript compilation, no bundlers

### External Dependencies
- **Primary APIs**:
  - AssemblyAI SDK 4.x for transcription
  - OpenRouter API for JBA detection (optional)
- **Core Libraries**:
  - Express 4.x for server
  - Multer for file uploads
  - UUID for unique identifiers
  - Axios for HTTP requests
  - CORS for cross-origin requests

### Environment Configuration
- **Required Variables**:
  - `ASSEMBLYAI_API_KEY`: AssemblyAI service authentication
  - `PORT`: Server port (default 3000)
- **Optional Variables**:
  - `OPENROUTER_API_KEY`: For JBA detection (feature disabled if missing)
  - `PUBLIC_BASE_URL`: For large file processing (ngrok URL or public deployment)

### File Structure Requirements
```
project-root/
├── src/                     # Backend TypeScript source
│   ├── server.ts           # Main Express application
│   ├── types.ts            # TypeScript interfaces/types
│   └── services/           # Business logic services
│       ├── transcriptionService.ts
│       ├── sessionManager.ts
│       └── jbaDetectionService.ts
├── public/                 # Frontend static files
│   ├── index.html         # Main HTML page
│   ├── styles.css         # CSS styling
│   ├── app.ts            # Frontend TypeScript
│   └── app.js            # Compiled JavaScript
├── data/                  # Application data
│   └── sessions.json     # Session storage
├── videos/               # Permanent video storage
├── uploads/             # Temporary upload storage
├── dist/               # Compiled backend code
├── package.json        # Dependencies and scripts
├── tsconfig.json      # TypeScript configuration
└── .env              # Environment variables
```

## API Endpoints Specification

### Core Endpoints
- `POST /api/transcribe` - Upload file and start transcription
- `GET /api/transcription/:id` - Get transcription status/results
- `GET /api/video/:videoId` - Stream video with range request support
- `GET /api/health` - Health check endpoint

### Session Management Endpoints
- `GET /api/sessions` - List all sessions
- `GET /api/sessions/:sessionId` - Get specific session
- `DELETE /api/sessions/:sessionId` - Delete session
- `GET /api/sessions-summary` - Get session statistics

### Static Content
- `GET /` - Main application HTML page
- Static file serving for CSS, JS, and assets

## Security & Performance Requirements

### Security
- **Input Validation**: File type and size restrictions
- **API Key Protection**: Environment variables never exposed to frontend
- **File Cleanup**: Automatic deletion of temporary files
- **CORS Configuration**: Controlled cross-origin access
- **Error Information**: Sanitized error messages (no sensitive data exposure)

### Performance
- **Large File Handling**: URL-based transcription for files >500MB
- **Video Streaming**: Range request support for efficient video delivery
- **Retry Logic**: Automatic retry for temporary API failures
- **Session Caching**: Efficient session data retrieval
- **File Storage**: Permanent storage with UUID-based organization

## Error Handling Requirements
- **Network Errors**: Retry logic with exponential backoff
- **API Failures**: User-friendly error messages with suggestions
- **File Errors**: Validation and clear feedback for unsupported files
- **Session Errors**: Graceful handling of corrupted session data
- **Missing Dependencies**: Graceful degradation (e.g., JBA detection optional)

## Integration Requirements
- **AssemblyAI Integration**: Full feature utilization (diarization, chapters, etc.)
- **OpenRouter Integration**: Claude 3.5 Sonnet for JBA detection
- **File System Integration**: Cross-platform file handling
- **Browser Integration**: Modern browser API usage (drag-and-drop, video)

## Business Logic Requirements

### Transcription Workflow
1. User uploads file via web interface
2. System validates file (type, size)
3. File stored temporarily, copied to permanent storage
4. Transcription initiated based on file size strategy
5. Real-time progress updates provided to user
6. Upon completion, JBA detection runs automatically
7. Results stored in session with video metadata
8. User can view, navigate, and export results

### Session Lifecycle
1. Session created on file upload with unique ID
2. Session linked to AssemblyAI transcription ID
3. Status updated throughout processing
4. Final results stored with video URL reference
5. Session persists until manually deleted
6. Session history available for future access

### JBA Detection Workflow
1. Triggered automatically when transcription completes
2. Full transcript sent to Claude via OpenRouter
3. AI identifies all JBA code variations
4. Results enhanced with precise timestamps using word-level data
5. Codes sorted chronologically and stored with session
6. Interactive navigation enabled in video player

## Scalability Considerations
- **File Storage**: UUID-based organization for unlimited files
- **Session Storage**: JSON file approach suitable for single-user deployment
- **API Quotas**: Error handling for AssemblyAI rate limits
- **Memory Management**: Streaming approach for large video files
- **Concurrent Processing**: Support for multiple simultaneous transcriptions

## Quality Assurance Requirements
- **Type Safety**: Full TypeScript coverage with strict mode
- **Error Boundaries**: Comprehensive try-catch blocks
- **Input Validation**: Server-side validation for all inputs
- **Status Monitoring**: Health check endpoint for system status
- **Logging**: Detailed console logging for debugging
- **User Feedback**: Clear progress indication and error messages 