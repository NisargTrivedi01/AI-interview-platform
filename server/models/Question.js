import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema({
  category: { type: String, required: true },
  domain: { type: String },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  text: { type: String, required: true },
  expectedKeywords: { type: [String], default: [] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Question', QuestionSchema);
