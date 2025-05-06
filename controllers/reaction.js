const PostModel = require("../models/postModel")
const ReactionModel = require("../models/reactionModel")
const mongoose = require("mongoose")

const reactToPost = async (req, res) => {
    try {
      const userId = req.user._id
      const { postId, type } = req.body
  
      if (!mongoose.Types.ObjectId.isValid(postId)) {
        return res.status(400).json({ message: 'Invalid post ID', success: false })
      }
  
      const post = await PostModel.findById(postId)
      if (!post) return res.status(404).json({ message: 'Post not found', success: false })
  
      const existing = await ReactionModel.findOne({ user: userId, post: postId }).populate(
        'user',
        'fullName avatar'
      )
  
      if (existing) {
        if (existing.type === type) {
          // Remove reaction
          await existing.deleteOne()
  
          // Remove reaction._id from post.reactions
          post.reactions = post.reactions.filter((r) => !r.equals(existing._id))
          await post.save()
  
          return res.status(200).json({ message: 'Reaction removed', success: true })
        } else {
          // Update reaction type
          existing.type = type
          await existing.save()
          return res.status(200).json({ message: 'Reaction updated', success: true, data: existing })
        }
      }
  
      // Create new reaction
      const newReaction = await ReactionModel.create({
        user: userId,
        post: postId,
        type
      })
  
      post.reactions.push(newReaction._id)
      await post.save()
      const populatedReaction = await newReaction.populate('user', 'fullName avatar')
  
      return res.status(201).json({ message: 'Reacted successfully', success: true, data: populatedReaction })
    } catch (error) {
      console.error('❌ reactToPost error:', error)
      return res.status(500).json({ message: 'Internal server error', success: false })
    }
  }

  module.exports = {
    reactToPost
  }