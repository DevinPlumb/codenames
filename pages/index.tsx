import { useState, useEffect } from 'react';

interface Card {
  word: string;
  type: 'red' | 'blue' | 'neutral' | 'assassin';
  revealed: boolean;
}

// Word bank - you can expand this with more words
const WORD_BANK = [
  'AFRICA', 'AGENT', 'AIR', 'ALIEN', 'AMAZON', 'ANGEL', 'ANTARCTICA', 'APPLE',
  'ARM', 'BACK', 'BAND', 'BANK', 'BAR', 'BARK', 'BAT', 'BATTERY',
  'BEACH', 'BEAR', 'BEAT', 'BED', 'BEIJING', 'BELL', 'BELT', 'BERLIN',
  'BERRY', 'BOARD', 'BOND', 'BOOM', 'BOW', 'BOX', 'BRIDGE', 'BRUSH',
  'BUFFALO', 'BUG', 'CANADA', 'CAPITAL', 'CAR', 'CARD', 'CARNIVAL', 'CAST',
  'CAT', 'CELL', 'CENTAUR', 'CENTER', 'CHAIR', 'CHANGE', 'CHARGE', 'CHECK',
  'CHEST', 'CHICKEN', 'CHINA', 'CHOCOLATE', 'CHURCH', 'CIRCLE', 'CLIFF', 'CLOAK'
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