import re

with open("admin/src/app/(dashboard)/products/ProductEditor.tsx", "r") as f:
    content = f.read()

ui_old = """
              <div>
                <label className={labelClass}>Sale Price (Offer)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-neutral-400">₹</span>
                  <input
                    className={`${inputClass} pl-8`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-neutral-500">Offer Name (e.g. Diwali)</label>
                <input
                  type="text"
                  className="h-10 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm text-neutral-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  value={offerName}
                  onChange={(e) => setOfferName(e.target.value)}
                  placeholder="Festival Offer"
                />
              </div>
              <div>
                <label className={labelClass}>Offer Starts</label>
                <input className={inputClass} type="datetime-local" value={offerStarts} onChange={(e) => setOfferStarts(e.target.value)} disabled={!salePrice} />
              </div>
              <div>
                <label className={labelClass}>Offer Ends</label>
                <input className={inputClass} type="datetime-local" value={offerEnds} onChange={(e) => setOfferEnds(e.target.value)} disabled={!salePrice} />
              </div>
            </div>
            <p className="text-xs text-neutral-500">Clearing the sale price clears the offer window on save (explicit nulls are sent).</p>
"""

ui_new = """
            </div>

            <div className="mt-4 pt-4 border-t border-neutral-100">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={hasOffer} onChange={(e) => setHasOffer(e.target.checked)} className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900" />
                <span className="text-sm font-bold text-neutral-900">Enable Special Offer / Discount</span>
              </label>
            </div>

            {hasOffer && (
              <>
                <div className="grid gap-4 sm:grid-cols-2 mt-4">
                  <div>
                    <label className={labelClass}>Sale Price (Offer) *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-neutral-400">₹</span>
                      <input
                        className={`${inputClass} pl-8`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={salePrice}
                        onChange={(e) => setSalePrice(e.target.value)}
                        required={hasOffer}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold uppercase text-neutral-500">Offer Name (e.g. Diwali Dhamaka)</label>
                    <input
                      type="text"
                      className="h-10 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm text-neutral-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      value={offerName}
                      onChange={(e) => setOfferName(e.target.value)}
                      placeholder="Festival Offer"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 mt-4">
                  <div>
                    <label className={labelClass}>Offer Starts (Optional)</label>
                    <input className={inputClass} type="datetime-local" value={offerStarts} onChange={(e) => setOfferStarts(e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>Offer Ends (Optional)</label>
                    <input className={inputClass} type="datetime-local" value={offerEnds} onChange={(e) => setOfferEnds(e.target.value)} />
                  </div>
                </div>
              </>
            )}
"""

content = content.replace(ui_old.strip(), ui_new.strip())

with open("admin/src/app/(dashboard)/products/ProductEditor.tsx", "w") as f:
    f.write(content)

