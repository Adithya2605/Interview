const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const OpenAI = require('openai');
const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Helper function to run Python resume analyzer
async function analyzeResumeWithPython(text, jobRole = 'Software Developer') {
  return new Promise((resolve, reject) => {
    const pythonPath = path.join(__dirname, '..', 'python-analyzer', 'resume_analyzer.py');
    const pythonProcess = spawn('python', [pythonPath, text, jobRole]);
    
    let result = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const analysis = JSON.parse(result);
          resolve(analysis);
        } catch (parseError) {
          reject(new Error('Failed to parse Python analysis result'));
        }
      } else {
        reject(new Error(`Python analysis failed: ${error}`));
      }
    });

    pythonProcess.on('error', (err) => {
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });
  });
}

// Helper function to run Python answer analyzer
async function analyzeAnswerWithPython(answerText, question, jobRole = 'Software Developer') {
  return new Promise((resolve, reject) => {
    const pythonPath = path.join(__dirname, '..', 'python-analyzer', 'answer_analyzer.py');
    const pythonProcess = spawn('python', [pythonPath, answerText, question, jobRole]);
    
    let result = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const analysis = JSON.parse(result);
          resolve(analysis);
        } catch (parseError) {
          reject(new Error('Failed to parse Python answer analysis result'));
        }
      } else {
        reject(new Error(`Python answer analysis failed: ${error}`));
      }
    });

    pythonProcess.on('error', (err) => {
      reject(new Error(`Failed to start Python answer analysis process: ${err.message}`));
    });
  });
}

// Extract text from uploaded resume with advanced analysis
app.post('/api/upload-resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let extractedText = '';

    if (req.file.mimetype === 'application/pdf') {
      const pdfData = await pdfParse(req.file.buffer);
      extractedText = pdfData.text;
    } else if (req.file.mimetype === 'text/plain') {
      extractedText = req.file.buffer.toString('utf-8');
    }

    // Perform advanced resume analysis with Python
    let analysis = null;
    try {
      analysis = await analyzeResumeWithPython(extractedText);
      console.log('Advanced resume analysis completed successfully');
    } catch (analysisError) {
      console.warn('Python analysis failed, using basic extraction:', analysisError.message);
      // Fallback to basic analysis
      analysis = {
        skills: { general: ['Basic text extraction'] },
        education: [],
        experience_years: 0,
        contact_info: {},
        entities: {},
        suitability: { suitable: true, confidence: 0.5, reason: 'Basic analysis' },
        overall_score: 50,
        error: 'Advanced analysis unavailable'
      };
    }

    res.json({ 
      success: true, 
      text: extractedText,
      filename: req.file.originalname,
      analysis: analysis
    });
  } catch (error) {
    console.error('Error processing resume:', error);
    res.status(500).json({ error: 'Failed to process resume' });
  }
});

// Advanced resume analysis with job role context
app.post('/api/analyze-resume-advanced', async (req, res) => {
  try {
    const { resumeText, jobRole } = req.body;

    if (!resumeText || !jobRole) {
      return res.status(400).json({ error: 'Resume text and job role are required' });
    }

    try {
      const analysis = await analyzeResumeWithPython(resumeText, jobRole);
      res.json({ 
        success: true, 
        analysis: analysis,
        jobRole: jobRole
      });
    } catch (analysisError) {
      console.warn('Advanced analysis failed:', analysisError.message);
      // Return basic fallback analysis
      res.json({
        success: true,
        analysis: {
          skills: { general: ['Basic analysis available'] },
          education: [],
          experience_years: 0,
          contact_info: {},
          entities: {},
          suitability: { suitable: true, confidence: 0.5, reason: 'Fallback analysis' },
          overall_score: 50,
          error: 'Advanced analysis unavailable'
        },
        jobRole: jobRole
      });
    }
  } catch (error) {
    console.error('Error in advanced resume analysis:', error);
    res.status(500).json({ error: 'Failed to analyze resume' });
  }
});

// Generate interview questions based on resume and job role
app.post('/api/generate-questions', async (req, res) => {
  try {
    const { resumeText, jobRole } = req.body;

    if (!resumeText || !jobRole) {
      return res.status(400).json({ error: 'Resume text and job role are required' });
    }

    // Check if OpenAI API key is properly configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      console.log('OpenAI API key not configured, using fallback questions');
      const fallbackQuestions = generateFallbackQuestions(jobRole);
      return res.json({ success: true, questions: fallbackQuestions });
    }

    const prompt = `Based on the following resume and job role, generate 5 personalized interview questions that are relevant, challenging, and appropriate for the position.

Resume Content:
${resumeText}

Job Role: ${jobRole}

Please generate questions that:
1. Test technical skills relevant to the role
2. Assess experience mentioned in the resume
3. Evaluate problem-solving abilities
4. Check cultural fit and motivation
5. Explore specific projects or achievements mentioned

Return the questions as a JSON array with each question having an 'id' and 'question' field.`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert HR interviewer. Generate thoughtful, relevant interview questions based on the candidate's resume and desired job role. Return only valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      const questionsText = completion.choices[0].message.content;
      const questions = JSON.parse(questionsText);
      res.json({ success: true, questions });
    } catch (openaiError) {
      console.error('OpenAI API Error:', openaiError.message);
      // Fallback to role-specific questions if OpenAI fails
      const fallbackQuestions = generateFallbackQuestions(jobRole);
      res.json({ success: true, questions: fallbackQuestions });
    }
  } catch (error) {
    console.error('Error generating questions:', error);
    const fallbackQuestions = generateFallbackQuestions(req.body.jobRole || 'General');
    res.json({ success: true, questions: fallbackQuestions });
  }
});

// Helper function to generate fallback questions based on job role
function generateFallbackQuestions(jobRole) {
  const questionSets = {
    'Frontend Developer': [
      { id: 1, question: "What's your experience with React, Vue, or Angular? Which do you prefer and why?" },
      { id: 2, question: "How do you ensure cross-browser compatibility in your applications?" },
      { id: 3, question: "Describe a challenging UI/UX problem you've solved recently." },
      { id: 4, question: "How do you optimize web application performance?" },
      { id: 5, question: "What's your approach to responsive design and mobile-first development?" }
    ],
    'Backend Developer': [
      { id: 1, question: "What's your experience with server-side technologies like Node.js, Python, or Java?" },
      { id: 2, question: "How do you design and implement RESTful APIs?" },
      { id: 3, question: "Describe your experience with databases and data modeling." },
      { id: 4, question: "How do you handle error handling and logging in your applications?" },
      { id: 5, question: "What's your approach to API security and authentication?" }
    ],
    'Full Stack Developer': [
      { id: 1, question: "How do you balance frontend and backend development responsibilities?" },
      { id: 2, question: "Describe a full-stack project you've built from scratch." },
      { id: 3, question: "How do you ensure seamless communication between frontend and backend?" },
      { id: 4, question: "What's your experience with deployment and DevOps practices?" },
      { id: 5, question: "How do you stay updated with both frontend and backend technologies?" }
    ],
    'Product Manager': [
      { id: 1, question: "How do you prioritize features in a product roadmap?" },
      { id: 2, question: "Describe your experience with user research and data analysis." },
      { id: 3, question: "How do you work with engineering teams to deliver products?" },
      { id: 4, question: "Tell me about a time you had to make a difficult product decision." },
      { id: 5, question: "How do you measure product success and user satisfaction?" }
    ],
    'UI/UX Designer': [
      { id: 1, question: "Walk me through your design process from concept to final product." },
      { id: 2, question: "How do you conduct user research and incorporate feedback?" },
      { id: 3, question: "Describe a design challenge you faced and how you solved it." },
      { id: 4, question: "What tools do you use for prototyping and design collaboration?" },
      { id: 5, question: "How do you ensure accessibility in your designs?" }
    ]
  };

  return questionSets[jobRole] || [
    { id: 1, question: "Tell me about yourself and your professional background." },
    { id: 2, question: "What interests you most about this role and our company?" },
    { id: 3, question: "Describe a challenging project you've worked on recently." },
    { id: 4, question: "How do you handle working under pressure and tight deadlines?" },
    { id: 5, question: "Where do you see yourself in your career in the next 5 years?" }
  ];
}

// Provide enhanced feedback on user's answer with advanced Python analysis
app.post('/api/evaluate-answer', async (req, res) => {
  try {
    const { question, answer, jobRole } = req.body;

    if (!question || !answer || !jobRole) {
      return res.status(400).json({ error: 'Question, answer, and job role are required' });
    }

    // Run advanced Python analysis first
    let advancedAnalysis = null;
    try {
      console.log('Running advanced Python answer analysis...');
      advancedAnalysis = await analyzeAnswerWithPython(answer, question, jobRole);
      console.log('Advanced analysis completed successfully');
    } catch (pythonError) {
      console.error('Python analysis failed:', pythonError.message);
      // Continue with OpenAI analysis even if Python fails
    }

    // Check if OpenAI API key is properly configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      console.log('OpenAI API key not configured, using enhanced fallback feedback');
      const enhancedFallback = generateEnhancedFallbackFeedback(answer, question, advancedAnalysis);
      return res.json({ success: true, feedback: enhancedFallback });
    }

    const prompt = `As an expert interviewer for a ${jobRole} position, evaluate the following interview answer:

Question: ${question}
Answer: ${answer}

Please provide feedback on:
1. Relevance: How well does the answer address the question?
2. Clarity: How clear and well-structured is the response?
3. Depth: How detailed and insightful is the answer?

Provide constructive feedback and suggestions for improvement. Also give an overall score out of 10.

Return the response as JSON with the following structure:
{
  "relevance": { "score": number, "feedback": "string" },
  "clarity": { "score": number, "feedback": "string" },
  "depth": { "score": number, "feedback": "string" },
  "overallScore": number,
  "suggestions": "string"
}`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert HR interviewer providing constructive feedback on interview answers. Be helpful, specific, and encouraging while pointing out areas for improvement."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 800
      });

      const feedbackText = completion.choices[0].message.content;
      const openAIFeedback = JSON.parse(feedbackText);
      
      // Combine OpenAI feedback with advanced analysis
      const combinedFeedback = combineAnalysisResults(openAIFeedback, advancedAnalysis);
      res.json({ success: true, feedback: combinedFeedback });
      
    } catch (openaiError) {
      console.error('OpenAI API Error:', openaiError.message);
      // Use enhanced fallback with Python analysis if available
      const enhancedFallback = generateEnhancedFallbackFeedback(answer, question, advancedAnalysis);
      res.json({ success: true, feedback: enhancedFallback });
    }
  } catch (error) {
    console.error('Error evaluating answer:', error);
    const fallbackFeedback = generateFallbackFeedback(req.body.answer || '', req.body.question || '');
    res.json({ success: true, feedback: fallbackFeedback });
  }
});

// Helper function to generate basic feedback when OpenAI is not available
function generateFallbackFeedback(answer, question) {
  const answerLength = answer.length;
  const wordCount = answer.split(' ').length;
  
  let relevanceScore = 7;
  let clarityScore = 7;
  let depthScore = 6;
  
  // Basic scoring based on answer length and content
  if (wordCount < 20) {
    depthScore = 4;
    relevanceScore = 5;
  } else if (wordCount > 100) {
    depthScore = 8;
    relevanceScore = 8;
  }
  
  if (answerLength > 200) {
    clarityScore = 8;
  }
  
  const overallScore = Math.round((relevanceScore + clarityScore + depthScore) / 3);
  
  return {
    relevance: { 
      score: relevanceScore, 
      feedback: wordCount < 20 ? "Your answer could be more comprehensive in addressing the question." : "Your answer addresses the question well." 
    },
    clarity: { 
      score: clarityScore, 
      feedback: answerLength > 200 ? "Your response is well-structured and clear." : "The response is clear and understandable." 
    },
    depth: { 
      score: depthScore, 
      feedback: wordCount < 20 ? "Consider providing more specific examples and details." : "Good level of detail in your response." 
    },
    overallScore: overallScore,
    suggestions: wordCount < 20 ? 
      "Try to provide more detailed examples and elaborate on your experience." : 
      "Great answer! Consider adding specific metrics or outcomes where relevant."
  };
}

// Helper function to combine OpenAI feedback with advanced Python analysis
function combineAnalysisResults(openAIFeedback, advancedAnalysis) {
  if (!advancedAnalysis) {
    return openAIFeedback;
  }

  // Enhanced feedback combining both analyses
  const combinedFeedback = {
    ...openAIFeedback,
    advancedAnalysis: {
      overall_score: advancedAnalysis.overall_score || 0,
      sentiment: advancedAnalysis.sentiment || {},
      keywords: advancedAnalysis.keywords || {},
      clarity: advancedAnalysis.clarity || {},
      suitability: advancedAnalysis.suitability || {},
      recommendations: advancedAnalysis.recommendations || []
    },
    enhancedSuggestions: [
      ...(openAIFeedback.suggestions ? [openAIFeedback.suggestions] : []),
      ...(advancedAnalysis.recommendations || [])
    ]
  };

  // Update scores based on advanced analysis if available
  if (advancedAnalysis.overall_score) {
    combinedFeedback.overallScore = Math.round((openAIFeedback.overallScore + (advancedAnalysis.overall_score / 10)) / 2);
  }

  return combinedFeedback;
}

// Helper function to generate enhanced fallback feedback with Python analysis
function generateEnhancedFallbackFeedback(answer, question, advancedAnalysis) {
  const basicFeedback = generateFallbackFeedback(answer, question);
  
  if (!advancedAnalysis) {
    return basicFeedback;
  }

  // Enhance basic feedback with advanced analysis
  const enhancedFeedback = {
    ...basicFeedback,
    advancedAnalysis: {
      overall_score: advancedAnalysis.overall_score || 0,
      sentiment: advancedAnalysis.sentiment || {},
      keywords: advancedAnalysis.keywords || {},
      clarity: advancedAnalysis.clarity || {},
      suitability: advancedAnalysis.suitability || {},
      recommendations: advancedAnalysis.recommendations || []
    }
  };

  // Update overall score if advanced analysis is available
  if (advancedAnalysis.overall_score) {
    enhancedFeedback.overallScore = Math.round(advancedAnalysis.overall_score / 10);
  }

  // Add advanced recommendations
  if (advancedAnalysis.recommendations && advancedAnalysis.recommendations.length > 0) {
    enhancedFeedback.suggestions = advancedAnalysis.recommendations.join('. ') + '. ' + enhancedFeedback.suggestions;
  }

  return enhancedFeedback;
}

// Generate ideal answers and solutions after interview completion
app.post('/api/generate-solutions', async (req, res) => {
  try {
    const { questions, answers, jobRole, resumeText } = req.body;

    if (!questions || !answers || !jobRole) {
      return res.status(400).json({ error: 'Questions, answers, and job role are required' });
    }

    // Check if OpenAI API key is properly configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      console.log('OpenAI API key not configured, using fallback solutions');
      const fallbackSolutions = generateFallbackSolutions(questions, jobRole);
      return res.json({ success: true, solutions: fallbackSolutions });
    }

    const solutions = [];

    // Generate ideal answers for each question
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const userAnswer = answers[question.id] || '';

      const prompt = `As an expert interviewer for a ${jobRole} position, provide an ideal answer and improvement recommendations for the following interview question:

Question: ${question.question}
User's Answer: ${userAnswer}
Job Role: ${jobRole}
${resumeText ? `Resume Context: ${resumeText.substring(0, 500)}...` : ''}

Please provide:
1. An ideal/exemplary answer that demonstrates best practices
2. Key points that should be covered in a strong response
3. Specific improvement suggestions based on the user's answer
4. Additional tips for answering similar questions

Return the response as JSON with the following structure:
{
  "idealAnswer": "string",
  "keyPoints": ["point1", "point2", "point3"],
  "improvements": "string",
  "tips": "string",
  "score": number (1-10 rating of user's answer)
}`;

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are an expert career coach and interviewer. Provide constructive, actionable advice to help candidates improve their interview performance. Be specific, encouraging, and professional."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.4,
          max_tokens: 1200
        });

        const solutionText = completion.choices[0].message.content;
        const solution = JSON.parse(solutionText);
        
        solutions.push({
          questionId: question.id,
          question: question.question,
          userAnswer: userAnswer,
          ...solution
        });
      } catch (openaiError) {
        console.error('OpenAI API Error for question:', question.id, openaiError.message);
        // Fallback solution for this specific question
        solutions.push(generateFallbackSolution(question, userAnswer, jobRole));
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Generate overall interview summary
    const overallPrompt = `Based on the following interview session for a ${jobRole} position, provide an overall performance summary and career development recommendations:

Job Role: ${jobRole}
Number of Questions: ${questions.length}
Questions and Answers: ${questions.map((q, i) => `Q${i+1}: ${q.question}\nA${i+1}: ${answers[q.id] || 'No answer provided'}`).join('\n\n')}

Provide:
1. Overall performance assessment
2. Top 3 strengths demonstrated
3. Top 3 areas for improvement
4. Specific action items for career development
5. Resources or skills to focus on

Return as JSON:
{
  "overallAssessment": "string",
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "actionItems": ["action1", "action2", "action3"],
  "recommendedResources": ["resource1", "resource2", "resource3"]
}`;

    let overallSummary = {};
    try {
      const summaryCompletion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a senior career coach providing comprehensive interview feedback and development recommendations."
          },
          {
            role: "user",
            content: overallPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      overallSummary = JSON.parse(summaryCompletion.choices[0].message.content);
    } catch (summaryError) {
      console.error('Error generating overall summary:', summaryError.message);
      overallSummary = generateFallbackSummary(jobRole, solutions.length);
    }

    res.json({ 
      success: true, 
      solutions: solutions,
      overallSummary: overallSummary
    });

  } catch (error) {
    console.error('Error generating solutions:', error);
    const fallbackSolutions = generateFallbackSolutions(req.body.questions || [], req.body.jobRole || 'General');
    const fallbackSummary = generateFallbackSummary(req.body.jobRole || 'General', req.body.questions?.length || 0);
    res.json({ 
      success: true, 
      solutions: fallbackSolutions,
      overallSummary: fallbackSummary
    });
  }
});

// Helper function to generate fallback solutions
function generateFallbackSolution(question, userAnswer, jobRole) {
  const wordCount = userAnswer.split(' ').length;
  
  return {
    questionId: question.id,
    question: question.question,
    userAnswer: userAnswer,
    idealAnswer: `A strong answer for this ${jobRole} question would include specific examples from your experience, demonstrate relevant skills, and show your problem-solving approach. Consider using the STAR method (Situation, Task, Action, Result) to structure your response.`,
    keyPoints: [
      "Provide specific, concrete examples",
      "Demonstrate relevant technical/soft skills",
      "Show problem-solving methodology",
      "Quantify results where possible"
    ],
    improvements: wordCount < 20 ? 
      "Your answer could be more detailed. Try to elaborate with specific examples and explain your thought process." :
      "Good level of detail. Consider adding more specific metrics or outcomes to strengthen your response.",
    tips: "Practice the STAR method for behavioral questions and prepare specific examples that highlight your key achievements.",
    score: wordCount < 20 ? 5 : 7
  };
}

function generateFallbackSolutions(questions, jobRole) {
  return questions.map(question => 
    generateFallbackSolution(question, '', jobRole)
  );
}

function generateFallbackSummary(jobRole, questionCount) {
  return {
    overallAssessment: `You completed ${questionCount} interview questions for the ${jobRole} position. Focus on providing more detailed, specific examples in your responses.`,
    strengths: [
      "Completed the full interview process",
      "Demonstrated interest in the role",
      "Engaged with all questions"
    ],
    improvements: [
      "Provide more specific examples",
      "Elaborate on technical skills",
      "Quantify achievements with metrics"
    ],
    actionItems: [
      "Practice the STAR method for behavioral questions",
      "Prepare 3-5 detailed project examples",
      "Research common questions for your target role"
    ],
    recommendedResources: [
      "Practice mock interviews",
      "Review job-specific technical concepts",
      "Prepare questions to ask the interviewer"
    ]
  };
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
