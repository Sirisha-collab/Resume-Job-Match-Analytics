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

  // ---------------- LOGIN UI ----------------
  if (!loggedIn) {
    return (
      <ThemeProvider theme={theme}>
        <Container className="login-container">
          <Card className="glass-card login-card">
            <Typography variant="h5">Login</Typography>
            <TextField label="Username" onChange={(e) => setUsername(e.target.value)} />
            <TextField label="Password" type="password" onChange={(e) => setPassword(e.target.value)} />
            <Button variant="contained" onClick={handleLogin}>
              Login
            </Button>
          </Card>
        </Container>
      </ThemeProvider>
    );
  }

  // ---------------- MAIN UI ----------------
  return (
    <ThemeProvider theme={theme}>
      <AppBar position="static" className="glass-nav">
        <Toolbar>
          <Typography className="title">Resume Analyzer</Typography>
          <FormControlLabel
            control={<Switch checked={darkMode} onChange={() => setDarkMode(!darkMode)} />}
            label="Dark"
          />
        </Toolbar>
      </AppBar>

      <Container className="main-container">
        {/* Upload Section */}
        <Card className="glass-card upload-card">
          <input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files))} />
          <TextField
            multiline
            rows={3}
            placeholder="Paste Job Description"
            fullWidth
            onChange={(e) => setJobDesc(e.target.value)}
          />
          <Button variant="contained" onClick={handleSubmit}>
            Analyze
          </Button>
          {loading && <CircularProgress />}
        </Card>

        {/* Results */}
        {results.length > 0 && (
          <>
            <Button
              variant="contained"
              onClick={handleDownloadAll}
              style={{ margin: "20px 0" }}
            >
              Download Combined PDF
            </Button>

            {results.map((resume, index) => {
              const barData = {
                labels: ["Matched", "Missing"],
                datasets: [
                  {
                    label: "Skills",
                    data: [
                      resume.matched_skills.length,
                      resume.missing_skills.length
                    ]
                  }
                ]
              };

              const pieData = {
                labels: ["Matched", "Missing"],
                datasets: [
                  {
                    data: [
                      resume.matched_skills.length,
                      resume.missing_skills.length
                    ],
                    backgroundColor: ["#2e7d32", "#d32f2f"]
                  }
                ]
              };

              return (
                <Grid container spacing={3} key={index} style={{ marginTop: "20px" }}>
                  {/* Header */}
                  <Grid item xs={12}>
                    <Typography variant="h6">
                      {resume.filename} - Experience: {resume.experience_level}
                    </Typography>
                  </Grid>

                  {/* ATS Score */}
                  <Grid item xs={12} md={4}>
                    <Card className="glass-card ats-card">
                      <Typography>ATS Score</Typography>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${resume.score}%` }}
                        >
                          {resume.score}%
                        </div>
                      </div>
                    </Card>
                  </Grid>

                  {/* Charts */}
                  <Grid item xs={12} md={4}>
                    <Card className="glass-card">
                      <Bar data={barData} options={chartOptions} />
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Card className="glass-card pie-card">
                      <Pie data={pieData} options={chartOptions} />
                    </Card>
                  </Grid>

                  {/* Matched Skills */}
                  <Grid item xs={12} md={6}>
                    <Card className="glass-card">
                      <Typography>Matched Skills</Typography>
                      {resume.matched_skills.map((s, i) => (
                        <Chip key={i} label={s} color="success" className="chip" />
                      ))}
                    </Card>
                  </Grid>

                  {/* Missing Skills + Roadmap */}
                  <Grid item xs={12} md={6}>
                    <Card className="glass-card">
                      <Typography>Missing Skills</Typography>
                      {resume.missing_skills.map((s, i) => (
                        <div key={i}>
                          <Chip label={s} color="error" className="chip" />
                          {resume.learning_roadmap?.[s] && (
                            <List dense>
                              {resume.learning_roadmap[s].map((link, idx) => (
                                <ListItem
                                  key={idx}
                                  component="a"
                                  href={link.url}
                                  target="_blank"
                                >
                                  <ListItemText primary={link.name} />
                                </ListItem>
                              ))}
                            </List>
                          )}
                        </div>
                      ))}
                    </Card>
                  </Grid>

                  {/* Suggestions */}
                  <Grid item xs={12}>
                    <Card className="glass-card">
                      <Typography>Suggestions</Typography>
                      <List>
                        {resume.suggestions.map((s, i) => (
                          <ListItem key={i}>
                            <ListItemText primary={s} />
                          </ListItem>
                        ))}
                      </List>
                    </Card>
                  </Grid>

                  {/* ✅ ATS Feedback Section */}
                  <Grid item xs={12}>
                    <Card className="glass-card">
                      <Typography>ATS Simulation Feedback</Typography>
                      <List>
                        {resume.ats_feedback.map((f, i) => (
                          <ListItem key={i}>
                            <ListItemText primary={f} />
                          </ListItem>
                        ))}
                      </List>
                    </Card>
                  </Grid>

                  {/* Download */}
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      onClick={() => handleDownload(resume)}
                    >
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