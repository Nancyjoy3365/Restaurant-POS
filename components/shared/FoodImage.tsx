import clsx from "clsx";
import type { MenuCategory } from "@/lib/types";
import { CATEGORY_EMOJI, CATEGORY_GRADIENT } from "@/lib/menuVisuals";

export function FoodImage({
  imageUrl,
  category,
  name,
  className,
  emojiClassName,
}: {
  imageUrl?: string;
  category: MenuCategory;
  name: string;
  className?: string;
  emojiClassName?: string;
}) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary user-supplied URLs, no domain to allowlist
      <img
        src={imageUrl}
        alt={name}
        className={clsx("object-cover", className)}
      />
    );
  }

  return (
    <div
      className={clsx(
        "flex items-center justify-center bg-gradient-to-br",
        CATEGORY_GRADIENT[category],
        className
      )}
    >
      <span className={clsx("drop-shadow-sm", emojiClassName ?? "text-4xl")}>
        {CATEGORY_EMOJI[category]}
      </span>
    </div>
  );
}
