import type { IncomingMessage } from 'node:http';
import {
  CommunityError,
  CommunityForbiddenError,
} from './communityErrors.ts';
import {
  requireCommunityAdmin,
  verifyCommunityRequest,
} from './communityAuth.ts';
import { screenCommunityContent, needsModeratorReview } from './communityModeration.ts';
import {
  acceptGuidelines,
  createPost,
  createReply,
  deleteMyCommunityData,
  deletePost,
  deleteReply,
  getMember,
  getModerationQueue,
  getPost,
  listPosts,
  listReplies,
  moderatePost,
  reportPost,
} from './communityStore.ts';
import {
  parseAction,
  parseCreatePost,
  parseCreateReply,
  parseFeedQuery,
  parseModeratePost,
  parsePostId,
  parseReplyId,
  parseReportPost,
  parseResource,
} from './communityValidation.ts';

/**
 * Shared community request handler. Every platform adapter (Vercel, Vite dev
 * middleware) calls this, so authorization and privacy rules live in one place.
 */

export interface CommunityRequest {
  method?: string;
  url?: string;
  headers: IncomingMessage['headers'];
  body?: unknown;
}

export interface CommunityResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

function ok(body: unknown, status = 200): CommunityResponse {
  return { status, body };
}

function asBodyRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new CommunityError('The request body is invalid.');
  }
  return value as Record<string, unknown>;
}

export async function handleCommunity(
  req: CommunityRequest,
): Promise<CommunityResponse> {
  try {
    const method = (req.method ?? 'GET').toUpperCase();
    const url = new URL(req.url ?? '/', 'http://localhost');
    const params = url.searchParams;

    if (method === 'GET') {
      const identity = await verifyCommunityRequest(req);
      const resource = parseResource(params.get('resource'));

      if (resource === 'posts') {
        const query = parseFeedQuery(params);
        return ok(await listPosts(identity.uid, query));
      }

      if (resource === 'post') {
        const postId = parsePostId(params.get('id'));
        return ok(
          await getPost(identity.uid, postId, identity.isAdmin),
        );
      }

      if (resource === 'replies') {
        const postId = parsePostId(params.get('postId') ?? params.get('id'));
        const replies = await listReplies(identity.uid, postId);
        return ok({ replies });
      }

      if (resource === 'me') {
        return ok(await getMember(identity.uid));
      }

      if (!identity.isAdmin) {
        throw new CommunityForbiddenError('Moderator access is required.');
      }
      return ok(await getModerationQueue());
    }

    if (method !== 'POST') {
      return {
        status: 405,
        body: { error: 'Method not allowed. Use GET or POST.' },
        headers: { Allow: 'GET, POST' },
      };
    }

    const identity = await verifyCommunityRequest(req);
    const body = asBodyRecord(req.body);
    const action = parseAction(body.action);

    switch (action) {
      case 'create-post': {
        const input = parseCreatePost(body);
        const screen = screenCommunityContent(
          `${input.title}\n${input.content}`,
        );

        if (screen.blockReasons.length > 0) {
          throw new CommunityError(
            `This post was not published because it appears to contain ${screen.blockReasons.join(
              ' and ',
            )}. If you are dealing with a crisis, please use the support resources instead of posting a threat.`,
            422,
            'content_blocked',
          );
        }

        const post = await createPost(identity.uid, input, {
          riskLevel: screen.riskLevel,
          needsReview: needsModeratorReview(screen),
        });

        return ok(
          {
            post,
            supportSuggested:
              screen.riskLevel === 'elevated' ||
              screen.riskLevel === 'crisis',
          },
          201,
        );
      }

      case 'create-reply': {
        const input = parseCreateReply(body);
        const screen = screenCommunityContent(input.content);

        if (screen.blockReasons.length > 0) {
          throw new CommunityError(
            `This reply was not published because it appears to contain ${screen.blockReasons.join(
              ' and ',
            )}. If you are dealing with a crisis, please use the support resources instead of posting a threat.`,
            422,
            'content_blocked',
          );
        }

        const reply = await createReply(identity.uid, input, {
          riskLevel: screen.riskLevel,
          needsReview: needsModeratorReview(screen),
        });

        return ok(
          {
            reply,
            supportSuggested:
              screen.riskLevel === 'elevated' ||
              screen.riskLevel === 'crisis',
          },
          201,
        );
      }

      case 'delete-post': {
        const postId = parsePostId(body.postId);
        await deletePost(identity.uid, postId);
        return ok({ ok: true });
      }

      case 'delete-reply': {
        const replyId = parseReplyId(body.replyId ?? body.id);
        await deleteReply(identity.uid, replyId);
        return ok({ ok: true });
      }

      case 'report-post': {
        const input = parseReportPost(body);
        await reportPost(identity.uid, input);
        return ok({ ok: true });
      }

      case 'accept-guidelines': {
        const me = await acceptGuidelines(identity.uid);
        return ok({ me });
      }

      case 'moderate-post': {
        await requireCommunityAdmin(req);
        const input = parseModeratePost(body);
        await moderatePost(input.postId, input.action);
        return ok({ ok: true });
      }

      case 'delete-my-data': {
        const result = await deleteMyCommunityData(identity.uid);
        return ok(result);
      }

      default:
        throw new CommunityError('That community action does not exist.');
    }
  } catch (error) {
    if (error instanceof CommunityError) {
      return {
        status: error.status,
        body: { error: error.message, code: error.code },
      };
    }

    console.error('[higala] community request failed:', error);
    return {
      status: 500,
      body: {
        error: 'The community service is unavailable right now.',
        code: 'internal_error',
      },
    };
  }
}
