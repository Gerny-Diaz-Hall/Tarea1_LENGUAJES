// Este archivo contiene toda la lógica de las rutas API para el juego
const express = require('express');
const sql = require('mssql');
const router = express.Router();

// Objeto para almacenar la información de los juegos en memoria (para la lógica)
// Esto es temporal. La lógica final debería usar solo la base de datos
const partidasActivas = {};

/**
 * Genera un número aleatorio entre un mínimo y un máximo
 * @param {number} min - El valor mínimo
 * @param {number} max - El valor máximo
 * @returns {number} El número aleatorio generado
 */

//Genero un numero secreto entre 1 y 100
function generarNumeroSecreto(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
// Aqui lo que hago es asignar aleatoriamente los jugadores
// 50% de probabilidad para cada jugador
const asignarJugadoresAleatorios = (player1, player2) => {
    if (Math.random() < 0.5) {
        return { primerJugador: player1, segundoJugador: player2 };
    }
    return { primerJugador: player2, segundoJugador: player1 };
};

/**
 * @method POST /game/inicio
 * @description Crea e inicializa una nueva partida
 * Se encarga de:
 * 1. Asignar aleatoriamente el orden de los jugadores
 * 2. Registrar a los jugadores en la base de datos si no existen
 * 3. Crear un nuevo registro de juego en la tabla 'Juegos'
 * 4. Generar números secretos para cada jugador y guardarlos
 * 5. Crear el estado inicial del juego en memoria (`partidasActivas`)
 * 6. Devolver el ID del juego y el estado inicial al cliente
 */
router.post('/game/inicio', async (req, res) => {
    try {
        // Extrae los nombres de los jugadores del cuerpo de la solicitud
        const { player1, player2 } = req.body;
        // Decide aleatoriamente quién empieza.
        const { primerJugador, segundoJugador } = asignarJugadoresAleatorios(player1, player2);
        console.log('Datos recibidos:', { player1, player2 });

        // Valida que se hayan proporcionado ambos nombres de jugadores
        if (!player1 || !player2) {
            return res.status(400).send('Se requieren ambos nombres de jugadores.');
        }

        // --- Registro del Jugador 1 ---
        const request1a = new sql.Request();
        // Se usa MERGE para insertar el jugador si no existe, evitando duplicados
        await request1a.query`
            MERGE INTO Jugadores AS T
            USING (VALUES (${primerJugador})) AS S(nombre)
            ON T.nombre = S.nombre
            WHEN NOT MATCHED THEN INSERT (nombre) VALUES (S.nombre);
        `;
        const request1b = new sql.Request();
        // Obtiene el ID del jugador 1 (ya sea el existente o el recién creado)
        const result1 = await request1b.query`
            SELECT ID_Jugador FROM Jugadores WHERE nombre = ${primerJugador};
        `;
        if (!result1.recordset || result1.recordset.length === 0) {
            return res.status(500).send('Error al insertar o encontrar el jugador 1.');
        }
        const player1Id = result1.recordset[0].ID_Jugador;

        // --- Registro del Jugador 2 (mismo proceso) ---
        const request2a = new sql.Request();
        await request2a.query`
            MERGE INTO Jugadores AS T
            USING (VALUES (${segundoJugador})) AS S(nombre)
            ON T.nombre = S.nombre
            WHEN NOT MATCHED THEN INSERT (nombre) VALUES (S.nombre);
        `;
        const request2b = new sql.Request();
        const result2 = await request2b.query`
            SELECT ID_Jugador FROM Jugadores WHERE nombre = ${segundoJugador};
        `;
        if (!result2.recordset || result2.recordset.length === 0) {
            return res.status(500).send('Error al insertar o encontrar el jugador 2.');
        }
        const player2Id = result2.recordset[0].ID_Jugador;

        // Crea el registro del juego en la base de datos
        const gameResult = await sql.query`
            INSERT INTO Juegos (ID_Jugador1, ID_Jugador2)
            OUTPUT inserted.ID_Juego
            VALUES (${player1Id}, ${player2Id});
        `;
        console.log('Resultado del juego:', gameResult.recordset);

        const juegoId = gameResult.recordset[0].ID_Juego;

        // Generar números secretos diferentes para cada jugador
        const numeroSecreto1 = generarNumeroSecreto(1, 100);
        const numeroSecreto2 = generarNumeroSecreto(1, 100);

        // Guarda los números secretos y la configuración inicial de la ronda en la BD
        await sql.query`
            INSERT INTO Rondas (JuegoID, JugadorID, Numero, intentos, Tiempo_Tomado)
            VALUES (${juegoId}, ${player1Id}, ${numeroSecreto1}, 0, 0),
                   (${juegoId}, ${player2Id}, ${numeroSecreto2}, 0, 0);
        `;

        // Almacena el estado del juego en memoria para un acceso rápido durante la partida
        partidasActivas[juegoId] = {
            player1: { 
                id: player1Id, 
                name: primerJugador, 
                intentosTotales: 0,  // Intentos totales
                intentosActuales: 0, // Intentos en la ronda actual
                tiempo: 0,
                inicioTiempoTurno: null,
                secretNumber: numeroSecreto1,
                rondasCompletas: 0,
                historialRonda: []
            },
            player2: { 
                id: player2Id, 
                name: segundoJugador, 
                intentosTotales: 0,  // Intentos totales
                intentosActuales: 0, // Intentos en la ronda actual
                tiempo: 0,
                inicioTiempoTurno: null,
                secretNumber: numeroSecreto2,
                rondasCompletas: 0,
                historialRonda: []
            },
            idJugadorActual: player1Id,
            rondaActual: 1,
            totalRondas: 6,
            historialRondas: []
        };

        // Envía una respuesta exitosa (201 Created) con el estado inicial del juego
        res.status(201).json({
            juegoId: juegoId,
            players: [
                { id: player1Id, name: primerJugador, attempts: 0, rondasCompletas: 0 },
                { id: player2Id, name: segundoJugador, attempts: 0, rondasCompletas: 0 }
            ],
            jugadorActual: { id: player1Id, name: primerJugador, attempts: 0, rondaActual: 1},
            rondaActual: 1,
            mensaje: '¡El juego ha comenzado! Los números secretos han sido generados.',
            status: 'in-progress'
        });

    } catch (err) {
        console.error('Error al iniciar el juego:', err);
        res.status(500).send('Error interno del servidor: ' + err.mensaje);
    }
});

/**
 * @method POST /game/:juegoId/intento
 * @description Procesa el intento de un jugador de adivinar el número
 * Se encarga de:
 * 1. Validar si la partida existe y si es el turno del jugador
 * 2. Comprobar si el intento es correcto, muy alto o muy bajo
 * 3. Actualizar los contadores de intentos
 * 4. Gestionar el cambio de turno cuando un jugador acierta o agota sus 3 intentos de ronda
 * 5. Calcular y acumular el tiempo de juego para cada jugador
 * 6. Determinar si el juego ha terminado
 * 7. Si el juego termina, calcular el ganador, actualizar la BD y limpiar la partida de la memoria
 * 8. Devolver el resultado del intento y el estado actualizado del juego
 */
router.post('/game/:juegoId/intento', async (req, res) => {
    try {
        const { juegoId } = req.params;
        const { player_id, intento } = req.body;
        const NumeroIntento = parseInt(intento);

        // Busca la partida en el objeto de partidas activas
        const game = partidasActivas[juegoId];
        if (!game) {
            return res.status(404).send('Partida no encontrada.');
        }

        // Identifica al jugador actual y al oponente
        const jugadorActual = (game.player1.id == player_id) ? game.player1 : game.player2;
        const oponente = (game.player1.id == player_id) ? game.player2 : game.player1;

        // Verificar si el jugador ya completó todas sus rondas
        if (jugadorActual.rondasCompletas >= 3) {
            return res.status(403).json({ mensaje: 'Ya has completado todas tus rondas. Espera a que termine el juego.' });
        }

        // Verificar si el jugador ya agotó sus intentos en la ronda actual
        if (jugadorActual.intentosActuales >= 3) {
            return res.status(403).json({ mensaje: 'Ya agotaste tus 3 intentos en esta ronda.' });
        }

        // Verifica que sea el turno del jugador que envía el intento
        if (game.idJugadorActual != player_id) {
            return res.status(403).json({ mensaje: 'No es tu turno.' });
        }

        // Incrementar contadores de intentos
        jugadorActual.intentosActuales++;
        jugadorActual.intentosTotales++;

        let mensaje;
        let terminado = false;
        let idGanador = null;
        let nombreGanador = null;
        let cambiarTurno = false;
        let acierto = false;

        // Verificar el intento contra el número secreto del oponente
        if (NumeroIntento === oponente.secretNumber) {
            mensaje = `¡Correcto! Has adivinado el número secreto (${oponente.secretNumber}).`;
            acierto = true;
            cambiarTurno = true; // El turno cambia porque acertó.
        } else {
            // Da una pista si el intento fue incorrecto
            mensaje = NumeroIntento > oponente.secretNumber 
                ? 'Demasiado alto. Intenta un número más bajo.' 
                : 'Demasiado bajo. Intenta un número más alto.';
            
            // Si agotó los 3 intentos de la ronda, fuerza el cambio de turno
            if (jugadorActual.intentosActuales >= 3) {
                mensaje += ` Has agotado tus 3 intentos en esta ronda.`;
                cambiarTurno = true;
            }
        }

        // --- Lógica de Cambio de Turno y Fin de Ronda ---
        if (cambiarTurno) {
            // Detiene el cronómetro del turno actual y acumula el tiempo
            const turnTime = Date.now() - jugadorActual.inicioTiempoTurno;
            jugadorActual.tiempo += turnTime;
            jugadorActual.inicioTiempoTurno = null;

            // Guardar historial de intentos de esta ronda
            jugadorActual.historialRonda.push(jugadorActual.intentosActuales);
            
            // Marca la ronda como completada para este jugador
            jugadorActual.rondasCompletas++;
            
            // Si acertó, se guarda una bandera para la lógica de fin de juego
            if (acierto) {
                jugadorActual.haAdivinado = true;
            }

            // --- Lógica para decidir quién juega ahora ---
            const player1Terminado = game.player1.haAdivinado || game.player1.rondasCompletas >= 3;
            const player2Terminado = game.player2.haAdivinado || game.player2.rondasCompletas >= 3;

            if (!player1Terminado && !player2Terminado) {
                // Si ninguno ha terminado, simplemente se cambia el turno al oponente.
                game.idJugadorActual = oponente.id;
                // Reiniciar intentos del oponente para su nueva ronda solo si es necesario
                if (oponente.intentosActuales >= 3) {
                    oponente.intentosActuales = 0;
                }
            } else if (!player1Terminado || !player2Terminado) {
                // Si uno ya terminó, el turno es para el que todavía puede jugar
                if (!player1Terminado) {
                    game.idJugadorActual = game.player1.id;
                    // Reiniciar intentos para nueva ronda si es necesario
                    if (game.player1.intentosActuales >= 3) {
                        game.player1.intentosActuales = 0;
                    }
                } else {
                    game.idJugadorActual = game.player2.id;
                    // Reiniciar intentos para nueva ronda si es necesario
                    if (game.player2.intentosActuales >= 3) {
                        game.player2.intentosActuales = 0;
                    }
                }
            } else {
                // Ambos jugadores han terminado
                game.idJugadorActual = null;
            }

            // Reiniciar los intentos actuales del jugador que acaba de completar su ronda
            jugadorActual.intentosActuales = 0;
        }

        // --- Verificación de Fin de Juego ---
        const player1Terminado = game.player1.haAdivinado || game.player1.rondasCompletas >= 3;
        const player2Terminado = game.player2.haAdivinado || game.player2.rondasCompletas >= 3;
        
        if (player1Terminado && player2Terminado) {
            terminado = true;
            
            // LÓGICA PARA DETERMINAR EL GANADOR:
            if (game.player1.intentosTotales !== game.player2.intentosTotales) {
                // Criterio 1: Gana quien usó menos intentos en total
                idGanador = game.player1.intentosTotales < game.player2.intentosTotales ? game.player1.id : game.player2.id;
                nombreGanador = game.player1.intentosTotales < game.player2.intentosTotales ? game.player1.name : game.player2.name;
            } else {
                // Criterio 2 (desempate): Gana quien usó menos tiempo
                idGanador = game.player1.tiempo < game.player2.tiempo ? game.player1.id : game.player2.id;
                nombreGanador = game.player1.tiempo < game.player2.tiempo ? game.player1.name : game.player2.name;
            }
        }

        // --- Acciones al Finalizar el Juego ---
        if (terminado) {
            // Convierte el tiempo total de milisegundos a segundos para guardarlo en la BD
            const tiempoPlayer1Segundos = Math.floor(game.player1.tiempo / 1000);
            const tiempoPlayer2Segundos = Math.floor(game.player2.tiempo / 1000);
            
            // Actualiza la tabla 'Juegos' con los resultados finales
            await sql.query`
                UPDATE Juegos
                SET 
                    Intentos_Totalj1 = ${game.player1.intentosTotales},
                    Intentos_Totalj2 = ${game.player2.intentosTotales},
                    Tiempo_Totalj1 = ${tiempoPlayer1Segundos},
                    Tiempo_Totalj2 = ${tiempoPlayer2Segundos},
                    ID_Ganador = ${idGanador}
                WHERE ID_Juego = ${juegoId};
            `;
            // Elimina la partida del objeto en memoria para liberar recursos
            delete partidasActivas[juegoId];
            
            // Prepara el mensaje de victoria explicando por qué ganó.
            let mensajeVictoria = `¡${nombreGanador} es el ganador! `;
            if (game.player1.intentosTotales !== game.player2.intentosTotales) {
                mensajeVictoria += `Ganó por menor cantidad de intentos (${game.player1.intentosTotales < game.player2.intentosTotales ? game.player1.intentosTotales : game.player2.intentosTotales} vs ${game.player1.intentosTotales > game.player2.intentosTotales ? game.player1.intentosTotales : game.player2.intentosTotales}).`;
            } else {
                mensajeVictoria += `Empate en intentos, ganó por menor tiempo total.`;
            }
            
            // Envía la respuesta final del juego.
            return res.status(200).json({
                mensaje: mensaje,
                status: 'terminado',
                winner: nombreGanador,
                mensajeVictoria: mensajeVictoria,
                secretNumbers: {
                    player1: game.player1.secretNumber,
                    player2: game.player2.secretNumber
                },
                players: [
                    {
                        name: game.player1.name,
                        attempts: game.player1.intentosTotales,
                        tiempo: game.player1.tiempo,
                        historialRonda: game.player1.historialRonda,
                        haAdivinado: game.player1.haAdivinado || false
                    },
                    {
                        name: game.player2.name,
                        attempts: game.player2.intentosTotales,
                        tiempo: game.player2.tiempo,
                        historialRonda: game.player2.historialRonda,
                        haAdivinado: game.player2.haAdivinado || false
                    }
                ],
                tiempos: {
                    player1: game.player1.tiempo,
                    player2: game.player2.tiempo
                }
            });
        }

        // --- Preparación de la Respuesta si el Juego Continúa ---
        let respuestaJugadorActual;
        
        if (game.idJugadorActual === null) {
            // Caso borde: ambos jugadores terminaron en el mismo intento, pero la lógica de 'terminado' aún no se ha ejecutado
            respuestaJugadorActual = {
                id: null,
                name: 'Esperando...',
                attempts: 0,
                rondaActual: 3
            };
        } else {
            // Define quién es el próximo jugador en jugar.
            const jugadorQueDebeJugar = (game.idJugadorActual === game.player1.id) ? game.player1 : game.player2;
            respuestaJugadorActual = {
                id: jugadorQueDebeJugar.id,
                name: jugadorQueDebeJugar.name,
                attempts: jugadorQueDebeJugar.intentosActuales,
                rondaActual: jugadorQueDebeJugar.rondasCompletas + 1 // Ronda actual que está jugando (1-3)
            };
        }

        // Inicia el cronómetro para el turno del siguiente jugador JUSTO ANTES de enviar la respuesta
        // Esto asegura que el tiempo comience a contar desde que el frontend recibe la notificación de que es su turno
        if (game.idJugadorActual && !terminado) {
            const jugadorQueVaAJugar = (game.idJugadorActual === game.player1.id) ? game.player1 : game.player2;
            if (!jugadorQueVaAJugar.inicioTiempoTurno) {
                jugadorQueVaAJugar.inicioTiempoTurno = Date.now();
            }
        }

        // Envía la respuesta estándar de un intento durante el juego
        return res.status(200).json({
            mensaje: mensaje,
            status: 'in-progress',
            jugadorActual: respuestaJugadorActual,
            rondaActual: Math.max(game.player1.rondasCompletas, game.player2.rondasCompletas) + 1,
            juegoTerminandose: player1Terminado && player2Terminado && !terminado
        });

    } catch (err) {
        console.error('Error al manejar el intento:', err);
        res.status(500).send('Error interno del servidor.');
    }
});

/**
 * @method GET /game/historial
 * @description Obtiene un historial de todas las partidas jugadas desde la base de datos
 * Realiza una consulta a la base de datos uniendo las tablas 'Juegos' y 'Jugadores'
 * para obtener información detallada de cada partida, incluyendo los nombres de los jugadores y el ganador
 * @returns {Array} Una lista de objetos, donde cada objeto representa una partida completada
 */
router.get('/game/historial', async (req, res) => {
    try {
        // Ejecuta una consulta SQL para obtener el historial
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
        // Devuelve el historial en formato JSON
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error('Error al obtener el historial:', err);
        res.status(500).send('Error interno del servidor.');
    }
});

// Exporta el router para que pueda ser utilizado en el archivo principal de la aplicación
module.exports = router;
