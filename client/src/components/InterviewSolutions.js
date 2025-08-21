import React, { useState, useEffect } from 'react';
import { CheckCircle, BookOpen, Target, TrendingUp, ArrowLeft, Lightbulb, Star, AlertCircle } from 'lucide-react';
import axios from 'axios';

const InterviewSolutions = ({ sessionData, onBack }) => {
  const [solutions, setSolutions] = useState([]);
  const [overallSummary, setOverallSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('solutions');

  useEffect(() => {
    generateSolutions();
  }, []);

  const generateSolutions = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await axios.post('http://localhost:5000/api/generate-solutions', {
        questions: sessionData.questions,
        answers: sessionData.answers,
        jobRole: sessionData.jobRole,
        resumeText: sessionData.resumeText
      });

      if (response.data.success) {
        setSolutions(response.data.solutions);
        setOverallSummary(response.data.overallSummary);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate solutions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 8) return 'text-green-600 bg-green-100';
    if (score >= 6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreIcon = (score) => {
    if (score >= 8) return <CheckCircle className="w-4 h-4" />;
    if (score >= 6) return <Star className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto text-center">
        <div className="card">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Generating Your Personalized Solutions
          </h3>
          <p className="text-gray-600">
            Our AI is analyzing your responses and creating detailed improvement recommendations...
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
          <div className="space-x-3">
            <button onClick={generateSolutions} className="btn-primary">
              Try Again
            </button>
            <button onClick={onBack} className="btn-secondary">
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="btn-secondary flex items-center space-x-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Interview Solutions & Recommendations</h2>
            <p className="text-gray-600">AI-generated ideal answers and improvement strategies</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-8 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('solutions')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'solutions'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <BookOpen className="w-4 h-4 inline-block mr-2" />
          Question Solutions
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'summary'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <TrendingUp className="w-4 h-4 inline-block mr-2" />
          Overall Assessment
        </button>
      </div>

      {/* Solutions Tab */}
      {activeTab === 'solutions' && (
        <div className="space-y-8">
          {solutions.map((solution, index) => (
            <div key={solution.questionId} className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="bg-primary-100 text-primary-800 text-sm font-medium px-2 py-1 rounded">
                      Question {index + 1}
                    </span>
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(solution.score)}`}>
                      {getScoreIcon(solution.score)}
                      <span>{solution.score}/10</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {solution.question}
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Your Answer */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      Your Answer
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {solution.userAnswer || 'No answer provided'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      <Lightbulb className="w-4 h-4 text-yellow-500 mr-2" />
                      Improvement Suggestions
                    </h4>
                    <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-500">
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {solution.improvements}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Ideal Answer & Tips */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      Ideal Answer
                    </h4>
                    <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                      <p className="text-gray-700 text-sm leading-relaxed mb-3">
                        {solution.idealAnswer}
                      </p>
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Key Points to Cover:</h5>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                          {solution.keyPoints.map((point, idx) => (
                            <li key={idx}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      <Target className="w-4 h-4 text-purple-500 mr-2" />
                      Pro Tips
                    </h4>
                    <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500">
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {solution.tips}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Tab */}
      {activeTab === 'summary' && overallSummary && (
        <div className="space-y-6">
          {/* Overall Assessment */}
          <div className="card">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 text-primary-600 mr-2" />
              Overall Performance Assessment
            </h3>
            <p className="text-gray-700 leading-relaxed">
              {overallSummary.overallAssessment}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Strengths */}
            <div className="card">
              <h3 className="text-lg font-semibold text-green-700 mb-4 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                Your Strengths
              </h3>
              <ul className="space-y-3">
                {overallSummary.strengths.map((strength, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-700">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Areas for Improvement */}
            <div className="card">
              <h3 className="text-lg font-semibold text-orange-700 mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2" />
                Areas for Improvement
              </h3>
              <ul className="space-y-3">
                {overallSummary.improvements.map((improvement, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-700">{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Action Items */}
            <div className="card">
              <h3 className="text-lg font-semibold text-blue-700 mb-4 flex items-center">
                <Lightbulb className="w-5 h-5 mr-2" />
                Action Items
              </h3>
              <ul className="space-y-3">
                {overallSummary.actionItems.map((action, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                      {index + 1}
                    </div>
                    <span className="text-gray-700">{action}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommended Resources */}
            <div className="card">
              <h3 className="text-lg font-semibold text-purple-700 mb-4 flex items-center">
                <BookOpen className="w-5 h-5 mr-2" />
                Recommended Resources
              </h3>
              <ul className="space-y-3">
                {overallSummary.recommendedResources.map((resource, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-700">{resource}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-8 flex justify-center space-x-4">
        <button
          onClick={() => window.print()}
          className="btn-secondary"
        >
          Print Solutions
        </button>
        <button
          onClick={onBack}
          className="btn-primary"
        >
          Start New Interview
        </button>
      </div>
    </div>
  );
};

export default InterviewSolutions;
