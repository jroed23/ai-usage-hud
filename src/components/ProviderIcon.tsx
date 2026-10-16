import type { UsageProvider } from "../types/usage";

interface Props {
  provider: Pick<UsageProvider, "icon" | "brand" | "name">;
  size?: number;
  /** Optional status dot (activity). */
  dot?: "active" | "idle" | "off";
}

/** Generic glyph badge: official logos are only used when bundled and licensed. */
export function ProviderIcon({ provider, size = 22, dot }: Props) {
  return (
    <span
      className="picon"
      title={provider.name}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.55,
        background: provider.brand.color,
      }}
    >
      {provider.icon}
      {dot && <span className={`picon-dot picon-dot-${dot}`} />}
    </span>
  );
}
