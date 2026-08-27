import asyncio
import os
import httpx

async def main():
    async with httpx.AsyncClient() as client:
        # First login as admin to get token
        login = await client.post("https://api.elektrix.in/api/v1/auth/login", json={
            "email": "admin@apna.com",
            "password": "Password@123"
        }, headers={"X-Business-ID": "7f2515ec-c52f-4f74-8b31-0c421de54dc6"})
        
        token = login.json()["access_token"]
        
        # Then update product
        resp = await client.put(
            "https://api.elektrix.in/api/v1/products/abf89f95-8d62-4a67-b9d4-802c48750d80",
            json={"warranty_info": "2 Year Warranty!"},
            headers={"Authorization": f"Bearer {token}", "X-Business-ID": "7f2515ec-c52f-4f74-8b31-0c421de54dc6"}
        )
        print("Update status:", resp.status_code)
        print("Update JSON:", resp.text)
        
        # Fetch again
        fetch = await client.get(
            "https://api.elektrix.in/api/v1/store/products/abf89f95-8d62-4a67-b9d4-802c48750d80",
            headers={"X-Business-ID": "7f2515ec-c52f-4f74-8b31-0c421de54dc6"}
        )
        print("Fetch warranty_info:", fetch.json().get("warranty_info"))

asyncio.run(main())
