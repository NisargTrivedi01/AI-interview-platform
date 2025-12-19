// client/src/components/ResultPage.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";

export default function ResultPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);

  useEffect(() => {
    const submit = async () => {
      try {
        const interviewId = state?.interviewId || localStorage.getItem("interviewId");
        const roundType = state?.roundType || localStorage.getItem("roundType");
        const questions = state?.questions || JSON.parse(localStorage.getItem(`questions_${roundType}`) || "[]");
        const answers = state?.answers || [];

        if (!roundType) {
          alert("Round type missing. Cannot submit.");
          return navigate("/dashboard");
        }

        const payload = {
          interviewId,
          roundType,
          answers,
          questions,
          userId: localStorage.getItem("userId")
        };

        const res = await axios.post("http://localhost:5000/api/interview/submit", payload);
        setResult(res.data);

        // Update local copy: mark this round as completed locally if needed
        // (optional) — you already store interviewId on start
      } catch (err) {
        console.error("Error submitting interview:", err);
        alert("Error submitting interview. Check console.");
        return navigate("/dashboard");
      }
    };
    submit();
  }, [state, navigate]);

  if (!result) return <p className="text-center mt-10">Calculating results...</p>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h2 className="text-2xl font-bold mb-3">Interview Completed 🎉</h2>
      <p className="text-lg mb-2">Score: {result.score}%</p>
      <p className="italic text-gray-600 mb-6">{result.feedback?.strength || result.feedback || ""}</p>
      <button
        onClick={() => {
          // clear current roundType so next selected round can be started cleanly
          localStorage.removeItem("roundType");
          // navigate to dashboard to view updated results
          navigate("/dashboard");
        }}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Go to Dashboard
      </button>
    </div>
  );
}

// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { useLocation, useNavigate } from "react-router-dom";

// export default function ResultPage() {
//   const { state } = useLocation();
//   const navigate = useNavigate();
//   const [result, setResult] = useState(null);

//   useEffect(() => {
//     const submit = async () => {
//       try {
//         const res = await axios.post("http://localhost:5000/api/interview/submit", {
//           interviewId: state.interviewId,
//           answers: state.answers,
//         });
//         setResult(res.data);
//       } catch (err) {
//         alert("Error submitting interview: " + err.message);
//       }
//     };
//     submit();
//   }, [state]);

//   if (!result) return <p className="text-center mt-10">Calculating results...</p>;

//   return (
//     <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
//       <h2 className="text-2xl font-bold mb-3">Interview Completed 🎉</h2>
//       <p className="text-lg mb-2">Score: {result.score}</p>
//       <p className="italic text-gray-600 mb-6">{result.feedback}</p>
//       <button
//         onClick={() => navigate("/dashboard")}
//         className="bg-blue-500 text-white px-4 py-2 rounded"
//       >
//         Go to Dashboard
//       </button>
//     </div>
//   );
// }
