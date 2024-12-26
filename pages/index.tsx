import Head from 'next/head';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

type Team = 'red' | 'blue';
type CardType = 'red' | 'blue' | 'neutral' | 'assassin';
type Card = {
  word: string;
  type: CardType;
  revealed: boolean;
};

export default function Home() {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [gameBoard, setGameBoard] = useState<Card[]>([]);
  const [currentTurn, setCurrentTurn] = useState<Team>('red');
  const [clue, setClue] = useState<string>('');
  const [clueNumber, setClueNumber] = useState<number>(0);

  useEffect(() => {
    initializeGame();
  }, []);

  const initializeGame = () => {
    // Example words - in a real implementation, you'd have a larger word bank
    const words = [
      'APPLE', 'BANK', 'CAR', 'DOG', 'EGG',
      'FISH', 'GAME', 'HAT', 'ICE', 'JAM',
      'KING', 'LAMP', 'MOON', 'NOTE', 'OAK',
      'PEN', 'QUEEN', 'RAT', 'SUN', 'TIME',
      'URN', 'VAN', 'WALL', 'X-RAY', 'YOGA'
    ];

    const cardTypes: CardType[] = [
      ...Array(8).fill('red'),
      ...Array(8).fill('blue'),
      ...Array(7).fill('neutral'),
      'assassin'
    ];

    const shuffledBoard = words.map((word, index) => ({
      word,
      type: cardTypes[index],
      revealed: false
    }));

    setGameBoard(shuffledBoard);
  };

  const handleCardClick = (index: number) => {
    if (!selectedTeam || gameBoard[index].revealed) return;

    const newBoard = [...gameBoard];
    newBoard[index].revealed = true;
    setGameBoard(newBoard);

    if (newBoard[index].type === 'assassin') {
      alert('Game Over! The assassin was revealed!');
      initializeGame();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-slate-50">
      <Head>
        <title>Codenames - AI Edition</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-blue-400 to-red-400 text-transparent bg-clip-text">
          Codenames - AI Edition
        </h1>

        {!selectedTeam ? (
          <div className="max-w-md mx-auto space-y-6 text-center">
            <Card className="p-6 bg-slate-800/50 border-slate-700">
              <h2 className="text-2xl font-semibold mb-6">Choose your team</h2>
              <div className="flex gap-4 justify-center">
                <Button
                  variant="default"
                  size="lg"
                  onClick={() => setSelectedTeam('red')}
                  className="bg-red-500 hover:bg-red-600 text-white w-32"
                >
                  Red Team
                </Button>
                <Button
                  variant="default"
                  size="lg"
                  onClick={() => setSelectedTeam('blue')}
                  className="bg-blue-500 hover:bg-blue-600 text-white w-32"
                >
                  Blue Team
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          <>
            <div className="mb-8 text-center space-y-2">
              <div className="inline-flex gap-4 items-center justify-center bg-slate-800/50 rounded-full px-6 py-2">
                <span className={cn(
                  "px-3 py-1 rounded-full",
                  selectedTeam === 'red' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                )}>
                  {selectedTeam.toUpperCase()} TEAM
                </span>
                <span className="text-slate-400">|</span>
                <span className={cn(
                  "px-3 py-1 rounded-full",
                  currentTurn === 'red' 
                    ? 'bg-red-500/20 text-red-400' 
                    : currentTurn === 'blue' 
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-gray-500/20 text-gray-400'
                )}>
                  {currentTurn ? `${currentTurn.toUpperCase()}'s TURN` : 'GAME STARTING...'}
                </span>
              </div>
              {clue && (
                <div className="bg-slate-800/50 rounded-full px-6 py-2 inline-flex">
                  <span>Clue: {clue} ({clueNumber})</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-5 gap-3 max-w-5xl mx-auto">
              {gameBoard.map((card, index) => (
                <HoverCard key={index} openDelay={200}>
                  <HoverCardTrigger asChild>
                    <button
                      onClick={() => handleCardClick(index)}
                      className={cn(
                        "aspect-[3/2] rounded-lg p-4 text-center font-medium transition-all hover:scale-105",
                        "border border-slate-700 shadow-lg",
                        card.revealed
                          ? {
                              'red': 'bg-red-500 text-white',
                              'blue': 'bg-blue-500 text-white',
                              'neutral': 'bg-slate-600 text-slate-200',
                              'assassin': 'bg-black text-white',
                            }[card.type]
                          : 'bg-slate-800/50 hover:bg-slate-800/80'
                      )}
                    >
                      {card.word}
                    </button>
                  </HoverCardTrigger>
                  {!card.revealed && (
                    <HoverCardContent className="w-auto bg-slate-900 border-slate-800">
                      <p className="text-sm text-slate-400">Click to reveal</p>
                    </HoverCardContent>
                  )}
                </HoverCard>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
} 