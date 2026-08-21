import React, { useState } from 'react';
import { MessageCircle, Send, CheckCircle, AlertCircle, BarChart3, Brain } from 'lucide-react';
import axios from 'axios';
import AdvancedAnswerFeedback from './AdvancedAnswerFeedback';

const DIFFICULTY_CONFIG = {
  easy:   { label: 'Easy',   color: 'bg-green-100 text-green-700 border-green-300',  ring: 'ring-green-400',  badge: 'bg-green-500', count: 10 },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-300', ring: 'ring-yellow-400', badge: 'bg-yellow-500', count: 10 },
  hard:   { label: 'Hard',   color: 'bg-red-100 text-red-700 border-red-300',        ring: 'ring-red-400',    badge: 'bg-red-500',    count: 10 },
};

const InterviewSession = ({ resumeData, jobRole, sessionData, onComplete }) => {
  // sessionData = { sessionId, analysis, questions: { easy:[], medium:[], hard:[] } }

  const [difficulty, setDifficulty] = useState(null);         // null = picker screen
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [feedback, setFeedback] = useState({});
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [error, setError] = useState('');

  // ── Difficulty picker ───────────────────────────────────────────────────
  const startWithDifficulty = (diff) => {
    const qs = sessionData?.questions?.[diff] || [];
    if (qs.length === 0) {
      setError(`No ${diff} questions found. Please try a different difficulty.`);
      return;
    }
    setDifficulty(diff);
    setQuestions(qs);
    setCurrentIndex(0);
    setAnswers({});
    setFeedback({});
    setCurrentAnswer('');
    setSessionComplete(false);
    setError('');
  };

  // ── Answer submission ───────────────────────────────────────────────────
  const submitAnswer = async () => {
    if (!currentAnswer.trim()) return;

    setSubmitting(true);
    const currentQuestion = questions[currentIndex];
    const updatedAnswers = { ...answers, [currentQuestion.id]: currentAnswer };
    setAnswers(updatedAnswers);

    try {
      const response = await axios.post('http://localhost:5000/api/evaluate-answer', {
        question: currentQuestion.question,
        answer: currentAnswer,
        jobRole
      });

      const updatedFeedback = { ...feedback };
      if (response.data.success) {
        updatedFeedback[currentQuestion.id] = response.data.feedback;
        setFeedback(updatedFeedback);
      }

      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setCurrentAnswer('');
      } else {
        const scores = Object.values(updatedFeedback).map(f => f.overallScore || 0);
        const overallScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        setSessionComplete(true);
        onComplete({ questions, answers: updatedAnswers, feedback: updatedFeedback, overallScore });
      }
    } catch (err) {
      setError('Failed to submit answer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const calcScore = () => {
    const scores = Object.values(feedback).map(f => f.overallScore || 0);
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  };

  // ── Difficulty Picker Screen ────────────────────────────────────────────
  if (!difficulty) {
    const analysis = sessionData?.analysis || {};

    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 bg-green-50 border border-green-200 rounded-full px-4 py-2 mb-4">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-green-700 text-sm font-medium">30 questions ready for {jobRole}</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Difficulty</h2>
          <p className="text-gray-600">Pick a difficulty level to start your interview session.</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
            {error}
          </div>
        )}

        {/* Difficulty cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {Object.entries(DIFFICULTY_CONFIG).map(([diff, cfg]) => {
            const qCount = sessionData?.questions?.[diff]?.length || 0;
            return (
              <button
                key={diff}
                onClick={() => startWithDifficulty(diff)}
                className={`card text-left hover:shadow-lg transition-all duration-200 ring-2 ring-transparent hover:${cfg.ring} border-2 hover:border-opacity-60 focus:outline-none`}
              >
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mb-3 border ${cfg.color}`}>
                  {cfg.label}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">{qCount} Questions</h3>
                <p className="text-sm text-gray-500">
                  {diff === 'easy'   && 'Conceptual & foundational questions'}
                  {diff === 'medium' && 'Applied & problem-solving questions'}
                  {diff === 'hard'   && 'Advanced & architectural deep dives'}
                </p>
              </button>
            );
          })}
        </div>

        {/* Analysis summary */}
        {analysis.skills?.length > 0 && (
          <div className="card bg-gray-50 border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
              <Brain className="w-5 h-5 text-primary-600" />
              <span>Your Resume Summary</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {analysis.programming_languages?.length > 0 && (
                <div>
                  <p className="text-gray-500 mb-1 font-medium">Programming Languages</p>
                  <div className="flex flex-wrap gap-1">
                    {analysis.programming_languages.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {analysis.frameworks?.length > 0 && (
                <div>
                  <p className="text-gray-500 mb-1 font-medium">Frameworks</p>
                  <div className="flex flex-wrap gap-1">
                    {analysis.frameworks.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {analysis.databases?.length > 0 && (
                <div>
                  <p className="text-gray-500 mb-1 font-medium">Databases</p>
                  <div className="flex flex-wrap gap-1">
                    {analysis.databases.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {analysis.weak_areas?.length > 0 && (
                <div>
                  <p className="text-gray-500 mb-1 font-medium">⚠ Weak Areas</p>
                  <div className="flex flex-wrap gap-1">
                    {analysis.weak_areas.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Session Complete Screen ─────────────────────────────────────────────
  if (sessionComplete) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="card">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Interview Complete!</h2>
          <p className="text-gray-600 mb-6">
            Great job completing your {jobRole} ({DIFFICULTY_CONFIG[difficulty].label}) interview.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <BarChart3 className="w-5 h-5 text-primary-600" />
              <span className="font-medium text-gray-900">Overall Score</span>
            </div>
            <div className="text-4xl font-bold text-primary-600">{calcScore()}<span className="text-xl text-gray-400">/10</span></div>
          </div>
        </div>
      </div>
    );
  }

  // ── Active Interview ────────────────────────────────────────────────────
  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const diffCfg = DIFFICULTY_CONFIG[difficulty];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress + difficulty badge */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-700">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${diffCfg.color}`}>
              {diffCfg.label}
            </span>
          </div>
          <span className="text-sm text-gray-500">{Math.round(progress)}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Question + Answer */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-start space-x-3 mb-6">
              <MessageCircle className="w-6 h-6 text-primary-600 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="font-medium text-gray-900">Interview Question</h3>
                  {currentQuestion?.topic && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{currentQuestion.topic}</span>
                  )}
                </div>
                <p className="text-lg text-gray-800 leading-relaxed">{currentQuestion?.question}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Answer</label>
                <textarea
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  rows={8}
                  className="input-field resize-none"
                  disabled={submitting}
                />
                <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
                  <span>{currentAnswer.length} characters</span>
                  <span>Aim for 100–300 words</span>
                </div>
              </div>

              {error && (
                <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <button
                  onClick={() => {
                    if (currentIndex > 0) {
                      setCurrentIndex(currentIndex - 1);
                      setCurrentAnswer(answers[questions[currentIndex - 1].id] || '');
                    }
                  }}
                  disabled={currentIndex === 0 || submitting}
                  className="btn-secondary disabled:opacity-50"
                >
                  Previous
                </button>

                <button
                  onClick={submitAnswer}
                  disabled={!currentAnswer.trim() || submitting}
                  className="btn-primary flex items-center space-x-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      <span>Getting Feedback...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{currentIndex === questions.length - 1 ? 'Complete Interview' : 'Next Question'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Session Info */}
          <div className="card">
            <h4 className="font-medium text-gray-900 mb-3">Session Info</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Role</span><span className="font-medium">{jobRole}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Difficulty</span><span className={`font-semibold ${diffCfg.color.split(' ')[1]}`}>{diffCfg.label}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Questions</span><span className="font-medium">{questions.length}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Answered</span><span className="font-medium">{Object.keys(answers).length}</span></div>
            </div>
          </div>

          {/* Recent Feedback */}
          {Object.keys(feedback).length > 0 && (() => {
            const fbEntries = Object.entries(feedback);
            const lastTwo   = fbEntries.slice(-2);
            const lastFb    = fbEntries[fbEntries.length - 1]?.[1];
            const scoreColor = (s) =>
              s >= 8 ? 'text-emerald-600' : s >= 5 ? 'text-amber-500' : 'text-red-500';
            const scoreBg = (s) =>
              s >= 8 ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : s >= 5 ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-red-50 text-red-600 border-red-200';

            return (
              <div className="card">
                <h4 className="font-semibold text-gray-900 mb-3 text-sm">Recent Feedback</h4>
                <div className="space-y-3">
                  {lastTwo.map(([qId, fb], idx) => {
                    const qNum = fbEntries.findIndex(([id]) => id === qId) + 1;
                    return (
                      <div key={qId} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                        {/* Row 1: label + score */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-500">
                            Question {qNum}
                          </span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${scoreBg(fb.overallScore)}`}>
                            {fb.overallScore ?? '—'}/10
                          </span>
                        </div>
                        {/* Row 2: sub-scores */}
                        <div className="flex gap-2">
                          {['relevance', 'clarity', 'depth'].map(k => (
                            <div key={k} className="flex-1 text-center">
                              <div className="text-xs text-gray-400 capitalize mb-0.5">{k}</div>
                              <div className={`text-xs font-semibold ${scoreColor(fb[k]?.score ?? 0)}`}>
                                {fb[k]?.score ?? '—'}<span className="text-gray-300">/10</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Advanced NLP block for the latest answer */}
                <AdvancedAnswerFeedback feedback={lastFb} />
              </div>
            );
          })()}


          {/* Tips */}
          <div className="card bg-blue-50 border-blue-200">
            <h4 className="font-medium text-blue-900 mb-3">💡 Interview Tips</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Be specific with examples</li>
              <li>• Explain your thought process</li>
              <li>• Mention relevant technologies</li>
              <li>• Discuss challenges and solutions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewSession;
