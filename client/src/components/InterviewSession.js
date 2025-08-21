import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, Clock, CheckCircle, AlertCircle, BarChart3 } from 'lucide-react';
import axios from 'axios';
import AdvancedAnswerFeedback from './AdvancedAnswerFeedback';

const InterviewSession = ({ resumeData, jobRole, onComplete }) => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [feedback, setFeedback] = useState({});
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [error, setError] = useState('');

  // Generate questions on component mount
  useEffect(() => {
    generateQuestions();
  }, []);

  const generateQuestions = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await axios.post('http://localhost:5000/api/generate-questions', {
        resumeText: resumeData.text,
        jobRole: jobRole
      });

      if (response.data.success) {
        setQuestions(response.data.questions);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!currentAnswer.trim()) return;

    setSubmitting(true);
    setEvaluating(true);

    try {
      const currentQuestion = questions[currentQuestionIndex];
      
      // Save the answer
      const updatedAnswers = {
        ...answers,
        [currentQuestion.id]: currentAnswer
      };
      setAnswers(updatedAnswers);

      // Get feedback from AI
      const response = await axios.post('http://localhost:5000/api/evaluate-answer', {
        question: currentQuestion.question,
        answer: currentAnswer,
        jobRole: jobRole
      });

      if (response.data.success) {
        const updatedFeedback = {
          ...feedback,
          [currentQuestion.id]: response.data.feedback
        };
        setFeedback(updatedFeedback);
      }

      // Move to next question or complete session
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setCurrentAnswer('');
      } else {
        // Session complete
        const overallScore = calculateOverallScore(feedback, response.data.feedback);
        setSessionComplete(true);
        
        onComplete({
          questions: questions,
          answers: updatedAnswers,
          feedback: { ...feedback, [currentQuestion.id]: response.data.feedback },
          overallScore: overallScore
        });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit answer. Please try again.');
    } finally {
      setSubmitting(false);
      setEvaluating(false);
    }
  };

  const calculateOverallScore = (existingFeedback, newFeedback) => {
    const allFeedback = { ...existingFeedback };
    if (newFeedback) {
      allFeedback[questions[currentQuestionIndex].id] = newFeedback;
    }
    
    const scores = Object.values(allFeedback).map(f => f.overallScore || 0);
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      const prevQuestionId = questions[currentQuestionIndex - 1].id;
      setCurrentAnswer(answers[prevQuestionId] || '');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto text-center">
        <div className="card">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Generating Your Interview Questions
          </h3>
          <p className="text-gray-600">
            Our AI is analyzing your resume and creating personalized questions for the {jobRole} role...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-900 mb-2">
            Something went wrong
          </h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={generateQuestions}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="card">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Interview Complete!
          </h2>
          <p className="text-gray-600 mb-6">
            Great job completing your {jobRole} interview. Your responses have been evaluated and saved.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <BarChart3 className="w-5 h-5 text-primary-600" />
              <span className="font-medium text-gray-900">Overall Score</span>
            </div>
            <div className="text-3xl font-bold text-primary-600">
              {calculateOverallScore(feedback)}/10
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <span className="text-sm text-gray-500">{Math.round(progress)}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Interview Area */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-start space-x-3 mb-6">
              <MessageCircle className="w-6 h-6 text-primary-600 mt-1" />
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-2">Interview Question</h3>
                <p className="text-lg text-gray-800 leading-relaxed">
                  {currentQuestion?.question}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Answer
                </label>
                <textarea
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  rows={8}
                  className="input-field resize-none"
                  disabled={submitting}
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-500">
                    {currentAnswer.length} characters
                  </span>
                  <span className="text-xs text-gray-500">
                    Aim for 100-300 words for a comprehensive answer
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={goToPreviousQuestion}
                  disabled={currentQuestionIndex === 0 || submitting}
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
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>
                        {evaluating ? 'Getting Feedback...' : 'Submitting...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>
                        {currentQuestionIndex === questions.length - 1 ? 'Complete Interview' : 'Next Question'}
                      </span>
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
              <div className="flex justify-between">
                <span className="text-gray-600">Role:</span>
                <span className="font-medium">{jobRole}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Questions:</span>
                <span className="font-medium">{questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Completed:</span>
                <span className="font-medium">{Object.keys(answers).length}</span>
              </div>
            </div>
          </div>

          {/* Previous Feedback */}
          {Object.keys(feedback).length > 0 && (
            <div className="card">
              <h4 className="font-medium text-gray-900 mb-3">Recent Feedback</h4>
              <div className="space-y-3">
                {Object.entries(feedback).slice(-2).map(([questionId, fb]) => (
                  <div key={questionId} className="text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-600">Question {questionId}</span>
                      <span className="font-medium text-primary-600">{fb.overallScore}/10</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-xs">
                      <div className="text-center">
                        <div className="text-gray-500">Relevance</div>
                        <div className="font-medium">{fb.relevance?.score}/10</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">Clarity</div>
                        <div className="font-medium">{fb.clarity?.score}/10</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">Depth</div>
                        <div className="font-medium">{fb.depth?.score}/10</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {Object.keys(feedback).length > 0 && (
                <AdvancedAnswerFeedback 
                  feedback={feedback[Math.max(...Object.keys(feedback).map(Number))]} 
                />
              )}
            </div>
          )}

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
