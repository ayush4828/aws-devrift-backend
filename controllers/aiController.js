const { GoogleGenerativeAI } = require("@google/generative-ai");
const Repository = require("../model/repoModel");
const Issue      = require("../model/issueModel");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function askAI(prompt, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      const is503 = err.message?.includes("503") || err.message?.includes("Service Unavailable") || err.message?.includes("high demand");
      const is429 = err.message?.includes("429") || err.message?.includes("quota");

      if (is429) {
        throw new Error(
          "Gemini API quota exceeded. Your free-tier daily limit has been reached. " +
          "Please get a new API key at https://aistudio.google.com/app/apikey and update GEMINI_API_KEY in your .env file."
        );
      }

      if (is503 && attempt < retries) {
        const waitMs = attempt * 3000; // 3s, 6s, 9s
        console.log(`[AI] Gemini 503 on attempt ${attempt}. Retrying in ${waitMs / 1000}s...`);
        await sleep(waitMs);
        continue;
      }

      if (is503) {
        throw new Error("The AI service is currently overloaded. Please try again in a few seconds.");
      }

      throw err;
    }
  }
}




const explainRepo = async (req, res) => {
  const { repoId } = req.params;
  try {
    const repo = await Repository.findById(repoId).populate("owner");
    if (!repo) return res.status(404).json({ message: "Repository not found" });

    const issues = await Issue.find({ repository: repoId }).limit(10);

    const commitSummary = (repo.commits || [])
      .slice(-10)
      .map(c => `- [${c.commitId?.slice(0, 7)}] "${c.message}" (${c.files?.length ?? 0} files, ${new Date(c.timestamp).toLocaleDateString()})`)
      .join("\n");

    const fileSummary = (repo.commits?.slice(-1)[0]?.files || [])
      .map(f => `  • ${f.filename}`)
      .join("\n");

    const issueSummary = issues
      .map(i => `- [${i.status.toUpperCase()}] ${i.title}`)
      .join("\n");

    const prompt = `
You are a senior developer assistant. Analyze the following DevRift repository and give a clear, friendly, non-technical explanation that anyone can understand.

Repository Name: ${repo.name}
Description: ${repo.description || "No description provided"}
Visibility: ${repo.visibility ? "Public" : "Private"}
Owner: ${repo.owner?.username || "Unknown"}
Total Commits: ${repo.commits?.length ?? 0}
Last Pushed: ${repo.lastPushedAt ? new Date(repo.lastPushedAt).toLocaleDateString() : "Never"}

Recent Commits:
${commitSummary || "No commits yet"}

Latest Files:
${fileSummary || "No files yet"}

Open Issues:
${issueSummary || "No issues"}

Please provide:
1. **What this project does** (2-3 sentences, plain English)
2. **Tech stack guess** (based on file extensions)
3. **Current status** (active, stale, new?)
4. **Key highlights** (3 bullet points)

Keep it concise, friendly, and use markdown formatting.
`.trim();

    const explanation = await askAI(prompt);
    res.json({ explanation });
  } catch (err) {
    res.status(500).json({ message: "AI explain failed", error: err.message });
  }
};

const analyzeHealth = async (req, res) => {
  const { repoId } = req.params;
  try {
    const repo   = await Repository.findById(repoId);
    if (!repo) return res.status(404).json({ message: "Repository not found" });

    const issues = await Issue.find({ repository: repoId });

    const openIssues   = issues.filter(i => i.status === "open").length;
    const closedIssues = issues.filter(i => i.status === "closed").length;
    const totalCommits = repo.commits?.length ?? 0;

    let commitsPerWeek = 0;
    if (totalCommits > 0 && repo.createdAt) {
      const ageWeeks = Math.max(
        1,
        (Date.now() - new Date(repo.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 7)
      );
      commitsPerWeek = (totalCommits / ageWeeks).toFixed(2);
    }

    const daysSinceLastPush = repo.lastPushedAt
      ? Math.floor((Date.now() - new Date(repo.lastPushedAt).getTime()) / 86400000)
      : null;

    const filesInLatestCommit = repo.commits?.slice(-1)[0]?.files?.length ?? 0;

    const prompt = `
You are a software project health analyst. Analyze this repository's metrics and provide a health report.

Repository: ${repo.name}
Description: ${repo.description || "No description"}
Total Commits: ${totalCommits}
Commits per Week (avg): ${commitsPerWeek}
Days Since Last Push: ${daysSinceLastPush !== null ? daysSinceLastPush : "Never pushed"}
Files in Latest Commit: ${filesInLatestCommit}
Open Issues: ${openIssues}
Closed Issues: ${closedIssues}
Issue Resolution Rate: ${issues.length > 0 ? Math.round((closedIssues / issues.length) * 100) : 0}%
Visibility: ${repo.visibility ? "Public" : "Private"}

Based on these metrics, provide:

## Health Score
Give a score from 0-100 and a grade (A/B/C/D/F). Format: **Score: XX/100 (Grade: X)**

## Analysis
- **Activity**: Is this project actively maintained?
- **Issue Management**: How well are issues being handled?
- **Code Consistency**: Comment on commit frequency and regularity

## Strengths
List 2-3 things this repo is doing well

## Areas for Improvement  
List 2-3 specific, actionable recommendations

## Summary
One sentence verdict

Use markdown formatting. Be honest but constructive.
`.trim();

    const analysis = await askAI(prompt);
    res.json({
      analysis,
      metrics: {
        totalCommits,
        commitsPerWeek: parseFloat(commitsPerWeek),
        daysSinceLastPush,
        openIssues,
        closedIssues,
        issueResolutionRate: issues.length > 0 ? Math.round((closedIssues / issues.length) * 100) : 0,
        filesInLatestCommit,
      }
    });
  } catch (err) {
    res.status(500).json({ message: "AI health analysis failed", error: err.message });
  }
};

const generateResume = async (req, res) => {
  const { userId } = req.params;
  try {
    const repos  = await Repository.find({ owner: userId }).populate("owner");
    const issues = await Issue.find({
      repository: { $in: repos.map(r => r._id) }
    });

    const ownerInfo = repos[0]?.owner || {};
    const username  = ownerInfo.username || "Developer";
    const email     = ownerInfo.email    || "your@email.com";

    const repoList = repos.map(r => {
      const files       = r.commits?.flatMap(c => c.files?.map(f => f.filename) || []) || [];
      const uniqueFiles = [...new Set(files)];
      const extensions  = [...new Set(uniqueFiles.map(f => f.split(".").pop()))];
      return `
- **${r.name}** (${r.visibility ? "Public" : "Private"})
  Description: ${r.description || "No description"}
  Commits: ${r.commits?.length ?? 0} | Last pushed: ${r.lastPushedAt ? new Date(r.lastPushedAt).toLocaleDateString() : "Never"}
  Files: ${uniqueFiles.slice(0, 8).join(", ")}${uniqueFiles.length > 8 ? "..." : ""}
  Technologies detected: ${extensions.join(", ")}`;
    }).join("\n");

    const issueStats = {
      total:  issues.length,
      open:   issues.filter(i => i.status === "open").length,
      closed: issues.filter(i => i.status === "closed").length,
    };

    const totalCommits = repos.reduce((sum, r) => sum + (r.commits?.length ?? 0), 0);

    if (repos.length === 0) {
      return res.status(400).json({
        message: "No repositories found. Create and push to at least one repository before generating a resume."
      });
    }

    const prompt = `
You are a professional resume writer and career advisor. Generate a polished developer resume based on this DevRift profile data.

Developer Profile:
- Username: ${username}
- Email: ${email}
- Total Repositories: ${repos.length}
- Total Commits: ${totalCommits}
- Issues Created: ${issueStats.total} (${issueStats.closed} resolved)

Repositories:
${repoList}

Generate a professional resume in this exact markdown format:

# ${username} — Developer Resume

## 👤 Profile
[2-3 sentence professional summary based on their project portfolio]

## 🛠 Technical Skills
[List technologies/languages detected from file extensions, organized by category]

## 💼 Projects

[For each repo, create a professional project entry with:
- Project name as heading
- 1-2 sentence description (enhance the description if it's vague)
- Key technical details
- Achievement/impact statement based on commit count and activity]

## 📊 Development Activity
- Total commits across all projects: ${totalCommits}
- Repositories maintained: ${repos.length}
- Issue resolution rate: ${issueStats.total > 0 ? Math.round((issueStats.closed / issueStats.total) * 100) : 0}%

## 📬 Contact
- Email: ${email}
- DevRift Profile: [View Profile]

---
*Generated by DevRift AI on ${new Date().toLocaleDateString()}*

Make it professional, impressive, and accurate. Use the actual project names and technologies detected.
`.trim();

    const resume = await askAI(prompt);
    res.json({ resume, stats: { totalRepos: repos.length, totalCommits, issueStats } });
  } catch (err) {
    res.status(500).json({ message: err.message, error: err.message });
  }
};

const generateReadme = async (req, res) => {
  const { repoId } = req.params;
  try {
    const repo = await Repository.findById(repoId).populate("owner");
    if (!repo) return res.status(404).json({ message: "Repository not found" });

    const ownerName = repo.owner?.username || "Developer";

    const files = repo.commits?.flatMap(c => c.files?.map(f => f.filename) || []) || [];
    const uniqueFiles = [...new Set(files)];
    
    const recentCommits = (repo.commits || [])
      .slice(-10)
      .map(c => `- ${c.message}`)
      .join("\n");

    const prompt = `
You are an expert technical writer and developer. Write a professional, comprehensive README.md file for the following repository.

Repository Name: ${repo.name}
Description: ${repo.description || "A project built by " + ownerName}
Owner: ${ownerName}
Files detected in project: ${uniqueFiles.join(", ") || "No files uploaded yet"}
Recent commit activity: 
${recentCommits || "No recent commits"}

Please generate the Markdown for the README.md file. It should include the following sections if they make sense based on the file names:
- Project Title & Description
- Key Features (invent 3-4 likely features based on the context)
- Tech Stack (guess this accurately based on the file extensions like .js, .py, .jsx, .html)
- Getting Started / Installation
- Contributing

Make it beautifully formatted with emojis, clear headings, and code blocks where appropriate. Do NOT wrap the entire response in triple backticks, just return the raw markdown content directly.
`.trim();

    const readme = await askAI(prompt);
    res.json({ readme });
  } catch (err) {
    res.status(500).json({ message: "AI README generation failed", error: err.message });
  }
};

module.exports = { explainRepo, analyzeHealth, generateResume, generateReadme };

