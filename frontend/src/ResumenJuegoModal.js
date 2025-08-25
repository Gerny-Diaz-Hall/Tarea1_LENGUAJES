import React from 'react';

/**
 * @component ResumenJuegoModal
 * @description Un componente de modal (ventana emergente) que muestra un resumen detallado al finalizar una partida.
 * @param {object} props - Propiedades del componente.
 * @param {boolean} props.isOpen - Controla si el modal está visible o no.
 * @param {function} props.onClose - La función que se ejecuta cuando se cierra el modal (generalmente al hacer clic en el botón).
 * @param {object} props.summaryData - Un objeto que contiene todos los datos necesarios para el resumen del juego.
 */
function ResumenJuegoModal({ isOpen, onClose, summaryData }) {
    // Es una "guarda": si el modal no debe estar abierto o si los datos necesarios no están disponibles,
    // el componente no renderiza nada (devuelve null).
    if (!isOpen || !summaryData || !summaryData.player1 || !summaryData.player2 || !summaryData.secretNumbers) {
        return null;
    }

    /**
     * @function formatTime
     * @description Convierte milisegundos a un formato de string "segundos.milisegundos".
     * @param {number} milliseconds - El tiempo total en milisegundos.
     * @returns {string} El tiempo formateado como texto.
     */
    const formatTime = (milliseconds) => {
        const seconds = Math.floor(milliseconds / 1000);
        const ms = milliseconds % 1000;
        // padStart asegura que los milisegundos siempre tengan 3 dígitos (ej. 45 se convierte en "045").
        return `${seconds}.${ms.toString().padStart(3, '0')}s`;
    };

    /**
     * @function determineWinner
     * @description Aplica la lógica del juego para determinar el nombre del ganador.
     * Criterio 1: Menor número de intentos.
     * Criterio 2 (desempate): Menor tiempo total.
     * @returns {string} El nombre del jugador ganador.
     */
    const determineWinner = () => {
        const player1 = summaryData.player1;
        const player2 = summaryData.player2;
        
        // Compara primero por intentos.
        if (player1.attempts !== player2.attempts) {
            return player1.attempts < player2.attempts ? player1.name : player2.name;
        } else {
            // Si hay empate en intentos, compara por tiempo.
            return player1.tiempo < player2.tiempo ? player1.name : player2.name;
        }
    };

    /**
     * @function renderResult
     * @description Genera el elemento JSX que anuncia al ganador y la razón de su victoria.
     * @returns {JSX.Element} Un párrafo de texto con el resultado.
     */
    const renderResult = () => {
        const winner = determineWinner();
        const player1 = summaryData.player1;
        const player2 = summaryData.player2;

        // Muestra un mensaje diferente si se ganó por intentos...
        if (player1.attempts !== player2.attempts) {
            return (
                <p className="winner-text">
                    ¡{winner} ha ganado por menor cantidad de intentos!
                </p>
            );
        } else {
            // ...o si se ganó por tiempo como desempate.
            return (
                <p className="winner-text">
                    ¡{winner} gana por menor tiempo!
                    <br />
                    <span className="tiempo-detail">
                        ({formatTime(player1.tiempo)} vs {formatTime(player2.tiempo)})
                    </span>
                </p>
            );
        }
    };

    // Renderiza la estructura visual del modal.
    return (
        // La capa oscura que cubre toda la pantalla.
        <div className="modal-overlay">
            {/* El contenedor principal del contenido del modal. */}
            <div className="modal-content">
                <h2 className="modal-title">¡Partida Finalizada!</h2>
                
                 {/* Sección que muestra las estadísticas de ambos jugadores en columnas. */}
                <div className="modal-players">
                    {/* Columna para el Jugador 1. */}
                    <div className="modal-player">
                        <h3>{summaryData.player1.name}</h3>
                        {/* Mapea el historial de rondas para mostrar los intentos en cada una. */}
                        {summaryData.player1.historialRondas && summaryData.player1.historialRondas.map((attempts, index) => (
                            <p key={index}>Ronda {index + 1}: Intentos: {attempts}</p>
                        ))}
                        <p>Intentos totales: {summaryData.player1.attempts}</p>
                        <p>Tiempo total: {formatTime(summaryData.player1.tiempo)}</p>
                    </div>
                    
                    {/* Columna para el Jugador 2. */}
                    <div className="modal-player">
                        <h3>{summaryData.player2.name}</h3>
                        {/* Mapea el historial de rondas para mostrar los intentos en cada una. */}
                        {summaryData.player2.historialRondas && summaryData.player2.historialRondas.map((attempts, index) => (
                            <p key={index}>Ronda {index + 1}: Intentos: {attempts}</p>
                        ))}
                        <p>Intentos totales: {summaryData.player2.attempts}</p>
                        <p>Tiempo total: {formatTime(summaryData.player2.tiempo)}</p>
                    </div>
                </div>

                {/* Sección que muestra el resultado final y los números secretos. */}
                <div className="modal-result">
                    {renderResult()} {/* Inserta el mensaje del ganador. */}
                    <p className="secret-number">
                        El número secreto para {summaryData.player1.name} era: {summaryData.secretNumbers.player1}
                    </p>
                    <p className="secret-number">
                        El número secreto para {summaryData.player2.name} era: {summaryData.secretNumbers.player2}
                    </p>
                </div>

                <button onClick={onClose} className="modal-button">
                    Volver a Jugar
                </button>
            </div>
        </div>
    );
}

// Exporta el componente para que pueda ser utilizado en otros archivos.
export default ResumenJuegoModal;