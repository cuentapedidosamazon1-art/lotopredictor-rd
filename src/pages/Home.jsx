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
      if (json.error) {
        setError(json.error)
      } else if (json.sin_prediccion) {
        setError('No hay predicción todavía. Haz clic en "Nueva Predicción" para generar una.')
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
      } else {
        setData(json)
      }
    } catch (e) {
      setError('Error conectando con el servidor.')
    }
    setLoading(false)
  }

  useEffect(() => { cargarPrediccion() }, [])
      const json = await res.json()
      if (json.error) {
        setError(json.error)
        if (json.necesita_mas_datos) setData(null)
      } else {
        setData(json)
      }
    } catch (e) {
      setError('Error conectando con el servidor. Verifica que la base de datos esté configurada.')
    }
    setLoading(false)
  }

  useEffect(() => { generarPrediccion() }, [])

  const nextDraw = () => {
    const now = new Date()
    const day = now.getDay()
    const days = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
    // Next Wednesday (3) or Saturday (6)
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
          <h1 className="page-title">PREDICCIONES</h1>
          <p className="page-sub">Próximo sorteo: <strong style={{color:'var(--gold)'}}>{draw.fecha}</strong> · en {draw.dias} {draw.dias === 1 ? 'día' : 'días'}</p>
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
          <div className="predictions-grid">
            {data.predicciones?.map((pred, idx) => (
              <div key={idx} className="prediction-card" style={{animationDelay:`${idx*0.1}s`}}>
                <div className="pred-header">
                  <span className="pred-rank">#{idx + 1}</span>
                  <span className="badge badge-gold">{pred.confianza}% confianza</span>
                </div>
                <div className="pred-balls">
                  {[...pred.numeros].sort((a,b)=>a-b).map((n, i) => (
                    <div key={i} className="ball gold" style={{animationDelay:`${i*0.07}s`, animation:`ballDrop 0.4s ease ${i*0.07}s both`}}>
                      {n}
                    </div>
                  ))}
                </div>
                <div className="pred-strategy">
                  <span>📊</span> {pred.estrategia}
                </div>
              </div>
            ))}
          </div>

          {data.analisis && (
            <div className="card analisis-card">
              <div className="card-title">🧠 ANÁLISIS DE LA IA</div>
              <p style={{color:'var(--text2)', lineHeight:1.7, fontSize:14}}>{data.analisis}</p>
            </div>
          )}

          {data.estadisticas && (
            <div className="stats-section">
              <div className="card">
                <div className="card-title">🔥 NÚMEROS MÁS FRECUENTES</div>
                <div className="stats-list">
                  {data.estadisticas.numerosMasFrecuentes?.map((n, i) => (
                    <StatBar key={i} label={`Número ${n.numero}`} value={n.apariciones}
                      max={data.estadisticas.numerosMasFrecuentes[0].apariciones} color="gold" />
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-title">🧊 NÚMEROS MÁS FRÍOS</div>
                <div className="stats-list">
                  {data.estadisticas.numerosMasFrios?.map((n, i) => (
                    <StatBar key={i} label={`Número ${n.numero}`} value={n.sorteosSinSalir}
                      max={data.estadisticas.numerosMasFrios[0].sorteosSinSalir} color="blue" />
                  ))}
                </div>
                <p style={{fontSize:11,color:'var(--text3)',marginTop:12,fontFamily:'var(--font-mono)'}}>
                  Mayor barra = más sorteos sin aparecer
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
                        <span className="badge badge-blue">{p.aparicionesjuntos}x juntos</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="disclaimer">
            <span>⚠️</span> Las predicciones son análisis estadísticos basados en historial. La lotería es aleatoria — juega con responsabilidad.
          </div>
        </>
      )}
    </div>
  )
}
