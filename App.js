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
  Box,
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

ChartJS.register(BarElement, ArcElement, CategoryScale, LinearScale);

function App() {
  const [file, setFile] = useState(null);
  const [jobDesc, setJobDesc] = useState("");
  const [score, setScore] = useState(null);
  const [matched, setMatched] = useState([]);
  const [missing, setMissing] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  const theme = createTheme({
    palette: { mode: darkMode ? "dark" : "light" },
  });

  const barData = {
    labels: ["Matched Skills", "Missing Skills"],
    datasets: [
      {
        label: "Skills Analysis",
        data: [matched.length, missing.length],
        backgroundColor: ["#4caf50", "#f44336"]
      }
    ]
  };

  const pieData = {
    labels: ["Matched Skills", "Missing Skills"],
    datasets: [
      {
        data: [matched.length, missing.length],
        backgroundColor: ["#4caf50", "#f44336"]
      }
    ]
  };

  const handleLogin = async () => {
    try {
      const res = await axios.post(
        "http://127.0.0.1:5000/login",
        { username, password },
        { headers: { "Content-Type": "application/json" } }
      );
      setLoggedIn(true);
      alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.error || "Login failed");
    }
  };

  const handleSubmit = async () => {
    if (!file || !jobDesc) return alert("Upload resume and enter job description");
    const formData = new FormData();
    formData.append("resume", file);
    formData.append("job_description", jobDesc);
    try {
      setLoading(true);
      const res = await axios.post("http://127.0.0.1:5000/analyze", formData);
      setScore(res.data.score);
      setMatched(res.data.matched_skills);
      setMissing(res.data.missing_skills);
      setSuggestions(res.data.suggestions);
    } catch (err) {
      console.error(err);
      alert("Error analyzing resume");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    const res = await axios.post(
      "http://127.0.0.1:5000/download",
      { score, matched_skills: matched, missing_skills: missing, suggestions },
      { responseType: "blob" }
    );
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "resume_report.pdf");
    document.body.appendChild(link);
    link.click();
  };

  if (!loggedIn) {
    return (
      <ThemeProvider theme={theme}>
        <Container maxWidth="sm" sx={{ mt: 10 }}>
          <Card sx={{ p: 4 }}>
            <Typography variant="h4" textAlign="center" gutterBottom>
              Login
            </Typography>
            <TextField
              label="Username"
              fullWidth
              sx={{ mb: 2 }}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              sx={{ mb: 2 }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button variant="contained" color="primary" fullWidth onClick={handleLogin}>
              Login
            </Button>
          </Card>
        </Container>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Resume Analyzer
          </Typography>
          <FormControlLabel
            control={<Switch checked={darkMode} onChange={() => setDarkMode(!darkMode)} />}
            label="Dark Mode"
          />
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4 }}>
        {/* Upload Section */}
        <Card sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Upload Resume & Job Description
          </Typography>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} style={{ marginBottom: "16px" }} />
          <TextField
            multiline
            minRows={4}
            placeholder="Paste Job Description"
            fullWidth
            sx={{ mb: 2 }}
            value={jobDesc}
            onChange={(e) => setJobDesc(e.target.value)}
          />
          <Button variant="contained" color="primary" onClick={handleSubmit} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : "Analyze Resume"}
          </Button>
        </Card>

        {/* Dashboard Section */}
        {score && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  ATS Score
                </Typography>
                <Box sx={{ width: "100%", bgcolor: "#eee", borderRadius: 2 }}>
                  <Box
                    sx={{
                      width: `${score}%`,
                      bgcolor: score > 70 ? "success.main" : "warning.main",
                      p: 1,
                      color: "#fff",
                      textAlign: "center",
                      borderRadius: 2
                    }}
                  >
                    {score}%
                  </Box>
                </Box>
              </Card>

              <Card sx={{ p: 3, mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  🤖 AI Suggestions
                </Typography>
                <List dense>
                  {suggestions.map((s, i) => (
                    <ListItem key={i}>
                      <ListItemText primary={s} />
                    </ListItem>
                  ))}
                </List>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Skills Chart (Bar)
                </Typography>
                <Bar data={barData} />
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card sx={{ p: 3, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Skills Distribution (Pie)
                </Typography>
                <Pie data={pieData} />
              </Card>

              <Card sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Skills Overview
                </Typography>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="subtitle2">✅ Matched Skills</Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {matched.map((skill, i) => (
                      <Chip key={i} label={skill} color="success" />
                    ))}
                  </Box>
                </Box>
                <Box sx={{ mt: 1 }}>
                  <Typography variant="subtitle2">❌ Missing Skills</Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {missing.map((skill, i) => (
                      <Chip key={i} label={skill} color="error" />
                    ))}
                  </Box>
                </Box>
              </Card>
            </Grid>

            <Grid item xs={12} textAlign="center" sx={{ mt: 2 }}>
              <Button variant="contained" color="secondary" onClick={handleDownload}>
                Download PDF Report
              </Button>
            </Grid>
          </Grid>
        )}
      </Container>
    </ThemeProvider>
  );
}

export default App;