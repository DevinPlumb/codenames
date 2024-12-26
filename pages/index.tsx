import { useState, useEffect } from 'react';

interface Card {
  word: string;
  type: 'red' | 'blue' | 'neutral' | 'assassin';
  revealed: boolean;
}

// Word bank c/o https://github.com/Gullesnuffs/Codenames/blob/master/wordlist-eng.txt
const WORD_BANK = [
  'AFRICA', 'AGENT', 'AIR', 'ALIEN', 'ALPS', 'AMAZON', 'AMBULANCE', 'AMERICA',
  'ANGEL', 'ANTARCTICA', 'APPLE', 'ARM', 'ATLANTIS', 'AUSTRALIA', 'AZTEC', 'BACK',
  'BALL', 'BAND', 'BANK', 'BAR', 'BARK', 'BAT', 'BATTERY', 'BEACH', 'BEAR',
  'BEAT', 'BED', 'BEIJING', 'BELL', 'BELT', 'BERLIN', 'BERMUDA', 'BERRY', 'BILL',
  'BLOCK', 'BOARD', 'BOLT', 'BOMB', 'BOND', 'BOOM', 'BOOT', 'BOTTLE', 'BOW',
  'BOX', 'BRIDGE', 'BRUSH', 'BUCK', 'BUFFALO', 'BUG', 'BUGLE', 'BUTTON', 'CALF',
  'CANADA', 'CAP', 'CAPITAL', 'CAR', 'CARD', 'CARROT', 'CASINO', 'CAST', 'CAT',
  'CELL', 'CENTAUR', 'CENTER', 'CHAIR', 'CHANGE', 'CHARGE', 'CHECK', 'CHEST',
  'CHICK', 'CHINA', 'CHOCOLATE', 'CHURCH', 'CIRCLE', 'CLIFF', 'CLOAK', 'CLUB',
  'CODE', 'COLD', 'COMIC', 'COMPOUND', 'CONCERT', 'CONDUCTOR', 'CONTRACT', 'COOK',
  'COPPER', 'COTTON', 'COURT', 'COVER', 'CRANE', 'CRASH', 'CRICKET', 'CROSS',
  'CROWN', 'CYCLE', 'CZECH', 'DANCE', 'DATE', 'DAY', 'DEATH', 'DECK', 'DEGREE',
  'DIAMOND', 'DICE', 'DINOSAUR', 'DISEASE', 'DOCTOR', 'DOG', 'DRAFT', 'DRAGON',
  'DRESS', 'DRILL', 'DROP', 'DUCK', 'DWARF', 'EAGLE', 'EGYPT', 'EMBASSY',
  'ENGINE', 'ENGLAND', 'EUROPE', 'EYE', 'FACE', 'FAIR', 'FALL', 'FAN', 'FENCE',
  'FIELD', 'FIGHTER', 'FIGURE', 'FILE', 'FILM', 'FIRE', 'FISH', 'FLUTE', 'FLY',
  'FOOT', 'FORCE', 'FOREST', 'FORK', 'FRANCE', 'GAME', 'GAS', 'GENIUS',
  'GERMANY', 'GHOST', 'GIANT', 'GLASS', 'GLOVE', 'GOLD', 'GRACE', 'GRASS',
  'GREECE', 'GREEN', 'GROUND', 'HAM', 'HAND', 'HAWK', 'HEAD', 'HEART',
  'HELICOPTER', 'HIMALAYAS', 'HOLE', 'HOLLYWOOD', 'HONEY', 'HOOD', 'HOOK',
  'HORN', 'HORSE', 'HORSESHOE', 'HOSPITAL', 'HOTEL', 'ICE', 'ICE CREAM',
  'INDIA', 'IRON', 'IVORY', 'JACK', 'JAM', 'JET', 'JUPITER', 'KANGAROO',
  'KETCHUP', 'KEY', 'KID', 'KING', 'KIWI', 'KNIFE', 'KNIGHT', 'LAB', 'LAP',
  'LASER', 'LAWYER', 'LEAD', 'LEMON', 'LEPRECHAUN', 'LIFE', 'LIGHT',
  'LIMOUSINE', 'LINE', 'LINK', 'LION', 'LITTER', 'LOCH NESS', 'LOCK', 'LOG',
  'LONDON', 'LUCK', 'MAIL', 'MAMMOTH', 'MAPLE', 'MARBLE', 'MARCH', 'MASS',
  'MATCH', 'MERCURY', 'MEXICO', 'MICROSCOPE', 'MILLIONAIRE', 'MINE', 'MINT',
  'MISSILE', 'MODEL', 'MOLE', 'MOON', 'MOSCOW', 'MOUNT', 'MOUSE', 'MOUTH',
  'MUG', 'NAIL', 'NEEDLE', 'NET', 'NEW YORK', 'NIGHT', 'NINJA', 'NOTE',
  'NOVEL', 'NURSE', 'NUT', 'OCTOPUS', 'OIL', 'OLIVE', 'OLYMPUS', 'OPERA',
  'ORANGE', 'ORGAN', 'PALM', 'PAN', 'PANTS', 'PAPER', 'PARACHUTE', 'PARK',
  'PART', 'PASS', 'PASTE', 'PENGUIN', 'PHOENIX', 'PIANO', 'PIE', 'PILOT',
  'PIN', 'PIPE', 'PIRATE', 'PISTOL', 'PIT', 'PITCH', 'PLANE', 'PLASTIC',
  'PLATE', 'PLATYPUS', 'PLAY', 'PLOT', 'POINT', 'POISON', 'POLE', 'POLICE',
  'POOL', 'PORT', 'POST', 'POUND', 'PRESS', 'PRINCESS', 'PUMPKIN', 'PUPIL',
  'PYRAMID', 'QUEEN', 'RABBIT', 'RACKET', 'RAY', 'REVOLUTION', 'RING', 'ROBIN',
  'ROBOT', 'ROCK', 'ROME', 'ROOT', 'ROSE', 'ROULETTE', 'ROUND', 'ROW', 'RULER',
  'SATELLITE', 'SATURN', 'SCALE', 'SCHOOL', 'SCIENTIST', 'SCORPION', 'SCREEN',
  'SCUBA DIVER', 'SEAL', 'SERVER', 'SHADOW', 'SHAKESPEARE', 'SHARK', 'SHIP',
  'SHOE', 'SHOP', 'SHOT', 'SINK', 'SKYSCRAPER', 'SLIP', 'SLUG', 'SMUGGLER',
  'SNOW', 'SNOWMAN', 'SOCK', 'SOLDIER', 'SOUL', 'SOUND', 'SPACE', 'SPELL',
  'SPIDER', 'SPIKE', 'SPINE', 'SPOT', 'SPRING', 'SPY', 'SQUARE', 'STADIUM',
  'STAFF', 'STAR', 'STATE', 'STICK', 'STOCK', 'STRAW', 'STREAM', 'STRIKE',
  'STRING', 'SUB', 'SUIT', 'SUPERHERO', 'SWING', 'SWITCH', 'TABLE', 'TABLET',
  'TAG', 'TAIL', 'TAP', 'TEACHER', 'TELESCOPE', 'TEMPLE', 'THEATER', 'THIEF',
  'THUMB', 'TICK', 'TIE', 'TIME', 'TOKYO', 'TOOTH', 'TORCH', 'TOWER', 'TRACK',
  'TRAIN', 'TRIANGLE', 'TRIP', 'TRUNK', 'TUBE', 'TURKEY', 'UNDERTAKER',
  'UNICORN', 'VACUUM', 'VAN', 'VET', 'WAKE', 'WALL', 'WAR', 'WASHER',
  'WASHINGTON', 'WATCH', 'WATER', 'WAVE', 'WEB', 'WELL', 'WHALE', 'WHIP',
  'WIND', 'WITCH', 'WORM', 'YARD'
];

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function initializeGameBoard(): Card[] {
  // Randomly select 25 words
  const selectedWords = shuffleArray(WORD_BANK).slice(0, 25);
  
  // Create card types array (9 red, 8 blue, 7 neutral, 1 assassin)
  // First team (red) gets one extra card
  const cardTypes: Card['type'][] = [
    ...Array(9).fill('red'),
    ...Array(8).fill('blue'),
    ...Array(7).fill('neutral'),
    'assassin'
  ];

  // Shuffle card types
  const shuffledTypes = shuffleArray(cardTypes);

  // Create cards array
  return selectedWords.map((word, index) => ({
    word,
    type: shuffledTypes[index],
    revealed: false
  }));
}

export default function Home() {
  const [currentTeam, setCurrentTeam] = useState<'red' | 'blue'>('red');
  const [isGameOver, setIsGameOver] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);

  // Initialize game board on component mount
  useEffect(() => {
    setCards(initializeGameBoard());
  }, []);

  const handleCardClick = (index: number) => {
    const newCards = [...cards];
    const card = newCards[index];
    
    if (!card.revealed) {
      card.revealed = true;
      setCards(newCards);

      if (card.type === 'assassin') {
        setIsGameOver(true);
      } else if (card.type !== currentTeam) {
        // If wrong team's card is selected, automatically end turn
        setCurrentTeam(currentTeam === 'red' ? 'blue' : 'red');
      }
    }
  };

  const handleEndTurn = () => {
    setCurrentTeam(currentTeam === 'red' ? 'blue' : 'red');
  };

  const handleNewGame = () => {
    setCards(initializeGameBoard());
    setIsGameOver(false);
    setCurrentTeam('red');
  };

  return (
    <div className="container mx-auto p-4">
      {/* Game status bar */}
      <div className="flex justify-between items-center mb-6">
        <div className={`text-2xl font-bold ${currentTeam === 'red' ? 'text-red-500' : 'text-blue-500'}`}>
          {currentTeam === 'red' ? 'Red Team\'s Turn' : 'Blue Team\'s Turn'}
        </div>
        <div className="flex gap-4">
          <button
            onClick={handleNewGame}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-md"
          >
            New Game
          </button>
          <button
            onClick={handleEndTurn}
            className={`end-turn-button ${
              currentTeam === 'red' ? 'end-turn-button-red' : 'end-turn-button-blue'
            }`}
          >
            End {currentTeam === 'red' ? 'Red' : 'Blue'} Team's Turn
          </button>
        </div>
      </div>

      {/* Game board */}
      <div className="grid grid-cols-5 gap-4">
        {cards.map((card, index) => (
          <button
            key={index}
            onClick={() => handleCardClick(index)}
            className={`codenames-card ${
              card.revealed
                ? card.type === 'red'
                  ? 'codenames-card-red'
                  : card.type === 'blue'
                  ? 'codenames-card-blue'
                  : card.type === 'assassin'
                  ? 'codenames-card-assassin'
                  : 'codenames-card-neutral'
                : 'codenames-card-hidden'
            }`}
          >
            {card.word}
          </button>
        ))}
      </div>

      {/* Game Over Modal */}
      {isGameOver && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-slate-900 p-8 rounded-lg text-center">
            <h2 className="text-2xl font-bold mb-4">Game Over!</h2>
            <p className="mb-4">The assassin was revealed! {currentTeam === 'red' ? 'Blue' : 'Red'} team wins!</p>
            <button
              onClick={handleNewGame}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-md"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 