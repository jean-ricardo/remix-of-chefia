import logoAsset from "@/assets/chefia-logo.png.asset.json";

export function ChefiaLogo({
  className,
  variant = "full",
}: {
  className?: string;
  variant?: "full" | "mark";
}) {
  return (
    <img
      src={logoAsset.url}
      alt="Chef.IA"
      className={className}
      loading="lazy"
      data-variant={variant}
    />
  );
}
