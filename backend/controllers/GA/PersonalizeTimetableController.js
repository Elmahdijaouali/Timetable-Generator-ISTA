const { Group, Timetable, Session, Module, Formateur, Classroom } = require('../../models');
const { canAddSessionWithGapRule } = require('./constraints');

// Validate if a session can be added to the timetable
async function validateAddSession(req, res) {
  try {
    const { groupId } = req.params;
    const { day, timeSlot, moduleId, formateurId, classroomId, type } = req.body;
    // Fetch the group's timetable
    const timetable = await Timetable.findOne({ where: { groupId, status: 'active' }, include: [Session] });
    if (!timetable) return res.status(404).json({ valid: false, errors: ['Timetable not found'] });
    // Gather all sessions for the day
    const daySessions = timetable.Sessions.filter(s => s.day === day);
    // Build the new session object
    const newSession = {
      moduleId,
      formateurId,
      classroomId,
      timeShot: timeSlot,
      type,
    };
    // Check for conflicts
    const errors = [];
    // 1. Time slot conflict (group)
    if (daySessions.some(s => s.timeshot === timeSlot)) {
      errors.push('Ce créneau est déjà occupé pour ce groupe.');
    }
    // 2. Formateur conflict
    if (daySessions.some(s => s.timeshot === timeSlot && s.formateurId === formateurId)) {
      errors.push('Le formateur est déjà occupé à ce créneau.');
    }
    // 3. Classroom conflict
    if (daySessions.some(s => s.timeshot === timeSlot && s.classroomId === classroomId)) {
      errors.push('La salle est déjà occupée à ce créneau.');
    }
    // 4. Gap rule
    if (!canAddSessionWithGapRule(daySessions, newSession)) {
      errors.push('La règle d’espacement (2,5h) entre séances à distance et présentielles est violée.');
    }
    if (errors.length > 0) {
      return res.json({ valid: false, errors });
    }
    return res.json({ valid: true });
  } catch (err) {
    return res.status(500).json({ valid: false, errors: [err.message] });
  }
}

// Actually add the session if valid
async function addSession(req, res) {
  try {
    const { groupId } = req.params;
    const { day, timeSlot, moduleId, formateurId, classroomId, type } = req.body;
    // Validate first
    req.body.type = type;
    const validation = await validateAddSession({ ...req, body: req.body }, { json: v => v, status: () => ({ json: v => v }) });
    if (!validation.valid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }
    // Find timetable
    const timetable = await Timetable.findOne({ where: { groupId, status: 'active' } });
    if (!timetable) return res.status(404).json({ success: false, errors: ['Timetable not found'] });
    // Create session
    await Session.create({
      timetableId: timetable.id,
      groupId,
      moduleId,
      formateurId,
      classroomId,
      timeshot: timeSlot,
      type,
      day,
    });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, errors: [err.message] });
  }
}

module.exports = { validateAddSession, addSession }; 