# INSTALL — Sales Prototype

## 1. Voraussetzungen

- **Claude Code** (`>=2.0`) **oder Cowork** (`>=0.4`).
- Erreichbarer **Anthropic-Endpoint** (kein lokales LLM — Trust-Anforderung).
- `bash`, `unzip`, `shasum` (macOS/Linux) bzw. `CertUtil` (Windows).

## 2. Entpacken & Wurzel setzen

```bash
unzip sales-prototype_20260603_1e42c5.harness.zip
cd sales-prototype_20260603_1e42c5
export HARNESS_ROOT="$(pwd)"
```

## 3. Konfiguration

```bash
cp .env.example .env
# .env mit echten Werten füllen — niemals committen.
```

## 4. Integritäts-Check (Pflicht vor dem ersten Start)

```bash
shasum -a 256 -c checksums.txt   # macOS/Linux
# Windows (PowerShell):  Get-Content checksums.txt | ForEach-Object { ... }
```

Alle Zeilen müssen `OK` melden. Bei `FAILED` den Harness neu exportieren.

## 5. Start

```bash
claude            # oder: cowork
/run-harness
```

Der PMO-Agent übernimmt die Orchestrierung. HITL-Freigaben werden inline
angefragt; rote Risiko-Ampeln halten den Lauf (Stop-Hook).
