export type SocialMediaType = 'instagram' | 'facebook' | 'linkedin' | 'twitter';

export interface SocialMediaTemplate {
  id: string;
  name: string;
  type: SocialMediaType;
  previewUrl: string;
  description: string;
}

export interface SocialMediaSimulationState {
  step: 'selection' | 'logo-modal' | 'generating' | 'result';
  selectedTemplateId: string | null;
  useDefaultLogo: boolean;
}
