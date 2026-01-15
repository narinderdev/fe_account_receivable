export interface GlCodeEntity {
  id: number;
  glCode: string;
  description: string;
  accountType: string;
  createdAt: string;
  updatedAt: string;
  active: boolean;
}

export interface CreateGlCodePayload {
  glCode: string;
  description: string;
  accountType: string;
}

export type UpdateGlCodePayload = Partial<CreateGlCodePayload>;

export interface GlCodeApiResponse<T> {
  statusCode: number;
  status: string;
  message: string;
  data: T;
}

export type GlCodeListResponse = GlCodeApiResponse<GlCodeEntity[]>;
export type CreateGlCodeResponse = GlCodeApiResponse<GlCodeEntity>;
export type UpdateGlCodeResponse = GlCodeApiResponse<GlCodeEntity>;
