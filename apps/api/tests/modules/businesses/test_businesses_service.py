from unittest.mock import AsyncMock

import pytest

from core.exceptions import DomainException
from modules.businesses.models import Business
from modules.businesses.schemas import BusinessCreate, BusinessUpdate
from modules.businesses.service import BusinessService


@pytest.fixture
def mock_repo():
    return AsyncMock()

@pytest.fixture
def service(mock_repo):
    return BusinessService(mock_repo)

@pytest.mark.asyncio
async def test_create_business_success(service, mock_repo):
    mock_repo.get_by_slug.return_value = None
    mock_repo.create.return_value = Business(
        id="123", name="Test", slug="test", contact_email="test@test.com"
    )
    
    data = BusinessCreate(
        name="Test", slug="test", contact_email="test@test.com"
    )
    result = await service.create_business(data)
    
    assert result.name == "Test"
    mock_repo.create.assert_called_once()

@pytest.mark.asyncio
async def test_create_business_slug_taken(service, mock_repo):
    mock_repo.get_by_slug.return_value = Business(id="existing")
    data = BusinessCreate(
        name="Test", slug="test", contact_email="test@test.com"
    )
    
    with pytest.raises(DomainException) as exc:
        await service.create_business(data)
        
    assert exc.value.code == "SLUG_TAKEN"

@pytest.mark.asyncio
async def test_get_business_success(service, mock_repo):
    mock_repo.get_by_id.return_value = Business(id="123")
    result = await service.get_business("123")
    assert result.id == "123"

@pytest.mark.asyncio
async def test_get_business_not_found(service, mock_repo):
    mock_repo.get_by_id.return_value = None
    with pytest.raises(DomainException) as exc:
        await service.get_business("123")
    assert exc.value.code == "NOT_FOUND"

@pytest.mark.asyncio
async def test_update_business(service, mock_repo):
    mock_business = Business(id="123", name="Old")
    mock_repo.get_by_id.return_value = mock_business
    mock_repo.update.return_value = Business(id="123", name="New")
    
    data = BusinessUpdate(name="New")
    result = await service.update_business("123", data)
    
    assert result.name == "New"
    mock_repo.update.assert_called_once()
    assert mock_business.name == "New"

@pytest.mark.asyncio
async def test_delete_business(service, mock_repo):
    mock_business = Business(id="123", is_active=True)
    mock_repo.get_by_id.return_value = mock_business
    
    await service.delete_business("123")
    
    mock_repo.update.assert_called_once()
    assert mock_business.is_active is False
    assert mock_business.deleted_at is not None
