import React from 'react';
import { 
  User, Mail, Phone, MapPin, Briefcase, GraduationCap, 
  Code, Database, Cloud, Brain, Users, Settings, 
  CheckCircle, AlertCircle, Star, TrendingUp 
} from 'lucide-react';

const ResumeAnalysisDisplay = ({ analysis, jobRole }) => {
  if (!analysis) return null;

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getSkillIcon = (category) => {
    const icons = {
      programming_languages: Code,
      web_technologies: Code,
      databases: Database,
      cloud_platforms: Cloud,
      data_science: Brain,
      soft_skills: Users,
      tools: Settings
    };
    return icons[category] || Code;
  };

  const formatSkillCategory = (category) => {
    return category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Resume Analysis Score</h3>
          <div className={`px-4 py-2 rounded-full text-lg font-bold ${getScoreColor(analysis.overall_score)}`}>
            {analysis.overall_score}/100
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${
              analysis.overall_score >= 80 ? 'bg-green-500' :
              analysis.overall_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${analysis.overall_score}%` }}
          ></div>
        </div>
        
        <p className="text-sm text-gray-600 mt-2">
          Analysis for <span className="font-medium">{jobRole}</span> position
        </p>
      </div>

      {/* Suitability Assessment */}
      {analysis.suitability && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            {analysis.suitability.suitable ? (
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            )}
            Job Role Suitability
          </h3>
          
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-700">
              {analysis.suitability.suitable ? 'Suitable' : 'Needs Improvement'}
            </span>
            <span className="text-sm text-gray-500">
              Confidence: {Math.round(analysis.suitability.confidence * 100)}%
            </span>
          </div>
          
          <p className="text-sm text-gray-600">
            {analysis.suitability.reason}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Skills Analysis */}
        {analysis.skills && Object.keys(analysis.skills).length > 0 && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Code className="w-5 h-5 text-blue-500 mr-2" />
              Skills Detected
            </h3>
            
            <div className="space-y-4">
              {Object.entries(analysis.skills).map(([category, skills]) => {
                const IconComponent = getSkillIcon(category);
                return (
                  <div key={category} className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      <IconComponent className="w-4 h-4 mr-2" />
                      {formatSkillCategory(category)}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Experience & Education */}
        <div className="space-y-6">
          {/* Experience */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Briefcase className="w-5 h-5 text-purple-500 mr-2" />
              Experience
            </h3>
            
            <div className="flex items-center space-x-4">
              <div className="text-3xl font-bold text-purple-600">
                {analysis.experience_years}
              </div>
              <div className="text-gray-600">
                <div className="font-medium">Years of Experience</div>
                <div className="text-sm">
                  {analysis.experience_years === 0 ? 'Entry Level' :
                   analysis.experience_years < 3 ? 'Junior Level' :
                   analysis.experience_years < 7 ? 'Mid Level' : 'Senior Level'}
                </div>
              </div>
            </div>
          </div>

          {/* Education */}
          {analysis.education && analysis.education.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <GraduationCap className="w-5 h-5 text-green-500 mr-2" />
                Education
              </h3>
              
              <div className="space-y-2">
                {analysis.education.map((edu, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Star className="w-4 h-4 text-green-500" />
                    <span className="text-gray-700 capitalize">{edu}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contact Information */}
      {analysis.contact_info && (Object.keys(analysis.contact_info).length > 0) && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <User className="w-5 h-5 text-indigo-500 mr-2" />
            Contact Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.contact_info.email && (
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700">{analysis.contact_info.email}</span>
              </div>
            )}
            
            {analysis.contact_info.phone && (
              <div className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700">{analysis.contact_info.phone}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Entities (Organizations, Locations) */}
      {analysis.entities && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Organizations */}
          {analysis.entities.organizations && analysis.entities.organizations.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Briefcase className="w-5 h-5 text-orange-500 mr-2" />
                Organizations
              </h3>
              
              <div className="space-y-2">
                {analysis.entities.organizations.slice(0, 5).map((org, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-gray-700">{org}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Locations */}
          {analysis.entities.locations && analysis.entities.locations.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MapPin className="w-5 h-5 text-red-500 mr-2" />
                Locations
              </h3>
              
              <div className="space-y-2">
                {analysis.entities.locations.slice(0, 5).map((location, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-gray-700">{location}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analysis Metadata */}
      {analysis.analysis_timestamp && (
        <div className="text-center text-sm text-gray-500">
          Analysis completed on {new Date(analysis.analysis_timestamp).toLocaleString()}
        </div>
      )}

      {/* Error Message */}
      {analysis.error && (
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <span className="text-yellow-800 font-medium">Note:</span>
          </div>
          <p className="text-yellow-700 mt-2">{analysis.error}</p>
        </div>
      )}
    </div>
  );
};

export default ResumeAnalysisDisplay;
