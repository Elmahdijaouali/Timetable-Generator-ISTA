const express = require("express");
const router = express.Router();
const {
  index,
  show,
  updateStateModule,
  updateNbrHoursPresentailInWeek,
  getGenerationReportsForGroup,
  getAllGlobalGenerationReports,
  getOpenModulesByGroup,
  getAllModulesByGroup,
} = require("./../../../controllers/GroupController.js");
const { validateAddSession, addSession } = require('./../../../controllers/GA/PersonalizeTimetableController.js');


router.get("/groups", index);
router.get("/groups/:id", show);
router.patch("/groups/:groupId/module/:moduleId", updateStateModule);
router.patch(
  "/groups/:groupId/module/:moduleId/edit-nbr-hours-presentail",
  updateNbrHoursPresentailInWeek
);

// GET /api/v1/group/:groupId/generation-reports
router.get('/groups/:groupId/generation-reports', getGenerationReportsForGroup);

// GET /api/v1/global-generation-reports
router.get('/global-generation-reports', getAllGlobalGenerationReports);

router.get('/modules/by-group/:groupId', getOpenModulesByGroup);
router.get('/all-modules/by-group/:groupId', getAllModulesByGroup);

router.post('/group/:groupId/validate-add-session', validateAddSession);
router.post('/group/:groupId/add-session', addSession);


module.exports = router;
