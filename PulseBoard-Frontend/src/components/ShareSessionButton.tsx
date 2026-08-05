import { useRef, useState } from 'react';
import { toBlob } from 'html-to-image';
import { motion } from 'framer-motion';
import { ShareSessionCard } from './ShareSessionCard';

interface ShareSessionButtonProps {
  title: string;
  joinCode: string;
}

/**
 * Renders the exportable card off-screen (not display:none — html-to-image
 * needs it laid out to measure/snapshot it) and turns it into a PNG on
 * click. Uses navigator.share with a file where supported (most mobile
 * browsers) so it goes straight to WhatsApp/Messages/etc.'s share sheet;
 * falls back to a plain download on browsers that don't support sharing
 * files (most desktop browsers today).
 */
export function ShareSessionButton({ title, joinCode }: ShareSessionButtonProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const joinUrl = `${window.location.origin}/join?code=${joinCode}`;

  async function handleShare() {
    if (!cardRef.current || isSharing) return;
    setIsSharing(true);
    setFeedback(null);

    try {
      const blob = await toBlob(cardRef.current, { pixelRatio: 2 });
      if (!blob) throw new Error('Could not generate image');

      const file = new File([blob], `pulseboard-${joinCode}.png`, { type: 'image/png' });

      const canShareFiles =
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] });

      if (canShareFiles) {
        await navigator.share({
          files: [file],
          title: `Join "${title}" on PulseBoard`,
          text: `Join code: ${joinCode}`,
        });
      } else {
        // Desktop fallback — most desktop browsers can't share files yet,
        // so just download the image for the host to share manually.
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pulseboard-${joinCode}.png`;
        link.click();
        URL.revokeObjectURL(url);
        setFeedback('Image downloaded — share it however you like.');
      }
    } catch (err) {
      // AbortError fires when the user just cancels the native share sheet — not a real error.
      if (err instanceof Error && err.name !== 'AbortError') {
        setFeedback("Couldn't generate the share image. Try again.");
      }
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <div className="flex flex-col items-center">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleShare}
        disabled={isSharing}
        className="focus-ring inline-flex items-center gap-1.5 text-xs text-pulse-violet hover:text-pulse-magenta font-medium transition-colors disabled:opacity-50"
      >
        <ShareIcon />
        {isSharing ? 'Preparing image...' : 'Share as image'}
      </motion.button>

      {feedback && <p className="text-xs text-muted mt-2">{feedback}</p>}

      {/* Off-screen — not display:none, since html-to-image needs real layout to snapshot */}
      <div style={{ position: 'fixed', top: 0, left: -9999, pointerEvents: 'none' }}>
        <ShareSessionCard ref={cardRef} title={title} joinCode={joinCode} joinUrl={joinUrl} />
      </div>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="16 6 12 2 8 6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="2" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
