import re

path = "/opt/elektrix/storefront/components/site/Header.tsx"
with open(path, "r") as f:
    content = f.read()

old_layout = """          {/* Mobile search shortcut */}
          <button
            className="md:hidden p-2"
            aria-label="Search"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="w-5 h-5" />
          </button>

          <div className="flex-1 lg:hidden" />"""

new_layout = """          <div className="flex-1 lg:hidden" />

          {/* Mobile search shortcut */}
          <button
            className="md:hidden p-2"
            aria-label="Search"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="w-5 h-5" />
          </button>"""

content = content.replace(old_layout, new_layout)

with open(path, "w") as f:
    f.write(content)
