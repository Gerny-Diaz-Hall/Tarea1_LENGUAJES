function ResumenJuegoModal({ isOpen, onClose, summaryData }) {
    if (!isOpen || !summaryData) return null;

    const formatTime = (milliseconds) => {
        if (!milliseconds) return '0.000s';
        const seconds = Math.floor(milliseconds / 1000);
        const ms = milliseconds % 1000;
        return `${seconds}.${ms.toString().padStart(3, '0')}s`;
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2 className="modal-title">¡Partida Finalizada!</h2>
                
                <div className="modal-players">
                    <div className="modal-player">
                        <h3>{summaryData.player1.name}</h3>
                        <p>Intentos: <span>{summaryData.player1.attempts}</span></p>
                        <p>Tiempo: <span>{formatTime(summaryData.player1.time)}</span></p>
                    </div>
                    
                    <div className="modal-player">
                        <h3>{summaryData.player2.name}</h3>
                        <p>Intentos: <span>{summaryData.player2.attempts}</span></p>
                        <p>Tiempo: <span>{formatTime(summaryData.player2.time)}</span></p>
                    </div>
                </div>

                <div className="modal-result">
                    {summaryData.winner ? (
                        <p className="winner-text">
                            ¡{summaryData.winner} ha ganado!
                        </p>
                    ) : (
                        <p className="draw-text">
                            ¡Empate! Nadie adivinó el número
                        </p>
                    )}
                    <p className="secret-number">
                        El número secreto era: {summaryData.secretNumber}
                    </p>
                </div>

                <button onClick={onClose} className="modal-button">
                    Volver a Jugar
                </button>
            </div>
        </div>
    );
}

export default ResumenJuegoModal;