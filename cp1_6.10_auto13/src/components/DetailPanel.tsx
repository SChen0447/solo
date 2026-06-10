import { motion, AnimatePresence } from 'framer-motion';
import { Project } from '../types';

interface DetailPanelProps {
  project: Project | null;
  liked: boolean;
  likeCount: number;
  onClose: () => void;
  onLike: (projectId: number) => void;
}

export const DetailPanel = ({
  project,
  liked,
  likeCount,
  onClose,
  onLike,
}: DetailPanelProps) => {
  const handleLike = () => {
    if (project) {
      onLike(project.id);
    }
  };

  return (
    <AnimatePresence>
      {project && (
        <motion.aside
          className="detail-panel"
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <motion.button
            className="panel-close"
            onClick={onClose}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            ✕
          </motion.button>

          <motion.div
            className="panel-image"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <img src={project.imageUrl} alt={project.title} loading="lazy" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <span className="panel-date">{project.date}</span>
          </motion.div>

          <motion.div
            className="panel-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
          >
            <span className="panel-icon">{project.icon}</span>
            {project.title}
          </motion.div>

          <motion.p
            className="panel-description"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            {project.description}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
          >
            <div className="panel-section-title">技术栈</div>
            <div className="tech-tags">
              {project.techStack.map((tech, index) => (
                <motion.span
                  key={tech}
                  className="tech-tag"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + index * 0.05, duration: 0.3 }}
                >
                  {tech}
                </motion.span>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="panel-like-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <motion.button
              className="like-button"
              onClick={handleLike}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              animate={liked ? { scale: [1, 1.3, 1] } : {}}
              transition={liked ? { type: 'spring', stiffness: 500, damping: 15 } : {}}
              style={{
                filter: liked ? 'drop-shadow(0 0 10px rgba(255, 80, 80, 0.6))' : 'none',
              }}
            >
              {liked ? '❤️' : '🤍'}
            </motion.button>
            <span className="like-count">
              {likeCount > 0 ? `${likeCount} 人点赞` : '为这个项目点赞'}
            </span>
          </motion.div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
