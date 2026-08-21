const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const db = require('./database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Warn at startup if API key is missing
if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY.trim() === '') {
  console.warn('⚠️  WARNING: OPENROUTER_API_KEY is not set in server/.env');
  console.warn('   AI features will not work until you add your key.');
  console.warn('   Get a free key at: https://openrouter.ai/keys');
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenRouter API helper (OpenAI-compatible /chat/completions)
// ─────────────────────────────────────────────────────────────────────────────
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openrouter/free';

async function callOpenRouter(systemPrompt, userPrompt, timeoutMs = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(OPENROUTER_BASE_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5000',
        'X-Title': 'AI Interview App'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        provider: {
          allow_fallbacks: true
        }
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`OpenRouter API error ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } finally {
    clearTimeout(timer);
  }
}

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype === 'text/plain') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and TXT files are allowed'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Extract text via PyMuPDF (Python) with pdf-parse Node fallback
// ─────────────────────────────────────────────────────────────────────────────
async function extractTextWithPython(filePath) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '..', 'python-analyzer', 'resume_analyzer.py');
    const proc = spawn('python', [pythonScript, filePath]);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        try {
          const parsed = JSON.parse(stdout);
          if (parsed.success && parsed.text) {
            resolve(parsed.text);
          } else {
            reject(new Error(parsed.error || 'Empty text returned'));
          }
        } catch (e) {
          reject(new Error('Failed to parse Python output'));
        }
      } else {
        reject(new Error(`Python exited ${code}: ${stderr}`));
      }
    });

    proc.on('error', (err) => reject(new Error(`Failed to start Python: ${err.message}`)));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Single OpenRouter call — extract resume data + generate 30 questions
// ─────────────────────────────────────────────────────────────────────────────
async function analyzeWithOpenRouter(resumeText, jobRole) {
  const userPrompt = `Analyze the resume below for a candidate applying for the role: "${jobRole}".

Return ONLY a single valid JSON object. No markdown, no explanation, no code fences.

The JSON must exactly match this structure:
{
  "analysis": {
    "skills": [],
    "programming_languages": [],
    "frameworks": [],
    "databases": [],
    "projects": [{"name": "", "description": ""}],
    "experience": [{"role": "", "company": "", "duration": ""}],
    "education": [{"degree": "", "institution": ""}],
    "weak_areas": []
  },
  "questions": {
    "easy": [{"id": "e1", "question": "", "difficulty": "easy", "topic": ""}],
    "medium": [{"id": "m1", "question": "", "difficulty": "medium", "topic": ""}],
    "hard": [{"id": "h1", "question": "", "difficulty": "hard", "topic": ""}]
  }
}

Rules:
- easy: exactly 10 questions (foundational, conceptual)
- medium: exactly 10 questions (applied, problem-solving)
- hard: exactly 10 questions (advanced, architectural, deep dives)
- Make ALL questions specific to THIS candidate's actual resume content
- weak_areas: identify 3-5 gaps or shallow areas visible in the resume

Resume Text:
${resumeText.substring(0, 4000)}`;

  const raw = await callOpenRouter(
    'You are an expert technical interviewer and resume analyst.',
    userPrompt
  );

  // Strip any accidental markdown fences
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      analysis: parsed.analysis || {},
      questions: parsed.questions || { easy: [], medium: [], hard: [] }
    };
  } catch (e) {
    console.error('OpenRouter JSON parse error. Raw snippet:', cleaned.substring(0, 300));
    throw new Error('OpenRouter returned malformed JSON');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Python answer analyzer via persistent Flask microservice
// Falls back gracefully (returns null) if the service is down or too slow.
// ─────────────────────────────────────────────────────────────────────────────
const ANALYZER_URL = 'http://127.0.0.1:5001/analyze';

async function analyzeAnswerWithPython(answerText, question, jobRole = 'Software Developer') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000); // 4-second hard timeout
  try {
    const response = await fetch(ANALYZER_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer: answerText, question, jobRole })
    });
    if (!response.ok) throw new Error(`Analyzer HTTP ${response.status}`);
    return await response.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn('Python analyzer timed out — returning AI-only feedback');
    } else {
      console.warn('Python analyzer unavailable:', err.message);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/upload-resume
// Step 1 of pipeline: extract text only (fast, < 1s)
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/upload-resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let extractedText = '';

    if (req.file.mimetype === 'text/plain') {
      extractedText = req.file.buffer.toString('utf-8');
    } else {
      // PDF: try PyMuPDF via Python, fall back to pdf-parse
      const tempPath = path.join(os.tmpdir(), `resume_${Date.now()}_${req.file.originalname.replace(/[^a-z0-9.]/gi, '_')}`);
      try {
        fs.writeFileSync(tempPath, req.file.buffer);
        extractedText = await extractTextWithPython(tempPath);
        console.log('Text extracted via PyMuPDF');
      } catch (pyErr) {
        console.warn('PyMuPDF failed, falling back to pdf-parse:', pyErr.message);
        const pdfData = await pdfParse(req.file.buffer);
        extractedText = pdfData.text;
      } finally {
        try { fs.unlinkSync(tempPath); } catch (_) {}
      }
    }

    if (!extractedText || extractedText.trim().length < 10) {
      return res.status(400).json({ error: 'Could not extract readable text from the file.' });
    }

    res.json({
      success: true,
      text: extractedText,
      filename: req.file.originalname,
      charCount: extractedText.length
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process file: ' + error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/prepare-interview
// Step 2: Single Gemini call → extract analysis + generate 30 questions → save DB
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/prepare-interview', async (req, res) => {
  try {
    const { resumeText, jobRole, filename } = req.body;

    if (!resumeText || !jobRole) {
      return res.status(400).json({ error: 'resumeText and jobRole are required' });
    }

    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY.trim() === '') {
      return res.status(500).json({ error: 'OpenRouter API key not configured. Please add OPENROUTER_API_KEY to server/.env and restart the server.' });
    }

    console.log(`Preparing interview for role: ${jobRole}`);
    const geminiResult = await analyzeWithOpenRouter(resumeText, jobRole);

    // Save to SQLite
    const sessionId = db.saveSession(
      filename || 'resume',
      jobRole,
      resumeText,
      geminiResult.analysis,
      geminiResult.questions
    );

    console.log(`Session saved to DB: id=${sessionId}`);

    res.json({
      success: true,
      sessionId,
      analysis: geminiResult.analysis,
      questions: geminiResult.questions
    });

  } catch (error) {
    console.error('Prepare interview error:', error);
    res.status(500).json({ error: 'Failed to prepare interview: ' + error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sessions — list all stored sessions
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/sessions', (req, res) => {
  try {
    const sessions = db.getAllSessions();
    res.json({ success: true, sessions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sessions/:id — get a specific session
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/sessions/:id', (req, res) => {
  try {
    const session = db.getSession(parseInt(req.params.id));
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/evaluate-answer — real-time answer feedback via Gemini
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/evaluate-answer', async (req, res) => {
  try {
    const { question, answer, jobRole } = req.body;

    if (!question || !answer || !jobRole) {
      return res.status(400).json({ error: 'question, answer, and jobRole are required' });
    }

    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY.trim() === '') {
      const fallback = generateEnhancedFallbackFeedback(answer, question, null);
      return res.json({ success: true, feedback: fallback });
    }

    const evalUserPrompt = `As an expert interviewer for a ${jobRole} position, evaluate this interview answer.

Question: ${question}
Answer: ${answer}

Return ONLY valid JSON (no markdown) with this structure:
{
  "relevance": { "score": 0-10, "feedback": "" },
  "clarity":   { "score": 0-10, "feedback": "" },
  "depth":     { "score": 0-10, "feedback": "" },
  "overallScore": 0-10,
  "suggestions": ""
}`;

    // Run Python NLP analysis and AI evaluation in TRUE parallel
    const [aiResult, pyResult] = await Promise.allSettled([
      callOpenRouter(
        'You are an expert HR interviewer providing constructive feedback. Be specific and encouraging.',
        evalUserPrompt
      ),
      analyzeAnswerWithPython(answer, question, jobRole)
    ]);

    const advancedAnalysis = pyResult.status === 'fulfilled' ? pyResult.value : null;

    if (aiResult.status === 'fulfilled') {
      try {
        const cleaned = aiResult.value.replace(/```json\n?|```/g, '').trim();
        const aiFeedback = JSON.parse(cleaned);
        const combinedFeedback = combineAnalysisResults(aiFeedback, advancedAnalysis);
        return res.json({ success: true, feedback: combinedFeedback });
      } catch (parseErr) {
        console.error('OpenRouter evaluate parse error:', parseErr.message);
      }
    } else {
      console.error('OpenRouter evaluate error:', aiResult.reason?.message);
    }

    // Fallback if AI failed
    const fallback = generateEnhancedFallbackFeedback(answer, question, advancedAnalysis);
    res.json({ success: true, feedback: fallback });

  } catch (error) {
    console.error('Evaluate answer error:', error);
    const fallback = generateFallbackFeedback(req.body.answer || '', req.body.question || '');
    res.json({ success: true, feedback: fallback });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/generate-solutions — post-interview ideal answers + summary
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/generate-solutions', async (req, res) => {
  try {
    const { questions, answers, jobRole, resumeText } = req.body;

    if (!questions || !answers || !jobRole) {
      return res.status(400).json({ error: 'questions, answers, and jobRole are required' });
    }

    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY.trim() === '') {
      const fallbackSolutions = generateFallbackSolutions(questions, jobRole);
      return res.json({ success: true, solutions: fallbackSolutions });
    }

    // Build summary prompt (runs in parallel with solutions)
    const summaryUserPrompt = `Career coach summary for a ${jobRole} interview (${questions.length} questions).

Q&A:
${questions.map((q, i) => `Q${i + 1}: ${q.question}\nA${i + 1}: ${answers[q.id] || 'No answer'}`).join('\n\n')}

Return ONLY valid JSON:
{
  "overallAssessment": "",
  "strengths": ["", "", ""],
  "improvements": ["", "", ""],
  "actionItems": ["", "", ""],
  "recommendedResources": ["", "", ""]
}`;

    // Helper to call AI for one question
    async function getSolution(question) {
      const userAnswer = answers[question.id] || '';
      const solutionUserPrompt = `Career coach for ${jobRole}. Evaluate this answer briefly.

Q: ${question.question}
A: ${userAnswer || '(no answer)'}

Return ONLY valid JSON:
{"idealAnswer":"","keyPoints":["","",""],"improvements":"","tips":"","score":1}`;

      try {
        const raw = await callOpenRouter(
          'You are an expert career coach. Be concise, specific, and professional.',
          solutionUserPrompt
        );
        const cleaned = raw.replace(/```json\n?|```/g, '').trim();
        const solution = JSON.parse(cleaned);
        return { questionId: question.id, question: question.question, userAnswer, ...solution };
      } catch (err) {
        console.error('Solution error for q:', question.id, err.message);
        return generateFallbackSolution(question, userAnswer, jobRole);
      }
    }

    // Run all solutions in parallel batches of 5 + summary in parallel
    const BATCH_SIZE = 5;
    const solutions = [];
    for (let i = 0; i < questions.length; i += BATCH_SIZE) {
      const batch = questions.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(batch.map(getSolution));
      solutions.push(...batchResults);
    }

    // Summary runs in parallel with the last batch (already kicked off above)
    let overallSummary = {};
    try {
      const raw = await callOpenRouter('You are a senior career coach. Be concise.', summaryUserPrompt);
      const cleaned = raw.replace(/```json\n?|```/g, '').trim();
      overallSummary = JSON.parse(cleaned);
    } catch (err) {
      console.error('Summary generation error:', err.message);
      overallSummary = generateFallbackSummary(jobRole, solutions.length);
    }

    res.json({ success: true, solutions, overallSummary });

  } catch (error) {
    console.error('Generate solutions error:', error);
    const fallbackSolutions = generateFallbackSolutions(req.body.questions || [], req.body.jobRole || 'General');
    res.json({
      success: true,
      solutions: fallbackSolutions,
      overallSummary: generateFallbackSummary(req.body.jobRole || 'General', fallbackSolutions.length)
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Fallback helpers
// ─────────────────────────────────────────────────────────────────────────────
function generateFallbackFeedback(answer, question) {
  const wordCount = answer.split(' ').length;
  const relevanceScore = wordCount < 20 ? 5 : 8;
  const clarityScore = answer.length > 200 ? 8 : 7;
  const depthScore = wordCount < 20 ? 4 : 7;
  const overallScore = Math.round((relevanceScore + clarityScore + depthScore) / 3);

  return {
    relevance: { score: relevanceScore, feedback: wordCount < 20 ? 'Answer could be more comprehensive.' : 'Answer addresses the question well.' },
    clarity: { score: clarityScore, feedback: answer.length > 200 ? 'Response is well-structured.' : 'Response is clear.' },
    depth: { score: depthScore, feedback: wordCount < 20 ? 'Provide more specific examples.' : 'Good level of detail.' },
    overallScore,
    suggestions: wordCount < 20 ? 'Elaborate with specific examples.' : 'Consider adding metrics to strengthen your response.'
  };
}

function combineAnalysisResults(geminiFeedback, advancedAnalysis) {
  if (!advancedAnalysis) return geminiFeedback;
  const combined = {
    ...geminiFeedback,
    advancedAnalysis: {
      overall_score: advancedAnalysis.overall_score || 0,
      sentiment: advancedAnalysis.sentiment || {},
      keywords: advancedAnalysis.keywords || {},
      clarity: advancedAnalysis.clarity || {},
      suitability: advancedAnalysis.suitability || {},
      recommendations: advancedAnalysis.recommendations || []
    },
    enhancedSuggestions: [
      ...(geminiFeedback.suggestions ? [geminiFeedback.suggestions] : []),
      ...(advancedAnalysis.recommendations || [])
    ]
  };
  if (advancedAnalysis.overall_score) {
    combined.overallScore = Math.round((geminiFeedback.overallScore + (advancedAnalysis.overall_score / 10)) / 2);
  }
  return combined;
}

function generateEnhancedFallbackFeedback(answer, question, advancedAnalysis) {
  const basic = generateFallbackFeedback(answer, question);
  if (!advancedAnalysis) return basic;
  const enhanced = {
    ...basic,
    advancedAnalysis: {
      overall_score: advancedAnalysis.overall_score || 0,
      sentiment: advancedAnalysis.sentiment || {},
      keywords: advancedAnalysis.keywords || {},
      clarity: advancedAnalysis.clarity || {},
      suitability: advancedAnalysis.suitability || {},
      recommendations: advancedAnalysis.recommendations || []
    }
  };
  if (advancedAnalysis.overall_score) {
    enhanced.overallScore = Math.round(advancedAnalysis.overall_score / 10);
  }
  if (advancedAnalysis.recommendations?.length > 0) {
    enhanced.suggestions = advancedAnalysis.recommendations.join('. ') + '. ' + enhanced.suggestions;
  }
  return enhanced;
}

function generateFallbackSolution(question, userAnswer, jobRole) {
  const wordCount = (userAnswer || '').split(' ').length;
  return {
    questionId: question.id,
    question: question.question,
    userAnswer,
    idealAnswer: `A strong answer for this ${jobRole} question would include specific examples, relevant skills, and a clear problem-solving approach using the STAR method.`,
    keyPoints: ['Provide specific, concrete examples', 'Demonstrate relevant skills', 'Quantify results where possible'],
    improvements: wordCount < 20 ? 'Elaborate with specific examples.' : 'Add specific metrics to strengthen your response.',
    tips: 'Practice the STAR method for behavioral questions.',
    score: wordCount < 20 ? 5 : 7
  };
}

function generateFallbackSolutions(questions, jobRole) {
  return questions.map(q => generateFallbackSolution(q, '', jobRole));
}

function generateFallbackSummary(jobRole, questionCount) {
  return {
    overallAssessment: `You completed ${questionCount} interview questions for the ${jobRole} position.`,
    strengths: ['Completed the full interview', 'Demonstrated interest in the role', 'Engaged with all questions'],
    improvements: ['Provide more specific examples', 'Elaborate on technical skills', 'Quantify achievements'],
    actionItems: ['Practice the STAR method', 'Prepare 3-5 detailed project examples', 'Research common questions for your role'],
    recommendedResources: ['Mock interview practice', 'Job-specific technical concepts', 'Prepare questions for the interviewer']
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
