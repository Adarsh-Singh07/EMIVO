"use client";

import React from "react";

interface BrandLogoProps {
  size?: number;
  className?: string;
  subtitle?: string;
  showText?: boolean;
}

export function BrandLogo({
  size = 32,
  className = "",
  subtitle = "SELLER CENTRAL",
  showText = true,
}: BrandLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Exact storefront icon treatment */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/branding/icon.png"
        alt="ELEKTRIX"
        style={{ width: size, height: size }}
        className="rounded-lg object-contain shrink-0"
      />

      {showText && (
        <div className="flex flex-col leading-none">
          <span className="text-lg font-bold tracking-tight text-neutral-900">
            ELEKTRIX
          </span>
          {subtitle && (
            <span className="text-[10px] font-semibold tracking-wider uppercase text-neutral-500 mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
