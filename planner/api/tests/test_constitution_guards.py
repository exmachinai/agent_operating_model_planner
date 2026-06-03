"""Constitution-Content-Guards CG-1…6 (Teststrategie §6, Risk R2, P0).

Strukturtests prüfen *Form*; diese Guards prüfen den **Inhalt** der generierten
Deliverables (entpackter Harness) gegen die eingefrorenen Eckpfeiler der Constitution.

Befund-Hinweis: CG-6 war **rot** (F-CG6, P0/Kundenschutz) und ist seit v0.9.5 **grün**:
bei `aegira_internal=False` (use_preferences=False) rendert der Compiler ein markenfreies
Deliverable (neutraler Plugin-Namespace `agent-harness`, keine Constitution-Produktnamen,
neutrale Generator-Attribution). PO-Entscheid: der Plattformname „AEGIRA" bleibt zulässig
(Positivliste) — gestrippt werden nur die Produktnamen. Siehe
gap_analyse/FINDINGS_REMEDIATION_2026-06-03.md (Finding F-CG6).
"""

from __future__ import annotations

import re

from fastapi.testclient import TestClient

# Eingefrorene Eckpfeiler (Constitution).
ALLOWED_PRODUCTS = ("AI Navigator", "AI Guardian", "AI Commander")
# Erfundene/falsche Produktnamen, die nie vorkommen dürfen.
FORBIDDEN_PRODUCT_VARIANTS = ("AI Sentinel", "AI Defender", "AI Protector", "AI Captain")
# Positive 100%-Claims (NICHT die Verbote „keine 100%-Claims").
HUNDRED_CLAIM = re.compile(
    r"(zu\s*100\s*%|100\s*%\s*(sicher|garantiert|abgedeckt|getestet)|"
    r"vollständig sicher|garantiert sicher)",
    re.IGNORECASE,
)


def _build_harness_files(client: TestClient, *, aegira_internal: bool,
                         use_preferences: bool = False,
                         nature: str = "concept",
                         project_type: str | None = None) -> dict[str, str]:
    """Kompiliert ein Projekt bis Gate 3 und gibt {pfad: inhalt} der Deliverables."""
    pid = client.post(
        "/v1/projects", json={"title": "Kundenprojekt", "description": "Beratung"}
    ).json()["id"]
    patch = {"project_nature": nature, "understanding_summary": "Vorhaben mit klarem Ziel.",
             "aegira_internal": aegira_internal, "use_preferences": use_preferences}
    if project_type is not None:
        patch["project_type"] = project_type
    client.patch(f"/v1/projects/{pid}/understanding", json=patch)
    client.post(f"/v1/projects/{pid}/approve-understanding")
    client.post(f"/v1/projects/{pid}/guardrails/clear", json={"proceed": True})
    client.post(f"/v1/projects/{pid}/plan")
    client.post(f"/v1/projects/{pid}/approve-plan")
    client.post(f"/v1/projects/{pid}/harness")
    client.post(f"/v1/projects/{pid}/harness/approve")
    body = client.get(f"/v1/projects/{pid}/harness/files").json()
    return {f["path"]: f["content"] for f in body["files"]}


def test_cg1_no_dach_anywhere(client: TestClient) -> None:
    """CG-1/CG-4: Niemals „DACH" — Rechtsräume sind DE/EU27-Rest/UK/CH."""
    for internal in (True, False):
        files = _build_harness_files(client, aegira_internal=internal)
        for path, content in files.items():
            assert not re.search(r"\bDACH\b", content), f"'DACH' in {path} (internal={internal})"


def test_cg2_no_positive_hundred_percent_claim(client: TestClient) -> None:
    """CG-2: Keine 100%-/Garantie-Claims (Verbots-Texte „keine 100%…" sind erlaubt)."""
    files = _build_harness_files(client, aegira_internal=True)
    for path, content in files.items():
        m = HUNDRED_CLAIM.search(content)
        assert m is None, f"100%-Claim in {path}: {m.group(0)!r}"


def test_cg3_no_invented_product_names(client: TestClient) -> None:
    """CG-3: Nur AI Navigator/Guardian/Commander — keine erfundenen Produktnamen."""
    files = _build_harness_files(client, aegira_internal=True)
    blob = "\n".join(files.values())
    for bad in FORBIDDEN_PRODUCT_VARIANTS:
        assert bad not in blob, f"erfundener Produktname: {bad}"


def test_cg5_aims_not_mitre_gms_as_primary(client: TestClient) -> None:
    """CG-5: Maturity = AIMS; MITRE/GMS nicht als Primärmodell im Deliverable."""
    files = _build_harness_files(client, aegira_internal=True)
    blob = "\n".join(files.values())
    assert "AIMS" in blob, "AIMS-Maturity nicht im Deliverable referenziert"
    # MITRE/GMS dürfen höchstens als Tiefenanalyse erwähnt sein, nie als Maturity-Primärmodell.
    assert not re.search(r"(MITRE|GMS)[^\n]{0,40}(Maturity|Reifegrad|Primärmodell)", blob, re.IGNORECASE)
    assert not re.search(r"(Maturity|Reifegrad)[^\n]{0,20}(MITRE|GMS)\b", blob, re.IGNORECASE)


def test_cg6_external_deliverable_is_brand_neutral(client: TestClient) -> None:
    """CG-6 (P0, Kundenschutz): Externprojekt (aegira_internal=False) → markenfreies
    Deliverable: KEINE internen Produktnamen, neutraler Plugin-Namespace `agent-harness`
    (kein `aegira-harness`), neutrale Generator-Attribution.

    Hinweis: Der Plattformname „AEGIRA" als Wort steht auf der Positivliste; gestrippt
    werden die kommerziellen Produktnamen sowie das strukturelle Scaffold-Branding."""
    # Externprojekt; der Drift-Guard erzwingt use_preferences=False (selbst wenn True übergeben).
    files = _build_harness_files(client, aegira_internal=False, use_preferences=True)
    blob = "\n".join(files.values())

    leaks = [t for t in ALLOWED_PRODUCTS if t in blob]
    assert not leaks, f"interne Produktnamen im Kundendeliverable: {leaks}"
    # Strukturelles Branding: neutraler Namespace + Attribution.
    assert not any("aegira-harness" in p for p in files), "aegira-harness-Pfad im Externdeliverable"
    assert "aegira-harness" not in blob, "aegira-harness im Inhalt des Externdeliverables"
    assert "AEGIRA Agent Operating Model Planner" not in blob, "AEGIRA-Generator-Attribution extern"


def test_cg6_external_it_devcontainer_is_brand_neutral(client: TestClient) -> None:
    """CG-6 für IT-Externprojekte: auch der Devcontainer-Name ist neutral (`agent-harness`)."""
    files = _build_harness_files(
        client, aegira_internal=False, use_preferences=True,
        nature="technical", project_type="it",
    )
    dev = files.get(".devcontainer/devcontainer.json", "")
    assert dev, "IT-Projekt ohne Devcontainer"
    assert "aegira-harness" not in dev, "aegira-harness im Devcontainer-Namen (extern)"


def test_cg6_internal_with_preferences_keeps_product_names(client: TestClient) -> None:
    """Gegenprobe/Symmetrie: AEGIRA-internes Projekt MIT Preferences DARF die
    Produktnamen enthalten (sonst wäre der Guard ein stummer Über-Stripper)."""
    files = _build_harness_files(client, aegira_internal=True, use_preferences=True)
    blob = "\n".join(files.values())
    assert any(p in blob for p in ALLOWED_PRODUCTS), "interne Produktnamen fehlen trotz Preferences"
