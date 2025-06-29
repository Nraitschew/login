# Anymize Login Server - Elestio Deployment Guide

## Übersicht
Dieser Login-Server ist eine vollständige Authentifizierungslösung für alle Anymize-Anwendungen. Er wird auf Elestio unter der Domain `login.anymize.ai` gehostet.

## Elestio Service-Auswahl

### Empfohlene Option: Docker Service
1. **Service**: Docker (oder Docker Compose)
2. **Vorteile**:
   - Exakte Kontrolle über Dependencies
   - Automatische Builds von GitHub
   - docker-compose.elestio.yml bereits optimiert
   - Keine unnötigen Datenbanken
   - Production-ready Konfiguration

## Deployment-Schritte

### 1. Elestio Service erstellen
1. Login bei Elestio
2. "Create Service" → "Docker" wählen
3. Server-Standort: Frankfurt (DE) für beste Performance
4. Service-Name: `anymize-login`
5. Repository URL: `https://github.com/Nraitschew/login`
6. Docker Compose File: `docker-compose.elestio.yml`

### 2. Domain konfigurieren
1. In Elestio Service-Einstellungen → "Domain"
2. Custom Domain hinzufügen: `login.anymize.ai`
3. DNS-Einträge bei Ihrem Provider erstellen:
   ```
   Type: CNAME
   Name: login
   Value: [Ihre-Elestio-URL].vm.elestio.app
   ```

### 3. Umgebungsvariablen setzen
In Elestio → Service → Environment Variables:

```bash
# Server Configuration
PORT=7500
NODE_ENV=production

# NocoDB Configuration
NOCODB_BASE=https://nocodb-s9q9e-u27285.vm.elestio.app/api/v2
NOCODB_TOKEN=wlf8BFp6fkR-NNoL9TZQ91sJ8msFwB_kWhXqPyTZ

# Webhook URLs
EMAIL_WEBHOOK=https://n8n-96aou-u27285.vm.elestio.app/webhook/191e0984-2c5d-46e8-b999-810100f4ee77
SMS_WEBHOOK=https://n8n-96aou-u27285.vm.elestio.app/webhook/6351524e-512c-470d-80a2-b624a3ec240d

# Session Configuration
SESSION_SECRET=[GENERATE-SECURE-RANDOM-STRING]

# CORS Origins
ALLOWED_ORIGINS=https://anymize.ai,https://explore.anymize.ai,https://chat.anymize.ai,https://login.anymize.ai

# After login redirect
SUCCESS_REDIRECT=https://explore.anymize.ai
```

### 4. Git Repository Setup

1. **Repository ist bereits vorbereitet**: `https://github.com/Nraitschew/login`
2. **Automatische Builds**: GitHub Actions erstellt Docker Images
3. **Auto-Deploy**: Bei jedem Push zu main/master

### 5. Elestio Konfiguration

Elestio erkennt automatisch:
- `docker-compose.elestio.yml` für Production
- `elestio.yml` für Service-Konfiguration
- Environment Variables aus der UI

### 6. Health Check einrichten
- Health Check URL: `/health`
- Interval: 30 Sekunden
- Timeout: 10 Sekunden

## Post-Deployment

### 1. SSL-Zertifikat prüfen
Elestio sollte automatisch Let's Encrypt SSL-Zertifikate bereitstellen. Prüfen Sie:
- https://login.anymize.ai lädt ohne Zertifikatsfehler

### 2. Funktionstest
1. Öffnen Sie https://login.anymize.ai
2. Testen Sie Login mit E-Mail
3. Testen Sie Login mit Telefonnummer
4. Prüfen Sie Weiterleitung nach erfolgreichem Login

### 3. Monitoring einrichten
In Elestio Dashboard:
- CPU & Memory Usage überwachen
- Response Times prüfen
- Error Logs überprüfen

## Integration in Anwendungen

### Framer-Integration
```typescript
// In Ihrer Framer-Komponente
const loginUrl = 'https://login.anymize.ai';
const currentUrl = encodeURIComponent(window.location.href);
window.location.href = `${loginUrl}?redirect=${currentUrl}&check_session=true`;
```

### Session-Prüfung
```javascript
// Lokale Session prüfen
const sessionData = localStorage.getItem('anymize_session');
if (sessionData) {
    const session = JSON.parse(sessionData);
    // Session ist max. 48h gültig
    if (Date.now() - session.timestamp < 48 * 60 * 60 * 1000) {
        // User ist eingeloggt
        console.log('User:', session.user);
    }
}
```

## Sicherheitshinweise

1. **Session Secret**: Generieren Sie einen sicheren, zufälligen String (min. 32 Zeichen)
2. **CORS**: Nur vertrauenswürdige Domains in ALLOWED_ORIGINS aufnehmen
3. **Rate Limiting**: Bereits aktiviert (5 Anfragen pro 15 Minuten)
4. **HTTPS**: Immer HTTPS verwenden, niemals HTTP

## Troubleshooting

### Problem: "Cannot connect to NocoDB"
- Prüfen Sie NOCODB_BASE URL
- Prüfen Sie NOCODB_TOKEN
- Stellen Sie sicher, dass Elestio-Server auf NocoDB zugreifen kann

### Problem: "Webhooks funktionieren nicht"
- Prüfen Sie Webhook-URLs in Umgebungsvariablen
- Testen Sie Webhooks direkt mit curl/Postman
- Prüfen Sie N8N-Logs

### Problem: "CORS-Fehler"
- Domain zu ALLOWED_ORIGINS hinzufügen
- Service neu starten nach Änderung

## Wartung

### Updates
1. Neue Version in Git pushen (bei Git-Integration)
2. Oder: Neue ZIP hochladen
3. Service wird automatisch neu gestartet

### Backup
- Elestio erstellt automatische Backups
- Sessions sind in NocoDB gespeichert (separates Backup)

### Logs
- In Elestio Dashboard → Logs
- Fehler werden mit Timestamp geloggt

## Kosten
- Node.js Service auf Elestio: ~5-10€/Monat
- Traffic: Inklusive
- SSL-Zertifikate: Kostenlos (Let's Encrypt)

## Support
Bei Problemen:
1. Elestio Support für Hosting-Fragen
2. GitHub Issues für Code-Probleme
3. NocoDB/N8N Dokumentation für Integration