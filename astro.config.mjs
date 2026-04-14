// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';
import { visit } from 'unist-util-visit';

/** Lightweight rehype plugin: converts ```mermaid code blocks to <pre class="mermaid"> for client-side rendering. */
function rehypeMermaidPre() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (
        node.tagName === 'pre' &&
        node.children?.length === 1 &&
        node.children[0].tagName === 'code' &&
        node.children[0].properties?.className?.includes('language-mermaid')
      ) {
        const code = node.children[0];
        const text = code.children?.find((c) => c.type === 'text')?.value || '';
        parent.children[index] = {
          type: 'element',
          tagName: 'pre',
          properties: { className: ['mermaid'] },
          children: [{ type: 'text', value: text }],
        };
      }
    });
  };
}

export default defineConfig({
  site: 'https://course.shipwithai.io',
  markdown: {
    rehypePlugins: [rehypeMermaidPre],
  },
  integrations: [
    starlight({
      title: 'Claude Code Mastery',
      description: 'The most comprehensive course on mastering Claude Code — from foundation to production. By ShipWithAI.',
      head: [
        {
          tag: 'script',
          attrs: { type: 'module' },
          content: `import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  themeVariables: {
    fontSize: '14px',
    fontFamily: "'IBM Plex Sans', 'Inter', system-ui, sans-serif",
    lineColor: '#374151',
    edgeLabelBackground: '#f0f2f5',
  },
  flowchart: { curve: 'basis', htmlLabels: true },
  sequence: { messageAlign: 'center', useMaxWidth: true },
  er: { useMaxWidth: true },
  gantt: { useMaxWidth: true },
});

// ── Modal: re-renders a fresh SVG from source text ──────────────────────────
// Never clones the inline SVG — avoids dark-theme color/sizing artifacts.
async function openDiagramModal(source) {
  var existing = document.getElementById('mermaid-modal');
  if (existing) existing.remove();

  var modal = document.createElement('div');
  modal.id = 'mermaid-modal';

  var backdrop = document.createElement('div');
  backdrop.className = 'mermaid-modal-backdrop';

  var box = document.createElement('div');
  box.className = 'mermaid-modal-box';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Diagram');

  var closeBtn = document.createElement('button');
  closeBtn.className = 'mermaid-modal-close';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.textContent = '\u00D7';

  var body = document.createElement('div');
  body.className = 'mermaid-modal-body';

  box.appendChild(closeBtn);
  box.appendChild(body);
  modal.appendChild(backdrop);
  modal.appendChild(box);
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  // Render fresh SVG — always white background, correctly sized
  try {
    var result = await mermaid.render('diagram-modal-' + Date.now(), source);
    var parser = new DOMParser();
    var parsed = parser.parseFromString(result.svg, 'image/svg+xml');
    var svgEl = parsed.querySelector('svg');
    if (svgEl) {
      // Remove absolute pixel dimensions so CSS width:100% controls sizing
      svgEl.removeAttribute('width');
      svgEl.removeAttribute('height');
      svgEl.style.cssText = 'display:block;width:100%;height:auto;';
      body.appendChild(document.importNode(svgEl, true));
      if (result.bindFunctions) result.bindFunctions(body.querySelector('svg'));
    }
  } catch (err) {
    var errMsg = document.createElement('p');
    errMsg.style.cssText = 'padding:2rem;color:#ef4444;font-family:monospace;font-size:0.85rem;';
    errMsg.textContent = 'Could not render diagram.';
    body.appendChild(errMsg);
  }

  function close() {
    modal.classList.remove('mermaid-modal--open');
    setTimeout(function() { modal.remove(); document.body.style.overflow = ''; }, 220);
  }
  backdrop.addEventListener('click', close);
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', function kh(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', kh); }
  });

  requestAnimationFrame(function() { modal.classList.add('mermaid-modal--open'); });
}

// ── Enhance: adds expand button and click handler ────────────────────────────
function enhanceDiagram(svg) {
  var container = svg.closest('pre.mermaid') || svg.parentElement;
  if (!container || container.dataset.enhanced) return;
  var source = container.dataset.src;
  if (!source) return; // no stored source — cannot re-render in modal

  container.dataset.enhanced = 'true';
  container.style.cursor = 'zoom-in';
  container.style.position = 'relative';

  var btn = document.createElement('button');
  btn.className = 'mermaid-expand-btn';
  btn.title = 'Expand diagram';
  btn.setAttribute('aria-label', 'View diagram full size');
  btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
  container.appendChild(btn);

  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    openDiagramModal(source).catch(console.error);
  });
  container.addEventListener('click', function(e) {
    if (e.target !== btn) openDiagramModal(source).catch(console.error);
  });
}

// ── Init: controlled rendering with source capture ───────────────────────────
async function initDiagrams() {
  // Only process pre.mermaid elements whose source hasn't been captured yet
  var toRender = Array.from(document.querySelectorAll('pre.mermaid')).filter(function(pre) {
    return !pre.dataset.src;
  });
  if (toRender.length === 0) return;

  // 1. Capture source text BEFORE Mermaid replaces innerHTML
  toRender.forEach(function(pre) {
    pre.dataset.src = pre.textContent.trim();
    pre.classList.add('mermaid-pending');
  });

  // 2. Render only the pending elements
  try {
    await mermaid.run({ querySelector: '.mermaid-pending' });
  } catch (e) { /* page may have no diagrams or a parse error on one — continue */ }

  // 3. Clean up transient class and enhance newly rendered SVGs
  document.querySelectorAll('.mermaid-pending').forEach(function(pre) {
    pre.classList.remove('mermaid-pending');
  });
  document.querySelectorAll('svg[id^="mermaid-"]').forEach(enhanceDiagram);
}

// Starlight uses View Transitions: astro:page-load fires on every navigation
document.addEventListener('astro:page-load', function() { initDiagrams(); });

// Fallback: if astro:page-load doesn't fire on initial load in this environment
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() { initDiagrams(); });
} else {
  initDiagrams();
}`,
        },
        {
          tag: 'script',
          content: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-MJJNTKQR');`,
        },
      ],
      customCss: [
        '@fontsource/ibm-plex-sans/300.css',
        '@fontsource/ibm-plex-sans/400.css',
        '@fontsource/ibm-plex-sans/500.css',
        '@fontsource/ibm-plex-sans/600.css',
        '@fontsource/ibm-plex-sans/700.css',
        '@fontsource/jetbrains-mono/400.css',
        '@fontsource/jetbrains-mono/500.css',
        '@fontsource/jetbrains-mono/600.css',
        '@fontsource/jetbrains-mono/700.css',
        './src/styles/starlight-overrides.css',
        './src/styles/custom.css',
      ],
      components: {
        Footer: './src/components/Footer.astro',
      },
      logo: {
        src: './src/assets/shipwithailogo.png',
        replacesTitle: false,
      },
      defaultLocale: 'en',
      locales: {
        en: { label: 'English', lang: 'en' },
        vi: { label: 'Tiếng Việt', lang: 'vi' },
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/shipwithai/claude-code-mastery' },
        { icon: 'x.com', label: 'X', href: 'https://x.com/shipwithaiio' },
        { icon: 'telegram', label: 'Community', href: 'https://t.me/ShipWithAI' },
      ],
      sidebar: [
        {
          label: 'Start Here',
          translations: { vi: 'Bắt đầu' },
          items: [
            { slug: 'author' },
            { slug: 'claude-code/cheat-sheet' },
            { slug: 'claude-code/tips-tricks' },
          ],
        },
        {
          label: 'Phase 1: Foundation',
          translations: { vi: 'Giai đoạn 1: Nền Tảng' },
          autogenerate: { directory: 'claude-code/phase-01-foundation' },
        },
        {
          label: 'Phase 2: Security',
          translations: { vi: 'Giai đoạn 2: Bảo Mật' },
          autogenerate: { directory: 'claude-code/phase-02-security' },
        },
        {
          label: 'Phase 3: Core Workflows',
          translations: { vi: 'Giai đoạn 3: Quy Trình Cốt Lõi' },
          autogenerate: { directory: 'claude-code/phase-03-core-workflows' },
        },
        {
          label: 'Phase 4: Prompt & Memory',
          translations: { vi: 'Giai đoạn 4: Prompt & Bộ Nhớ' },
          autogenerate: { directory: 'claude-code/phase-04-prompt-memory' },
        },
        {
          label: 'Phase 5: Context Mastery',
          translations: { vi: 'Giai đoạn 5: Làm Chủ Context' },
          autogenerate: { directory: 'claude-code/phase-05-context-mastery' },
        },
        {
          label: 'Phase 6: Thinking & Planning',
          translations: { vi: 'Giai đoạn 6: Tư Duy & Lập Kế Hoạch' },
          autogenerate: { directory: 'claude-code/phase-06-thinking-planning' },
        },
        {
          label: 'Phase 7: Multi-Agent & Auto',
          translations: { vi: 'Giai đoạn 7: Đa Agent & Tự Động' },
          autogenerate: { directory: 'claude-code/phase-07-multi-agent-auto' },
        },
        {
          label: 'Phase 8: Meta-Debugging',
          translations: { vi: 'Giai đoạn 8: Debug AI' },
          autogenerate: { directory: 'claude-code/phase-08-meta-debugging' },
        },
        {
          label: 'Phase 9: Legacy & Brownfield',
          translations: { vi: 'Giai đoạn 9: Code Cũ' },
          autogenerate: { directory: 'claude-code/phase-09-legacy-brownfield' },
        },
        {
          label: 'Phase 10: Team Collaboration',
          translations: { vi: 'Giai đoạn 10: Làm Việc Nhóm' },
          autogenerate: { directory: 'claude-code/phase-10-team-collaboration' },
        },
        {
          label: 'Phase 11: Automation & Headless',
          translations: { vi: 'Giai đoạn 11: Tự Động Hóa' },
          autogenerate: { directory: 'claude-code/phase-11-automation-headless' },
        },
        {
          label: 'Phase 12: n8n Workflows',
          translations: { vi: 'Giai đoạn 12: n8n Workflows' },
          autogenerate: { directory: 'claude-code/phase-12-n8n-workflows' },
        },
        {
          label: 'Phase 13: Data & Analysis',
          translations: { vi: 'Giai đoạn 13: Dữ Liệu & Phân Tích' },
          autogenerate: { directory: 'claude-code/phase-13-data-analysis' },
        },
        {
          label: 'Phase 14: Optimization',
          translations: { vi: 'Giai đoạn 14: Tối Ưu Hóa' },
          autogenerate: { directory: 'claude-code/phase-14-optimization' },
        },
        {
          label: 'Phase 15: Templates & Skills',
          translations: { vi: 'Giai đoạn 15: Templates & Skills' },
          autogenerate: { directory: 'claude-code/phase-15-templates-skills' },
        },
        {
          label: 'Phase 16: Real-World Mastery',
          translations: { vi: 'Giai đoạn 16: Thực Chiến' },
          autogenerate: { directory: 'claude-code/phase-16-real-world-mastery' },
        },
      ],
    }),
    sitemap(),
  ],
});
