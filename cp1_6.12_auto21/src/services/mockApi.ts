import Mock from 'mockjs';
import type { ResumeData } from '../types';

Mock.setup({
  timeout: '200-500',
});

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const saveResume = async (data: ResumeData): Promise<{ success: boolean; id: string }> => {
  await delay(1500);
  return {
    success: true,
    id: Mock.Random.guid(),
  };
};

export const exportResume = async (data: ResumeData): Promise<{ success: boolean; message: string }> => {
  await delay(1500);
  return {
    success: true,
    message: 'PDF导出成功',
  };
};

export const getResumeTemplate = async (): Promise<ResumeData> => {
  await delay(300);
  return {
    personalInfo: {
      name: '',
      email: '',
      phone: '',
      address: '',
    },
    workExperiences: [],
    educations: [],
    skills: [],
  };
};
