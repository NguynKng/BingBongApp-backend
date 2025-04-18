const mongoose = require("mongoose");

 const questionSchema = new mongoose.Schema({
   question: {
     type: String,
     required: [true, 'Question is required'],
     trim: true,
   },
   options: {
     type: [String],
     required: [true, 'Options are required'],
     validate: {
       validator: (value) => value.length >= 2,
       message: 'At least two options are required',
     },
   },
   correctAnswer: {
     type: String,
     required: [true, 'Correct answer is required'],
   },
 });
 
 const quizSchema = new mongoose.Schema({
   title: {
     type: String,
     required: [true, 'Title is required'],
     trim: true,
   },
   description: {
     type: String,
     default: '',
     trim: true,
   },
   questions: [questionSchema],
   createdBy: {
     type: mongoose.Schema.Types.ObjectId,
     ref: 'User',
   },
 }, {
   timestamps: true,
 });
 
 quizSchema.virtual("questionCount").get(function () {
   return this.questions.length;
 });
 
 quizSchema.set("toJSON", { virtuals: true });
 quizSchema.set("toObject", { virtuals: true });
 
 const Quiz = mongoose.model("Quiz", quizSchema);
 module.exports = Quiz;