import React from 'react';
import { Calendar, Briefcase, FileText, BarChart3, ArrowLeft, Trash2 } from 'lucide-react';

const SessionHistory = ({ sessions, onBack }) => {
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score) => {
    if (score >= 8) return 'text-green-600 bg-green-100';
    if (score >= 6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear all session history? This cannot be undone.')) {
      localStorage.removeItem('interviewHistory');
      window.location.reload();
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="btn-secondary flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Session History</h2>
            <p className="text-gray-600">Review your past interview sessions and performance</p>
          </div>
        </div>
        
        {sessions.length > 0 && (
          <button
            onClick={clearHistory}
            className="btn-secondary flex items-center space-x-2 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-12">
          <div className="card max-w-md mx-auto">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Sessions Yet
            </h3>
            <p className="text-gray-600">
              Complete your first interview session to see your history and progress here.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card text-center">
              <div className="text-2xl font-bold text-primary-600 mb-1">
                {sessions.length}
              </div>
              <div className="text-sm text-gray-600">Total Sessions</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-bold text-primary-600 mb-1">
                {Math.round(sessions.reduce((acc, s) => acc + (s.overallScore || 0), 0) / sessions.length) || 0}
              </div>
              <div className="text-sm text-gray-600">Average Score</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-bold text-primary-600 mb-1">
                {sessions.reduce((acc, s) => acc + (s.questions?.length || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Questions Answered</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-bold text-primary-600 mb-1">
                {new Set(sessions.map(s => s.jobRole)).size}
              </div>
              <div className="text-sm text-gray-600">Different Roles</div>
            </div>
          </div>

          {/* Session List */}
          <div className="space-y-4">
            {sessions.map((session) => (
              <div key={session.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <Briefcase className="w-5 h-5 text-primary-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {session.jobRole}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(session.overallScore)}`}>
                        {session.overallScore}/10
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(session.timestamp)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4" />
                        <span>{session.resumeFilename || 'Resume uploaded'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <BarChart3 className="w-4 h-4" />
                        <span>{session.questions?.length || 0} questions answered</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Feedback */}
                {session.feedback && Object.keys(session.feedback).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-3">Question Performance</h4>
                    <div className="space-y-3">
                      {Object.entries(session.feedback).map(([questionId, feedback], index) => (
                        <div key={questionId} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h5 className="font-medium text-sm text-gray-900 mb-1">
                                Question {index + 1}
                              </h5>
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {session.questions?.find(q => q.id.toString() === questionId)?.question}
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getScoreColor(feedback.overallScore)}`}>
                              {feedback.overallScore}/10
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-3 text-xs">
                            <div className="text-center">
                              <div className="text-gray-500 mb-1">Relevance</div>
                              <div className="font-medium">{feedback.relevance?.score}/10</div>
                            </div>
                            <div className="text-center">
                              <div className="text-gray-500 mb-1">Clarity</div>
                              <div className="font-medium">{feedback.clarity?.score}/10</div>
                            </div>
                            <div className="text-center">
                              <div className="text-gray-500 mb-1">Depth</div>
                              <div className="font-medium">{feedback.depth?.score}/10</div>
                            </div>
                          </div>

                          {feedback.suggestions && (
                            <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-800">
                              <strong>Suggestions:</strong> {feedback.suggestions}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionHistory;
