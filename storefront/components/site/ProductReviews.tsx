"use client";

/**
 * Product reviews panel for the PDP Reviews tab (S2).
 * - Public: aggregate summary + review list (verified-purchase badges).
 * - Signed-in: write/update exactly one review per product (PUT upsert).
 * - Signed-out: honest empty state with a sign-in prompt — no fake ratings.
 */
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Loader2, Trash2, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { storeApi, type ProductReviewsResponse } from "@/lib/store-api";
import { useAuth } from "@/lib/auth-context";
import Button from "@/components/ui/Button";

function Stars({ value, className = "w-4 h-4" }: { value: number; className?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${className} ${
            n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-neutral-300"
          }`}
        />
      ))}
    </span>
  );
}

export default function ProductReviews({ slug }: { slug: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<ProductReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await storeApi.getProductReviews(slug);
      setData(res);
      if (res.mine) {
        setRating(res.mine.rating);
        setTitle(res.mine.title || "");
        setBody(res.mine.body || "");
      }
    } catch {
      setError("Couldn't load reviews right now. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) return;
    setSubmitting(true);
    try {
      await storeApi.upsertProductReview(slug, {
        rating,
        title: title.trim() || undefined,
        body: body.trim() || undefined,
      });
      toast.success("Review saved — thanks for sharing!");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your review");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    try {
      await storeApi.deleteProductReview(slug);
      toast.success("Review deleted");
      setTitle("");
      setBody("");
      setRating(5);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete review");
    }
  };

  if (loading) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-neutral-500 py-6">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading reviews…
      </p>
    );
  }

  if (error) {
    return (
      <div className="py-6 text-sm text-neutral-600">
        <p className="text-red-600 font-medium">{error}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={load}>
          Retry
        </Button>
      </div>
    );
  }

  const { summary, items, mine } = data ?? { summary: { average: null, count: 0 }, items: [], mine: null };

  return (
    <div className="space-y-8">
      {/* Summary */}
      <div className="flex flex-wrap items-center gap-3">
        {summary.count > 0 ? (
          <>
            <Stars value={summary.average ?? 0} className="w-5 h-5" />
            <span className="text-lg font-semibold">{(summary.average ?? 0).toFixed(1)}</span>
            <span className="text-sm text-neutral-500">
              · {summary.count} review{summary.count === 1 ? "" : "s"}
            </span>
          </>
        ) : (
          <span className="text-sm text-neutral-500">No reviews yet</span>
        )}
      </div>

      {/* Review form / sign-in prompt */}
      {user ? (
        <form onSubmit={submit} className="border border-neutral-200 rounded-2xl p-4 sm:p-5 space-y-3">
          <p className="text-sm font-semibold">{mine ? "Update your review" : "Write a review"}</p>
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Your rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                className="p-1 rounded-md hover:bg-neutral-100"
              >
                <Star
                  className={`w-6 h-6 ${
                    n <= rating ? "fill-amber-400 text-amber-400" : "text-neutral-300"
                  }`}
                />
              </button>
            ))}
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="Title (optional)"
            aria-label="Review title"
            className="w-full h-10 px-3 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={4000}
            rows={3}
            placeholder="What did you like or dislike? How was the delivery?"
            aria-label="Review body"
            className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
          <div className="flex items-center gap-3">
            <Button type="submit" loading={submitting}>
              {mine ? "Update review" : "Submit review"}
            </Button>
            {mine && (
              <Button type="button" variant="ghost" size="sm" onClick={remove}>
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </Button>
            )}
          </div>
        </form>
      ) : (
        <div className="border border-dashed border-neutral-200 rounded-2xl p-4 text-sm text-neutral-600">
          <button
            type="button"
            onClick={() => router.push(`/login?next=${encodeURIComponent(`/product/${slug}`)}`)}
            className="font-semibold text-neutral-950 underline underline-offset-2"
          >
            Sign in
          </button>{" "}
          to write a review. Purchases are verified automatically.
        </div>
      )}

      {/* List */}
      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No reviews have been written for this product yet. Purchased it? Your feedback helps
          other shoppers.
        </p>
      ) : (
        <ul className="space-y-5">
          {items.map((r) => (
            <li key={r.id} className="border-b border-neutral-100 pb-5 last:border-b-0">
              <div className="flex flex-wrap items-center gap-2">
                <Stars value={r.rating} />
                {r.title && <span className="text-sm font-semibold">{r.title}</span>}
              </div>
              {r.body && <p className="text-sm text-neutral-600 mt-1.5 whitespace-pre-wrap">{r.body}</p>}
              <p className="text-xs text-neutral-400 mt-2 flex items-center gap-2">
                <span>{r.author_name || "Customer"}</span>
                <span>·</span>
                <span>{new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                {r.verified_purchase && (
                  <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                    <BadgeCheck className="w-3.5 h-3.5" /> Verified purchase
                  </span>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
