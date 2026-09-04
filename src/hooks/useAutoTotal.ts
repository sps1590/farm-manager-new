"use client";

import { useState } from "react";

// Keeps Quantity x Unit price = Total amount in sync as either factor
// changes. Total amount stays a normal editable field -- typing into it
// directly overrides the computed value, but the next Quantity/Unit price
// edit recalculates and replaces that override, same as most invoicing UIs.
export function useAutoTotal(initial?: { quantity?: string; unitPrice?: string; total?: string }) {
  const [quantity, setQuantity] = useState(initial?.quantity ?? "");
  const [unitPrice, setUnitPrice] = useState(initial?.unitPrice ?? "");
  const [total, setTotal] = useState(initial?.total ?? "");

  function recompute(q: string, p: string) {
    if (q === "" || p === "") return;
    const qNum = Number(q);
    const pNum = Number(p);
    if (Number.isFinite(qNum) && Number.isFinite(pNum)) {
      setTotal(String(Math.round(qNum * pNum * 100) / 100));
    }
  }

  return {
    quantity,
    unitPrice,
    total,
    onQuantityChange: (value: string) => {
      setQuantity(value);
      recompute(value, unitPrice);
    },
    onUnitPriceChange: (value: string) => {
      setUnitPrice(value);
      recompute(quantity, value);
    },
    onTotalChange: (value: string) => setTotal(value),
  };
}
