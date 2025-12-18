import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const FALLBACK = {
  aptitude: [
    { question: "2 + 2 = ?", type: "mcq", options: ["2", "4", "5", "6"], answer: "4" }
  ],
  coding: [
    { question: "Write a function to reverse a string.", type: "coding" }
  ],
  technical: [
    { question: "Explain closures in JavaScript.", type: "descriptive" }
  ],
  hr: [
    { question: "Tell me about yourself.", type: "descriptive" }
  ]
};
// Fallback question generator if AI service is not available
export const generateQuestions = async (role, roundType) => {
  console.log(`🎯 Generating ${roundType} questions for ${role}`);
  
  const questions = {
    coding: {
      "Frontend Developer": [
        {
          id: 1,
          title: "Array Manipulation",
          problem: "Given an array of integers, find the maximum product of any three numbers. Optimize for time complexity.\n\nExample:\nInput: [1, 2, 3, 4]\nOutput: 24\n\nInput: [-10, -10, 5, 2]\nOutput: 500",
          difficulty: "Easy",
          tags: ["Arrays", "Algorithms"]
        },
        {
          id: 2,
          title: "String Reversal",
          problem: "Write a function that reverses a string without using built-in reverse methods.\n\nExample:\nInput: 'hello'\nOutput: 'olleh'",
          difficulty: "Easy",
          tags: ["Strings", "Algorithms"]
        },
        {
          id: 3,
          title: "Promise Chain Handling",
          problem: "Implement a function that executes multiple API calls in sequence, handling errors and retries with exponential backoff.",
          difficulty: "Hard",
          tags: ["JavaScript", "Async", "Error Handling"]
        }
      ],
      "Backend Developer": [
        {
          id: 1,
          title: "Binary Tree Traversal",
          problem: "Implement iterative in-order traversal of a binary tree without recursion. Handle edge cases and optimize space complexity.",
          difficulty: "Medium",
          tags: ["Data Structures", "Trees", "Algorithms"]
        },
        {
          id: 2,
          title: "Database Query Optimization",
          problem: "Given a complex SQL query with multiple joins, optimize it for better performance and write equivalent NoSQL query.",
          difficulty: "Hard",
          tags: ["SQL", "Performance", "Database"]
        },
        {
          id: 3,
          title: "API Rate Limiting",
          problem: "Design and implement a rate limiting middleware that allows 100 requests per hour per IP address.",
          difficulty: "Medium",
          tags: ["System Design", "Middleware", "Security"]
        }
      ]
    },
    hr: {
      "Frontend Developer": [
        {
          id: 1,
          question: "Tell me about yourself and your experience with frontend development.",
          category: "Introduction",
          importance: "High"
        },
        {
          id: 2,
          question: "How do you handle cross-browser compatibility issues?",
          category: "Technical",
          importance: "High"
        },
        {
          id: 3,
          question: "Describe a challenging project you worked on and how you overcame obstacles.",
          category: "Behavioral",
          importance: "Medium"
        }
      ],
      "Backend Developer": [
        {
          id: 1,
          question: "What experience do you have with database optimization and scaling?",
          category: "Technical",
          importance: "High"
        },
        {
          id: 2,
          question: "How do you ensure code quality and maintainability in backend systems?",
          category: "Process",
          importance: "High"
        },
        {
          id: 3,
          question: "Describe your approach to API design and documentation.",
          category: "Technical",
          importance: "Medium"
        }
      ]
    }
  };

  // Return questions for the specific role and round type, or default questions
  const roleQuestions = questions[roundType]?.[role];
  
  if (roleQuestions && roleQuestions.length > 0) {
    return roleQuestions;
  }

  // Default fallback questions
  const defaultQuestions = {
    coding: [
      {
        id: 1,
        title: "Two Sum",
        problem: "Given an array of integers and a target sum, find two numbers that add up to the target.",
        difficulty: "Easy",
        tags: ["Arrays", "Hash Table"]
      },
      {
        id: 2,
        title: "Reverse String",
        problem: "Reverse a given string without using built-in methods.",
        difficulty: "Easy", 
        tags: ["Strings"]
      },
      {
        id: 3,
        title: "Binary Search",
        problem: "Implement binary search algorithm for a sorted array.",
        difficulty: "Medium",
        tags: ["Algorithms", "Search"]
      }
    ],
    hr: [
      {
        id: 1,
        question: "Tell me about yourself and your professional background.",
        category: "Introduction",
        importance: "High"
      },
      {
        id: 2,
        question: "What are your strengths and weaknesses?",
        category: "Self Assessment", 
        importance: "High"
      },
      {
        id: 3,
        question: "Why do you want to work for our company?",
        category: "Motivation",
        importance: "High"
      }
    ]
  };

  return defaultQuestions[roundType] || defaultQuestions.coding;
};