// ==========================================================
// Pixel graffiti artist
// Walks along the top of the vinyl card, sprays "EO" over its
// top-left corner (dripping down the side), walks off, and the
// tag fades until the next run.
// ==========================================================
(function () {
    const widget = document.getElementById("vinyl");
    const canvas = document.getElementById("graffiti");
    if (!widget || !canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");

    const css = getComputedStyle(document.documentElement);
    const INK = css.getPropertyValue("--ink").trim();
    const PAPER = css.getPropertyValue("--paper").trim();
    const ACCENT = css.getPropertyValue("--accent").trim();

    // Timings in milliseconds
    const PERIOD = 30000;       // one run every 30 seconds
    const FIRST_DELAY = 1500;
    const RETRY = 2000;         // wait this long if the card is off screen
    const SHAKE = 600;
    const SPRAY = 3200;
    const ADMIRE = 500;
    const DRIP = 1500;          // short drips under the letters
    const LEAK = 5000;          // long drips down the side of the card
    const SPEED = 110;          // walking speed in px per second

    const PX = 3;               // size of one sprite pixel
    const TAG_W = 84;
    const TAG_H = 48;
    const TAG_OVERHANG_X = 28;  // how far the tag hangs past the card's left edge
    const TAG_OVERHANG_Y = 26;  // how far the tag rises above the card's top edge
    const NAV_HEIGHT = 64;

    // ---- Sprites (drawn facing right): # ink, w paper, b accent, . empty ----
    const BODY = [
        "....#####.....",
        "...#######....",
        "...#########..",
        "...####w##....",
        "...#######....",
        "....#####.....",
        "...#######....",
        "..#########...",
        "..#########...",
        "..#########...",
        "...#######....",
        "...#######....",
    ];
    const SPRAY_ARM = [
        "....#####...b.",
        "...#######.bbb",
        "...########bbb",
        "...####w##.bbb",
        "...#######.##.",
        "....#####.##..",
        "...########...",
    ];
    const LEGS_STAND = [
        "...###.###....",
        "...###.###....",
        "...###.###....",
        "..####.####...",
    ];
    const LEGS_STRIDE = [
        "...###.###....",
        "..###...###...",
        ".###.....###..",
        ".####....####.",
    ];
    const LEGS_PASS = [
        "....#####.....",
        "....####......",
        ".....###......",
        ".....#####....",
    ];
    const FRAMES = {
        stand: BODY.concat(LEGS_STAND),
        walkA: BODY.concat(LEGS_STRIDE),
        walkB: BODY.concat(LEGS_PASS),
        spray: SPRAY_ARM.concat(BODY.slice(7), LEGS_STAND),
    };
    const SPRITE_COLS = 14;
    const CHAR_H = 16 * PX;
    const NOZZLE_X = 1.5 * PX;  // nozzle column when the sprite faces left

    let dots = [];
    let drips = [];
    let leaks = [];
    let colBottom = [];
    let particles = [];
    let cycle = null;
    let t = PERIOD - FIRST_DELAY;
    let last = performance.now();

    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const lerp = (a, b, p) => a + (b - a) * p;
    const rand = (lo, hi) => lo + Math.random() * (hi - lo);

    // Render "EO" off-screen, then turn its pixels into spray dots
    function buildTag() {
        const off = document.createElement("canvas");
        off.width = TAG_W;
        off.height = TAG_H;
        const o = off.getContext("2d");
        o.translate(TAG_W / 2, TAG_H / 2);
        o.rotate(-0.08);
        o.font = "700 38px 'Space Grotesk', system-ui, sans-serif";
        o.textAlign = "center";
        o.textBaseline = "middle";
        o.lineWidth = 3;
        o.lineJoin = "round";
        o.strokeText("EO", 0, 2);
        o.fillText("EO", 0, 2);

        const data = o.getImageData(0, 0, TAG_W, TAG_H).data;
        const filled = (x, y) => y < TAG_H && data[(y * TAG_W + x) * 4 + 3] > 128;
        const dripSpots = [];
        dots = [];
        colBottom = new Array(TAG_W).fill(-1);

        for (let y = 0; y < TAG_H; y++) {
            for (let x = 0; x < TAG_W; x++) {
                if (filled(x, y)) colBottom[x] = y;
            }
        }

        for (let y = 0; y < TAG_H; y += 2) {
            for (let x = 0; x < TAG_W; x += 2) {
                if (!filled(x, y)) continue;
                dots.push({ x, y, s: Math.random() < 0.5 ? 2 : 3, a: rand(0.75, 1), k: x + rand(0, 10) });
                if (Math.random() < 0.25) {
                    dots.push({ x: x + rand(-4, 4), y: y + rand(-4, 4), s: Math.random() < 0.5 ? 1 : 2, a: rand(0.2, 0.45), k: x + rand(0, 10) });
                }
                if (y > TAG_H * 0.6 && !filled(x, y + 4)) dripSpots.push({ x, y });
            }
        }
        // Sprayed right to left, since the artist stands on the right
        dots.sort((a, b) => b.k - a.k);

        drips = [];
        while (drips.length < 3 && dripSpots.length) {
            const spot = dripSpots.splice(Math.floor(Math.random() * dripSpots.length), 1)[0];
            if (drips.every(d => Math.abs(d.x - spot.x) > 8)) {
                drips.push({ x: spot.x, y: spot.y, len: rand(6, 16) });
            }
        }
    }

    function sizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(canvas.clientWidth * dpr);
        canvas.height = Math.round(canvas.clientHeight * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Everything is positioned from the card each frame, so it follows scrolling
    function measure() {
        const r = widget.getBoundingClientRect();
        const tagX = Math.max(r.left - TAG_OVERHANG_X, 4);
        return {
            w: canvas.clientWidth,
            cardLeft: r.left,
            cardTop: r.top,
            tagX,
            tagY: r.top - TAG_OVERHANG_Y,
            charY: r.top - CHAR_H,
            standX: tagX + TAG_W - 8 - NOZZLE_X,
        };
    }

    function startCycle() {
        t = 0;
        particles = [];
        const L = measure();
        const onScreen = L.cardTop > NAV_HEIGHT + CHAR_H + 8 && L.cardTop < window.innerHeight - 60;
        if (!onScreen || !dots.length) {
            cycle = null;
            t = PERIOD - RETRY;
            return;
        }
        // Long drips that run down just either side of the card's left edge
        leaks = [-2, 3, 7].map(dx => ({ dx, len: rand(50, 120) }));

        const walk = ((L.w + 10 - L.standX) / SPEED) * 1000;
        const a = walk;
        const b = a + SHAKE;
        const c = b + SPRAY;
        const d = c + ADMIRE;
        const e = d + walk;
        const period = Math.max(PERIOD, e + 3000);
        cycle = { a, b, c, d, e, period, fadeStart: c + LEAK + 1000, fadeEnd: period - 1000 };
    }

    function drawSprite(rows, x, y, canDy, faceLeft) {
        for (let r = 0; r < rows.length; r++) {
            for (let c = 0; c < SPRITE_COLS; c++) {
                const ch = rows[r][c];
                if (ch === ".") continue;
                ctx.fillStyle = ch === "#" ? INK : ch === "w" ? PAPER : ACCENT;
                const col = faceLeft ? SPRITE_COLS - 1 - c : c;
                const dy = ch === "b" ? canDy : 0;
                ctx.fillRect(Math.round(x + col * PX), Math.round(y + r * PX + dy), PX, PX);
            }
        }
    }

    function walkFrame() {
        return Math.floor(t / 150) % 2 ? FRAMES.walkA : FRAMES.walkB;
    }

    function spawnParticles(L, target) {
        const nx = L.standX + NOZZLE_X;
        const ny = L.charY;
        for (let i = 0; i < 3; i++) {
            const life = rand(180, 260);
            particles.push({
                x: nx,
                y: ny,
                vx: (target.x - nx) / life + rand(-0.03, 0.03),
                vy: (target.y - ny) / life + rand(-0.03, 0.03),
                life,
                age: 0,
            });
        }
    }

    function draw(dt) {
        ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
        if (!cycle) return;
        const L = measure();

        // Tag
        const alpha = t < cycle.fadeStart
            ? 1
            : clamp(1 - (t - cycle.fadeStart) / (cycle.fadeEnd - cycle.fadeStart), 0, 1);
        const shown = Math.floor(clamp((t - cycle.b) / SPRAY, 0, 1) * dots.length);
        ctx.fillStyle = ACCENT;
        for (let i = 0; i < shown; i++) {
            const d = dots[i];
            ctx.globalAlpha = alpha * d.a;
            ctx.fillRect(L.tagX + d.x, L.tagY + d.y, d.s, d.s);
        }

        // Short drips under the letters
        const dripP = clamp((t - cycle.c) / DRIP, 0, 1);
        if (dripP > 0) {
            ctx.globalAlpha = alpha * 0.85;
            drips.forEach(d => {
                const len = d.len * dripP;
                ctx.fillRect(L.tagX + d.x, L.tagY + d.y, 2, len);
                ctx.fillRect(L.tagX + d.x - 0.5, L.tagY + d.y + len, 3, 3);
            });
        }

        // Long drips leaking down the side of the card
        const leakP = clamp((t - cycle.c) / LEAK, 0, 1);
        if (leakP > 0) {
            const eased = 1 - (1 - leakP) * (1 - leakP);
            ctx.globalAlpha = alpha * 0.85;
            leaks.forEach(k => {
                const localX = Math.round(L.cardLeft - L.tagX) + k.dx;
                const top = colBottom[localX];
                if (top === undefined || top < 0) return;
                const len = k.len * eased;
                ctx.fillRect(L.tagX + localX, L.tagY + top, 2, len);
                ctx.fillRect(L.tagX + localX - 0.5, L.tagY + top + len, 3, 3);
            });
        }

        // Spray particles
        particles = particles.filter(p => (p.age += dt) < p.life);
        particles.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            ctx.globalAlpha = 1 - (p.age / p.life) * 0.8;
            ctx.fillRect(p.x, p.y, 2, 2);
        });
        ctx.globalAlpha = 1;

        // Character: walks in from the right facing left, then back out facing right
        const offRight = L.w + 10;
        if (t < cycle.a) {
            drawSprite(walkFrame(), lerp(offRight, L.standX, t / cycle.a), L.charY, 0, true);
        } else if (t < cycle.b) {
            // Shake the can before spraying
            drawSprite(FRAMES.spray, L.standX, L.charY, Math.floor(t / 90) % 2 ? -PX : 0, true);
        } else if (t < cycle.c) {
            drawSprite(FRAMES.spray, L.standX, L.charY, 0, true);
            const target = dots[Math.max(shown - 1, 0)];
            spawnParticles(L, { x: L.tagX + target.x, y: L.tagY + target.y });
        } else if (t < cycle.d) {
            drawSprite(FRAMES.stand, L.standX, L.charY, 0, true);
        } else if (t < cycle.e) {
            const p = (t - cycle.d) / (cycle.e - cycle.d);
            drawSprite(walkFrame(), lerp(L.standX, offRight, p), L.charY, 0, false);
        }
    }

    function tick(now) {
        // Clamp so a background tab doesn't make everything jump
        const dt = Math.min(now - last, 50);
        last = now;
        t += dt;
        if (t >= (cycle ? cycle.period : PERIOD)) startCycle();
        draw(dt);
        requestAnimationFrame(tick);
    }

    window.addEventListener("resize", sizeCanvas);
    sizeCanvas();
    document.fonts.load("700 38px 'Space Grotesk'").finally(() => {
        buildTag();
        requestAnimationFrame(tick);
    });
})();
