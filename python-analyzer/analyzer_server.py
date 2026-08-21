#!/usr/bin/env python3
"""
Persistent NLP microservice for answer analysis.
Loads spaCy + ML model ONCE at startup; subsequent requests take < 200 ms.
Run with: python analyzer_server.py
Listens on: http://localhost:5001
"""

from flask import Flask, request, jsonify
import json, re, os, pickle, warnings
warnings.filterwarnings('ignore')

# ── Heavy imports (done once at startup) ───────────────────────────────────
import spacy
import pandas as pd
from textblob import TextBlob
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
import numpy as np

# ── Load spaCy model ───────────────────────────────────────────────────────
try:
    nlp = spacy.load("en_core_web_sm")
    print("[analyzer_server] spaCy model loaded.")
except OSError:
    nlp = None
    print("[analyzer_server] WARNING: spaCy model not found. NLP features disabled.")

# ── Load / train suitability model ────────────────────────────────────────
_DIR = os.path.dirname(os.path.abspath(__file__))
_MODEL_PATH = os.path.join(_DIR, 'answer_model.pkl')
_VECTORIZER_PATH = os.path.join(_DIR, 'answer_vectorizer.pkl')

def _train_and_save():
    data = {
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
    df = pd.DataFrame(data)
    vec = TfidfVectorizer(max_features=100, stop_words='english')
    X = vec.fit_transform(df["answer"])
    X_tr, X_te, y_tr, y_te = train_test_split(X, df["label"], test_size=0.3, random_state=42)
    mdl = LogisticRegression(random_state=42)
    mdl.fit(X_tr, y_tr)
    with open(_MODEL_PATH, 'wb') as f: pickle.dump(mdl, f)
    with open(_VECTORIZER_PATH, 'wb') as f: pickle.dump(vec, f)
    print(f"[analyzer_server] Model trained & cached (acc={mdl.score(X_te, y_te):.2f}).")
    return mdl, vec

def _load_model():
    try:
        if os.path.exists(_MODEL_PATH) and os.path.exists(_VECTORIZER_PATH):
            with open(_MODEL_PATH, 'rb') as f: mdl = pickle.load(f)
            with open(_VECTORIZER_PATH, 'rb') as f: vec = pickle.load(f)
            print("[analyzer_server] Model loaded from cache.")
            return mdl, vec
        return _train_and_save()
    except Exception as e:
        print(f"[analyzer_server] Model load error: {e}")
        return None, None

MODEL, VECTORIZER = _load_model()

# ── Role keywords ─────────────────────────────────────────────────────────
ROLE_KEYWORDS = {
    "Software Developer":       ["programming","coding","debugging","algorithms","data structures","teamwork","problem solving","python","javascript","react","node.js","database","api","testing","git"],
    "Frontend Developer":       ["html","css","javascript","react","vue","angular","responsive","ui","ux","browser","dom","typescript","webpack","accessibility"],
    "Backend Developer":        ["api","server","database","node.js","python","java","rest","microservices","authentication","sql","caching","performance","security"],
    "Full Stack Developer":     ["frontend","backend","react","node.js","database","api","deployment","fullstack","javascript","python","sql","cloud"],
    "Data Scientist":           ["data analysis","machine learning","statistics","python","r","sql","visualization","modeling","research","algorithms","pandas","numpy","scikit-learn","tensorflow"],
    "Product Manager":          ["product strategy","roadmap","stakeholders","requirements","user experience","agile","scrum","analytics","market research","leadership","communication","prioritization"],
    "UI/UX Designer":           ["user experience","user interface","design thinking","prototyping","wireframes","usability","accessibility","figma","sketch","adobe","user research","interaction design"],
    "DevOps Engineer":          ["deployment","ci/cd","docker","kubernetes","aws","azure","monitoring","automation","infrastructure","cloud","linux","scripting","security","scalability"],
    "Marketing Manager":        ["marketing strategy","campaigns","analytics","seo","social media","content marketing","brand management","customer acquisition","roi","a/b testing","market research"],
    "Data Analyst":             ["sql","excel","python","tableau","power bi","data cleaning","visualization","statistics","reporting","kpi","dashboard"],
}

# ── Analysis helpers ──────────────────────────────────────────────────────
def preprocess(text):
    if not text: return ""
    return re.sub(r'[^\w\s]', ' ', re.sub(r'\s+', ' ', text.lower())).strip()

def analyze_sentiment(text):
    try:
        blob = TextBlob(text)
        p = blob.sentiment.polarity
        label = ("Very Positive" if p > 0.3 else "Positive" if p > 0.1
                 else "Neutral" if p > -0.1 else "Negative" if p > -0.3 else "Very Negative")
        return {"sentiment": label, "polarity": round(p, 3),
                "subjectivity": round(blob.sentiment.subjectivity, 3), "confidence": round(abs(p), 3)}
    except:
        return {"sentiment": "Neutral", "polarity": 0.0, "subjectivity": 0.5, "confidence": 0.0}

def keyword_coverage(text, job_role):
    role_key = next((k for k in ROLE_KEYWORDS if k.lower() in job_role.lower()), "Software Developer")
    keywords = ROLE_KEYWORDS.get(role_key, ROLE_KEYWORDS["Software Developer"])
    clean = preprocess(text)
    found = [kw for kw in keywords if kw.lower() in clean]
    return {"coverage_percent": round(len(found) / len(keywords) * 100, 1) if keywords else 0,
            "found_keywords": found, "total_keywords": len(keywords),
            "missing_keywords": [kw for kw in keywords if kw not in found]}

def analyze_clarity(text):
    if not text:
        return {"score": 0, "assessment": "No answer provided", "word_count": 0,
                "sentence_count": 0, "avg_sentence_length": 0}
    words = text.split()
    sentences = [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]
    wc, sc = len(words), len(sentences)
    avg = wc / sc if sc > 0 else 0
    score = (8 if 20 <= wc <= 200 else 2) + (2 if 8 <= avg <= 25 else 1)
    assessment = "Excellent" if score >= 9 else "Good" if score >= 7 else "Fair" if score >= 5 else "Poor"
    return {"score": score, "assessment": f"{assessment} clarity",
            "word_count": wc, "sentence_count": sc, "avg_sentence_length": round(avg, 1)}

def predict_suitability(text):
    if not MODEL or not VECTORIZER:
        return {"prediction": "Unable to predict", "confidence": 0.0, "probability": 0.5}
    try:
        X = VECTORIZER.transform([preprocess(text)])
        pred = MODEL.predict(X)[0]
        prob = MODEL.predict_proba(X)[0]
        return {"prediction": "Suitable" if pred == 1 else "Not Suitable",
                "confidence": round(max(prob), 3), "probability": round(prob[1], 3)}
    except:
        return {"prediction": "Error", "confidence": 0.0, "probability": 0.5}

def nlp_analysis(text):
    if not nlp:
        return {"entities": [], "noun_phrases": [], "pos_distribution": {}}
    try:
        doc = nlp(text)
        entities = [(e.text, e.label_) for e in doc.ents]
        noun_phrases = [c.text for c in doc.noun_chunks if len(c.text.split()) > 1][:10]
        pos = {}
        for t in doc:
            if not t.is_stop and not t.is_punct:
                pos[t.pos_] = pos.get(t.pos_, 0) + 1
        return {"entities": entities, "noun_phrases": noun_phrases, "pos_distribution": pos}
    except Exception as e:
        return {"entities": [], "noun_phrases": [], "pos_distribution": {}, "error": str(e)}

# ── Flask app ─────────────────────────────────────────────────────────────
app = Flask(__name__)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "spacy": nlp is not None, "model": MODEL is not None})

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        body = request.get_json(force=True)
        answer = body.get('answer', '')
        question = body.get('question', '')
        job_role = body.get('jobRole', 'Software Developer')

        sentiment = analyze_sentiment(answer)
        keywords = keyword_coverage(answer, job_role)
        clarity = analyze_clarity(answer)
        suitability = predict_suitability(answer)
        nlp_result = nlp_analysis(answer)

        # Overall score
        s_score = max(0, (sentiment["polarity"] + 1) * 50)
        k_score = keywords["coverage_percent"]
        c_score = (clarity["score"] / 10) * 100
        suit_score = suitability["probability"] * 100
        overall = round(s_score * 0.2 + k_score * 0.3 + c_score * 0.3 + suit_score * 0.2, 1)

        recs = []
        if sentiment["polarity"] < 0:
            recs.append("Try to frame your experiences more positively")
        if keywords["coverage_percent"] < 30:
            missing = keywords["missing_keywords"][:3]
            recs.append(f"Include more relevant keywords: {', '.join(missing)}")
        if clarity["score"] < 6:
            recs.append("Provide more structured and detailed responses")
        if suitability["probability"] < 0.6:
            recs.append("Align your answer more closely with the job requirements")

        return jsonify({
            "overall_score": overall,
            "sentiment": sentiment,
            "keywords": keywords,
            "clarity": clarity,
            "nlp_analysis": nlp_result,
            "suitability": suitability,
            "recommendations": recs
        })
    except Exception as e:
        return jsonify({"error": str(e), "overall_score": 0,
                        "sentiment": {"sentiment": "Error", "polarity": 0},
                        "keywords": {"coverage_percent": 0, "found_keywords": []},
                        "clarity": {"score": 0, "assessment": "Error"},
                        "suitability": {"prediction": "Error", "confidence": 0},
                        "recommendations": []}), 500

if __name__ == '__main__':
    print("[analyzer_server] Starting on http://localhost:5001 ...")
    app.run(host='127.0.0.1', port=5001, debug=False, threaded=True)
