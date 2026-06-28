import React, { useState, useEffect } from 'react'
import './Home.css'

const API = '/.netlify/functions'

function StatBar({ label, value, max, color = 'gold' }) {
  const pct = Math.round((value / max) * 100)
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <div className="stat-bar-wrap">
        <div className="stat-bar-fill" style={{ width: `${pct}%`, background: color === 'gold' ? 'var(--gold)' : color === 'blue' ? '#5352ed' : 'var(--green)' }} />
      </div>
      <span className="stat-count">{value}</span>
    </div>
  )
}

function ConfiabilidadMeter({ porcentaje, aciertos, sorteosProbados }) {
  const color = porcentaje >= 40 ? 'var(--green)' : porcentaje >= 25 ? 'var(--gold)' : 'var(--red)'
  return (
    <div className="confiabilidad-card card">
      <div className="card-title">📈 ÍNDICE DE CONFIABILIDAD</div>
      <div className="conf-main">
        <div className="conf-circle" style={{ borderColor: color }}>
          <span className="conf-pct" style={{ color }}>{porcentaje}%</span>
          <span className="conf-label">aciertos</span>
        </div>
        <div className="conf-info">
          <p>En pruebas con los últimos <strong style={{color:'var(--gold)'}}>{sorteosProbados} sorteos</strong>, el modelo estadístico acertó <strong style={{color}}>{aciertos} números</strong> de los posibles.</p>
          <p style={{marginTop:8, fontSize:12, color:'var(--text3)'}}>
            {porcentaje >= 40 ? '🟢 Modelo con buena precisión estadística' :
             porcentaje >= 25 ? '🟡 Modelo en desarrollo — ingresa más sorteos para mejorar' :
             '🔴 Se necesitan más sorteos para calibrar el modelo'}
          </p>
          <p style={{marginTop:6, fontSize:11, color:'var(--text3)', fontFamily:'var(--font-mono)'}}>
            * Basado en backtesting: cuántos números del top-12 estadístico coincidieron con sorteos reales pasados.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const cargarPrediccion = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/predecir`)
      const json = await res.json()
      if (json.sin_prediccion) {
        setError('No hay predicción todavía. Haz clic en "Nueva Predicción" para generar una.')
      } else if (json.error) {
        setError(json.error)
      } else {
        setData(json)
      }
    } catch (e) {
      setError('Error conectando con el servidor.')
    }
    setLoading(false)
  }

  const generarPrediccion = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/predecir`, { method: 'POST' })
      const json = await res.json()
      if (json.error) {
        setError(json.error)
        if (json.necesita_mas_datos) setData(null)
      } else {
        setData(json)
      }
    } catch (e) {
      setError('Error conectando con el servidor.')
    }
    setLoading(false)
  }

  useEffect(() => { cargarPrediccion() }, [])

  const nextDraw = () => {
    const now = new Date()
    const day = now.getDay()
    let daysUntilNext = -1
    for (let i = 1; i <= 7; i++) {
      const next = (day + i) % 7
      if (next === 3 || next === 6) { daysUntilNext = i; break }
    }
    const nextDate = new Date(now)
    nextDate.setDate(now.getDate() + daysUntilNext)
    return {
      dias: daysUntilNext,
      fecha: nextDate.toLocaleDateString('es-DO', { weekday: 'long', month: 'long', day: 'numeric' })
    }
  }

  const draw = nextDraw()

  return (
    <div className="home animate-in">
      <div className="home-header">
        <div>
          <h1 className="page-title">PREDICCIÓN</h1>
          <p className="page-sub">Próximo sorteo: <strong style={{color:'var(--gold)'}}>{draw.fecha}</strong> · en {draw.dias} {draw.dias === 1 ? 'día' : 'días'}</p>
          {data?.generadaEn && (
            <p style={{fontSize:11, color:'var(--text3)', fontFamily:'var(--font-mono)', marginTop:4}}>
              {data.cached ? '📌 Guardada' : '✨ Nueva'} · {new Date(data.generadaEn).toLocaleDateString('es-DO', {day:'numeric', month:'short', year:'numeric'})} · {data.sorteosAlGenerar} sorteos analizados
            </p>
          )}
        </div>
        <button className="btn btn-primary" onClick={generarPrediccion} disabled={loading}>
          {loading ? <span className="spinner" /> : '🔮'}
          {loading ? 'Analizando...' : 'Nueva Predicción'}
        </button>
      </div>

      {error && <div className="alert alert-error">⚠️ {error}</div>}

      {!data && !loading && !error && (
        <div className="empty-state">
          <div className="empty-icon">🎱</div>
          <div className="empty-title">INGRESA SORTEOS PARA COMENZAR</div>
          <p style={{marginTop:8,fontSize:13,color:'var(--text3)'}}>Ve a "Ingresar Sorteo" y agrega al menos 3 resultados para generar predicciones.</p>
        </div>
      )}

      {loading && (
        <div className="loading-screen">
          <div className="loading-balls">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="loading-ball" style={{animationDelay:`${i*0.1}s`}}>?</div>
            ))}
          </div>
          <p>Analizando {data?.estadisticas?.totalSorteosAnalizados || ''} sorteos con IA...</p>
        </div>
      )}

      {data && !loading && (
        <>
          {/* Predicción principal */}
          <div className="prediction-main card">
            <div className="pred-main-header">
              <div>
                <div className="card-title">🎯 COMBINACIÓN RECOMENDADA</div>
                <p style={{fontSize:12, color:'var(--text3)', fontFamily:'var(--font-mono)'}}>Score compuesto: frecuencia + rezago + pares</p>
              </div>
            </div>
            <div className="pred-balls-main">
              {data.prediccion?.numeros && [...data.prediccion.numeros].sort((a,b)=>a-b).map((n, i) => (
                <div key={i} className="ball gold" style={{animation:`ballDrop 0.4s ease ${i*0.1}s both`}}>
                  {n}
                </div>
              ))}
            </div>

            {data.prediccion?.factores && (
              <div className="factores">
                {data.prediccion.factores.frecuentes?.length > 0 && (
                  <span className="factor-tag tag-gold">🔥 Frecuentes: {data.prediccion.factores.frecuentes.join(', ')}</span>
                )}
                {data.prediccion.factores.frios?.length > 0 && (
                  <span className="factor-tag tag-blue">🧊 Fríos: {data.prediccion.factores.frios.join(', ')}</span>
                )}
                {data.prediccion.factores.pares?.length > 0 && (
                  <span className="factor-tag tag-green">🔗 Por pares: {data.prediccion.factores.pares.join(', ')}</span>
                )}
              </div>
            )}

            {data.prediccion?.razonamiento && (
              <div className="razonamiento">
                <span style={{color:'var(--text3)'}}>🧠</span> {data.prediccion.razonamiento}
              </div>
            )}
          </div>

          {/* Índice de confiabilidad */}
          {data.confiabilidad && data.confiabilidad.sorteosProbados > 0 && (
            <ConfiabilidadMeter {...data.confiabilidad} />
          )}

          {/* Estadísticas */}
          {data.estadisticas && (
            <div className="stats-section">
              <div className="card">
                <div className="card-title">🏆 TOP NÚMEROS POR SCORE</div>
                <div className="stats-list">
                  {data.estadisticas.topPorScore?.map((n, i) => (
                    <StatBar key={i} label={`Nº ${n.numero}`} value={n.score}
                      max={data.estadisticas.topPorScore[0].score} color="gold" />
                  ))}
                </div>
                <p style={{fontSize:11,color:'var(--text3)',marginTop:10,fontFamily:'var(--font-mono)'}}>
                  Score = frecuencia (40%) + rezago (30%) + pares (30%)
                </p>
              </div>

              <div className="card">
                <div className="card-title">🔥 MÁS FRECUENTES</div>
                <div className="stats-list">
                  {data.estadisticas.numerosMasFrecuentes?.map((n, i) => (
                    <StatBar key={i} label={`Nº ${n.numero}`} value={n.apariciones}
                      max={data.estadisticas.numerosMasFrecuentes[0].apariciones} color="gold" />
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-title">🧊 MÁS FRÍOS</div>
                <div className="stats-list">
                  {data.estadisticas.numerosMasFrios?.map((n, i) => (
                    <StatBar key={i} label={`Nº ${n.numero}`} value={n.sorteosSinSalir}
                      max={data.estadisticas.numerosMasFrios[0].sorteosSinSalir} color="blue" />
                  ))}
                </div>
                <p style={{fontSize:11,color:'var(--text3)',marginTop:10,fontFamily:'var(--font-mono)'}}>
                  Mayor barra = más sorteos ausente
                </p>
              </div>

              <div className="card pairs-card">
                <div className="card-title">🔗 PARES MÁS COMUNES</div>
                <div className="pairs-list">
                  {data.estadisticas.mejoresPares?.map((p, i) => {
                    const [a, b] = p.par.split('-')
                    return (
                      <div key={i} className="pair-row">
                        <div className="balls-row">
                          <div className="ball" style={{width:36,height:36,fontSize:16}}>{a}</div>
                          <span style={{color:'var(--text3)'}}>+</span>
                          <div className="ball" style={{width:36,height:36,fontSize:16}}>{b}</div>
                        </div>
                        <span className="badge badge-blue">{p.aparicionesjuntos}x</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="disclaimer">
            <span>⚠️</span> Las predicciones son análisis estadísticos — la lotería es aleatoria. Juega con responsabilidad.
          </div>
        </>
      )}
    </div>
  )
}
