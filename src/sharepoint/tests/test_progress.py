import json
from pathlib import Path

import src.sharepoint.import_inventory as mod


def test_save_and_load_progress_round_trip(tmp_path, monkeypatch):
    monkeypatch.setattr(mod, "PROGRESS_PATH", tmp_path / ".progress.json")
    mod.save_progress(phase="insert", last_batch=12, total=655)
    loaded = mod.load_progress()
    assert loaded["phase"] == "insert"
    assert loaded["last_batch"] == 12
    assert loaded["total"] == 655
    assert "started_at" in loaded


def test_load_progress_returns_none_when_absent(tmp_path, monkeypatch):
    monkeypatch.setattr(mod, "PROGRESS_PATH", tmp_path / ".nope.json")
    assert mod.load_progress() is None


def test_clear_progress_removes_file(tmp_path, monkeypatch):
    p = tmp_path / ".progress.json"
    p.write_text(json.dumps({"phase": "insert"}))
    monkeypatch.setattr(mod, "PROGRESS_PATH", p)
    mod.clear_progress()
    assert not p.exists()


def test_clear_progress_is_idempotent(tmp_path, monkeypatch):
    monkeypatch.setattr(mod, "PROGRESS_PATH", tmp_path / "never.json")
    mod.clear_progress()  # must not raise
