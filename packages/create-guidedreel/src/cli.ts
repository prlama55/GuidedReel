import path from 'node:path';
import * as p from '@clack/prompts';
import pkg from '../package.json' with { type: 'json' };
import {
  HELP,
  normalizeRepoUrl,
  normalizeScope,
  parseCliArgs,
  slugFromDirectory,
  toDisplayName,
  validateScope,
  validateSlug,
  validateText,
  type AppSelection,
  type CliArgs,
  type ScaffoldMode,
  type ScaffoldOptions,
} from './options';
import { scaffold } from './scaffold';
import { resolveTemplate } from './template';
import { commandVersion, gitConfig, isInsideGitRepo, run } from './run';

const out = (text: string) => process.stdout.write(`${text}\n`);

async function main(argv: string[]): Promise<number> {
  let args: CliArgs;
  try {
    args = parseCliArgs(argv);
  } catch (err) {
    out(HELP);
    p.log.error(err instanceof Error ? err.message : String(err));
    return 2;
  }
  if (args.help) {
    out(HELP);
    return 0;
  }
  if (args.version) {
    out(pkg.version);
    return 0;
  }

  const interactive = !args.yes && process.stdin.isTTY === true && process.stdout.isTTY === true;
  p.intro(`create-guidedreel v${pkg.version}`);

  const answers = await collectAnswers(args, interactive);
  if (!answers) {
    p.cancel('Cancelled.');
    return 1;
  }

  const spinner = p.spinner();
  spinner.start(args.ref ? `Downloading template (${args.ref})` : 'Preparing template');
  const template = await resolveTemplate({ templateDir: args.templateDir, ref: args.ref });
  try {
    spinner.message(`Scaffolding ${answers.displayName}`);
    const result = await scaffold(answers, template);
    spinner.stop(`Created ${result.files} files from ${template.label}`);
  } catch (err) {
    spinner.stop('Scaffolding failed');
    throw err;
  } finally {
    await template.cleanup();
  }

  let installed = false;
  if (args.install) {
    const pnpmVersion = await commandVersion('pnpm', answers.targetDir);
    if (pnpmVersion) {
      p.log.step(`Installing dependencies with pnpm ${pnpmVersion} (this takes a while)`);
      try {
        // Not frozen: the lockfile loses entries for apps the user deselected.
        await run('pnpm', ['install', '--no-frozen-lockfile'], {
          cwd: answers.targetDir,
          inherit: true,
        });
        installed = true;
      } catch (err) {
        p.log.warn(
          `pnpm install failed; run it manually.\n${err instanceof Error ? err.message : String(err)}`,
        );
      }
    } else {
      p.log.warn(
        'pnpm not found. Enable it with "corepack enable", then run "pnpm install" in the project.',
      );
    }
  }

  if (args.git) {
    if (await isInsideGitRepo(answers.targetDir)) {
      p.log.info('Already inside a git repository; skipped git init.');
    } else if (await commandVersion('git', answers.targetDir)) {
      try {
        await run('git', ['init', '-q', '-b', 'main'], { cwd: answers.targetDir });
        await run('git', ['add', '-A'], { cwd: answers.targetDir });
        await run(
          'git',
          [
            '-c',
            'commit.gpgsign=false',
            'commit',
            '-q',
            '-m',
            `chore: scaffold ${answers.displayName} with create-guidedreel`,
          ],
          { cwd: answers.targetDir },
        );
        p.log.success('Initialized git repository with a first commit');
      } catch (err) {
        p.log.warn(`git setup failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  const relDir = path.relative(process.cwd(), answers.targetDir) || '.';
  const steps = [
    `cd ${relDir}`,
    installed ? null : 'pnpm install',
    answers.apps.web ? 'pnpm dev:web        # http://localhost:3000' : null,
    answers.apps.desktop ? 'pnpm dev:desktop    # Electron' : null,
    answers.mode === 'thin'
      ? '\nYour templates live in packages/extensions/src (see README).'
      : null,
  ].filter((s): s is string => s !== null);
  p.note(steps.join('\n'), 'Next steps');
  if (answers.mode === 'thin' && !answers.coreTarballs) {
    p.log.info(`Depends on @guidedreel/core ^${answers.coreVersion} from npm.`);
  }
  p.outro(
    answers.mode === 'thin'
      ? 'Happy editing. Engine docs: https://github.com/prlama55/GuidedReel/tree/main/docs'
      : 'Happy editing. Docs live in docs/, start with docs/development.md.',
  );
  return 0;
}

async function collectAnswers(
  args: CliArgs,
  interactive: boolean,
): Promise<ScaffoldOptions | null> {
  const cwd = process.cwd();

  let dir = args.dir;
  if (!dir) {
    if (!interactive) throw new Error('Pass a directory name, e.g. "create-guidedreel my-studio".');
    const answer = await p.text({
      message: 'Where should the project be created?',
      placeholder: 'my-video-studio',
      validate: (v) => (v && v.trim() ? undefined : 'A directory name is required.'),
    });
    if (p.isCancel(answer)) return null;
    dir = answer.trim();
  }
  const targetDir = path.resolve(cwd, dir);
  const slug = slugFromDirectory(targetDir);
  const slugError = validateSlug(slug);
  if (slugError)
    throw new Error(`Directory name "${path.basename(targetDir)}" → "${slug}": ${slugError}`);

  let displayName = args.name ?? toDisplayName(slug);
  let scope = normalizeScope(args.scope ?? slug);
  let apps: AppSelection = args.apps ?? { web: true, desktop: true };
  let author = args.author ?? (await gitConfig('user.name', cwd)) ?? 'Your Name';
  let repoUrl = normalizeRepoUrl(args.repo);
  let mode: ScaffoldMode = args.fork ? 'fork' : 'thin';
  const coreTarballs = args.coreTarballs ? path.resolve(cwd, args.coreTarballs) : undefined;
  if (coreTarballs && mode === 'fork') {
    throw new Error('--core-tarballs only applies to apps on @guidedreel/core (drop --fork).');
  }

  if (interactive) {
    const group = await p.group(
      {
        mode: () =>
          args.fork
            ? Promise.resolve<ScaffoldMode>('fork')
            : p.select<ScaffoldMode>({
                message: 'What do you want to create?',
                options: [
                  {
                    value: 'thin',
                    label: 'An app on @guidedreel/core (recommended)',
                    hint: 'web and/or desktop shell + your own templates; engine updates via npm',
                  },
                  {
                    value: 'fork',
                    label: 'A fork of the GuidedReel monorepo',
                    hint: 'copies the engine packages too, for changing the engine itself',
                  },
                ],
                initialValue: 'thin',
              }),
        displayName: () =>
          args.name !== undefined
            ? Promise.resolve(displayName)
            : p.text({
                message: 'Product name shown in the app',
                initialValue: displayName,
                validate: (v) => validateText(v ?? '', 'Product name'),
              }),
        scope: () =>
          args.scope !== undefined
            ? Promise.resolve(scope)
            : p.text({
                message: 'Package scope (packages become @scope/engine, @scope/ui, …)',
                initialValue: scope,
                validate: (v) => validateScope(normalizeScope(v ?? '')),
              }),
        apps: () =>
          args.apps !== undefined
            ? Promise.resolve(apps)
            : p
                .multiselect({
                  message: 'Which apps do you want?',
                  options: [
                    { value: 'web', label: 'Web', hint: 'Next.js, server-side rendering queue' },
                    {
                      value: 'desktop',
                      label: 'Desktop',
                      hint: 'Electron, local rendering, installers',
                    },
                  ],
                  initialValues: ['web', 'desktop'],
                  required: true,
                })
                .then((v) =>
                  p.isCancel(v) ? v : { web: v.includes('web'), desktop: v.includes('desktop') },
                ),
        author: () =>
          args.author !== undefined
            ? Promise.resolve(author)
            : p.text({
                message: 'Author (credits, copyright, package metadata)',
                initialValue: author,
                validate: (v) => validateText(v ?? '', 'Author'),
              }),
        repoUrl: () =>
          args.repo !== undefined
            ? Promise.resolve(repoUrl ?? '')
            : p.text({
                message: 'Repository URL (optional, e.g. https://github.com/you/my-studio)',
                placeholder: 'leave empty to skip',
                defaultValue: '',
                validate: (v) => {
                  try {
                    normalizeRepoUrl(v);
                    return undefined;
                  } catch (err) {
                    return err instanceof Error ? err.message : String(err);
                  }
                },
              }),
      },
      { onCancel: () => undefined },
    );
    if (Object.values(group).some((v) => p.isCancel(v))) return null;
    mode = group.mode as ScaffoldMode;
    displayName = (group.displayName as string).trim();
    scope = normalizeScope(group.scope as string);
    apps = group.apps as AppSelection;
    author = (group.author as string).trim();
    repoUrl = normalizeRepoUrl(group.repoUrl as string);
  }

  for (const [value, label] of [
    [displayName, 'Product name'],
    [author, 'Author'],
  ] as const) {
    const error = validateText(value, label);
    if (error) throw new Error(error);
  }
  const scopeError = validateScope(scope);
  if (scopeError) throw new Error(`Scope "${scope}": ${scopeError}`);

  return {
    mode,
    targetDir,
    slug,
    displayName,
    scope,
    apps,
    author,
    repoUrl,
    coreVersion: pkg.version,
    coreTarballs,
  };
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    p.log.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
