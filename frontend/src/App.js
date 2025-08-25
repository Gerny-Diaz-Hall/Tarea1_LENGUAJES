import React, { useState, useEffect } from 'react';
import { Play, History, ArrowRight } from 'lucide-react';
import ResumenJuegoModal from './ResumenJuegoModal';
import './App.css';

/**
 * @component WelcomeScreen
 * @description Muestra la pantalla de inicio donde los jugadores ingresan sus nombres.
 * @param {object} props - Propiedades del componente.
 * @param {function(string, string)} props.onStartGame - Función a la que se llama cuando se hace clic en "Iniciar Juego".
 */
function WelcomeScreen({ onStartGame }) {
    // Estado para almacenar el nombre del jugador 1.
    const [player1, setPlayer1] = useState('');
    // Estado para almacenar el nombre del jugador 2.
    const [player2, setPlayer2] = useState('');

    /**
     * @function handleStart
     * @description Valida que ambos nombres de jugador hayan sido ingresados y luego llama a la función onStartGame.
     */
    const handleStart = () => {
        if (player1 && player2) {
            onStartGame(player1, player2);
        } else {
            // Este error se muestra en la consola, podría mejorarse con un mensaje en la UI.
            console.error('Por favor, ingresa el nombre de ambos jugadores.');
        }
    };

    // Renderiza el formulario de inicio.
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

/**
 * @component GameScreen
 * @description Gestiona y renderiza la interfaz principal del juego, incluyendo turnos, intentos y resultados.
 * @param {object} props - Propiedades del componente.
 * @param {object} props.gameData - El objeto que contiene todo el estado actual del juego.
 * @param {function(number, number, number): Promise<object>} props.onMakeGuess - Función para enviar un intento al backend.
 * @param {function} props.onRestart - Función para volver a la pantalla de bienvenida.
 */
function GameScreen({ gameData, onMakeGuess, onRestart }) {
    // Estado para el número que el jugador está ingresando
    const [intento, setGuess] = useState('');
    // Estado para los mensajes de retroalimentación (ej. "Demasiado alto", "¡Correcto!")
    const [mensaje, setMessage] = useState('');
     // Estado para mostrar un indicador de carga mientras se procesa un intento
    const [isLoading, setIsLoading] = useState(false);
    // Estado para controlar la visibilidad del modal de resumen del juego
    const [showSummary, setShowSummary] = useState(false);
    // Estado para almacenar los datos que se mostrarán en el modal de resumen
    const [summaryData, setSummaryData] = useState(null);

    /**
     * @effect
     * @description Hook que se ejecuta cuando cambian las propiedades del juego (gameData).
     * Se encarga de:
     * 1. Preparar y mostrar el modal de resumen cuando el juego termina.
     * 2. Actualizar el mensaje mostrado en la pantalla con la última respuesta del servidor.
     */
    useEffect(() => {
        // Si el estado del juego es 'terminado', prepara los datos para el modal de resumen.
        if (gameData?.status === 'terminado' && !showSummary) {
            if (gameData.players && gameData.players.length >= 2 && gameData.secretNumbers) {
                setSummaryData({
                    player1: {
                        name: gameData.players[0].name,
                        attempts: gameData.players[0].attempts || 0,
                        tiempo: gameData.tiempos?.player1 || 0,
                        historialRondas: gameData.players[0].historialRonda || []
                    },
                    player2: {
                        name: gameData.players[1].name,
                        attempts: gameData.players[1].attempts || 0,
                        tiempo: gameData.tiempos?.player2 || 0,
                        historialRondas: gameData.players[1].historialRonda || []
                    },
                    winner: gameData.winner,
                    secretNumbers: gameData.secretNumbers // Asegurar que esto es un objeto con player1 y player2
                });
                setShowSummary(true);
            } else {
                console.error('Datos del juego incompletos:', gameData);
            }
        }

        // Actualiza el mensaje de la UI con el mensaje que viene del backend.
        if (gameData?.mensaje) {
            setMessage(gameData.mensaje);
        }
        // Se vuelve a ejecutar si alguna de estas dependencias cambia.
    }, [
        gameData,
        gameData?.status,
        gameData?.mensaje,
        gameData?.players,
        gameData?.secretNumbers,
        gameData?.tiempos?.player1,
        gameData?.tiempos?.player2,
        gameData?.winner,
        showSummary
    ]);

    /**
     * @function handleGuess
     * @description Valida la entrada del usuario y llama a la función onMakeGuess para enviar el intento.
     */
    const handleGuess = async () => {
        // Validación de que el campo no esté vacío.
        if (!intento) {
            setMessage('Por favor, ingresa un número.');
            return;
        }

        const guessValue = parseInt(intento);
        // Validación de que sea un número válido entre 1 y 100.
        if (isNaN(guessValue) || guessValue < 1 || guessValue > 100) {
            setMessage('Por favor, ingresa un número válido entre 1 y 100.');
            return;
        }

        setIsLoading(true);// Activa el estado de carga.

        try {
            // Llama a la función del componente padre para comunicarse con el API.
            const response = await onMakeGuess(
                gameData.juegoId, 
                gameData.jugadorActual.id, 
                guessValue
            );

            // Procesa la respuesta del API.
            if (response?.mensaje) {
                setMessage(response.mensaje);
                setGuess(''); // Limpia el campo de entrada si el intento fue exitoso.
            } else {
                setMessage('Error al procesar el intento. Intenta de nuevo.');
            }
        } catch (error) {
            console.error('Error en el intento:', error);
            setMessage('Error de conexión. Intenta de nuevo.');
        } finally {
            setIsLoading(false);// Desactiva el estado de carga.
        }
    };

    // Banderas booleanas para facilitar la renderización condicional.
    const isFinished = gameData?.status === 'terminado';
    const isWaitingForGame = gameData?.juegoTerminandose || (gameData?.jugadorActual?.id === null);

    // Renderiza la pantalla del juego con diferentes vistas según el estado actual.
    return (
        <div className="game-container">
            <h2 className="game-title">¡Adivina el Número!</h2>
            {isFinished ? (
                // --- Vista 1: El juego ha terminado ---
                <div className="end-container">
                    <p className={`mensaje ${mensaje.includes('Correcto') ? 'mensaje-correct' : 'mensaje-incorrect'}`}>
                        {mensaje}
                    </p>
                    <p className="end-winner">
                        ¡El ganador es <span>{gameData.winner}</span>!
                    </p>
                    <button onClick={onRestart} className="button">
                        <Play className="icon" />
                        Volver a Jugar
                    </button>
                </div>
            ) : isWaitingForGame ? (
                // --- Vista 2: Esperando que el otro jugador termine ---
                <div className="game-content">
                    <div className="game-info">
                        <p className="game-subtitle">
                            Esperando a que termine el juego...
                        </p>
                    </div>
                    {mensaje && (
                        <p className={`mensaje ${
                            mensaje.includes('Correcto') || mensaje.includes('ganador')
                                ? 'mensaje-correct'
                                : 'mensaje-incorrect'
                        }`}>
                            {mensaje}
                        </p>
                    )}
                </div>
            ) : (
                // --- Vista 3: juego en curso ---
                <div className="game-content">
                    <div className="game-info">
                        <p className="game-round">
                            Ronda: <span>{gameData.jugadorActual.rondaActual}</span> de 3
                        </p>
                        <p className="game-subtitle">
                            Turno de: <span>{gameData.jugadorActual.name}</span>
                        </p>
                        <p className="game-subtitle">
                            Intentos: <span>{gameData.jugadorActual.attempts + 1}</span> de 3
                        </p>
                    </div>

                    <div className="game-input-section">
                        <input
                            type="number"
                            value={intento}
                            onChange={(e) => setGuess(e.target.value)}
                            className="game-input-field"
                            min="1"
                            max="100"
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

                    {mensaje && (
                        <p className={`mensaje ${
                            mensaje.includes('Correcto') || mensaje.includes('ganador')
                                ? 'mensaje-correct'
                                : 'mensaje-incorrect'
                        }`}>
                            {mensaje}
                        </p>
                    )}
                </div>
            )}
            {/* El modal de resumen siempre está en el DOM, pero su visibilidad se controla con `isOpen`. */}
            <ResumenJuegoModal
                isOpen={showSummary}
                onClose={() => {
                    setShowSummary(false);
                    onRestart(); // Al cerrar el modal, se reinicia el juego.
                }}
                summaryData={summaryData}
            />
        </div>
    );
}

/**
 * @component HistoryScreen
 * @description Muestra una tabla con el historial de todas las partidas jugadas.
 * @param {object} props - Propiedades del componente.
 * @param {Array<object>} props.history - Un arreglo de objetos, donde cada objeto es una partida del historial.
 */
function HistoryScreen({ history }) {
    
    const formatTime = (milliseconds) => {
        const seconds = Math.floor(milliseconds / 1000);
        const ms = milliseconds % 1000;
        return `${seconds}.${ms.toString().padStart(3, '0')}s`;
    };

    // Renderiza la tabla del historial
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
                        {/* Itera sobre el arreglo de historial para crear una fila por cada partida. */}
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

/**
 * @component App
 * @description Componente principal y raíz de la aplicación.
 * Gestiona el estado global, como la vista actual (bienvenida, juego, historial)
 * y los datos del juego y del historial. Contiene la lógica para comunicarse con el API.
 */
export default function App() {
    // Estado para controlar qué vista/pantalla se muestra ('welcome', 'game', 'history')
    const [view, setView] = useState('welcome');
    // Estado para almacenar los datos de la partida activa
    const [gameData, setGameData] = useState(null);
    // Estado para almacenar los datos del historial de partidas
    const [history, setHistory] = useState([]);
    // Estado de carga global para las llamadas al API
    const [isLoading, setIsLoading] = useState(false);

    /**
     * @effect
     * @description Se ejecuta cuando el estado 'view' cambia. Si la nueva vista es 'history',
     * llama a la función para obtener los datos del historial del servidor.
     */
    useEffect(() => {
        // Al cargar la vista de historial, obtenemos los datos
        if (view === 'history') {
            fetchHistory();
        }
    }, [view]);

    /**
     * @function startGame
     * @description Envía una solicitud al API para iniciar un nuevo juego.
     * @param {string} player1 - Nombre del jugador 1.
     * @param {string} player2 - Nombre del jugador 2.
     */
    const startGame = async (player1, player2) => {
        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:3000/api/game/inicio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ player1, player2 }),
            });
            const data = await response.json();
            if (response.ok) {
                setGameData(data); // Guarda los datos del nuevo juego.
                setView('game'); // Cambia a la vista del juego.
            } else {
                console.error('Error al iniciar el juego:', data.mensaje);
            }
        } catch (error) {
            console.error('Error de red:', error);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * @function makeGuess
     * @description Envía un intento de un jugador al API.
     * @param {number} juegoId - ID del juego actual.
     * @param {number} playerId - ID del jugador que hace el intento.
     * @param {number} intento - El número que el jugador adivina.
     * @returns {Promise<object>} La respuesta del servidor.
     */
    const makeGuess = async (juegoId, playerId, intento) => {
        setIsLoading(true);
        try {
            const response = await fetch(`http://localhost:3000/api/game/${juegoId}/intento`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ player_id: playerId, intento }),
            });
            const data = await response.json();
            if (response.ok) {
                // Actualiza el estado del juego con la nueva información recibida del backend.
                setGameData({
                    ...gameData,
                    jugadorActual: data.jugadorActual,
                    mensaje: data.mensaje,
                    status: data.status,
                    winner: data.winner,
                    players: data.players ? [
                        {
                            ...data.players[0],
                            historialRondas: data.players[0].historialRondas || []
                        },
                        {
                            ...data.players[1],
                            historialRondas: data.players[1].historialRondas || []
                        }
                    ] : gameData.players,
                    tiempos: data.tiempos,
                    secretNumbers: data.secretNumbers
                    });
                return data; // Devuelve los datos para que el componente hijo pueda usarlos
            } else {
                console.error('Error al hacer el intento:', data.mensaje);
                return { mensaje: data.mensaje || 'Error al hacer el intento' };
            }
        } catch (error) {
            console.error('Error de red:', error);
            return { mensaje: 'Error de conexión' };
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * @function fetchHistory
     * @description Obtiene el historial de partidas del API.
     */
    const fetchHistory = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:3000/api/game/historial');
            const data = await response.json();
            if (response.ok) {
                setHistory(data); // Guarda los datos del historial en el estado
            } else {
                console.error('Error al obtener el historial:', data.mensaje);
            }
        } catch (error) {
            console.error('Error de red:', error);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * @function renderView
     * @description Determina qué componente/pantalla renderizar basado en el estado 'view'.
     * @returns {JSX.Element} El componente a renderizar.
     */
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

    // Renderiza la estructura principal de la aplicación.
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
