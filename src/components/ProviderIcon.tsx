import type { UsageProvider } from "../types/usage";

interface Props {
  provider: Pick<UsageProvider, "icon" | "brand" | "name">;
  /** Height in px. */
  size?: number;
  /** Optional status dot (activity). */
  dot?: "active" | "idle" | "off";
}

/** Bundled mark when available, otherwise a generic glyph badge. */
export function ProviderIcon({ provider, size = 22, dot }: Props) {
  const { logo, color } = provider.brand;
  return (
    <span className="picon" title={provider.name} style={{ height: size }}>
      {logo ? (
        <img src={logo} alt={provider.name} style={{ height: size }} draggable={false} />
      ) : (
        <span
          className="picon-glyph"
          style={{ width: size, height: size, fontSize: size * 0.55, background: color }}
        >
          {provider.icon}
        </span>
      )}
      {dot && <span className={`picon-dot picon-dot-${dot}`} />}
    </span>
  );
}
