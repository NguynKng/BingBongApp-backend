const Badge = require("../models/badgeModel");
const User = require("../models/userModel");

const getAllBadges = async (req, res) => {
    try {
        const badges = await Badge.find({ isActive: true }).sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            data: badges,
        });
    } catch (error) {
        return res
            .status(500)
            .json({ message: "Internal server error", error: error.message });
    }
};

const getUserBadgeInventory = async (req, res) => {
    const userId = req.user._id; // Lấy ID người dùng từ token đã xác thực
    try {
        const user = await User.findById(userId)
            .select("badgeInventory")
            .populate("badgeInventory.badgeId");
        return res.status(200).json({
            success: true,
            data: user.badgeInventory,
        });
    } catch (error) {
        return res
            .status(500)
            .json({ message: "Internal server error", error: error.message });
    }
};

const addBadge = async (req, res) => {
    const badges = [
        // -------------------- BRONZE --------------------
        { name: "Fresh Spark", description: "Just joined!", tier: "Bronze", condition: { type: "account_age", operator: ">=", value: 0 } },
        { name: "First Step", description: "Completed your first day.", tier: "Bronze", condition: { type: "account_age", operator: ">=", value: 1 } },
        { name: "Early Bird", description: "Woke up early to engage.", tier: "Bronze", condition: { type: "active_days", operator: ">=", value: 2 } },
        { name: "Starter Kit", description: "Made your first post.", tier: "Bronze", condition: { type: "posts_count", operator: ">=", value: 1 } },
        { name: "Social Explorer", description: "Joined a group or event.", tier: "Bronze", condition: { type: "custom_event", operator: ">=", value: 1 } },
        { name: "Friendly Hello", description: "Sent your first friend request.", tier: "Bronze", condition: { type: "friends_count", operator: ">=", value: 1 } },
        { name: "First Connection", description: "Made your first friend.", tier: "Bronze", condition: { type: "friends_count", operator: ">=", value: 1 } },
        { name: "Small Talk", description: "Wrote 5 comments.", tier: "Bronze", condition: { type: "comments_count", operator: ">=", value: 5 } },
        { name: "Newbie Poster", description: "Posted 3 times.", tier: "Bronze", condition: { type: "posts_count", operator: ">=", value: 3 } },
        { name: "Little Achiever", description: "Received 5 likes.", tier: "Bronze", condition: { type: "likes_received", operator: ">=", value: 5 } },

        // -------------------- SILVER --------------------
        { name: "Rising Star", description: "Active for a week.", tier: "Silver", condition: { type: "account_age", operator: ">=", value: 7 } },
        { name: "Chatty Cat", description: "Wrote 20 comments.", tier: "Silver", condition: { type: "comments_count", operator: ">=", value: 20 } },
        { name: "Active Hands", description: "Logged in 10 days.", tier: "Silver", condition: { type: "active_days", operator: ">=", value: 10 } },
        { name: "Post Maker", description: "Created 10 posts.", tier: "Silver", condition: { type: "posts_count", operator: ">=", value: 10 } },
        { name: "Commentator", description: "Made 30 comments.", tier: "Silver", condition: { type: "comments_count", operator: ">=", value: 30 } },
        { name: "Social Butterfly", description: "Participated in 5 events.", tier: "Silver", condition: { type: "custom_event", operator: ">=", value: 5 } },
        { name: "Like Magnet", description: "Received 50 likes.", tier: "Silver", condition: { type: "likes_received", operator: ">=", value: 50 } },
        { name: "Network Builder", description: "Reached 10 friends.", tier: "Silver", condition: { type: "friends_count", operator: ">=", value: 10 } },
        { name: "Interaction Pro", description: "50 total interactions.", tier: "Silver", condition: { type: "custom_event", operator: ">=", value: 50 } },
        { name: "Daylight Streak", description: "Active 15 days.", tier: "Silver", condition: { type: "active_days", operator: ">=", value: 15 } },

        // -------------------- GOLD --------------------
        { name: "Golden Voice", description: "Made 50 posts.", tier: "Gold", condition: { type: "posts_count", operator: ">=", value: 50 } },
        { name: "Content Crafter", description: "Made 100 posts.", tier: "Gold", condition: { type: "posts_count", operator: ">=", value: 100 } },
        { name: "Trend Setter", description: "Gained 200 likes.", tier: "Gold", condition: { type: "likes_received", operator: ">=", value: 200 } },
        { name: "Popular Star", description: "Reached 20 friends.", tier: "Gold", condition: { type: "friends_count", operator: ">=", value: 20 } },
        { name: "Engagement Hero", description: "50 comments written.", tier: "Gold", condition: { type: "comments_count", operator: ">=", value: 50 } },
        { name: "Golden Pen", description: "Started 30 interactions.", tier: "Gold", condition: { type: "custom_event", operator: ">=", value: 30 } },
        { name: "Friendly Star", description: "Received 150 likes.", tier: "Gold", condition: { type: "likes_received", operator: ">=", value: 150 } },
        { name: "Golden Bond", description: "30 friends reached.", tier: "Gold", condition: { type: "friends_count", operator: ">=", value: 30 } },
        { name: "Active Spark", description: "Active 30 days.", tier: "Gold", condition: { type: "active_days", operator: ">=", value: 30 } },
        { name: "Influence Seeker", description: "Engaged in 100 events.", tier: "Gold", condition: { type: "custom_event", operator: ">=", value: 100 } },

        // -------------------- PLATINUM --------------------
        { name: "Platinum Mind", description: "200 posts created.", tier: "Platinum", condition: { type: "posts_count", operator: ">=", value: 200 } },
        { name: "Elite Creator", description: "Wrote 100 comments.", tier: "Platinum", condition: { type: "comments_count", operator: ">=", value: 100 } },
        { name: "Social Architect", description: "Reached 50 friends.", tier: "Platinum", condition: { type: "friends_count", operator: ">=", value: 50 } },
        { name: "Trend Master", description: "Gained 500 likes.", tier: "Platinum", condition: { type: "likes_received", operator: ">=", value: 500 } },
        { name: "Network Strategist", description: "Participated in 150 events.", tier: "Platinum", condition: { type: "custom_event", operator: ">=", value: 150 } },
        { name: "Active Dynamo", description: "Active 60 days.", tier: "Platinum", condition: { type: "active_days", operator: ">=", value: 60 } },
        { name: "Comment Titan", description: "300 comments.", tier: "Platinum", condition: { type: "comments_count", operator: ">=", value: 300 } },
        { name: "Post Champion", description: "500 posts.", tier: "Platinum", condition: { type: "posts_count", operator: ">=", value: 500 } },
        { name: "Influence Leader", description: "800 likes received.", tier: "Platinum", condition: { type: "likes_received", operator: ">=", value: 800 } },
        { name: "Activity Guru", description: "Active 100 days.", tier: "Platinum", condition: { type: "active_days", operator: ">=", value: 100 } },

        // -------------------- DIAMOND --------------------
        { name: "Diamond Vision", description: "Top influencer.", tier: "Diamond", condition: { type: "custom_event", operator: ">=", value: 300 } },
        { name: "Community Pillar", description: "Lead 100 interactions.", tier: "Diamond", condition: { type: "custom_event", operator: ">=", value: 100 } },
        { name: "Popular Icon", description: "Reached 100 friends.", tier: "Diamond", condition: { type: "friends_count", operator: ">=", value: 100 } },
        { name: "Trend Influencer", description: "Gained 1500 likes.", tier: "Diamond", condition: { type: "likes_received", operator: ">=", value: 1500 } },
        { name: "Engagement King", description: "Made 500 comments.", tier: "Diamond", condition: { type: "comments_count", operator: ">=", value: 500 } },
        { name: "Comment King", description: "Top commenter.", tier: "Diamond", condition: { type: "comments_count", operator: ">=", value: 600 } },
        { name: "Post Legend", description: "Created 800 posts.", tier: "Diamond", condition: { type: "posts_count", operator: ">=", value: 800 } },
        { name: "Social Star", description: "Joined 200 events.", tier: "Diamond", condition: { type: "custom_event", operator: ">=", value: 200 } },
        { name: "Network Icon", description: "150 friends reached.", tier: "Diamond", condition: { type: "friends_count", operator: ">=", value: 150 } },
        { name: "Active Legend", description: "Active 150 days.", tier: "Diamond", condition: { type: "active_days", operator: ">=", value: 150 } },

        // -------------------- MASTER --------------------
        { name: "Mastermind", description: "Strategic influencer.", tier: "Master", condition: { type: "custom_event", operator: ">=", value: 400 } },
        { name: "Strategy Guru", description: "Lead multiple groups.", tier: "Master", condition: { type: "custom_event", operator: ">=", value: 300 } },
        { name: "Creator Elite", description: "Created 1000 posts.", tier: "Master", condition: { type: "posts_count", operator: ">=", value: 1000 } },
        { name: "Comment Master", description: "1000 comments written.", tier: "Master", condition: { type: "comments_count", operator: ">=", value: 1000 } },
        { name: "Popular Sage", description: "Received 3000 likes.", tier: "Master", condition: { type: "likes_received", operator: ">=", value: 3000 } },
        { name: "Network Master", description: "Reached 300 friends.", tier: "Master", condition: { type: "friends_count", operator: ">=", value: 300 } },
        { name: "Engagement Wizard", description: "Participated in 500 events.", tier: "Master", condition: { type: "custom_event", operator: ">=", value: 500 } },
        { name: "Influence Maestro", description: "Engaged 2000 times.", tier: "Master", condition: { type: "custom_event", operator: ">=", value: 2000 } },

        // -------------------- GRANDMASTER --------------------
        { name: "Grand Strategist", description: "Elite strategist.", tier: "Grandmaster", condition: { type: "custom_event", operator: ">=", value: 600 } },
        { name: "Content Maestro", description: "Created 2000 posts.", tier: "Grandmaster", condition: { type: "posts_count", operator: ">=", value: 2000 } },
        { name: "Social Commander", description: "Managed 300 events.", tier: "Grandmaster", condition: { type: "custom_event", operator: ">=", value: 300 } },
        { name: "Trend Titan", description: "Gained 5000 likes.", tier: "Grandmaster", condition: { type: "likes_received", operator: ">=", value: 5000 } },
        { name: "Engagement Legend", description: "1000 comments written.", tier: "Grandmaster", condition: { type: "comments_count", operator: ">=", value: 1000 } },
        { name: "Network Overlord", description: "Reached 500 friends.", tier: "Grandmaster", condition: { type: "friends_count", operator: ">=", value: 500 } },
        { name: "Comment Titan", description: "Top comment master.", tier: "Grandmaster", condition: { type: "comments_count", operator: ">=", value: 1200 } },
        { name: "Post Overlord", description: "Created 3000 posts.", tier: "Grandmaster", condition: { type: "posts_count", operator: ">=", value: 3000 } },

        // -------------------- CHALLENGER --------------------
        { name: "Apex Achiever", description: "Ultimate influencer.", tier: "Challenger", condition: { type: "custom_event", operator: ">=", value: 1000 } },
        { name: "Ultimate Creator", description: "5000 posts created.", tier: "Challenger", condition: { type: "posts_count", operator: ">=", value: 5000 } },
        { name: "Social Conqueror", description: "Dominated 500 events.", tier: "Challenger", condition: { type: "custom_event", operator: ">=", value: 500 } },
        { name: "Trend Dominator", description: "Gained 10000 likes.", tier: "Challenger", condition: { type: "likes_received", operator: ">=", value: 10000 } },
        { name: "Engagement Champion", description: "2000 comments written.", tier: "Challenger", condition: { type: "comments_count", operator: ">=", value: 2000 } },
        { name: "Network Legend", description: "Reached 1000 friends.", tier: "Challenger", condition: { type: "friends_count", operator: ">=", value: 1000 } },
        { name: "Comment Legend", description: "Top-level comments.", tier: "Challenger", condition: { type: "comments_count", operator: ">=", value: 2500 } },
        { name: "Post Champion", description: "Created 5000 posts.", tier: "Challenger", condition: { type: "posts_count", operator: ">=", value: 5000 } },
    ];


    try {
        await Badge.insertMany(badges);
        res.status(201).json({ message: "Badges added successfully" });
    } catch (error) {
        res.status(500).json({
            message: "Error adding badges",
            error: error.message,
        });
    }
};

const claimBadge = async (req, res) => {
    const userId = req.user._id;
    const { badgeId } = req.body;

    try {
        const badge = await Badge.findById(badgeId);
        if (!badge) {
            return res
                .status(404)
                .json({ success: false, message: "Badge not found" });
        }

        const user = await User.findById(userId);

        const alreadyOwned = user.badgeInventory.some(
            (b) => b.badgeId.toString() === badgeId
        );

        if (alreadyOwned) {
            return res.status(400).json({
                success: false,
                message: "You already own this badge",
            });
        }

        const newUserBadge = {
            badgeId,
            earnedAt: new Date(),
            isEquipped: false,
        }

        user.badgeInventory.push(newUserBadge);

        await user.save();

        const userInventory = await User.findById(userId).select("badgeInventory").populate("badgeInventory.badgeId");

        const newBadgeItem = userInventory.badgeInventory.find(
            (b) => b.badgeId._id.toString() === badgeId
        );

        return res.status(200).json({
            success: true,
            message: "Badge claimed successfully",
            data: newBadgeItem
        });
    } catch (error) {
        console.error("Error claiming badge:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

const equipBadge = async (req, res) => {
    const userId = req.user._id;
    const { badgeId } = req.body;

    try {
        const user = await User.findById(userId);

        const badgeItem = user.badgeInventory.find(
            (b) => b.badgeId.toString() === badgeId
        );

        if (!badgeItem) {
            return res.status(400).json({
                success: false,
                message: "You don't own this badge",
            });
        }

        // Bỏ equip tất cả badge khác
        user.badgeInventory.forEach(b => {
            b.isEquipped = false;
        });

        // Equip badge mới
        badgeItem.isEquipped = true;

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Badge equipped",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

const unequipBadge = async (req, res) => {
    const userId = req.user._id;
    const { badgeId } = req.body;

    try {
        const user = await User.findById(userId);

        const badgeItem = user.badgeInventory.find(
            (b) => b.badgeId.toString() === badgeId
        );

        if (!badgeItem) {
            return res.status(400).json({
                success: false,
                message: "You don't own this badge",
            });
        }

        if (!badgeItem.isEquipped) {
            return res.status(400).json({
                success: false,
                message: "Badge is not equipped",
            });
        }

        badgeItem.isEquipped = false;

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Badge unequipped",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

module.exports = {
    getAllBadges,
    addBadge,
    getUserBadgeInventory,
    claimBadge,
    equipBadge,
    unequipBadge,
};
