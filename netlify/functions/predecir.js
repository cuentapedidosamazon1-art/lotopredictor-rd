const { neon } = require('@neondatabase/serverless');

function calcularFrecuencias(sorteos) {
  const freq = {};
  for (let i = 1; i <= 40; i++) freq[i] = 0;
  sorteos.forEach(s => {
    [s.n1, s.n2, s.n3, s.n4, s.n5, s.n6].forEach(n => {
      freq[n] = (freq[n] || 0) + 1;
    });
  });
  return freq;
}

function calcularUltimaAparicion(sorteos) {
  const ultima = {};
  sorteos.forEach((s, idx) => {
    [s.n1, s.n2, s.n3, s.n4, s.n5, s.n6].forEach(n => {
      if (ultima[n] === undefined) ultima[n] = idx;
    });
  });
  for (let i = 1; i <= 40; i++) {
    if (ultima[i] === undefined) ultima[i] = sorteos.length;
  }
  return ultima;
}

function calcularPares(sorteos) {
  const pares = {};
  sorteos.forEach(s => {
    const nums = [s.n1, s.n2, s.n3, s.n4, s.n5, s.n6];
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        const key = `${Math.min(nums[i], nums[j])}-${Math.max(nums[i], nums[j])}`;
        pares[key] = (pares[key] || 0) + 1;
      }
    }
  });
  return pares;
}

async function callGroq(prompt) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content;
}

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

  // GET — devuelve la última predicción guardada sin generar una nueva
  if (event.httpMethod === 'GET') {
    try {
      const sorteos = await sql`SELECT COUNT(*) as total FROM sorteos`;
      const totalSorteos = parseInt(sorteos[0].total);

      const ultima = await sql`
        SELECT * FROM predicciones 
        ORDER BY fecha_prediccion DESC 
        LIMIT 1
      `;

      if (ultima.length === 0) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ sin_prediccion: true, totalSorteos })
        };
      }

      const p = ultima[0];
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          cached: true,
          predicciones: p.resultado_json.predicciones,
          analisis: p.resultado_json.analisis,
          estadisticas: p.resultado_json.estadisticas,
          generadaEn: p.fecha_prediccion,
          sorteosAlGenerar: p.sorteos_al_generar
        })
      };
    } catch (e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  // POST — genera una predicción nueva y la guarda
  if (event.httpMethod === 'POST') {
    try {
      const sorteos = await sql`
        SELECT * FROM sorteos ORDER BY fecha DESC LIMIT 30
      `;

      if (sorteos.length < 3) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            error: 'Se necesitan al menos 3 sorteos para generar predicciones',
            necesita_mas_datos: true
          })
        };
      }

      const frecuencias = calcularFrecuencias(sorteos);
      const ultimaAparicion = calcularUltimaAparicion(sorteos);
      const pares = calcularPares(sorteos);

      const porFrecuencia = Object.entries(frecuencias)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([n, f]) => ({ numero: parseInt(n), apariciones: f }));

      const numerosFrios = Object.entries(ultimaAparicion)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([n, u]) => ({ numero: parseInt(n), sorteosSinSalir: u }));

      const mejoresPares = Object.entries(pares)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([par, freq]) => ({ par, aparicionesjuntos: freq }));

      const historialReciente = sorteos.slice(0, 10).map(s =>
        `${s.fecha}: [${s.n1}, ${s.n2}, ${s.n3}, ${s.n4}, ${s.n5}, ${s.n6}]`
      ).join('\n');

      const prompt = `Eres un analizador estadístico de lotería. Analiza estos datos del juego LOTO LEIDSA (República Dominicana) donde se eligen 6 números del 1 al 40.

HISTORIAL RECIENTE (últimos 10 sorteos):
${historialReciente}

ANÁLISIS ESTADÍSTICO (últimos ${sorteos.length} sorteos):

Números más frecuentes:
${porFrecuencia.slice(0, 10).map(n => `  ${n.numero}: salió ${n.apariciones} veces`).join('\n')}

Números más "fríos" (llevan más sorteos sin salir):
${numerosFrios.map(n => `  ${n.numero}: ${n.sorteosSinSalir} sorteos ausente`).join('\n')}

Pares que más salen juntos:
${mejoresPares.slice(0, 5).map(p => `  ${p.par}: juntos ${p.aparicionesjuntos} veces`).join('\n')}

Basándote en estos patrones estadísticos, genera 3 combinaciones de 6 números distintas para el próximo sorteo.
Responde ÚNICAMENTE con este JSON exacto, sin texto adicional ni backticks:
{
  "combinaciones": [
    {"numeros": [n1,n2,n3,n4,n5,n6], "estrategia": "descripción breve", "confianza": 65},
    {"numeros": [n1,n2,n3,n4,n5,n6], "estrategia": "descripción breve", "confianza": 58},
    {"numeros": [n1,n2,n3,n4,n5,n6], "estrategia": "descripción breve", "confianza": 52}
  ],
  "analisis": "análisis breve de los patrones observados en 2-3 oraciones"
}`;

      const aiResponse = await callGroq(prompt);

      let prediccionData;
      try {
        const cleaned = aiResponse.replace(/```json|```/g, '').trim();
        prediccionData = JSON.parse(cleaned);
      } catch (e) {
        const topNums = porFrecuencia.slice(0, 6).map(n => n.numero);
        prediccionData = {
          combinaciones: [{ numeros: topNums, estrategia: 'Números más frecuentes', confianza: 55 }],
          analisis: 'Predicción basada en frecuencia histórica.'
        };
      }

      const estadisticas = {
        totalSorteosAnalizados: sorteos.length,
        numerosMasFrecuentes: porFrecuencia.slice(0, 8),
        numerosMasFrios: numerosFrios.slice(0, 6),
        mejoresPares: mejoresPares.slice(0, 5)
      };

      const resultadoJson = {
        predicciones: prediccionData.combinaciones,
        analisis: prediccionData.analisis,
        estadisticas
      };

      // Guarda la predicción nueva (borra las anteriores para mantener solo la última)
      await sql`DELETE FROM predicciones`;
      await sql`
        INSERT INTO predicciones (resultado_json, sorteos_al_generar)
        VALUES (${JSON.stringify(resultadoJson)}, ${sorteos.length})
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          cached: false,
          ...resultadoJson,
          generadaEn: new Date().toISOString(),
          sorteosAlGenerar: sorteos.length
        })
      };

    } catch (error) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};
