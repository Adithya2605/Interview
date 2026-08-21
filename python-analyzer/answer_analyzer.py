#!/usr/bin/env python3
"""
Advanced Interview Answer Analyzer
Provides sentiment analysis, keyword coverage, clarity scoring, and ML-based suitability prediction
"""

import sys
import json
import re
import os
import pickle
import spacy
import pandas as pd
from textblob import TextBlob
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
import numpy as np
import warnings
warnings.filterwarnings('ignore')

# Paths for cached model files
_DIR = os.path.dirname(os.path.abspath(__file__))
_MODEL_PATH = os.path.join(_DIR, 'answer_model.pkl')
_VECTORIZER_PATH = os.path.join(_DIR, 'answer_vectorizer.pkl')

# Load NLP model
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print(json.dumps({"error": "spaCy English model not found. Please run: python -m spacy download en_core_web_sm"}))
    sys.exit(1)

# Define role-specific keywords
ROLE_KEYWORDS = {
    "Software Developer": ["programming", "coding", "debugging", "algorithms", "data structures", "teamwork", "problem solving", "python", "javascript", "react", "node.js", "database", "api", "testing", "git"],
    "Data Scientist": ["data analysis", "machine learning", "statistics", "python", "r", "sql", "visualization", "modeling", "research", "algorithms", "pandas", "numpy", "scikit-learn", "tensorflow"],
    "Product Manager": ["product strategy", "roadmap", "stakeholders", "requirements", "user experience", "agile", "scrum", "analytics", "market research", "leadership", "communication", "prioritization"],
    "UI/UX Designer": ["user experience", "user interface", "design thinking", "prototyping", "wireframes", "usability", "accessibility", "figma", "sketch", "adobe", "user research", "interaction design"],
    "DevOps Engineer": ["deployment", "ci/cd", "docker", "kubernetes", "aws", "azure", "monitoring", "automation", "infrastructure", "cloud", "linux", "scripting", "security", "scalability"],
    "Marketing Manager": ["marketing strategy", "campaigns", "analytics", "seo", "social media", "content marketing", "brand management", "customer acquisition", "roi", "a/b testing", "market research"],
    "Sales Representative": ["sales process", "lead generation", "customer relationship", "negotiation", "closing deals", "crm", "prospecting", "communication", "targets", "pipeline management"],
    "Business Analyst": ["requirements analysis", "process improvement", "stakeholder management", "documentation", "data analysis", "sql", "business intelligence", "project management", "communication"],
    "Cybersecurity Specialist": ["security", "vulnerability assessment", "penetration testing", "incident response", "risk management", "compliance", "encryption", "network security", "threat analysis"],
    "HR Manager": ["recruitment", "employee relations", "performance management", "training", "compliance", "compensation", "benefits", "conflict resolution", "organizational development"]
}

# --- Preprocessing Function ---
def preprocess(text):
    """Clean and normalize text"""
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r'\s+', ' ', text)  # Multiple spaces to single space
    text = re.sub(r'[^\w\s]', ' ', text)  # Remove punctuation
    return text.strip()

# --- Sentiment Analysis ---
def analyze_sentiment(text):
    """Analyze sentiment using TextBlob"""
    try:
        blob = TextBlob(text)
        polarity = blob.sentiment.polarity
        subjectivity = blob.sentiment.subjectivity
        
        if polarity > 0.3:
            sentiment = "Very Positive"
        elif polarity > 0.1:
            sentiment = "Positive"
        elif polarity > -0.1:
            sentiment = "Neutral"
        elif polarity > -0.3:
            sentiment = "Negative"
        else:
            sentiment = "Very Negative"
            
        confidence = abs(polarity)
        
        return {
            "sentiment": sentiment,
            "polarity": round(polarity, 3),
            "subjectivity": round(subjectivity, 3),
            "confidence": round(confidence, 3)
        }
    except Exception as e:
        return {
            "sentiment": "Neutral",
            "polarity": 0.0,
            "subjectivity": 0.5,
            "confidence": 0.0,
            "error": str(e)
        }

# --- Keyword Coverage ---
def keyword_coverage(text, job_role):
    """Calculate keyword coverage for specific job role"""
    keywords = ROLE_KEYWORDS.get(job_role, ROLE_KEYWORDS["Software Developer"])
    clean_text = preprocess(text)
    
    found_keywords = []
    for keyword in keywords:
        if keyword.lower() in clean_text:
            found_keywords.append(keyword)
    
    coverage_percent = (len(found_keywords) / len(keywords)) * 100 if keywords else 0
    
    return {
        "coverage_percent": round(coverage_percent, 1),
        "found_keywords": found_keywords,
        "total_keywords": len(keywords),
        "missing_keywords": [kw for kw in keywords if kw not in found_keywords]
    }

# --- Clarity and Structure Analysis ---
def analyze_clarity(text):
    """Analyze answer clarity and structure"""
    if not text:
        return {
            "score": 0,
            "assessment": "No answer provided",
            "word_count": 0,
            "sentence_count": 0,
            "avg_sentence_length": 0
        }
    
    words = text.split()
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    
    word_count = len(words)
    sentence_count = len(sentences)
    avg_sentence_length = word_count / sentence_count if sentence_count > 0 else 0
    
    # Clarity scoring based on multiple factors
    score = 0
    assessment_parts = []
    
    # Word count assessment
    if word_count < 20:
        score += 2
        assessment_parts.append("too brief")
    elif word_count > 200:
        score += 2
        assessment_parts.append("too lengthy")
    else:
        score += 8
        assessment_parts.append("appropriate length")
    
    # Sentence structure assessment
    if avg_sentence_length < 8:
        score += 1
        assessment_parts.append("choppy sentences")
    elif avg_sentence_length > 25:
        score += 1
        assessment_parts.append("overly complex sentences")
    else:
        score += 2
        assessment_parts.append("well-structured sentences")
    
    # Overall assessment
    if score >= 9:
        overall = "Excellent clarity"
    elif score >= 7:
        overall = "Good clarity"
    elif score >= 5:
        overall = "Fair clarity"
    else:
        overall = "Poor clarity"
    
    return {
        "score": score,
        "assessment": overall,
        "details": assessment_parts,
        "word_count": word_count,
        "sentence_count": sentence_count,
        "avg_sentence_length": round(avg_sentence_length, 1)
    }

# --- Advanced NLP Analysis ---
def analyze_with_spacy(text):
    """Use spaCy for advanced NLP analysis"""
    try:
        doc = nlp(text)
        
        # Extract entities
        entities = [(ent.text, ent.label_) for ent in doc.ents]
        
        # Extract key phrases (noun phrases)
        noun_phrases = [chunk.text for chunk in doc.noun_chunks if len(chunk.text.split()) > 1]
        
        # Part-of-speech analysis
        pos_counts = {}
        for token in doc:
            if not token.is_stop and not token.is_punct:
                pos_counts[token.pos_] = pos_counts.get(token.pos_, 0) + 1
        
        return {
            "entities": entities,
            "noun_phrases": noun_phrases[:10],  # Top 10 noun phrases
            "pos_distribution": pos_counts
        }
    except Exception as e:
        return {
            "entities": [],
            "noun_phrases": [],
            "pos_distribution": {},
            "error": str(e)
        }

# --- ML Suitability Model ---
def _train_and_save_model():
    """Train the suitability model and cache it to disk."""
    training_data = {
        "answer": [
            "I have strong teamwork skills and experience in python projects with databases",
            "I don't like working with others and prefer to work alone always",
            "I enjoy problem solving and data analysis in real-world cases using machine learning",
            "I have no experience with programming but I'm willing to learn",
            "I led a team of 5 developers to successfully deliver a complex web application",
            "I struggle with communication and often miss deadlines",
            "I'm passionate about technology and continuously learn new frameworks",
            "I have 5 years of experience in software development with Python and React",
            "I don't understand the question and have nothing to say",
            "I implemented CI/CD pipelines and improved deployment efficiency by 40%",
            "I have excellent problem-solving skills and can debug complex issues",
            "I'm not interested in this role and just applying randomly",
            "I mentored junior developers and contributed to open source projects",
            "I have difficulty learning new technologies and adapting to change"
        ],
        "label": [1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0]
    }
    df = pd.DataFrame(training_data)
    vectorizer = TfidfVectorizer(max_features=100, stop_words='english')
    X = vectorizer.fit_transform(df["answer"])
    y = df["label"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)
    model = LogisticRegression(random_state=42)
    model.fit(X_train, y_train)
    accuracy = model.score(X_test, y_test)
    # Cache to disk
    with open(_MODEL_PATH, 'wb') as f:
        pickle.dump(model, f)
    with open(_VECTORIZER_PATH, 'wb') as f:
        pickle.dump(vectorizer, f)
    return model, vectorizer, accuracy


def load_suitability_model():
    """Load model from disk cache, training it first if not present."""
    try:
        if os.path.exists(_MODEL_PATH) and os.path.exists(_VECTORIZER_PATH):
            with open(_MODEL_PATH, 'rb') as f:
                model = pickle.load(f)
            with open(_VECTORIZER_PATH, 'rb') as f:
                vectorizer = pickle.load(f)
            return model, vectorizer, 1.0  # accuracy unknown from cache
        return _train_and_save_model()
    except Exception as e:
        return None, None, 0.0


# Load model once at module import time (fast for subsequent calls)
_MODEL, _VECTORIZER, _MODEL_ACCURACY = load_suitability_model()

def predict_suitability(text, model, vectorizer):
    """Predict answer suitability using trained model"""
    try:
        if not model or not vectorizer:
            return {
                "prediction": "Unable to predict",
                "confidence": 0.0,
                "probability": 0.5
            }
        
        clean_text = preprocess(text)
        X_test = vectorizer.transform([clean_text])
        prediction = model.predict(X_test)[0]
        probability = model.predict_proba(X_test)[0]
        
        confidence = max(probability)
        
        return {
            "prediction": "Suitable" if prediction == 1 else "Not Suitable",
            "confidence": round(confidence, 3),
            "probability": round(probability[1], 3)  # Probability of being suitable
        }
    except Exception as e:
        return {
            "prediction": "Error in prediction",
            "confidence": 0.0,
            "probability": 0.5,
            "error": str(e)
        }

# --- Main Analysis Function ---
def analyze_answer(answer_text, question, job_role="Software Developer"):
    """Comprehensive answer analysis"""
    try:
        # Use pre-loaded model (no re-training per call)
        model, vectorizer, model_accuracy = _MODEL, _VECTORIZER, _MODEL_ACCURACY
        
        # Perform all analyses
        sentiment_analysis = analyze_sentiment(answer_text)
        keyword_analysis = keyword_coverage(answer_text, job_role)
        clarity_analysis = analyze_clarity(answer_text)
        nlp_analysis = analyze_with_spacy(answer_text)
        suitability_analysis = predict_suitability(answer_text, model, vectorizer)
        
        # Calculate overall score
        sentiment_score = max(0, (sentiment_analysis["polarity"] + 1) * 50)  # Convert -1,1 to 0,100
        keyword_score = keyword_analysis["coverage_percent"]
        clarity_score = (clarity_analysis["score"] / 10) * 100
        suitability_score = suitability_analysis["probability"] * 100
        
        overall_score = (sentiment_score * 0.2 + keyword_score * 0.3 + 
                        clarity_score * 0.3 + suitability_score * 0.2)
        
        # Generate recommendations
        recommendations = []
        if sentiment_analysis["polarity"] < 0:
            recommendations.append("Try to frame your experiences more positively")
        if keyword_analysis["coverage_percent"] < 30:
            recommendations.append(f"Include more relevant keywords: {', '.join(keyword_analysis['missing_keywords'][:3])}")
        if clarity_analysis["score"] < 6:
            recommendations.append("Provide more structured and detailed responses")
        if suitability_analysis["probability"] < 0.6:
            recommendations.append("Align your answer more closely with the job requirements")
        
        return {
            "overall_score": round(overall_score, 1),
            "sentiment": sentiment_analysis,
            "keywords": keyword_analysis,
            "clarity": clarity_analysis,
            "nlp_analysis": nlp_analysis,
            "suitability": suitability_analysis,
            "recommendations": recommendations,
            "model_accuracy": round(model_accuracy, 3),
            "analysis_timestamp": pd.Timestamp.now().isoformat()
        }
        
    except Exception as e:
        return {
            "error": f"Analysis failed: {str(e)}",
            "overall_score": 0,
            "sentiment": {"sentiment": "Error", "polarity": 0},
            "keywords": {"coverage_percent": 0, "found_keywords": []},
            "clarity": {"score": 0, "assessment": "Error"},
            "suitability": {"prediction": "Error", "confidence": 0},
            "recommendations": ["Please try again"]
        }

# --- Main Execution ---
if __name__ == "__main__":
    try:
        if len(sys.argv) < 3:
            print(json.dumps({"error": "Usage: python answer_analyzer.py <answer_text> <question> [job_role]"}))
            sys.exit(1)
        
        answer_text = sys.argv[1]
        question = sys.argv[2]
        job_role = sys.argv[3] if len(sys.argv) > 3 else "Software Developer"
        
        # Perform analysis
        result = analyze_answer(answer_text, question, job_role)
        
        # Output JSON result
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        error_result = {
            "error": f"Script execution failed: {str(e)}",
            "overall_score": 0
        }
        print(json.dumps(error_result))
        sys.exit(1)
