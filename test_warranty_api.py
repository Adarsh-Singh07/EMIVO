import requests

b_id = "7f2515ec-c52f-4f74-8b31-0c421de54dc6"
r = requests.post("https://api.elektrix.in/api/v1/auth/login", json={"email":"admin@apna.com","password":"Password@123"}, headers={"X-Business-ID": b_id})
token = r.json().get("access_token")

# Update product
p_id = "abf89f95-8d62-4a67-b9d4-802c48750d80"
up = requests.put(f"https://api.elektrix.in/api/v1/products/{p_id}", json={"warranty_info": "Updated Warranty String"}, headers={"Authorization": f"Bearer {token}", "X-Business-ID": b_id})
print("Update:", up.status_code, up.text)

get = requests.get(f"https://api.elektrix.in/api/v1/store/products/{p_id}", headers={"X-Business-ID": b_id})
print("Get:", get.json().get("warranty_info"))
