/**
 * Utility for parsing and repairing JSON strings returned by LLMs
 */

export function repairUnescapedQuotes(str: string): string {
  let result = "";
  let inString = false;
  let i = 0;

  while (i < str.length) {
    const char = str[i];

    if (char === '"') {
      // Check if it is escaped by backslash
      let backslashes = 0;
      let j = i - 1;
      while (j >= 0 && str[j] === '\\') {
        backslashes++;
        j--;
      }
      const isEscaped = backslashes % 2 !== 0;

      if (isEscaped) {
        result += char;
        i++;
        continue;
      }

      if (!inString) {
        // Start of string
        inString = true;
        result += char;
      } else {
        // We are in a string. Look ahead to see if this quote is a terminator.
        // A terminator quote must be followed by optional whitespace and then one of: , : } ] or end of string
        let nextChar = "";
        let k = i + 1;
        while (k < str.length) {
          const c = str[k];
          if (c !== ' ' && c !== '\t' && c !== '\r' && c !== '\n') {
            nextChar = c;
            break;
          }
          k++;
        }

        const isTerminator =
          nextChar === "," ||
          nextChar === ":" ||
          nextChar === "}" ||
          nextChar === "]" ||
          nextChar === "";

        if (isTerminator) {
          inString = false;
          result += char;
        } else {
          // This is an unescaped quote inside the string! Escape it.
          result += '\\"';
        }
      }
    } else {
      result += char;
    }
    i++;
  }
  return result;
}

export function safeJsonParse<T>(jsonStr: string): T {
  let cleanStr = jsonStr.trim();

  // Remove markdown code blocks if present
  if (cleanStr.startsWith("```")) {
    cleanStr = cleanStr.replace(/^```(?:json)?\n?/i, "");
    cleanStr = cleanStr.replace(/\n?```$/, "");
  }
  cleanStr = cleanStr.trim();

  // Find first { and last } to strip any pre/post commentary
  const firstBrace = cleanStr.indexOf("{");
  const lastBrace = cleanStr.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleanStr = cleanStr.substring(firstBrace, lastBrace + 1);
  }

  // Try standard parse first
  try {
    return JSON.parse(cleanStr) as T;
  } catch (err) {
    console.warn("Standard JSON parse failed, attempting regex/unescaped quote repair. Error:", err);
  }

  // Repair trailing commas and unescaped quotes
  try {
    let repaired = cleanStr;
    // Strip trailing commas in objects and arrays
    repaired = repaired.replace(/,(\s*[}\]])/g, "$1");
    // Repair unescaped quotes
    const fixed = repairUnescapedQuotes(repaired);
    return JSON.parse(fixed) as T;
  } catch (err2) {
    console.error("JSON repair state machine failed, throwing final parser error:", err2);
    throw new Error(`JSON parsing failed: ${err2 instanceof Error ? err2.message : String(err2)}. Raw response: ${jsonStr.substring(0, 300)}...`);
  }
}
