// server/models/Feedback.js
import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema({
  feedbackId: {
    type: String,
    required: true,
    unique: true,
    default: () => `FB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  },
  interviewId: {
    type: String,
    required: true,
    ref: 'Interview'
  },
  userId: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true
  },
  averageScore: {
    type: Number,
    required: true
  },
  improvement: {
    type: String,
    required: true
  },
  suggestion: {
    type: String,
    required: true
  }
},);

export default mongoose.model("Feedback", feedbackSchema);