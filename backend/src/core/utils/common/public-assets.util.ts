import { constants as fsConstants } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

type ResolveOptions = {
    callerFileUrl?: string;
    maxDepth?: number;
    publicDirEnv?: string;
};

async function canReadFile(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath, fsConstants.R_OK);
        return true;
    } catch {
        return false;
    }
}

function uniq(items: string[]): string[] {
    return [...new Set(items)];
}

function toAbsoluteDir(dirPath: string): string {
    return path.isAbsolute(dirPath) ? dirPath : path.resolve(process.cwd(), dirPath);
}

export async function resolveFilePath(
    relativePath: string,
    options: Omit<ResolveOptions, 'publicDirEnv'> = {}
): Promise<{ filePath: string | null; tried: string[] }> {
    const cleanedRelative = relativePath.replace(/^\/+/, '');
    const maxDepth = options.maxDepth ?? 6;
    const tried: string[] = [];

    const startDirs: string[] = [process.cwd()];
    if (options.callerFileUrl) {
        startDirs.push(path.dirname(fileURLToPath(options.callerFileUrl)));
    }

    const candidatePaths: string[] = [];
    for (const startDir of uniq(startDirs.filter(Boolean))) {
        candidatePaths.push(path.join(startDir, cleanedRelative));
        for (let depth = 0; depth <= maxDepth; depth += 1) {
            const upDir = path.resolve(startDir, ...Array.from({ length: depth }, () => '..'));
            candidatePaths.push(path.join(upDir, cleanedRelative));
        }
    }

    for (const candidate of uniq(candidatePaths)) {
        tried.push(candidate);
        // eslint-disable-next-line no-await-in-loop
        if (await canReadFile(candidate)) {
            return { filePath: candidate, tried };
        }
    }

    return { filePath: null, tried };
}

export async function resolvePublicFilePath(
    relativeFromPublic: string,
    options: ResolveOptions = {}
): Promise<{ filePath: string | null; tried: string[] }> {
    const cleanedRelative = relativeFromPublic.replace(/^\/+/, '');
    const maxDepth = options.maxDepth ?? 6;
    const tried: string[] = [];

    const publicDirFromEnv = options.publicDirEnv
        ? process.env[options.publicDirEnv]
        : process.env.PUBLIC_DIR;

    const startDirs: string[] = [process.cwd()];

    if (publicDirFromEnv) {
        startDirs.unshift(toAbsoluteDir(publicDirFromEnv));
    }

    if (options.callerFileUrl) {
        startDirs.push(path.dirname(fileURLToPath(options.callerFileUrl)));
    }

    const candidatePaths: string[] = [];
    for (const startDir of uniq(startDirs.filter(Boolean))) {
        // If startDir is already a "public" dir (e.g. PUBLIC_DIR=/app/public), support both.
        candidatePaths.push(path.join(startDir, cleanedRelative));
        candidatePaths.push(path.join(startDir, 'public', cleanedRelative));

        for (let depth = 0; depth <= maxDepth; depth += 1) {
            const upDir = path.resolve(startDir, ...Array.from({ length: depth }, () => '..'));
            candidatePaths.push(path.join(upDir, 'public', cleanedRelative));
        }
    }

    for (const candidate of uniq(candidatePaths)) {
        tried.push(candidate);
        // eslint-disable-next-line no-await-in-loop
        if (await canReadFile(candidate)) {
            return { filePath: candidate, tried };
        }
    }

    return { filePath: null, tried };
}

export async function resolvePdfLogoFilePath(
    options: Omit<ResolveOptions, 'publicDirEnv'> & { logoEnv?: string } = {}
): Promise<{ filePath: string | null; tried: string[] }> {
    const tried: string[] = [];
    const logoEnv = options.logoEnv ?? 'PDF_LOGO_PATH';
    const envValue = process.env[logoEnv];

    if (envValue) {
        const maybeAbsolute = path.isAbsolute(envValue) ? envValue : path.resolve(process.cwd(), envValue);
        tried.push(maybeAbsolute);
        if (await canReadFile(maybeAbsolute)) {
            return { filePath: maybeAbsolute, tried };
        }
    }

    // Strict default: use public/logo.png instead of backend/assets/images/logo.png
    const candidateRelatives = ['public/logo.png'];

    for (const candidateRelative of candidateRelatives) {
        // eslint-disable-next-line no-await-in-loop
        const resolved = await resolveFilePath(candidateRelative, {
            callerFileUrl: options.callerFileUrl,
            maxDepth: options.maxDepth,
        });
        tried.push(...resolved.tried);
        if (resolved.filePath) {
            return { filePath: resolved.filePath, tried: uniq(tried) };
        }
    }

    return { filePath: null, tried: uniq(tried) };
}

export async function loadPublicImageAsDataUri(
    relativeFromPublic: string,
    options: {
        mimeType?: string;
        required?: boolean;
        callerFileUrl?: string;
        label?: string;
    } = {}
): Promise<string> {
    const mimeType = options.mimeType ?? 'image/png';
    const required = options.required ?? false;

    const { filePath, tried } = await resolvePublicFilePath(relativeFromPublic, {
        callerFileUrl: options.callerFileUrl,
    });

    if (!filePath) {
        if (!required) {
            return '';
        }
        const label = options.label ? ` (${options.label})` : '';
        throw new Error(
            `Public asset not found${label}: ${relativeFromPublic}. cwd=${process.cwd()}. Tried: ${tried.join(
                ', '
            )}`
        );
    }

    const buffer = await fs.readFile(filePath);
    if (!buffer || buffer.length === 0) {
        if (!required) {
            return '';
        }
        const label = options.label ? ` (${options.label})` : '';
        throw new Error(`Public asset is empty${label}: ${filePath}`);
    }

    return `data:${mimeType};base64,${buffer.toString('base64')}`;
}
