import { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface ShareSessionCardProps {
  title: string;
  joinCode: string;
  joinUrl: string;
}

/**
 * Rendered off-screen (see ShareSessionButton) purely so html-to-image has
 * a clean, non-interactive DOM node to snapshot — no buttons, no toggled
 * states, just the info someone would want on a shared image. Portrait
 * aspect ratio since this is designed to be shared to a phone (WhatsApp,
 * Instagram story, etc.), not viewed on a desktop screen.
 */
export const ShareSessionCard = forwardRef<HTMLDivElement, ShareSessionCardProps>(
  ({ title, joinCode, joinUrl }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          width: 600,
          height: 900,
          background: 'linear-gradient(160deg, #0b0b14 0%, #14141f 55%, #1b1029 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 60,
          fontFamily: '"Inter", sans-serif',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: '#2ce8a6',
              boxShadow: '0 0 20px 6px rgba(44, 232, 166, 0.5)',
            }}
          />
          <span
            style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 600,
              fontSize: 28,
              color: '#f5f3ff',
              letterSpacing: '-0.02em',
            }}
          >
            Pulse
            <span
              style={{
                background: 'linear-gradient(90deg, #7c5cff, #ff4fcb)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Board
            </span>
          </span>
        </div>

        <p
          style={{
            color: '#8b8aa3',
            fontSize: 16,
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            marginBottom: 12,
          }}
        >
          You're invited to
        </p>

        <p
          style={{
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 600,
            fontSize: 34,
            color: '#f5f3ff',
            textAlign: 'center',
            marginBottom: 48,
            maxWidth: 460,
            lineHeight: 1.25,
          }}
        >
          {title}
        </p>

        <div
          style={{
            background: '#ffffff',
            padding: 24,
            borderRadius: 24,
            boxShadow: '0 0 60px 10px rgba(124, 92, 255, 0.35)',
            marginBottom: 40,
          }}
        >
          <QRCodeSVG value={joinUrl} size={280} bgColor="#ffffff" fgColor="#0b0b14" level="M" />
        </div>

        <p
          style={{
            color: '#8b8aa3',
            fontSize: 14,
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            marginBottom: 14,
          }}
        >
          Or enter code
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          {joinCode.split('').map((digit, i) => (
            <div
              key={i}
              style={{
                width: 52,
                height: 66,
                borderRadius: 12,
                border: '1px solid #26263a',
                background: 'rgba(11, 11, 20, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: '"JetBrains Mono", monospace',
                fontWeight: 700,
                fontSize: 30,
                color: '#f5f3ff',
              }}
            >
              {digit}
            </div>
          ))}
        </div>

        <p style={{ color: '#8b8aa3', fontSize: 13, marginTop: 56 }}>at pulseboard.app/join</p>
      </div>
    );
  }
);

ShareSessionCard.displayName = 'ShareSessionCard';
