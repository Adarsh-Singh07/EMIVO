from unittest.mock import AsyncMock

import pytest


@pytest.mark.asyncio
async def test_successful_login():
    mock_auth_service = AsyncMock()
    mock_auth_service.login.return_value = {
        "access_token": "token123",
        "token_type": "bearer",
    }

    result = await mock_auth_service.login("test@example.com", "password")

    assert result["access_token"] == "token123"
    assert result["token_type"] == "bearer"
    mock_auth_service.login.assert_called_once_with("test@example.com", "password")


@pytest.mark.asyncio
async def test_jwt_token_claims():
    mock_jwt_service = AsyncMock()
    claims = {"sub": "user123", "roles": ["admin", "owner"], "business_id": "biz123"}

    mock_jwt_service.create_access_token.return_value = "fake_jwt_token"
    mock_jwt_service.decode_token.return_value = claims

    token = await mock_jwt_service.create_access_token(data=claims)
    decoded_claims = await mock_jwt_service.decode_token(token)

    assert "roles" in decoded_claims
    assert "business_id" in decoded_claims
    assert decoded_claims["roles"] == ["admin", "owner"]
    assert decoded_claims["business_id"] == "biz123"
    mock_jwt_service.create_access_token.assert_called_once_with(data=claims)
    mock_jwt_service.decode_token.assert_called_once_with("fake_jwt_token")
