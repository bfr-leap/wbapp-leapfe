/**
 * Shared helpers for the OG (Open Graph) preview path.
 *
 * The app is a SPA (`ssr: false`), so social-link unfurlers like Discord,
 * Slack, Twitter, etc. — which fetch HTML but do not execute JavaScript —
 * see only the empty shell unless we intercept them upstream. The OG path
 * detects those bots by User-Agent and serves a small static HTML document
 * with `og:*`/`twitter:*`/oEmbed metadata derived from the URL's query
 * string, plus an `og:image` pointing at `/api/og` which renders a card
 * tailored to the page mode (`m=results`, `m=standings`, etc.).
 */

import type { H3Event } from 'h3';

// Regex matches the user-agent strings of the major link unfurlers. Kept
// deliberately broad — false positives only mean a bot-shaped client gets
// the lightweight OG stub instead of the SPA, which is harmless.
export const BOT_UA_RE =
    /\b(Discordbot|Slackbot|Twitterbot|facebookexternalhit|TelegramBot|LinkedInBot|WhatsApp|Pinterest|Mastodon|SkypeUriPreview|Embedly|redditbot|Applebot|Googlebot)\b/i;

export function isBotUserAgent(ua: string | undefined | null): boolean {
    if (!ua) return false;
    return BOT_UA_RE.test(ua);
}

/**
 * Resolve the canonical absolute URL for the current request, honoring
 * any reverse proxy headers Vercel/CDNs set. Used to build absolute
 * `og:image` and `og:url` links — relative URLs aren't acceptable to most
 * unfurlers.
 */
export function getRequestOrigin(event: H3Event): string {
    const headers = event.node.req.headers;
    const proto =
        (headers['x-forwarded-proto'] as string) ||
        // @ts-expect-error encrypted may not be typed on all socket implementations
        (event.node.req.socket?.encrypted ? 'https' : 'http');
    const host =
        (headers['x-forwarded-host'] as string) ||
        (headers['host'] as string) ||
        'localhost:3000';
    return `${proto.split(',')[0].trim()}://${host.split(',')[0].trim()}`;
}

/**
 * HTML-escape a string for safe interpolation into element text or
 * attribute values. The OG stub is built by string concatenation rather
 * than a template engine — keep this strict.
 */
export function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Escape characters that are unsafe inside SVG text/attributes. SVG is
 * XML, so the rules are nearly identical to HTML — broken out for clarity
 * and so future tweaks (e.g. stripping control chars) can land in one
 * place.
 */
export function escapeSvg(s: string): string {
    return escapeHtml(s);
}
