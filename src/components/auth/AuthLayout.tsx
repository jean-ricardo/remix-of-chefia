import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ChefiaLogo } from "@/components/brand/ChefiaLogo";

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F7F6F2] px-4 py-10 md:py-16">
      <div className="mx-auto flex w-full max-w-md flex-col items-center">
        {/* Logo with generous safe area */}
        <Link to="/login" className="mb-8 block p-6" aria-label="Chef.IA">
          <ChefiaLogo className="h-60 w-auto md:h-72" />
        </Link>

        <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-lg sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold text-[#042C53] md:text-2xl">{title}</h1>
            {subtitle ? (
              <p className="mt-2 text-sm text-[#444441]">{subtitle}</p>
            ) : null}
          </div>
          {children}
        </div>

        <p className="mt-8 text-center text-xs text-[#6B6B67]">
          © {new Date().getFullYear()} Chef.IA · Gestão de rotina para equipes
        </p>
      </div>
    </div>
  );
}
