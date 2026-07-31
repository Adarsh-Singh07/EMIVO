"use client";

import { Product } from "@/types/product";
import { Star, CheckCircle2, ThumbsUp, Sparkles } from "lucide-react";
import Image from "next/image";

interface ReviewsSectionProps {
  product: Product;
}

export function ReviewsSection({ product }: ReviewsSectionProps) {
  const { reviewSummary, featuredReviews } = product;

  if (!reviewSummary || !featuredReviews || featuredReviews.length === 0) return null;

  // Rating distribution calculation
  const totalReviews = reviewSummary.reviewsCount;
  const distributions = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: reviewSummary.ratingDistribution[stars] || 0,
    percentage: Math.round(((reviewSummary.ratingDistribution[stars] || 0) / totalReviews) * 100)
  }));

  return (
    <section className="py-16 md:py-24 border-t border-[var(--color-border)]">
      
      {/* Header & AI Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 mb-16">
        
        {/* Left: Overall Rating & Distribution */}
        <div className="col-span-1 lg:col-span-4 space-y-8">
          <h3 className="text-3xl md:text-4xl font-bold tracking-tight">Reviews</h3>
          
          <div className="flex items-center gap-4">
            <h4 className="text-6xl font-bold tracking-tighter">{reviewSummary.overallRating}</h4>
            <div className="flex flex-col gap-1">
              <div className="flex text-yellow-500">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} className={`w-5 h-5 ${i <= Math.floor(reviewSummary.overallRating) ? 'fill-current' : 'text-gray-300'}`} />
                ))}
              </div>
              <span className="text-sm font-medium text-[var(--color-secondary)]">Based on {totalReviews.toLocaleString()} reviews</span>
            </div>
          </div>

          <div className="space-y-3">
            {distributions.map(({ stars, count, percentage }) => (
              <div key={stars} className="flex items-center gap-3 text-sm font-medium text-[var(--color-secondary)]">
                <span className="w-8 shrink-0">{stars} Stars</span>
                <div className="flex-1 h-2 bg-black/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-500 rounded-full" 
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right">{percentage}%</span>
              </div>
            ))}
          </div>

          <button className="w-full py-4 border-2 border-[var(--color-foreground)] rounded-full font-bold hover:bg-[var(--color-foreground)] hover:text-[var(--color-background)] transition-colors">
            Write a Review
          </button>
        </div>

        {/* Right: AI Summary */}
        <div className="col-span-1 lg:col-span-8">
          <div className="p-8 bg-gradient-to-br from-[var(--color-accent)]/10 to-transparent border border-[var(--color-accent)]/20 rounded-[2rem] h-full flex flex-col justify-center">
            <div className="flex items-center gap-2 text-[var(--color-accent)] font-bold uppercase tracking-wider text-sm mb-4">
              <Sparkles className="w-5 h-5" />
              <span>AI Review Summary</span>
            </div>
            <p className="text-xl md:text-2xl leading-relaxed font-medium">"{reviewSummary.aiSummary}"</p>
          </div>
        </div>

      </div>

      {/* Featured Reviews Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {featuredReviews.map((review) => (
          <div key={review.id} className="p-6 md:p-8 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[2rem] flex flex-col h-full">
            
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-1.5 text-yellow-500">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} className={`w-4 h-4 ${i <= review.rating ? 'fill-current' : 'text-gray-300'}`} />
                ))}
              </div>
              <span className="text-sm font-medium text-[var(--color-secondary)]">{review.date}</span>
            </div>

            <h4 className="text-lg md:text-xl font-bold mb-3">{review.title}</h4>
            <p className="text-[var(--color-secondary)] text-base leading-relaxed mb-6 flex-1">
              {review.content}
            </p>

            {/* Photo Reviews */}
            {review.photos && review.photos.length > 0 && (
              <div className="flex gap-3 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                {review.photos.map((photo, idx) => (
                  <div key={idx} className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden">
                    <Image src={photo} alt="Review photo" fill sizes="80px" className="object-cover" />
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-6 border-t border-[var(--color-border)] mt-auto">
              <div className="flex items-center gap-2">
                <span className="font-bold">{review.author}</span>
                {review.isVerified && (
                  <div className="flex items-center gap-1 text-green-600 text-xs font-bold uppercase tracking-wider bg-green-50 px-2 py-1 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </div>
                )}
              </div>
              
              {review.helpfulCount !== undefined && (
                <button className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-secondary)] hover:text-[var(--color-foreground)] transition-colors">
                  <ThumbsUp className="w-4 h-4" />
                  <span>Helpful ({review.helpfulCount})</span>
                </button>
              )}
            </div>

          </div>
        ))}
      </div>

    </section>
  );
}
