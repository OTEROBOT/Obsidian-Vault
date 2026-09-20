/**
 * Utilities for text sanitation, decoding HTML entities, and formatting.
 */

const HTML_ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#039;': "'",
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&copy;': '©',
  '&reg;': '®',
  '&trade;': '™',
  '&mdash;': '—',
  '&ndash;': '–',
  '&hellip;': '…',
};

/**
 * Decodes all HTML entities (e.g., 'Triangle&#039;s Videos' -> "Triangle's Videos", '&amp;' -> '&')
 */
export function decodeHtmlEntities(text: string | null | undefined): string {
  if (!text) return '';

  let decoded = text;

  // 1. Replace named and known entities
  for (const [entity, char] of Object.entries(HTML_ENTITY_MAP)) {
    if (decoded.includes(entity)) {
      decoded = decoded.split(entity).join(char);
    }
  }

  // 2. Decimal entities (e.g., &#39;, &#039;, &#8217;)
  decoded = decoded.replace(/&#(\d+);/g, (_, dec) => {
    try {
      const code = parseInt(dec, 10);
      return String.fromCharCode(code);
    } catch {
      return _;
    }
  });

  // 3. Hexadecimal entities (e.g., &#x27;, &#x2019;)
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    try {
      const code = parseInt(hex, 16);
      return String.fromCharCode(code);
    } catch {
      return _;
    }
  });

  return decoded;
}
