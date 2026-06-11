export interface BasicInfo {
  name: string;
  email: string;
  phone: string;
  summary: string;
}

export interface WorkExperience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  major: string;
  graduationDate: string;
}

export interface Skill {
  id: string;
  name: string;
  level: number;
}

export type SectionType = 'basic' | 'work' | 'education' | 'skills';

export interface Section {
  id: SectionType;
  title: string;
  order: number;
}

export type TemplateType = 'classic' | 'minimal' | 'warm';

export interface Template {
  id: TemplateType;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
}

export interface ResumeData {
  basicInfo: BasicInfo;
  workExperiences: WorkExperience[];
  educations: Education[];
  skills: Skill[];
  sections: Section[];
  template: TemplateType;
  scale: number;
}
