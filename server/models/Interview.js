import mongoose from 'mongoose';

const roundSchema = new mongoose.Schema({
  questions: [{
    question: String,
    id: String,
    type: String,
    options: [String],
    answer: String
  }],
  answers: Object,
  score: Number,
  submittedAt: Date,
  startedAt: Date,
  status: { 
    type: String, 
    enum: ['pending', 'in-progress', 'completed'],
    default: 'pending'
  }
}, { _id: false });

const interviewSchema = new mongoose.Schema({
  interviewId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true
  },
  selectedRounds: {
    type: [String],
    default: []
  },
  completedRounds: {
    type: [String], 
    default: []
  },
  // 🆕 DYNAMIC ROUNDS - Only stores rounds that user selected
  rounds: {
    type: Object,
    default: {} // This will only contain rounds that were actually started
  },
  overallScore: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: Date
},);

// 🆕 Helper method to check if round exists and has questions
interviewSchema.methods.hasRoundWithQuestions = function(roundType) {
  return this.rounds && 
         this.rounds[roundType] && 
         this.rounds[roundType].questions &&
         Array.isArray(this.rounds[roundType].questions) &&
         this.rounds[roundType].questions.length > 0;
};

// 🆕 Helper method to get round questions safely
interviewSchema.methods.getRoundQuestions = function(roundType) {
  if (this.hasRoundWithQuestions(roundType)) {
    return this.rounds[roundType].questions;
  }
  return [];
};

// 🆕 Helper method to initialize a round
interviewSchema.methods.initializeRound = function(roundType, questions) {
  if (!this.rounds) {
    this.rounds = {};
  }
  
  this.rounds[roundType] = {
    questions: questions.map(q => ({
      question: q.question,
      id: q.id || Math.random().toString(36).substr(2, 9),
      type: q.type || 'text',
      options: q.options || [],
      answer: q.answer || ''
    })),
    answers: {},
    score: null,
    submittedAt: null,
    startedAt: new Date(),
    status: 'in-progress'
  };
};

// 🆕 Helper method to mark round as completed
interviewSchema.methods.markRoundCompleted = function(roundType, score, answers) {
  if (!this.rounds[roundType]) {
    this.rounds[roundType] = {};
  }
  
  this.rounds[roundType].status = 'completed';
  this.rounds[roundType].score = score;
  this.rounds[roundType].answers = answers;
  this.rounds[roundType].submittedAt = new Date();
  
  // Add to completed rounds if not already there
  if (!this.completedRounds.includes(roundType)) {
    this.completedRounds.push(roundType);
  }
  
  // Update overall score
  this.calculateOverallScore();
};

// 🆕 Calculate overall average score
interviewSchema.methods.calculateOverallScore = function() {
  const completedRounds = Object.values(this.rounds).filter(round => 
    round && round.status === 'completed' && round.score !== undefined && round.score !== null
  );
  
  if (completedRounds.length === 0) {
    this.overallScore = 0;
    return;
  }
  
  const totalScore = completedRounds.reduce((sum, round) => sum + round.score, 0);
  this.overallScore = Math.round(totalScore / completedRounds.length);
  
  // Auto-complete interview if all selected rounds are done
  if (this.selectedRounds.length > 0 && 
      this.completedRounds.length >= this.selectedRounds.length) {
    this.status = 'completed';
    this.endTime = new Date();
  }
};

// 🆕 Check if all selected rounds are completed
interviewSchema.methods.areAllRoundsCompleted = function() {
  if (!this.selectedRounds || this.selectedRounds.length === 0) return false;
  
  return this.selectedRounds.every(roundType => 
    this.completedRounds.includes(roundType)
  );
};

// 🆕 Get next pending round
interviewSchema.methods.getNextRound = function() {
  if (!this.selectedRounds || this.selectedRounds.length === 0) return null;
  
  return this.selectedRounds.find(roundType => 
    !this.completedRounds.includes(roundType)
  );
};

export default mongoose.model('Interview', interviewSchema);

// import mongoose from 'mongoose';

// const interviewSchema = new mongoose.Schema({
//   interviewId: {
//     type: String,
//     required: true,
//     unique: true
//   },
//   userId: {
//     type: String,
//     required: true
//   },
//   role: {
//     type: String,
//     required: true
//   },
//   selectedRounds: [String], // ['coding', 'technical', 'aptitude', 'hr']
//   completedRounds: [String], // 🆕 Track completed rounds
//   rounds: {
//     coding: {
//       questions: [Object],
//       answers: Object,
//       score: Number,
//       completedAt: Date,
//       passed: Boolean
//     },
//     technical: {
//       questions: [Object],
//       answers: Object,
//       score: Number,
//       completedAt: Date,
//       passed: Boolean
//     },
//     aptitude: {
//       questions: [Object],
//       answers: Object,
//       score: Number,
//       completedAt: Date,
//       passed: Boolean
//     },
//     hr: {
//       questions: [Object],
//       answers: Object,
//       score: Number,
//       completedAt: Date,
//       passed: Boolean
//     }
//   },
//   overallScore: Number,
//   status: {
//     type: String,
//     enum: ['active', 'completed'],
//     default: 'active'
//   },
//   startTime: Date,
//   endTime: Date
// }, {
//   timestamps: true
// });

// export default mongoose.model('Interview', interviewSchema);