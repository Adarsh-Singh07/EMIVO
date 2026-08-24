import { useState, useEffect } from "react";
import { Plus, X, Trash2 } from "lucide-react";
import { formatINR } from "@/lib/money";

interface Option {
  name: string;
  values: string[];
}

interface VariantCombo {
  attributes: Record<string, string>;
  price: string;
  sku: string;
  stock: string;
  is_active: boolean;
}

interface Props {
  options: Option[];
  setOptions: (options: Option[]) => void;
  combinations: VariantCombo[];
  setCombinations: (combos: VariantCombo[]) => void;
  basePrice: string;
}

export function VariantBuilder({ options, setOptions, combinations, setCombinations, basePrice }: Props) {
  // Regenerate combinations when options change
  useEffect(() => {
    if (options.length === 0) {
      setCombinations([]);
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

    const newCombos = generateCombos(options);
    if (newCombos.length === 1 && Object.keys(newCombos[0]).length === 0) {
      setCombinations([]);
      return;
    }

    // Merge with existing to preserve price/sku
    const merged = newCombos.map(combo => {
      const existing = combinations.find(c => 
        Object.keys(combo).every(k => c.attributes[k] === combo[k]) &&
        Object.keys(c.attributes).length === Object.keys(combo).length
      );
      if (existing) return existing;
      
      const nameParts = Object.values(combo);
      const skuSuffix = nameParts.map(p => p.substring(0,3).toUpperCase()).join("-");
      return {
        attributes: combo,
        price: basePrice,
        sku: "SKU-" + skuSuffix,
        stock: "0",
        is_active: true
      };
    });
    setCombinations(merged);
  }, [options, basePrice]);

  return (
    <div className="space-y-6">
      {/* Options Builder */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium">Variant Options (Dimensions)</h4>
        {options.map((opt, i) => (
          <div key={i} className="p-4 bg-neutral-50 rounded-xl space-y-3">
            <div className="flex items-center gap-3">
              <input 
                type="text" 
                value={opt.name}
                onChange={(e) => {
                  const o = [...options];
                  o[i].name = e.target.value;
                  setOptions(o);
                }}
                placeholder="e.g. Color, RAM"
                className="px-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-sm w-48"
              />
              <button 
                type="button"
                onClick={() => setOptions(options.filter((_, idx) => idx !== i))}
                className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {opt.values.map((v, vi) => (
                <span key={vi} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-900 text-white text-xs font-medium rounded-full">
                  {v}
                  <button type="button" onClick={() => {
                    const o = [...options];
                    o[i].values = o[i].values.filter((_, idx) => idx !== vi);
                    setOptions(o);
                  }}><X className="w-3 h-3" /></button>
                </span>
              ))}
              <input
                type="text"
                placeholder="Add value (press Enter)"
                className="px-3 py-1 bg-white border border-neutral-200 rounded-full text-xs w-32"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const val = e.currentTarget.value.trim();
                    if (val && !opt.values.includes(val)) {
                      const o = [...options];
                      o[i].values.push(val);
                      setOptions(o);
                    }
                    e.currentTarget.value = "";
                  }
                }}
              />
            </div>
          </div>
        ))}
        <button 
          type="button" 
          onClick={() => setOptions([...options, { name: "", values: [] }])}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900 font-medium"
        >
          <Plus className="w-4 h-4" /> Add Option
        </button>
      </div>

      {/* Combinations Table */}
      {combinations.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Variant Combinations</h4>
          <div className="border border-neutral-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Variant</th>
                  <th className="px-4 py-3 font-medium w-32">Price (₹)</th>
                  <th className="px-4 py-3 font-medium w-32">SKU</th>
                  <th className="px-4 py-3 font-medium w-24">Stock</th>
                  <th className="px-4 py-3 font-medium w-20 text-center">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white">
                {combinations.map((c, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 font-medium text-neutral-900">
                      {Object.values(c.attributes).join(" · ")}
                    </td>
                    <td className="px-4 py-2">
                      <input 
                        type="number"
                        value={c.price}
                        onChange={(e) => {
                          const cx = [...combinations];
                          cx[i].price = e.target.value;
                          setCombinations(cx);
                        }}
                        className="w-full px-2 py-1.5 bg-neutral-50 border-none rounded-md text-sm"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input 
                        type="text"
                        value={c.sku}
                        onChange={(e) => {
                          const cx = [...combinations];
                          cx[i].sku = e.target.value;
                          setCombinations(cx);
                        }}
                        className="w-full px-2 py-1.5 bg-neutral-50 border-none rounded-md text-sm uppercase"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input 
                        type="number"
                        value={c.stock}
                        onChange={(e) => {
                          const cx = [...combinations];
                          cx[i].stock = e.target.value;
                          setCombinations(cx);
                        }}
                        className="w-full px-2 py-1.5 bg-neutral-50 border-none rounded-md text-sm"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input 
                        type="checkbox"
                        checked={c.is_active}
                        onChange={(e) => {
                          const cx = [...combinations];
                          cx[i].is_active = e.target.checked;
                          setCombinations(cx);
                        }}
                        className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
