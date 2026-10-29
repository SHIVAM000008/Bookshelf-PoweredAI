
import { useEffect, useState } from "react";

const GIFT_DATE = "2026-10-29";
const DISMISS_KEY = `bookshelf-karwa-gift-dismissed-${GIFT_DATE}`;

function getIndiaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function wasDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "true";
  } catch {
    return false;
  }
}

const hearts = [
  { left: "7%", delay: "0s", duration: "8s", size: "19px" },
  { left: "17%", delay: "2s", duration: "10s", size: "14px" },
  { left: "29%", delay: "4s", duration: "9s", size: "23px" },
  { left: "43%", delay: "1s", duration: "11s", size: "16px" },
  { left: "57%", delay: "3s", duration: "8s", size: "20px" },
  { left: "69%", delay: "5s", duration: "10s", size: "15px" },
  { left: "81%", delay: "1.5s", duration: "9s", size: "22px" },
  { left: "92%", delay: "3.5s", duration: "11s", size: "16px" },
];

const fireworks = [
  { left: "15%", top: "22%", delay: "0s" },
  { left: "83%", top: "19%", delay: "1.4s" },
  { left: "76%", top: "67%", delay: "2.8s" },
  { left: "23%", top: "72%", delay: "2s" },
];

export default function KarwaChauthGift() {
  const [visible, setVisible] = useState(() => {
    return getIndiaDate() === GIFT_DATE && !wasDismissed();
  });

  const [expired, setExpired] = useState(false);

  useEffect(() => {
    function checkDate() {
      const isGiftDay = getIndiaDate() === GIFT_DATE;

      if (!isGiftDay) {
        setVisible(false);
        setExpired(true);
      }
    }

    checkDate();

    // Also check when the tab becomes active again.
    window.addEventListener("focus", checkDate);
    document.addEventListener("visibilitychange", checkDate);

    return () => {
      window.removeEventListener("focus", checkDate);
      document.removeEventListener("visibilitychange", checkDate);
    };
  }, []);

  function closeGift() {
    try {
      localStorage.setItem(DISMISS_KEY, "true");
    } catch {
      // The close action still works if storage is unavailable.
    }

    setVisible(false);
  }

  if (!visible || expired) return null;

  return (
    <div
      className="kc-gift-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kc-gift-title"
      aria-describedby="kc-gift-message"
    >
      <style>{`
        .kc-gift-overlay {
          position: fixed;
          inset: 0;
          z-index: 99999;
          display: grid;
          place-items: center;
          overflow: hidden;
          padding: 24px;
          color: var(--text-primary, #fff8f0);
          background:
            radial-gradient(ellipse at 50% 42%, rgba(151, 48, 73, 0.25), transparent 55%),
            radial-gradient(ellipse at 15% 10%, rgba(205, 155, 91, 0.12), transparent 38%),
            var(--bg-primary, #17131b);
          animation: kc-overlay-in 700ms ease both;
          isolation: isolate;
        }

        .kc-gift-overlay::before {
          position: absolute;
          inset: 18px;
          border: 1px solid rgba(211, 169, 112, 0.32);
          border-radius: 20px;
          content: "";
          pointer-events: none;
        }

        .kc-gift-close {
          position: absolute;
          z-index: 5;
          top: 30px;
          right: 30px;
          display: grid;
          place-items: center;
          width: 44px;
          height: 44px;
          border: 1px solid rgba(211, 169, 112, 0.4);
          border-radius: 50%;
          background: var(--bg-card, #241d27);
          color: var(--text-primary, #fff8f0);
          font-size: 25px;
          cursor: pointer;
          transition: transform 180ms ease, background 180ms ease;
        }

        .kc-gift-close:hover {
          transform: rotate(90deg);
          background: var(--brand-soft, #482638);
        }

        .kc-gift-close:focus-visible {
          outline: 3px solid var(--focus-ring, #e6bd82);
          outline-offset: 4px;
        }

        .kc-gift-content {
          position: relative;
          z-index: 2;
          width: min(760px, 100%);
          text-align: center;
        }

        .kc-gift-moon {
          display: inline-grid;
          place-items: center;
          width: 78px;
          height: 78px;
          margin-bottom: 24px;
          border: 1px solid rgba(224, 183, 125, 0.48);
          border-radius: 50%;
          background: radial-gradient(circle, rgba(224, 183, 125, 0.18), transparent 70%);
          color: #f2d6a1;
          font-size: 43px;
          box-shadow: 0 0 45px rgba(224, 183, 125, 0.13);
          animation: kc-moon-glow 3s ease-in-out infinite;
        }

        .kc-gift-eyebrow {
          margin: 0 0 19px;
          color: var(--focus-ring, #e4bc85);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 3.5px;
          text-transform: uppercase;
          animation: kc-text-from-left 900ms 150ms both;
        }

        .kc-gift-title {
          margin: 0;
          font-family: "Playfair Display", Georgia, serif;
          font-size: clamp(35px, 6.4vw, 68px);
          font-weight: 600;
          letter-spacing: -1.5px;
          line-height: 1.13;
          text-wrap: balance;
          animation: kc-text-from-left 950ms 350ms both;
        }

        .kc-gift-title span {
          display: block;
          margin-top: 9px;
          color: var(--focus-ring, #e4bc85);
        }

        .kc-gift-divider {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 13px;
          margin: 27px auto;
          color: var(--focus-ring, #e4bc85);
          animation: kc-text-from-left 900ms 600ms both;
        }

        .kc-gift-divider::before,
        .kc-gift-divider::after {
          width: 65px;
          height: 1px;
          background: linear-gradient(90deg, transparent, currentColor);
          content: "";
        }

        .kc-gift-divider::after {
          transform: rotate(180deg);
        }

        .kc-gift-message {
          max-width: 540px;
          margin: 0 auto;
          color: var(--text-secondary, #d3c6ce);
          font-size: clamp(14px, 2.1vw, 17px);
          line-height: 1.9;
          animation: kc-text-from-left 950ms 750ms both;
        }

        .kc-gift-signoff {
          margin-top: 27px;
          color: var(--focus-ring, #e4bc85);
          font-family: "Playfair Display", Georgia, serif;
          font-size: 20px;
          font-style: italic;
          animation: kc-text-from-left 950ms 950ms both;
        }

        .kc-gift-heart {
          position: absolute;
          z-index: 1;
          bottom: -45px;
          color: rgba(224, 133, 157, 0.72);
          pointer-events: none;
          animation: kc-heart-float linear infinite;
        }

        .kc-firework {
          position: absolute;
          z-index: 1;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #f4d09a;
          box-shadow:
            0 -20px 0 -1px #f4d09a,
            0 20px 0 -1px #f4d09a,
            20px 0 0 -1px #f4d09a,
            -20px 0 0 -1px #f4d09a,
            14px 14px 0 -1px #e7a2b5,
            -14px -14px 0 -1px #e7a2b5,
            14px -14px 0 -1px #e7a2b5,
            -14px 14px 0 -1px #e7a2b5;
          opacity: 0;
          pointer-events: none;
          animation: kc-firework-burst 3.6s ease-out infinite;
        }

        @keyframes kc-overlay-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes kc-text-from-left {
          from {
            opacity: 0;
            transform: translateX(-55px);
            filter: blur(5px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
            filter: blur(0);
          }
        }

        @keyframes kc-moon-glow {
          0%, 100% { box-shadow: 0 0 28px rgba(224, 183, 125, 0.1); }
          50% { box-shadow: 0 0 55px rgba(224, 183, 125, 0.3); }
        }

        @keyframes kc-heart-float {
          0% {
            transform: translate3d(0, 0, 0) rotate(-12deg);
            opacity: 0;
          }
          12% { opacity: 0.7; }
          85% { opacity: 0.55; }
          100% {
            transform: translate3d(30px, -115vh, 0) rotate(18deg);
            opacity: 0;
          }
        }

        @keyframes kc-firework-burst {
          0%, 12%, 100% {
            opacity: 0;
            transform: scale(0.2) rotate(0deg);
          }
          20% {
            opacity: 0.85;
            transform: scale(1.15) rotate(25deg);
          }
          35% {
            opacity: 0;
            transform: scale(1.6) rotate(45deg);
          }
        }

        @media (max-width: 600px) {
          .kc-gift-overlay { padding: 30px; }
          .kc-gift-overlay::before { inset: 10px; border-radius: 14px; }
          .kc-gift-close { top: 22px; right: 22px; width: 40px; height: 40px; }
          .kc-gift-moon { width: 66px; height: 66px; font-size: 35px; margin-bottom: 22px; }
          .kc-gift-eyebrow { font-size: 9px; letter-spacing: 2.2px; }
          .kc-gift-title { letter-spacing: -0.7px; }
          .kc-gift-divider { margin: 22px auto; }
          .kc-gift-signoff { font-size: 18px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .kc-gift-overlay *,
          .kc-gift-overlay::before {
            animation: none !important;
            transition: none !important;
          }

          .kc-gift-eyebrow,
          .kc-gift-title,
          .kc-gift-divider,
          .kc-gift-message,
          .kc-gift-signoff {
            opacity: 1;
            transform: none;
            filter: none;
          }

          .kc-gift-heart,
          .kc-firework {
            display: none;
          }
        }
      `}</style>

      <button
        className="kc-gift-close"
        type="button"
        onClick={closeGift}
        aria-label="Close Karwa Chauth greeting"
        title="Close and enter Bookshelf"
        autoFocus
      >
        ×
      </button>

      {hearts.map((heart, index) => (
        <span
          key={`heart-${index}`}
          className="kc-gift-heart"
          aria-hidden="true"
          style={{
            left: heart.left,
            animationDelay: heart.delay,
            animationDuration: heart.duration,
            fontSize: heart.size,
          }}
        >
          {index % 3 === 0 ? "♥" : index % 3 === 1 ? "♡" : "❤"}
        </span>
      ))}

      {fireworks.map((firework, index) => (
        <span
          key={`firework-${index}`}
          className="kc-firework"
          aria-hidden="true"
          style={{
            left: firework.left,
            top: firework.top,
            animationDelay: firework.delay,
          }}
        />
      ))}

      <div className="kc-gift-content">
        <div className="kc-gift-moon" aria-hidden="true">
          ☾
        </div>

        <p className="kc-gift-eyebrow">
          A little surprise, made with love
        </p>

        <h1 className="kc-gift-title" id="kc-gift-title">
          A Special Gift
          <span>for My Dear Special One</span>
        </h1>

        <div className="kc-gift-divider" aria-hidden="true">
          <span>♥</span>
          <span>✦</span>
          <span>♥</span>
        </div>

        <p className="kc-gift-message" id="kc-gift-message">
          On this beautiful Karwa Chauth, I wanted to dedicate something
          special to you. May your life always be filled with love,
          happiness, and a thousand little reasons to smile.
          <br />
          <strong>Happy Karwa Chauth! 🌙❤️</strong>
        </p>

        <div className="kc-gift-signoff">
          Made with love, just for you ✨
        </div>
      </div>
    </div>
  );
}
