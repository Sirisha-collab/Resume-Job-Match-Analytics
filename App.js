import React, { useState } from "react";
import axios from "axios";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement
} from "chart.js";
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Button,
  TextField,
  CircularProgress,
  Card,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  Switch,
  FormControlLabel
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import "./App.css";

ChartJS.register(BarElement, ArcElement, CategoryScale, LinearScale);

function App() {
  const [files, setFiles] = useState([]);
  const [jobDesc, setJobDesc] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  const theme = createTheme({
    palette: { mode: darkMode ? "dark" : "light" }
  });

  const chartOptions = {
    animation: { duration: 1500 },
    plugins: { legend: { position: "bottom" } }
  };

  const handleLogin = async () => {
    try {
      await axios.post("http://127.0.0.1:5000/login", { username, password });
      setLoggedIn(true);
    } catch {
      alert("Login failed");
    }
  };

  const handleSubmit = async () => {
    if (!files.length || !jobDesc) return alert("Upload resumes & job description");

    const formData = new FormData();
    files.forEach(f => formData.append("resumes", f));
    formData.append("job_description", jobDesc);

    try {
      setLoading(true);
      const res = await axios.post("http://127.0.0.1:5000/compare", formData);
      setResults(res.data.comparison);
    } catch {
      alert("Error analyzing resumes");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (resume) => {
    const res = await axios.post(
      "http://127.0.0.1:5000/download",
      resume,
      { responseType: "blob" }
    );

    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${resume.filename}_report.pdf`);
    document.body.appendChild(link);
    link.click();
  };

  const handleDownloadAll = async () => {
    const res = await axios.post(
      "http://127.0.0.1:5000/download_comparison",
      { comparison: results },
      { responseType: "blob" }
    );

    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "comparison_report.pdf");
    document.body.appendChild(link);
    link.click();
  };

  if (!loggedIn) {
    return (
      <ThemeProvider theme={theme}>
        <Container className="login-container">
          <Card className="glass-card login-card">
            <Typography variant="h5">Login</Typography>
            <TextField label="Username" onChange={(e) => setUsername(e.target.value)} />
            <TextField label="Password" type="password" onChange={(e) => setPassword(e.target.value)} />
            <Button variant="contained" onClick={handleLogin}>Login</Button>
          </Card>
        </Container>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6">AI Resume Analyzer</Typography>
          <FormControlLabel
            control={<Switch checked={darkMode} onChange={() => setDarkMode(!darkMode)} />}
            label="Dark"
          />
        </Toolbar>
      </AppBar>

      <Container>
        {/* Upload */}
        <Card style={{ padding: 20, marginTop: 20 }}>
          <input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files))} />
          <TextField
            multiline rows={3}
            fullWidth
            placeholder="Paste Job Description"
            onChange={(e) => setJobDesc(e.target.value)}
            style={{ marginTop: 10 }}
          />
          <Button variant="contained" onClick={handleSubmit} style={{ marginTop: 10 }}>
            Analyze
          </Button>
          {loading && <CircularProgress />}
        </Card>

        {results.length > 0 && (
          <>
            <Button onClick={handleDownloadAll} variant="contained" style={{ marginTop: 20 }}>
              Download Combined PDF
            </Button>

            {results.map((resume, index) => {
              const barData = {
                labels: ["Matched", "Missing"],
                datasets: [{ data: [resume.matched_skills.length, resume.missing_skills.length] }]
              };

              const pieData = {
                labels: ["Matched", "Missing"],
                datasets: [{
                  data: [resume.matched_skills.length, resume.missing_skills.length],
                  backgroundColor: ["#2e7d32", "#d32f2f"]
                }]
              };

              return (
                <Grid container spacing={3} key={index} style={{ marginTop: 20 }}>
                  
                  {/* Header */}
                  <Grid item xs={12}>
                    <Typography variant="h6">
                      {resume.filename} | Experience: {resume.experience_level}
                    </Typography>
                  </Grid>

                  {/* ATS Score */}
                  <Grid item xs={12} md={4}>
                    <Card style={{ padding: 15 }}>
                      <Typography>ATS Score</Typography>
                      <Typography variant="h5">{resume.score}%</Typography>
                    </Card>
                  </Grid>

                  {/* ✅ ML Score */}
                  <Grid item xs={12} md={4}>
                    <Card style={{ padding: 15 }}>
                      <Typography>AI Resume Score</Typography>
                      <Typography variant="h5">{resume.ml_score}%</Typography>
                      <Typography variant="body2">
                        Confidence: {resume.ml_confidence}
                      </Typography>
                    </Card>
                  </Grid>

                  {/* Charts */}
                  <Grid item xs={12} md={4}>
                    <Card><Bar data={barData} options={chartOptions} /></Card>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Card><Pie data={pieData} options={chartOptions} /></Card>
                  </Grid>

                  {/* Matched */}
                  <Grid item xs={12} md={6}>
                    <Card>
                      <Typography>Matched Skills</Typography>
                      {resume.matched_skills.map((s,i)=><Chip key={i} label={s} color="success" />)}
                    </Card>
                  </Grid>

                  {/* Missing */}
                  <Grid item xs={12} md={6}>
                    <Card>
                      <Typography>Missing Skills</Typography>
                      {resume.missing_skills.map((s,i)=><Chip key={i} label={s} color="error" />)}
                    </Card>
                  </Grid>

                  {/* Roadmap */}
                  <Grid item xs={12}>
                    <Card>
                      <Typography>Learning Roadmap</Typography>
                      {Object.entries(resume.learning_roadmap || {}).map(([skill, links]) => (
                        <div key={skill}>
                          <Typography>{skill}</Typography>
                          {links.map((l,i)=>(
                            <a key={i} href={l.url} target="_blank" rel="noreferrer">{l.name}</a>
                          ))}
                        </div>
                      ))}
                    </Card>
                  </Grid>

                  {/* ATS */}
                  <Grid item xs={12}>
                    <Card>
                      <Typography>ATS Feedback</Typography>
                      {resume.ats_feedback.map((f,i)=><Typography key={i}>{f}</Typography>)}
                    </Card>
                  </Grid>

                  {/* Resume Fix */}
                  <Grid item xs={12}>
                    <Card>
                      <Typography>AI Improvements</Typography>
                      {resume.resume_fixes.map((f,i)=>(
                        <div key={i}>
                          <p>❌ {f.original}</p>
                          <p>✅ {f.improved}</p>
                        </div>
                      ))}
                    </Card>
                  </Grid>

                  <Grid item xs={12}>
                    <Button onClick={()=>handleDownload(resume)} variant="contained">
                      Download PDF
                    </Button>
                  </Grid>

                </Grid>
              );
            })}
          </>
        )}
      </Container>
    </ThemeProvider>
  );
}

export default App;