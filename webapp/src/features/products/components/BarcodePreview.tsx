"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { isValidEan13 } from "../lib/barcode";

/**
 * Renders a barcode as SVG (S1). EAN-13 when the value is a valid code,
 * CODE128 as the fallback so SKUs and internal codes still visualize.
 */
export function BarcodePreview({
  value,
  height = 48,
}: {
  value: string;
  height?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const code = value.trim();

  useEffect(() => {
    if (!svgRef.current) return;
    if (!code) return;
    try {
      JsBarcode(svgRef.current, code, {
        format: isValidEan13(code) ? "EAN13" : "CODE128",
        height,
        margin: 2,
        fontSize: 12,
        background: "transparent",
        lineColor: "currentColor",
      });
    } catch {
      // Unrenderable value: leave the previous frame cleared.
      svgRef.current.innerHTML = "";
    }
  }, [code, height]);

  if (!code) return null;

  return (
    <svg
      ref={svgRef}
      className="mt-2 max-w-full text-slate-800 dark:text-slate-100"
      aria-label={`Código de barras ${code}`}
    />
  );
}
