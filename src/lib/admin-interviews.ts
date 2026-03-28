export const INTERVIEW_ACCESS_TYPES = ["password", "allowlist"] as const;

export type InterviewAccessType = (typeof INTERVIEW_ACCESS_TYPES)[number];

export type AdminInterviewAccessUser = {
  id: number;
  email: string;
  name: string;
};

export type AdminInterview = {
  id: number;
  title: string;
  startsAt: string;
  endsAt: string;
  talentProfile: string;
  accessType: InterviewAccessType;
  hasPassword: boolean;
  isActive: boolean;
  designatedUsers: AdminInterviewAccessUser[];
  createdAt: string;
  updatedAt: string;
  createdByName: string | null;
};

export type AdminInterviewCreateInput = {
  title: string;
  startsAt: string;
  endsAt: string;
  talentProfile: string;
  accessType: InterviewAccessType;
  accessPassword?: string;
  designatedUserIds?: number[];
};

export type AdminInterviewUpdateInput = Partial<AdminInterviewCreateInput> & {
  id: number;
  isActive?: boolean;
};

export function isInterviewAccessType(value: unknown): value is InterviewAccessType {
  return INTERVIEW_ACCESS_TYPES.includes(value as InterviewAccessType);
}
