const sharedParser = typeof DOMParser === "undefined" ? null : new DOMParser();

export const stripInvisibleChars = (value: string) => value.replace(/[\u200B\uFEFF]/g, "");

export const extractTextContentFromHtml = (lineHtml: string) => {
  if (!lineHtml) {
    return "";
  }
  if (!sharedParser) {
    return stripInvisibleChars(lineHtml.replace(/<[^>]*>/g, ""));
  }
  const document = sharedParser.parseFromString(`<div>${lineHtml}</div>`, "text/html");
  return stripInvisibleChars(document.body.firstElementChild?.textContent ?? "");
};

export const countCh = (value: string) => [...value].length;

export const matchesAny = (value: string, patterns: RegExp[]) =>
  patterns.some((pattern) => pattern.test(value));

export const isBlankLikeLine = (value: string) => stripInvisibleChars(value).trim().length === 0;
