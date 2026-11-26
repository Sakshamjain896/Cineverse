
import { useEffect, useRef, useState } from "react";
import { Film, Play, Volume2, VolumeX } from "lucide-react";

const YOUTUBE_API_URL = "https://www.youtube.com/iframe_api";
const SAFE_YOUTUBE_KEY_RE = /^[a-zA-Z0-9_-]{6,20}$/;

let youtubeApiPromise = null;

function loadYouTubeAPI() {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (youtubeApiPromise) {
    return youtubeApiPromise;
  }

  youtubeApiPromise = new Promise((resolve, reject) => {
    const previousCallback = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      resolve(window.YT);
    };

    let script = document.querySelector(
      `script[src="${YOUTUBE_API_URL}"]`,
    );

    if (!script) {
      script = document.createElement("script");
      script.src = YOUTUBE_API_URL;
      script.async = true;
      document.head.appendChild(script);
    }

    script.onerror = () => {
      youtubeApiPromise = null;
      reject(new Error("Could not load the YouTube player."));
    };
  });

  return youtubeApiPromise;
}

function getPlayerErrorMessage(errorCode) {
  switch (errorCode) {
    case 2:
      return "The trailer ID is invalid.";
    case 5:
      return "This video cannot be played in the current player.";
    case 100:
      return "This trailer is unavailable or has been removed.";
    case 101:
    case 150:
      return "The video owner does not allow embedded playback.";
    default:
      return "Unable to play this trailer right now.";
  }
}

export default function TrailerPlayer({
  trailer,
  title = "Movie trailer",
  autoplay = false,
  muted = false,
  controls = true,
  className = "",
}) {
  const playerContainerRef = useRef(null);
  const playerRef = useRef(null);

  const [playerReady, setPlayerReady] = useState(false);
  const [playerError, setPlayerError] = useState("");
  const [isMuted, setIsMuted] = useState(muted);

  const videoKey =
    trailer?.site === "YouTube" &&
    typeof trailer?.key === "string" &&
    SAFE_YOUTUBE_KEY_RE.test(trailer.key)
      ? trailer.key
      : null;

  useEffect(() => {
    setPlayerReady(false);
    setPlayerError("");
    setIsMuted(muted);

    if (!videoKey || !playerContainerRef.current) {
      return undefined;
    }

    let cancelled = false;
    let player = null;

    loadYouTubeAPI()
      .then((YT) => {
        if (cancelled || !playerContainerRef.current) return;

        player = new YT.Player(playerContainerRef.current, {
          width: "100%",
          height: "100%",
          videoId: videoKey,
          playerVars: {
            autoplay: autoplay ? 1 : 0,
            controls: controls ? 1 : 0,
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (cancelled) {
                event.target.destroy();
                return;
              }

              playerRef.current = event.target;

              if (muted) {
                event.target.mute();
              } else {
                event.target.unMute();
              }

              if (autoplay) {
                event.target.playVideo();
              }

              setPlayerReady(true);
            },

            onError: (event) => {
              if (cancelled) return;

              setPlayerError(
                getPlayerErrorMessage(event.data),
              );
              setPlayerReady(false);
            },
          },
        });
      })
      .catch((error) => {
        if (!cancelled) {
          setPlayerError(
            error.message || "Unable to initialize the trailer player.",
          );
        }
      });

    return () => {
      cancelled = true;

      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      } else if (player) {
        player.destroy();
      }
    };
  }, [videoKey, autoplay, muted, controls]);

  const toggleMute = () => {
    const player = playerRef.current;

    if (!player) return;

    if (isMuted) {
      player.unMute();
      setIsMuted(false);
    } else {
      player.mute();
      setIsMuted(true);
    }
  };

  if (!videoKey) {
    return (
      <div
        className={`flex aspect-video items-center justify-center rounded-xl border border-white/10 bg-[#171719] ${className}`}
      >
        <div className="text-center">
          <Film
            size={30}
            className="mx-auto mb-3 text-[#d9b77b]/60"
          />
          <p className="text-sm text-white/65">
            Trailer currently unavailable
          </p>
        </div>
      </div>
    );
  }

  return (
    <section
      className={`overflow-hidden rounded-xl border border-white/10 bg-black ${className}`}
      aria-label={`${title} trailer`}
    >
      <div className="relative aspect-video w-full">
        <div
          ref={playerContainerRef}
          className="absolute inset-0 h-full w-full"
        />

        {!playerReady && !playerError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#171719]">
            <div className="text-center">
              <Film
                size={28}
                className="mx-auto mb-3 animate-pulse text-[#d9b77b]"
              />
              <p className="text-xs text-white/60">
                Loading trailer...
              </p>
            </div>
          </div>
        )}

        {playerError && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#171719] p-5">
            <div className="max-w-xs text-center">
              <Film
                size={28}
                className="mx-auto mb-3 text-[#d9b77b]/60"
              />
              <p className="text-sm font-medium text-white">
                Playback unavailable
              </p>
              <p className="mt-2 text-xs leading-5 text-white/55">
                {playerError}
              </p>
            </div>
          </div>
        )}

        {playerReady && !controls && (
          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute trailer" : "Mute trailer"}
            className="absolute bottom-3 right-3 z-20 grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-black/70 text-white transition hover:bg-black"
          >
            {isMuted ? (
              <VolumeX size={16} />
            ) : (
              <Volume2 size={16} />
            )}
          </button>
        )}
      </div>

      {trailer?.name && (
        <div className="flex items-center justify-between gap-3 bg-[#111214] px-3.5 py-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-white/90">
              {trailer.name}
            </p>
            <p className="mt-1 text-[10px] text-white/45">
              {trailer.official ? "Official trailer" : "Movie trailer"}
              {" · YouTube"}
            </p>
          </div>

          <Play
            size={15}
            className="shrink-0 text-[#d9b77b]"
          />
        </div>
      )}
    </section>
  );
}
