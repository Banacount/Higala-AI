import { PayloadTooLargeError } from './http.ts';

/**
 * Minimal `multipart/form-data` reader for the voice endpoint.
 *
 * Vercel does not parse multipart bodies for us, and the project has no parser
 * dependency. This reader only supports the shape the composer sends: a small
 * set of text fields plus one file. It is deliberately strict and bounded.
 */

export class MultipartError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MultipartError';
  }
}

export interface MultipartFile {
  field: string;
  filename: string;
  mimeType: string;
  data: Buffer;
}

export interface MultipartForm {
  fields: Record<string, string>;
  files: MultipartFile[];
}

export interface MultipartLimits {
  maxFileBytes: number;
  maxFieldBytes: number;
  maxFiles?: number;
  maxParts?: number;
}

const DEFAULT_MAX_FILES = 1;
const DEFAULT_MAX_PARTS = 12;
const CRLF = Buffer.from('\r\n');
const HEADER_END = Buffer.from('\r\n\r\n');

function headerValue(headers: string, name: string): string | null {
  const match = new RegExp(`^${name}:\\s*(.*)$`, 'im').exec(headers);
  return match ? match[1].trim() : null;
}

function dispositionParam(value: string, param: string): string | null {
  const quoted = new RegExp(`${param}="([^"]*)"`, 'i').exec(value);
  if (quoted) return quoted[1];
  const bare = new RegExp(`${param}=([^;\\s]+)`, 'i').exec(value);
  return bare ? bare[1] : null;
}

export function parseMultipartForm(
  body: Buffer,
  contentType: string,
  limits: MultipartLimits,
): MultipartForm {
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType);
  const boundary = boundaryMatch?.[1] ?? boundaryMatch?.[2];
  if (!boundary || boundary.length > 70 || /[\r\n]/.test(boundary)) {
    throw new MultipartError('The multipart boundary is missing or invalid.');
  }

  const delimiter = Buffer.from(`--${boundary}`);
  const boundaryMarker = Buffer.concat([CRLF, delimiter]);
  const fields: Record<string, string> = {};
  const files: MultipartFile[] = [];
  const maxFiles = limits.maxFiles ?? DEFAULT_MAX_FILES;
  const maxParts = limits.maxParts ?? DEFAULT_MAX_PARTS;

  let cursor = body.indexOf(delimiter);
  if (cursor === -1) {
    throw new MultipartError('The multipart body is malformed.');
  }

  let partCount = 0;

  for (;;) {
    cursor += delimiter.length;
    if (body[cursor] === 0x2d && body[cursor + 1] === 0x2d) break;
    if (body[cursor] !== 0x0d || body[cursor + 1] !== 0x0a) {
      throw new MultipartError('The multipart body is malformed.');
    }
    cursor += 2;

    const headerEnd = body.indexOf(HEADER_END, cursor);
    if (headerEnd === -1) {
      throw new MultipartError('A multipart part is missing its headers.');
    }

    const rawHeaders = body.subarray(cursor, headerEnd).toString('utf8');
    const contentStart = headerEnd + HEADER_END.length;
    const nextBoundary = body.indexOf(boundaryMarker, contentStart);
    if (nextBoundary === -1) {
      throw new MultipartError('A multipart part is missing its boundary.');
    }

    const content = body.subarray(contentStart, nextBoundary);
    const disposition = headerValue(rawHeaders, 'content-disposition');
    if (!disposition || !/^form-data\b/i.test(disposition)) {
      throw new MultipartError('A multipart part has an invalid disposition.');
    }

    const field = dispositionParam(disposition, 'name');
    if (!field) {
      throw new MultipartError('A multipart part is missing its field name.');
    }

    partCount += 1;
    if (partCount > maxParts) {
      throw new MultipartError('The multipart body has too many parts.');
    }

    const filename = dispositionParam(disposition, 'filename');
    if (filename !== null) {
      if (files.length >= maxFiles) {
        throw new MultipartError('Only one audio file is allowed.');
      }
      if (content.byteLength > limits.maxFileBytes) {
        throw new PayloadTooLargeError();
      }
      files.push({
        field,
        filename,
        mimeType:
          headerValue(rawHeaders, 'content-type') ?? 'application/octet-stream',
        data: content,
      });
    } else {
      if (content.byteLength > limits.maxFieldBytes) {
        throw new MultipartError('A multipart field is too large.');
      }
      fields[field] = content.toString('utf8');
    }

    // `nextBoundary` points at the CRLF before the delimiter.
    cursor = nextBoundary + CRLF.length;
  }

  return { fields, files };
}
