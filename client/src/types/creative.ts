export type CollectionType = 
  | 'Ad prompts'
  | 'Product demos'
  | 'Motion & video'
  | 'Reels & shorts'
  | 'Launch teasers'
  | 'Voice & audio'
  | 'Thumbnails'
  | 'Campaign assets';

export type MediaType = 'video' | 'image';

export interface PromptVariant {
  id: string;
  name: string;
  prompt: string;
  useCase?: string;
  worksWith?: string;
  previewImage?: string;
}

export interface RelatedPrompt {
  id: string;
  title: string;
  image: string;
  count: number;
}

export interface PromptPack {
  id: string;
  title: string;
  tagline: string;
  kicker: string;
  collection: CollectionType;
  mediaType: MediaType;
  itemCount: number;
  image: string;
  previewImage: string;
  variants: PromptVariant[];
  useCase: string;
  worksWith: string;
  relatedPrompts: RelatedPrompt[];
  isLiked?: boolean;
}
