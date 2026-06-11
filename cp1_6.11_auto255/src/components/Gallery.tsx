import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GalleryProps {
  isOpen: boolean;
  onClose: () => void;
  thumbnails: string[];
}

const BookIcon: React.FC = () => (
  <svg width="40" height="40" viewBox="0 0 40 40">
    <rect x="5" y="4" width="30" height="32" rx="2" fill="#faf0e6" stroke="#8d6e63" strokeWidth="2" />
    <rect x="8" y="7" width="24" height="26" rx="1" fill="#fff8e1" stroke="#d7ccc8" strokeWidth="1" />
    <line x1="20" y1="7" x2="20" y2="33" stroke="#d7ccc8" strokeWidth="1" />
    <rect x="5" y="4" width="4" height="32" fill="#8d6e63" />
    <line x1="10" y1="12" x2="17" y2="12" stroke="#bcaaa4" strokeWidth="1" />
    <line x1="10" y1="16" x2="17" y2="16" stroke="#bcaaa4" strokeWidth="1" />
    <line x1="10" y1="20" x2="17" y2="20" stroke="#bcaaa4" strokeWidth="1" />
    <line x1="23" y1="12" x2="30" y2="12" stroke="#bcaaa4" strokeWidth="1" />
    <line x1="23" y1="16" x2="30" y2="16" stroke="#bcaaa4" strokeWidth="1" />
    <line x1="23" y1="20" x2="30" y2="20" stroke="#bcaaa4" strokeWidth="1" />
  </svg>
);

interface GalleryButtonProps {
  onClick: () => void;
}

export const GalleryButton: React.FC<GalleryButtonProps> = ({ onClick }) => (
  <motion.div
    className="gallery-btn btn-press"
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    title="作品册"
  >
    <BookIcon />
  </motion.div>
);

const Gallery: React.FC<GalleryProps> = ({ isOpen, onClose, thumbnails }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleFullscreenClose = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedImage(null);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="gallery-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleOverlayClick}
          >
            <motion.div
              className="gallery-content"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                style={{
                  textAlign: 'center',
                  color: '#5d4037',
                  marginBottom: '20px',
                  fontFamily: 'KaiTi, STKaiti, serif',
                  fontSize: '24px',
                }}
              >
                伞面画册
              </h2>

              {thumbnails.length === 0 ? (
                <p
                  style={{
                    textAlign: 'center',
                    color: '#8d6e63',
                    padding: '40px',
                    fontFamily: 'KaiTi, STKaiti, serif',
                  }}
                >
                  暂无作品，快去绘制吧~
                </p>
              ) : (
                <div className="gallery-grid">
                  {thumbnails.map((thumb, index) => (
                    <motion.div
                      key={index}
                      className="gallery-thumb"
                      whileHover={{ scale: 1.1, rotate: 2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedImage(thumb)}
                    >
                      <img
                        src={thumb}
                        alt={`作品 ${index + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </motion.div>
                  ))}
                </div>
              )}

              <motion.button
                className="btn-press"
                style={{
                  display: 'block',
                  margin: '20px auto 0',
                  padding: '8px 24px',
                  background: 'linear-gradient(145deg, #d7ccc8, #a1887f)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: '#5d4037',
                  fontFamily: 'KaiTi, STKaiti, serif',
                  fontSize: '14px',
                }}
                whileHover={{ filter: 'brightness(1.1)' }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
              >
                关闭
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedImage && (
          <motion.div
            className="fullscreen-viewer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleFullscreenClose}
          >
            <motion.img
              src={selectedImage}
              alt="全屏查看"
              className="fullscreen-image"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              transition={{ duration: 0.2 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Gallery;
