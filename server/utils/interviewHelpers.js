// Utility functions for interview operations

export function safeRoundAccess(interview, roundType) {
  if (!interview || !interview.rounds) {
    return { exists: false, questions: [], round: null };
  }
  
  const round = interview.rounds[roundType];
  if (!round) {
    return { exists: false, questions: [], round: null };
  }
  
  const questions = Array.isArray(round.questions) ? round.questions : [];
  return { exists: true, questions, round };
}

export function calculateRoundsCompleted(interview) {
  if (!interview || !interview.completedRounds) return 0;
  return interview.completedRounds.length;
}

export function getNextRound(interview) {
  if (!interview || !interview.selectedRounds) return null;
  
  const completed = interview.completedRounds || [];
  return interview.selectedRounds.find(round => !completed.includes(round));
}

export function isInterviewComplete(interview) {
  if (!interview || !interview.selectedRounds) return false;
  return interview.completedRounds.length >= interview.selectedRounds.length;
}