import codecs

with open('components.json', 'rb') as f:
    content = f.read()

if content.startswith(codecs.BOM_UTF8):
    content = content[len(codecs.BOM_UTF8):]

with open('components.json', 'wb') as f:
    f.write(content)
