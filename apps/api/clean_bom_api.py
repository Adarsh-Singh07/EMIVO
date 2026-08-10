import codecs
import os

for filepath in ['main.py', 'routers/businesses.py', 'routers/auth.py', 'routers/users.py']:
    if not os.path.exists(filepath): continue
    try:
        with open(filepath, 'rb') as f:
            content = f.read()
        content = content.removeprefix(codecs.BOM_UTF8)
        with open(filepath, 'wb') as f:
            f.write(content)
    except Exception as e:
        print(f"Error {filepath}: {e}")
