"use client";

import React from "react";
import Image from "next/image";

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
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        className="relative shrink-0 flex items-center justify-center rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800 shadow-sm"
        style={{ width: size, height: size }}
      >
        <Image
          src="/branding/icon.png"
          alt="ELEKTRIX"
          width={size}
          height={size}
          priority
          className="object-contain w-full h-full p-0.5"
        />
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <span className="font-extrabold tracking-tight text-neutral-900 text-base sm:text-lg">
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
