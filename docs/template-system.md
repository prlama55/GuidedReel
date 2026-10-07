# Template system

A template is a **parameterized project factory**, not a static list of scenes:

```ts
type TemplateDefinition<TInput> = {
  meta: TemplateMeta; // id, name, description, category, supportedFormats, tags
  inputSchema: z.ZodType<TInput>; // what the template needs
  sampleInput: () => TInput; // "Use template" produces a real video immediately
  create: (input, ctx) => VideoProject;
};
```

`ctx` carries the chosen `format`/`aspectRatio` and project name. Templates support several aspect ratios; a template is never duplicated per platform. Reels, Shorts, TikTok and Stories are the Social Reel template in 9:16.

Built-in templates:

| id             | Scenes                                               | Formats              |
| -------------- | ---------------------------------------------------- | -------------------- |
| `modern-promo` | hook → intro → features (1–4) → quote? → cta → outro | 9:16, 16:9, 1:1, 4:5 |
| `product-ad`   | hook → product → features (0–3) → quote? → cta       | 9:16, 16:9, 1:1, 4:5 |
| `social-reel`  | hook → text beats (1–6) → cta                        | 9:16, 1:1, 4:5       |
| `blank`        | none                                                 | all                  |

`TemplateRegistry.instantiate(id, input, ctx)` validates the input and format and returns a valid project. This is also the seam for data-driven generation: a CSV row, a CMS entry or (later) an AI fills a `TemplateInput`, and nothing downstream knows the difference.

In the editor, the Templates panel can switch a project to another template's structure (keeping name, format, brand and assets). The action is undoable.
