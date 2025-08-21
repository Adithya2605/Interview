import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, BarChart3 } from 'lucide-react';
import axios from 'axios';
import ResumeAnalysisDisplay from './ResumeAnalysisDisplay';

const ResumeUpload = ({ onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelection = (selectedFile) => {
    setError('');
    
    // Validate file type
    const allowedTypes = ['application/pdf', 'text/plain'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Please upload a PDF or TXT file only.');
      return;
    }

    // Validate file size (5MB limit)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB.');
      return;
    }

    setFile(selectedFile);
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const uploadResume = async () => {
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('resume', file);

      const response = await axios.post('http://localhost:5000/api/upload-resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        // Store analysis result
        if (response.data.analysis) {
          setAnalysisResult(response.data.analysis);
          setShowAnalysis(true);
        }
        
        onUploadSuccess({
          text: response.data.text,
          filename: response.data.filename,
          analysis: response.data.analysis
        });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload resume. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setError('');
    setAnalysisResult(null);
    setShowAnalysis(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Upload Your Resume
        </h2>
        <p className="text-gray-600">
          Upload your resume to get personalized interview questions tailored to your experience
        </p>
      </div>

      <div className="card">
        {!file ? (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Drop your resume here, or click to browse
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Supports PDF and TXT files up to 5MB
            </p>
            <input
              type="file"
              accept=".pdf,.txt"
              onChange={handleFileInput}
              className="hidden"
              id="resume-upload"
            />
            <label
              htmlFor="resume-upload"
              className="btn-primary cursor-pointer inline-block"
            >
              Choose File
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="w-8 h-8 text-primary-600" />
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={removeFile}
                className="text-red-600 hover:text-red-700 font-medium"
              >
                Remove
              </button>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={uploadResume}
                disabled={uploading}
                className="btn-primary flex-1 flex items-center justify-center space-x-2"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Process Resume</span>
                  </>
                )}
              </button>
              <button
                onClick={removeFile}
                className="btn-secondary"
                disabled={uploading}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
      </div>

      <div className="mt-6 text-center text-sm text-gray-500">
        <p>Your resume data is processed securely and not stored permanently.</p>
      </div>

      {/* Advanced Analysis Results */}
      {showAnalysis && analysisResult && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="w-6 h-6 text-primary-600 mr-2" />
              Advanced Resume Analysis
            </h3>
            <button
              onClick={() => setShowAnalysis(false)}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Hide Analysis
            </button>
          </div>
          
          <ResumeAnalysisDisplay 
            analysis={analysisResult} 
            jobRole="General Analysis" 
          />
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 mb-4">
              Analysis complete! You can now proceed to select your target job role for personalized questions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeUpload;
