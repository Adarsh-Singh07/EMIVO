import codecs
import os

for filepath in ['tests/conftest.py', 'pytest.ini']:
    if not os.path.exists(filepath): continue
    try:
        with open(filepath, 'rb') as f:
            content = f.read()
        content = content.removeprefix(codecs.BOM_UTF8)
        with open(filepath, 'wb') as f:
            f.write(content)
    except Exception as e:
        print(f"Error {filepath}: {e}")
