'use client';

export function PrintButton() {
  return <button onClick={() => window.print()} className="rounded-lg bg-garden px-4 py-2 text-night">Save as PDF</button>;
}
