# Simple Transcriptor – Implementation Task List

This task list is structured for a solo developer or a small team to build, test, and deliver the Simple Transcriptor application. Tasks are grouped by functional area and ordered roughly in the sequence they should be addressed.  

> **Legend**  
> • **ID** – Unique identifier for tracking  
> • **Priority** – (H)igh, (M)edium, (L)ow  
> • **Status** – To Do / In Progress / Done  
> Feel free to add estimates or assign owners as you execute the project.

---

## 1. Project Setup
Take a look at existing set to to aclimatize yourself
We're working in typescript

## 2. Backend – Core API
| ID | Task | Priority | Status |
|----|------|----------|--------|
| BE-1 | Implement Express server bootstrap (`src/server.ts`) | H | To Do |
| BE-2 | Configure Multer for disk uploads + 4.5 GB limit | H | To Do |
| BE-3 | Add `/api/transcribe` POST endpoint | H | To Do |
| BE-4 | Add `/api/transcription/:id` GET endpoint | H | To Do |
| BE-5 | Add `/api/video/:videoId` streaming endpoint (range support) | M | To Do |
| BE-6 | Implement `/api/health` health-check | M | To Do |
| BE-7 | Integrate AssemblyAI SDK (API key via `.env`) | H | To Do |
| BE-8 | Add retry logic for temporary AssemblyAI errors | M | To Do |
| BE-9 | Store permanent videos in `videos/` with UUID names | M | To Do |
| BE-10 | Implement size-based strategy: direct upload ≤500 MB; URL mode otherwise | M | To Do |

## 3. Backend – Business Services
| ID | Task | Priority | Status |
|----|------|----------|--------|
| BS-1 | Create `TranscriptionService` class | H | To Do |
| BS-2 | Create `SessionManager` for file-based session storage | H | To Do |
| BS-3 | Implement JBA detection service (OpenRouter / Claude) | M | To Do |
| BS-4 | Wire services into API routes | H | To Do |
| BS-5 | Implement temporary-file cleanup utility | M | To Do |
| BS-6 | Add session summary analytics endpoint | L | To Do |

## 4. Frontend – Static Assets
| ID | Task | Priority | Status |
|----|------|----------|--------|
| FE-1 | Build responsive `index.html` layout | H | To Do |
| FE-2 | Implement modern styling in `styles.css` (Inter font + Font Awesome) | M | To Do |
| FE-3 | Develop TypeScript front-end logic (`public/app.ts`) | H | To Do |
| FE-4 | Implement drag-and-drop upload UI | M | To Do |
| FE-5 | Display real-time upload & processing status | M | To Do |
| FE-6 | Build transcript viewer with highlighted JBA codes | M | To Do |
| FE-7 | Integrate HTML5 video player with transcript sync | M | To Do |
| FE-8 | Implement session history dashboard | L | To Do |
| FE-9 | Provide export buttons (copy / download transcript & codes) | L | To Do |

## 5. Frontend – Advanced Features
| ID | Task | Priority | Status |
|----|------|----------|--------|
| AF-1 | Render speaker diarization results | L | To Do |
| AF-2 | Render auto-chapters | L | To Do |
| AF-3 | Render highlights & entities panels | L | To Do |
| AF-4 | Implement collapsible JBA panel with CRUD (add/edit/delete) | L | To Do |

## 6. Environment & Configuration
| ID | Task | Priority | Status |
|----|------|----------|--------|
| EC-1 | Document required `.env` variables in `environment.md` | H | To Do |
| EC-2 | Add `npm run dev` (tsx) and `npm run build` scripts | H | To Do |
| EC-3 | Add `npm run tunnel` script for ngrok | L | To Do |

## 7. Testing & QA
| ID | Task | Priority | Status |
|----|------|----------|--------|
| QA-1 | Manual test upload ≤500 MB file (direct) | H | To Do |
| QA-2 | Manual test upload >500 MB file with ngrok (URL mode) | M | To Do |
| QA-3 | Verify transcript text, chapters, speakers, entities | M | To Do |
| QA-4 | Verify JBA detection accuracy & timestamp navigation | M | To Do |
| QA-5 | Test error scenarios (unsupported file, API outage) | L | To Do |

## 8. Documentation
| ID | Task | Priority | Status |
|----|------|----------|--------|
| DOC-1 | Finalize `README.md` with setup & usage instructions | H | To Do |
| DOC-2 | Update `environment.md` with troubleshooting tips | M | To Do |
| DOC-3 | Add inline docstrings to all functions/classes | L | To Do |

## 9. Deployment (Optional)
| ID | Task | Priority | Status |
|----|------|----------|--------|
| DEP-1 | Package app with PM2 or systemd service | L | To Do |
| DEP-2 | Create Dockerfile for containerized deployment | L | To Do |
| DEP-3 | Provision cloud VM / object storage (future scaling) | L | To Do |

---

### Execution Notes
1. **Solo laptop workflow** – Complete sections 1→7; deployment tasks are optional.  
2. **Large file handling** – If you rarely process >500 MB, defer AF-2 and deployment storage tasks.  
3. **Iterative development** – Mark tasks as *In Progress* / *Done* as you implement features.  
4. **Refactor allowance** – Budget time for code cleanup after core flow is stable.  

---

Happy building! 🎤✨ 