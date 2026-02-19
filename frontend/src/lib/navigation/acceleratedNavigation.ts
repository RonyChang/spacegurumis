const DEFAULT_SELECTOR = 'a[data-nav-prefetch], .site-header a[href], .site-footer a[href], a.brand[href]';
const ROUTE_LOADING_CLASS = 'is-route-transitioning';
const INIT_KEY = '__sgAcceleratedNavigationInitialized';

type Prefetcher = (url: string) => Promise<unknown>;

type InitOptions = {
    selector?: string;
    prefetcher?: Prefetcher;
    documentRef?: Document;
    windowRef?: Window;
    force?: boolean;
};

function buildDefaultPrefetcher(win: Window): Prefetcher {
    return (url: string) =>
        win.fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                Accept: 'text/html,application/xhtml+xml',
            },
        });
}

function getEventAnchor(
    target: EventTarget | null,
    selector: string
): HTMLAnchorElement | null {
    if (!(target instanceof Element)) {
        return null;
    }

    const candidate = target.closest(selector);
    if (!(candidate instanceof HTMLAnchorElement)) {
        return null;
    }

    return candidate;
}

export function isEligibleInternalLink(
    link: HTMLAnchorElement,
    currentLocation: URL
): URL | null {
    const hrefAttr = String(link.getAttribute('href') || '').trim();
    if (!hrefAttr) {
        return null;
    }

    if (hrefAttr.startsWith('#')) {
        return null;
    }

    if (link.hasAttribute('download')) {
        return null;
    }

    const target = String(link.getAttribute('target') || '').trim().toLowerCase();
    if (target && target !== '_self') {
        return null;
    }

    const rel = String(link.getAttribute('rel') || '').toLowerCase();
    if (rel.includes('external')) {
        return null;
    }

    let destination: URL;
    try {
        destination = new URL(link.href, currentLocation);
    } catch {
        return null;
    }

    if (destination.origin !== currentLocation.origin) {
        return null;
    }

    const samePath = destination.pathname === currentLocation.pathname;
    const sameSearch = destination.search === currentLocation.search;

    if (samePath && sameSearch) {
        return null;
    }

    return destination;
}

export function createPrefetchController(prefetcher: Prefetcher) {
    const completed = new Set<string>();
    const inFlight = new Map<string, Promise<void>>();

    function normalizeKey(url: string) {
        const parsed = new URL(url);
        parsed.hash = '';
        return parsed.toString();
    }

    function prefetch(url: string): Promise<void> {
        const key = normalizeKey(url);

        if (completed.has(key)) {
            return Promise.resolve();
        }

        const running = inFlight.get(key);
        if (running) {
            return running;
        }

        const next = Promise.resolve()
            .then(async () => {
                await prefetcher(key);
            })
            .catch(() => {
                // La navegacion normal debe continuar aunque falle el prefetch.
            })
            .finally(() => {
                inFlight.delete(key);
                completed.add(key);
            });

        inFlight.set(key, next);
        return next;
    }

    return {
        prefetch,
        hasPrefetched(url: string) {
            return completed.has(normalizeKey(url));
        },
    };
}

export function initAcceleratedNavigation(options: InitOptions = {}) {
    const doc = options.documentRef ?? (typeof document !== 'undefined' ? document : null);
    const win = options.windowRef ?? (typeof window !== 'undefined' ? window : null);
    if (!doc || !win) {
        return () => {};
    }

    const flagContainer = win as Window & { [INIT_KEY]?: boolean };
    if (flagContainer[INIT_KEY] && !options.force) {
        return () => {};
    }
    flagContainer[INIT_KEY] = true;

    const selector = options.selector || DEFAULT_SELECTOR;
    const prefetcher = options.prefetcher || buildDefaultPrefetcher(win);
    const prefetchController = createPrefetchController(prefetcher);

    function maybePrefetch(target: EventTarget | null) {
        const link = getEventAnchor(target, selector);
        if (!link) {
            return;
        }

        const destination = isEligibleInternalLink(link, new URL(win.location.href));
        if (!destination) {
            return;
        }

        prefetchController.prefetch(destination.toString());
    }

    function beginTransition(target: EventTarget | null) {
        const link = getEventAnchor(target, selector);
        if (!link) {
            return;
        }

        const destination = isEligibleInternalLink(link, new URL(win.location.href));
        if (!destination) {
            return;
        }

        doc.documentElement.classList.add(ROUTE_LOADING_CLASS);
    }

    function clearTransition() {
        doc.documentElement.classList.remove(ROUTE_LOADING_CLASS);
    }

    const onPointerEnter = (event: Event) => maybePrefetch(event.target);
    const onFocusIn = (event: Event) => maybePrefetch(event.target);
    const onTouchStart = (event: Event) => maybePrefetch(event.target);
    const onClick = (event: Event) => {
        const mouseEvent = event as MouseEvent;
        if (mouseEvent.defaultPrevented) {
            return;
        }
        beginTransition(mouseEvent.target);
    };

    doc.addEventListener('pointerenter', onPointerEnter, true);
    doc.addEventListener('focusin', onFocusIn, true);
    doc.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
    doc.addEventListener('click', onClick, true);
    win.addEventListener('pageshow', clearTransition);
    win.addEventListener('pagehide', clearTransition);

    return () => {
        doc.removeEventListener('pointerenter', onPointerEnter, true);
        doc.removeEventListener('focusin', onFocusIn, true);
        doc.removeEventListener('touchstart', onTouchStart, true);
        doc.removeEventListener('click', onClick, true);
        win.removeEventListener('pageshow', clearTransition);
        win.removeEventListener('pagehide', clearTransition);
        clearTransition();
        flagContainer[INIT_KEY] = false;
    };
}
