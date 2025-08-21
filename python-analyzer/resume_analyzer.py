import re
import spacy
import pandas as pd
import json
import sys
import io
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import PyPDF2
import pickle
import os
from datetime import datetime

class ResumeAnalyzer:
    def __init__(self):
        # Load English NLP model
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except OSError:
            print("Warning: spaCy English model not found. Install with: python -m spacy download en_core_web_sm")
            self.nlp = None
        
        # Comprehensive skill keywords organized by category
        self.SKILLS = {
            "programming_languages": [
                "python", "java", "javascript", "typescript", "c++", "c#", "go", "rust", 
                "php", "ruby", "swift", "kotlin", "scala", "r", "matlab", "perl"
            ],
            "web_technologies": [
                "react", "angular", "vue", "html", "css", "sass", "bootstrap", "tailwind",
                "node.js", "express", "django", "flask", "spring", "laravel", "rails"
            ],
            "databases": [
                "sql", "mysql", "postgresql", "mongodb", "redis", "elasticsearch", 
                "oracle", "sqlite", "cassandra", "dynamodb"
            ],
            "cloud_platforms": [
                "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "jenkins",
                "github actions", "gitlab ci", "circleci"
            ],
            "data_science": [
                "machine learning", "deep learning", "tensorflow", "pytorch", "pandas",
                "numpy", "scikit-learn", "jupyter", "tableau", "power bi", "spark"
            ],
            "soft_skills": [
                "communication", "leadership", "project management", "teamwork", 
                "problem solving", "analytical thinking", "creativity", "adaptability"
            ],
            "tools": [
                "git", "jira", "confluence", "slack", "figma", "adobe", "photoshop",
                "illustrator", "excel", "powerpoint", "word"
            ]
        }
        
        # Flatten skills for easy searching
        self.all_skills = []
        for category, skills in self.SKILLS.items():
            self.all_skills.extend(skills)
        
        # Education keywords
        self.EDUCATION_LEVELS = [
            "phd", "doctorate", "ph.d", "doctor of philosophy",
            "master", "masters", "msc", "mba", "ma", "ms",
            "bachelor", "bachelors", "bsc", "ba", "bs", "be", "btech",
            "associate", "diploma", "certificate", "degree"
        ]
        
        # Experience indicators
        self.EXPERIENCE_KEYWORDS = [
            "years", "year", "months", "month", "experience", "worked", "employed",
            "position", "role", "job", "career", "professional"
        ]
        
        # Initialize or load the ML model
        self.model = None
        self.vectorizer = None
        self.load_or_train_model()
    
    def preprocess_text(self, text):
        """Clean and preprocess text"""
        if not text:
            return ""
        
        text = text.lower()
        text = re.sub(r'\s+', ' ', text)  # Remove extra spaces
        text = re.sub(r'[^\w\s\.\-\+\#]', ' ', text)  # Keep alphanumeric, dots, dashes, plus, hash
        return text.strip()
    
    def extract_skills(self, text):
        """Extract skills from resume text"""
        text = self.preprocess_text(text)
        found_skills = {}
        
        for category, skills in self.SKILLS.items():
            found_skills[category] = []
            for skill in skills:
                # Use word boundaries for better matching
                pattern = r'\b' + re.escape(skill.lower()) + r'\b'
                if re.search(pattern, text):
                    found_skills[category].append(skill)
        
        # Remove empty categories
        found_skills = {k: v for k, v in found_skills.items() if v}
        return found_skills
    
    def extract_education(self, text):
        """Extract education information"""
        text = self.preprocess_text(text)
        found_education = []
        
        for edu_level in self.EDUCATION_LEVELS:
            pattern = r'\b' + re.escape(edu_level.lower()) + r'\b'
            if re.search(pattern, text):
                found_education.append(edu_level)
        
        return list(set(found_education))  # Remove duplicates
    
    def extract_experience_years(self, text):
        """Extract years of experience"""
        text = self.preprocess_text(text)
        
        # Look for patterns like "5 years", "3+ years", "2-4 years"
        patterns = [
            r'(\d+)\+?\s*years?\s*(?:of\s*)?experience',
            r'(\d+)\s*years?\s*(?:of\s*)?(?:professional\s*)?experience',
            r'experience\s*(?:of\s*)?(\d+)\+?\s*years?',
            r'(\d+)\+?\s*years?\s*in\s*(?:the\s*)?(?:field|industry)',
        ]
        
        years = []
        for pattern in patterns:
            matches = re.findall(pattern, text)
            years.extend([int(match) for match in matches])
        
        return max(years) if years else 0
    
    def extract_contact_info(self, text):
        """Extract contact information"""
        contact_info = {}
        
        # Email pattern
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, text)
        if emails:
            contact_info['email'] = emails[0]
        
        # Phone pattern (various formats)
        phone_patterns = [
            r'\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b',
            r'\b\d{10}\b',
            r'\b\+\d{1,3}[-.\s]?\d{1,14}\b'
        ]
        
        for pattern in phone_patterns:
            phones = re.findall(pattern, text)
            if phones:
                contact_info['phone'] = phones[0] if isinstance(phones[0], str) else ''.join(phones[0])
                break
        
        return contact_info
    
    def extract_entities_with_spacy(self, text):
        """Extract named entities using spaCy"""
        if not self.nlp:
            return {}
        
        doc = self.nlp(text)
        entities = {
            'organizations': [],
            'locations': [],
            'persons': []
        }
        
        for ent in doc.ents:
            if ent.label_ == "ORG":
                entities['organizations'].append(ent.text)
            elif ent.label_ in ["GPE", "LOC"]:
                entities['locations'].append(ent.text)
            elif ent.label_ == "PERSON":
                entities['persons'].append(ent.text)
        
        # Remove duplicates and clean
        for key in entities:
            entities[key] = list(set(entities[key]))
        
        return entities
    
    def load_or_train_model(self):
        """Load existing model or train a new one"""
        model_path = os.path.join(os.path.dirname(__file__), 'resume_model.pkl')
        vectorizer_path = os.path.join(os.path.dirname(__file__), 'resume_vectorizer.pkl')
        
        if os.path.exists(model_path) and os.path.exists(vectorizer_path):
            try:
                with open(model_path, 'rb') as f:
                    self.model = pickle.load(f)
                with open(vectorizer_path, 'rb') as f:
                    self.vectorizer = pickle.load(f)
                return
            except:
                pass
        
        # Train new model with expanded dataset
        self.train_suitability_model()
    
    def train_suitability_model(self):
        """Train ML model for resume suitability assessment"""
        # Expanded training dataset
        training_data = {
            "resume": [
                "experienced python developer with machine learning skills and 5 years experience",
                "senior java backend engineer with spring framework and microservices expertise",
                "react frontend developer with typescript and modern web technologies",
                "data scientist with deep learning tensorflow pytorch and statistical analysis",
                "full stack developer with node.js react mongodb and cloud deployment",
                "sales executive with strong communication and customer relationship management",
                "marketing manager with digital marketing campaigns and analytics experience",
                "project manager with agile scrum methodologies and team leadership",
                "ui ux designer with figma adobe creative suite and user research",
                "devops engineer with kubernetes docker aws and ci cd pipelines",
                "entry level graduate with computer science degree and internship experience",
                "experienced consultant with business analysis and process improvement",
                "quality assurance engineer with automated testing and selenium",
                "database administrator with sql server oracle and performance tuning",
                "mobile developer with react native flutter and cross platform development"
            ],
            "label": [1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1]  # 1 = tech suitable, 0 = not tech suitable
        }
        
        df = pd.DataFrame(training_data)
        
        # Create TF-IDF vectorizer
        self.vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            ngram_range=(1, 2)
        )
        
        X = self.vectorizer.fit_transform(df["resume"])
        y = df["label"]
        
        # Train model
        self.model = LogisticRegression(random_state=42)
        self.model.fit(X, y)
        
        # Save model and vectorizer
        try:
            model_path = os.path.join(os.path.dirname(__file__), 'resume_model.pkl')
            vectorizer_path = os.path.join(os.path.dirname(__file__), 'resume_vectorizer.pkl')
            
            with open(model_path, 'wb') as f:
                pickle.dump(self.model, f)
            with open(vectorizer_path, 'wb') as f:
                pickle.dump(self.vectorizer, f)
        except:
            pass  # Continue without saving if there's an issue
    
    def predict_suitability(self, text, job_role="Software Developer"):
        """Predict resume suitability for a given role"""
        if not self.model or not self.vectorizer:
            return {"suitable": True, "confidence": 0.5, "reason": "Model not available"}
        
        try:
            clean_text = self.preprocess_text(text)
            X_test = self.vectorizer.transform([clean_text])
            prediction = self.model.predict(X_test)[0]
            confidence = self.model.predict_proba(X_test)[0].max()
            
            return {
                "suitable": bool(prediction),
                "confidence": float(confidence),
                "reason": f"Based on ML analysis for {job_role} position"
            }
        except:
            return {"suitable": True, "confidence": 0.5, "reason": "Analysis error"}
    
    def calculate_resume_score(self, analysis_result):
        """Calculate overall resume score based on various factors"""
        score = 0
        max_score = 100
        
        # Skills score (40% of total)
        total_skills = sum(len(skills) for skills in analysis_result['skills'].values())
        skills_score = min(40, total_skills * 2)  # 2 points per skill, max 40
        score += skills_score
        
        # Education score (20% of total)
        if analysis_result['education']:
            education_score = 20
            score += education_score
        
        # Experience score (25% of total)
        experience_years = analysis_result['experience_years']
        experience_score = min(25, experience_years * 5)  # 5 points per year, max 25
        score += experience_score
        
        # Contact info score (10% of total)
        contact_score = 0
        if analysis_result['contact_info'].get('email'):
            contact_score += 5
        if analysis_result['contact_info'].get('phone'):
            contact_score += 5
        score += contact_score
        
        # Suitability bonus (5% of total)
        if analysis_result['suitability']['suitable']:
            score += 5
        
        return min(100, score)
    
    def analyze_resume(self, text, job_role="Software Developer"):
        """Complete resume analysis"""
        if not text:
            return {"error": "No text provided"}
        
        try:
            # Extract all information
            skills = self.extract_skills(text)
            education = self.extract_education(text)
            experience_years = self.extract_experience_years(text)
            contact_info = self.extract_contact_info(text)
            entities = self.extract_entities_with_spacy(text)
            suitability = self.predict_suitability(text, job_role)
            
            # Compile results
            analysis_result = {
                "skills": skills,
                "education": education,
                "experience_years": experience_years,
                "contact_info": contact_info,
                "entities": entities,
                "suitability": suitability,
                "job_role": job_role,
                "analysis_timestamp": datetime.now().isoformat()
            }
            
            # Calculate overall score
            analysis_result["overall_score"] = self.calculate_resume_score(analysis_result)
            
            return analysis_result
            
        except Exception as e:
            return {"error": f"Analysis failed: {str(e)}"}

def main():
    """Main function for command line usage"""
    if len(sys.argv) < 2:
        print("Usage: python resume_analyzer.py <resume_text> [job_role]")
        sys.exit(1)
    
    resume_text = sys.argv[1]
    job_role = sys.argv[2] if len(sys.argv) > 2 else "Software Developer"
    
    analyzer = ResumeAnalyzer()
    result = analyzer.analyze_resume(resume_text, job_role)
    
    # Output as JSON for easy parsing by Node.js
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
