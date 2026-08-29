import logging
import os
import json
from pydantic import BaseModel
from typing import List

logger = logging.getLogger(__name__)

# Fallback models ordered by preference
GEMINI_MODELS = [
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-pro-latest"
]

class AISpecRow(BaseModel):
    name: str
    value: str

class AIResponseSchema(BaseModel):
    description: str
    specs: list[AISpecRow]

class AIProductService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            logger.warning("GEMINI_API_KEY is not set. AI generation will fail.")

    async def generate_product_details(self, name: str, brand: str = None, existing_desc: str = None) -> dict:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is missing.")

        try:
            from google import genai
            from google.genai import types
        except ImportError:
            raise RuntimeError("google-genai package is not installed.")

        client = genai.Client(api_key=self.api_key)

        brand_text = f" by {brand}" if brand else ""
        existing_desc_text = f"\nExisting description to improve upon:\n{existing_desc}" if existing_desc else ""

        prompt = f"""
You are an expert e-commerce copywriter and product data specialist.
Please generate an attractive, conversion-optimized HTML/Markdown description for the product "{name}"{brand_text}.
Additionally, search for and provide accurate technical specifications for this product. 
{existing_desc_text}

Guidelines:
- Return valid JSON matching the schema.
- The description should be compelling, highlighting key features.
- Specs should be factual (e.g., RAM, Storage, Dimensions, Warranty, etc.).
"""
        
        last_exception = None
        
        for model in GEMINI_MODELS:
            try:
                logger.info(f"Attempting AI generation with model: {model}")
                response = client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=AIResponseSchema,
                        tools=[{"google_search": {}}], # Enable Google Search Grounding
                        temperature=0.7
                    ),
                )
                
                # Parse the response text as JSON
                result = json.loads(response.text)
                return {
                    "description": result.get("description", ""),
                    "specs": result.get("specs", [])
                }
            except Exception as e:
                logger.warning(f"Model {model} failed: {e}")
                last_exception = e
                # Continue to next fallback model
        
        # If all models failed
        raise RuntimeError(f"All Gemini fallback models failed. Last error: {last_exception}")

