import codecs

for filepath in ['src/app/(auth)/login/page.tsx', 'src/app/(auth)/register/page.tsx']:
    try:
        with open(filepath, 'rb') as f:
            content = f.read()
        if content.startswith(codecs.BOM_UTF8):
            content = content[len(codecs.BOM_UTF8):]
        with open(filepath, 'wb') as f:
            f.write(content)
    except Exception as e:
        print(f"Error {filepath}: {e}")
