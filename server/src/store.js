import fs from 'node:fs/promises';
import path from 'node:path';

const EMPTY = { checkedAt: null, updatedAt: null, games: [], videos: {} };

export function createFileStore(file) {
  return {
    async load() {
      try {
        return { ...EMPTY, ...JSON.parse(await fs.readFile(file, 'utf8')) };
      } catch (err) {
        if (err.code === 'ENOENT') return structuredClone(EMPTY);
        throw err;
      }
    },
    async save(data) {
      await fs.mkdir(path.dirname(file), { recursive: true });
      const tmp = `${file}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(data, null, 2));
      await fs.rename(tmp, file);
    },
  };
}
