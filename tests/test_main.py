from httpx import AsyncClient, ASGITransport
import pytest
from main import app  # Your FastAPI app

@pytest.mark.asyncio
async def test_register_login_flow():
    transport = ASGITransport(app=app)  # ⬅️ Removed lifespan
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/register", json={
            "email": "test@example.com",
            "password": "Test1234!",
            "first_name": "Test",
            "last_name": "User"
        })
        assert res.status_code in [200, 400]

        res = await client.post("/login", json={
            "email": "test@example.com",
            "password": "Test1234!"
        })
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert "user_id" in data
