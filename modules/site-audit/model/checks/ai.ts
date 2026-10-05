import type { PageData } from "@/modules/site-audit/model/data/net";
import type { PageCheck } from "@/modules/site-audit/model/types";
import { sameAsLinks } from "./structure";

        // tinta minima de pagini analizate
export const LLM_CRAWLERS = ["GPTBot", "ClaudeBot", "PerplexityBot", "OAI-SearchBot", "CCBot", "Googlebot-Extended"];

// ── Robots.txt LLM check ─────────────────────────────────────────────────────

export function checkLLMCrawlers(robotsTxt: string): { correctCount: number; total: number } {
  if (!robotsTxt) return { correctCount: 0, total: LLM_CRAWLERS.length };
  const isBlocked = (crawler: string): boolean => {
    const re = new RegExp(`User-agent:\\s*${crawler}[\\s\\S]*?Disallow:\\s*/(?!\\n|$)`, "i");
    return re.test(robotsTxt);
  };
  const allowed = LLM_CRAWLERS.filter(c => !isBlocked(c));
  return { correctCount: allowed.length, total: LLM_CRAWLERS.length };
}

// GEO / AI search (devrika-seo pillar 9): AI crawler access, llms.txt, and the entity links AI answers rely on.
export function computeAiChecks(robotsTxt: string, llmsTxt: string, pages: PageData[]): PageCheck[] {
  const llmCheck = checkLLMCrawlers(robotsTxt);
  const llmsOk = /^\s*#\s*\S/.test(llmsTxt) && llmsTxt.trim().length >= 100;
  const sameAsCount = sameAsLinks(pages).size;
  return [
    {
      id: "robots_llm", label: "Acces pentru robotii AI", unit: "crawlere",
      correctCount: llmCheck.correctCount, total: llmCheck.total,
      problema: "robots.txt poate bloca crawlerii LLM (GPTBot, ClaudeBot, PerplexityBot). Site-ul nu va fi citat ca sursa in raspunsurile AI.",
      fix: "Adauga in robots.txt:\nUser-agent: GPTBot\nAllow: /\nUser-agent: ClaudeBot\nAllow: /\nUser-agent: PerplexityBot\nAllow: /",
    },
    {
      id: "llms_txt", label: "Fisierul llms.txt", unit: "fisier",
      correctCount: llmsOk ? 1 : 0, total: 1,
      problema: "Magazinul nu are un fisier llms.txt: un rezumat al site-ului, scris pentru ChatGPT, Claude si Perplexity, care le spune ce vinzi si ce pagini sa citeasca.",
      fix: "Publica la /llms.txt un rezumat al magazinului: ce vinzi, categoriile principale cu link si paginile importante (livrare, retur, contact).",
    },
    {
      id: "entitate_ai", label: "Identitatea firmei pentru AI", unit: "legaturi",
      correctCount: Math.min(sameAsCount, 2), total: 2,
      problema: "Schema organizatiei nu leaga magazinul de profilurile lui oficiale (Facebook, Instagram, Google). Asistentii AI il recunosc mai greu ca firma reala.",
      fix: "Adauga in schema Organization campul sameAs cu profilurile oficiale ale firmei.",
    },
  ];
}
