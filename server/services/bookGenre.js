
const GENRE_RULES = [
  ["Science Fiction", /\b(science fiction|sci-fi|scifi)\b/i],
  ["Fantasy", /\b(fantasy|epic fantasy|urban fantasy)\b/i],
  ["Mystery", /\b(mystery|mysteries|detective fiction|whodunit)\b/i],
  ["Thriller", /\b(thrillers?|suspense fiction)\b/i],
  ["Horror", /\b(horror|ghost stories)\b/i],
  ["Romance", /\b(romance|romantic fiction|love stories)\b/i],
  ["Historical Fiction", /\bhistorical fiction\b/i],
  ["Young Adult", /\b(young adult|juvenile fiction|teen fiction)\b/i],
  ["Biography", /\b(biograph(?:y|ies|ical)|memoirs?|autobiograph(?:y|ies))\b/i],
  ["Self-Help", /\b(self.help|personal development|self.improvement)\b/i],
  ["Business", /\b(business|entrepreneurship|management)\b/i],
  ["Psychology", /\bpsycholog(?:y|ical)\b/i],
  ["Philosophy", /\bphilosoph(?:y|ical)\b/i],
  ["History", /\bhistory|historical studies\b/i],
  ["Technology", /\b(technology|computers|programming|software)\b/i],
  ["Science", /\b(science|physics|chemistry|biology|astronomy)\b/i],
  ["Poetry", /\bpoetry|poems\b/i],
  ["Religion", /\b(religion|religious|spirituality)\b/i],
  ["Children's", /\b(children's books|picture books|juvenile literature)\b/i],
  ["Fiction", /\bfiction\b/i],
];

function normalizeBookGenre(values) {
  if (!Array.isArray(values)) return "";

  for (const value of values.slice(0, 30)) {
    if (typeof value !== "string") continue;

    const category = value.trim().slice(0, 200);
    if (!category) continue;

    for (const [genre, pattern] of GENRE_RULES) {
      if (pattern.test(category)) return genre;
    }
  }

  return "";
}

module.exports = { normalizeBookGenre };

