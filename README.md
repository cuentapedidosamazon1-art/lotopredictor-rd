# 🎱 LotoPredictor RD

App web de predicciones para la Lotería LEIDSA (República Dominicana).

## Stack
- **Frontend**: React + Vite
- **Backend**: Netlify Functions (serverless)
- **Base de datos**: Neon (PostgreSQL serverless)
- **IA**: Claude API (Anthropic)

## Lógica de predicción

Cada vez que ingresas un nuevo sorteo, la app:

1. **Analiza frecuencias** — qué números han salido más veces históricamente
2. **Detecta números fríos** — números que llevan muchos sorteos sin aparecer
3. **Encuentra pares frecuentes** — qué números tienden a salir juntos
4. **Consulta a Claude** — con todos los datos estadísticos, la IA genera 3 combinaciones con estrategia y nivel de confianza

## Cómo desplegar

### 1. Crea tu base de datos en Neon
1. Ve a https://neon.tech y crea una cuenta gratuita
2. Crea un nuevo proyecto
3. Copia el **Connection String** (pooled) desde Dashboard → Connection Details

### 2. Obtén tu API key de Anthropic
1. Ve a https://console.anthropic.com
2. Crea una API key en API Keys

### 3. Sube a GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TU_USUARIO/lotopredictor-rd.git
git push -u origin main
```

### 4. Despliega en Netlify
1. Ve a https://app.netlify.com
2. "Add new site" → "Import an existing project" → GitHub
3. Selecciona tu repositorio
4. Build settings (se detectan automáticamente desde netlify.toml):
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Haz clic en "Deploy site"

### 5. Configura variables de entorno
En Netlify: Site settings → Environment variables → Add variable:
- `DATABASE_URL` = tu connection string de Neon
- `ANTHROPIC_API_KEY` = tu API key de Anthropic

### 6. Inicializa la base de datos
Una vez desplegado, ve a la sección **Configurar** en la app y haz clic en "Crear Tablas".

## Uso diario

1. **Después de cada sorteo** (miércoles/sábados): ve a "Ingresar Sorteo" y registra los 6 números
2. **Para ver predicciones**: ve a la pantalla principal y haz clic en "Nueva Predicción"
3. **Historial y estadísticas**: ve a "Historial" para ver el mapa de calor y todos los resultados

## Reglas del juego (Loto LEIDSA)
- Elige 6 números del 1 al 40
- Sorteos: miércoles y sábados
- Acierta 3+ números para ganar
- Acierta 6 para el premio mayor (mínimo RD$20 millones)
- Precio por jugada: RD$50
