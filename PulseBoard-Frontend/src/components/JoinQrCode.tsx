import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';
import { useState } from 'react';

/**
 * Encodes a direct link to /join?code=XXXXXX so scanning skips typing the
 * 6-digit code entirely. Rendered in a white card — QR scanners need real
 * contrast, so this deliberately breaks from the dark theme here.
 */
export function JoinQrCode({ joinCode }: { joinCode: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const joinUrl = `${window.location.origin}/join?code=${joinCode}`;

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="focus-ring text-xs text-pulse-violet hover:text-pulse-magenta font-medium transition-colors mb-3"
      >
        {isOpen ? 'Hide QR code' : 'Show QR code to scan'}
      </button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, height: 0 }}
          animate={{ opacity: 1, scale: 1, height: 'auto' }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative mb-6"
        >
          <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-pulse-violet to-pulse-magenta opacity-40 blur-lg" />
          <div className="relative bg-white p-4 rounded-2xl">
            <QRCodeSVG value={joinUrl} size={160} bgColor="#ffffff" fgColor="#0b0b14" level="M" />
          </div>
        </motion.div>
      )}
    </div>
  );
}
