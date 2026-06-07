import React, { useState } from 'react'
import './Setup.css'

const API = '/.netlify/functions'

export default function Setup() {
  const [initLoading, setInitLoading] = useState(false)
  const [initResult, setInitResult] = useState(null)
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState(null)

  const initDB = async () => {
    setInitLoading(true)
    setInitResult(null)
    try {
      const res = await fetch(`${API}/init-db`, { method: 'POST' })
      const json = await res.json()
      setInitResult({ ok: res.ok, msg: json.message || json.error })
    } catch (e) {
      setInitResult({ ok: false, msg: 'Error de conexión: ' + e.message })
    }
    setInitLoading(false)
  }

  const testDB = async () => {
    setTestLoading(true)
    setTestResult(null)
    try {
      const res = await fetch(`${API}/sorteos`)
      const json = await res.json()
      if (Array.isArray(json)) {
        setTestResult({ ok: true, msg: `✅ Conexión exitosa — ${json.length} sorteos en la base de datos` })
      } else {
        setTestResult({ ok: false, msg: json.error || 'Respuesta inesperada' })
      }
    } catch (e) {
      setTestResult({ ok: false, msg: 'Error: ' + e.message })
    }
    setTestLoading(false)
  }

  return (
    <div className="setup animate-in">
      <h1 className="page-title">CONFIGURACIÓN</h1>
      <p className="page-sub">Inicializa la base de datos y verifica la conexión</p>

      <div className="setup-steps">
        <div className="card step-card">
          <div className="step-num">1</div>
          <div className="step-content">
            <div className="card-title">VARIABLES DE ENTORNO</div>
            <p className="step-desc">Configura estas variables en tu panel de Netlify (Site Settings → Environment Variables):</p>
            <div className="env-list">
              <div className="env-item">
                <span className="env-key">DATABASE_URL</span>
                <span className="env-val">Tu connection string de Neon</span>
              </div>
              <div className="env-item">
                <span className="env-key">GEMINI_API_KEY</span>
                <span className="env-val">Tu API key de Google Gemini (gratis)</span>
              </div>
            </div>
            <div className="alert alert-info" style={{marginTop:12, marginBottom:0}}>
              💡 En Neon: Dashboard → Tu proyecto → Connection Details → Connection string (modo "pooled")
            </div>
          </div>
        </div>

        <div className="card step-card">
          <div className="step-num">2</div>
          <div className="step-content">
            <div className="card-title">INICIALIZAR BASE DE DATOS</div>
            <p className="step-desc">Crea las tablas necesarias en Neon. Solo necesitas hacerlo una vez.</p>
            <button className="btn btn-primary" onClick={initDB} disabled={initLoading}>
              {initLoading ? <><span className="spinner" /> Inicializando...</> : '🗄️ Crear Tablas'}
            </button>
            {initResult && (
              <div className={`alert ${initResult.ok ? 'alert-success' : 'alert-error'}`} style={{marginTop:12,marginBottom:0}}>
                {initResult.msg}
              </div>
            )}
          </div>
        </div>

        <div className="card step-card">
          <div className="step-num">3</div>
          <div className="step-content">
            <div className="card-title">VERIFICAR CONEXIÓN</div>
            <p className="step-desc">Prueba que todo esté funcionando correctamente.</p>
            <button className="btn btn-secondary" onClick={testDB} disabled={testLoading}>
              {testLoading ? <><span className="spinner" /> Probando...</> : '🔌 Probar Conexión'}
            </button>
            {testResult && (
              <div className={`alert ${testResult.ok ? 'alert-success' : 'alert-error'}`} style={{marginTop:12,marginBottom:0}}>
                {testResult.msg}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card deploy-card">
        <div className="card-title">🚀 GUÍA DE DESPLIEGUE EN NETLIFY</div>
        <ol className="deploy-steps">
          <li>
            <strong>Subir a GitHub</strong>
            <p>Sube este proyecto a un repositorio en GitHub</p>
            <code>git init && git add . && git commit -m "init" && git push</code>
          </li>
          <li>
            <strong>Conectar con Netlify</strong>
            <p>En Netlify: New site → Import from Git → Selecciona tu repo</p>
          </li>
          <li>
            <strong>Configuración de build</strong>
            <p>Build command: <code>npm run build</code> · Publish directory: <code>dist</code></p>
          </li>
          <li>
            <strong>Variables de entorno</strong>
            <p>En Site Settings → Environment Variables agrega DATABASE_URL y GEMINI_API_KEY</p>
          </li>
          <li>
            <strong>Deploy → Inicializar DB → ¡Listo!</strong>
            <p>Una vez desplegado, ve a esta página y haz clic en "Crear Tablas"</p>
          </li>
        </ol>
      </div>
    </div>
  )
}
