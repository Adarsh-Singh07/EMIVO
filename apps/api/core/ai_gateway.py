import json
import logging
import re
from typing import Any, Dict, List, Optional
import httpx

from core.config import settings

logger = logging.getLogger(__name__)

GEMINI_MODELS = [
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-flash-latest",
]


class AIGateway:
    """Multi-provider resilient AI gateway with automatic fallback across:
    1. 100MillionSeek (deepseek-v4.1-flash-free & jev-1.13-free — 100M tokens/day free)
    2. Google Gemini API (gemini-2.5-flash, gemini-1.5-flash)
    3. Agnes AI (apihub.agnes-ai.com)
    """

    @classmethod
    async def generate_product_details(
        cls,
        name: str,
        brand: Optional[str] = None,
        existing_desc: Optional[str] = None,
        category_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generates standardized product title, rich HTML description, specs,
        warranty info, and return policy using the multi-model fallback chain.
        """
        brand_clean = (brand or "").strip()
        brand_prompt = f" Brand: '{brand_clean}'." if brand_clean else ""
        cat_prompt = f" Category: '{category_name}'." if category_name else ""
        existing_prompt = f" Existing Notes: '{existing_desc}'." if existing_desc else ""

        system_prompt = (
            "You are a master e-commerce catalog editor for ELEKTRIX marketplace. "
            "Given product inputs, generate clean, production-ready product details formatted for storefront display.\n\n"
            "Return ONLY a valid JSON object with the following exact keys:\n"
            "{\n"
            '  "title": "Clean, standardized title in Title Case: [Brand] [Model/Name] ([Key Specs/Color/Capacity]). IMPORTANT: NEVER append redundant product category names or generic product words at the end (e.g. NEVER add \'Smartphone\', \'Mobile Phone\', \'Phone\', \'Laptop\', \'Item\'). Example: \'Apple iPhone 17 Pro (Titanium, 256 GB)\' - NEVER \'Apple iPhone 17 Pro Smartphone\'",\n'
            '  "description_html": "Rich, professional e-commerce HTML with <h2>Overview</h2><p>...</p><h3>Key Features</h3><ul><li><strong>Feature:</strong> Details</li>...</ul><h3>In The Box</h3><ul><li>...</li></ul> (DO NOT use markdown asterisks or backticks; use clean HTML tags only)",\n'
            '  "specs": [\n'
            '    {"name": "Color", "value": "Midnight Black"},\n'
            '    {"name": "Material / Type", "value": "..."},\n'
            '    {"name": "Dimensions / Weight", "value": "..."}\n'
            "  ],\n"
            '  "warranty_info": "1 Year Manufacturer Domestic Brand Warranty",\n'
            '  "return_policy": "7 Days Replacement Only for Technical Defects",\n'
            '  "suggested_category": "Main Category Name",\n'
            '  "suggested_subcategory": "Subcategory Name"\n'
            "}"
        )

        user_prompt = f"Product Name: '{name.strip()}'.{brand_prompt}{cat_prompt}{existing_prompt}"

        # -----------------------------------------------------------------
        # ATTEMPT 1: 100MillionSeek (Fast, high-capacity, free 100M/day)
        # -----------------------------------------------------------------
        seek_key = settings.seek100m_api_key.get_secret_value() if settings.seek100m_api_key else ""
        if seek_key:
            try:
                res = await cls._call_openai_compatible(
                    base_url=settings.seek100m_base_url,
                    api_key=seek_key,
                    model=settings.seek100m_model,
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    timeout=35.0,
                )
                if res and "title" in res and "description_html" in res:
                    logger.info("Product details generated via 100MillionSeek (%s)", settings.seek100m_model)
                    return cls._normalize_product_result(res, name, brand_clean)
            except Exception as e:
                logger.warning("100MillionSeek generation failed: %s. Trying Gemini...", e)

        # -----------------------------------------------------------------
        # ATTEMPT 2: Google Gemini API
        # -----------------------------------------------------------------
        gemini_key = settings.gemini_api_key.get_secret_value() if settings.gemini_api_key else ""
        if gemini_key:
            try:
                res = await cls._call_gemini(
                    api_key=gemini_key,
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                )
                if res and "title" in res:
                    logger.info("Product details generated via Google Gemini")
                    return cls._normalize_product_result(res, name, brand_clean)
            except Exception as e:
                logger.warning("Gemini generation failed: %s. Trying Agnes AI...", e)

        # -----------------------------------------------------------------
        # ATTEMPT 3: Agnes AI (OpenAI compatible)
        # -----------------------------------------------------------------
        agnes_key = settings.agnes_api_key.get_secret_value() if settings.agnes_api_key else ""
        if agnes_key:
            try:
                res = await cls._call_openai_compatible(
                    base_url=settings.agnes_base_url,
                    api_key=agnes_key,
                    model=settings.agnes_chat_model,
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    timeout=25.0,
                )
                if res and "title" in res:
                    logger.info("Product details generated via Agnes AI")
                    return cls._normalize_product_result(res, name, brand_clean)
            except Exception as e:
                logger.warning("Agnes AI generation failed: %s", e)

        # -----------------------------------------------------------------
        # Fallback if all AI models are unreachable: Rule-based generation
        # -----------------------------------------------------------------
        logger.warning("All AI providers unreachable; returning rule-based defaults for '%s'", name)
        clean_title = f"{brand_clean} {name}".strip() if brand_clean and not name.lower().startswith(brand_clean.lower()) else name.strip()
        return {
            "title": clean_title,
            "description_html": (
                f"<h2>Overview</h2><p>Experience superior quality and reliability with the {clean_title}. "
                f"Built to high marketplace standards with verified genuine durability.</p>"
            ),
            "specs": [
                {"name": "Brand", "value": brand_clean or "Generic"},
                {"name": "Model", "value": name.strip()},
                {"name": "Condition", "value": "Brand New / Sealed"},
            ],
            "warranty_info": "1 Year Manufacturer Domestic Warranty",
            "return_policy": "7 Days Replacement Only",
            "suggested_category": category_name or "General",
            "suggested_subcategory": "General Merchandise",
        }

    @classmethod
    async def detect_duplicate_pair(
        cls,
        product_a: Dict[str, Any],
        product_b: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Analyzes two candidate products to detect if they represent the same physical SKU."""
        system_prompt = (
            "You are an AI catalog deduplication auditor for an e-commerce marketplace. "
            "You will be given Product A and Product B. Compare their titles, brands, categories, specs, and descriptions. "
            "Determine whether they are the EXACT SAME physical product (ignoring seller name, typos, case, or inverted word order).\n\n"
            "Return ONLY valid JSON matching this schema:\n"
            "{\n"
            '  "is_duplicate": true,\n'
            '  "confidence_score": 95,\n'
            '  "suggested_master_id": "a" or "b",\n'
            '  "reason": "One sentence explaining why they are duplicates or why they differ.",\n'
            '  "suggested_clean_title": "Ideal standardized product title"\n'
            "}"
        )

        user_prompt = (
            f"PRODUCT A (ID: {product_a.get('id')}):\n"
            f"Title: {product_a.get('name')}\n"
            f"Brand: {product_a.get('brand')}\n"
            f"Category: {product_a.get('category_name')}\n"
            f"Price: Rs. {product_a.get('price_rupees')}\n"
            f"Order Count: {product_a.get('order_count', 0)}\n\n"
            f"PRODUCT B (ID: {product_b.get('id')}):\n"
            f"Title: {product_b.get('name')}\n"
            f"Brand: {product_b.get('brand')}\n"
            f"Category: {product_b.get('category_name')}\n"
            f"Price: Rs. {product_b.get('price_rupees')}\n"
            f"Order Count: {product_b.get('order_count', 0)}\n"
        )

        # 100MillionSeek is best for batch duplicate detection
        seek_key = settings.seek100m_api_key.get_secret_value() if settings.seek100m_api_key else ""
        if seek_key:
            try:
                res = await cls._call_openai_compatible(
                    base_url=settings.seek100m_base_url,
                    api_key=seek_key,
                    model=settings.seek100m_model,
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    timeout=25.0,
                )
                if res and "is_duplicate" in res:
                    return cls._normalize_duplicate_result(res, product_a, product_b)
            except Exception as e:
                logger.warning("100MillionSeek duplicate detection failed: %s", e)

        # Fallback to Gemini
        gemini_key = settings.gemini_api_key.get_secret_value() if settings.gemini_api_key else ""
        if gemini_key:
            try:
                res = await cls._call_gemini(
                    api_key=gemini_key,
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                )
                if res and "is_duplicate" in res:
                    return cls._normalize_duplicate_result(res, product_a, product_b)
            except Exception as e:
                logger.warning("Gemini duplicate detection failed: %s", e)

        # Fallback heuristic
        return {
            "is_duplicate": False,
            "confidence_score": 0,
            "suggested_master_id": product_a.get("id"),
            "reason": "AI evaluation unavailable.",
            "suggested_clean_title": product_a.get("name"),
        }

    # -------------------------------------------------------------------------
    # Helper Callers
    # -------------------------------------------------------------------------

    @classmethod
    async def _call_openai_compatible(
        cls,
        base_url: str,
        api_key: str,
        model: str,
        system_prompt: str,
        user_prompt: str,
        timeout: float = 25.0,
    ) -> Optional[Dict[str, Any]]:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Elektrix/1.0",
        }
        url = f"{base_url.rstrip('/')}/chat/completions"
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.3,
            "max_tokens": 3500,
        }
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                choice = resp.json()["choices"][0]
                msg = choice.get("message") or {}
                raw_text = msg.get("content") or msg.get("reasoning_content") or ""
                if raw_text:
                    return cls._extract_json(raw_text)
            else:
                logger.warning("OpenAI-compatible %s returned status %d: %s", url, resp.status_code, resp.text[:200])
        return None

    @classmethod
    async def _call_gemini(
        cls,
        api_key: str,
        system_prompt: str,
        user_prompt: str,
    ) -> Optional[Dict[str, Any]]:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key)
            full_prompt = f"{system_prompt}\n\nTask:\n{user_prompt}"

            for model_name in GEMINI_MODELS:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=full_prompt,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            temperature=0.3,
                        ),
                    )
                    if response and response.text:
                        return cls._extract_json(response.text)
                except Exception as model_err:
                    logger.debug("Gemini model %s failed: %s", model_name, model_err)
                    continue
        except Exception as e:
            logger.warning("Google genai call failed: %s", e)
        return None

    @classmethod
    def _extract_json(cls, raw: str) -> Optional[Dict[str, Any]]:
        """Cleans and extracts JSON even if enclosed in markdown code fences."""
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)
        cleaned = cleaned.strip()
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", cleaned, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(0))
                except Exception:
                    pass
        return None

    @classmethod
    def _normalize_product_result(cls, data: Dict[str, Any], orig_name: str, brand: str) -> Dict[str, Any]:
        title = data.get("title") or orig_name

        # Strip redundant trailing product category words like "Smartphone", "Phone", "Mobile Phone"
        import re
        title = re.sub(r"(?i)\s+(?:Smartphone|Mobile Phone|Cell Phone)\b", "", title).strip()

        desc_html = data.get("description_html") or data.get("description") or ""

        # Remove markdown asterisks if any remain
        desc_html = desc_html.replace("**", "").replace("```html", "").replace("```", "").strip()

        # Ensure specs is a clean list of dicts
        raw_specs = data.get("specs") or []
        specs = []
        if isinstance(raw_specs, list):
            for s in raw_specs:
                if isinstance(s, dict) and "name" in s and "value" in s:
                    specs.append({"name": str(s["name"]).strip(), "value": str(s["value"]).strip()})

        return {
            "title": title.strip(),
            "description_html": desc_html,
            "specs": specs,
            "warranty_info": data.get("warranty_info") or "1 Year Manufacturer Domestic Warranty",
            "return_policy": data.get("return_policy") or "7 Days Replacement Only",
            "suggested_category": data.get("suggested_category"),
            "suggested_subcategory": data.get("suggested_subcategory"),
        }

    @classmethod
    def _normalize_duplicate_result(
        cls,
        data: Dict[str, Any],
        prod_a: Dict[str, Any],
        prod_b: Dict[str, Any],
    ) -> Dict[str, Any]:
        is_dup = bool(data.get("is_duplicate"))
        confidence = int(data.get("confidence_score") or 0)
        
        # Determine master candidate: prioritize more orders/history
        orders_a = prod_a.get("order_count") or 0
        orders_b = prod_b.get("order_count") or 0
        if orders_a > orders_b:
            master_id = prod_a.get("id")
        elif orders_b > orders_a:
            master_id = prod_b.get("id")
        else:
            # Fallback to AI suggestion
            sugg = str(data.get("suggested_master_id") or "").lower()
            if "b" in sugg and prod_b.get("id"):
                master_id = prod_b.get("id")
            else:
                master_id = prod_a.get("id")

        return {
            "is_duplicate": is_dup,
            "confidence_score": confidence,
            "suggested_master_id": master_id,
            "reason": str(data.get("reason") or "Potential duplicate identified."),
            "suggested_clean_title": data.get("suggested_clean_title") or prod_a.get("name"),
        }
