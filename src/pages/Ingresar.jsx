import React, { useState } from 'react'
import './Ingresar.css'

const API = '/.netlify/functions'

export default function Ingresar() {
  const [fecha, setFecha] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [numeros, setNumeros] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState(null)

  const handleNumero = (idx, val) => {
    const clean = val.replace(/\D/g, '').slice(0, 2)
    const nums = [...numeros]
    nums[idx] = clean
    setNumeros(nums)
  }

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      const next = document.getElementById(`num-${idx + 1}`)
      if (next) next.focus()
    }
  }

  const validate = () => {
    const parsed = numeros.map(n => parseInt(n))
    if (parsed.some(n => isNaN(n))) return 'Ingresa los 6 números'
    if (parsed.some(n => n < 1 || n > 40)) return 'Todos los números deben estar entre 1 y 40'
    if (new Set(parsed).size !== 6) return 'Los números no pueden repetirse'
    if (!fecha) return 'Selecciona la fecha del sorteo'
    return null
  }

  const guardar = async () => {
    const err = validate()
    if (err) { setError(err); return }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`${API}/sorteos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, numeros: numeros.map(n => parseInt(n)) })
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Error al guardar')
      } else {
        setSuccess(`✅ Sorteo del ${new Date(fecha + 'T12:00:00').toLocaleDateString('es-DO', { weekday:'long', month:'long', day:'numeric' })} guardado correctamente`)
        setNumeros(['', '', '', '', '', ''])
        document.getElementById('num-0')?.focus()
      }
    } catch (e) {
      setError('Error de conexión. Verifica la configuración de la base de datos.')
    }
    setLoading(false)
  }

  const numsFilled = numeros.filter(n => n !== '').length

  return (
    <div className="ingresar animate-in">
      <h1 className="page-title">INGRESAR SORTEO</h1>
      <p className="page-sub">Registra los números ganadores para mejorar las predicciones</p>

      {error && <div className="alert alert-error">⚠️ {error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="form-card card">
        <div className="form-section">
          <label className="form-label">FECHA DEL SORTEO</label>
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="date-input"
          />
          <span className="form-hint">Los sorteos son miércoles y sábados</span>
        </div>

        <div className="form-section">
          <label className="form-label">NÚMEROS GANADORES <span style={{color:'var(--text3)'}}>({numsFilled}/6)</span></label>
          <div className="num-inputs">
            {numeros.map((n, idx) => (
              <div key={idx} className={`num-wrapper ${n ? 'filled' : ''}`}>
                <input
                  id={`num-${idx}`}
                  type="text"
                  inputMode="numeric"
                  value={n}
                  onChange={e => handleNumero(idx, e.target.value)}
                  onKeyDown={e => handleKeyDown(idx, e)}
                  placeholder="—"
                  className="num-input"
                  maxLength={2}
                />
                {n && <div className="num-preview">{n}</div>}
              </div>
            ))}
          </div>
          <p className="form-hint">Números del 1 al 40 · Sin repetir · Presiona Enter para avanzar</p>
        </div>

        {numsFilled === 6 && (
          <div className="preview-section">
            <div className="form-label" style={{marginBottom:12}}>VISTA PREVIA</div>
            <div className="balls-row">
              {[...numeros].map(n=>parseInt(n)).sort((a,b)=>a-b).map((n, i) => (
                <div key={i} className="ball gold">{n}</div>
              ))}
            </div>
          </div>
        )}

        <button
          className="btn btn-primary btn-full"
          onClick={guardar}
          disabled={loading || numsFilled !== 6}
        >
          {loading ? <><span className="spinner" /> Guardando...</> : '💾 Guardar Sorteo'}
        </button>
      </div>

      <div className="tip-card card">
        <div className="card-title">💡 CONSEJOS</div>
        <ul className="tip-list">
          <li>Ingresa los resultados lo antes posible después de cada sorteo</li>
          <li>Con más de 10 sorteos, las predicciones mejoran considerablemente</li>
          <li>El orden de los números no importa — se ordenan automáticamente</li>
        </ul>
      </div>
    </div>
  )
}
