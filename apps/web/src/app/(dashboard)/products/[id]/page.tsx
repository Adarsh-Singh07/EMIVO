"use client";

import { use } from "react";
import { ProductEditor } from "../ProductEditor";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ProductEditor productId={id} />;
}
