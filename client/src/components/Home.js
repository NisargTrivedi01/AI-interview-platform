import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/signup");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 text-white">
      <Navbar />
      
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
              Master Your
            </span>
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
              Technical Interviews
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            AI-powered interview platform with real-time coding challenges, 
            technical questions, and personalized feedback to help you land your dream job.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <button
              onClick={handleGetStarted}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 px-8 py-4 rounded-xl text-lg font-semibold transition-all transform hover:scale-105 shadow-2xl"
            >
              🚀 Start Practicing Now
            </button>
            <button className="border border-gray-600 hover:border-cyan-500 text-gray-300 hover:text-cyan-400 px-8 py-4 rounded-xl text-lg font-semibold transition-all">
              📚 Learn More
            </button>
          </div>

          {/* Perfect for Beginners Section - REPLACED STATS */}
          <div className="mb-20">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-10 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              Start Your Interview Journey Here
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {beginnerBenefits.map((benefit, index) => (
                <div key={index} className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 rounded-2xl border border-gray-700 hover:border-yellow-500/50 transition-all transform hover:scale-[1.02] group">
                  <div className="text-3xl mb-4 group-hover:scale-110 transition-transform duration-300">{benefit.icon}</div>
                  <h3 className="text-xl font-semibold text-white mb-3">{benefit.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mb-20">
          <h2 className="text-4xl font-bold text-center mb-12 bg-gradient-to-r from-green-400 to-cyan-500 bg-clip-text text-transparent">
            Why Choose AI InterviewPrep?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-gray-800/30 p-6 rounded-2xl border border-gray-700 hover:border-cyan-500/50 transition-all group">
                <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-2xl p-12 border border-purple-500/30">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Ace Your Next Interview?
          </h2>
          <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of developers who have improved their interview skills with our AI-powered platform.
          </p>
          <button
            onClick={handleGetStarted}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-8 py-4 rounded-xl text-lg font-semibold transition-all transform hover:scale-105"
          >
            Start Your Journey Today
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2025 AI InterviewPrep. Built with ❤️ for developers worldwide.
          </p>
        </div>
      </footer>
    </div>
  );
}

// Updated features array (unchanged)
const features = [
  {
    icon: "💻",
    title: "Real Coding Environment",
    description: "Practice in a realistic IDE with syntax highlighting, code execution, and test cases."
  },
  {
    icon: "🤖",
    title: "AI-Powered Feedback",
    description: "Get instant, personalized feedback on your code and problem-solving approach."
  },
  {
    icon: "📊",
    title: "Progress Analytics",
    description: "Track your improvement with detailed analytics and performance metrics."
  },
  {
    icon: "⏱️",
    title: "Timed Challenges",
    description: "Simulate real interview conditions with timed coding sessions."
  },
  {
    icon: "🎯",
    title: "Company-Specific Questions",
    description: "Practice with questions tailored to specific companies and roles."
  },
  {
    icon: "🔄",
    title: "Multiple Rounds",
    description: "Experience complete interview cycles: Coding, Technical, Aptitude, and HR rounds."
  }
];

// NEW: Beginner Benefits Section
const beginnerBenefits = [
  {
    icon: "👨‍💻",
    title: "Built by Students, for Students",
    description: "A college project designed to help fellow developers start their interview preparation journey."
  },
  {
    icon: "🎓",
    title: "Learn by Building",
    description: "Perfect first project to understand full-stack development with real-world features."
  },
  {
    icon: "🚀",
    title: "Start From Scratch",
    description: "Be among the first to experience and grow with our platform as we add new features."
  }
];
// import React from "react";
// import { useNavigate } from "react-router-dom";
// import { useAuth } from "../context/AuthContext";
// import Navbar from "../components/Navbar";

// export default function HomePage() {
//   const { user } = useAuth();
//   const navigate = useNavigate();

//   const handleGetStarted = () => {
//     if (user) {
//       navigate("/dashboard");
//     } else {
//       navigate("/signup");
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 text-white">
//       <Navbar />
      
//       {/* Hero Section */}
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
//         <div className="text-center">
//           <h1 className="text-5xl md:text-7xl font-bold mb-6">
//             <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
//               Master Your
//             </span>
//             <br />
//             <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
//               Technical Interviews
//             </span>
//           </h1>
          
//           <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
//             AI-powered interview platform with real-time coding challenges, 
//             technical questions, and personalized feedback to help you land your dream job.
//           </p>

//           <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
//             <button
//               onClick={handleGetStarted}
//               className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 px-8 py-4 rounded-xl text-lg font-semibold transition-all transform hover:scale-105 shadow-2xl"
//             >
//               🚀 Start Practicing Now
//             </button>
//             <button className="border border-gray-600 hover:border-cyan-500 text-gray-300 hover:text-cyan-400 px-8 py-4 rounded-xl text-lg font-semibold transition-all">
//               📚 Learn More
//             </button>
//           </div>

//           {/* Stats */}
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
//             <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
//               <div className="text-3xl font-bold text-cyan-400 mb-2">1000+</div>
//               <div className="text-gray-400">Practice Questions</div>
//             </div>
//             <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
//               <div className="text-3xl font-bold text-blue-400 mb-2">50+</div>
//               <div className="text-gray-400">Company Patterns</div>
//             </div>
//             <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
//               <div className="text-3xl font-bold text-purple-400 mb-2">24/7</div>
//               <div className="text-gray-400">AI Feedback</div>
//             </div>
//           </div>
//         </div>

//         {/* Features Section */}
//         <div className="mb-20">
//           <h2 className="text-4xl font-bold text-center mb-12 bg-gradient-to-r from-green-400 to-cyan-500 bg-clip-text text-transparent">
//             Why Choose AI InterviewPrep?
//           </h2>
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
//             {features.map((feature, index) => (
//               <div key={index} className="bg-gray-800/30 p-6 rounded-2xl border border-gray-700 hover:border-cyan-500/50 transition-all group">
//                 <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">{feature.icon}</div>
//                 <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
//                 <p className="text-gray-400 leading-relaxed">{feature.description}</p>
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* CTA Section */}
//         <div className="text-center bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-2xl p-12 border border-purple-500/30">
//           <h2 className="text-3xl md:text-4xl font-bold mb-4">
//             Ready to Ace Your Next Interview?
//           </h2>
//           <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
//             Join thousands of developers who have improved their interview skills with our AI-powered platform.
//           </p>
//           <button
//             onClick={handleGetStarted}
//             className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-8 py-4 rounded-xl text-lg font-semibold transition-all transform hover:scale-105"
//           >
//             Start Your Journey Today
//           </button>
//         </div>
//       </div>

//       {/* Footer */}
//       <footer className="border-t border-gray-800 py-8">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
//           <p className="text-gray-400">
//             © 2024 AI InterviewPrep. Built with ❤️ for developers worldwide.
//           </p>
//         </div>
//       </footer>
//     </div>
//   );
// }

// const features = [
//   {
//     icon: "💻",
//     title: "Real Coding Environment",
//     description: "Practice in a realistic IDE with syntax highlighting, code execution, and test cases."
//   },
//   {
//     icon: "🤖",
//     title: "AI-Powered Feedback",
//     description: "Get instant, personalized feedback on your code and problem-solving approach."
//   },
//   {
//     icon: "📊",
//     title: "Progress Analytics",
//     description: "Track your improvement with detailed analytics and performance metrics."
//   },
//   {
//     icon: "⏱️",
//     title: "Timed Challenges",
//     description: "Simulate real interview conditions with timed coding sessions."
//   },
//   {
//     icon: "🎯",
//     title: "Company-Specific Questions",
//     description: "Practice with questions tailored to specific companies and roles."
//   },
//   {
//     icon: "🔄",
//     title: "Multiple Rounds",
//     description: "Experience complete interview cycles: Coding, Technical, Aptitude, and HR rounds."
//   }
// ];