import logoUrl from "@/assets/chefia-logo.png";

export function ChefiaLogo({
  className,
  variant = "full",
}: {
  className?: string;
  variant?: "full" | "mark";
}) {
  return (
    <img
      src={logoUrl}
      alt="Chef.IA"
      className={className}
      width={1024}
      height={1024}
      loading="lazy"
      data-variant={variant}
    />
  );
}
