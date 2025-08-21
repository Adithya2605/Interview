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
  const [currentStep, setCurrentStep] = useState('upload'); // upload, role, interview, solutions, complete
  const [resumeData, setResumeData] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [questions, setQuestions] = useState([]);
  const [completedSessionData, setCompletedSessionData] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);

  // Load session history from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('interviewHistory');
    if (savedHistory) {
      try {
        setSessionHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error('Error loading session history:', error);
      }
    }
  }, []);

  // Save session history to localStorage whenever it changes
  useEffect(() => {
    if (sessionHistory.length > 0) {
      localStorage.setItem('interviewHistory', JSON.stringify(sessionHistory));
    }
  }, [sessionHistory]);

  const handleResumeUpload = (data) => {
    setResumeData(data);
    setCurrentStep('role');
  };

  const handleRoleSelection = (role) => {
    setSelectedRole(role);
    setCurrentStep('interview');
  };

  const handleInterviewComplete = (completedSession) => {
    const newSession = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      jobRole: selectedRole,
      resumeFilename: resumeData?.filename,
      questions: completedSession.questions,
      answers: completedSession.answers,
      feedback: completedSession.feedback,
      overallScore: completedSession.overallScore
    };
    
    // Store completed session data for solutions generation
    setCompletedSessionData({
      ...completedSession,
      jobRole: selectedRole,
      resumeText: resumeData?.text
    });
    
    setSessionHistory(prev => [newSession, ...prev]);
    setCurrentStep('solutions');
  };

  const handleSolutionsComplete = () => {
    setCurrentStep('complete');
  };

  const resetSession = () => {
    setCurrentStep('upload');
    setResumeData(null);
    setSelectedRole('');
    setQuestions([]);
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
                    onRoleSelect={handleRoleSelection}
                    resumeData={resumeData}
                  />
                )}
                
                {currentStep === 'interview' && (
                  <InterviewSession
                    resumeData={resumeData}
                    jobRole={selectedRole}
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
                        <button
                          onClick={resetSession}
                          className="btn-primary w-full"
                        >
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
