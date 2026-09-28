/**
 * Shared API-error explainer for storefront forms.
 *
 * The API's 422 validation errors arrive (via api-client parseError) as a
 * joined string of "body.<field>: <reason>" entries; other statuses carry
 * codes like EMAIL_TAKEN / PHONE_IN_USE / RATE_LIMITED. This maps all of
 * them to plain language a shopper can act on, instead of raw "422".
 */

export type FieldHint = { field: string; text: string };

const FIELD_LABELS: Record<string, string> = {
  first_name: "First name",
  last_name: "Last name",
  full_name: "Full name",
  name: "Name",
  email: "Email",
  phone: "Mobile number",
  password: "Password",
  new_password: "New password",
  current_password: "Current password",
  confirm_password: "Password confirmation",
  line1: "Address",
  line2: "Address (line 2)",
  landmark: "Landmark",
  city: "City",
  state: "State",
  pincode: "Pincode",
  label: "Address label",
  message: "Message",
  subject: "Subject",
  body: "Details",
  mobile: "Mobile number",
  coupon_code: "Coupon code",
};

const label = (raw: string) => FIELD_LABELS[raw] || raw.replace(/_/g, " ");

export function explainApiError(err: any): { summary: string; field?: string; fieldText?: string } {
  const status = Number(err?.status ?? 0);
  const raw = String(err?.message || "");
  const code = String(err?.code ?? "");
  const lower = raw.toLowerCase();

  if (status === 429 || code === "RATE_LIMITED" || lower.includes("too many requests") || lower.includes("rate limit")) {
    return {
      summary:
        "You've tried several times in a short window. For security, please wait a few minutes and try again.",
    };
  }
  if (code === "EMAIL_TAKEN" || (status === 400 && lower.includes("email already"))) {
    return {
      summary: "This email is already registered — try signing in instead, or use a different email.",
      field: "email",
      fieldText: "This email is already registered.",
    };
  }
  if (code === "PHONE_IN_USE" || lower.includes("mobile number is already")) {
    return {
      summary: "This mobile number is already registered on another account — one account per number.",
      field: "phone",
      fieldText: "This mobile number is already registered.",
    };
  }
  if (status === 401) {
    return { summary: raw || "Your session expired — please sign in and try again." };
  }
  if (status === 403) {
    return { summary: raw || "You don't have permission for that action." };
  }
  if (status === 409) {
    return { summary: raw || "That change conflicts with the current state — refresh and try again." };
  }
  if (status >= 500) {
    return { summary: "Something went wrong on our side. Please try again in a moment." };
  }

  // Field validation (422): translate every "body.<field>: <reason>" entry.
  if (lower.includes("body.") || status === 422) {
    const problems: FieldHint[] = [];
    const re = /body\.([a-z_0-9]+)[:\s]+([^;]+)(?:;|$)/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(raw)) !== null) {
      const field = m[1];
      let reason = m[2].trim().replace(/^value error,\s*/i, "").replace(/\.$/, "");
      // Humanize the most common reasons
      if (/at least 1 character/i.test(reason)) reason = `${label(field)} is required`;
      if (/at least (\d+) characters?/i.test(reason)) {
        reason = reason.replace(/String should have at least/i, "Must have at least");
      }
      if (/not a valid email/i.test(reason)) reason = "Enter a valid email address (e.g. name@example.com)";
      problems.push({
        field,
        text: /^must have|^is required|^enter a valid/i.test(reason)
          ? `${reason}.`
          : `${label(field)}: ${reason}.`,
      });
    }
    // Password-strength messages usually live in the password entry's reason
    if (lower.includes("password") && (lower.includes("uppercase") || lower.includes("special") || lower.includes("lowercase") || lower.includes("8 characters"))) {
      const missing: string[] = [];
      if (lower.includes("uppercase")) missing.push("an uppercase letter");
      if (lower.includes("lowercase")) missing.push("a lowercase letter");
      if (lower.includes("number") || lower.includes("digit")) missing.push("a number");
      if (lower.includes("special")) missing.push("a special character (like ! or @)");
      if (!missing.length) missing.push("at least 8 characters");
      problems.push({
        field: "password",
        text: `Your password is missing ${missing.join(" and ")}.`,
      });
    }
    if (problems.length) {
      return {
        summary: "Please fix the following: " + problems.map((p) => p.text).join(" "),
        field: problems[0].field,
        fieldText: problems[0].text,
      };
    }
    return { summary: raw || "Please check the highlighted fields and try again." };
  }

  return { summary: raw || "Something went wrong. Please try again." };
}
