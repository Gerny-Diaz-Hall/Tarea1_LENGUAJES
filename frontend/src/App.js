import React, { useState, useEffect } from 'react';
import { Play, History, ArrowRight } from 'lucide-react';
import ResumenJuegoModal from './ResumenJuegoModal';
import './App.css';

// Componente para la pantalla de inicio del juego
function WelcomeScreen({ onStartGame }) {
    const [player1, setPlayer1] = useState('');
    const [player2, setPlayer2] = useState('');

    const handleStart = () => {
        if (player1 && player2) {
            onStartGame(player1, player2);
        } else {
            console.error('Por favor, ingresa el nombre de ambos jugadores.');
        }
    };

    return (
        <div className="welcome-container">
            <h1 className="welcome-title">Batalla de Números</h1>
            <p className="welcome-subtitle">
                ¡Dos jugadores, dos números secretos, una batalla!
            </p>
            <div className="input-group">
                <input
                    type="text"
                    placeholder="Nombre del Jugador 1"
                    value={player1}
                    onChange={(e) => setPlayer1(e.target.value)}
                    className="input-field"
                />
                <input
                    type="text"
                    placeholder="Nombre del Jugador 2"
                    value={player2}
                    onChange={(e) => setPlayer2(e.target.value)}
                    className="input-field"
                />
                <button onClick={handleStart} className="button">
                    <Play className="icon" />
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
    const [showSummary, setShowSummary] = useState(false);
    const [summaryData, setSummaryData] = useState(null);

    useEffect(() => {
        if (gameData?.status === 'finished' && !showSummary) {
            setSummaryData({
                player1: {
                    name: gameData.players[0].name,
                    attempts: gameData.players[0].attempts || 0,
                    time: gameData.times?.player1 || 0
                },
                player2: {
                    name: gameData.players[1].name,
                    attempts: gameData.players[1].attempts || 0,
                    time: gameData.times?.player2 || 0
                },
                winner: gameData.winner,
                secretNumber: gameData.secretNumber
            });
            setShowSummary(true);
        }
    }, [
        gameData?.status,
        gameData?.players,
        gameData?.secretNumber,
        gameData?.times?.player1,
        gameData?.times?.player2,
        gameData?.winner,
        showSummary
    ]);


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
        <div className="game-container">
            <h2 className="game-title">¡Adivina el Número!</h2>
            {isFinished ? (
                <div className="end-container">
                    <p className={`message ${message.includes('Correcto') ? 'message-correct' : 'message-incorrect'}`}>
                        {message}
                    </p>
                    <p className="end-winner">
                        ¡El ganador es <span>{gameData.winnerName}</span>!
                    </p>
                    <button onClick={onRestart} className="button">
                        <Play className="icon" />
                        Volver a Jugar
                    </button>
                </div>
            ) : (
                <div className="game-content">
                    <p className="game-subtitle">
                        Turno de: <span>{gameData.currentPlayer.name}</span>
                    </p>
                    <p className="game-subtitle">
                        Intentos: <span>{gameData.currentPlayer.attempts}</span>
                    </p>
                    <div className="game-input-section">
                        <input
                            type="number"
                            value={guess}
                            onChange={(e) => setGuess(e.target.value)}
                            placeholder="Tu número"
                            className="input-field"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleGuess();
                            }}
                        />
                        <button
                            onClick={handleGuess}
                            disabled={isLoading}
                            className="game-button"
                        >
                            <ArrowRight className="icon" />
                            Adivinar
                        </button>
                    </div>
                    {message && (
                        <p className={`message ${
                            message.includes('Correcto') || message.includes('ganador')
                                ? 'message-correct'
                                : 'message-incorrect'
                        }`}>
                            {message}
                        </p>
                    )}
                </div>
            )}
            <ResumenJuegoModal
                isOpen={showSummary}
                onClose={() => {
                    setShowSummary(false);
                    onRestart();
                }}
                summaryData={summaryData}
            />
        </div>
    );
}

// Componente para la pantalla de historial
function HistoryScreen({ history }) {
    const formatTime = (milliseconds) => {
        const seconds = Math.floor(milliseconds / 1000);
        const ms = milliseconds % 1000;
        return `${seconds}.${ms.toString().padStart(3, '0')}s`;
    };

    return (
        <div className="history-container">
            <h2 className="history-title">Historial de Partidas</h2>
            <div className="table-container">
                <table className="history-table">
                    <thead>
                        <tr>
                            <th>Partida #</th>
                            <th>Jugador 1</th>
                            <th>Intentos J1</th>
                            <th>Tiempo J1</th>
                            <th>Jugador 2</th>
                            <th>Intentos J2</th>
                            <th>Tiempo J2</th>
                            <th>Resultado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.map((game) => (
                            <tr key={game.ID_Juego}>
                                <td>{game.ID_Juego}</td>
                                <td>{game.Jugador1}</td>
                                <td>{game.Intentos_Totalj1}</td>
                                <td>{formatTime(game.Tiempo_Totalj1)}</td>
                                <td>{game.Jugador2}</td>
                                <td>{game.Intentos_Totalj2}</td>
                                <td>{formatTime(game.Tiempo_Totalj2)}</td>
                                <td>
                                    {game.Ganador ? 
                                        <span className="winner">{game.Ganador}</span> : 
                                        <span className="draw">Empate</span>
                                    }
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
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
                body: JSON.stringify({ player_id: playerId, guess }),
            });
            const data = await response.json();
            if (response.ok) {
                setGameData({
                    ...gameData,
                    currentPlayer: data.currentPlayer,
                    message: data.message,
                    status: data.status,
                    winnerName: data.winner,
                    players: data.players || gameData.players,
                    times: data.times,
                    secretNumber: data.secretNumber
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
        <div className="app-container">
            <header className="app-header">
                <button
                    onClick={() => setView('welcome')}
                    className="header-button"
                >
                    <Play className="icon" />
                    Jugar
                </button>
                <button
                    onClick={() => setView('history')}
                    className="header-button"
                >
                    <History className="icon" />
                    Historial
                </button>
            </header>
            <main className="app-main">
                {renderView()}
            </main>
        </div>
    );
}

