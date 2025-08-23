// Importar los módulos necesarios
const express = require('express');
const sql = require('mssql');
const cors = require('cors'); // Importar el módulo CORS
const app = express();
const port = 3000;

// Importar la lógica del juego desde el nuevo archivo juego.js
const juegoRoutes = require('./juego');

// Middleware para parsear el cuerpo de las solicitudes como JSON
app.use(express.json());

// Habilitar CORS para todas las solicitudes
app.use(cors());

// Configuración de la conexión a la base de datos de SQL Server
const dbConfig = {
    user: 'mbappe',
    password: 'mcdiell09',
    server: 'GMDH09',
    database: 'juegoNumeros',
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

// Conectar a la base de datos
async function connectToDatabase() {
    try {
        await sql.connect(dbConfig);
        console.log('Conexión a la base de datos establecida correctamente.');
    } catch (err) {
        console.error('Error al conectar a la base de datos:', err);
    }
}
connectToDatabase();

// Usar las rutas del juego con el prefijo /api
app.use('/api', juegoRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
    res.status(200).send('¡Hola desde el Backend de Batalla de Números!');
});

app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
