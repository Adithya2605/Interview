import React, { useState, useEffect } from 'react';
import { Code, TrendingUp, Palette, Database, Shield, Megaphone, Brain } from 'lucide-react';
import axios from 'axios';

const JobRoleSelection = ({ onRoleReady, resumeData }) => {
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [stageIndex, setStageIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');

  const jobRoles = [
    { id: 'frontend-developer',  title: 'Frontend Developer',  description: 'React, Vue, Angular, HTML/CSS, JavaScript', icon: Code,      color: 'bg-blue-500' },
    { id: 'backend-developer',   title: 'Backend Developer',   description: 'Node.js, Python, Java, APIs, Databases',  icon: Database,  color: 'bg-green-500' },
    { id: 'fullstack-developer', title: 'Full Stack Developer',description: 'Frontend + Backend, End-to-end development', icon: Code,   color: 'bg-purple-500' },
    { id: 'product-manager',     title: 'Product Manager',     description: 'Strategy, Roadmaps, User Research',       icon: TrendingUp,color: 'bg-orange-500' },
    { id: 'ui-ux-designer',      title: 'UI/UX Designer',      description: 'User Interface, Prototyping, Research',   icon: Palette,   color: 'bg-pink-500' },
    { id: 'data-scientist',      title: 'Data Scientist',      description: 'Machine Learning, Analytics, Python, R',  icon: TrendingUp,color: 'bg-indigo-500' },
    { id: 'devops-engineer',     title: 'DevOps Engineer',     description: 'CI/CD, Cloud, Infrastructure, Automation',icon: Shield,    color: 'bg-gray-500' },
    { id: 'marketing-manager',   title: 'Marketing Manager',   description: 'Digital Marketing, Campaigns, Growth',    icon: Megaphone, color: 'bg-red-500' },
  ];

  const stages = [
    '🔍 Analyzing your resume...',
    '🧠 Extracting skills & experience...',
    '📝 Generating 30 interview questions...',
    '💾 Saving your session...',
  ];

  const handleContinue = async () => {
    if (!selectedRole || !resumeData) return;

    const role = jobRoles.find(r => r.id === selectedRole);
    setLoading(true);
    setError('');
    setElapsed(0);
    setStageIndex(0);

    // Cycle through loading stages every 4s
    let stageIdx = 0;
    setLoadingStage(stages[0]);
    const stageTimer = setInterval(() => {
      stageIdx = Math.min(stageIdx + 1, stages.length - 1);
      setStageIndex(stageIdx);
      setLoadingStage(stages[stageIdx]);
    }, 4000);

    // Tick elapsed seconds
    const elapsedTimer = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);

    try {
      const response = await axios.post('http://localhost:5000/api/prepare-interview', {
        resumeText: resumeData.text,
        jobRole: role.title,
        filename: resumeData.filename
      });

      clearInterval(stageTimer);
      clearInterval(elapsedTimer);

      if (response.data.success) {
        onRoleReady(role.title, {
          sessionId: response.data.sessionId,
          analysis: response.data.analysis,
          questions: response.data.questions
        });
      }
    } catch (err) {
      clearInterval(stageTimer);
      clearInterval(elapsedTimer);
      setError(err.response?.data?.error || 'Failed to prepare interview. Please try again.');
      setLoading(false);
      setLoadingStage('');
    }
  };

  // ── Loading screen ────────────────────────────────────────────────────────
  if (loading) {
    const progressPercent = Math.min((stageIndex / (stages.length - 1)) * 100, 95);
    return (
      <div className="max-w-lg mx-auto text-center">
        <div className="card py-12">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-primary-100" />
            <div className="absolute inset-0 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
            <Brain className="absolute inset-0 m-auto w-8 h-8 text-primary-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">AI is Working</h3>
          <p className="text-primary-600 font-medium mb-1">{loadingStage}</p>

          {/* Progress bar */}
          <div className="mt-5 mx-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Progress</span>
              <span>{elapsed}s elapsed</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-primary-500 h-2 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <p className="text-gray-500 text-sm mt-5">
            One AI call to analyze your resume and generate<br />
            <strong>10 Easy + 10 Medium + 10 Hard</strong> questions
          </p>
          <p className="text-gray-400 text-xs mt-2">This usually takes 15–30 seconds</p>
        </div>
      </div>
    );
  }

  // ── Role selector ─────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Select Your Target Role</h2>
        <p className="text-gray-600">
          Choose the position you're interviewing for — our AI will generate role-specific questions from your resume.
        </p>
        {resumeData && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg inline-block">
            <p className="text-green-700 text-sm">
              ✓ Resume ready: <span className="font-medium">{resumeData.filename}</span>
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {jobRoles.map((role) => {
          const Icon = role.icon;
          const isSelected = selectedRole === role.id;
          return (
            <div
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={`card cursor-pointer transition-all duration-200 hover:shadow-lg ${
                isSelected ? 'ring-2 ring-primary-500 border-primary-500 bg-primary-50' : 'hover:border-gray-300'
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className={`${role.color} p-3 rounded-lg flex-shrink-0`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold mb-1 ${isSelected ? 'text-primary-700' : 'text-gray-900'}`}>
                    {role.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{role.description}</p>
                </div>
                {isSelected && (
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
          {error}
        </div>
      )}

      <div className="text-center">
        <button
          onClick={handleContinue}
          disabled={!selectedRole}
          className={`btn-primary px-8 py-3 text-lg ${!selectedRole ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {selectedRole ? '✨ Analyze & Generate Questions' : 'Select a role to continue'}
        </button>
        <p className="text-xs text-gray-400 mt-3">
          Powered by Gemini · Takes ~5 seconds
        </p>
      </div>
    </div>
  );
};

export default JobRoleSelection;
