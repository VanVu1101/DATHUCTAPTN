const Evaluation = require('../models/evaluation');
const Internship = require('../models/internship');
const Student = require('../models/student');

const getEvaluationByInternship = async (internshipId) => {
  return await Evaluation.findOne({ where: { internshipId } });
};

const getEvaluationForUser = async (userId) => {
  const student = await Student.findOne({ where: { userId } });
  if (!student) return null;
  const internship = await Internship.findOne({ where: { studentId: student.id }, order: [['createdAt', 'DESC']] });
  if (!internship) return null;
  return await getEvaluationByInternship(internship.id);
};

const createOrUpdateEvaluation = async (internshipId, mentorId, payload) => {
  if (!internshipId) throw new Error('internshipId is required');
  const existing = await Evaluation.findOne({ where: { internshipId } });
  if (existing) {
    existing.score = payload.score ?? existing.score;
    existing.feedback = payload.feedback ?? existing.feedback;
    existing.mentorId = mentorId ?? existing.mentorId;
    if (payload.criteria !== undefined) existing.criteria = payload.criteria;
    return await existing.save();
  }

  return await Evaluation.create({
    score: payload.score,
    feedback: payload.feedback || '',
    internshipId,
    mentorId: mentorId || null
    ,criteria: payload.criteria || null
  });
};

module.exports = { getEvaluationByInternship, getEvaluationForUser, createOrUpdateEvaluation };
