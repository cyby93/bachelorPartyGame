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
    question: 'Mi volt a jelem az óvodában?',
    options: ['Fenyőfa', 'Makk', 'Perec', 'Szőlő', 'Alma', 'Kisautó'],
    correctAnswer: 'Fenyőfa',
  },
  {
    id: 'q2',
    question: 'Milyen sportot űztem gyerekként?',
    options: ['Tenisz', 'Box', 'Foci', 'Röplabda', 'League of Legends', 'Semmilyet'],
    correctAnswer: 'Tenisz',
  },
  {
    id: 'q3',
    question: 'Melyik tantárgyból voltam a legrosszabb (vagy miből buktam meg) a középiskolában?',
    options: ['Matek', 'Fizika', 'Magyar', 'Biológia', 'Angol', 'Történelem'],
    correctAnswer: 'Magyar',
  },
  {
    id: 'q4',
    question: 'Melyik becenév nem volt rám használva tesók/unokatesók által?',
    options: ['Cika', 'Kapor', 'Kolbász', 'Manó', 'Kukac', 'Gabcuk'],
    correctAnswer: 'Kukac',
  },
  {
    id: 'q5',
    question: 'Hányas a cipőméretem?',
    options: ['38', '39', '40', '41', '42', '43'],
    correctAnswer: '42',
  },
  {
    id: 'q6',
    question: 'A menyasszonyom szerint mi a legrosszabb/legidegesítőbb szokásom?',
    options: ['Kiabálás játék közben', 'Nem csukom be a fiókokat', 'Borotválkozás után nem takarítok el', 'Elfelejtem bezárni az autót'],
    correctAnswer: 'Kiabálás játék közben',
  },
  {
    id: 'q7',
    question: 'Ha csak egyetlen filmet nézhetnék életem végéig, mi lenne az?',
    options: ['Gyűrűk ura', 'Harry Potter', 'Star Wars', 'Mátrix', 'Shrek', 'Mulan'],
    correctAnswer: 'Gyűrűk ura',
  },
  {
    id: 'q8',
    question: 'Mi volt az eddigi legsulyosabb fizikai sérülésem?',
    options: ['Zúzódott kéz', 'Zúzódott láb', 'Törött orr', 'Égési sérülés', 'Semmilyen komoly sérülésem nem volt'],
    correctAnswer: 'Zúzódott láb',
  },
  {
    id: 'q9',
    question: 'Mennyi a rekordom fekvenyomásból?',
    options: ['70', '80', '90', '100', '110', '120'],
    correctAnswer: '120',
  },
  {
    id: 'q10',
    question: 'Mekkora a leghosszabb táv amit futottam egyhuzamban?',
    options: ['10 km', '16 km', '21 km', '26 km', '29 km', '32 km'],
    correctAnswer: '21 km',
  },
  {
    id: 'q11',
    question: 'Mikor ismerkedtem meg Ágival?',
    options: ['2018', '2016', '2017', '2019', '2020'],
    correctAnswer: '2018',
  },
  {
    id: 'q12',
    question: 'Hova mentünk a legelső közös nyaralásunkon?',
    options: ['Ciprus', 'Málta', 'Tenerife', 'Anglia', 'Rodosz', 'Bécs'],
    correctAnswer: 'Ciprus',
  },
  {
    id: 'q13',
    question: 'Mi a menyasszonyom pontos születésnapja',
    options: ['07.07', '05.17', '06.15', '11.03', '08.12', '09.23'],
    correctAnswer: '08.07',
  },
  {
    id: 'q14',
    question: 'Melyik országban kértem meg a kezét?',
    options: ['Görögország', 'Ausztria', 'Hollandia', 'Spanyolország', 'Málta', 'Ciprus'],
    correctAnswer: 'Görögország',
  },
  {
    id: 'q15',
    question: 'Hányadik évfordulónkat ünnepeltük februárban?',
    options: ['4.', '5.', '6.', '7.', '8.', '9.'],
    correctAnswer: '7.',
  },
  {
    id: 'q16',
    question: 'Hány éve ismerem a tanúmat?',
    options: ['29', '23', '17', '11', '5', '2'],
    correctAnswer: '29',
  },
  {
    id: 'q17',
    question: 'Kivel rugtam be először annyira, hogy hánytam is?',
    options: ['Feci', 'Pityu', '(Kun) Miki', 'S. Bence', 'Csabi', 'Egyedül'],
    correctAnswer: 'Feci',
  },
  {
    id: 'q18',
    question: 'Hova utazunk a nászútunkon?',
    options: ['Azori szigetek', 'Maldív-szigetek', 'Seychelle-szigetek', 'Mauritius', 'Bali', 'Mallorka'],
    correctAnswer: 'Azori szigetek',
  },
  {
    id: 'q19',
    question: 'Nagyságrendileg hány fő hivatalos az esküvőre?',
    options: ['40', '60', '80', '100', '120', '140'],
    correctAnswer: '80',
  },
  {
    id: 'q20',
    question: 'Kivel játszottam a legtöbb órát egyhuzamban valamilyen játékkal?',
    options: ['S. Bence', 'M. Bence', 'Feci', 'Pityu', '(Kun) Miki', '(Karácsnyi) Miki', 'Csabi'],
    correctAnswer: 'S. Bence',
  },
  {
    id: 'q21',
    question: 'Ki okozott nekem a legnagyobb fizikai sérülést?',
    options: ['Pityu', 'Feci', 'Saját magam', 'S. Bence', 'Ági', 'Anyukám'],
    correctAnswer: 'Pityu',
  },
  {
    id: 'q22',
    question: 'Lopott-e már tőlem telefont cigány?',
    options: ['Persze', 'Dehogy'],
    correctAnswer: 'Persze',
  },
  {
    id: 'q23',
    question: 'Hánytam-e bele kézmosó kagylóba?',
    options: ['Persze', 'Dehogy'],
    correctAnswer: 'Persze',
  },
  {
    id: 'q24',
    question: 'Kakáltam-e véletlenül bele bidébe?',
    options: ['Persze', 'Dehogy'],
    correctAnswer: 'Dehogy',
  },
  {
    id: 'q25',
    question: 'Aludtam-e már kocsmában?',
    options: ['Persze', 'Dehogy'],
    correctAnswer: 'Dehogy',
  },
  {
    id: 'q26',
    question: 'Büntettek-e már meg utcán hugyozásért?',
    options: ['Persze', 'Dehogy'],
    correctAnswer: 'Dehogy',
  }
]
