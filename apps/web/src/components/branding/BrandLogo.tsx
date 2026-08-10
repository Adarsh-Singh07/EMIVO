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
}

export function BrandLogo({
  variant = "icon",
  size = 32,
  width,
  height,
  className = "",
  showText = false,
}: BrandLogoProps) {
  const isIcon = variant === "icon";
  const logoSrc = isIcon
    ? BRAND_CONFIG.assets.iconLogo
    : BRAND_CONFIG.assets.wordmarkLogo;

  const logoWidth = width || (isIcon ? size : size * 4);
  const logoHeight = height || size;

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <Image
        src={logoSrc}
        alt={BRAND_CONFIG.name}
        width={logoWidth}
        height={logoHeight}
        priority
        className="object-contain"
      />
      {isIcon && showText && (
        <span className="font-extrabold tracking-tight text-neutral-900 dark:text-white text-lg">
          {BRAND_CONFIG.name}
        </span>
      )}
    </div>
  );
}
