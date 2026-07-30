import { Toaster as Sonner } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Toaster responsivo:
 * - Mobile: topo centralizado, largura fluida e respeitando a safe-area.
 * - Desktop: topo à direita, sem cobrir o header.
 */
const Toaster = ({ position, ...props }: ToasterProps) => {
  const isMobile = useIsMobile();

  return (
    <Sonner
      className="toaster group"
      position={position ?? (isMobile ? "top-center" : "top-right")}
      offset={isMobile ? "calc(env(safe-area-inset-top) + 12px)" : "20px"}
      mobileOffset={{ top: "calc(env(safe-area-inset-top) + 12px)", left: "12px", right: "12px" }}
      toastOptions={{
        classNames: {
          toast:
            "group toast w-full group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl",
          title: "text-sm font-semibold",
          description: "group-[.toast]:text-muted-foreground text-xs",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
