# Environment Configuration

To run the Simple Transcriptor application, you need to set up your environment variables.

## Required Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
ASSEMBLYAI_API_KEY=your_assembly_ai_api_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here
PUBLIC_BASE_URL=https://your-public-url.ngrok.io
PORT=3000
```

## Getting Your API Keys

### Assembly AI API Key
1. Go to [Assembly AI](https://www.assemblyai.com/)
2. Sign up for a free account
3. Navigate to your dashboard
4. Copy your API key

### OpenRouter API Key (for JBA code detection)
1. Go to [OpenRouter](https://openrouter.ai/)
2. Sign up for an account
3. Navigate to your dashboard
4. Copy your API key
5. **Note**: This is optional - if not provided, JBA detection will be disabled

### Public Base URL (for large files > 500MB)
For files larger than 500MB, the app uses URL-based transcription instead of direct upload to avoid timeouts.

**Option 1: Using ngrok (Recommended for development)**
1. Install ngrok: `npm install -g ngrok` or download from [ngrok.com](https://ngrok.com/)
2. Start your server: `npm run dev`
3. In another terminal, run: `ngrok http 3000`
4. Copy the https URL (e.g., `https://abc123.ngrok.io`)
5. Set `PUBLIC_BASE_URL=https://abc123.ngrok.io` in your `.env` file
6. Restart your server

**Option 2: Deploy to cloud (Production)**
- Deploy to Heroku, Railway, or another cloud platform
- Set `PUBLIC_BASE_URL` to your deployed app's URL

## Example .env File

```bash
ASSEMBLYAI_API_KEY=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567
OPENROUTER_API_KEY=sk-or-v1-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567
PUBLIC_BASE_URL=https://abc123.ngrok.io
PORT=3000
```

**Important:** Never commit your `.env` file to version control. It's already added to `.gitignore` for security.

## Local Storage

The application now uses **file-based local storage** instead of browser localStorage:

- **Sessions**: Stored in `data/sessions.json`
- **Videos**: Stored permanently in `videos/` directory  
- **Metadata**: Linked via unique IDs for each transcription

This ensures:
- ✅ **Persistence** across browser sessions and restarts
- ✅ **No storage limits** (not constrained by browser limits)
- ✅ **Backup-friendly** (all data in project directory)
- ✅ **Shareable** (copy data/ and videos/ folders to share)

## Debugging

To debug session management:
1. Check `data/sessions.json` for session data
2. Visit `/api/sessions-summary` for session statistics
3. Check server console for session management logs 