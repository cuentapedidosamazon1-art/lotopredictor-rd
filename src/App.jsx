import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Ingresar from './pages/Ingresar.jsx'
import Historial from './pages/Historial.jsx'
import Setup from './pages/Setup.jsx'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="app-header">
          <div className="header-inner">
            <div className="logo">
              <span className="logo-icon">🎱</span>
              <div>
                <div className="logo-title">LotoPredictor</div>
                <div className="logo-sub">LEIDSA · República Dominicana</div>
              </div>
            </div>
            <nav className="app-nav">
              <NavLink to="/" end className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
                Predicciones
              </NavLink>
              <NavLink to="/ingresar" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
                Ingresar Sorteo
              </NavLink>
              <NavLink to="/historial" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
                Historial
              </NavLink>
              <NavLink to="/setup" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
                Configurar
              </NavLink>
            </nav>
          </div>
        </header>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/ingresar" element={<Ingresar />} />
            <Route path="/historial" element={<Historial />} />
            <Route path="/setup" element={<Setup />} />
          </Routes>
        </main>

        <footer className="app-footer">
          <p>LotoPredictor RD — Uso personal. Las predicciones son estadísticas, no garantías.</p>
        </footer>
      </div>
    </BrowserRouter>
  )
}

export default App
