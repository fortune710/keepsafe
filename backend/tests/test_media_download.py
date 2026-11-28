from unittest.mock import MagicMock

from utils.media_utils import get_media_bytes


def test_media_download_checks_status_and_timeout(monkeypatch):
    response = MagicMock()
    response.content = b"media"
    get = MagicMock(return_value=response)
    monkeypatch.setattr("utils.media_utils.requests.get", get)
    assert get_media_bytes("https://example.com/media") == b"media"
    assert get.call_args.kwargs["timeout"]
    response.raise_for_status.assert_called_once()
