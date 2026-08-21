#!/usr/bin/env python3
"""
Fast PDF/TXT text extractor using PyMuPDF (fitz).
Replaces the old spaCy/sklearn pipeline - text extraction only.
Gemini handles all analysis downstream.
"""

import sys
import json
import os


def extract_text_pymupdf(file_path):
    """Extract text using PyMuPDF - faster and more accurate than PyPDF2."""
    import fitz  # PyMuPDF
    doc = fitz.open(file_path)
    parts = []
    for page in doc:
        parts.append(page.get_text("text"))
    doc.close()
    return "\n".join(parts).strip()


def extract_text_pypdf2(file_path):
    """Fallback: PyPDF2 if PyMuPDF is not installed."""
    import PyPDF2
    text_parts = []
    with open(file_path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        for page in reader.pages:
            t = page.extract_text()
            if t:
                text_parts.append(t)
    return "\n".join(text_parts).strip()


def extract_text(file_path):
    ext = os.path.splitext(file_path)[1].lower()

    # Plain text — just read it
    if ext in (".txt", ".text"):
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read().strip()

    # PDF — try PyMuPDF first, then PyPDF2
    try:
        return extract_text_pymupdf(file_path)
    except ImportError:
        pass

    try:
        return extract_text_pypdf2(file_path)
    except ImportError:
        pass

    return ""


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python resume_analyzer.py <file_path>"}))
        sys.exit(1)

    fp = sys.argv[1]

    if not os.path.exists(fp):
        print(json.dumps({"error": f"File not found: {fp}"}))
        sys.exit(1)

    try:
        text = extract_text(fp)
        print(json.dumps({"success": True, "text": text}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
