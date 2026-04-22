import pytest
import responses
from src.sharepoint.import_inventory import (
    SITE_URL,
    post_batch,
    RetryExhaustedError,
)


BATCH_URL = f"{SITE_URL}/_api/$batch"


@responses.activate
def test_post_batch_succeeds_on_200():
    responses.add(responses.POST, BATCH_URL, status=200, body="ok")
    post_batch("body", "boundary_x", token="t", max_retries=3, base_delay=0)
    assert len(responses.calls) == 1


@responses.activate
def test_post_batch_retries_on_429_respecting_retry_after(monkeypatch):
    sleeps: list[float] = []
    monkeypatch.setattr(
        "src.sharepoint.import_inventory.time.sleep",
        lambda s: sleeps.append(s),
    )
    responses.add(responses.POST, BATCH_URL, status=429,
                  headers={"Retry-After": "2"}, body="throttled")
    responses.add(responses.POST, BATCH_URL, status=200, body="ok")

    post_batch("body", "b", token="t", max_retries=3, base_delay=1)
    assert len(responses.calls) == 2
    assert sleeps == [2.0]


@responses.activate
def test_post_batch_exponential_backoff_when_no_retry_after(monkeypatch):
    sleeps: list[float] = []
    monkeypatch.setattr(
        "src.sharepoint.import_inventory.time.sleep",
        lambda s: sleeps.append(s),
    )
    for _ in range(3):
        responses.add(responses.POST, BATCH_URL, status=503, body="down")
    responses.add(responses.POST, BATCH_URL, status=200, body="ok")

    post_batch("body", "b", token="t", max_retries=5, base_delay=1)
    assert sleeps == [1.0, 2.0, 4.0]


@responses.activate
def test_post_batch_raises_after_max_retries(monkeypatch):
    monkeypatch.setattr(
        "src.sharepoint.import_inventory.time.sleep", lambda s: None)
    for _ in range(5):
        responses.add(responses.POST, BATCH_URL, status=503, body="down")
    with pytest.raises(RetryExhaustedError):
        post_batch("body", "b", token="t", max_retries=4, base_delay=1)


@responses.activate
def test_post_batch_does_not_retry_on_400():
    responses.add(responses.POST, BATCH_URL, status=400, body="bad")
    with pytest.raises(RetryExhaustedError):
        post_batch("body", "b", token="t", max_retries=5, base_delay=0)
    assert len(responses.calls) == 1  # no retries on 4xx other than 429


@responses.activate
def test_post_batch_retries_on_connection_error(monkeypatch):
    import requests as real_requests
    sleeps: list[float] = []
    monkeypatch.setattr(
        "src.sharepoint.import_inventory.time.sleep",
        lambda s: sleeps.append(s),
    )
    responses.add(responses.POST, BATCH_URL,
                  body=real_requests.exceptions.ConnectionError("boom"))
    responses.add(responses.POST, BATCH_URL, status=200, body="ok")

    post_batch("body", "b", token="t", max_retries=3, base_delay=1)
    assert len(responses.calls) == 2
    assert sleeps == [1.0]


@responses.activate
def test_post_batch_raises_after_max_retries_on_connection_error(monkeypatch):
    import requests as real_requests
    monkeypatch.setattr(
        "src.sharepoint.import_inventory.time.sleep", lambda s: None)
    for _ in range(5):
        responses.add(responses.POST, BATCH_URL,
                      body=real_requests.exceptions.ConnectionError("boom"))
    with pytest.raises(RetryExhaustedError) as exc:
        post_batch("body", "b", token="t", max_retries=4, base_delay=0)
    # Error message should reference the network failure
    assert "connection" in str(exc.value).lower() or "network" in str(exc.value).lower()


def test_acquire_token_falls_back_when_primary_client_returns_none(monkeypatch):
    import src.sharepoint.import_inventory as mod

    calls: list[str] = []

    class FakeApp:
        def __init__(self, client_id, authority=None, token_cache=None):
            self.client_id = client_id

        def get_accounts(self):
            return []

        def acquire_token_silent(self, scopes, account):
            return None

        def initiate_device_flow(self, scopes):
            return {"user_code": "ABC", "message": "go here", "device_code": "d"}

        def acquire_token_by_device_flow(self, flow):
            calls.append(self.client_id)
            # Primary client returns an error; fallback returns success.
            if self.client_id == mod.CLIENT_IDS[0]:
                return {"error": "invalid_client", "error_description": "blocked"}
            return {"access_token": "TOKEN_FROM_FALLBACK"}

    monkeypatch.setattr(mod, "_build_msal_app", lambda client_id: FakeApp(client_id))
    token = mod.acquire_token()
    assert token == "TOKEN_FROM_FALLBACK"
    assert calls == mod.CLIENT_IDS  # primary tried first, then fallback
