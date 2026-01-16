export interface ArCodeEntity {
  id: number;
  codeType: string | null;
  code: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  active: boolean;
  glMappingStatus?: string;
}

export interface CreateArCodePayload {
  code: string;
  name: string;
  description: string;
  codeType?: string;
  active?: boolean;
}

export interface ArGlMappingPayload {
  arCodeId: number;
  debitGlCodeId: number;
  creditGlCodeId: number;
}

export interface ArGlMappingEntity {
  id: number;
  arCode?: { id: number } | null;
  debitGlCode?: { id: number } | null;
  creditGlCode?: { id: number } | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  createdAt?: string | null;
  active?: boolean | null;
}

export interface ArCodeApiResponse<T> {
  statusCode: number;
  status: string;
  message: string;
  data: T;
}

export type CreateArCodeResponse = ArCodeApiResponse<ArCodeEntity>;
export type ArCodeListResponse = ArCodeApiResponse<ArCodeEntity[]>;
export type DeleteArCodeResponse = ArCodeApiResponse<null>;
export type UpdateArCodePayload = Partial<CreateArCodePayload>;
export type UpdateArCodeResponse = ArCodeApiResponse<ArCodeEntity>;
export type ToggleArCodeResponse = UpdateArCodeResponse;
export type ArGlMappingResponse = ArCodeApiResponse<ArGlMappingEntity | ArGlMappingEntity[]>;
