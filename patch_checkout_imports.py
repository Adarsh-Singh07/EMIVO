with open("storefront/app/checkout/page.tsx", "r") as f:
    content = f.read()

content = content.replace(
    'import { useRouter } from "next/navigation";',
    'import { useRouter, useSearchParams } from "next/navigation";'
)

target_hook = """  const { user, loading: authLoading } = useAuth();
  const router = useRouter();"""

replacement_hook = """  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    if (searchParams.get("error") === "payment_cancelled") {
      toast.error("Payment was cancelled or failed. Please try again.");
      // optionally clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [searchParams]);"""

content = content.replace(target_hook, replacement_hook)

with open("storefront/app/checkout/page.tsx", "w") as f:
    f.write(content)
print("Patched checkout imports!")
