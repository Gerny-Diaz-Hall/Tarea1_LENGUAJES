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

// Ruta para iniciar una nueva partida - VERSIÓN CORREGIDA
router.post('/games/start', async (req, res) => {
    try {
        const { player1, player2 } = req.body;
        console.log('Datos recibidos:', { player1, player2 });

        if (!player1 || !player2) {
            return res.status(400).send('Se requieren ambos nombres de jugadores.');
        }

        const request1a = new sql.Request();
        await request1a.query`
            MERGE INTO Jugadores AS T
            USING (VALUES (${player1})) AS S(nombre)
            ON T.nombre = S.nombre
            WHEN NOT MATCHED THEN INSERT (nombre) VALUES (S.nombre);
        `;
        const request1b = new sql.Request();
        const result1 = await request1b.query`
            SELECT ID_Jugador FROM Jugadores WHERE nombre = ${player1};
        `;
        if (!result1.recordset || result1.recordset.length === 0) {
            return res.status(500).send('Error al insertar o encontrar el jugador 1.');
        }
        const player1Id = result1.recordset[0].ID_Jugador;

        // Para player2
        const request2a = new sql.Request();
        await request2a.query`
            MERGE INTO Jugadores AS T
            USING (VALUES (${player2})) AS S(nombre)
            ON T.nombre = S.nombre
            WHEN NOT MATCHED THEN INSERT (nombre) VALUES (S.nombre);
        `;
        const request2b = new sql.Request();
        const result2 = await request2b.query`
            SELECT ID_Jugador FROM Jugadores WHERE nombre = ${player2};
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
        const secretNumber = generateSecretNumber(1, 100); // Un solo número secreto para ambos

        await sql.query`
            INSERT INTO Rondas (JuegoID, JugadorID, Numero, intentos, Tiempo_Tomado)
            VALUES (${gameId}, ${player1Id}, ${secretNumber}, 0, 0),
                   (${gameId}, ${player2Id}, ${secretNumber}, 0, 0);
        `;

        activeGames[gameId] = {
            player1: { id: player1Id, name: player1, attempts: 0, time: 0, turnStartTime: null },
            player2: { id: player2Id, name: player2, attempts: 0, time: 0, turnStartTime: null },
            currentPlayerId: player1Id,
            secretNumber: secretNumber // Guardamos el número secreto en el objeto del juego
        };

        res.status(201).json({
            gameId: gameId,
            players: [
                { id: player1Id, name: player1, attempts: 0 },
                { id: player2Id, name: player2, attempts: 0 }
            ],
            currentPlayer: { id: player1Id, name: player1, attempts: 0 },
            message: '¡El juego ha comenzado! El número secreto ha sido generado.',
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

        // Si es el primer intento del turno, registra el tiempo inicial
        if (!currentPlayer.turnStartTime) {
            currentPlayer.turnStartTime = Date.now();
        }

        // Calcula el tiempo transcurrido en este turno
        const turnTime = (Date.now() - currentPlayer.turnStartTime); // Convertir a segundos
        currentPlayer.time += turnTime; // Acumula el tiempo total del jugador

        if (currentPlayer.attempts >= 3) {
            return res.status(403).json({ message: 'Ya agotaste tus 3 intentos.' });
        }

        if (game.currentPlayerId != player_id) {
            return res.status(403).json({ message: 'No es tu turno.' });
        }

        currentPlayer.attempts++;

        let message;
        let finished = false;
        let winnerId = null;

        if (guessNumber === game.secretNumber) {
            message = `¡Correcto! Has adivinado el número secreto (${game.secretNumber}).`;
            finished = true;
            winnerId = currentPlayer.id;
        } else if (guessNumber > game.secretNumber) {
            message = 'Demasiado alto. Intenta un número más bajo.';
        } else {
            message = 'Demasiado bajo. Intenta un número más alto.';
        }

        if (finished || (game.player1.attempts >= 3 && game.player2.attempts >= 3)) {
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
                message: finished ? message : `Nadie adivinó el número secreto (${game.secretNumber}). Fin del juego.`,
                status: 'finished',
                winner: finished ? currentPlayer.name : null,
                secretNumber: game.secretNumber,
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

        // Reinicia el tiempo inicial para el siguiente turno
        currentPlayer.turnStartTime = null;
        opponent.turnStartTime = Date.now();
        game.currentPlayerId = opponent.id;

        return res.status(200).json({
            message: `${message} Te quedan ${3 - currentPlayer.attempts} intentos. Ahora es turno de ${opponent.name}.`,
            status: 'in-progress',
            currentPlayer: { 
                id: opponent.id, 
                name: opponent.name, 
                attempts: opponent.attempts,
                time: Math.round(opponent.time)
            }
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
