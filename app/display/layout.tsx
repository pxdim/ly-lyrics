import type { ReactNode } from "react";

export default function DisplayLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="display-mode fixed inset-0 bg-black">
      {children}
    </div>
  );
}
