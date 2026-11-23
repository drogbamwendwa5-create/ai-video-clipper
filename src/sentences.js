export function buildSentences(words) {
  if (!Array.isArray(words) || words.length === 0) return [];
  const cleaned = words.filter((item) => item?.word?.trim());
  const sentences = [];
  let current = [];
  for (let index = 0; index < cleaned.length; index += 1) {
    const word = cleaned[index];
    current.push(word);
    const text = word.word.trim();
    const terminal = /[.!?]["')\]]?$/.test(text);
    const next = cleaned[index + 1];
    const pause = next ? next.start - word.end : 0;
    const abbreviation = /^(?:[A-Z][a-z]?\.|(?:e\.g\.|i\.e\.|Dr\.|Mr\.|Mrs\.|Ms\.))$/i.test(text);
    const decimal = /^\d+\.$/.test(text) && next && /^\d/.test(next.word);
    const atCap = current.length >= 40;
    if ((terminal && !abbreviation && !decimal) || pause > 0.8 || atCap) {
      sentences.push(makeSentence(sentences.length + 1, current));
      current = [];
    }
  }
  if (current.length) sentences.push(makeSentence(sentences.length + 1, current));
  return sentences;
}

function makeSentence(id, words) {
  return {
    id,
    text: words.map((word) => word.word).join(" ").replace(/\s+([,.!?;:)])/g, "$1"),
    start: words[0].start,
    end: words[words.length - 1].end,
  };
}
