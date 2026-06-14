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
  const mediaContainerRef = useRef(null);
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const pinchStartRef = useRef({ distance: 0, transform: null, center: null });
  const panStartRef = useRef(null);
  const [showStaticInvite, setShowStaticInvite] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(inviteSeenStorageKey) === "true";
  });
  const [orientationBlocked, setOrientationBlocked] = useState(false);
  const [canStartVideo, setCanStartVideo] = useState(true);

  const applyTransform = (tx, ty, scale) => {
    if (scale <= 1) {
      tx = 0;
      ty = 0;
      scale = 1;
    } else {
      const bounceX = (window.innerWidth * (scale - 1)) / 1.5;
      const bounceY = (window.innerHeight * (scale - 1)) / 1.5;
      tx = Math.max(Math.min(tx, bounceX), -bounceX);
      ty = Math.max(Math.min(ty, bounceY), -bounceY);
    }
    transformRef.current = { x: tx, y: ty, scale };
    if (mediaContainerRef.current) {
      mediaContainerRef.current.style.setProperty("--invite-tx", `${tx}px`);
      mediaContainerRef.current.style.setProperty("--invite-ty", `${ty}px`);
      mediaContainerRef.current.style.setProperty("--invite-scale", scale);
    }
  };

  useEffect(() => {
    let timeoutId;
    const updateAppHeight = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        document.documentElement.style.setProperty("--app-height", `${window.innerHeight}px`);
      }, 100);
    };

    document.documentElement.style.setProperty("--app-height", `${window.innerHeight}px`);

    window.addEventListener("resize", updateAppHeight);
    window.visualViewport?.addEventListener("resize", updateAppHeight);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", updateAppHeight);
      window.visualViewport?.removeEventListener("resize", updateAppHeight);
    };
  }, []);

  useEffect(() => {
    if (!showStaticInvite) {
      const preloadMain = new Image();
      preloadMain.src = "/assets/telaconvite.png";
      inviteButtons.forEach((btn) => {
        const preloadBtn = new Image();
        preloadBtn.src = btn.imageSrc;
      });
    }
  }, [showStaticInvite]);

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

    let resizeTimeoutId;
    const handleResize = () => {
      clearTimeout(resizeTimeoutId);
      resizeTimeoutId = setTimeout(() => {
        updateOrientationState();
      }, 100);
    };

    tryLockOrientation();
    updateOrientationState();

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    screen.orientation?.addEventListener("change", handleResize);

    return () => {
      clearTimeout(resizeTimeoutId);
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
    applyTransform(0, 0, 1);
    setCanStartVideo(true);
    setShowStaticInvite(false);
  };

  const getTouchDistance = (touches) => {
    return Math.hypot(
      touches[1].clientX - touches[0].clientX,
      touches[1].clientY - touches[0].clientY
    );
  };

  const getTouchCenter = (touches) => {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  const handleInviteTouchStart = (event) => {
    if (event.touches.length === 2) {
      pinchStartRef.current = {
        distance: getTouchDistance(event.touches),
        transform: { ...transformRef.current },
        center: getTouchCenter(event.touches),
      };
    } else if (event.touches.length === 1) {
      panStartRef.current = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
        transform: { ...transformRef.current },
      };
    }
  };

  const handleInviteTouchMove = (event) => {
    if (event.touches.length === 2 && pinchStartRef.current.distance) {
      event.preventDefault();
      const currentDistance = getTouchDistance(event.touches);
      const currentCenter = getTouchCenter(event.touches);
      const start = pinchStartRef.current;

      const scaleRatio = currentDistance / start.distance;
      let newScale = start.transform.scale * scaleRatio;

      newScale = Math.max(1, Math.min(newScale, 3));

      const actualScaleRatio = newScale / start.transform.scale;

      const originX = window.innerWidth / 2;
      const originY = window.innerHeight / 2;

      const dx_start = start.center.x - originX - start.transform.x;
      const dy_start = start.center.y - originY - start.transform.y;

      const tx = currentCenter.x - originX - dx_start * actualScaleRatio;
      const ty = currentCenter.y - originY - dy_start * actualScaleRatio;

      applyTransform(tx, ty, newScale);
    } else if (event.touches.length === 1 && panStartRef.current) {
      event.preventDefault();
      const dx = event.touches[0].clientX - panStartRef.current.x;
      const dy = event.touches[0].clientY - panStartRef.current.y;

      const newX = panStartRef.current.transform.x + dx;
      const newY = panStartRef.current.transform.y + dy;

      applyTransform(newX, newY, transformRef.current.scale);
    }
  };

  const handleInviteTouchEnd = (event) => {
    if (event.touches.length < 2) {
      pinchStartRef.current = { distance: 0, transform: null, center: null };
    }
    if (event.touches.length === 1) {
      panStartRef.current = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
        transform: { ...transformRef.current },
      };
    }
    if (event.touches.length === 0) {
      panStartRef.current = null;
      if (transformRef.current.scale <= 1) {
        applyTransform(0, 0, 1);
      }
    }
  };

  return (
    <main className="page" aria-label="Convite de casamento">
      <section className="portrait-shell" aria-label="Conteúdo principal">
        {showStaticInvite ? (
          <div
            ref={mediaContainerRef}
            className="media-container"
            onTouchStart={handleInviteTouchStart}
            onTouchMove={handleInviteTouchMove}
            onTouchEnd={handleInviteTouchEnd}
            onTouchCancel={handleInviteTouchEnd}
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
              onKeyDown={(e) => {
                if (canStartVideo && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  handlePlay();
                }
              }}
              tabIndex={canStartVideo ? 0 : undefined}
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
              <div className="tap-indicator" aria-hidden="true">
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
