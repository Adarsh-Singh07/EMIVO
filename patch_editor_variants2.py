import re

path = "/opt/elektrix/admin/src/app/(dashboard)/products/ProductEditor.tsx"
with open(path, "r") as f:
    content = f.read()

# Add VariantBuilder import
if 'import { VariantBuilder }' not in content:
    content = content.replace(
        'import dynamic from "next/dynamic";',
        'import { VariantBuilder } from "@/components/products/VariantBuilder";\nimport dynamic from "next/dynamic";'
    )

# Add options state
if 'const [options, setOptions]' not in content:
    content = content.replace(
        'const [variants, setVariants] = useState<Array<{ key: string; id?: string; name: string; sku: string; price: string; _deleted?: boolean }>>([]);',
        'const [variants, setVariants] = useState<Array<any>>([]);\n  const [options, setOptions] = useState<Array<{ name: string; values: string[] }>>([]);'
    )

# When loading existing product, set options
if 'setOptions(p.options || []);' not in content:
    content = content.replace(
        'setSpecs((p.specs || []).map((s, i) => ({ key: `orig-${i}`, name: s.name, value: s.value })));',
        'setSpecs((p.specs || []).map((s, i) => ({ key: `orig-${i}`, name: s.name, value: s.value })));\n      setOptions(p.options || []);'
    )
    
# Replace variant logic mapping
old_variants_load = """      setVariants(
        (p.variants || []).map((v) => ({ key: `v-${v.id}`, id: v.id, name: v.name, sku: v.sku || "", price: paiseToRupeeInput(v.price) }))
      );"""

new_variants_load = """      setVariants(
        (p.variants || []).map((v) => ({ 
          key: `v-${v.id}`, 
          id: v.id, 
          name: v.name, 
          sku: v.sku || "", 
          price: paiseToRupeeInput(v.price), 
          attributes: v.attributes || {},
          is_active: v.is_active !== false 
        }))
      );"""
content = content.replace(old_variants_load, new_variants_load)

# Add save options
content = content.replace(
    'tags: tagsText.split(",").map((s) => s.trim()).filter(Boolean),',
    'tags: tagsText.split(",").map((s) => s.trim()).filter(Boolean),\n      options: options.length > 0 ? options : undefined,'
)

# And in Variants section
old_variants_section = """          {/* Variants */}
          <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-neutral-900">Variants</h2>
                <p className="text-xs text-neutral-500">
                  Named options with their own price{!isEdit && " — created together with the product"}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVariants((prev) => [...prev, { key: `v-${Date.now()}`, name: "", sku: "", price: "" }])}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100"
              >
                <Plus className="h-3.5 w-3.5" /> Add Variant
              </button>
            </div>
            {variants.length === 0 ? (
              <p className="rounded-xl border border-dashed border-neutral-200 p-4 text-center text-xs text-neutral-400">No variants.</p>
            ) : (
              <div className="space-y-2">
                {variants
                  .filter((v) => !v._deleted)
                  .map((row) => (
                    <div key={row.key} className="flex flex-col gap-2 sm:flex-row">
                      <input
                        className={`${inputClass} h-10 flex-1`}
                        placeholder="Variant name (e.g. Red / XL)"
                        value={row.name}
                        onChange={(e) => setVariants((prev) => prev.map((r) => (r.key === row.key ? { ...r, name: e.target.value } : r)))}
                      />
                      <input
                        className={`${inputClass} h-10 sm:w-40`}
                        placeholder="SKU (optional)"
                        value={row.sku}
                        onChange={(e) => setVariants((prev) => prev.map((r) => (r.key === row.key ? { ...r, sku: e.target.value } : r)))}
                      />
                      <div className="relative sm:w-36">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">₹</span>
                        <input
                          className={`${inputClass} h-10 pl-7`}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Price"
                          value={row.price}
                          onChange={(e) => setVariants((prev) => prev.map((r) => (r.key === row.key ? { ...r, price: e.target.value } : r)))}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setVariants((prev) => prev.map((r) => (r.key === row.key ? { ...r, _deleted: true } : r)))}
                        className="self-center rounded-lg p-2 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        title="Delete variant"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </section>"""

new_variants_section = """          {/* Variants Builder */}
          <VariantBuilder
            options={options}
            setOptions={setOptions}
            variants={variants}
            setVariants={setVariants}
            basePrice={price}
            baseSku={sku}
          />"""

content = content.replace(old_variants_section, new_variants_section)

# Final payload mapping for variants (price string -> int)
old_variants_payload = """      if (variants.length > 0) {
        payload.variants = variants
          .filter((v) => !v._deleted && v.name.trim() && parseFloat(v.price) > 0)
          .map((v) => ({
            id: v.id,
            name: v.name,
            sku: v.sku || undefined,
            price: rupeeInputToPaise(v.price),
          }));
      }"""

new_variants_payload = """      if (variants.length > 0) {
        payload.variants = variants
          .filter((v) => !v._deleted && v.name.trim() && parseFloat(v.price) > 0)
          .map((v) => ({
            id: v.id,
            name: v.name,
            sku: v.sku || undefined,
            price: rupeeInputToPaise(v.price),
            attributes: v.attributes,
            is_active: v.is_active,
          }));
      }"""
content = content.replace(old_variants_payload, new_variants_payload)


with open(path, "w") as f:
    f.write(content)
