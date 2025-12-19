import React from "react";
import { useNavigate } from "react-router-dom";

export default function SelectRound() {
  const navigate = useNavigate();
  const rounds = ["Aptitude", "Coding", "Technical", "HR"];

  const handleSelect = (round) => {
    localStorage.setItem("roundType", round);
    navigate("/interview");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h2 className="text-2xl font-bold mb-6">Select Interview Round</h2>
      {rounds.map((r) => (
        <button
          key={r}
          onClick={() => handleSelect(r)}
          className="bg-blue-500 text-white px-4 py-2 rounded mb-3 hover:bg-blue-600 w-48"
        >
          {r} Round
        </button>
      ))}
    </div>
  );
}



// import { motion } from "framer-motion";
// import { useNavigate } from "react-router-dom";

// const rounds = [
//   { type: "Aptitude", title: "Aptitude Round", color: "bg-blue-500" },
//   { type: "Coding", title: "Coding Round", color: "bg-green-500" },
//   { type: "Technical", title: "Technical Round", color: "bg-purple-500" },
//   { type: "HR", title: "HR Round", color: "bg-pink-500" },
// ];

// export default function SelectRound({ onSelect }) {
//   const navigate = useNavigate();

//   const handleRoundSelect = (roundType) => {
//   if (onSelect) onSelect(roundType);

//   switch (roundType) {
//     case "Aptitude":
//       navigate("/aptitude-round");
//       break;
//     case "Coding":
//       navigate("/coding-round");
//       break;
//     case "Technical":
//       navigate("/technical-round");
//       break;
//     case "HR":
//       navigate("/hr-round");
//       break;
//     default:
//       navigate("/");
//   }
// };


//   return (
//     <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white">
//       <motion.h1
//         initial={{ opacity: 0, y: -20 }}
//         animate={{ opacity: 1, y: 0 }}
//         className="text-4xl font-bold mb-8"
//       >
//         Choose Your Interview Round
//       </motion.h1>

//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//         {rounds.map((round) => (
//           <motion.button
//             key={round.type}
//             whileHover={{ scale: 1.05 }}
//             whileTap={{ scale: 0.95 }}
//             className={`px-8 py-6 text-lg rounded-xl shadow-lg ${round.color} hover:opacity-90 transition`}
//             onClick={() => handleRoundSelect(round.type)}
//           >
//             {round.title}
//           </motion.button>
//         ))}
//       </div>
//     </div>
//   );
// }
