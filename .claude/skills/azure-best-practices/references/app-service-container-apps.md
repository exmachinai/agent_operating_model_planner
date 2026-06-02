# Compute-Host-Auswahl für Azure-native Apps

Den Host nicht aus Gewohnheit wählen, sondern nach Workload. Faustregeln:

## Entscheidungshilfe

| Workload | Empfohlener Host |
|---|---|
| Klassische Web-App / API, ein Stack, kein Container-Zwang | **App Service** |
| Microservices, mehrere Container, Dapr, KEDA-Scaling, scale-to-zero | **Container Apps** |
| Event-/Trigger-getrieben, kurze Ausführungen, Pay-per-Execution | **Functions** |
| Volle Kubernetes-Kontrolle nötig, eigenes Ökosystem | **AKS** (nur wenn wirklich nötig) |
| Einzelner Container, minimaler Betrieb, keine Orchestrierung | **Container Instances (ACI)** |

**Default-Empfehlung:** Im Zweifel **Container Apps** für containerisierte
Workloads (managed, scale-to-zero, KEDA/Dapr ohne K8s-Betriebslast) und
**App Service** für klassische, nicht-containerisierte Web-Apps. **AKS** nur
wählen, wenn ein konkreter Grund für volle Kubernetes-Kontrolle besteht – die
Betriebslast ist deutlich höher.

## Gemeinsame Defaults (alle Hosts)

- **Managed Identity** aktivieren, App liest Secrets aus Key Vault.
- **HTTPS only**, TLS ≥ 1.2.
- **Application Insights** verbinden.
- **Health Probes** definieren.
- **Deployment Slots** (App Service) bzw. **Revisions** (Container Apps) für
  Zero-Downtime-Deployments und schnelles Rollback.
- **Auto-Scaling-Regeln** an Lastprofil ausrichten, nicht fix überdimensionieren.

## App Service – Hinweise

- Linux-Plan bevorzugen (günstiger, breitere Runtime-Auswahl), außer bei
  Windows-spezifischen Abhängigkeiten.
- `alwaysOn` für produktive APIs aktivieren.
- Slots: Deploy nach `staging`, dann Swap nach `production`.

## Container Apps – Hinweise

- **Scale-to-zero** für kosteneffiziente, sporadische Workloads.
- **KEDA** für event-getriebenes Scaling (Queue-Länge etc.).
- **Dapr** nur aktivieren, wenn die Bausteine (Pub/Sub, State, Service Invoke)
  wirklich genutzt werden.
- Revisions für kontrolliertes Traffic-Splitting / Canary.

## Functions – Hinweise

- **Flex Consumption / Consumption** für echtes Pay-per-Use.
- Premium-Plan nur bei VNet-Integration oder Cold-Start-Sensitivität.
- Idempotenz der Trigger sicherstellen (Events können mehrfach kommen).

## Kostenfalle vermeiden

Nicht den teuersten Plan "sicherheitshalber" wählen. Mit kleinerem Tier starten,
Auto-Scaling und Monitoring nutzen, anhand realer Last anpassen.
