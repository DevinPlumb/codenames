import { useSession } from '@supabase/auth-helpers-react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import AuthComponent from '../../components/Auth'
import { BaseCard, CardType, Team, Role, Player, GameState } from '@/types/game'
import TurnTimer from '../../components/TurnTimer'
import LoadingSpinner from '@/components/LoadingSpinner'

interface ParsedExternalVars {
  board: {
    cards: BaseCard[];
    remainingRed: number;
    remainingBlue: number;
  };
  remainingGuesses: number | null;
  turnTimer: {
    startedAt: Date;
    durationSeconds: number;
  };
}

interface GameData {
  id: string;
  currentState: GameState;
  externalVars: string; // JSON string of ExternalVariables
  winner: Team | null;
  endReason: string | null;
  players: Player[];
  currentClue: string | null;
  currentNumber: number | null;
  hints: Array<{
    team: Team;
    word: string;
    number: number;
    timestamp: string;
  }>;
  moves: Array<{
    teamTurn: Team;
    cardIndex: number;
    cardType: CardType;
    createdAt: string;
    playerId: string;
  }>;
}

// Helper to get current team from game state
function getTeamFromState(state: GameState): Team {
  if (state === GameState.RED_SPYMASTER || state === GameState.RED_OPERATIVE || state === GameState.RED_WIN) {
    return 'red';
  }
  return 'blue';
}

function GameCard({ word, type, revealed, onClick, disabled }: {
  word: string
  type: 'red' | 'blue' | 'neutral' | 'assassin'
  revealed: boolean
  onClick: () => void
  disabled: boolean
}) {
  const getCardStyle = () => {
    if (!revealed) {
      return 'bg-slate-800/50 hover:bg-slate-700/50'
    }
    switch (type) {
      case 'red':
        return 'bg-red-900/50 border-red-700'
      case 'blue':
        return 'bg-blue-900/50 border-blue-700'
      case 'assassin':
        return 'bg-black border-gray-700'
      case 'neutral':
        return 'bg-slate-700/50 border-slate-600'
    }
  }

  const getTextStyle = () => {
    if (!revealed) return 'text-slate-200'
    switch (type) {
      case 'red':
        return 'text-red-200'
      case 'blue':
        return 'text-blue-200'
      case 'assassin':
        return 'text-slate-200'
      case 'neutral':
        return 'text-slate-400'
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || revealed}
      className={`
        p-4 rounded-xl border border-slate-700 
        transition-all duration-200 
        ${getCardStyle()}
        ${!disabled && !revealed ? 'hover:scale-[1.02]' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <span className={`font-mono text-sm ${getTextStyle()}`}>
        {word}
      </span>
    </button>
  )
}

function DebugPanel({ moves, board, hints }: { 
  moves: Array<{
    teamTurn: Team
    cardIndex: number
    cardType: CardType
    createdAt: string
    playerId: string
  }>, 
  board: { cards: BaseCard[] },
  hints: Array<{
    team: Team
    word: string
    number: number
    timestamp: string
  }>
}) {
  const [isCollapsed, setIsCollapsed] = useState(true)

  // Combine and sort all events chronologically
  const events = [
    ...moves.map(m => ({
      type: 'move' as const,
      timestamp: m.createdAt,
      data: m
    })),
    ...hints.map(h => ({
      type: 'hint' as const,
      timestamp: h.timestamp,
      data: h
    }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return (
    <div className={`fixed md:top-4 md:right-4 ${
      isCollapsed 
        ? 'bottom-4 right-4 w-auto md:w-48 h-[60px]'
        : 'bottom-0 right-0 w-full md:w-96 md:max-w-[90vw]'
    } bg-black/90 text-green-400 rounded-xl 
      font-mono text-sm border border-green-500/50
      z-50 shadow-xl backdrop-blur-sm transition-all duration-300`}
    >
      <div 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`flex items-center justify-between p-4 h-[60px] cursor-pointer hover:bg-green-500/10 transition-colors rounded-xl
          ${!isCollapsed && 'border-b border-green-500/50 rounded-b-none'}`}
      >
        <h3 className="text-lg">Game Log</h3>
        <div className="p-2 rounded-lg">
          {isCollapsed ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          )}
        </div>
      </div>
      <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? 'h-0' : 'h-[60vh] md:h-[calc(90vh-4rem)]'}`}>
        <div className="p-4 space-y-4 overflow-auto h-full">
          {events.slice(0, 15).map((event, i) => (
            <div key={i} className="border-b border-green-500/20 pb-2">
              {event.type === 'move' ? (
                <>
                  <div className={`font-bold ${event.data.teamTurn === 'red' ? 'text-red-400' : 'text-blue-400'}`}>
                    {event.data.teamTurn.toUpperCase()} Team Guess
                  </div>
                  <div>Player: {event.data.playerId.startsWith('AI-') ? 'AI' : 'Human'}</div>
                  <div>Word: {board.cards[event.data.cardIndex].word}</div>
                  <div className={event.data.cardType === event.data.teamTurn ? 'text-emerald-400' : 'text-red-400'}>
                    Result: {event.data.cardType === event.data.teamTurn ? 'Correct!' : 'Wrong!'}
                  </div>
                </>
              ) : (
                <>
                  <div className={`font-bold ${event.data.team === 'red' ? 'text-red-400' : 'text-blue-400'}`}>
                    {event.data.team.toUpperCase()} Team Spymaster Hint
                  </div>
                  <div className="text-emerald-400">
                    Clue: "{event.data.word}" for {event.data.number} words
                  </div>
                </>
              )}
              <div className="text-xs text-green-600 mt-1">
                {new Date(event.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function GamePage() {
  const session = useSession()
  const router = useRouter()
  const { id } = router.query
  const [game, setGame] = useState<GameData | null>(null)
  const [parsedVars, setParsedVars] = useState<ParsedExternalVars | null>(null)
  const [loading, setLoading] = useState(true)
  const [clueWord, setClueWord] = useState('')
  const [clueNumber, setClueNumber] = useState<number>(0)

  useEffect(() => {
    if (game?.externalVars) {
      setParsedVars(JSON.parse(game.externalVars));
    }
  }, [game?.externalVars]);

  useEffect(() => {
    if (session && id) {
      loadGame()
      // Poll for updates every 2 seconds if it's not your turn
      const interval = setInterval(() => {
        if (game && !isCurrentTeamsTurn) {
          loadGame()
        }
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [session, id, game?.currentState])

  useEffect(() => {
    if (session && id && game) {
      // First check if game and players exist
      if (!game.players) return;

      // Check if it's an AI's turn
      const currentRole = game.currentClue ? 'operative' : 'spymaster'
      const currentTeam = getTeamFromState(game.currentState)
      const currentPlayer = game.players.find(p => 
        p.team === currentTeam && p.role === currentRole
      )
      
      // If it's an AI's turn, trigger the move
      if (!currentPlayer?.userId) {
        fetch(`/api/games/${id}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentState: game.currentState,
            externalVars: game.externalVars
          })
        }).then(res => res.json())
          .then(updatedGame => setGame(updatedGame))
          .catch(() => {}) // Silently handle AI move errors
      }
    }
  }, [session, id, game?.currentState, game?.currentClue])

  const loadGame = async () => {
    try {
      const res = await fetch(`/api/games/${id}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      if (!res.ok) throw new Error('Failed to load game')
      const data = await res.json()
      if (!data) throw new Error('Game not found')
      setGame(data)
    } catch (error) {
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const handleCardClick = async (index: number) => {
    if (!game || !parsedVars || !session || game.winner) return;
    if (!game.currentClue || isSpymaster) return;
    if (parsedVars.board.cards[index].revealed) return;

    try {
      const updatedCards = parsedVars.board.cards.map((card, i) => 
        i === index ? { ...card, revealed: true } : card
      );

      const updatedVars = {
        ...parsedVars,
        board: {
          ...parsedVars.board,
          cards: updatedCards
        }
      };

      // Count guesses made this turn
      const currentTeam = getTeamFromState(game.currentState);
      const guessesThisTurn = game.moves.filter(m => 
        m.teamTurn === currentTeam && 
        new Date(m.createdAt) > new Date(parsedVars.turnTimer.startedAt)
      ).length;

      // Check if this guess should end the turn
      const isWrongGuess = parsedVars.board.cards[index].type !== currentTeam;
      const isLastGuess = guessesThisTurn >= (game.currentNumber || 0);
      const shouldEndTurn = isWrongGuess;

      const nextState = shouldEndTurn 
        ? currentTeam === 'red' 
          ? GameState.BLUE_SPYMASTER 
          : GameState.RED_SPYMASTER
        : game.currentState;

      const res = await fetch(`/api/games/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentState: nextState,
          externalVars: JSON.stringify(updatedVars),
          currentClue: shouldEndTurn ? null : game.currentClue,
          currentNumber: shouldEndTurn ? null : game.currentNumber
        })
      });

      if (!res.ok) throw new Error('Failed to update game');
      const updatedGame = await res.json();
      setGame(updatedGame);
    } catch (error) {
      // Silently handle card click errors
    }
  };

  const handleGiveClue = async () => {
    if (!game || !parsedVars || !session || !clueWord || !clueNumber) return;

    try {
      const currentTeam = getTeamFromState(game.currentState);
      const hint = {
        team: currentTeam,
        word: clueWord,
        number: clueNumber,
        timestamp: new Date().toISOString()
      };

      const nextState = currentTeam === 'red' 
        ? GameState.RED_OPERATIVE 
        : GameState.BLUE_OPERATIVE;

      const res = await fetch(`/api/games/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentState: nextState,
          externalVars: game.externalVars,
          currentClue: clueWord,
          currentNumber: clueNumber,
          hint
        })
      });

      if (!res.ok) throw new Error('Failed to give clue');
      const updatedGame = await res.json();
      setGame(updatedGame);
      setClueWord('');
      setClueNumber(0);
    } catch (error) {
      // Silently handle clue errors
    }
  };

  const handleEndTurn = async () => {
    if (!game || !parsedVars || game.winner) return;

    try {
      const currentTeam = getTeamFromState(game.currentState);
      const nextState = currentTeam === 'red' 
        ? GameState.BLUE_SPYMASTER 
        : GameState.RED_SPYMASTER;

      const res = await fetch(`/api/games/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentState: nextState,
          externalVars: game.externalVars,
          currentClue: null,
          currentNumber: null
        })
      });
      const updatedGame = await res.json();
      setGame(updatedGame);
    } catch (error) {
      // Silently handle end turn errors
    }
  };

  if (!session) return <AuthComponent />
  if (loading) return <LoadingSpinner />
  if (!game || !parsedVars || !game.players) return null

  const player = game.players.find(p => p.userId === session.user.id)
  if (!player) return null

  const currentTeam = getTeamFromState(game.currentState)
  const isSpymaster = player.role === 'spymaster'
  const isCurrentTeamsTurn = currentTeam === player.team

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4">
      {/* Debug panel */}
      {game && parsedVars && (
        <DebugPanel 
          moves={game.moves} 
          board={parsedVars.board}
          hints={game.hints || []} 
        />
      )}
      
      <div className="max-w-7xl mx-auto">
        {/* Game header */}
        <div className="flex flex-col gap-4 mb-6 bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-slate-800/80 text-slate-300 rounded-xl font-mono border border-slate-700 
                         hover:bg-slate-700/80 transition-all duration-200 hover:scale-[1.02] shadow-lg"
              >
                ← Back
              </button>
              <div className={`font-mono text-xl ${
                currentTeam === 'red' ? 'text-red-400' : 'text-blue-400'
              }`}>
                {currentTeam === 'red' ? 'Red Team\'s Turn' : 'Blue Team\'s Turn'}
              </div>
              {!game.winner && (
                <TurnTimer
                  duration={parsedVars.turnTimer.durationSeconds}
                  onTimeUp={handleEndTurn}
                  turnStartedAt={parsedVars.turnTimer.startedAt.toISOString()}
                />
              )}
            </div>
            {!game.winner && 
             currentTeam === player.team && 
             !isSpymaster && 
             game.currentClue && (
              <button
                onClick={handleEndTurn}
                className={`px-4 py-2 rounded-xl font-mono border transition-all duration-200 hover:scale-[1.02] shadow-lg ${
                  currentTeam === 'red' 
                    ? 'bg-red-500/80 hover:bg-red-600/80 text-white border-red-700/50' 
                    : 'bg-blue-500/80 hover:bg-blue-600/80 text-white border-blue-700/50'
                }`}
              >
                Skip Remaining Guesses
              </button>
            )}
          </div>
          
          {isSpymaster && isCurrentTeamsTurn && !game.winner && !game.currentClue && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-stretch bg-slate-800/50 p-4 sm:p-6 rounded-xl border border-slate-700">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-mono text-slate-400">Clue Word</label>
                <input
                  type="text"
                  value={clueWord}
                  onChange={(e) => setClueWord(e.target.value)}
                  placeholder="Enter a one-word clue"
                  className="p-3 w-full sm:w-64 rounded-xl bg-slate-900/50 border border-slate-600 text-slate-200 font-mono
                           focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-mono text-slate-400">Number of Words</label>
                <input
                  type="number"
                  value={clueNumber}
                  onChange={(e) => setClueNumber(parseInt(e.target.value))}
                  min="1"
                  max="9"
                  className="p-3 w-full sm:w-28 rounded-xl bg-slate-900/50 border border-slate-600 text-slate-200 font-mono
                           focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                />
              </div>
              <button
                onClick={handleGiveClue}
                disabled={!clueWord || !clueNumber}
                className="px-6 py-3 bg-emerald-500/80 text-white rounded-xl font-mono
                         hover:bg-emerald-600/80 transition-all duration-200 hover:scale-[1.02]
                         disabled:opacity-50 disabled:hover:scale-100 shadow-lg sm:self-end"
              >
                Give Clue
              </button>
            </div>
          )}

          {game.currentClue && (
            <div className="font-mono text-slate-200 text-center">
              <span className={`font-bold ${currentTeam === 'red' ? 'text-red-400' : 'text-blue-400'}`}>
                {currentTeam.toUpperCase()} Team's Clue:
              </span>{' '}
              <span className="text-emerald-400 font-bold">{game.currentClue}</span>{' '}
              <span className="text-slate-400">(pointing to</span>{' '}
              <span className="text-emerald-400 font-bold">{game.currentNumber}</span>{' '}
              <span className="text-slate-400">words)</span>
            </div>
          )}
        </div>

        {/* Game board */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4">
          {parsedVars.board.cards.map((card, index) => (
            <button
              key={index}
              onClick={() => handleCardClick(index)}
              disabled={
                card.revealed ||  // Already revealed cards can't be clicked
                game.winner !== null ||  // Game over
                currentTeam !== player.team ||  // Not your team's turn
                isSpymaster ||  // Spymasters can't click
                (!isSpymaster && !game.currentClue)  // Operatives need a clue to click
              }
              className={`aspect-[3/2] p-2 md:p-4 font-mono text-center transition-all duration-300 
                         border-2 shadow-lg rounded-xl hover:scale-[1.02] disabled:hover:scale-100 
                         transform ${card.revealed ? 'animate-reveal' : ''} ${
                card.revealed || isSpymaster
                  ? card.type === 'red'
                    ? `bg-red-500/80 text-white border-red-700 ${card.revealed ? 'ring-4 ring-red-400 ring-opacity-100 scale-105' : ''}`
                    : card.type === 'blue'
                    ? `bg-blue-500/80 text-white border-blue-700 ${card.revealed ? 'ring-4 ring-blue-400 ring-opacity-100 scale-105' : ''}`
                    : card.type === 'assassin'
                    ? `bg-black text-white border-slate-700 ${card.revealed ? 'ring-4 ring-slate-400 ring-opacity-100 scale-105' : ''}`
                    : `bg-slate-600/80 text-slate-200 border-slate-700 ${card.revealed ? 'ring-4 ring-slate-400 ring-opacity-100 scale-105' : ''}`
                  : 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 border-slate-700 backdrop-blur-sm'
              }`}
            >
              <span className="text-xs sm:text-sm">{card.word}</span>
            </button>
          ))}
        </div>

        {/* Game Over Modal */}
        {game.winner && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-slate-900/90 border border-slate-800 p-8 rounded-xl text-center shadow-lg max-w-md mx-4">
              <h2 className="text-2xl font-mono font-bold mb-4 text-slate-200">Game Over!</h2>
              <p className="mb-6 font-mono text-slate-400">
                {game.endReason === 'assassin' ? (
                  <>The assassin was revealed! </>
                ) : (
                  <>All cards found! </>
                )}
                <span className={`font-bold ${
                  game.winner === 'red' ? 'text-red-400' : 'text-blue-400'
                }`}>
                  {game.winner.toUpperCase()} team wins!
                </span>
              </p>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-slate-800/80 text-slate-300 rounded-xl font-mono border border-slate-700 
                         hover:bg-slate-700/80 transition-all duration-200 hover:scale-[1.02] shadow-lg"
              >
                Back to Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 