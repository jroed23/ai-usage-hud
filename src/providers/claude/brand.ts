import type { ProviderBrand } from "../../types/usage";
import logo from "../../assets/providers/claude.svg";

/**
 * Independent project: no affiliation with Anthropic. The pixel mascot is the
 * Claude Code mark, supplied by the project owner and bundled at their request.
 * It is Anthropic's trademark: confirm the brand guidelines before making the
 * repository public or distributing builds (see docs/brand-assets.md).
 */
export const claudeBrand: ProviderBrand = {
  color: "#DE7B59",
  officialUrl: "https://claude.ai",
  docsUrl: "https://code.claude.com/docs/en/statusline",
  officialLogo: true,
  logo,
};
