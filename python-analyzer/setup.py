#!/usr/bin/env python3
"""
Setup script for AI Interview App Python Resume Analyzer
Installs required dependencies and downloads spaCy model
"""

import subprocess
import sys
import os

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e.stderr}")
        return False

def main():
    print("🚀 Setting up AI Interview App Python Resume Analyzer...\n")
    
    # Check Python version
    python_version = sys.version_info
    if python_version.major < 3 or (python_version.major == 3 and python_version.minor < 7):
        print("❌ Python 3.7 or higher is required")
        print(f"Current version: {python_version.major}.{python_version.minor}")
        sys.exit(1)
    
    print(f"✅ Python {python_version.major}.{python_version.minor} is compatible\n")
    
    # Install requirements
    requirements_file = os.path.join(os.path.dirname(__file__), 'requirements.txt')
    if not run_command(f"pip install -r {requirements_file}", "Installing Python dependencies"):
        print("❌ Failed to install dependencies. Please install manually:")
        print("pip install spacy pandas scikit-learn PyPDF2 numpy")
        return False
    
    # Download spaCy English model
    if not run_command("python -m spacy download en_core_web_sm", "Downloading spaCy English model"):
        print("⚠️  spaCy model download failed. Advanced NLP features may not work.")
        print("You can try downloading manually later with: python -m spacy download en_core_web_sm")
    
    # Test the analyzer
    print("\n🧪 Testing the resume analyzer...")
    test_command = f'python "{os.path.join(os.path.dirname(__file__), "resume_analyzer.py")}" "test resume with python skills" "Software Developer"'
    if run_command(test_command, "Testing resume analyzer"):
        print("✅ Resume analyzer is working correctly!")
    else:
        print("⚠️  Resume analyzer test failed, but basic functionality should still work")
    
    print("\n🎉 Setup completed!")
    print("\n📋 What's been installed:")
    print("• spaCy - Advanced NLP processing")
    print("• pandas - Data manipulation")
    print("• scikit-learn - Machine learning")
    print("• PyPDF2 - PDF text extraction")
    print("• numpy - Numerical computing")
    print("\n💡 The resume analyzer can now:")
    print("• Extract skills by category (programming, web, databases, etc.)")
    print("• Detect education levels and experience years")
    print("• Extract contact information and named entities")
    print("• Predict job role suitability using ML")
    print("• Calculate comprehensive resume scores")

if __name__ == "__main__":
    main()
