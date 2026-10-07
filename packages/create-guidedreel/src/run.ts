import { spawn } from 'node:child_process';

export interface RunOptions {
  cwd: string;
  /** Stream output to the user's terminal (installs) instead of capturing it. */
  inherit?: boolean;
  env?: NodeJS.ProcessEnv;
}

export interface RunResult {
  stdout: string;
  stderr: string;
}

/** Runs a command and rejects with a readable error when it exits non-zero or is missing. */
export function run(cmd: string, args: string[], opts: RunOptions): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      env: opts.env ?? process.env,
      stdio: opts.inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      // .cmd shims (pnpm, git from some installers) need a shell on Windows.
      shell: process.platform === 'win32',
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d: Buffer) => (stdout += d.toString()));
    child.stderr?.on('data', (d: Buffer) => (stderr += d.toString()));
    child.on('error', (err) => reject(new Error(`Could not run "${cmd}": ${err.message}`)));
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else
        reject(
          new Error(
            `"${cmd} ${args.join(' ')}" exited with code ${code}${stderr ? `\n${stderr.trim()}` : ''}`,
          ),
        );
    });
  });
}

/** `--version` output of a command, or null when it is not installed. */
export async function commandVersion(cmd: string, cwd: string): Promise<string | null> {
  try {
    const { stdout } = await run(cmd, ['--version'], { cwd });
    return stdout.trim().split('\n')[0] ?? '';
  } catch {
    return null;
  }
}

export async function gitConfig(key: string, cwd: string): Promise<string | undefined> {
  try {
    const { stdout } = await run('git', ['config', '--get', key], { cwd });
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

export async function isInsideGitRepo(cwd: string): Promise<boolean> {
  try {
    const { stdout } = await run('git', ['rev-parse', '--is-inside-work-tree'], { cwd });
    return stdout.trim() === 'true';
  } catch {
    return false;
  }
}
