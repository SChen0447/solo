export interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
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
  major: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface ResumeData {
  personalInfo: PersonalInfo;
  workExperiences: WorkExperience[];
  educations: Education[];
  skills: string[];
}

export type TemplateType = 'classic' | 'modern' | 'minimal';
