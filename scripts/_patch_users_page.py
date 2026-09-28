import io

p = "admin/src/app/(dashboard)/users/page.tsx"
s = io.open(p, encoding="utf-8").read()

s = s.replace(
    'import { Users, Search, RefreshCw, AlertCircle } from "lucide-react";',
    'import { Users, Search, RefreshCw, AlertCircle, ShieldBan, ShieldCheck, Trash2, X } from "lucide-react";',
)
s = s.replace(
    """  is_active: boolean;
  roles: string[];
  created_at: string;
}""",
    """  is_active: boolean;
  suspended: boolean;
  suspension_reason: string | null;
  roles: string[];
  created_at: string;
}

type PendingAction =
  | { kind: "suspend"; user: AdminUser }
  | { kind: "delete"; user: AdminUser }
  | null;""",
)

s = s.replace(
    """  const [page, setPage] = useState(1);
""",
    """  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<PendingAction>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const runAction = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      setPending(null);
      setReason("");
      await load();
    } catch (err) {
      setActionError(
        err instanceof ApiError ? `${err.message}${err.code ? ` (${err.code})` : ""}` : "Action failed"
      );
    } finally {
      setBusy(false);
    }
  };
""",
    1,
)

s = s.replace(
    """                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                            user.is_active
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-neutral-100 text-neutral-500 border-neutral-200"
                          }`}
                        >
                          {user.is_active ? "Active" : "Disabled"}
                        </span>
                      </td>""",
    """                      <td className="px-5 py-3.5">
                        {user.suspended ? (
                          <span
                            className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700"
                            title={user.suspension_reason || undefined}
                          >
                            Suspended
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                              user.is_active
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-neutral-100 text-neutral-500 border-neutral-200"
                            }`}
                          >
                            {user.is_active ? "Active" : "Disabled"}
                          </span>
                        )}
                      </td>""",
    1,
)

s = s.replace(
    '                  <th className="px-5 py-3.5 text-right">Joined</th>\n                </tr>',
    '                  <th className="px-5 py-3.5 text-right">Joined</th>\n                  <th className="px-5 py-3.5 text-right">Actions</th>\n                </tr>',
    1,
)

s = s.replace(
    """                      <td className="px-5 py-3.5 text-right font-mono text-xs text-neutral-400">
                        {new Date(user.created_at).toLocaleDateString("en-IN")}
                      </td>
                    </tr>""",
    """                      <td className="px-5 py-3.5 text-right font-mono text-xs text-neutral-400">
                        {new Date(user.created_at).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          {user.roles?.some((r) => r !== "customer") ? (
                            <span className="text-[11px] text-neutral-400">staff</span>
                          ) : user.suspended ? (
                            <button
                              onClick={() => runAction(() => apiClient.post(`/admin/users/${user.id}/unsuspend`))}
                              disabled={busy}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" /> Unsuspend
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => { setPending({ kind: "suspend", user }); setReason(""); }}
                                disabled={busy || !user.is_active}
                                className="inline-flex items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100 disabled:opacity-50"
                              >
                                <ShieldBan className="h-3.5 w-3.5" /> Suspend
                              </button>
                              <button
                                onClick={() => setPending({ kind: "delete", user })}
                                disabled={busy || !user.is_active}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>""",
    1,
)

s = s.replace(
    """          <Pagination page={page} pageCount={pageCount} total={total} onPage={setPage} />
        </div>
      )}
    </div>
  );
}""",
    """          <Pagination page={page} pageCount={pageCount} total={total} onPage={setPage} />
        </div>
      )}

      {/* Action error banner */}
      {actionError && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
          <p>{actionError}</p>
        </div>
      )}

      {/* Confirmation dialogs */}
      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 p-4">
          <div className="w-full max-w-md overflow-y-auto max-h-[85vh] rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl">
            {pending.kind === "suspend" ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-bold text-neutral-900">
                    Suspend {`${pending.user.first_name} ${pending.user.last_name}`.trim()}?
                  </h3>
                  <button onClick={() => setPending(null)} className="text-neutral-400 hover:text-neutral-700">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <p className="mt-2 text-sm text-neutral-600">
                  They will be signed out everywhere and cannot log in until unsuspended.
                  The reason below is shown to them at sign-in.
                </p>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Reason shown to the customer (e.g. fraudulent order activity)"
                  className="mt-3 w-full rounded-xl border border-neutral-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => setPending(null)} className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
                    Cancel
                  </button>
                  <button
                    onClick={() => runAction(() => apiClient.post(`/admin/users/${pending.user.id}/suspend`, { reason }))}
                    disabled={busy || !reason.trim()}
                    className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
                  >
                    Suspend account
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-bold text-red-700">
                    Permanently delete this account?
                  </h3>
                  <button onClick={() => setPending(null)} className="text-neutral-400 hover:text-neutral-700">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <p className="mt-2 text-sm text-neutral-600">
                  <b>{`${pending.user.first_name} ${pending.user.last_name}`.trim()}</b> ({pending.user.email}) will be
                  removed and signed out everywhere. Personal details are erased and cannot be
                  restored. <b>Order and payment history is kept</b> for business records.
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => setPending(null)} className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
                    Cancel
                  </button>
                  <button
                    onClick={() => runAction(() => apiClient.delete(`/admin/users/${pending.user.id}`))}
                    disabled={busy}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    Delete permanently
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}""",
    1,
)

io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("users page upgraded")
