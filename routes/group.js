const router = require("express").Router();
const {
  createGroup,
  getGroupBySlug,
  getAllGroups,
  getMyGroups,
  getJoinedGroups,
  updateGroup,
  deleteGroup,
  joinGroup,
  approveMember,
  rejectMember,
  leaveGroup,
  removeMember,
  manageRole,
  createTestGroup,
} = require("../controllers/group");
const { protect } = require("../middleware/auth");

router.get("/", getAllGroups);
router.get("/my-groups", protect, getMyGroups);
router.get("/joined-groups", protect, getJoinedGroups);
router.get("/:slug", protect, getGroupBySlug);

router.post("/test", createTestGroup);

// Private
router.post("/", protect, createGroup);
router.post("/:groupId/join", protect, joinGroup);

router.post("/:groupId/approve/:userId", protect, approveMember);
router.post("/:groupId/reject/:userId", protect, rejectMember);

router.post("/:groupId/leave", protect, leaveGroup);
router.post("/:groupId/remove/:userId", protect, removeMember);

router.put("/:groupId", protect, updateGroup);
router.delete("/:groupId", protect, deleteGroup);
router.post("/:groupId/manage-role/:userId", protect, manageRole);

module.exports = router;
