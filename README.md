# Anymize Login Server

🔐 Vollständiger Authentifizierungsserver für alle Anymize-Anwendungen, optimiert für Elestio Deployment.

## Features

- 🔐 E-Mail & SMS Authentifizierung
- 🍪 Session-Management über NocoDB
- 🌐 CORS-Support für alle Anymize-Domains
- ⚡ Rate Limiting zum Schutz vor Brute Force
- 🔒 Sichere Token-Generierung mit SHA-256
- 📱 Responsive Login-UI
- 🚀 Ready für Elestio Deployment

## Schnellstart

### 1. Abhängigkeiten installieren
```bash
npm install
```

### 2. Umgebungsvariablen konfigurieren
```bash
cp .env.example .env
# .env Datei mit Ihren Werten bearbeiten
```

### 3. Server starten

#### Development
```bash
npm run dev
```

#### Production
```bash
npm start
```

### 4. Docker (optional)
```bash
# Build und Start
docker-compose up -d

# Logs anzeigen
docker-compose logs -f
```

## Endpoints

- `GET /` - Login-Seite
- `POST /api/auth/request-code` - Code anfordern
- `POST /api/auth/verify` - Code verifizieren
- `POST /api/auth/session` - Session prüfen
- `POST /api/auth/logout` - Abmelden
- `GET /health` - Health Check

## Konfiguration

### Erforderliche Umgebungsvariablen

| Variable | Beschreibung | Beispiel |
|----------|--------------|----------|
| `PORT` | Server Port | `7500` |
| `NOCODB_BASE` | NocoDB API URL | `https://nocodb.example.com/api/v2` |
| `NOCODB_TOKEN` | NocoDB API Token | `your-token` |
| `EMAIL_WEBHOOK` | N8N Webhook für E-Mails | `https://n8n.example.com/webhook/...` |
| `SMS_WEBHOOK` | N8N Webhook für SMS | `https://n8n.example.com/webhook/...` |
| `SESSION_SECRET` | Secret für Sessions | `random-32-char-string` |
| `ALLOWED_ORIGINS` | Erlaubte CORS Origins | `https://anymize.ai,https://explore.anymize.ai` |

## Sicherheit

- ✅ Helmet.js für Security Headers
- ✅ Rate Limiting (5 Anfragen / 15 Minuten)
- ✅ CORS Whitelist
- ✅ Input Validation
- ✅ Secure Cookie Flags
- ✅ Token Hashing

## Deployment auf Elestio

### Quick Deploy

1. **Elestio Service erstellen:**
   - Service Type: `Docker`
   - Git Repository: `https://github.com/Nraitschew/login`
   - Docker Compose File: `docker-compose.elestio.yml`

2. **Environment Variables in Elestio setzen:**
   ```env
   NOCODB_BASE=https://your-nocodb.vm.elestio.app/api/v2
   NOCODB_TOKEN=your-nocodb-token
   EMAIL_WEBHOOK=https://your-n8n.vm.elestio.app/webhook/email-id
   SMS_WEBHOOK=https://your-n8n.vm.elestio.app/webhook/sms-id
   SESSION_SECRET=generate-random-32-char-string
   ```

3. **Custom Domain:**
   - Add Domain: `login.anymize.ai`
   - DNS CNAME: `login` → `[your-service].vm.elestio.app`

Siehe [DEPLOYMENT.md](./DEPLOYMENT.md) für detaillierte Anweisungen.

## Entwicklung

### Projekt-Struktur
```
login-server/
├── server.js           # Express Server Setup
├── routes/
│   └── auth.js        # Authentication Endpoints
├── public/
│   ├── index.html     # Login UI
│   └── app.js         # Frontend JavaScript
├── package.json       # Dependencies
├── Dockerfile         # Docker Image
├── docker-compose.yml # Docker Compose Config
└── .env.example       # Environment Variables Template
```

### Code-Stil
- ES6+ JavaScript
- Async/Await für asynchrone Operationen
- Fehlerbehandlung mit try/catch
- Kommentare auf Deutsch für UI-Texte

## Troubleshooting

### Server startet nicht
- Port 7500 bereits belegt? → Anderen Port in .env setzen
- Umgebungsvariablen fehlen? → .env.example prüfen

### Login funktioniert nicht
- NocoDB erreichbar? → NOCODB_BASE URL prüfen
- Webhooks konfiguriert? → N8N Workflows prüfen
- CORS-Fehler? → Domain zu ALLOWED_ORIGINS hinzufügen

### Sessions werden nicht gespeichert
- Cookies aktiviert? → Browser-Einstellungen prüfen
- HTTPS verwendet? → In Production erforderlich

## Support

Bei Fragen oder Problemen:
1. GitHub Issues erstellen
2. Logs prüfen (`docker-compose logs` oder Konsole)
3. Environment-Variablen verifizieren
