import asyncio
import httpx

async def main():
    async with httpx.AsyncClient() as client:
        r = await client.get("http://localhost:8000/api/v1/store/products")
        if r.status_code == 200:
            print(r.json())
        else:
            print("Failed to get products", r.status_code)

if __name__ == "__main__":
    asyncio.run(main())
