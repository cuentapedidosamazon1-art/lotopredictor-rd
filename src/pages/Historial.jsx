import React, { useState, useEffect } from 'react'
import './Historial.css'

const API = '/.netlify/functions'

export default function Historial() {
  const [sorteos, setSorteos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const cargar = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/sorteos`)
      const json = await res.json()
      if (Array.isArray(json)) setSorteos(json)
      else setError(json.error || 'Error cargando historial')
    } catch (e) {
      setError('Error de conexión')
    }
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  // Calculate number frequencies for the heatmap
  const freq = {}
  for (let i = 1; i <= 40; i++) freq[i] = 0
  sorteos.forEach(s => {
    [s.n1, s.n2, s.n3, s.n4, s.n5, s.n6].forEach(n => { freq[n]++ })
  })
  const maxFreq = Math.max(...Object.values(freq), 1)

  const getHeat = (n) => {
    const f = freq[n] / maxFreq
    if (f > 0.7) return 'heat-hot'
    if (f > 0.4) return 'heat-warm'
    if (f > 0.2) return 'heat-cool'
    if (f > 0) return 'heat-cold'
    return 'heat-none'
  }

  return (
    <div className="historial animate-in">
      <div className="home-header" style={{marginBottom:32}}>
        <div>
          <h1 className="page-title">HISTORIAL</h1>
          <p className="page-sub">{sorteos.length} sorteos registrados</p>
        </div>
        <button className="btn btn-secondary" onClick={cargar} disabled={loading}>
          {loading ? <span className="spinner" /> : '🔄'} Actualizar
        </button>
      </div>

      {error && <div className="alert alert-error">⚠️ {error}</div>}

      {sorteos.length > 0 && (
        <div className="card heatmap-card">
          <div className="card-title">🗺 MAPA DE CALOR — FRECUENCIA POR NÚMERO</div>
          <div className="heatmap-legend">
            <span className="heat-none heat-dot" /> Nunca
            <span className="heat-cold heat-dot" /> Poco
            <span className="heat-cool heat-dot" /> Normal
            <span className="heat-warm heat-dot" /> Frecuente
            <span className="heat-hot heat-dot" /> Muy frecuente
          </div>
          <div className="heatmap-grid">
            {Array.from({length: 40}, (_, i) => i + 1).map(n => (
              <div key={n} className={`heat-cell ${getHeat(n)}`} title={`${n}: ${freq[n]} veces`}>
                <span className="heat-num">{n}</span>
                <span className="heat-count">{freq[n]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="empty-state">
          <div className="spinner" style={{width:32,height:32,margin:'0 auto 16px'}} />
          <p>Cargando historial...</p>
        </div>
      )}

      {!loading && sorteos.length === 0 && !error && (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <div className="empty-title">SIN SORTEOS AÚN</div>
          <p style={{marginTop:8,fontSize:13,color:'var(--text3)'}}>Ingresa los resultados de los sorteos para ver el historial.</p>
        </div>
      )}

      {sorteos.length > 0 && (
        <div className="card">
          <div className="card-title">📅 RESULTADOS RECIENTES</div>
          <div className="sorteos-list">
            {sorteos.map((s, idx) => {
              const fecha = new Date(s.fecha + 'T12:00')
              const fechaStr = fecha.toLocaleDateString('es-DO', { weekday:'short', day:'numeric', month:'short', year:'numeric' })
              return (
                <div key={s.id} className="sorteo-row animate-in" style={{animationDelay:`${idx*0.03}s`}}>
                  <div className="sorteo-meta">
                    <span className="sorteo-fecha">{fechaStr}</span>
                    <span className={`badge ${s.dia_semana === 'miercoles' ? 'badge-blue' : 'badge-gold'}`}>
                      {s.dia_semana}
                    </span>
                  </div>
                  <div className="balls-row">
                    {[s.n1, s.n2, s.n3, s.n4, s.n5, s.n6].map((n, i) => (
                      <div key={i} className="ball" style={{width:36,height:36,fontSize:16}}>{n}</div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
