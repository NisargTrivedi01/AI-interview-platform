import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// 🧠 Compile and run code using JDOODLE API
router.post("/run-code", async (req, res) => {
  try {
    const { language, code, questionId } = req.body;

    if (!language || !code) {
      return res.status(400).json({ 
        success: false,
        error: "Language and code are required." 
      });
    }

    const langMap = {
      cpp: "cpp17",
      java: "java",
      python: "python3",
      javascript: "nodejs",
      c: "c",
      csharp: "csharp"
    };

    const jdoodleLanguage = langMap[language] || "nodejs";

    const payload = {
      clientId: process.env.JDOODLE_CLIENT_ID,
      clientSecret: process.env.JDOODLE_CLIENT_SECRET,
      script: code,
      stdin: "",
      language: jdoodleLanguage,
      versionIndex: "0",
    };

    console.log(`⚙️ Running ${language} code via JDoodle...`);

    const jdoodleRes = await axios.post(
      "https://api.jdoodle.com/v1/execute",
      payload,
      { timeout: 10000 }
    );

    if (jdoodleRes.data.error) {
      return res.json({
        success: false,
        output: `JDoodle Error: ${jdoodleRes.data.error}`
      });
    }

    // Check if output contains errors
    const output = jdoodleRes.data.output || "No output received";
    const success = !output.toLowerCase().includes("error") && 
                   !output.toLowerCase().includes("exception") &&
                   output !== "No output received";

    res.json({
      success,
      output: output.trim() || "Code executed successfully with no output",
      memory: jdoodleRes.data.memory,
      cpuTime: jdoodleRes.data.cpuTime
    });

  } catch (err) {
    console.error("❌ Error compiling code:", err.message);
    
    let errorMessage = "Code execution failed";
    if (err.code === 'ECONNABORTED') {
      errorMessage = "Execution timeout - code took too long to run";
    } else if (err.response?.data?.error) {
      errorMessage = `JDoodle API Error: ${err.response.data.error}`;
    } else if (err.message) {
      errorMessage = err.message;
    }

    res.json({
      success: false,
      output: errorMessage
    });
  }
});

// Backup compile endpoint (optional)
router.post("/compile", async (req, res) => {
  try {
    const { language, code, input } = req.body;

    if (!language || !code) {
      return res.status(400).json({ error: "Language and code are required." });
    }

    const langMap = {
      cpp: "cpp17",
      java: "java",
      python: "python3",
      javascript: "nodejs",
      c: "c",
      csharp: "csharp"
    };

    const payload = {
      clientId: process.env.JDOODLE_CLIENT_ID,
      clientSecret: process.env.JDOODLE_CLIENT_SECRET,
      script: code,
      stdin: input || "",
      language: langMap[language] || "cpp17",
      versionIndex: "0",
    };

    const jdoodleRes = await axios.post(
      "https://api.jdoodle.com/v1/execute",
      payload
    );

    if (jdoodleRes.data.error) {
      return res.status(400).json({ error: jdoodleRes.data.error });
    }

    res.json({
      output: jdoodleRes.data.output || "⚙️ No output received.",
    });
  } catch (err) {
    console.error("❌ Error compiling code:", err.message);
    res.status(400).json({
      error: err.response?.data?.error || err.message || "Code execution failed",
    });
  }
});

export default router;
// import express from "express";
// import axios from "axios";
// import dotenv from "dotenv";

// dotenv.config();
// const router = express.Router();

// // 🧠 Compile and run code using JDOODLE API
// router.post("/compile", async (req, res) => {
//   try {
//     const { language, code, input } = req.body;

//     if (!language || !code) {
//       return res.status(400).json({ error: "Language and code are required." });
//     }

//     const langMap = {
//       cpp: "cpp17",
//       java: "java",
//       python: "python3",
//       javascript: "nodejs",
//     };

//     const payload = {
//       clientId: process.env.JDOODLE_CLIENT_ID,
//       clientSecret: process.env.JDOODLE_CLIENT_SECRET,
//       script: code,
//       stdin: input || "",
//       language: langMap[language] || "cpp17",
//       versionIndex: "0",
//     };

//     const jdoodleRes = await axios.post(
//       "https://api.jdoodle.com/v1/execute",
//       payload
//     );

//     if (jdoodleRes.data.error) {
//       return res.status(400).json({ error: jdoodleRes.data.error });
//     }

//     res.json({
//       output: jdoodleRes.data.output || "⚙️ No output received.",
//     });
//   } catch (err) {
//     console.error("❌ Error compiling code:", err.message);
//     res.status(400).json({
//       error:
//         err.response?.data?.error ||
//         err.message ||
//         "Code execution failed",
//     });
//   }
// });

// export default router;
