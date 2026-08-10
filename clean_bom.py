"""
Temporary script: writes docs/DEVELOPER_GUIDE.md and docs/NEXT_AGENT.md.
Run once, then restore this file from git.
"""
import pathlib, shutil, sys

src = pathlib.Path(r"C:\Users\dheer\.gemini\antigravity\brain\5bbdfd68-6bc8-4425-98ba-28c54effb35e")
dst = pathlib.Path(r"d:\Projects\EMIVO\docs")

for name in ["DEVELOPER_GUIDE.md", "NEXT_AGENT.md"]:
    shutil.copy2(src / name, dst / name)
    print(f"Copied {name}")

print("Done.")


if content.startswith(codecs.BOM_UTF8):
    content = content[len(codecs.BOM_UTF8):]

with open('db/rls/01_businesses.sql', 'wb') as f:
    f.write(content)
