from unittest.mock import AsyncMock

import pytest


@pytest.mark.asyncio
async def test_business_slug_uniqueness_failure():
    mock_business_repo = AsyncMock()
    mock_business_repo.check_slug_exists.return_value = True

    async def create_business_service(name: str, slug: str, repo: AsyncMock):
        exists = await repo.check_slug_exists(slug)
        if exists:
            raise ValueError(f"Business with slug '{slug}' already exists")
        return await repo.create(name=name, slug=slug)

    with pytest.raises(ValueError, match="already exists"):
        await create_business_service("Acme Corp", "acme-corp", mock_business_repo)

    mock_business_repo.check_slug_exists.assert_called_once_with("acme-corp")
