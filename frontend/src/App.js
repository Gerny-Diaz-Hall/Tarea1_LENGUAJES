import React, { useState, useEffect } from 'react';
import { Play, History, ArrowRight } from 'lucide-react';

// Componente para la pantalla de inicio del juego
function WelcomeScreen({ onStartGame }) {
    const [player1, setPlayer1] = useState('');
    const [player2, setPlayer2] = useState('');

    const handleStart = () => {
        if (player1 && player2) {
            onStartGame(player1, player2);
        } else {
            // Reemplazamos alert() por un mensaje en consola, ya que alert() puede no funcionar en algunos entornos.
            console.error('Por favor, ingresa el nombre de ambos jugadores.');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full bg-slate-900 text-white p-4">
            <h1 className="text-5xl font-extrabold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-500">
                Batalla de Números
            </h1>
            <p className="text-xl mb-8 text-center text-slate-300">
                ¡Dos jugadores, dos números secretos, una batalla!
            </p>
            <div className="flex flex-col space-y-4 w-full max-w-sm">
                <input
                    type="text"
                    placeholder="Nombre del Jugador 1"
                    value={player1}
                    onChange={(e) => setPlayer1(e.target.value)}
                    className="p-3 rounded-lg border border-slate-600 bg-slate-700 text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
                <input
                    type="text"
                    placeholder="Nombre del Jugador 2"
                    value={player2}
                    onChange={(e) => setPlayer2(e.target.value)}
                    className="p-3 rounded-lg border border-slate-600 bg-slate-700 text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
                <button
                    onClick={handleStart}
                    className="bg-teal-500 text-white font-bold py-3 px-6 rounded-xl transition-transform transform hover:scale-105 hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                    <Play className="w-6 h-6 mr-2" />
                    Iniciar Juego
                </button>
            </div>
        </div>
    );
}

// Componente para la pantalla de juego
function GameScreen({ gameData, onMakeGuess, onRestart }) {
    const [guess, setGuess] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (gameData?.message) {
            setMessage(gameData.message);
        }
    }, [gameData]);

    const handleGuess = async () => {
        if (!guess) return;
        setIsLoading(true);
        const guessValue = parseInt(guess);
        if (isNaN(guessValue)) {
            setMessage('Por favor, ingresa un número válido.');
            setIsLoading(false);
            return;
        }

        const response = await onMakeGuess(gameData.gameId, gameData.currentPlayer.id, guessValue);

        // Aquí agregas la validación:
        if (!response || !response.message) {
            setMessage('Error al procesar el intento. Intenta de nuevo.');
            setIsLoading(false);
            return;
        }
        setMessage(response.message);
        setGuess('');
        setIsLoading(false);
    };

    const isFinished = gameData?.status === 'finished';

    return (
        <div className="flex flex-col items-center justify-center h-full bg-slate-900 text-white p-4">
            <h2 className="text-3xl font-bold mb-4 text-cyan-400">¡Adivina el Número!</h2>
            {isFinished ? (
                <div className="text-center">
                    <p className="text-2xl mb-4 font-semibold text-emerald-400">{message}</p>
                    <p className="text-xl mb-8 text-slate-300">¡El ganador es {gameData.winnerName}!</p>
                    <button
                        onClick={onRestart}
                        className="bg-teal-500 text-white font-bold py-3 px-6 rounded-xl transition-transform transform hover:scale-105 hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-400"
                    >
                        <Play className="mr-2" />
                        Volver a Jugar
                    </button>
                </div>
            ) : (
                <div className="w-full max-w-md text-center">
                    <p className="text-lg mb-2 text-slate-300">Turno de: <span className="font-semibold text-teal-400">{gameData.currentPlayer.name}</span></p>
                    <p className="text-sm mb-4 text-slate-400">Intentos: <span className="font-semibold">{gameData.currentPlayer.attempts}</span></p>
                    <div className="flex items-center space-x-2 w-full mb-4">
                        <input
                            type="number"
                            value={guess}
                            onChange={(e) => setGuess(e.target.value)}
                            placeholder="Tu número"
                            className="flex-1 p-3 rounded-lg border border-slate-600 bg-slate-700 text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleGuess();
                                }
                            }}
                        />
                        <button
                            onClick={handleGuess}
                            disabled={isLoading}
                            className={`bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition-transform transform hover:scale-105 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <ArrowRight className="w-6 h-6" />
                        </button>
                    </div>
                    {message && (
                        <p className={`text-md font-medium ${message.includes('Correcto') || message.includes('ganador') ? 'text-green-400' : 'text-red-400'}`}>{message}</p>
                    )}
                </div>
            )}
        </div>
    );
}

// Componente para la pantalla de historial
function HistoryScreen({ history }) {
    return (
        <div className="flex flex-col items-center p-4 bg-slate-900 min-h-full overflow-y-auto">
            <h2 className="text-3xl font-bold mb-6 text-teal-400">Historial de Partidas</h2>
            <div className="w-full max-w-4xl space-y-4">
                {history.length === 0 ? (
                    <p className="text-center text-slate-400">No hay partidas en el historial.</p>
                ) : (
                    history.map((game, index) => (
                        <div key={index} className="bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-700">
                            <h3 className="text-xl font-semibold mb-2 text-cyan-300">Partida #{game.ID_Juego}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-300">
                                <div>
                                    <p><span className="font-medium text-slate-100">Jugador 1:</span> {game.Jugador1}</p>
                                    <p><span className="font-medium text-slate-100">Intentos:</span> {game.Intentos_Totalj1}</p>
                                    <p><span className="font-medium text-slate-100">Tiempo:</span> {game.Tiempo_Totalj1}s</p>
                                </div>
                                <div>
                                    <p><span className="font-medium text-slate-100">Jugador 2:</span> {game.Jugador2}</p>
                                    <p><span className="font-medium text-slate-100">Intentos:</span> {game.Intentos_Totalj2}</p>
                                    <p><span className="font-medium text-slate-100">Tiempo:</span> {game.Tiempo_Totalj2}s</p>
                                </div>
                            </div>
                            <p className="mt-4 text-lg font-bold text-center">
                                Ganador: <span className="text-emerald-400">{game.Ganador || 'N/A'}</span>
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// Componente principal de la aplicación
export default function App() {
    const [view, setView] = useState('welcome');
    const [gameData, setGameData] = useState(null);
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Al cargar la vista de historial, obtenemos los datos
        if (view === 'history') {
            fetchHistory();
        }
    }, [view]);

    const startGame = async (player1, player2) => {
        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:3000/api/games/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ player1, player2 }),
            });
            const data = await response.json();
            if (response.ok) {
                setGameData(data);
                setView('game');
            } else {
                console.error('Error al iniciar el juego:', data.message);
            }
        } catch (error) {
            console.error('Error de red:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const makeGuess = async (gameId, playerId, guess) => {
        setIsLoading(true);
        try {
            const response = await fetch(`http://localhost:3000/api/games/${gameId}/guess`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ gameId, playerId, guess }),
            });
            const data = await response.json();
            if (response.ok) {
                setGameData({
                    ...gameData,
                    currentPlayer: data.currentPlayer,
                    message: data.message,
                    status: data.status,
                    winnerName: data.winner,
                });
                return data;
            } else {
                console.error('Error al hacer el intento:', data.message);
            }
        } catch (error) {
            console.error('Error de red:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchHistory = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:3000/api/games/history');
            const data = await response.json();
            if (response.ok) {
                setHistory(data);
            } else {
                console.error('Error al obtener el historial:', data.message);
            }
        } catch (error) {
            console.error('Error de red:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const renderView = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center h-full p-4 bg-slate-900 text-white">
                    <p className="text-xl animate-pulse">Cargando...</p>
                </div>
            );
        }
        switch (view) {
            case 'game':
                return <GameScreen gameData={gameData} onMakeGuess={makeGuess} onRestart={() => setView('welcome')} />;
            case 'history':
                return <HistoryScreen history={history} />;
            case 'welcome':
            default:
                return <WelcomeScreen onStartGame={startGame} />;
        }
    };

    return (
        <div className="min-h-screen font-sans antialiased text-slate-100 flex flex-col">
            <header className="bg-slate-800 shadow-lg p-4 flex justify-center items-center space-x-4">
                <button
                    onClick={() => setView('welcome')}
                    className="flex items-center text-slate-300 hover:text-white transition-colors"
                >
                    <Play className="w-6 h-6 mr-1" />
                    Jugar
                </button>
                <button
                    onClick={() => setView('history')}
                    className="flex items-center text-slate-300 hover:text-white transition-colors"
                >
                    <History className="w-6 h-6 mr-1" />
                    Historial
                </button>
            </header>
            <main className="flex-1">
                {renderView()}
            </main>
        </div>
    );
}

