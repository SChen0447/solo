import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  ResumeData,
  BasicInfo,
  WorkExperience,
  Education,
  Skill,
  SectionType,
  TemplateType,
  Section,
} from '../types';

const defaultSections: Section[] = [
  { id: 'basic', title: '基本信息', order: 0 },
  { id: 'work', title: '工作经历', order: 1 },
  { id: 'education', title: '教育背景', order: 2 },
  { id: 'skills', title: '技能', order: 3 },
];

const initialData: ResumeData = {
  basicInfo: {
    name: '张三',
    email: 'zhangsan@example.com',
    phone: '138-0000-0000',
    summary: '拥有5年前端开发经验，熟悉React、Vue等主流框架，热爱技术，善于沟通和团队协作。',
  },
  workExperiences: [
    {
      id: 'work-1',
      company: '某科技有限公司',
      position: '高级前端工程师',
      startDate: '2021-03',
      endDate: '至今',
      description: '负责公司核心产品的前端架构设计和开发，主导多个大型项目的前端技术选型和落地，带领5人团队完成项目交付。',
    },
    {
      id: 'work-2',
      company: '某互联网公司',
      position: '前端开发工程师',
      startDate: '2018-07',
      endDate: '2021-02',
      description: '参与电商平台的前端开发工作，负责商品详情页、购物车、订单等模块的开发和优化。',
    },
  ],
  educations: [
    {
      id: 'edu-1',
      school: '某某大学',
      degree: '本科',
      major: '计算机科学与技术',
      graduationDate: '2018-06',
    },
  ],
  skills: [
    { id: 'skill-1', name: 'React', level: 90 },
    { id: 'skill-2', name: 'TypeScript', level: 85 },
    { id: 'skill-3', name: 'Vue', level: 80 },
    { id: 'skill-4', name: 'Node.js', level: 75 },
  ],
  sections: defaultSections,
  template: 'classic',
  scale: 1,
};

interface ResumeContextType {
  data: ResumeData;
  updateBasicInfo: (info: Partial<BasicInfo>) => void;
  addWorkExperience: () => void;
  updateWorkExperience: (id: string, exp: Partial<WorkExperience>) => void;
  removeWorkExperience: (id: string) => void;
  addEducation: () => void;
  updateEducation: (id: string, edu: Partial<Education>) => void;
  removeEducation: (id: string) => void;
  addSkill: () => void;
  updateSkill: (id: string, skill: Partial<Skill>) => void;
  removeSkill: (id: string) => void;
  reorderSections: (sections: Section[]) => void;
  setTemplate: (template: TemplateType) => void;
  setScale: (scale: number) => void;
}

const ResumeContext = createContext<ResumeContextType | undefined>(undefined);

export function ResumeProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ResumeData>(initialData);

  const updateBasicInfo = useCallback((info: Partial<BasicInfo>) => {
    setData((prev) => ({
      ...prev,
      basicInfo: { ...prev.basicInfo, ...info },
    }));
  }, []);

  const addWorkExperience = useCallback(() => {
    const newExp: WorkExperience = {
      id: `work-${Date.now()}`,
      company: '',
      position: '',
      startDate: '',
      endDate: '',
      description: '',
    };
    setData((prev) => ({
      ...prev,
      workExperiences: [...prev.workExperiences, newExp],
    }));
  }, []);

  const updateWorkExperience = useCallback((id: string, exp: Partial<WorkExperience>) => {
    setData((prev) => ({
      ...prev,
      workExperiences: prev.workExperiences.map((item) =>
        item.id === id ? { ...item, ...exp } : item
      ),
    }));
  }, []);

  const removeWorkExperience = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      workExperiences: prev.workExperiences.filter((item) => item.id !== id),
    }));
  }, []);

  const addEducation = useCallback(() => {
    const newEdu: Education = {
      id: `edu-${Date.now()}`,
      school: '',
      degree: '',
      major: '',
      graduationDate: '',
    };
    setData((prev) => ({
      ...prev,
      educations: [...prev.educations, newEdu],
    }));
  }, []);

  const updateEducation = useCallback((id: string, edu: Partial<Education>) => {
    setData((prev) => ({
      ...prev,
      educations: prev.educations.map((item) =>
        item.id === id ? { ...item, ...edu } : item
      ),
    }));
  }, []);

  const removeEducation = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      educations: prev.educations.filter((item) => item.id !== id),
    }));
  }, []);

  const addSkill = useCallback(() => {
    const newSkill: Skill = {
      id: `skill-${Date.now()}`,
      name: '',
      level: 50,
    };
    setData((prev) => ({
      ...prev,
      skills: [...prev.skills, newSkill],
    }));
  }, []);

  const updateSkill = useCallback((id: string, skill: Partial<Skill>) => {
    setData((prev) => ({
      ...prev,
      skills: prev.skills.map((item) =>
        item.id === id ? { ...item, ...skill } : item
      ),
    }));
  }, []);

  const removeSkill = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      skills: prev.skills.filter((item) => item.id !== id),
    }));
  }, []);

  const reorderSections = useCallback((sections: Section[]) => {
    setData((prev) => ({
      ...prev,
      sections: sections.map((s, i) => ({ ...s, order: i })),
    }));
  }, []);

  const setTemplate = useCallback((template: TemplateType) => {
    setData((prev) => ({ ...prev, template }));
  }, []);

  const setScale = useCallback((scale: number) => {
    setData((prev) => ({ ...prev, scale }));
  }, []);

  return (
    <ResumeContext.Provider
      value={{
        data,
        updateBasicInfo,
        addWorkExperience,
        updateWorkExperience,
        removeWorkExperience,
        addEducation,
        updateEducation,
        removeEducation,
        addSkill,
        updateSkill,
        removeSkill,
        reorderSections,
        setTemplate,
        setScale,
      }}
    >
      {children}
    </ResumeContext.Provider>
  );
}

export function useResume() {
  const context = useContext(ResumeContext);
  if (context === undefined) {
    throw new Error('useResume must be used within a ResumeProvider');
  }
  return context;
}
