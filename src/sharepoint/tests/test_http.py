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
