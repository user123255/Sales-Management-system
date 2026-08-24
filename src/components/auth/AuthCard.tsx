import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
}

export default function AuthCard({
  children,
  className = "",
}: Props) {

  return (
    <div
      className={`
      rounded-[2rem]
      border
      border-slate-200
      bg-white
      shadow-[0_25px_70px_rgba(15,23,42,0.08)]
      ${className}
      `}
    >
      {children}
    </div>
  );
}