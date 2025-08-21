import React, { useState } from 'react';
import { Briefcase, Code, Users, TrendingUp, Palette, Database, Shield, Megaphone } from 'lucide-react';

const JobRoleSelection = ({ onRoleSelect, resumeData }) => {
  const [selectedRole, setSelectedRole] = useState('');

  const jobRoles = [
    {
      id: 'frontend-developer',
      title: 'Frontend Developer',
      description: 'React, Vue, Angular, HTML/CSS, JavaScript',
      icon: Code,
      color: 'bg-blue-500'
    },
    {
      id: 'backend-developer',
      title: 'Backend Developer',
      description: 'Node.js, Python, Java, APIs, Databases',
      icon: Database,
      color: 'bg-green-500'
    },
    {
      id: 'fullstack-developer',
      title: 'Full Stack Developer',
      description: 'Frontend + Backend, End-to-end development',
      icon: Code,
      color: 'bg-purple-500'
    },
    {
      id: 'product-manager',
      title: 'Product Manager',
      description: 'Strategy, Roadmaps, User Research, Analytics',
      icon: TrendingUp,
      color: 'bg-orange-500'
    },
    {
      id: 'ui-ux-designer',
      title: 'UI/UX Designer',
      description: 'User Interface, User Experience, Prototyping',
      icon: Palette,
      color: 'bg-pink-500'
    },
    {
      id: 'data-scientist',
      title: 'Data Scientist',
      description: 'Machine Learning, Analytics, Python, R',
      icon: TrendingUp,
      color: 'bg-indigo-500'
    },
    {
      id: 'devops-engineer',
      title: 'DevOps Engineer',
      description: 'CI/CD, Cloud, Infrastructure, Automation',
      icon: Shield,
      color: 'bg-gray-500'
    },
    {
      id: 'marketing-manager',
      title: 'Marketing Manager',
      description: 'Digital Marketing, Campaigns, Growth, Analytics',
      icon: Megaphone,
      color: 'bg-red-500'
    }
  ];

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
  };

  const handleContinue = () => {
    if (selectedRole) {
      const role = jobRoles.find(r => r.id === selectedRole);
      onRoleSelect(role.title);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Select Your Target Role
        </h2>
        <p className="text-gray-600">
          Choose the position you're interviewing for to get tailored questions
        </p>
        {resumeData && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg inline-block">
            <p className="text-green-700 text-sm">
              ✓ Resume processed: <span className="font-medium">{resumeData.filename}</span>
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {jobRoles.map((role) => {
          const IconComponent = role.icon;
          const isSelected = selectedRole === role.id;
          
          return (
            <div
              key={role.id}
              onClick={() => handleRoleSelect(role.id)}
              className={`card cursor-pointer transition-all duration-200 hover:shadow-lg ${
                isSelected 
                  ? 'ring-2 ring-primary-500 border-primary-500 bg-primary-50' 
                  : 'hover:border-gray-300'
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className={`${role.color} p-3 rounded-lg flex-shrink-0`}>
                  <IconComponent className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold mb-2 ${
                    isSelected ? 'text-primary-700' : 'text-gray-900'
                  }`}>
                    {role.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {role.description}
                  </p>
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

      <div className="text-center">
        <button
          onClick={handleContinue}
          disabled={!selectedRole}
          className={`btn-primary px-8 py-3 text-lg ${
            !selectedRole ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          Generate Interview Questions
        </button>
        
        {!selectedRole && (
          <p className="text-sm text-gray-500 mt-2">
            Please select a job role to continue
          </p>
        )}
      </div>
    </div>
  );
};

export default JobRoleSelection;
