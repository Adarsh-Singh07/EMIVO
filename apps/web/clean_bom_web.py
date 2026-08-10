import codecs

for filepath in ['src/lib/api-client.ts', 'src/components/ui/button.tsx', 'src/lib/api/businesses.ts']:
    try:
        with open(filepath, 'rb') as f:
            content = f.read()
        if content.startswith(codecs.BOM_UTF8):
            content = content[len(codecs.BOM_UTF8):]
        with open(filepath, 'wb') as f:
            f.write(content)
    except Exception as e:
        print(f"Error {filepath}: {e}")
