export type BlockType = 'text' | 'image' | 'caption';

export interface BaseBlock {
  id: string;
  type: BlockType;
}

export interface TextBlock extends BaseBlock {
  type: 'text';
  content: string;
  isChapter: boolean;
}

export interface ImageBlock extends BaseBlock {
  type: 'image';
  src: string;
  alt: string;
}

export interface CaptionBlock extends BaseBlock {
  type: 'caption';
  content: string;
}

export type ContentBlock = TextBlock | ImageBlock | CaptionBlock;

export interface ArticleData {
  title: string;
  blocks: ContentBlock[];
}
