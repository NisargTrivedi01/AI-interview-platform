// client/src/components/QuestionPage.js
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function QuestionPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);

  // state should be provided by the route navigation (Home -> startInterview -> questions)
  // expected: { questions: [...], interviewId: "...", roundType: "aptitude" }
  const questions = state?.questions || [];
  const interviewId = state?.interviewId || localStorage.getItem("interviewId");
  const roundType = state?.roundType || localStorage.getItem("roundType") || "";

  const handleAnswer = (ans) => {
    const newAnswers = [...answers];
    newAnswers[current] = ans;
    setAnswers(newAnswers);
  };

  const next = () => {
    if (current < questions.length - 1) setCurrent(current + 1);
    else {
      // pass questions, interviewId, roundType, answers to ResultPage
      navigate("/result", { state: { answers, interviewId, questions, roundType } });
    }
  };

  if (!questions.length) return <p className="p-6 text-center">No questions available.</p>;

  const q = questions[current];

  return (
    <div className="p-6">
      <h2 className="font-semibold mb-4">
        Q{current + 1}. {q.question || q.title || ""}
      </h2>

      {q.type === "mcq" || Array.isArray(q.options) ? (
        (q.options || []).map((opt, i) => (
          <button
            key={i}
            onClick={() => handleAnswer(opt)}
            className={`block w-full text-left border p-2 mb-2 rounded ${
              answers[current] === opt ? "bg-blue-300" : "bg-white"
            }`}
          >
            {opt}
          </button>
        ))
      ) : q.type === "coding" ? (
        <>
          <textarea
            className="w-full h-48 p-2 mb-2 bg-white text-black rounded"
            placeholder="Write your code / explanation here..."
            value={answers[current] || ""}
            onChange={(e) => handleAnswer(e.target.value)}
          />
        </>
      ) : (
        <>
          <textarea
            className="w-full h-32 p-2 mb-2 bg-white text-black rounded"
            placeholder="Write your answer..."
            value={answers[current] || ""}
            onChange={(e) => handleAnswer(e.target.value)}
          />
        </>
      )}

      <div className="flex justify-between mt-4">
        <button
          onClick={() => navigate("/dashboard")}
          className="bg-gray-700 text-white px-4 py-2 rounded"
        >
          Cancel
        </button>

        <button
          onClick={next}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          {current < questions.length - 1 ? "Next" : "Submit"}
        </button>
      </div>
    </div>
  );
}

// import React, { useState } from "react";
// import { useNavigate, useLocation } from "react-router-dom";

// export default function QuestionPage() {
//   const { state } = useLocation();
//   const navigate = useNavigate();
//   const [current, setCurrent] = useState(0);
//   const [answers, setAnswers] = useState([]);
//   const questions = state?.questions || [];
//   const interviewId = state?.interviewId;

//   const handleAnswer = (ans) => {
//     const newAnswers = [...answers];
//     newAnswers[current] = ans;
//     setAnswers(newAnswers);
//   };

//   const next = () => {
//     if (current < questions.length - 1) setCurrent(current + 1);
//     else navigate("/result", { state: { answers, interviewId } });
//   };

//   if (!questions.length) return <p>No questions available.</p>;

//   return (
//     <div className="p-6">
//       <h2 className="font-semibold mb-4">
//         Q{current + 1}. {questions[current].question}
//       </h2>
//       {questions[current].options.map((opt, i) => (
//         <button
//           key={i}
//           onClick={() => handleAnswer(opt)}
//           className={`block w-full text-left border p-2 mb-2 rounded ${
//             answers[current] === opt ? "bg-blue-300" : "bg-white"
//           }`}
//         >
//           {opt}
//         </button>
//       ))}
//       <button
//         onClick={next}
//         className="bg-green-500 text-white px-4 py-2 rounded mt-4"
//       >
//         {current < questions.length - 1 ? "Next" : "Submit"}
//       </button>
//     </div>
//   );
// }
