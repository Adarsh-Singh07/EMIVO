import re

path = "/opt/elektrix/storefront/lib/store-api.ts"
with open(path, "r") as f:
    content = f.read()

old_type = """export interface StoreConfig {
  online_payment_available: boolean;
  payment_provider: string;
  cod_enabled: boolean;
  cod_fee_paise: number;
  flat_shipping_paise: number;
  free_shipping_threshold_paise: number;
  currency: string;
  storefront_url: string;
}"""

new_type = """export interface StoreConfig {
  online_payment_available: boolean;
  payment_provider: string;
  cod_enabled: boolean;
  cod_fee_paise: number;
  flat_shipping_paise: number;
  free_shipping_threshold_paise: number;
  currency: string;
  storefront_url: string;
  banner?: {
    active: boolean;
    title?: string;
    subtitle?: string;
    image_url?: string;
    link?: string;
  };
  announcement?: string;
}"""

content = content.replace(old_type, new_type)
with open(path, "w") as f:
    f.write(content)
