const { neon } = require('@neondatabase/serverless');

function calcularFrecuencias(sorteos) {
  const freq = {};
  for (let i = 1; i <= 40; i++) freq[i] = 0;
  sorteos.forEach(s => {
    [s.n1, s.n2, s.n3, s.n4, s.n5, s.n6].forEach(n => { freq[n]++ });
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

// Calcula score compuesto por número basado en múltiples factores
function calcularScoreNumeros(sorteos) {
  const total = sorteos.length;
  const freq = calcularFrecuencias(sorteos);
  const ultima = calcularUltimaAparicion(sorteos);
  const pares = calcularPares(sorteos);

  // Score por frecuencia (40%)
  const maxFreq = Math.max(...Object.values(freq));
  
  // Score por rezago — números que llevan tiempo sin salir tienen más probabilidad (30%)
  const maxRezago = Math.max(...Object.values(ultima));

  // Score por pares — si el número aparece en pares frecuentes (30%)
  const scorePares = {};
  for (let i = 1; i <= 40; i++) scorePares[i] = 0;
  Object.entries(pares).forEach(([par, count]) => {
    const [a, b] = par.split('-').map(Number);
    scorePares[a] += count;
    scorePares[b] += count;
  });
  const maxPares = Math.max(...Object.values(scorePares));

  const scores = {};
  for (let i = 1; i <= 40; i++) {
    const scoreFreq = (freq[i] / maxFreq) * 40;
    const scoreRezago = (ultima[i] / maxRezago) * 30;
    const scorePar = maxPares > 0 ? (scorePares[i] / maxPares) * 30 : 0;
    scores[i] = scoreFreq + scoreRezago + scorePar;
  }
  return scores;
}

// Calcula qué tan bien han predicho los sorteos anteriores (backtesting)
function calcularConfiabilidad(sorteos) {
  if (sorteos.length < 6) return { porcentaje: 0, aciertos: 0, sorteosProbados: 0 };

  let totalAciertos = 0;
  let totalPosibles = 0;

  // Para cada sorteo, simulamos si hubiéramos predicho con los anteriores
  for (let i = 5; i < Math.min(sorteos.length, 20); i++) {
    const historico = sorteos.slice(i); // sorteos anteriores
    const real = [sorteos[i-1].n1, sorteos[i-1].n2, sorteos[i-1].n3, sorteos[i-1].n4, sorteos[i-1].n5, sorteos[i-1].n6];
    
    const scores = calcularScoreNumeros(historico);
    const top12 = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([n]) => parseInt(n));

    const aciertos = real.filter(n => top12.includes(n)).length;
    totalAciertos += aciertos;
    totalPosibles += 6;
  }

  const porcentaje = Math.round((totalAciertos / totalPosibles) * 100);
  return {
    porcentaje,
    aciertos: totalAciertos,
    sorteosProbados: Math.min(sorteos.length - 5, 15)
  };
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
      max_tokens: 1200,
      temperature: 0.3,
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

  // GET — devuelve la última predicción guardada
  if (event.httpMethod === 'GET') {
    try {
      const ultima = await sql`
        SELECT * FROM predicciones ORDER BY fecha_prediccion DESC LIMIT 1
      `;
      if (ultima.length === 0) {
        return { statusCode: 200, headers, body: JSON.stringify({ sin_prediccion: true }) };
      }
      const p = ultima[0];
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          cached: true,
          ...p.resultado_json,
          generadaEn: p.fecha_prediccion,
          sorteosAlGenerar: p.sorteos_al_generar
        })
      };
    } catch (e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  // POST — genera predicción nueva
  if (event.httpMethod === 'POST') {
    try {
      const sorteos = await sql`
        SELECT * FROM sorteos ORDER BY fecha DESC LIMIT 50
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

      const scores = calcularScoreNumeros(sorteos);
      const confiabilidad = calcularConfiabilidad(sorteos);

      const frecuencias = calcularFrecuencias(sorteos);
      const ultimaAparicion = calcularUltimaAparicion(sorteos);
      const pares = calcularPares(sorteos);

      // Top números por score compuesto
      const topNumeros = Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([n, s]) => ({ numero: parseInt(n), score: Math.round(s), apariciones: frecuencias[parseInt(n)], sorteosSinSalir: ultimaAparicion[parseInt(n)] }));

      const porFrecuencia = Object.entries(frecuencias)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([n, f]) => ({ numero: parseInt(n), apariciones: f }));

      const numerosFrios = Object.entries(ultimaAparicion)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([n, u]) => ({ numero: parseInt(n), sorteosSinSalir: u }));

      const mejoresPares = Object.entries(pares)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([par, freq]) => ({ par, aparicionesjuntos: freq }));

      const historialReciente = sorteos.slice(0, 15).map(s =>
        `${s.fecha}: [${s.n1}, ${s.n2}, ${s.n3}, ${s.n4}, ${s.n5}, ${s.n6}]`
      ).join('\n');

      const prompt = `Eres un experto en análisis estadístico de loterías. Analiza el juego LOTO LEIDSA (República Dominicana): se eligen 6 números del 1 al 40, sorteos miércoles y sábados.

HISTORIAL ÚLTIMOS 15 SORTEOS:
${historialReciente}

RANKING DE NÚMEROS POR SCORE COMPUESTO (frecuencia + rezago + pares):
${topNumeros.map(n => `  Nº${n.numero}: score=${n.score}, salió ${n.apariciones} veces, lleva ${n.sorteosSinSalir} sorteos sin salir`).join('\n')}

NÚMEROS MÁS FRECUENTES (top 10):
${porFrecuencia.map(n => `  Nº${n.numero}: ${n.apariciones} veces`).join('\n')}

NÚMEROS MÁS FRÍOS (más ausentes):
${numerosFrios.map(n => `  Nº${n.numero}: ${n.sorteosSinSalir} sorteos sin aparecer`).join('\n')}

PARES QUE MÁS SALEN JUNTOS:
${mejoresPares.map(p => `  ${p.par}: juntos ${p.aparicionesjuntos} veces`).join('\n')}

TOTAL SORTEOS ANALIZADOS: ${sorteos.length}

Tu tarea: usando TODOS estos datos, selecciona 1 combinación óptima de 6 números. Prioriza números con alto score compuesto. Incluye al menos 1-2 números fríos que estadísticamente "deben" salir pronto. Considera los pares frecuentes.

Responde ÚNICAMENTE con este JSON exacto, sin texto adicional ni backticks:
{
  "numeros": [n1,n2,n3,n4,n5,n6],
  "razonamiento": "explicación detallada de por qué elegiste cada número, máximo 4 oraciones",
  "factores": {
    "frecuentes": [lista de números elegidos por alta frecuencia],
    "frios": [lista de números elegidos por rezago],
    "pares": [lista de números elegidos por pares frecuentes]
  }
}`;

      const aiResponse = await callGroq(prompt);

      let prediccionIA;
      try {
        const cleaned = aiResponse.replace(/```json|```/g, '').trim();
        prediccionIA = JSON.parse(cleaned);
      } catch (e) {
        // Fallback estadístico puro
        const top6 = topNumeros.slice(0, 6).map(n => n.numero);
        prediccionIA = {
          numeros: top6,
          razonamiento: 'Selección basada en score compuesto de frecuencia, rezago y pares frecuentes.',
          factores: { frecuentes: top6.slice(0, 3), frios: top6.slice(3, 5), pares: [top6[5]] }
        };
      }

      const estadisticas = {
        totalSorteosAnalizados: sorteos.length,
        numerosMasFrecuentes: porFrecuencia.slice(0, 8),
        numerosMasFrios: numerosFrios,
        mejoresPares: mejoresPares,
        topPorScore: topNumeros.slice(0, 10)
      };

      const resultadoJson = {
        prediccion: prediccionIA,
        confiabilidad,
        estadisticas
      };

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
