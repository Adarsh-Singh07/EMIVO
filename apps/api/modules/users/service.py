from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import DomainException
from modules.users.models import User
from modules.users.repository import UserRepository
from modules.users.schemas import UserUpdate

class UserService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repository = UserRepository(session)

    async def get_user_by_id(self, user_id: str) -> User:
        user = await self.repository.get_by_id(user_id)
        if not user:
            raise DomainException("User not found", code="NOT_FOUND", status_code=404)
        return user

    async def update_user(self, user_id: str, data: UserUpdate) -> User:
        user = await self.get_user_by_id(user_id)
        if data.first_name is not None:
            user.first_name = data.first_name
        if data.last_name is not None:
            user.last_name = data.last_name
        if data.mfa_enabled is not None:
            user.mfa_enabled = data.mfa_enabled
        if data.addresses is not None:
            user.addresses = data.addresses
        if data.wishlist is not None:
            user.wishlist = data.wishlist
        
        return await self.repository.update(user)
