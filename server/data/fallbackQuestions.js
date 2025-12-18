export const fallbackQuestions = {
  aptitude: [
    {
      question: "What is 2 + 2?",
      options: ["2", "3", "4", "5"],
      correctAnswer: "4"
    },
    {
      question: "If x + y = 10 and x - y = 4, find x and y.",
      options: ["(7,3)", "(6,4)", "(5,5)", "(8,2)"],
      correctAnswer: "(7,3)"
    }
  ],
  coding: [
    { question: "Reverse a linked list", difficulty: "Easy", exampleInput: "[1,2,3]", exampleOutput: "[3,2,1]" },
    { question: "Find the largest element in an array", difficulty: "Easy", exampleInput: "[1,5,3]", exampleOutput: "5" }
  ],
  technical: [
    { question: "Explain OOP concepts", options: ["Polymorphism", "Encapsulation", "Inheritance", "All"], correctAnswer: "All" },
    { question: "What is polymorphism?", options: ["Compile-time", "Runtime", "Both", "None"], correctAnswer: "Both" }
  ],
  hr: [
    { question: "Tell me about yourself" },
    { question: "Where do you see yourself in 5 years?" }
  ]
};
