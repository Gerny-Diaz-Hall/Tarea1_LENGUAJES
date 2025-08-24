import React from 'react';

function ResumenJuegoModal({ isOpen, onClose, summaryData }) {
    if (!isOpen || !summaryData) return null;

    const formatTime = (milliseconds) => {
        const seconds = Math.floor(milliseconds / 1000);
        const ms = milliseconds % 1000;
        return `${seconds}.${ms.toString().padStart(3, '0')}s`;
    };

    const determineWinnerByTime = () => {
        const time1 = summaryData.player1.time;
        const time2 = summaryData.player2.time;
        
        if (time1 < time2) {
            return {
                name: summaryData.player1.name,
                time: time1,
                opponentTime: time2
            };
        } else {
            return {
                name: summaryData.player2.name,
                time: time2,
                opponentTime: time1
            };
        }
    };

    const renderResult = () => {
        if (summaryData.winner) {
            return (
                <p className="winner-text">
                    ¡{summaryData.winner} ha ganado adivinando el número!
                </p>
            );
        } else {
            const timeWinner = determineWinnerByTime();
            return (
                <p className="winner-text">
                    ¡{timeWinner.name} gana por menor tiempo!
                    <br />
                    <span className="time-detail">
                        ({formatTime(timeWinner.time)} vs {formatTime(timeWinner.opponentTime)})
                    </span>
                </p>
            );
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2 className="modal-title">¡Partida Finalizada!</h2>
                
                <div className="modal-players">
                    <div className="modal-player">
                        <h3>{summaryData.player1.name}</h3>
                        <p>Intentos: {summaryData.player1.attempts}</p>
                        <p>Tiempo: {formatTime(summaryData.player1.time)}</p>
                    </div>
                    
                    <div className="modal-player">
                        <h3>{summaryData.player2.name}</h3>
                        <p>Intentos: {summaryData.player2.attempts}</p>
                        <p>Tiempo: {formatTime(summaryData.player2.time)}</p>
                    </div>
                </div>

                <div className="modal-result">
                    {renderResult()}
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