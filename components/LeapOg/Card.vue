<script setup lang="ts">
/**
 * Single OG card template the live `og:image` endpoint renders.
 * Replaces the eight hand-rolled SVG renderers we used to keep in
 * `server/utils/` — every per-mode card has the same shell (gradient +
 * accent stripe + eyebrow + title + subtitle + body region + footer);
 * only the body differs. The body shape is data-driven via the `body`
 * prop, so the page only computes the right payload for its current
 * `m=` mode and hands it here.
 *
 * Located at `components/LeapOg/Card.vue` so that nuxt-og-image picks
 * it up. The module's `componentDirs: ['…', 'LeapOg']` setting scans
 * `components/LeapOg/` and strips the directory prefix, registering
 * this file as `<Card>` — exactly what `defineOgImage('Card', { … })`
 * asks for. A flat `components/LeapOgCard.vue` doesn't work: Nuxt's
 * own scanner auto-imports it as `<LeapOgCard>`, but the og-image
 * template registry never sees it, so requests fall through to the
 * module's built-in default card. The `LeapOg` prefix (rather than
 * `OgImage`) is required because Nuxt silently skips any component
 * whose pascalName begins with `OgImage` outside the module's own
 * runtime.
 *
 * Satori (the renderer the OG module uses) supports a CSS subset; in
 * particular every node must be `display: flex` and font-family
 * resolves through the module's bundled fonts. We avoid advanced
 * selectors and stick to inline-friendly Tailwind utilities.
 */

interface PodiumBadge {
    text: string;
    fill: string;
    textFill: string;
}

interface BodyRow {
    label: string;
    valueLeft?: string;
    valueRight?: string;
    badge?: PodiumBadge;
}

interface BodyGridCell {
    label: string;
    value: string;
}

type BodyConfig =
    | { type: 'rows'; rows: BodyRow[] }
    | { type: 'grid'; cells: BodyGridCell[] }
    | { type: 'empty'; message: string };

withDefaults(
    defineProps<{
        eyebrow?: string;
        title?: string;
        subtitle?: string;
        body?: BodyConfig;
    }>(),
    {
        eyebrow: 'LEAP',
        title: 'Live Event Analysis and Performance',
        subtitle: '',
        body: () => ({ type: 'empty', message: 'Open in LEAP for the latest' }),
    }
);
</script>

<template>
    <div
        class="w-full h-full flex flex-col"
        style="
            background: linear-gradient(135deg, #0b0d10 0%, #161b22 100%);
            font-family: Inter, sans-serif;
        "
    >
        <!-- accent stripe -->
        <div class="w-full" style="height: 6px; background: #2f81f7" />

        <!-- header band -->
        <div class="flex flex-col" style="padding: 80px 80px 0">
            <div
                style="
                    color: #2f81f7;
                    font-size: 22px;
                    font-weight: 600;
                    letter-spacing: 2px;
                "
            >
                {{ eyebrow }}
            </div>
            <div
                style="
                    color: #e6edf3;
                    font-size: 48px;
                    font-weight: 700;
                    margin-top: 12px;
                    line-height: 1.1;
                "
            >
                {{ title }}
            </div>
            <div
                v-if="subtitle"
                style="color: #9aa6b2; font-size: 20px; margin-top: 12px"
            >
                {{ subtitle }}
            </div>
        </div>

        <!-- body -->
        <div class="flex flex-col" style="flex: 1; padding: 40px 80px 0">
            <template v-if="body.type === 'rows'">
                <div
                    v-for="(row, i) in body.rows"
                    :key="i"
                    class="flex items-center"
                    style="margin-bottom: 16px; gap: 24px"
                >
                    <div
                        v-if="row.badge"
                        class="flex items-center justify-center"
                        :style="{
                            width: '44px',
                            height: '44px',
                            borderRadius: '10px',
                            background: row.badge.fill,
                            color: row.badge.textFill,
                            fontSize: '22px',
                            fontWeight: 700,
                        }"
                    >
                        {{ row.badge.text }}
                    </div>
                    <div
                        style="
                            flex: 1;
                            color: #e6edf3;
                            font-size: 26px;
                            font-weight: 600;
                            overflow: hidden;
                        "
                    >
                        {{ row.label }}
                    </div>
                    <div
                        v-if="row.valueLeft"
                        style="color: #9aa6b2; font-size: 22px"
                    >
                        {{ row.valueLeft }}
                    </div>
                    <div
                        v-if="row.valueRight"
                        style="
                            color: #e6edf3;
                            font-size: 22px;
                            font-weight: 600;
                            min-width: 100px;
                            text-align: right;
                        "
                    >
                        {{ row.valueRight }}
                    </div>
                </div>
            </template>

            <template v-else-if="body.type === 'grid'">
                <div class="flex" style="gap: 60px">
                    <div
                        v-for="(cell, i) in body.cells"
                        :key="i"
                        class="flex flex-col"
                    >
                        <div
                            style="
                                color: #e6edf3;
                                font-size: 64px;
                                font-weight: 700;
                                line-height: 1;
                            "
                        >
                            {{ cell.value }}
                        </div>
                        <div
                            style="
                                color: #9aa6b2;
                                font-size: 20px;
                                letter-spacing: 1px;
                                margin-top: 12px;
                            "
                        >
                            {{ cell.label.toUpperCase() }}
                        </div>
                    </div>
                </div>
            </template>

            <template v-else>
                <div
                    class="flex items-center justify-center"
                    style="flex: 1; color: #9aa6b2; font-size: 28px"
                >
                    {{ body.message }}
                </div>
            </template>
        </div>

        <!-- footer -->
        <div
            class="flex"
            style="padding: 40px 80px; color: #6e7681; font-size: 18px"
        >
            bluefrogracing.com · Live Event Analysis and Performance
        </div>
    </div>
</template>
