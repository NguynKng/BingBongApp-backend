const Group = require("../models/groupModel");
const slugify = require("slugify");
const Chat = require("../models/chatModel");
const {
  sendNotification,
  sendNotificationToFriends,
} = require("./notification");

// Helper functions
function isAdminOrMod(group, userId) {
  return group.admins.includes(userId) || group.moderators.includes(userId);
}

function isAdmin(group, userId) {
  return group.admins.includes(userId);
}

function isCreator(group, userId) {
  return group.createdBy.toString() === userId.toString();
}

/* ================================
   📦 GROUP CRUD
================================ */

const createTestGroup = async (req, res) => {
  try {
    const userId = "67f51dfb9ce941e9cd77e96a";

    const name = "Test Group Example";
    const description = "This is a sample test group.";
    const visibility = "public";

    const baseSlug = slugify(name, { lower: true, strict: true });
    let slug = baseSlug;
    let count = 1;

    while (await Group.findOne({ slug })) {
      slug = `${baseSlug}-${count++}`;
    }

    const tags = ["test", "demo", "community"];

    const rules = [
      {
        title: "Be respectful",
        description:
          "Treat everyone with respect. No harassment or hate speech.",
      },
      {
        title: "No spam",
        description: "Avoid posting irrelevant or repetitive content.",
      },
      {
        title: "Relevant topics only",
        description: "Posts must be related to the group's main subject.",
      },
      {
        title: "No scams or promotions",
        description: "Do not post misleading advertisements or scams.",
      },
      {
        title: "Follow admin instructions",
        description: "Admins may remove posts or members to maintain quality.",
      },
    ];

    const group = await Group.create({
      name,
      description,
      visibility,
      slug,
      createdBy: userId,
      admins: [userId],
      members: [userId],
      tags,
      rules,
      settings: {
        allowMemberPost: true,
        requirePostApproval: false,
        requireJoinApproval: false,
      },
    });

    return res.status(200).json({ success: true, data: group });
  } catch (err) {
    console.error("Error creating test group:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

const createGroup = async (req, res) => {
  try {
    const {
      name,
      description,
      visibility = "public",
      settings = {},
      tags = [],
      rules = [],
    } = req.body;

    // Generate unique slug
    const baseSlug = slugify(name, { lower: true, strict: true });
    let slug = baseSlug;
    let count = 1;
    while (await Group.findOne({ slug })) {
      slug = `${baseSlug}-${count++}`;
    }

    const group = await Group.create({
      name,
      description,
      visibility,
      slug,
      createdBy: req.user._id,
      admins: [req.user._id],
      members: [req.user._id],
      tags: Array.isArray(tags) ? tags : [],
      rules: Array.isArray(rules)
        ? rules.map((rule) => ({
            title: rule.title || "",
            description: rule.description || "",
          }))
        : [],
      settings: {
        allowMemberPost: settings.allowMemberPost ?? true,
        requirePostApproval: settings.requirePostApproval ?? false,
        requireJoinApproval: settings.requireJoinApproval ?? false,
      },
    });

    await Chat.create({
      participants: [req.user._id],
      type: "fanpage",
      fanpageId: group._id,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      data: group,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

const getGroupBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const group = await Group.findOne({ slug })
      .populate("createdBy", "fullName avatar slug")
      .populate("members", "fullName avatar slug")
      .populate("admins", "fullName avatar slug")
      .populate("moderators", "fullName avatar slug")
      .populate("pendingMembers", "fullName avatar slug");

    if (!group)
      return res.status(404).json({ success: false, error: "Group not found" });

    return res.json({ success: true, data: group });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const getAllGroups = async (req, res) => {
  try {
    const groups = await Group.find()
      .populate("createdBy", "fullName avatar slug")
      .sort({ createdAt: -1 });
    return res.json({ success: true, data: groups });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const getMyGroups = async (req, res) => {
  try {
    const myGroups = await Group.find({ createdBy: req.user.id })
      .populate("createdBy", "fullName avatar slug")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: myGroups });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const getJoinedGroups = async (req, res) => {
  try {
    const joined = await Group.find({ members: req.user.id })
      .populate("createdBy", "fullName avatar slug")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: joined });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* ================================
   ⭐ UNIFIED UPDATE GROUP
================================ */
const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, visibility, settings, tags, rules } = req.body;

    const group = await Group.findById(groupId);

    if (!group)
      return res.status(404).json({ success: false, error: "Group not found" });

    // Permission check
    if (!isAdminOrMod(group, req.user._id))
      return res.status(403).json({
        success: false,
        error: "Only admins/moderators can update group",
      });

    // === Update name & regenerate slug ===
    if (name && name.trim()) {
      group.name = name.trim();
    }

    // === Update basic info ===
    if (description !== undefined) group.description = description;
    if (visibility && ["public", "private"].includes(visibility))
      group.visibility = visibility;

    // === Update settings ===
    if (settings && typeof settings === "object") {
      if (settings.allowMemberPost !== undefined)
        group.settings.allowMemberPost = settings.allowMemberPost;
      if (settings.requireJoinApproval !== undefined)
        group.settings.requireJoinApproval = settings.requireJoinApproval;
    }

    // === Update tags ===
    if (Array.isArray(tags)) {
      group.tags = tags.map((tag) => tag.trim()).filter((tag) => tag);
    }

    // === Update rules (Admin only) ===
    if (Array.isArray(rules)) {
      if (!isAdmin(group, req.user._id))
        return res.status(403).json({
          success: false,
          error: "Only admins can update rules",
        });

      group.rules = rules.map((rule) => ({
        title: rule.title || "",
        description: rule.description || "",
      }));
    }

    await group.save();

    await group.populate([
      { path: "createdBy", select: "fullName avatar slug" },
      { path: "members", select: "fullName avatar slug" },
      { path: "admins", select: "fullName avatar slug" },
      { path: "moderators", select: "fullName avatar slug" },
      { path: "pendingMembers", select: "fullName avatar slug" },
    ]);

    return res.status(200).json({
      success: true,
      message: "Group updated successfully",
      data: group,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group)
      return res.status(404).json({ success: false, error: "Group not found" });

    if (!isCreator(group, req.user._id))
      return res
        .status(403)
        .json({ success: false, error: "Only creator can delete group" });

    await group.deleteOne();

    return res.status(200).json({ success: true, message: "Group deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* ================================
   👥 MEMBER MANAGEMENT
================================ */

const joinGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group)
      return res.status(404).json({ success: false, error: "Group not found" });

    const userId = req.user._id;

    // Check if already a member
    if (group.members.includes(userId))
      return res.json({ success: true, message: "Already a member" });

    if (group.settings.requireJoinApproval) {
      // Check if already in pending
      const isPending = group.pendingMembers.some(
        (id) => id.toString() === userId.toString()
      );

      if (isPending) {
        // Cancel join request
        group.pendingMembers = group.pendingMembers.filter(
          (id) => id.toString() !== userId.toString()
        );
        await group.save();
        return res.json({
          success: true,
          message: "Join request canceled",
          action: "canceled",
        });
      } else {
        // Send join request
        group.pendingMembers.push(userId);
        await group.save();
        await sendNotification(group.admins, userId, "group_join_request", {
          groupId: group._id,
          groupName: group.name,
          groupAvatar: group.avatar,
          groupSlug: group.slug,
        });
        return res.json({
          success: true,
          message: "Join request canceled",
          action: "requested",
        });
      }
    } else {
      // Auto join (no approval needed)
      group.members.push(userId);
      await group.save();
      const chat = await Chat.findOne({ fanpageId: group._id });
      if (chat && !chat.participants.includes(userId)) {
        chat.participants.push(userId);
        await chat.save();
      }
      await sendNotification(group.admins, userId, "group_new_member", {
        groupId: group._id,
        groupName: group.name,
        groupAvatar: group.avatar,
        groupSlug: group.slug,
      });
      return res.json({
        success: true,
        message: "Joined group",
        action: "joined",
      });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const approveMember = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const group = await Group.findById(groupId);

    if (!group)
      return res.status(404).json({ success: false, error: "Group not found" });

    if (!isAdminOrMod(group, req.user._id))
      return res.status(403).json({ success: false, error: "No permission" });

    group.pendingMembers = group.pendingMembers.filter(
      (id) => id.toString() !== userId
    );

    if (!group.members.includes(userId)) {
      group.members.push(userId);
    }

    await group.save();

    const chat = await Chat.findOne({ fanpageId: group._id });
    if (chat && !chat.participants.includes(userId)) {
      chat.participants.push(userId);
      await chat.save();
    }
    await sendNotification(userId, req.user._id, "accepted_join_request", {
      groupId: group._id,
      groupName: group.name,
      groupAvatar: group.avatar,
      groupSlug: group.slug,
    });
    return res.status(200).json({ success: true, message: "Member approved" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

const rejectMember = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const group = await Group.findById(groupId);

    if (!group)
      return res.status(404).json({ success: false, error: "Group not found" });

    if (!isAdminOrMod(group, req.user._id))
      return res.status(403).json({ success: false, error: "No permission" });

    group.pendingMembers = group.pendingMembers.filter(
      (id) => id.toString() !== userId
    );

    await group.save();
    return res.status(200).json({ success: true, message: "Member rejected" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const leaveGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group)
      return res.status(404).json({ success: false, error: "Group not found" });

    const userId = req.user._id.toString();

    // Cannot leave if creator
    if (isCreator(group, userId))
      return res.status(400).json({
        success: false,
        error: "Creator cannot leave group. Delete group instead.",
      });

    group.members = group.members.filter((id) => id.toString() !== userId);
    group.admins = group.admins.filter((id) => id.toString() !== userId);
    group.moderators = group.moderators.filter(
      (id) => id.toString() !== userId
    );

    await group.save();
    const chat = await Chat.findOne({ fanpageId: group._id });
    if (chat) {
      chat.participants = chat.participants.filter(
        (id) => id.toString() !== userId
      );
      await chat.save();
    }
    return res.status(200).json({ success: true, message: "Left group" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const removeMember = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const group = await Group.findById(groupId);

    if (!group)
      return res.status(404).json({ success: false, error: "Group not found" });

    if (!isAdminOrMod(group, req.user._id))
      return res.status(403).json({ success: false, error: "No permission" });

    // Cannot remove creator
    if (isCreator(group, userId))
      return res
        .status(400)
        .json({ success: false, error: "Cannot remove creator" });

    group.members = group.members.filter((id) => id.toString() !== userId);
    group.admins = group.admins.filter((id) => id.toString() !== userId);
    group.moderators = group.moderators.filter(
      (id) => id.toString() !== userId
    );

    await group.save();
    return res.status(200).json({ success: true, message: "Member removed" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* ================================
   🛡️ ROLE MANAGEMENT
================================ */

const manageRole = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const { action, role } = req.body; 
    const group = await Group.findById(groupId);
    if (!group)
      return res.status(404).json({ success: false, error: "Group not found" });

    // Permission check
    if (role === "admin" && !isCreator(group, req.user._id))
      return res
        .status(403)
        .json({ success: false, error: "Only creator can manage admins" });

    if (role === "moderator" && !isAdmin(group, req.user._id))
      return res.status(403).json({
        success: false,
        error: "Only admins can manage moderators",
      });

    // Validate user is member
    if (!group.members.includes(userId))
      return res
        .status(400)
        .json({ success: false, error: "User must be a member first" });

    // Cannot modify creator
    if (isCreator(group, userId))
      return res
        .status(400)
        .json({ success: false, error: "Cannot modify creator role" });

    if (action === "add") {
      if (role === "admin") {
        if (group.admins.includes(userId))
          return res
            .status(400)
            .json({ success: false, error: "Already an admin" });
        // Remove from moderators if exists
        group.moderators = group.moderators.filter(
          (id) => id.toString() !== userId
        );
        group.admins.push(userId);
      } else if (role === "moderator") {
        if (group.moderators.includes(userId))
          return res
            .status(400)
            .json({ success: false, error: "Already a moderator" });
        if (group.admins.includes(userId))
          return res
            .status(400)
            .json({ success: false, error: "User is already an admin" });
        group.moderators.push(userId);
      }
    } else if (action === "remove") {
      if (role === "admin") {
        group.admins = group.admins.filter((id) => id.toString() !== userId);
      } else if (role === "moderator") {
        group.moderators = group.moderators.filter(
          (id) => id.toString() !== userId
        );
      }
    }

    await group.save();

    const newGroupData = await Group.findById(groupId)
      .populate("createdBy", "fullName avatar slug")
      .populate("members", "fullName avatar slug")
      .populate("admins", "fullName avatar slug")
      .populate("moderators", "fullName avatar slug")
      .populate("pendingMembers", "fullName avatar slug");

    return res.status(200).json({
      success: true,
      message: `${role} ${action}ed successfully`,
      data: newGroupData,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  // CRUD
  createGroup,
  getGroupBySlug,
  getAllGroups,
  getMyGroups,
  getJoinedGroups,
  updateGroup,
  deleteGroup,
  createTestGroup,

  // Member Management
  joinGroup,
  approveMember,
  rejectMember,
  leaveGroup,
  removeMember,

  // Role Management
  manageRole,
};
