import { useEffect, useRef, useState } from "react";

const inviteButtons = [
  {
    label: "Confirmar Presença",
    url: "https://api.whatsapp.com/send?phone=5585991434729&text=Ol%C3%A1%20Roberta%2C%20gostaria%20de%20confirmar%20presen%C3%A7a%20no%20seu%20casamento!%20%F0%9F%98%8E",
    imageSrc: "/assets/botao-1.png",
  },
  {
    label: "Local Cerimônia",
    url: "https://maps.app.goo.gl/8eKKasu97tpzend78",
    imageSrc: "/assets/botao-2.png",
  },
  {
    label: "Local Recepção",
    url: "https://maps.app.goo.gl/RhgyXhvxNw4HhJHr5",
    imageSrc: "/assets/botao-3.png",
  },
];

const inviteSeenStorageKey = "roberta-invite-video-seen";

export default function App() {
  const videoRef = useRef(null);
  const pinchStartDistanceRef = useRef(null);
  const pinchStartScaleRef = useRef(1);
  const [showStaticInvite, setShowStaticInvite] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(inviteSeenStorageKey) === "true";
  });
  const [orientationBlocked, setOrientationBlocked] = useState(false);
  const [inviteScale, setInviteScale] = useState(1);
  const [canStartVideo, setCanStartVideo] = useState(true);

  useEffect(() => {
    const updateAppHeight = () => {
      document.documentElement.style.setProperty("--app-height", `${window.innerHeight}px`);
    };

    updateAppHeight();

    window.addEventListener("resize", updateAppHeight);
    window.visualViewport?.addEventListener("resize", updateAppHeight);

    return () => {
      window.removeEventListener("resize", updateAppHeight);
      window.visualViewport?.removeEventListener("resize", updateAppHeight);
    };
  }, []);

  useEffect(() => {
    let orientationLockFailed = false;

    const isTouchDevice =
      window.matchMedia("(pointer: coarse)").matches ||
      window.matchMedia("(hover: none)").matches;

    const updateOrientationState = () => {
      const isLandscape = window.matchMedia("(orientation: landscape)").matches;
      setOrientationBlocked(Boolean(isTouchDevice && isLandscape && orientationLockFailed));
    };

    const tryLockOrientation = async () => {
      if (!screen.orientation?.lock) {
        orientationLockFailed = true;
        updateOrientationState();
        return;
      }

      try {
        await screen.orientation.lock("portrait-primary");
        orientationLockFailed = false;
      } catch {
        orientationLockFailed = true;
      } finally {
        updateOrientationState();
      }
    };

    const handleResize = () => {
      updateOrientationState();
    };

    tryLockOrientation();
    updateOrientationState();

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    screen.orientation?.addEventListener("change", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      screen.orientation?.removeEventListener("change", handleResize);
    };
  }, []);

  const handlePlay = async () => {
    const video = videoRef.current;
    if (!video || !video.paused) {
      return;
    }

    try {
      await video.play();
      setCanStartVideo(false);
    } catch (error) {
      // Autoplay policies or missing file; keep silent for clean UI
    }
  };

  const handleButtonClick = (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleVideoEnded = () => {
    window.localStorage.setItem(inviteSeenStorageKey, "true");
    setShowStaticInvite(true);
  };

  const handleReplay = () => {
    window.localStorage.removeItem(inviteSeenStorageKey);
    setInviteScale(1);
    setCanStartVideo(true);
    setShowStaticInvite(false);
  };

  const getTouchDistance = (touches) => {
    const firstTouch = touches[0];
    const secondTouch = touches[1];
    return Math.hypot(
      secondTouch.clientX - firstTouch.clientX,
      secondTouch.clientY - firstTouch.clientY
    );
  };

  const handleInviteTouchStart = (event) => {
    if (event.touches.length !== 2) {
      return;
    }

    pinchStartDistanceRef.current = getTouchDistance(event.touches);
    pinchStartScaleRef.current = inviteScale;
  };

  const handleInviteTouchMove = (event) => {
    if (event.touches.length !== 2 || !pinchStartDistanceRef.current) {
      return;
    }

    event.preventDefault();

    const nextDistance = getTouchDistance(event.touches);
    const nextScale =
      pinchStartScaleRef.current * (nextDistance / pinchStartDistanceRef.current);

    setInviteScale(Math.min(Math.max(nextScale, 1), 2.6));
  };

  const handleInviteTouchEnd = (event) => {
    if (event.touches.length < 2) {
      pinchStartDistanceRef.current = null;
      pinchStartScaleRef.current = inviteScale;
    }
  };

  return (
    <main className="page" aria-label="Convite de casamento">
      <section className="portrait-shell" aria-label="Conteúdo principal">
        {showStaticInvite ? (
          <div
            className="media-container"
            onTouchStart={handleInviteTouchStart}
            onTouchMove={handleInviteTouchMove}
            onTouchEnd={handleInviteTouchEnd}
            onTouchCancel={handleInviteTouchEnd}
            style={{ "--invite-scale": inviteScale }}
          >
            <img
              className="media"
              src="/assets/telaconvite.png"
              alt="Convite de casamento"
            />
            <div className="invite-button-row" aria-label="Links do convite">
              {inviteButtons.map((button) => (
                <button
                  className="invite-button"
                  key={button.label}
                  onClick={() => handleButtonClick(button.url)}
                  aria-label={button.label}
                  type="button"
                >
                  <img src={button.imageSrc} alt="" aria-hidden="true" />
                </button>
              ))}
            </div>
            <button
              className="replay-button"
              onClick={handleReplay}
              type="button"
              aria-label="Assistir ao vídeo novamente"
            >
              ↻
            </button>
          </div>
        ) : (
          <div className="video-wrapper">
            <video
              ref={videoRef}
              className={`media ${canStartVideo ? "media--clickable" : ""}`}
              onClick={canStartVideo ? handlePlay : undefined}
              onPlay={() => setCanStartVideo(false)}
              onEnded={handleVideoEnded}
              playsInline
              preload="metadata"
              poster="/assets/convite.png"
            >
              <source src="/assets/convite.mp4" type="video/mp4" />
              Seu navegador não suporta vídeo HTML5.
            </video>
            {canStartVideo && (
              <div className="tap-indicator">
                <span>Aperte</span>
                <svg viewBox="0 0 24 24">
                  <path d="M12 4v14M19 11l-7 7-7-7" />
                </svg>
              </div>
            )}
          </div>
        )}
      </section>

      {orientationBlocked ? (
        <div className="orientation-overlay" role="alert" aria-live="assertive">
          <div className="orientation-overlay__card">
            <span className="orientation-overlay__icon" aria-hidden="true">
              ↻
            </span>
            <p>Vire o dispositivo para usar o aplicativo na vertical.</p>
          </div>
        </div>
      ) : null}
    </main>
  );
}
