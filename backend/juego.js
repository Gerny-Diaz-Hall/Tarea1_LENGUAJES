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

        const player1SecretNumber = generateSecretNumber(1, 100);
        const player2SecretNumber = generateSecretNumber(1, 100);

        await sql.query`
            INSERT INTO Rondas (JuegoID, JugadorID, Numero, intentos, Tiempo_Tomado)
            VALUES (${gameId}, ${player1Id}, ${player1SecretNumber}, 0, 0),
                   (${gameId}, ${player2Id}, ${player2SecretNumber}, 0, 0);
        `;

        activeGames[gameId] = {
            player1: { id: player1Id, name: player1, secret: player1SecretNumber, attempts: 0, time: 0 },
            player2: { id: player2Id, name: player2, secret: player2SecretNumber, attempts: 0, time: 0 },
            currentPlayerId: player1Id
        };

        res.status(201).json({
            gameId: gameId,
            players: [
                { id: player1Id, name: player1, attempts: 0 },
                { id: player2Id, name: player2, attempts: 0 }
            ],
            currentPlayer: { id: player1Id, name: player1, attempts: 0 },
            message: '¡El juego ha comenzado!',
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
        
        // Verificar si la partida existe en memoria
        const game = activeGames[gameId];
        if (!game) {
            return res.status(404).send('Partida no encontrada.');
        }

        // Identificar al jugador actual y su oponente
        const currentPlayer = (game.player1.id == player_id) ? game.player1 : game.player2;
        const opponent = (game.player1.id == player_id) ? game.player2 : game.player1;

        // Aumentar el contador de intentos del jugador
        currentPlayer.attempts++;
        
        let message;

        if (guess === opponent.secret) {
            message = `¡Correcto! ¡Has adivinado el número secreto de tu oponente!`;
            
            // Lógica para terminar la partida y declarar un ganador
            const winnerId = currentPlayer.id;
            const winnerName = currentPlayer.name;

            // Actualizar los intentos y el ganador en la base de datos
            await sql.query`
                UPDATE Juegos
                SET 
                    Intentos_Totalj1 = ${game.player1.attempts},
                    Intentos_Totalj2 = ${game.player2.attempts},
                    ID_Ganador = ${winnerId}
                WHERE ID_Juego = ${gameId};
            `;
            
            // Eliminar el juego de la memoria
            delete activeGames[gameId];
            
            return res.status(200).json({ message, status: 'finished', winner: winnerName });
        } else if (guess > opponent.secret) {
            message = 'Demasiado alto. Intenta un número más bajo.';
        } else {
            message = 'Demasiado bajo. Intenta un número más alto.';
        }

        // Cambiar el turno al otro jugador
        game.currentPlayerId = opponent.id;
        
        res.status(200).json({ message, status: 'in-progress', currentPlayer: opponent });
        

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
