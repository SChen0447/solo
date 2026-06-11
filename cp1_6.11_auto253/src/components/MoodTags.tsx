import { motion } from 'framer-motion';
import type { MoodTag } from '@/types';

interface MoodTagsProps {
  tags: MoodTag[];
}

export default function MoodTags({ tags }: MoodTagsProps) {
  if (tags.length === 0) return null;

  return (
    <div className="mood-tags">
      {tags.map((tag, index) => (
        <motion.div
          key={tag.label}
          className="mood-tag-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.15 }}
          whileHover={{ y: -4, scale: 1.02 }}
          title={tag.description}
        >
          <div className="mood-tag-label">{tag.label}</div>
          <div className="mood-tag-desc">{tag.description}</div>
        </motion.div>
      ))}
    </div>
  );
}
