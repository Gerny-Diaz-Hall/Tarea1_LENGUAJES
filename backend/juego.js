// Este archivo contiene toda la lógica de las rutas API para el juego.
const express = require('express');
const sql = require('mssql');
const router = express.Router();

// Objeto para almacenar la información de los juegos en memoria (para la lógica)
// Esto es temporal. La lógica final debería usar solo la base de datos.
const activeGames = {};

/**
 * Genera un número aleatorio entre un mínimo y un máximo.
 * @param {number} min - El valor mínimo.
 * @param {number} max - El valor máximo.
 * @returns {number} El número aleatorio generado.
 */
function generateSecretNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
const assignRandomPlayers = (player1, player2) => {
    if (Math.random() < 0.5) {
        return { firstPlayer: player1, secondPlayer: player2 };
    }
    return { firstPlayer: player2, secondPlayer: player1 };
};

// Ruta para iniciar una nueva partida - VERSIÓN CORREGIDA
router.post('/games/start', async (req, res) => {
    try {
        const { player1, player2 } = req.body;
        const { firstPlayer, secondPlayer } = assignRandomPlayers(player1, player2);
        console.log('Datos recibidos:', { player1, player2 });

        if (!player1 || !player2) {
            return res.status(400).send('Se requieren ambos nombres de jugadores.');
        }

        const request1a = new sql.Request();
        await request1a.query`
            MERGE INTO Jugadores AS T
            USING (VALUES (${firstPlayer})) AS S(nombre)
            ON T.nombre = S.nombre
            WHEN NOT MATCHED THEN INSERT (nombre) VALUES (S.nombre);
        `;
        const request1b = new sql.Request();
        const result1 = await request1b.query`
            SELECT ID_Jugador FROM Jugadores WHERE nombre = ${firstPlayer};
        `;
        if (!result1.recordset || result1.recordset.length === 0) {
            return res.status(500).send('Error al insertar o encontrar el jugador 1.');
        }
        const player1Id = result1.recordset[0].ID_Jugador;

        const request2a = new sql.Request();
        await request2a.query`
            MERGE INTO Jugadores AS T
            USING (VALUES (${secondPlayer})) AS S(nombre)
            ON T.nombre = S.nombre
            WHEN NOT MATCHED THEN INSERT (nombre) VALUES (S.nombre);
        `;
        const request2b = new sql.Request();
        const result2 = await request2b.query`
            SELECT ID_Jugador FROM Jugadores WHERE nombre = ${secondPlayer};
        `;
        if (!result2.recordset || result2.recordset.length === 0) {
            return res.status(500).send('Error al insertar o encontrar el jugador 2.');
        }
        const player2Id = result2.recordset[0].ID_Jugador;

        const gameResult = await sql.query`
            INSERT INTO Juegos (ID_Jugador1, ID_Jugador2)
            OUTPUT inserted.ID_Juego
            VALUES (${player1Id}, ${player2Id});
        `;
        console.log('Resultado del juego:', gameResult.recordset);

        const gameId = gameResult.recordset[0].ID_Juego;

        // Generar números secretos diferentes para cada jugador
        const secretNumber1 = generateSecretNumber(1, 100);
        const secretNumber2 = generateSecretNumber(1, 100);

        await sql.query`
            INSERT INTO Rondas (JuegoID, JugadorID, Numero, intentos, Tiempo_Tomado)
            VALUES (${gameId}, ${player1Id}, ${secretNumber1}, 0, 0),
                   (${gameId}, ${player2Id}, ${secretNumber2}, 0, 0);
        `;

        activeGames[gameId] = {
            player1: { 
                id: player1Id, 
                name: firstPlayer, 
                attempts: 0, 
                time: 0,
                turnStartTime: null,
                secretNumber: secretNumber1,
                roundsCompleted: 0
            },
            player2: { 
                id: player2Id, 
                name: secondPlayer, 
                attempts: 0, 
                time: 0,
                turnStartTime: null,
                secretNumber: secretNumber2,
                roundsCompleted: 0
            },
            currentPlayerId: player1Id,
            currentRound: 1,
            totalRounds: 6,
            roundHistory: []
        };

        res.status(201).json({
            gameId: gameId,
            players: [
                { id: player1Id, name: firstPlayer, attempts: 0 },
                { id: player2Id, name: secondPlayer, attempts: 0 }
            ],
            currentPlayer: { id: player1Id, name: firstPlayer, attempts: 0 },
            currentRound: 1,
            message: '¡El juego ha comenzado! Los números secretos han sido generados.',
            status: 'in-progress'
        });

    } catch (err) {
        console.error('Error al iniciar el juego:', err);
        res.status(500).send('Error interno del servidor: ' + err.message);
    }
});

// Ruta para manejar un intento de adivinanza
router.post('/games/:gameId/guess', async (req, res) => {
    try {
        const { gameId } = req.params;
        const { player_id, guess } = req.body;
        const guessNumber = parseInt(guess);

        const game = activeGames[gameId];
        if (!game) {
            return res.status(404).send('Partida no encontrada.');
        }

        const currentPlayer = (game.player1.id == player_id) ? game.player1 : game.player2;
        const opponent = (game.player1.id == player_id) ? game.player2 : game.player1;

        if (currentPlayer.attempts >= 3) {
            return res.status(403).json({ message: 'Ya agotaste tus 3 intentos en esta ronda.' });
        }

        if (game.currentPlayerId != player_id) {
            return res.status(403).json({ message: 'No es tu turno.' });
        }

        // Registrar el tiempo inicial si es el primer intento
        if (!currentPlayer.turnStartTime) {
            currentPlayer.turnStartTime = Date.now();
        }

        currentPlayer.attempts++;
        let message;
        let finished = false;
        let winnerId = null;
        let winnerName = null;

        // Verificar el intento contra el número secreto del oponente
        if (guessNumber === opponent.secretNumber) {
            message = `¡Correcto! Has adivinado el número secreto (${opponent.secretNumber}).`;
            currentPlayer.roundsCompleted++;
        } else {
            message = guessNumber > opponent.secretNumber 
                ? 'Demasiado alto. Intenta un número más bajo.' 
                : 'Demasiado bajo. Intenta un número más alto.';
            // Si agotó los intentos sin adivinar, también se completa la ronda
            if (currentPlayer.attempts >= 3) {
                currentPlayer.roundsCompleted++;
            }
        }

        // Calcular el tiempo de este turno si el jugador adivinó o agotó intentos
        if (guessNumber === opponent.secretNumber || currentPlayer.attempts >= 3) {
            const turnTime = Date.now() - currentPlayer.turnStartTime;
            currentPlayer.time += turnTime;
            currentPlayer.turnStartTime = null;
        }

        // Verificar si ambos jugadores han completado sus 3 rondas
        if (game.player1.roundsCompleted >= 3 && game.player2.roundsCompleted >= 3) {
            finished = true;
            // Determinar el ganador por intentos totales
            if (game.player1.attempts !== game.player2.attempts) {
                winnerId = game.player1.attempts < game.player2.attempts ? game.player1.id : game.player2.id;
                winnerName = game.player1.attempts < game.player2.attempts ? game.player1.name : game.player2.name;
            } else {
                // Desempate por tiempo total
                winnerId = game.player1.time < game.player2.time ? game.player1.id : game.player2.id;
                winnerName = game.player1.time < game.player2.time ? game.player1.name : game.player2.name;
            }
        }

        // Si el jugador actual agotó sus intentos o adivinó, pasar al siguiente turno
        if (currentPlayer.attempts >= 3 || guessNumber === opponent.secretNumber) {
            game.currentPlayerId = opponent.id;
            game.currentRound++;
            opponent.attempts = 0; // Reiniciar intentos para el próximo turno del oponente
            opponent.turnStartTime = null; // Asegurar que el oponente inicie su tiempo al comenzar su turno
        }

        if (finished) {
            await sql.query`
                UPDATE Juegos
                SET 
                    Intentos_Totalj1 = ${game.player1.attempts},
                    Intentos_Totalj2 = ${game.player2.attempts},
                    Tiempo_Totalj1 = ${game.player1.time},
                    Tiempo_Totalj2 = ${game.player2.time},
                    ID_Ganador = ${winnerId}
                WHERE ID_Juego = ${gameId};
            `;
            delete activeGames[gameId];
            return res.status(200).json({
                message: message,
                status: 'finished',
                winner: winnerName,
                secretNumber: opponent.secretNumber,
                players: [
                    {
                        name: game.player1.name,
                        attempts: game.player1.attempts,
                        time: game.player1.time
                    },
                    {
                        name: game.player2.name,
                        attempts: game.player2.attempts,
                        time: game.player2.time
                    }
                ],
                times: {
                    player1: game.player1.time,
                    player2: game.player2.time
                }
            });
        }

        return res.status(200).json({
            message: message,
            status: 'in-progress',
            currentPlayer: {
                id: game.currentPlayerId,
                name: game.currentPlayerId === game.player1.id ? game.player1.name : game.player2.name,
                attempts: currentPlayer.attempts
            },
            currentRound: game.currentRound
        });

    } catch (err) {
        console.error('Error al manejar el intento:', err);
        res.status(500).send('Error interno del servidor.');
    }
});

// Ruta para obtener el historial de partidas
router.get('/games/history', async (req, res) => {
    try {
        const result = await sql.query`
            SELECT 
                j.ID_Juego,
                p1.nombre AS Jugador1,
                p2.nombre AS Jugador2,
                pg.nombre AS Ganador,
                j.Intentos_Totalj1,
                j.Intentos_Totalj2,
                j.Tiempo_Totalj1,
                j.Tiempo_Totalj2
            FROM Juegos j
            INNER JOIN Jugadores p1 ON j.ID_Jugador1 = p1.ID_Jugador
            INNER JOIN Jugadores p2 ON j.ID_Jugador2 = p2.ID_Jugador
            LEFT JOIN Jugadores pg ON j.ID_Ganador = pg.ID_Jugador
            ORDER BY j.ID_Juego DESC;
        `;
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error('Error al obtener el historial:', err);
        res.status(500).send('Error interno del servidor.');
    }
});

module.exports = router;
