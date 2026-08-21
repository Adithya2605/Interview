import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import ResumeUpload from './components/ResumeUpload';
import JobRoleSelection from './components/JobRoleSelection';
import InterviewSession from './components/InterviewSession';
import InterviewSolutions from './components/InterviewSolutions';
import SessionHistory from './components/SessionHistory';
import './index.css';

function App() {
  const [currentStep, setCurrentStep] = useState('upload'); // upload | role | interview | solutions | complete | history
  const [resumeData, setResumeData] = useState(null);       // { text, filename }
  const [selectedRole, setSelectedRole] = useState('');
  const [sessionData, setSessionData] = useState(null);     // { sessionId, analysis, questions }
  const [completedSessionData, setCompletedSessionData] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);

  // Load session history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('interviewHistory');
    if (saved) {
      try { setSessionHistory(JSON.parse(saved)); } catch (_) {}
    }
  }, []);

  // Persist session history
  useEffect(() => {
    if (sessionHistory.length > 0) {
      localStorage.setItem('interviewHistory', JSON.stringify(sessionHistory));
    }
  }, [sessionHistory]);

  // Step 1: Resume uploaded — text extracted only (fast)
  const handleResumeUpload = (data) => {
    setResumeData(data);   // { text, filename }
    setCurrentStep('role');
  };

  // Step 2: Role selected + single Gemini call done — session data ready
  const handleRoleReady = (role, geminiSession) => {
    setSelectedRole(role);
    setSessionData(geminiSession); // { sessionId, analysis, questions }
    setCurrentStep('interview');
  };

  // Step 3: Interview complete
  const handleInterviewComplete = (completedSession) => {
    const newSession = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      jobRole: selectedRole,
      resumeFilename: resumeData?.filename,
      sessionId: sessionData?.sessionId,
      questions: completedSession.questions,
      answers: completedSession.answers,
      feedback: completedSession.feedback,
      overallScore: completedSession.overallScore
    };

    setCompletedSessionData({
      ...completedSession,
      jobRole: selectedRole,
      resumeText: resumeData?.text
    });

    setSessionHistory(prev => [newSession, ...prev]);
    setCurrentStep('solutions');
  };

  const handleSolutionsComplete = () => setCurrentStep('complete');

  const resetSession = () => {
    setCurrentStep('upload');
    setResumeData(null);
    setSelectedRole('');
    setSessionData(null);
    setCompletedSessionData(null);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header />

        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={
              <div className="max-w-4xl mx-auto">

                {currentStep === 'upload' && (
                  <ResumeUpload onUploadSuccess={handleResumeUpload} />
                )}

                {currentStep === 'role' && (
                  <JobRoleSelection
                    resumeData={resumeData}
                    onRoleReady={handleRoleReady}
                  />
                )}

                {currentStep === 'interview' && sessionData && (
                  <InterviewSession
                    resumeData={resumeData}
                    jobRole={selectedRole}
                    sessionData={sessionData}
                    onComplete={handleInterviewComplete}
                  />
                )}

                {currentStep === 'solutions' && completedSessionData && (
                  <InterviewSolutions
                    sessionData={completedSessionData}
                    onBack={handleSolutionsComplete}
                  />
                )}

                {currentStep === 'complete' && (
                  <div className="text-center">
                    <div className="card max-w-md mx-auto">
                      <h2 className="text-2xl font-bold text-green-600 mb-4">
                        Interview Complete! 🎉
                      </h2>
                      <p className="text-gray-600 mb-6">
                        Great job! Your interview session has been completed and saved.
                      </p>
                      <div className="space-y-3">
                        <button onClick={resetSession} className="btn-primary w-full">
                          Start New Interview
                        </button>
                        <button
                          onClick={() => setCurrentStep('history')}
                          className="btn-secondary w-full"
                        >
                          View Session History
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 'history' && (
                  <SessionHistory
                    sessions={sessionHistory}
                    onBack={() => setCurrentStep('complete')}
                  />
                )}

              </div>
            } />

            <Route path="/history" element={
              <SessionHistory
                sessions={sessionHistory}
                onBack={() => window.history.back()}
              />
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
