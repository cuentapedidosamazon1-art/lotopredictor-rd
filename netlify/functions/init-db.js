const { neon } = require('@neondatabase/serverless');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    // Create tables if they don't exist
    await sql`
      CREATE TABLE IF NOT EXISTS sorteos (
        id SERIAL PRIMARY KEY,
        fecha DATE NOT NULL,
        dia_semana VARCHAR(20) NOT NULL,
        n1 INTEGER NOT NULL,
        n2 INTEGER NOT NULL,
        n3 INTEGER NOT NULL,
        n4 INTEGER NOT NULL,
        n5 INTEGER NOT NULL,
        n6 INTEGER NOT NULL,
        tipo VARCHAR(20) DEFAULT 'loto',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS predicciones (
        id SERIAL PRIMARY KEY,
        sorteo_id INTEGER,
        fecha_prediccion TIMESTAMP DEFAULT NOW(),
        numeros_sugeridos INTEGER[] NOT NULL,
        razonamiento TEXT,
        confianza INTEGER DEFAULT 50,
        acerto_count INTEGER DEFAULT 0,
        validada BOOLEAN DEFAULT FALSE
      )
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Base de datos inicializada correctamente' })
    };
  } catch (error) {
    console.error('DB init error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
