import re

with open("admin/src/app/(dashboard)/products/page.tsx", "r") as f:
    code = f.read()

# I need to find the `pageItems.map` block and replace it.
# First, let's filter pageItems into activeItems and archivedItems
# But wait, pagination applies to `filtered`. If we put them in sections, pagination still applies to the WHOLE filtered list, so an archived product might be on page 2.
# A better way is to split `filtered` into `activeFiltered` and `archivedFiltered` before pagination?
# Wait, if we have two sections, how do we paginate?
# We can just paginate the ACTIVE products, and maybe paginate ARCHIVED? Or just show all ARCHIVED below?
# Let's just group `pageItems` into active and archived!
# It's much simpler.

render_code = """
              <tbody className="divide-y divide-neutral-100">
                {pageItems.filter(p => (p.status || "ACTIVE").toUpperCase() !== "ARCHIVED").map((product) => {
                  const inv = stock.get(product.id);
                  const archived = false;
                  const thumb = thumbFor(product);
                  const onOffer = product.sale_price != null && product.sale_price > 0;
                  return (
                    <tr key={product.id} className="transition-colors hover:bg-neutral-50/60">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
                            {thumb ? (
                              <img src={thumb} alt={product.name} className="h-full w-full object-contain" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-neutral-300">
                                <Package className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/products/${product.id}`}
                              className="block max-w-[220px] truncate font-semibold text-neutral-900 hover:text-amber-600 transition-colors"
                            >
                              {product.name}
                            </Link>
                            <div className="flex items-center gap-1.5">
                              {product.featured && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
                              {(product.variants?.length || 0) > 0 && (
                                <span className="text-[10px] text-neutral-400">
                                  {product.variants!.length} variant{product.variants!.length === 1 ? "" : "s"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-neutral-500">{product.sku || "—"}</td>
                      <td className="px-5 py-3.5 text-neutral-600">{product.brand || "—"}</td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="font-semibold text-neutral-900">
                          {formatINR(onOffer ? product.sale_price! : product.price)}
                        </div>
                        {product.mrp != null && product.mrp > (onOffer ? product.sale_price! : product.price) && (
                          <div className="text-xs text-neutral-400 line-through">{formatINR(product.mrp)}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {inv ? (
                          <StockBadge available={inv.available} isLowStock={inv.is_low_stock} isOutOfStock={inv.is_out_of_stock} />
                        ) : (
                          <StockBadge available={0} isOutOfStock />
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <ProductStatusBadge status={product.status || "ACTIVE"} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/products/${product.id}`}
                            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
                            title="Edit product"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() =>
                              patchProduct(
                                product.id,
                                { featured: !product.featured },
                                product.featured ? "Removed from featured" : "Marked as featured"
                              )
                            }
                            disabled={busyId === product.id}
                            className={`rounded-lg p-1.5 transition-colors disabled:opacity-40 ${
                              product.featured
                                ? "text-amber-400 hover:bg-amber-50"
                                : "text-neutral-300 hover:bg-neutral-100 hover:text-amber-400"
                            }`}
                            title={product.featured ? "Unfeature" : "Feature"}
                          >
                            <Star className={`h-4 w-4 ${product.featured ? "fill-amber-400" : ""}`} />
                          </button>
                          <button
                            onClick={() =>
                              patchProduct(
                                product.id,
                                { status: "ARCHIVED" },
                                "Product archived"
                              )
                            }
                            disabled={busyId === product.id}
                            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-amber-600 transition-colors disabled:opacity-40"
                            title={"Archive product"}
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* ARCHIVED SECTION */}
          {pageItems.some(p => (p.status || "ACTIVE").toUpperCase() === "ARCHIVED") && (
            <div className="mt-8">
              <div className="bg-neutral-100 px-5 py-3 border-y border-neutral-200">
                <h3 className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
                  <Archive className="w-4 h-4" /> Archived Products
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm opacity-75">
                  <tbody className="divide-y divide-neutral-100">
                    {pageItems.filter(p => (p.status || "ACTIVE").toUpperCase() === "ARCHIVED").map((product) => {
                      const inv = stock.get(product.id);
                      const thumb = thumbFor(product);
                      const onOffer = product.sale_price != null && product.sale_price > 0;
                      return (
                        <tr key={product.id} className="transition-colors hover:bg-neutral-50/60 bg-neutral-50/30">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 grayscale">
                                {thumb ? (
                                  <img src={thumb} alt={product.name} className="h-full w-full object-contain" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-neutral-300">
                                    <Package className="h-4 w-4" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <Link
                                  href={`/products/${product.id}`}
                                  className="block max-w-[220px] truncate font-semibold text-neutral-600 hover:text-amber-600 transition-colors"
                                >
                                  {product.name}
                                </Link>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-xs text-neutral-400">{product.sku || "—"}</td>
                          <td className="px-5 py-3.5 text-neutral-500">{product.brand || "—"}</td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="font-semibold text-neutral-500">
                              {formatINR(onOffer ? product.sale_price! : product.price)}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <ProductStatusBadge status="ARCHIVED" />
                          </td>
                          <td className="px-5 py-3.5 w-[140px]">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() =>
                                  patchProduct(
                                    product.id,
                                    { status: "ACTIVE" },
                                    "Product restored"
                                  )
                                }
                                disabled={busyId === product.id}
                                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-900 transition-colors disabled:opacity-40"
                                title="Restore product"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                              <button
                                onClick={async () => {
                                  if (!confirm("Are you sure you want to permanently delete this product? This will only succeed if the product has never been ordered.")) return;
                                  setBusyId(product.id);
                                  try {
                                    await apiClient.delete(`/products/${product.id}`);
                                    toast.success("Product permanently deleted");
                                    loadProducts();
                                  } catch (err: any) {
                                    toast.error(err.message || "Failed to delete product. It might be linked to past orders.");
                                  } finally {
                                    setBusyId(null);
                                  }
                                }}
                                disabled={busyId === product.id}
                                className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-100 hover:text-red-600 transition-colors disabled:opacity-40"
                                title="Permanently delete product"
                              >
                                <import_lucide_Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
"""

# I need to add Trash2 to imports
if "Trash2" not in code:
    code = code.replace("PackageX, TrendingDown } from \"lucide-react\"", "PackageX, TrendingDown, Trash2 } from \"lucide-react\"")
    code = code.replace("Archive } from \"lucide-react\"", "Archive, Trash2 } from \"lucide-react\"")

render_code = render_code.replace("import_lucide_Trash2", "Trash2")

# Replace tbody contents
start_idx = code.find('<tbody className="divide-y divide-neutral-100">')
end_idx = code.find('</table>', start_idx)

new_code = code[:start_idx] + render_code + code[end_idx:]

with open("admin/src/app/(dashboard)/products/page.tsx", "w") as f:
    f.write(new_code)
