import { describe, expect, it } from 'vitest';
import { parseCsv, parseScriptCsv } from './script/csv';
import { parseScriptJson } from './script/json';
import { parseScriptText, splitParagraphs } from './script/text';
import { finalizeDraft } from './project-factory';
import { validateProject } from '@guidedreel/schema';
import { deserializeProject, serializeProject } from './serialization';

describe('text import', () => {
  it('splits paragraphs and assigns hook/text/cta', () => {
    const draft = parseScriptText(
      `Too much news, no time to read?\n\nMeet Ajako Taja.\n\nAI-powered trending stories.\n\nDownload today.`,
    );
    expect(draft.scenes?.map((s) => s.type)).toEqual(['hook', 'text', 'text', 'cta']);
    expect(draft.scenes?.[0]?.props).toEqual({ text: 'Too much news, no time to read?' });
    expect(draft.scenes?.[3]?.props).toEqual({ headline: 'Download today.' });
    const project = finalizeDraft(draft);
    expect(validateProject(project).success).toBe(true);
  });

  it('keeps single newlines inside a paragraph', () => {
    expect(splitParagraphs('a\nb\n\n\nc')).toEqual(['a\nb', 'c']);
  });
});

describe('csv import', () => {
  it('parses quoted fields', () => {
    expect(parseCsv('a,"b, c","d ""e"""\n1,2,3')).toEqual([
      ['a', 'b, c', 'd "e"'],
      ['1', '2', '3'],
    ]);
  });

  it('builds scenes and assets from the documented columns', () => {
    const csv = `order,script,media,voice,duration\n2,"Meet Ajako Taja","feature.jpg","voice2.mp3",5\n1,"Too much news?","intro.mp4","voice1.mp3",4`;
    const draft = parseScriptCsv(csv);
    expect(draft.scenes?.map((s) => s.type)).toEqual(['video', 'image']);
    expect(draft.scenes?.[0]?.durationSeconds).toBe(4);
    expect(draft.assets).toHaveLength(4);
    expect(draft.scenes?.[0]?.voiceoverAssetId).toBeDefined();
    const project = finalizeDraft(draft);
    expect(validateProject(project).success).toBe(true);
    expect(project.scenes[0]?.durationMode).toBe('fromAudio');
  });

  it('respects an explicit type column and rejects unknown types', () => {
    const ok = parseScriptCsv(`type,script\nhook,"Hi"\nquote,"Great"`);
    expect(ok.scenes?.map((s) => s.type)).toEqual(['hook', 'quote']);
    expect(() => parseScriptCsv(`type,script\nbanana,"Hi"`)).toThrowError(/unknown scene type/);
  });

  it('rejects CSV without a usable header', () => {
    expect(() => parseScriptCsv(`foo,bar\n1,2`)).toThrowError(/header/);
  });
});

describe('json import', () => {
  it('accepts an array of scenes or a draft object', () => {
    const a = parseScriptJson(JSON.stringify([{ type: 'hook', props: { text: 'x' } }]));
    expect(a.scenes).toHaveLength(1);
    const b = parseScriptJson(
      JSON.stringify({ name: 'N', scenes: [{ type: 'text', props: { text: 'y' } }] }),
    );
    expect(b.name).toBe('N');
    expect(() => parseScriptJson('{nope')).toThrowError(/valid JSON/);
  });
});

describe('serialization', () => {
  it('round-trips a project', () => {
    const p = finalizeDraft({ name: 'R', scenes: [{ type: 'text', props: { text: 'hi' } }] });
    const text = serializeProject(p);
    const back = deserializeProject(text);
    expect(back.success).toBe(true);
    if (back.success) expect(back.data).toEqual(p);
    expect(deserializeProject('garbage').success).toBe(false);
  });
});
