/**
 * shared/QuizQuestions.js
 * Question pool for the between-level quiz.
 * Each question must have a unique `id`, a `question` string,
 * an `options` array (2–6 items), and a `correctAnswer` matching
 * one of the option strings exactly. Options are shuffled at pick
 * time by the server — no need to place the correct answer manually.
 */

export const QUIZ_QUESTIONS = [
  {
    id: 'q1',
    question: 'What sword does Arthas wield as the Lich King?',
    options: ['Thunderfury', 'Frostmourne', 'Ashbringer', 'Shadowmourne', 'Quel\'Delar', 'Doomhammer'],
    correctAnswer: 'Frostmourne',
  },
  {
    id: 'q2',
    question: 'What was the maximum level cap in the original World of Warcraft at launch (2004)?',
    options: ['40', '50', '60', '70', '80', '100'],
    correctAnswer: '60',
  },
  {
    id: 'q3',
    question: 'What was the first World of Warcraft expansion?',
    options: ['Wrath of the Lich King', 'The Burning Crusade', 'Cataclysm', 'Mists of Pandaria', 'Warlords of Draenor', 'Legion'],
    correctAnswer: 'The Burning Crusade',
  },
  {
    id: 'q4',
    question: 'Which Old God sleeps beneath the ruins of Ahn\'Qiraj?',
    options: ['N\'Zoth', 'Yogg-Saron', 'Y\'Shaarj', 'C\'Thun', 'G\'huun', 'Il\'gynoth'],
    correctAnswer: 'C\'Thun',
  },
  {
    id: 'q5',
    question: 'Which Dragon Aspect is the guardian of time?',
    options: ['Alexstrasza', 'Ysera', 'Neltharion', 'Nozdormu', 'Malygos', 'Kalecgos'],
    correctAnswer: 'Nozdormu',
  },
  {
    id: 'q6',
    question: 'What does the Orcish war cry "Lok\'tar Ogar" mean?',
    options: ['For the Horde', 'Victory or Death', 'Death to the Alliance', 'Strength and Honor', 'Blood and Glory', 'We are Legion'],
    correctAnswer: 'Victory or Death',
  },
  {
    id: 'q7',
    question: 'In which expansion was the Death Knight hero class introduced?',
    options: ['The Burning Crusade', 'Wrath of the Lich King', 'Cataclysm', 'Mists of Pandaria', 'Legion', 'Shadowlands'],
    correctAnswer: 'Wrath of the Lich King',
  },
  {
    id: 'q8',
    question: 'What is the name of Illidan Stormrage\'s twin brother?',
    options: ['Tyrande Whisperwind', 'Cenarius', 'Malfurion Stormrage', 'Kael\'thas Sunstrider', 'Arthas Menethil', 'Mal\'Ganis'],
    correctAnswer: 'Malfurion Stormrage',
  },
  {
    id: 'q9',
    question: 'Who was the final boss of Molten Core?',
    options: ['Onyxia', 'Ragnaros', 'Nefarian', 'Deathwing', 'C\'Thun', 'Archimonde'],
    correctAnswer: 'Ragnaros',
  },
  {
    id: 'q10',
    question: 'What is the name of the Dwarves\' capital city?',
    options: ['Gnomeregan', 'Thunder Bluff', 'Stormwind', 'Ironforge', 'Darnassus', 'Gilneas'],
    correctAnswer: 'Ironforge',
  },
  {
    id: 'q11',
    question: 'What new class was introduced in Mists of Pandaria?',
    options: ['Death Knight', 'Demon Hunter', 'Monk', 'Evoker', 'Bard', 'Shaman'],
    correctAnswer: 'Monk',
  },
  {
    id: 'q12',
    question: 'Which undead faction does Sylvanas Windrunner lead?',
    options: ['The Blood Elves', 'The Tauren', 'The Forsaken', 'The Nightborne', 'The Vulpera', 'The Lightforged'],
    correctAnswer: 'The Forsaken',
  },
  {
    id: 'q13',
    question: 'What is the name of the Night Elf moon goddess?',
    options: ['Elune', 'Ysera', 'Tyrande', 'Alexstrasza', 'Sylvanas', 'Cenarius'],
    correctAnswer: 'Elune',
  },
  {
    id: 'q14',
    question: 'How many playable races were available when WoW first launched?',
    options: ['6', '7', '8', '9', '10', '12'],
    correctAnswer: '8',
  },
  {
    id: 'q15',
    question: 'What is the name of the Horde\'s main capital city?',
    options: ['Thunder Bluff', 'Undercity', 'Orgrimmar', 'Silvermoon City', 'The Crossroads', 'Dalaran'],
    correctAnswer: 'Orgrimmar',
  },
  {
    id: 'q16',
    question: 'Which race was added as a Horde-exclusive option in The Burning Crusade?',
    options: ['Goblin', 'Tauren', 'Blood Elf', 'Nightborne', 'Highmountain Tauren', 'Mag\'har Orc'],
    correctAnswer: 'Blood Elf',
  },
  {
    id: 'q17',
    question: 'Which Dragon Aspect is known as the Life-Binder and queen of the red dragonflight?',
    options: ['Alexstrasza', 'Ysera', 'Neltharion', 'Nozdormu', 'Malygos', 'Kalecgos'],
    correctAnswer: 'Alexstrasza',
  },
  {
    id: 'q18',
    question: 'Who was the original Lich King before Arthas Menethil took the helm?',
    options: ['Archimonde', 'Kil\'jaeden', 'Ner\'zhul', 'Mannoroth', 'Mal\'Ganis', 'Gul\'dan'],
    correctAnswer: 'Ner\'zhul',
  },
  {
    id: 'q19',
    question: 'Who is the father of Garrosh Hellscream?',
    options: ['Gul\'dan', 'Doomhammer', 'Grom Hellscream', 'Blackhand', 'Thrall', 'Ner\'zhul'],
    correctAnswer: 'Grom Hellscream',
  },
  {
    id: 'q20',
    question: 'On which continent is Orgrimmar located?',
    options: ['Eastern Kingdoms', 'Kalimdor', 'Northrend', 'Outland', 'Pandaria', 'The Broken Isles'],
    correctAnswer: 'Kalimdor',
  },
  {
    id: 'q21',
    question: 'Which class is restricted exclusively to Night Elves and Blood Elves?',
    options: ['Death Knight', 'Demon Hunter', 'Monk', 'Paladin', 'Shaman', 'Druid'],
    correctAnswer: 'Demon Hunter',
  },
  {
    id: 'q22',
    question: 'What is the name of the raid in which players battle Deathwing?',
    options: ['Dragon Soul', 'Blackwing Lair', 'Blackwing Descent', 'Firelands', 'Bastion of Twilight', 'Eye of Eternity'],
    correctAnswer: 'Dragon Soul',
  },
  {
    id: 'q23',
    question: 'Which expansion introduced the Pandaren as a playable race?',
    options: ['Cataclysm', 'Mists of Pandaria', 'Warlords of Draenor', 'Legion', 'Battle for Azeroth', 'Shadowlands'],
    correctAnswer: 'Mists of Pandaria',
  },
  {
    id: 'q24',
    question: 'What is the name of the great tree on which Darnassus was built in Classic WoW?',
    options: ['Nordrassil', 'Teldrassil', 'Vordrassil', 'Shaladrassil', 'Ysera\'s Root', 'Tal\'drassil'],
    correctAnswer: 'Teldrassil',
  },
  {
    id: 'q25',
    question: 'How many playable classes existed at World of Warcraft\'s original launch?',
    options: ['7', '8', '9', '10', '11', '12'],
    correctAnswer: '9',
  },
  {
    id: 'q26',
    question: 'In which starting zone do Orc players begin their journey?',
    options: ['The Barrens', 'Durotar', 'Mulgore', 'Silverpine Forest', 'Tirisfal Glades', 'Eversong Woods'],
    correctAnswer: 'Durotar',
  },
  {
    id: 'q27',
    question: 'What resource do Warriors primarily spend to use their abilities?',
    options: ['Mana', 'Rage', 'Energy', 'Focus', 'Runic Power', 'Chi'],
    correctAnswer: 'Rage',
  },
  {
    id: 'q28',
    question: 'Which legendary weapon required the "Bindings of the Windseeker" to craft?',
    options: ['Ashbringer', 'Thunderfury', 'Sulfuras', 'Atiesh', 'Warglaives of Azzinoth', 'Val\'anyr'],
    correctAnswer: 'Thunderfury',
  },
  {
    id: 'q29',
    question: 'Who is the supreme ruler and creator of the Burning Legion?',
    options: ['Archimonde', 'Kil\'jaeden', 'Sargeras', 'Mannoroth', 'Illidan', 'Mal\'Ganis'],
    correctAnswer: 'Sargeras',
  },
  {
    id: 'q30',
    question: 'What is the name of the famous battle in Warcraft III where the races unite to stop the Burning Legion?',
    options: ['Battle of Ashenvale', 'Battle of Winterspring', 'Battle of Felwood', 'Battle of Mount Hyjal', 'Battle of Stratholme', 'Siege of Dalaran'],
    correctAnswer: 'Battle of Mount Hyjal',
  },
]
