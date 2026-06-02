# Security-Baseline für Azure-native Apps

Diese Defaults gelten für jedes Projekt. Abweichungen nur mit dokumentierter
Begründung (ADR).

## Identität & Secrets

- **Managed Identity statt Secrets.** Für Service-zu-Service-Auth immer
  System- oder User-Assigned Managed Identity. Keine Connection Strings mit
  Keys, wenn die Ressource Entra-ID-Auth unterstützt (Storage, SQL, Service
  Bus, Cosmos DB, Key Vault u. a.).
- **Key Vault für alles Geheime.** Was nicht über Managed Identity läuft
  (z. B. Drittanbieter-API-Keys), kommt in Key Vault. App liest zur Laufzeit,
  nie zur Build-Zeit ins Image gebrannt.
- **Keine Secrets im Repo.** Nicht in Code, nicht in `*.bicep`/`*.tf`, nicht in
  Parameter-Dateien, nicht in `.env`-Dateien im Repo. `.gitignore` prüfen.
  Pre-commit-Secret-Scanning einrichten (z. B. gitleaks).
- **RBAC nach least privilege.** Workload-Identitäten bekommen die kleinste
  ausreichende Rolle (z. B. `Key Vault Secrets User`, nicht `Contributor`).
  Keine `Owner`-Zuweisung an App-Identitäten. Scope so eng wie möglich
  (Ressource > Resource Group > Subscription).

## Netzwerk

- **Private Endpoints**, wo der Dienst sie unterstützt und der Traffic intern
  bleiben soll (Storage, SQL, Key Vault, Cosmos DB).
- **Public Network Access deaktivieren** bei Datendiensten, sobald Private
  Endpoints stehen.
- **NSGs / Firewall-Regeln** restriktiv, Default-Deny, nur benötigte Ports.
- **Keine `0.0.0.0/0`-Regeln** außer bewusst für öffentliche Endpunkte.

## Transport & Daten

- **TLS ≥ 1.2 erzwingen**, HTTP→HTTPS-Redirect aktiv.
- **Encryption at rest** ist bei den meisten Diensten Default – aktiv lassen,
  bei Bedarf Customer-Managed Keys (CMK) über Key Vault.
- **Minimal-TLS und Cipher-Vorgaben** an App Service / Container Apps setzen.

## Logging & Monitoring

- **Diagnostic Settings** an alle Ressourcen, Ziel: Log Analytics Workspace.
- **Sicherheitsrelevante Events** erfassen (Auth-Fehler, Key-Vault-Zugriffe,
  Netzwerk-Deny).
- **Application Insights** für App-Telemetrie und verteiltes Tracing.
- **Microsoft Defender for Cloud** aktivieren, Empfehlungen abarbeiten.

## Konkrete Anti-Patterns (vermeiden)

- Connection String mit Account Key in App Settings → stattdessen Managed
  Identity.
- `az login` mit persönlichem Account in der CI → stattdessen Workload Identity
  Federation / Service Principal mit Federated Credential.
- Key Vault Access Policies → stattdessen Key Vault **RBAC**.
- Storage Account mit `allowBlobPublicAccess: true` ohne expliziten Grund.
- Wildcard-CORS (`*`) in Produktion.
