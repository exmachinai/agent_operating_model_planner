"""WP-1 — Harness-Compiler + Export (Schritt 8/9, Gate 3)."""

from __future__ import annotations

import hashlib
import io
import zipfile

from fastapi.testclient import TestClient


def test_compile_requires_gate2(client: TestClient) -> None:
    pid = client.post("/v1/projects", json={"title": "Noch nicht freigegeben"}).json()["id"]
    resp = client.post(f"/v1/projects/{pid}/harness")
    assert resp.status_code == 409


def test_compile_returns_graph(client: TestClient, gate2_project: str) -> None:
    resp = client.post(f"/v1/projects/{gate2_project}/harness")
    assert resp.status_code == 201
    graph = resp.json()
    assert graph["status"] == "draft"
    assert graph["iteration"] == 1
    kinds = {n["kind"] for n in graph["nodes"]}
    assert "orchestrator" in kinds and "evaluator" in kinds and "hitl" in kinds
    assert graph["hitl_points"]
    assert graph["zip_name"].endswith(".harness.zip")


def test_get_harness_404_before_compile(client: TestClient, gate2_project: str) -> None:
    assert client.get(f"/v1/projects/{gate2_project}/harness").status_code == 404


def test_revise_sequence_then_parallel(client: TestClient, gate2_project: str) -> None:
    client.post(f"/v1/projects/{gate2_project}/harness")
    seq = client.post(
        f"/v1/projects/{gate2_project}/harness/revise",
        json={"command": "sequence", "note": "seriell ordnen"},
    )
    assert seq.status_code == 201
    assert seq.json()["iteration"] == 2
    # Im sequenziellen Modus hängt mindestens ein Worker an einem anderen Worker.
    nodes = {n["id"]: n for n in seq.json()["nodes"]}
    workers = [n for n in nodes.values() if n["kind"] == "worker"]
    assert any(
        any(dep in nodes and nodes[dep]["kind"] == "worker" for dep in w["depends_on"])
        for w in workers
    )


def test_agent_crud_add_update_delete(client: TestClient, gate2_project: str) -> None:
    base = client.post(f"/v1/projects/{gate2_project}/harness").json()
    n_agents = len(base["agents"])

    add = client.post(
        f"/v1/projects/{gate2_project}/harness/revise",
        json={
            "command": "agent",
            "op": "add",
            "agent": {
                "id": "", "role": "Daten-Agent", "name": "Daten Agent", "kind": "worker",
                "mission": "Pflegt Datenqualität und Lineage über alle Meilensteine hinweg.",
            },
        },
    )
    assert add.status_code == 201
    agents = add.json()["agents"]
    assert len(agents) == n_agents + 1
    new = next(a for a in agents if a["name"] == "daten-agent")

    upd = client.post(
        f"/v1/projects/{gate2_project}/harness/revise",
        json={"command": "agent", "op": "update", "agent_id": new["id"],
              "agent": {"role": "Daten-Agent", "name": "daten-agent", "kind": "worker",
                        "mission": "Aktualisierte Mission mit ausreichender Tiefe für Delegation."}},
    )
    assert upd.status_code == 201

    dele = client.post(
        f"/v1/projects/{gate2_project}/harness/revise",
        json={"command": "agent", "op": "delete", "agent_id": new["id"]},
    )
    assert dele.status_code == 201
    assert len(dele.json()["agents"]) == n_agents


def test_agent_add_invalid_returns_422(client: TestClient, gate2_project: str) -> None:
    client.post(f"/v1/projects/{gate2_project}/harness")
    resp = client.post(
        f"/v1/projects/{gate2_project}/harness/revise",
        json={"command": "agent", "op": "add"},
    )
    assert resp.status_code == 422


def test_gate3_freezes_and_blocks_revision(client: TestClient, gate2_project: str) -> None:
    client.post(f"/v1/projects/{gate2_project}/harness")
    approve = client.post(f"/v1/projects/{gate2_project}/harness/approve")
    assert approve.status_code == 200
    project = approve.json()
    assert project["status"] == "compiled"
    assert project["gate3_approved_at"] is not None
    assert project["harness_zip_sha256"].startswith("sha256:")

    # Nach Gate 3 keine Revision mehr.
    resp = client.post(
        f"/v1/projects/{gate2_project}/harness/revise", json={"command": "parallel"}
    )
    assert resp.status_code == 422


def test_download_zip_integrity(client: TestClient, gate2_project: str) -> None:
    client.post(f"/v1/projects/{gate2_project}/harness")
    client.post(f"/v1/projects/{gate2_project}/harness/approve")
    resp = client.get(f"/v1/projects/{gate2_project}/harness/download")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/zip"

    zf = zipfile.ZipFile(io.BytesIO(resp.content))
    names = zf.namelist()
    root = names[0].split("/")[0]
    must_have = [
        "CLAUDE.md", "INSTALL.md", "USERGUIDE.md", "HANDOVER.md", "checksums.txt",
        "plan/msp.yaml", "plan/raci.yaml", ".claude/settings.json",
    ]
    for rel in must_have:
        assert f"{root}/{rel}" in names, f"fehlt: {rel}"

    # checksums.txt muss zu den tatsächlichen Datei-Hashes passen.
    checks = zf.read(f"{root}/checksums.txt").decode("utf-8").strip().splitlines()
    by_path = {}
    for line in checks:
        digest, path = line.split("  ", 1)
        by_path[path] = digest
    for path, expected in by_path.items():
        actual = hashlib.sha256(zf.read(f"{root}/{path}")).hexdigest()
        assert actual == expected, f"Checksumme weicht ab: {path}"


def test_handover_md_contains_setup(client: TestClient, gate2_project: str) -> None:
    client.post(f"/v1/projects/{gate2_project}/harness")
    client.post(f"/v1/projects/{gate2_project}/harness/approve")
    resp = client.get(f"/v1/projects/{gate2_project}/harness/download")
    zf = zipfile.ZipFile(io.BytesIO(resp.content))
    root = zf.namelist()[0].split("/")[0]
    handover = zf.read(f"{root}/HANDOVER.md").decode("utf-8")
    assert "Claude Code" in handover and "Cowork" in handover
    assert "/run-harness" in handover


def test_harness_files_matches_zip(client: TestClient, gate2_project: str) -> None:
    """Der entpackte Files-Export ist bit-identisch zur Zip (gleiche Dateien + Hashes)."""
    client.post(f"/v1/projects/{gate2_project}/harness")
    client.post(f"/v1/projects/{gate2_project}/harness/approve")

    zf = zipfile.ZipFile(
        io.BytesIO(client.get(f"/v1/projects/{gate2_project}/harness/download").content)
    )
    zip_root = zf.namelist()[0].split("/")[0]
    zip_files = {
        n[len(zip_root) + 1 :]: zf.read(n)
        for n in zf.namelist()
        if not n.endswith("/")
    }

    resp = client.get(f"/v1/projects/{gate2_project}/harness/files")
    assert resp.status_code == 200
    body = resp.json()
    assert body["root"] == zip_root
    assert body["zip_name"].endswith(".harness.zip")
    assert body["zip_sha256"].startswith("sha256:")

    files = {f["path"]: f["content"] for f in body["files"]}
    # Gleiche Pfade wie in der Zip (inkl. checksums.txt) …
    assert set(files) == set(zip_files), "Datei-Menge weicht von der Zip ab"
    assert "checksums.txt" in files
    # … und bit-identische Inhalte.
    for path, content in files.items():
        assert content.encode("utf-8") == zip_files[path], f"Inhalt weicht ab: {path}"

    # checksums.txt deckt den entpackten Ordner korrekt ab.
    for line in files["checksums.txt"].strip().splitlines():
        digest, path = line.split("  ", 1)
        assert hashlib.sha256(files[path].encode("utf-8")).hexdigest() == digest


def test_harness_files_404_before_compile(client: TestClient, gate2_project: str) -> None:
    assert client.get(f"/v1/projects/{gate2_project}/harness/files").status_code == 404
