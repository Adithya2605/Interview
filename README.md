# AI Interview App

A comprehensive AI-powered interview preparation application built with React, Node.js, OpenRouter AI, and Python. Upload your resume, select a job role, and receive personalized interview questions with intelligent, multi-layered feedback.

## Features

- **Resume Upload**: Support for PDF and TXT files with automatic text extraction via PyMuPDF (with pdf-parse fallback)
- **Job Role Selection**: Choose from popular tech and business roles
- **AI-Generated Questions**: 30 personalized questions (10 easy / 10 medium / 10 hard) based on your resume and target role — generated in a single API call
- **Resume Analysis**: Automatic extraction of skills, programming languages, frameworks, databases, projects, experience, education, and weak areas
- **Real-time Feedback**: Get detailed AI + NLP feedback on relevance, clarity, and depth of your answers
- **Post-Interview Solutions**: Ideal answers, key points, scoring, and career-coach-style summary after completing a session
- **Session Persistence**: Interview sessions stored in a local SQLite database (server-side) and browsable via session history
- **Modern UI**: Responsive design with Tailwind CSS and component-based React architecture

## Tech Stack

### Frontend
- React 18
- Tailwind CSS
- Axios for API calls
- Lucide React for icons
- React Router for navigation

### Backend
- Node.js with Express
- **OpenRouter API** (OpenAI-compatible — supports any model via `openrouter.ai`)
- **SQLite** via `better-sqlite3` for persistent session storage
- Multer for file uploads
- PDF-Parse for PDF text extraction (Node.js fallback)
- CORS enabled

### Python Analyzer (`python-analyzer/`)
- **`resume_analyzer.py`** — Fast PDF/TXT text extraction using PyMuPDF (fitz), with PyPDF2 fallback
- **`answer_analyzer.py`** — NLP-based answer analysis using spaCy, TextBlob, NLTK, and scikit-learn; runs in parallel with AI evaluation

## Prerequisites

- Node.js (v16 or higher)
- Python 3.8+
- OpenRouter API key (free tier available at [openrouter.ai/keys](https://openrouter.ai/keys))
- npm or yarn package manager

## Installation

1. **Clone and navigate to the project**
   ```bash
   cd Interview
   ```

2. **Install all Node.js dependencies**
   ```bash
   npm run install-all
   ```

3. **Install Python dependencies**
   ```bash
   pip install -r python-analyzer/requirements.txt
   python -m spacy download en_core_web_sm
   ```

4. **Set up environment variables**

   Create a `.env` file in the `server/` directory:
   ```env
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   OPENROUTER_MODEL=openrouter/free
   PORT=5000
   ```

   > **Note:** `OPENROUTER_MODEL` defaults to `openrouter/free` if not set. You can specify any model available on OpenRouter (e.g. `google/gemini-flash-1.5`, `meta-llama/llama-3-8b-instruct`).

## Running the Application

### Development Mode
Run both frontend and backend concurrently:
```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:5000`
- Frontend React app on `http://localhost:3000`

### Individual Services
```bash
# Run only backend
npm run server

# Run only frontend
npm run client
```

## Usage

1. **Upload Resume**: Upload your resume in PDF or TXT format
2. **Select Role**: Choose the job role you're interviewing for
3. **AI Preparation**: A single OpenRouter call analyzes your resume and generates 30 tailored questions (easy / medium / hard)
4. **Answer Questions**: Respond to the personalized interview questions
5. **Get Feedback**: Receive real-time AI + NLP feedback on each answer
6. **Review Solutions**: After completing the interview, view ideal answers, scoring, and a career-coach summary
7. **Session History**: Browse past interview sessions stored in the local database

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload-resume` | Upload resume file; returns extracted text |
| `POST` | `/api/prepare-interview` | Analyze resume + generate 30 questions via OpenRouter; saves session to DB |
| `POST` | `/api/evaluate-answer` | Real-time AI + NLP feedback on a single answer |
| `POST` | `/api/generate-solutions` | Post-interview ideal answers and career-coach summary |
| `GET`  | `/api/sessions` | List all stored interview sessions (most recent 50) |
| `GET`  | `/api/sessions/:id` | Fetch a specific session by ID |
| `GET`  | `/api/health` | Server health check |

## Project Structure

```
Interview/
├── client/                       # React frontend
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── components/
│       │   ├── AdvancedAnswerFeedback.js   # Multi-metric feedback display
│       │   ├── Header.js
│       │   ├── InterviewSession.js         # Core interview Q&A flow
│       │   ├── InterviewSolutions.js       # Post-interview review
│       │   ├── JobRoleSelection.js         # Role picker + AI preparation trigger
│       │   ├── ResumeAnalysisDisplay.js    # Skills, experience, weak areas
│       │   ├── ResumeUpload.js
│       │   └── SessionHistory.js
│       ├── App.js                # App state & routing (upload→role→interview→solutions)
│       └── index.js
├── server/                       # Express backend
│   ├── data/                     # SQLite database files (auto-created)
│   │   └── interviews.db
│   ├── database.js               # better-sqlite3 session storage
│   ├── index.js                  # API routes + OpenRouter integration
│   ├── .env                      # API keys (not committed)
│   └── package.json
├── python-analyzer/              # Python NLP microservice
│   ├── resume_analyzer.py        # PDF/TXT text extraction (PyMuPDF)
│   ├── answer_analyzer.py        # NLP answer scoring (spaCy, NLTK, TextBlob)
│   ├── requirements.txt
│   └── setup.py
├── package.json                  # Root scripts (dev, install-all, build)
└── README.md
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENROUTER_API_KEY` | Your OpenRouter API key | Yes |
| `OPENROUTER_MODEL` | Model to use (default: `openrouter/free`) | No |
| `PORT` | Server port (default: `5000`) | No |

## Features in Detail

### Resume Processing Pipeline
1. File uploaded via Multer (PDF or TXT, max 5 MB)
2. **PDF extraction**: PyMuPDF (Python) is tried first for accuracy; falls back to `pdf-parse` (Node.js) if unavailable
3. Extracted text is returned to the client immediately (fast, < 1s)

### AI Integration (OpenRouter)
- **Single unified call** in `POST /api/prepare-interview`: analyzes the resume AND generates 30 questions in one request
- **Model-agnostic**: configure any model on OpenRouter via `OPENROUTER_MODEL`
- `POST /api/evaluate-answer` and `POST /api/generate-solutions` run AI and Python NLP in parallel for speed
- Graceful fallbacks if the API key is missing or the model returns malformed JSON

### Answer Evaluation
- AI evaluation (OpenRouter) and Python NLP analysis (`answer_analyzer.py`) run **in parallel** via `Promise.allSettled`
- Results are combined: AI scores merged with NLP sentiment, keyword coverage, clarity metrics, and suitability scoring

### Session Storage (SQLite)
- Sessions are persisted server-side in `server/data/interviews.db` using `better-sqlite3`
- Stores: filename, job role, full resume text, AI analysis JSON, and generated questions JSON
- WAL mode enabled for better concurrent read performance

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License — see LICENSE file for details

## Support

For issues and questions:
1. Check the troubleshooting section below
2. Create an issue on GitHub

## Troubleshooting

### Common Issues

**OpenRouter API Errors**
- Ensure `OPENROUTER_API_KEY` is set in `server/.env`
- Get a free key at [openrouter.ai/keys](https://openrouter.ai/keys)
- Check your account has sufficient credits for paid models (the `openrouter/free` default requires no credits)

**Python Extraction Fails**
- Install dependencies: `pip install -r python-analyzer/requirements.txt`
- If PyMuPDF is unavailable, the server automatically falls back to `pdf-parse`
- Ensure Python 3.8+ is on your PATH

**File Upload Issues**
- Verify file format is PDF or TXT
- Check file size is under 5 MB
- Ensure proper file permissions

**SQLite / Database Errors**
- The `server/data/` directory is created automatically on first run
- If the DB is corrupted, delete `server/data/interviews.db` and restart the server

**Build Errors**
- Run `npm run install-all` to ensure all dependencies are installed
- Clear `node_modules` and reinstall if needed
- Check Node.js version (v16+) and Python version (3.8+) compatibility

### Development Tips

- Use browser dev tools to monitor network requests
- Check server console logs for detailed error messages (OpenRouter responses are logged on parse failures)
- Monitor OpenRouter usage at [openrouter.ai](https://openrouter.ai) to track model costs
- The `OPENROUTER_MODEL` env var can be hot-swapped without code changes
