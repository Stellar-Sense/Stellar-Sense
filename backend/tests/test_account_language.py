import pytest

from app.models import UserAccount

pytestmark = pytest.mark.asyncio


async def test_account_language_accepts_supported_and_legacy_codes(api):
    client, headers, _ = api
    for value, expected in [('zh', 'zh'), ('en', 'en'), ('zh-CN', 'zh'), ('en-US', 'en')]:
        response = await client.put(
            '/api/user/account', headers=headers[1],
            json={'name': 'Learner', 'dob': None, 'language': value},
        )
        assert response.status_code == 200, response.text
        assert response.json()['language'] == expected
        assert (await client.get('/api/user/account', headers=headers[1])).json()['language'] == expected


async def test_unsupported_language_does_not_overwrite_account(api):
    client, headers, _ = api
    before = (await client.get('/api/user/account', headers=headers[1])).json()
    response = await client.put(
        '/api/user/account', headers=headers[1],
        json={'name': 'Changed', 'dob': None, 'language': 'fr'},
    )
    assert response.status_code == 422
    assert (await client.get('/api/user/account', headers=headers[1])).json() == before


async def test_existing_unsupported_language_falls_back_to_chinese(api):
    client, headers, sessions = api
    await client.get('/api/user/account', headers=headers[1])
    async with sessions() as db:
        account = await db.get(UserAccount, 1)
        account.language = 'ja'
        await db.commit()
    assert (await client.get('/api/user/account', headers=headers[1])).json()['language'] == 'zh'
