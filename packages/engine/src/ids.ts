import { customAlphabet } from 'nanoid';

const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
const nano = customAlphabet(alphabet, 12);

export function createId(prefix?: string): string {
  const id = nano();
  return prefix ? `${prefix}_${id}` : id;
}
