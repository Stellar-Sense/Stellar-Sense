from base64 import b64decode
from io import BytesIO

import pytest
from PIL import Image

from app.models import UserAvatar

pytestmark = pytest.mark.asyncio


def image_bytes(color="red", format="PNG", size=(400, 200)):
    output = BytesIO()
    Image.new("RGB", size, color).save(output, format=format)
    return output.getvalue()


@pytest.mark.parametrize("format", ["PNG", "JPEG", "WEBP"])
async def test_avatar_persists_replaces_and_is_isolated_by_user(api, format):
    client, headers, sessions = api
    assert (await client.get("/api/user/avatar", headers=headers[1])).json() == {"dataUrl": None}
    uploaded = await client.put("/api/user/avatar", headers=headers[1], content=image_bytes(format=format))
    assert uploaded.status_code == 200, uploaded.text
    data_url = uploaded.json()["dataUrl"]
    assert data_url.startswith("data:image/png;base64,")
    content = b64decode(data_url.split(",", 1)[1])
    with Image.open(BytesIO(content)) as avatar:
        assert avatar.size == (256, 256)
        assert avatar.format == "PNG"
    async with sessions() as db:
        assert (await db.get(UserAvatar, 1)).image == content
    assert (await client.get("/api/user/avatar", headers=headers[1])).json() == uploaded.json()
    assert (await client.get("/api/user/avatar", headers=headers[2])).json() == {"dataUrl": None}
    replaced = await client.put("/api/user/avatar", headers=headers[1], content=image_bytes("blue"))
    assert replaced.status_code == 200
    assert replaced.json() != uploaded.json()
    assert (await client.get("/api/user/avatar", headers=headers[1])).json() == replaced.json()
    assert (await client.delete("/api/user/avatar", headers=headers[2])).status_code == 200
    assert (await client.get("/api/user/avatar", headers=headers[1])).json() == replaced.json()
    assert (await client.delete("/api/user/avatar", headers=headers[1])).json() == {"dataUrl": None}
    assert (await client.get("/api/user/avatar", headers=headers[1])).json() == {"dataUrl": None}
    async with sessions() as db:
        assert await db.get(UserAvatar, 1) is None


async def test_invalid_upload_keeps_existing_avatar(api):
    client, headers, _ = api
    original = await client.put("/api/user/avatar", headers=headers[1], content=image_bytes())
    for content, status in [
        (b"<svg></svg>", 422),
        (image_bytes(format="GIF"), 415),
        (b"x" * (2 * 1024 * 1024 + 1), 413),
        (image_bytes(size=(4001, 4000)), 422),
    ]:
        response = await client.put("/api/user/avatar", headers=headers[1], content=content)
        assert response.status_code == status, response.text
        assert (await client.get("/api/user/avatar", headers=headers[1])).json() == original.json()


async def test_avatar_requires_login(api):
    client, _, _ = api
    assert (await client.get("/api/user/avatar")).status_code == 401
    assert (await client.put("/api/user/avatar", content=image_bytes())).status_code == 401
    assert (await client.delete("/api/user/avatar")).status_code == 401
