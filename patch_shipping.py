import re

with open("apps/api/modules/storefront/shipping.py", "r") as f:
    content = f.read()

new_logic = """
                dc = data["delivery_codes"][0]["postal_code"]
                state = dc.get("state_code", "")
                
                # Dynamic ETA based on origin (Bihar) to destination state
                if state == "BR":
                    eta = "1-2"
                elif state in ["UP", "WB", "JH", "OR", "CG"]:
                    eta = "2-4"
                elif state in ["DL", "HR", "MH", "MP", "GJ", "RJ"]:
                    eta = "4-5"
                elif state in ["KA", "TS", "TN", "KL", "AP"]:
                    eta = "5-6"
                elif state in ["AS", "ML", "MZ", "NL", "TR", "AR", "MN", "SK"]:
                    eta = "6-8"
                else:
                    eta = "4-7"

                return {
                    "serviceable": True,
                    "estimated_days": eta,
                    "cod_available": dc.get("cod") == "Y",
                    "prepaid_available": dc.get("pre_paid") == "Y",
                    "message": f"Delivery to {dc.get('city', 'your location')}"
                }
"""

content = re.sub(
    r'dc = data\["delivery_codes"\]\[0\]\["postal_code"\].*?"message": "Delivery available"\n\s*\}',
    new_logic.strip(),
    content,
    flags=re.DOTALL
)

with open("apps/api/modules/storefront/shipping.py", "w") as f:
    f.write(content)

