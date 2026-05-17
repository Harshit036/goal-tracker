"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

function useTilt(enabled: boolean, intensity = 10) {
  const ref = React.useRef<HTMLDivElement>(null);

  const onMouseMove = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!enabled || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      ref.current.style.transform = `perspective(700px) rotateY(${x * intensity}deg) rotateX(${-y * intensity}deg) scale3d(1.015,1.015,1.015)`;
      ref.current.style.transition = "transform 0.08s ease";
    },
    [enabled, intensity]
  );

  const onMouseLeave = React.useCallback(() => {
    if (!enabled || !ref.current) return;
    ref.current.style.transform = "";
    ref.current.style.transition = "transform 0.5s cubic-bezier(0.23,1,0.32,1)";
  }, [enabled]);

  return { ref, onMouseMove, onMouseLeave };
}

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  tilt?: boolean;
  glass?: boolean;
  glow?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, tilt = false, glass = false, glow = false, ...props }, _ref) => {
    const { ref, onMouseMove, onMouseLeave } = useTilt(tilt);

    return (
      <div
        ref={ref}
        onMouseMove={tilt ? onMouseMove : undefined}
        onMouseLeave={tilt ? onMouseLeave : undefined}
        style={tilt ? { transformStyle: "preserve-3d", willChange: "transform" } : undefined}
        className={cn(
          "rounded-xl border shadow-sm",
          "bg-[var(--surface)] border-[var(--border)] text-[var(--fg)]",
          glass && "glass bg-white/60 dark:bg-white/[0.04] border-white/30 dark:border-white/[0.08]",
          glow && "dark:hover:shadow-[0_0_30px_var(--glow)]",
          "transition-shadow duration-300",
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("font-semibold leading-none tracking-tight text-[var(--fg)]", className)}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-[var(--fg-2)]", className)} {...props} />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
