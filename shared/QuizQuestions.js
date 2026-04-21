/**
 * shared/QuizQuestions.js
 * Question pool for the between-level quiz.
 * Each question must have a unique `id`, a `question` string,
 * an `options` array (2–6 items), and a `correctIndex` (0-based).
 */

export const QUIZ_QUESTIONS = [
  {
    id: 'q1',
    question: 'What is the capital of Australia?',
    options: ['Sydney', 'Melbourne', 'x Canberra', 'Brisbane'],
    correctIndex: 2,
  },
  {
    id: 'q2',
    question: 'How many bones are in the adult human body?',
    options: ['186', 'x 206', '226', '256'],
    correctIndex: 1,
  },
  {
    id: 'q3',
    question: 'Which planet has the most moons?',
    options: ['Jupiter', 'x Saturn', 'Uranus', 'Neptune'],
    correctIndex: 1,
  },
  {
    id: 'q4',
    question: 'What year did the Titanic sink?',
    options: ['1905', 'x 1912', '1918', '1923'],
    correctIndex: 1,
  },
  {
    id: 'q5',
    question: 'Which element has the chemical symbol "Au"?',
    options: ['Silver', 'x Gold', 'Aluminum', 'Argon'],
    correctIndex: 1,
  },
  {
    id: 'q6',
    question: 'How many strings does a standard guitar have?',
    options: ['4', '5', 'x 6', '7'],
    correctIndex: 2,
  },
  {
    id: 'q7',
    question: 'What is the largest ocean on Earth?',
    options: ['Atlantic', 'Indian', 'Arctic', 'x Pacific'],
    correctIndex: 3,
  },
  {
    id: 'q8',
    question: 'In what country would you find the Taj Mahal?',
    options: ['Pakistan', 'x India', 'Bangladesh', 'Nepal'],
    correctIndex: 1,
  },
  {
    id: 'q9',
    question: 'What gas do plants absorb from the atmosphere?',
    options: ['Oxygen', 'Nitrogen', 'x Carbon Dioxide', 'Hydrogen'],
    correctIndex: 2,
  },
  {
    id: 'q10',
    question: 'How many sides does a hexagon have?',
    options: ['5', 'x 6', '7', '8'],
    correctIndex: 1,
  },
]
