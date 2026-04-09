from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import PyPDF2
from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from reportlab.platypus import SimpleDocTemplate, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
from difflib import SequenceMatcher
import re

app = Flask(__name__)
CORS(app)

# -----------------------
# USER LOGIN (simple demo)
# -----------------------
USERS = {"admin": "password"}

@app.route('/login', methods=['POST'])
def login():
    data = request.json
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
SKILL_SYNONYMS = {
    "ml": "machine learning",
    "ai": "artificial intelligence",
    "js": "javascript",
    "py": "python",
    "db": "database",
    "pm": "project management"
}

def get_keywords(text):
    text = text.lower()
    vectorizer = CountVectorizer(ngram_range=(1,2), stop_words='english')
    X = vectorizer.fit_transform([text])
    keywords = set(vectorizer.get_feature_names_out())
    normalized = {SKILL_SYNONYMS.get(k, k) for k in keywords}
    return normalized

def similar(a, b):
    return SequenceMatcher(None, a, b).ratio()

def skill_gap(resume_text, job_text):
    resume_words = get_keywords(resume_text)
    job_words = get_keywords(job_text)

    matched = []
    missing = []

    for skill in job_words:
        found = False
        for r_skill in resume_words:
            if similar(skill, r_skill) >= 0.85:
                matched.append(skill)
                found = True
                break
        if not found:
            missing.append(skill)
    return matched, missing

def generate_suggestions(score, missing_skills):
    suggestions = []
    if score < 50:
        suggestions.append("- Your resume has a low match score. Align it with the job description.")
    if score < 70:
        suggestions.append("- Try adding more relevant keywords from the job description.")
    if missing_skills:
        suggestions.append(f"- Consider adding these important skills: {', '.join(missing_skills[:5])}")
    suggestions.append("- Use action verbs and quantify achievements (e.g., 'Increased efficiency by 20%').")
    suggestions.append("- Keep formatting clean and ATS-friendly (avoid tables and images).")
    return suggestions

def analyze_resume(resume_text, job_desc):
    vectorizer = TfidfVectorizer()
    vectors = vectorizer.fit_transform([resume_text, job_desc])
    score = cosine_similarity(vectors[0:1], vectors[1:2])[0][0]
    return round(score * 100, 2)

# -----------------------
# Experience Level Prediction
# -----------------------
def predict_experience_level(resume_text):
    text = resume_text.lower()
    junior_keywords = ['intern', 'junior', 'entry-level', 'trainee']
    mid_keywords = ['mid-level', 'associate', 'developer', 'engineer']
    senior_keywords = ['senior', 'lead', 'manager', 'principal', 'director']

    score = {"junior": 0, "mid": 0, "senior": 0}
    for kw in junior_keywords:
        if kw in text: score['junior'] += 1
    for kw in mid_keywords:
        if kw in text: score['mid'] += 1
    for kw in senior_keywords:
        if kw in text: score['senior'] += 1

    experience = max(score, key=score.get)
    years = re.findall(r'(\d+)\+?\s*(years|yrs)', text)
    if years:
        max_years = max([int(y[0]) for y in years])
        if max_years < 2: experience = 'junior'
        elif max_years < 5: experience = 'mid'
        else: experience = 'senior'
    return experience.capitalize()

# -----------------------
# ATS Simulation
# -----------------------
def ats_simulation(resume_text, job_desc):
    feedback = []
    text = resume_text.lower()

    # Check important sections
    if "skills" not in text:
        feedback.append("Missing 'Skills' section.")
    if "experience" not in text:
        feedback.append("Missing 'Experience' section.")
    if "education" not in text:
        feedback.append("Missing 'Education' section.")

    # Check measurable achievements
    if not re.search(r'\d+%', text) and not re.search(r'\d+\s*(years|yrs)', text):
        feedback.append("No measurable achievements found (e.g., %, numbers).")

    # Check formatting issues (basic heuristic)
    if len(re.findall(r'\|', text)) > 5:
        feedback.append("Resume may contain tables or complex formatting.")

    # Keyword match density
    resume_words = set(get_keywords(resume_text))
    job_words = set(get_keywords(job_desc))
    match_ratio = len(resume_words.intersection(job_words)) / (len(job_words) + 1)

    if match_ratio < 0.3:
        feedback.append("Low keyword optimization for ATS.")

    if not feedback:
        feedback.append("Your resume looks ATS-friendly.")

    return feedback

# -----------------------
# Skill Gap Roadmap
# -----------------------
LEARNING_RESOURCES = {
    "python": [
        {"name": "Python for Everybody (Coursera)", "url": "https://www.coursera.org/specializations/python"},
        {"name": "Python Basics (Udemy)", "url": "https://www.udemy.com/course/python-for-beginners/"},
        {"name": "Python Learning Path (Microsoft Learn)", "url": "https://learn.microsoft.com/en-us/training/paths/python-language/"}
    ],
    "machine learning": [
        {"name": "Machine Learning by Andrew Ng (Coursera)", "url": "https://www.coursera.org/learn/machine-learning"},
        {"name": "Machine Learning A-Z (Udemy)", "url": "https://www.udemy.com/course/machinelearning/"},
        {"name": "ML Learning Path (Microsoft Learn)", "url": "https://learn.microsoft.com/en-us/training/paths/build-ai-solutions-with-ml/"}
    ],
    "javascript": [
        {"name": "JavaScript Basics (Udemy)", "url": "https://www.udemy.com/course/the-complete-javascript-course/"},
        {"name": "JS Tutorials (Microsoft Learn)", "url": "https://learn.microsoft.com/en-us/training/paths/javascript-first-steps/"}
    ],
    "azure": [
        {"name": "Azure Fundamentals (Microsoft Learn)", "url": "https://learn.microsoft.com/en-us/training/paths/azure-fundamentals/"},
        {"name": "Azure Essentials (Udemy)", "url": "https://www.udemy.com/course/azure-essentials/"}
    ],
    "ai": [
        {"name": "AI For Everyone (Coursera)", "url": "https://www.coursera.org/learn/ai-for-everyone"}
    ]
}

def get_learning_links(missing_skills):
    roadmap = {}
    for skill in missing_skills:
        normalized = skill.lower()
        if normalized in LEARNING_RESOURCES:
            roadmap[skill] = LEARNING_RESOURCES[normalized]
    return roadmap

# -----------------------
# Single Resume Analyze
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
        experience_level = predict_experience_level(resume_text)
        learning_roadmap = get_learning_links(missing)
        ats_feedback = ats_simulation(resume_text, job_desc)

        return jsonify({
            "score": score,
            "matched_skills": matched[:10],
            "missing_skills": missing[:10],
            "suggestions": suggestions,
            "experience_level": experience_level,
            "learning_roadmap": learning_roadmap,
            "ats_feedback": ats_feedback   #for ATS rejecting feedback
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# -----------------------
# Multi-Resume Comparison
# -----------------------
@app.route('/compare', methods=['POST'])
def compare_resumes():
    try:
        files = request.files.getlist('resumes')
        job_desc = request.form['job_description']
        results = []

        for file in files:
            resume_text = extract_text(file)
            score = analyze_resume(resume_text, job_desc)
            matched, missing = skill_gap(resume_text, job_desc)
            suggestions = generate_suggestions(score, missing)
            experience_level = predict_experience_level(resume_text)
            learning_roadmap = get_learning_links(missing)
            ats_feedback = ats_simulation(resume_text, job_desc)

            results.append({
                "filename": file.filename,
                "score": score,
                "matched_skills": matched[:10],
                "missing_skills": missing[:10],
                "suggestions": suggestions,
                "experience_level": experience_level,
                "learning_roadmap": learning_roadmap,
                "ats_feedback": ats_feedback  #for ATS rejecting feedback
            })
        return jsonify({"comparison": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# -----------------------
# PDF Generation
# -----------------------
def create_pdf(score, matched, missing, suggestions, experience_level, filename="report.pdf"):
    doc = SimpleDocTemplate(filename)
    styles = getSampleStyleSheet()
    content = []
    content.append(Paragraph(f"ATS Score: {score}%", styles["Title"]))
    content.append(Paragraph(f"Experience Level: {experience_level}", styles["Heading2"]))
    content.append(Paragraph("Matched Skills:", styles["Heading2"]))
    for m in matched: content.append(Paragraph(m, styles["Normal"]))
    content.append(Paragraph("Missing Skills:", styles["Heading2"]))
    for m in missing: content.append(Paragraph(m, styles["Normal"]))
    content.append(Paragraph("Suggestions:", styles["Heading2"]))
    for s in suggestions: content.append(Paragraph(s, styles["Normal"]))
    doc.build(content)
    return filename

def create_comparison_pdf(results, filename="comparison_report.pdf"):
    doc = SimpleDocTemplate(filename)
    styles = getSampleStyleSheet()
    content = []
    for r in results:
        content.append(Paragraph(f"Resume: {r['filename']}", styles["Heading2"]))
        content.append(Paragraph(f"ATS Score: {r['score']}%", styles["Normal"]))
        content.append(Paragraph(f"Experience Level: {r['experience_level']}", styles["Normal"]))
        content.append(Paragraph("Matched Skills:", styles["Normal"]))
        for m in r['matched_skills']: content.append(Paragraph(m, styles["Normal"]))
        content.append(Paragraph("Missing Skills:", styles["Normal"]))
        for m in r['missing_skills']: content.append(Paragraph(m, styles["Normal"]))
        content.append(Paragraph("Suggestions:", styles["Normal"]))
        for s in r['suggestions']: content.append(Paragraph(s, styles["Normal"]))
        content.append(Paragraph("----------------------------------------------------", styles["Normal"]))
    doc.build(content)
    return filename

@app.route('/download', methods=['POST'])
def download():
    data = request.json
    file_path = create_pdf(
        data['score'],
        data['matched_skills'],
        data['missing_skills'],
        data['suggestions'],
        data.get('experience_level', 'N/A')
    )
    return send_file(file_path, as_attachment=True)

@app.route('/download_comparison', methods=['POST'])
def download_comparison():
    data = request.json
    file_path = create_comparison_pdf(data['comparison'])
    return send_file(file_path, as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True)