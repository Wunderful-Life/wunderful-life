/**
 * Published sources for the UGC proof stats. Matched by the figure itself so
 * the citation (and the exact claim the source supports) is shown even when
 * the label text comes from saved CMS content. Only add real, verified sources.
 */
export type StatSource = {
  /** Claim wording that matches what the source actually reports. */
  label: string;
  sourceName: string;
  sourceUrl: string;
};

export const STAT_SOURCES: Record<string, StatSource> = {
  "2.4×": {
    label: "more likely to call UGC authentic than brand-created content",
    sourceName: "Stackla, Consumer & Marketer Perspectives on Content (2019)",
    sourceUrl:
      "https://www.nosto.com/wp-content/uploads/2019/02/Stackla-Consumer-Marketer-Data-Report-2019_FINAL.pdf",
  },
  "73%": {
    label: "of shoppers say UGC increases their purchasing confidence",
    sourceName: "TurnTo / Ipsos survey via Retail TouchPoints (2017)",
    sourceUrl:
      "https://www.retailtouchpoints.com/news/user-generated-content-influences-90-of-shoppers-purchasing-decisions/18456/",
  },
  "79%": {
    label: "of people say UGC highly impacts their purchasing decisions",
    sourceName: "Stackla, Consumer & Marketer Perspectives on Content (2019)",
    sourceUrl:
      "https://www.nosto.com/wp-content/uploads/2019/02/Stackla-Consumer-Marketer-Data-Report-2019_FINAL.pdf",
  },
};

export function statSource(value: string): StatSource | undefined {
  return STAT_SOURCES[value.trim().replace(/x$/i, "×")];
}
