import { NextResponse, type NextRequest } from 'next/server';
import { ACCEPTED_MIME_TYPES, RenderOptionsSchema, validateProject } from '@guidedreel/schema';
import { missingAssetIds } from '@guidedreel/engine';
import { getRenderService } from '@/server/render-service';
import { createRateLimiter } from '@/server/rate-limit';
import { env } from '@/server/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const limiter = createRateLimiter(10, 60_000);

function clientKey(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
}

export async function GET() {
  return NextResponse.json(getRenderService().list());
}

/**
 * multipart/form-data:
 *   project  JSON VideoProject
 *   options  JSON RenderOptions
 *   asset:<assetId>  file, one per `store` asset in the project
 */
export async function POST(req: NextRequest) {
  const rl = limiter(clientKey(req));
  if (!rl.ok)
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many render requests; try again shortly' } },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Expected multipart form data' } },
      { status: 400 },
    );
  }

  const projectRaw = form.get('project');
  const optionsRaw = form.get('options');
  if (typeof projectRaw !== 'string')
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Missing project' } },
      { status: 400 },
    );

  let projectJson: unknown;
  let optionsJson: unknown = {};
  try {
    projectJson = JSON.parse(projectRaw);
    if (typeof optionsRaw === 'string') optionsJson = JSON.parse(optionsRaw);
  } catch {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Invalid JSON' } },
      { status: 400 },
    );
  }

  const validation = validateProject(projectJson);
  if (!validation.success)
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Project is invalid',
          issues: validation.issues,
        },
      },
      { status: 422 },
    );
  const project = validation.data;
  const options = RenderOptionsSchema.safeParse(optionsJson);
  if (!options.success)
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Render options are invalid' } },
      { status: 422 },
    );
  // The server never writes to a client-chosen path.
  const safeOptions = { ...options.data, outputPath: undefined };

  const missing = missingAssetIds(project);
  if (missing.length)
    return NextResponse.json(
      {
        error: {
          code: 'MISSING_ASSET',
          message: `Project references missing assets: ${missing.join(', ')}`,
        },
      },
      { status: 422 },
    );

  const uploads: { assetId: string; name: string; bytes: Uint8Array }[] = [];
  for (const asset of project.assets) {
    if (asset.source.kind === 'local')
      return NextResponse.json(
        {
          error: { code: 'UNSUPPORTED_MEDIA', message: `Asset "${asset.name}" uses a local path` },
        },
        { status: 422 },
      );
    if (asset.source.kind !== 'store') continue;
    const file = form.get(`asset:${asset.id}`);
    if (!(file instanceof File))
      return NextResponse.json(
        { error: { code: 'MISSING_ASSET', message: `No file uploaded for asset "${asset.name}"` } },
        { status: 422 },
      );
    if (file.size > env.maxAssetBytes)
      return NextResponse.json(
        {
          error: {
            code: 'FILE_TOO_LARGE',
            message: `"${asset.name}" exceeds ${Math.round(env.maxAssetBytes / 1e6)} MB`,
          },
        },
        { status: 413 },
      );
    const accepted = ACCEPTED_MIME_TYPES[asset.type];
    if (file.type && !accepted.includes(file.type))
      return NextResponse.json(
        {
          error: {
            code: 'UNSUPPORTED_MEDIA',
            message: `"${asset.name}" has type ${file.type}, not allowed for ${asset.type}`,
          },
        },
        { status: 415 },
      );
    uploads.push({
      assetId: asset.id,
      name: asset.name,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
  }

  const job = await getRenderService().create(project, safeOptions, uploads);
  return NextResponse.json(job, { status: 202 });
}
