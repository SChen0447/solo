import { Template, TemplateType } from '../types';

export const templates: Record<TemplateType, Template> = {
  classic: {
    id: 'classic',
    name: '经典蓝白',
    primaryColor: '#2563eb',
    secondaryColor: '#dbeafe',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    accentColor: '#1d4ed8',
  },
  minimal: {
    id: 'minimal',
    name: '简约灰绿',
    primaryColor: '#059669',
    secondaryColor: '#d1fae5',
    backgroundColor: '#fafafa',
    textColor: '#374151',
    accentColor: '#047857',
  },
  warm: {
    id: 'warm',
    name: '暖色橙黄',
    primaryColor: '#ea580c',
    secondaryColor: '#ffedd5',
    backgroundColor: '#fffbeb',
    textColor: '#451a03',
    accentColor: '#c2410c',
  },
};
