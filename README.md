# Simple Transcriptor

A modern, user-friendly web application for transcribing videos and audio files using Assembly AI's powerful speech-to-text API. Built with TypeScript, Express.js, and a beautiful responsive frontend.

## ✨ Features

- **Easy File Upload**: Drag & drop or click to upload video/audio files (up to 4.5GB)
- **Multiple Format Support**: MP4, MOV, AVI, MP3, WAV, and more
- **Real-time Progress**: Live updates during transcription process

### 🎯 **Streamlined AI Features**
- **Accurate Transcription**: High-quality speech-to-text conversion
- **📖 Smart Chapters**: Automatically generated content chapters with enhanced navigation
- **🎬 Chapter Navigation**: Click to jump to specific sections with timestamps
- **⚡ Optimized Processing**: Faster transcription with focused features

### 🔍 **JBA Code Detection** (NEW!)
- **Smart AI Detection**: Uses OpenRouter/Claude to find JBA codes in any format
- **Multiple Variations**: Detects "JBA", "J B A", "J.B.A", "JBA-123", "jay bee ay", etc.
- **Precise Timestamps**: Exact timing for each code occurrence
- **Clickable Navigation**: Jump directly to video/audio timestamp
- **Context Awareness**: Shows surrounding text for each code
- **Confidence Scoring**: AI confidence rating for each detection

### 🎥 **Video Playback Integration**
- **Synchronized Player**: Watch video while viewing transcript
- **Timestamp Navigation**: Click any JBA code to jump to that moment
- **Auto-highlighting**: Current JBA codes highlight as video plays
- **Chapter Navigation**: Jump to specific sections
- **Streaming Support**: Efficient video delivery with range requests

### 📚 **Session Management**
- **Local Storage**: All transcriptions saved automatically
- **Session History**: View and reload previous transcriptions
- **Parallel Processing**: Handle multiple files simultaneously
- **Progress Tracking**: Monitor multiple transcriptions at once
- **Quick Access**: One-click to revisit any previous analysis

### 🎨 **Enhanced User Experience**
- **Beautiful Interface**: Modern gradient design with smooth animations
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **Export Options**: Copy to clipboard or download as text file
- **Real-time Highlighting**: JBA codes highlighted in transcript and video
- **Interactive Elements**: Clickable timestamps and code references

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Assembly AI API key (free tier available)

### Installation

1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd simple-transcriptor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```bash
   ASSEMBLYAI_API_KEY=your_assembly_ai_api_key_here
   PORT=3000
   ```

4. **Get your Assembly AI API key**
   - Visit [Assembly AI](https://www.assemblyai.com/)
   - Sign up for a free account
   - Go to your dashboard and copy your API key
   - Paste it in the `.env` file

5. **Build the project**
   ```bash
   npm run build
   ```

6. **Start the server**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to `http://localhost:3000`

## 🎯 Usage

1. **Upload a File**
   - Drag and drop your video/audio file onto the upload area
   - Or click the upload area to browse and select a file
   - Supported formats: MP4, MOV, AVI, MP3, WAV (max 4.5GB)

2. **Start Transcription**
   - Click "Start Transcription" button
   - Monitor real-time progress updates
   - Note the transcription ID for future reference

3. **Review Results**
   - View the complete transcript with confidence scores
   - Navigate through smart chapters with timestamps
   - Jump to specific sections using chapter navigation
   - Explore JBA codes if detected

4. **Export Your Transcript**
   - Copy to clipboard with one click
   - Download as a text file
   - Start a new transcription

## 🛠️ API Endpoints

### POST `/api/transcribe`
Upload and start transcription of a video/audio file.

**Request:** Multipart form data with `video` field containing the file.

**Response:**
```json
{
  "success": true,
  "transcriptionId": "abc123",
  "message": "Transcription started..."
}
```

### GET `/api/transcription/:id`
Get transcription status and results.

**Response:**
```json
{
  "id": "abc123",
  "status": "completed",
  "text": "Your transcribed text here...",
  "confidence": 0.95,
  "words": [...],
  "chapters": [...]
}
```

### GET `/api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🏗️ Project Structure

```
simple-transcriptor/
├── src/                          # Backend TypeScript source
│   ├── server.ts                # Main Express server
│   ├── services/
│   │   └── transcriptionService.ts # Assembly AI integration
│   └── types.ts                 # TypeScript type definitions
├── public/                      # Frontend files
│   ├── index.html              # Main HTML page
│   ├── styles.css              # CSS styles
│   ├── app.ts                  # Frontend TypeScript
│   └── app.js                  # Compiled JavaScript
├── dist/                       # Compiled backend code
├── uploads/                    # Temporary file storage
├── package.json               # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── .gitignore               # Git ignore rules
├── environment.md          # Environment setup guide
└── README.md              # This file
```

## 🎨 Technology Stack

**Backend:**
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **TypeScript** - Type-safe development
- **Assembly AI SDK** - Speech-to-text API
- **Multer** - File upload handling
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

**Frontend:**
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with gradients and animations
- **TypeScript** - Type-safe frontend logic
- **Font Awesome** - Icon library
- **Google Fonts** - Typography (Inter font family)

## 🔧 Development

### Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload
- `npm run watch` - Watch mode for development
- `npm run tunnel` - Start ngrok tunnel for large file processing

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ASSEMBLYAI_API_KEY` | Your Assembly AI API key | Yes |
| `OPENROUTER_API_KEY` | Your OpenRouter API key for JBA detection | No* |
| `PORT` | Server port (default: 3000) | No |

*If not provided, JBA code detection will be disabled but all other features will work normally.

## 📝 File Size Handling


- **Maximum file size**: **4.5GB** 
- **Supported formats**: Video (MP4, MOV, AVI) and Audio (MP3, WAV, MP4, AAC, OGG)
- Files are automatically cleaned up after processing


## 🔒 Security & Privacy

- Environment variables are never exposed to the frontend
- Uploaded files are automatically deleted after processing
- API keys are securely stored in environment variables
- CORS protection enabled
- File type validation prevents malicious uploads

## 🎯 Assembly AI Features

This application leverages Assembly AI's core features for optimal performance:

- **High-Quality Transcription**: Accurate speech-to-text conversion with confidence scoring
- **Smart Auto Chapters**: Automatically segment content into logical chapters (up to 15 chapters)
- **Word-Level Timestamps**: Precise timing for every word in the transcript
- **JBA Code Boosting**: Enhanced recognition for "JBA" variations and related terms
- **Optimized Processing**: Streamlined feature set for faster transcription

## 🐛 Troubleshooting

### Common Issues

1. **"ASSEMBLYAI_API_KEY environment variable is required"**
   - Make sure you've created a `.env` file with your API key
   - Verify the API key is valid and active

2. **File upload fails**
   - Check file size (max 4.5GB)
   - Ensure file format is supported
   - Verify server has write permissions for uploads directory

3. **Transcription stuck in "Processing"**
   - Large files may take several minutes to process
   - Check your Assembly AI account quota and credits
   - Verify internet connectivity

4. **Build errors**
   - Run `npm install` to ensure all dependencies are installed
   - Check Node.js version (requires v16+)

### Getting Help

1. Check the browser console for error messages
2. Review server logs in the terminal
3. Verify your Assembly AI account status and credits
4. Ensure all environment variables are properly set

## 📄 License

MIT License - Feel free to use this project for personal or commercial purposes.

## 🙏 Acknowledgments

- [Assembly AI](https://www.assemblyai.com/) for providing excellent speech-to-text API
- [Font Awesome](https://fontawesome.com/) for beautiful icons
- [Google Fonts](https://fonts.google.com/) for the Inter font family

---

**Happy Transcribing! 🎤✨** 