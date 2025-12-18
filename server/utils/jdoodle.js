// server/utils/jdoodle.js
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const JD_CLIENT_ID = process.env.JDOODLE_CLIENT_ID;
const JD_CLIENT_SECRET = process.env.JDOODLE_CLIENT_SECRET;
const JD_URL = "https://api.jdoodle.com/v1/execute"; // JDoodle execute endpoint

if (!JD_CLIENT_ID || !JD_CLIENT_SECRET) {
  console.warn("⚠️ JDoodle credentials missing in .env (JDOODLE_CLIENT_ID/JDOODLE_CLIENT_SECRET).");
}

export async function runCodeWithJDoodle({ script, language, versionIndex = "0" }) {
  // JDoodle expects { clientId, clientSecret, script, language, versionIndex }
  const payload = {
    clientId: JD_CLIENT_ID,
    clientSecret: JD_CLIENT_SECRET,
    script,
    language,
    versionIndex: String(versionIndex),
  };

  const res = await axios.post(JD_URL, payload, {
    headers: { "Content-Type": "application/json" },
    timeout: 60000,
  });

  return res.data; // contains output, statusCode, memory, cpuTime etc.
}
