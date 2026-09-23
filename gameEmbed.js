// Sizes the Treasure Hunter <iframe> on the projects page to fit the game.
// The game posts its height whenever its layout changes (see reportHeight in numbers.js).
const gameFrame = document.getElementById('game-frame');

if (gameFrame) {
    window.addEventListener('message', (event) => {
        if (event.source !== gameFrame.contentWindow) return;

        const data = event.data;
        if (!data || data.type !== 'treasure-hunter:height' || !Number.isFinite(data.height)) return;

        gameFrame.style.height = `${data.height}px`;
    });
}
