import { useState, useEffect } from "react";
import { Plus, X, Trash2 } from "lucide-react";
import { formatINR } from "@/lib/money";

interface Option {
  name: string;
  values: string[];
}

export interface EditorVariant {
  key: string;
  id?: string;
  name: string;
  sku: string;
  price: string;
  attributes?: Record<string, string>;
  is_active?: boolean;
  _deleted?: boolean;
}

interface Props {
  options: Option[];
  setOptions: (options: Option[]) => void;
  variants: EditorVariant[];
  setVariants: (variants: EditorVariant[]) => void;
  basePrice: string;
  baseSku?: string;
}

export function VariantBuilder({ options, setOptions, variants, setVariants, basePrice, baseSku }: Props) {
  // Regenerate combinations when options change
  useEffect(() => {
    if (options.length === 0) {
      // Don't auto-delete existing standalone variants
      return;
    }

    const generateCombos = (opts: Option[], current: Record<string, string> = {}, index = 0): Record<string, string>[] => {
      if (index === opts.length) return [current];
      const opt = opts[index];
      if (opt.values.length === 0) {
        return generateCombos(opts, current, index + 1); // Skip empty options
      }
      let res: Record<string, string>[] = [];
      for (const val of opt.values) {
        res = res.concat(generateCombos(opts, { ...current, [opt.name]: val }, index + 1));
      }
      return res;
    };

    const newCombos = generateCombos(options.filter(o => o.values.length > 0));
    if (newCombos.length === 1 && Object.keys(newCombos[0]).length === 0) {
      return;
    }

    // Merge with existing to preserve price/sku
    const merged = newCombos.map(combo => {
      const existing = variants.find(c => 
        c.attributes &&
        !c._deleted &&
        Object.keys(combo).every(k => c.attributes![k] === combo[k]) &&
        Object.keys(c.attributes).length === Object.keys(combo).length
      );
      if (existing) return existing;
      
      const attrVals = Object.values(combo);
      return {
        key: `v-${Date.now()}-${Math.random()}`,
        name: attrVals.join(" / "),
        sku: baseSku ? `${baseSku}-${attrVals.map(v => v.substring(0,3).toUpperCase()).join("-")}` : "",
        price: basePrice,
        attributes: combo,
        is_active: true,
      };
    });
    
    // Mark old as deleted if they don't match the new combos, but keep their keys so they delete on backend
    const removed = variants.filter(v => {
      if (!v.attributes) return false;
      const isStillValid = newCombos.some(combo => 
        Object.keys(combo).every(k => v.attributes![k] === combo[k]) &&
        Object.keys(v.attributes!).length === Object.keys(combo).length
      );
      return !isStillValid;
    }).map(v => ({ ...v, _deleted: true }));

    // Also keep variants that were manually added without attributes
    const manual = variants.filter(v => !v.attributes && !v._deleted);

    setVariants([...merged, ...removed, ...manual]);
  }, [options]); // Intentionally not including variants, basePrice, baseSku to avoid infinite loops

  const addOption = () => {
    setOptions([...options, { name: "", values: [] }]);
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOptionName = (index: number, name: string) => {
    const newOpts = [...options];
    newOpts[index].name = name;
    setOptions(newOpts);
  };

  const addOptionValue = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && e.currentTarget.value) {
      e.preventDefault();
      const val = e.currentTarget.value.trim();
      if (!options[index].values.includes(val)) {
        const newOpts = [...options];
        newOpts[index].values.push(val);
        setOptions(newOpts);
      }
      e.currentTarget.value = "";
    }
  };

  const removeOptionValue = (optIndex: number, valIndex: number) => {
    const newOpts = [...options];
    newOpts[optIndex].values = newOpts[optIndex].values.filter((_, i) => i !== valIndex);
    setOptions(newOpts);
  };

  const activeVariants = variants.filter(v => !v._deleted);

  return (
    <section className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-neutral-900">Options & Variants</h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            Create multi-dimensional options (e.g. Size, Color) to automatically generate variants.
          </p>
        </div>
        <button
          type="button"
          onClick={addOption}
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-100"
        >
          <Plus className="h-3.5 w-3.5" /> Add Option
        </button>
      </div>

      {options.length > 0 && (
        <div className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50/50 p-4">
          {options.map((opt, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-xl bg-white p-4 shadow-sm ring-1 ring-neutral-200">
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  placeholder="Option name (e.g. Color)"
                  value={opt.name}
                  onChange={(e) => updateOptionName(i, e.target.value)}
                  className="h-8 w-48 rounded-lg border-neutral-300 text-sm font-medium focus:border-amber-500 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  className="text-neutral-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {opt.values.map((v, j) => (
                  <div key={j} className="flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                    {v}
                    <button type="button" onClick={() => removeOptionValue(i, j)} className="ml-1 text-neutral-400 hover:text-neutral-900">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <input
                  type="text"
                  placeholder="Type a value and press Enter..."
                  onKeyDown={(e) => addOptionValue(i, e)}
                  className="h-8 w-48 rounded-lg border-none bg-transparent text-xs placeholder-neutral-400 focus:ring-0"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-900">Generated Variants ({activeVariants.length})</h3>
          <button
            type="button"
            onClick={() => setVariants([...variants, { key: `v-${Date.now()}`, name: "", sku: "", price: basePrice }])}
            className="text-xs font-medium text-amber-600 hover:text-amber-700"
          >
            + Add custom variant
          </button>
        </div>

        {activeVariants.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-200 p-4 text-center text-xs text-neutral-400">
            No variants. Add options above or click Add custom variant.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs font-medium text-neutral-500 uppercase">
                <tr>
                  <th className="px-3 py-2 rounded-tl-lg">Variant</th>
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2">Price (₹)</th>
                  <th className="px-3 py-2 rounded-tr-lg"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {variants.map((v, idx) => {
                  if (v._deleted) return null;
                  return (
                    <tr key={v.key} className="group">
                      <td className="px-3 py-2">
                        <input
                          className="h-8 w-full rounded-lg border-neutral-200 text-sm focus:border-amber-500 focus:ring-amber-500"
                          value={v.name}
                          placeholder="Name"
                          onChange={(e) => {
                            const nv = [...variants];
                            nv[idx].name = e.target.value;
                            setVariants(nv);
                          }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="h-8 w-32 rounded-lg border-neutral-200 text-sm focus:border-amber-500 focus:ring-amber-500"
                          value={v.sku}
                          placeholder="SKU"
                          onChange={(e) => {
                            const nv = [...variants];
                            nv[idx].sku = e.target.value;
                            setVariants(nv);
                          }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="h-8 w-24 rounded-lg border-neutral-200 text-sm focus:border-amber-500 focus:ring-amber-500"
                          type="number"
                          step="0.01"
                          value={v.price}
                          placeholder="Price"
                          onChange={(e) => {
                            const nv = [...variants];
                            nv[idx].price = e.target.value;
                            setVariants(nv);
                          }}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            const nv = [...variants];
                            nv[idx]._deleted = true;
                            setVariants(nv);
                          }}
                          className="p-1 text-neutral-400 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
