// User preferences recalled from memory (extracted by Walrus Memory's analyze()).
// Deterministic and tighten-only: a preference can skip a service or lower the price ceiling,
// never loosen a limit. The onchain grant stays the hard bound.

export interface PreferenceFact {
  text: string;
  blobId?: string | null;
}

export interface PrefDecision {
  skip: boolean;
  reason?: string;
  fact?: PreferenceFact;
}

const NEGATIVE = /\b(never|don'?t|do not|skip|avoid|stop|no longer|refuse|not)\b/i;
const CEILING = /\b(?:more than|over|above|exceed(?:ing)?)\s*\$?\s*(\d+(?:\.\d+)?)\s*(?:usdc|usd|\$|dollars?)?/i;

/** Words that name each service in plain language. */
export const SERVICE_ALIASES: Record<string, string[]> = {
  summary: ["summar", "premium summar", "executive overview"],
  holders: ["holder", "token holder"],
  "wallet-risk": ["wallet risk", "risk report"],
};

export function applyPreferences(service: string, priceBase: number, facts: PreferenceFact[]): PrefDecision {
  const aliases = SERVICE_ALIASES[service] ?? [service];
  for (const f of facts) {
    const t = f.text.toLowerCase();
    const names = aliases.some((a) => t.includes(a));
    if (names && NEGATIVE.test(t) && !CEILING.test(t)) {
      return { skip: true, reason: `you asked: "${f.text}"`, fact: f };
    }
    const m = t.match(CEILING);
    if (m && /\b(pay|spend|cost|call|purchase|price)/.test(t)) {
      const ceiling = Math.round(Number(m[1]) * 1e6);
      if (priceBase > ceiling && (names || !Object.values(SERVICE_ALIASES).flat().some((a) => t.includes(a)))) {
        return { skip: true, reason: `you asked: "${f.text}" (${priceBase / 1e6} > ${ceiling / 1e6} USDC)`, fact: f };
      }
    }
  }
  return { skip: false };
}
