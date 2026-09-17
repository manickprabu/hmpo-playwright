import fs from 'node:fs/promises';

export async function readPassportNumbers(inputPath: string): Promise<string[]> {
  const input = await fs.readFile(inputPath, 'utf8');
  const seen = new Set<string>();
  for (const line of input.split(/\r?\n/)) {
    const passport = line.trim();
    if (!passport || passport.startsWith('#')) continue;
    seen.add(passport);
  }
  return [...seen];
}
