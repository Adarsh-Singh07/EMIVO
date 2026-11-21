"use client";

import React from "react";
import Image from "next/image";
import { BRAND_CONFIG } from "@/config/branding";

interface BrandLogoProps {
  variant?: "icon" | "wordmark";
  size?: number;
  width?: number;
  height?: number;
  className?: string;
  showText?: boolean;
  subtitle?: string;
}

export function BrandLogo({
  variant = "icon",
  size = 32,
  width,
  height,
  className = "",
  showText = false,
  subtitle,
}: BrandLogoProps) {
  const isIcon = variant === "icon";
  const iconSize = size;
  const isWordmark = variant === "wordmark";

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        className="relative shrink-0 flex items-center justify-center rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800"
        style={{ width: iconSize, height: iconSize }}
      >
        <Image
          src={BRAND_CONFIG.assets.iconLogo}
          alt={BRAND_CONFIG.name}
          width={iconSize}
          height={iconSize}
          priority
          className="object-contain w-full h-full p-0.5"
        />
      </div>

      {(isWordmark || showText) && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold tracking-tight text-neutral-900 dark:text-white text-base sm:text-lg">
              {BRAND_CONFIG.name}
            </span>
          </div>
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
