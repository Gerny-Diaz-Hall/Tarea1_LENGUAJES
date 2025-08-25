Create Database juegoNumeros;
Use juegoNumeros;

CREATE TABLE Jugadores (
    ID_Jugador INT PRIMARY KEY IDENTITY(1,1),
    nombre VARCHAR(50) NOT NULL
);

CREATE TABLE Juegos (
    ID_Juego INT PRIMARY KEY IDENTITY(1,1),
    ID_Jugador1 INT NOT NULL,
    ID_Jugador2 INT NOT NULL,
    ID_Ganador INT,
    Intentos_Totalj1 INT DEFAULT 0,
    Intentos_Totalj2 INT DEFAULT 0,
    Tiempo_Totalj1 INT DEFAULT 0,
    Tiempo_Totalj2 INT DEFAULT 0,
    FOREIGN KEY (ID_Jugador1) REFERENCES Jugadores(ID_Jugador),
    FOREIGN KEY (ID_Jugador2) REFERENCES Jugadores(ID_Jugador),
    FOREIGN KEY (ID_Ganador) REFERENCES Jugadores(ID_Jugador)
);
CREATE TABLE Rondas (
    RondaID INT PRIMARY KEY IDENTITY(1,1),
    JuegoID INT NOT NULL,
    JugadorID INT NOT NULL,
    Numero INT NOT NULL,
    intentos INT NOT NULL,
    Tiempo_Tomado INT NOT NULL,
    FOREIGN KEY (JuegoID) REFERENCES Juegos(ID_Juego),
    FOREIGN KEY (JugadorID) REFERENCES Jugadores(ID_Jugador)
);