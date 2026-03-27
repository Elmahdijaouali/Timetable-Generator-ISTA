const express = require("express");
const router = express.Router();
const {index , show, exportGroupsExcel, exportGroupsPdf, updateSessionPosition} = require('./../../../controllers/TimetableGroupController.js')

router.get('/timetables/groups' , index )
router.get('/timetables/:id' , show )
router.get('/timetables/groups/excel', exportGroupsExcel);
router.get('/timetables/groups/pdf', exportGroupsPdf);
router.post('/timetables/update-session-position', updateSessionPosition);

module.exports = router