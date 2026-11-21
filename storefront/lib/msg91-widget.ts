"use client";

declare global {
  interface Window {
    initSendOTP?: (config: any) => void;
    sendOtp?: (
      identifier: string,
      success?: (data: any) => void,
      failure?: (error: any) => void
    ) => void;
    retryOtp?: (
      channel: string | null,
      success?: (data: any) => void,
      failure?: (error: any) => void,
      reqId?: string
    ) => void;
    verifyOtp?: (
      otp: string | number,
      success?: (data: any) => void,
      failure?: (error: any) => void,
      reqId?: string
    ) => void;
  }
}

const WIDGET_ID =
  process.env.NEXT_PUBLIC_MSG91_OTP_WIDGET_ID || "366b706e3145353733353938";
const TOKEN_AUTH =
  process.env.NEXT_PUBLIC_MSG91_OTP_TOKEN_AUTH || "583361TvtdbiVrZ6afb1a64P1";

let initPromise: Promise<boolean> | null = null;
let lastVerifiedToken: string | null = null;

export function getWidgetToken(): string | null {
  return lastVerifiedToken;
}

export function clearWidgetToken(): void {
  lastVerifiedToken = null;
}

/**
 * Dynamically loads and initializes the MSG91 SendOTP widget with `exposeMethods: true`.
 * This does NOT display any modal/popup or change the UI; it only exposes
 * window.sendOtp, window.retryOtp, and window.verifyOtp for seamless custom UI integration.
 */
export function initMsg91Widget(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.sendOtp && typeof window.sendOtp === "function") {
    return Promise.resolve(true);
  }
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve) => {
    const attachConfig = () => {
      if (typeof window.initSendOTP === "function") {
        try {
          window.initSendOTP({
            widgetId: WIDGET_ID,
            tokenAuth: TOKEN_AUTH,
            exposeMethods: true,
            captchaRenderId: "",
            success: (data: any) => {
              if (data) {
                lastVerifiedToken =
                  typeof data === "string"
                    ? data
                    : data.message ||
                      data.access_token ||
                      data["access-token"] ||
                      JSON.stringify(data);
              }
            },
            failure: (err: any) => {
              console.warn("MSG91 widget failure callback:", err);
            },
          });
          resolve(true);
        } catch (e) {
          console.warn("initSendOTP error:", e);
          resolve(false);
        }
      } else {
        resolve(false);
      }
    };

    const existing = document.querySelector(
      'script[src*="verify.msg91.com/otp-provider.js"]'
    );
    if (existing) {
      if (window.initSendOTP) {
        attachConfig();
      } else {
        existing.addEventListener("load", attachConfig);
      }
      return;
    }

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://verify.msg91.com/otp-provider.js";
    script.async = true;
    script.onload = () => {
      // Small timeout to allow script to define initSendOTP
      setTimeout(attachConfig, 50);
    };
    script.onerror = () => {
      console.warn("Failed to load MSG91 otp-provider.js");
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return initPromise;
}

/**
 * Sends OTP to a phone or email using MSG91's SendOTP widget.
 * For phone numbers, automatically ensures '91' country code without '+' sign.
 */
export async function sendWidgetOtp(
  identifier: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const ready = await initMsg91Widget();
  if (!ready || typeof window.sendOtp !== "function") {
    return { success: false, error: "OTP service not ready" };
  }

  let id = identifier.trim();
  if (!id.includes("@")) {
    let clean = id.replace(/\D/g, "");
    if (clean.length === 10) clean = "91" + clean;
    id = clean;
  }

  return new Promise((resolve) => {
    try {
      window.sendOtp!(
        id,
        (data) => {
          resolve({ success: true, data });
        },
        (err) => {
          const msg =
            typeof err === "string"
              ? err
              : err?.message || err?.description || "Could not send OTP";
          resolve({ success: false, error: msg });
        }
      );
    } catch (e: any) {
      resolve({ success: false, error: e?.message || "Failed to trigger OTP" });
    }
  });
}

/**
 * Retries/resends OTP.
 * channel: '12' for WhatsApp, '11' for SMS, '4' for Voice, '3' for Email, or null for widget default.
 */
export async function retryWidgetOtp(
  channel: string | null = "12"
): Promise<{ success: boolean; data?: any; error?: string }> {
  if (typeof window.retryOtp !== "function") {
    return { success: false, error: "OTP service not ready" };
  }

  return new Promise((resolve) => {
    try {
      window.retryOtp!(
        channel,
        (data) => resolve({ success: true, data }),
        (err) => {
          const msg =
            typeof err === "string"
              ? err
              : err?.message || err?.description || "Could not resend OTP";
          resolve({ success: false, error: msg });
        }
      );
    } catch (e: any) {
      resolve({ success: false, error: e?.message || "Failed to resend OTP" });
    }
  });
}

/**
 * Verifies OTP code using MSG91's SendOTP widget.
 * On success, returns the verified access token (JWT) needed for server-side verification.
 */
export async function verifyWidgetOtp(
  code: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  if (typeof window.verifyOtp !== "function") {
    return { success: false, error: "OTP service not ready" };
  }

  return new Promise((resolve) => {
    try {
      window.verifyOtp!(
        code.trim(),
        (data) => {
          const token =
            (typeof data === "string"
              ? data
              : data?.message ||
                data?.access_token ||
                data?.["access-token"]) ||
            lastVerifiedToken ||
            "";
          lastVerifiedToken = token;
          resolve({ success: true, token });
        },
        (err) => {
          const msg =
            typeof err === "string"
              ? err
              : err?.message || err?.description || "Incorrect code. Please try again.";
          resolve({ success: false, error: msg });
        }
      );
    } catch (e: any) {
      resolve({ success: false, error: e?.message || "Verification failed" });
    }
  });
}
