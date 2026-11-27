"use client";

import React from "react";

interface BrandLogoProps {
  /** Edge of the icon tile in px. */
  size?: number;
  className?: string;
  /** Second line under the wordmark, e.g. "Seller central". */
  subtitle?: string;
  showText?: boolean;
}

/** ELEKTRIX lockup: the icon tile, the wordmark, and which console this is. */
export function BrandLogo({ size = 28, className = "", subtitle = "Seller central", showText = true }: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/branding/icon.png" alt="" width={size} height={size} className="shrink-0 rounded-md" />
      {showText && (
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight text-neutral-900">ELEKTRIX</span>
          {subtitle && <span className="text-xs text-neutral-500">{subtitle}</span>}
        </span>
      )}
    </span>
  );
}
