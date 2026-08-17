import codecs

with open('package.json', 'rb') as f:
    content = f.read()

if content.startswith(codecs.BOM_UTF8):
    content = content[len(codecs.BOM_UTF8):]

with open('package.json', 'wb') as f:
    f.write(content)
