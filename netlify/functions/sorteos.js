const { neon } = require('@neondatabase/serverless');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const sql = neon(process.env.DATABASE_URL);

  // GET - retrieve all sorteos
  if (event.httpMethod === 'GET') {
    try {
      const sorteos = await sql`
        SELECT * FROM sorteos 
        ORDER BY fecha DESC 
        LIMIT 100
      `;
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(sorteos)
      };
    } catch (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }
  }

  // POST - add new sorteo
  if (event.httpMethod === 'POST') {
    try {
      const { fecha, numeros, tipo = 'loto' } = JSON.parse(event.body);

      if (!fecha || !numeros || numeros.length !== 6) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Se requieren fecha y exactamente 6 números' })
        };
      }

      const sorted = [...numeros].sort((a, b) => a - b);
      const invalid = sorted.find(n => n < 1 || n > 40);
      if (invalid) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Números deben estar entre 1 y 40' })
        };
      }

      const date = new Date(fecha);
      const dayOfWeek = date.getDay();
      const diaMap = { 0: 'domingo', 1: 'lunes', 2: 'martes', 3: 'miercoles', 4: 'jueves', 5: 'viernes', 6: 'sabado' };
      const dia_semana = diaMap[dayOfWeek];

      const result = await sql`
        INSERT INTO sorteos (fecha, dia_semana, n1, n2, n3, n4, n5, n6, tipo)
        VALUES (${fecha}, ${dia_semana}, ${sorted[0]}, ${sorted[1]}, ${sorted[2]}, ${sorted[3]}, ${sorted[4]}, ${sorted[5]}, ${tipo})
        RETURNING *
      `;

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(result[0])
      };
    } catch (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};
