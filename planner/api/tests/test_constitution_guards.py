"""Constitution-Content-Guards CG-1…6 (Teststrategie §6, Risk R2, P0).

Strukturtests prüfen *Form*; diese Guards prüfen den **Inhalt** der generierten
Deliverables (entpackter Harness) gegen die eingefrorenen Eckpfeiler der Constitution.

Befund-Hinweis: CG-6 ist aktuell **rot** (dokumentiert als `xfail`) — der Compiler
strippt die AEGIRA-Constitution NICHT, wenn `aegira_internal=False` (use_preferences
=False). Siehe gap_analyse/FINDINGS_REMEDIATION_2026-06-03.md (Finding F-CG6).
"""

from __future__ import annotations

import re

import pytest
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
                         nature: str = "concept") -> dict[str, str]:
    """Kompiliert ein Projekt bis Gate 3 und gibt {pfad: inhalt} der Deliverables."""
    pid = client.post(
        "/v1/projects", json={"title": "Kundenprojekt", "description": "Beratung"}
    ).json()["id"]
    client.patch(
        f"/v1/projects/{pid}/understanding",
        json={"project_nature": nature, "understanding_summary": "Vorhaben mit klarem Ziel.",
              "aegira_internal": aegira_internal},
    )
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


@pytest.mark.xfail(
    reason="F-CG6 (P1): HANDOVER.md listet die internen Produktnamen (Constitution-"
    "Erinnerung) auch bei aegira_internal=False. 'AEGIRA' selbst ist Positivliste/erlaubt. "
    "Siehe gap_analyse/FINDINGS_REMEDIATION_2026-06-03.md.",
    strict=False,
)
def test_cg6_external_deliverable_free_of_internal_product_names(client: TestClient) -> None:
    """CG-6 (Kundenschutz): Externprojekt (aegira_internal=False) → KEINE internen
    AEGIRA-PRODUKTNAMEN (AI Navigator/Guardian/Commander) im Deliverable.

    Hinweis: Der Plattformname „AEGIRA" steht auf der Positivliste und ist erlaubt —
    geprüft werden NUR die kommerziellen Produktnamen (interne Constitution)."""
    files = _build_harness_files(client, aegira_internal=False)
    blob = "\n".join(files.values())
    leaks = [t for t in ALLOWED_PRODUCTS if t in blob]
    assert not leaks, f"interne Produktnamen im Kundendeliverable: {leaks}"
