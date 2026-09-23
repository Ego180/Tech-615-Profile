// ==========================================================
// Playlist
// Put your MP3 files in the /music folder, then list them below.
// Paths are relative to index.html, so they work locally and on GitHub Pages.
// ==========================================================
const PLAYLIST = [
    // { title: "Song Title", artist: "Artist Name", src: "music/song-file.mp3" },
    {title : "Mel 106" , artist : "Eghosa " , src : "music/mel106 87 BPM.mp3"},
    {title : "Mel 129" , artist : "Eghosa " , src : "music/mel 129 103 BPM.mp3"},
    {title : "Mel 121" , artist : "Eghosa " , src : "music/mel 121 132Bpm.mp3"},
    { title : "Mel 91" , artist : "Eghosa " , src : "music/mel 91 142 BPM.mp3"},
    { title : "Mel 92" , artist : "Eghosa + Friends" , src : "music/mel_92_132 BPM.mp3"},
    { title : "Scribz" , artist : "Eghosa " , src : "music/scribz riley remixed.mp3"}, 
];

(function () {
    const widget = document.getElementById("vinyl");
    if (!widget) return;

    const audio = document.getElementById("audio");
    const playBtn = document.getElementById("play");
    const prevBtn = document.getElementById("prev");
    const nextBtn = document.getElementById("next");
    const titleEl = document.getElementById("track-title");
    const artistEl = document.getElementById("track-artist");
    const progress = document.getElementById("progress");
    const timeCurrent = document.getElementById("time-current");
    const timeDuration = document.getElementById("time-duration");
    const volume = document.getElementById("volume");
    const volumeToggle = document.getElementById("volume-toggle");
    const volumeSlider = document.getElementById("volume-slider");

    // ---- Volume pop-up ----
    function setVolume(v) {
        audio.volume = v;
        volumeSlider.value = v;
        volume.classList.toggle("is-muted", v === 0);
        try { localStorage.setItem("vinyl-volume", v); } catch (e) {}
    }

    function setVolumeOpen(open) {
        volume.classList.toggle("is-open", open);
        volumeToggle.setAttribute("aria-expanded", open);
        if (open) volumeSlider.focus();
    }

    volumeToggle.addEventListener("click", () => setVolumeOpen(!volume.classList.contains("is-open")));
    volumeSlider.addEventListener("input", () => setVolume(parseFloat(volumeSlider.value)));
    // Close when clicking anywhere else, or pressing Escape
    document.addEventListener("click", e => {
        if (!volume.contains(e.target)) setVolumeOpen(false);
    });
    document.addEventListener("keydown", e => {
        if (e.key === "Escape") setVolumeOpen(false);
    });

    let savedVolume = 0.8;
    try {
        const stored = parseFloat(localStorage.getItem("vinyl-volume"));
        if (stored >= 0 && stored <= 1) savedVolume = stored;
    } catch (e) {}
    setVolume(savedVolume);

    if (PLAYLIST.length === 0) {
        titleEl.textContent = "No tracks yet";
        artistEl.textContent = "Add MP3s in vinyl.js";
        [playBtn, prevBtn, nextBtn, progress].forEach(el => el.disabled = true);
        return;
    }

    // Start on a random track so each visit feels a bit different
    let index = Math.floor(Math.random() * PLAYLIST.length);
    let seeking = false;

    function formatTime(seconds) {
        if (!isFinite(seconds)) return "0:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    }

    function load(i) {
        index = (i + PLAYLIST.length) % PLAYLIST.length;
        const track = PLAYLIST[index];
        audio.src = track.src;
        titleEl.textContent = track.title;
        artistEl.textContent = track.artist || "";
        progress.value = 0;
        timeCurrent.textContent = "0:00";
        timeDuration.textContent = "0:00";
    }

    function play() {
        audio.play().catch(() => {
            // Browser blocked playback or the file is missing
        });
    }

    function skip(direction) {
        load(index + direction);
        play();
    }

    playBtn.addEventListener("click", () => {
        if (audio.paused) play();
        else audio.pause();
    });
    prevBtn.addEventListener("click", () => {
        // Like most players: restart the song if we're a few seconds in
        if (audio.currentTime > 3) audio.currentTime = 0;
        else skip(-1);
    });
    nextBtn.addEventListener("click", () => skip(1));

    audio.addEventListener("play", () => {
        widget.classList.add("is-playing");
        playBtn.setAttribute("aria-label", "Pause");
    });
    audio.addEventListener("pause", () => {
        widget.classList.remove("is-playing");
        playBtn.setAttribute("aria-label", "Play");
    });
    audio.addEventListener("ended", () => skip(1));
    audio.addEventListener("loadedmetadata", () => {
        timeDuration.textContent = formatTime(audio.duration);
    });
    audio.addEventListener("timeupdate", () => {
        if (seeking || !audio.duration) return;
        progress.value = (audio.currentTime / audio.duration) * 100;
        timeCurrent.textContent = formatTime(audio.currentTime);
    });
    audio.addEventListener("error", () => {
        titleEl.textContent = "Couldn't load track";
        artistEl.textContent = PLAYLIST[index].src;
        widget.classList.remove("is-playing");
    });

    progress.addEventListener("input", () => {
        seeking = true;
        if (audio.duration) {
            timeCurrent.textContent = formatTime((progress.value / 100) * audio.duration);
        }
    });
    progress.addEventListener("change", () => {
        if (audio.duration) audio.currentTime = (progress.value / 100) * audio.duration;
        seeking = false;
    });

    load(index);
})();
