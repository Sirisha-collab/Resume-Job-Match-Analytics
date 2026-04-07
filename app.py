from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import PyPDF2
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from reportlab.platypus import SimpleDocTemplate, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
import os

app = Flask(__name__)
CORS(app)

# -----------------------
# USER LOGIN (simple demo)
# -----------------------
USERS = {"admin": "password"}  # simple in-memory login for demo

@app.route('/login', methods=['POST'])
def login():
    data = request.json  # expects JSON
    username = data.get("username")
    password = data.get("password")
    if username in USERS and USERS[username] == password:
        return jsonify({"message": "Login successful", "user": username})
    return jsonify({"error": "Invalid credentials"}), 401

# -----------------------
# PDF Extraction
# -----------------------
def extract_text(pdf_file):
    reader = PyPDF2.PdfReader(pdf_file)
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text
    return text

# -----------------------
# Skill Analysis
# -----------------------
def get_keywords(text):
    words = text.lower().split()
    return set(words)

def skill_gap(resume, job):
    resume_words = get_keywords(resume)
    job_words = get_keywords(job)
    matched = resume_words.intersection(job_words)
    missing = job_words - resume_words
    return list(matched), list(missing)

def generate_suggestions(score, missing_skills):
    suggestions = []
    if score < 50:
        suggestions.append("Your resume has a low match score. Align it with the job description.")
    if score < 70:
        suggestions.append("Try adding more relevant keywords from the job description.")
    if missing_skills:
        suggestions.append(f"Consider adding these important skills: {', '.join(missing_skills[:5])}")
    suggestions.append("Use action verbs and quantify achievements (e.g., 'Improved performance by 20%').")
    suggestions.append("Keep formatting clean and ATS-friendly (avoid tables and images).")
    return suggestions

def analyze_resume(resume_text, job_desc):
    vectorizer = TfidfVectorizer()
    vectors = vectorizer.fit_transform([resume_text, job_desc])
    score = cosine_similarity(vectors[0:1], vectors[1:2])[0][0]
    return round(score * 100, 2)

# -----------------------
# Analyze Resume Endpoint
# -----------------------
@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        file = request.files['resume']
        job_desc = request.form['job_description']

        resume_text = extract_text(file)
        score = analyze_resume(resume_text, job_desc)

        matched, missing = skill_gap(resume_text, job_desc)
        suggestions = generate_suggestions(score, missing)

        return jsonify({
            "score": score,
            "matched_skills": matched[:10],
            "missing_skills": missing[:10],
            "suggestions": suggestions
        })
    except Exception as e:
        print("ERROR:", e)
        return jsonify({"error": str(e)}), 500

# -----------------------
# PDF Report Generation
# -----------------------
def create_pdf(score, matched, missing, suggestions, filename="report.pdf"):
    doc = SimpleDocTemplate(filename)
    styles = getSampleStyleSheet()
    content = []

    content.append(Paragraph(f"ATS Score: {score}%", styles["Title"]))
    content.append(Paragraph("Matched Skills:", styles["Heading2"]))
    for m in matched:
        content.append(Paragraph(m, styles["Normal"]))
    content.append(Paragraph("Missing Skills:", styles["Heading2"]))
    for m in missing:
        content.append(Paragraph(m, styles["Normal"]))
    content.append(Paragraph("Suggestions:", styles["Heading2"]))
    for s in suggestions:
        content.append(Paragraph(s, styles["Normal"]))

    doc.build(content)
    return filename

@app.route('/download', methods=['POST'])
def download():
    data = request.json
    file_path = create_pdf(
        data['score'],
        data['matched_skills'],
        data['missing_skills'],
        data['suggestions']
    )
    return send_file(file_path, as_attachment=True)

# -----------------------
# Run App
# -----------------------
if __name__ == '__main__':
    app.run(debug=True)