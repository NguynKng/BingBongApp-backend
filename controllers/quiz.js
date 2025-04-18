const Quiz = require('../models/quizModel'); // Import model Quiz
 
 // Lấy tất cả quiz
const getAllQuizzes = async (req, res) => {
   try {
     const quizzes = await Quiz.find().sort({ createdAt: -1 });
     console.log("Quizzes: ", quizzes); // Log the quizzes to check the data
     res.json({ success: true, quizzes });
   } catch (err) {
     res.status(500).json({ success: false, message: 'Server error' });
   }
 };
 
 // Lấy quiz theo ID
 const getQuizById = async (req, res) => {
   try {
     const quiz = await Quiz.findById(req.params.id);
     if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
     res.json({ success: true, quiz });
   } catch (err) {
     res.status(500).json({ success: false, message: 'Server error' });
   }
 };
 
 // Tạo quiz mới (cần đăng nhập)
const createQuiz = async (req, res) => {
   try {
     const { title, description, questions } = req.body;
 
     const newQuiz = await Quiz.create({
       title,
       description,
       questions,
       createdBy: req.user._id,
     });
 
     res.status(201).json({ success: true, quiz: newQuiz });
   } catch (err) {
     res.status(400).json({ success: false, message: err.message });
   }
 };
 
 // Xóa quiz (cần đăng nhập)
 const deleteQuiz = async (req, res) => {
   try {
     const quiz = await Quiz.findById(req.params.id);
 
     if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
 
     // Kiểm tra xem người xóa có phải là người tạo không
     if (quiz.createdBy.toString() !== req.user._id.toString()) {
       return res.status(403).json({ success: false, message: 'Unauthorized to delete this quiz' });
     }
 
     await quiz.deleteOne();
     res.json({ success: true, message: 'Quiz deleted' });
   } catch (err) {
     res.status(500).json({ success: false, message: 'Server error' });
   }
 };

 module.exports = {
    getAllQuizzes,
    getQuizById,
    createQuiz,
    deleteQuiz,
 }