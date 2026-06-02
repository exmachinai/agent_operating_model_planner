# Azure Well-Architected Framework (WAF) – Review-Checkliste

Vor Abschluss jeder Architektur-Entscheidung die fünf Säulen durchgehen.
Nicht jede Frage trifft auf jedes Feature zu – aber jede sollte bewusst
beantwortet (oder bewusst verworfen) sein.

## 1. Reliability (Zuverlässigkeit)

- [ ] Gibt es einen Single Point of Failure? Wenn ja, bewusst akzeptiert?
- [ ] Zonenredundanz aktiviert, wo verfügbar und sinnvoll?
- [ ] Health Probes / Liveness & Readiness definiert?
- [ ] Retry-Logik mit Backoff für transiente Fehler (z. B. via SDK-Defaults)?
- [ ] Backup- und Restore-Strategie für zustandsbehaftete Dienste?
- [ ] Definierte RTO/RPO, falls geschäftskritisch?

## 2. Security

→ Details und Defaults in `security-baseline.md`. Kurz:

- [ ] Keine Secrets im Code/Repo. Managed Identity + Key Vault.
- [ ] RBAC nach least privilege, keine Owner-Rollen für Workloads.
- [ ] TLS erzwungen (min. 1.2), HTTP→HTTPS-Redirect.
- [ ] Private Endpoints / Service Endpoints statt öffentlicher Exposition,
      wo möglich.
- [ ] Diagnostic Logs an Log Analytics, sicherheitsrelevante Events erfasst.

## 3. Cost Optimization

- [ ] Passende SKU/Tier für die tatsächliche Last (kein Over-Provisioning)?
- [ ] Auto-Scaling statt fixer Überdimensionierung?
- [ ] Nicht-Prod-Umgebungen kleiner dimensioniert / abschaltbar?
- [ ] Tags für Kostenzuordnung (z. B. env, owner, cost-center)?
- [ ] Ungenutzte Ressourcen (Disks, IPs, Snapshots) vermieden?

## 4. Operational Excellence

- [ ] Alles als IaC, versioniert, über Pipeline deploybar (kein Klick-Ops)?
- [ ] Monitoring & Alerting definiert (Azure Monitor / Application Insights)?
- [ ] Strukturiertes Logging, Korrelations-IDs über Service-Grenzen?
- [ ] Deployments wiederholbar und idempotent?
- [ ] Runbooks / Dokumentation für Betrieb und Incident-Fälle?

## 5. Performance Efficiency

- [ ] Lastprofil bekannt und SKU darauf abgestimmt?
- [ ] Caching wo sinnvoll (z. B. Azure Cache for Redis, CDN)?
- [ ] Asynchrone Verarbeitung für lange Tasks (Queues, Events)?
- [ ] Datenbank-Indizes / Partitionierung geprüft?
- [ ] Lasttest vor Produktivgang bei kritischen Pfaden?

## Trade-offs bewusst machen

Die Säulen stehen oft in Spannung (z. B. Reliability ↔ Cost). Bei Konflikten
die Entscheidung samt Begründung in einem ADR (`docs/adr/`) festhalten, statt
sie implizit zu treffen.
