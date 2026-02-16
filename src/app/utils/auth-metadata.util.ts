type AuthLikeResponse = {
  data?: any;
  token?: string | null;
  mfa_token?: string | null;
  mfaToken?: string | null;
  mfaEnabled?: boolean | string | number;
  passwordExpired?: boolean | string;
  daysUntilPasswordExpiry?: number | string | null;
  technicianId?: string | number | null;
};

type Metadata = {
  token: string | null;
  mfaToken: string | null;
  mfaEnabled: boolean;
  passwordExpired: boolean | null;
  daysUntilPasswordExpiry: number | null;
  technicianId: string | number | null;
};

function toBoolean(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return Boolean(value);
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function extractAuthMetadata(payload: unknown): Metadata {
  const source = (payload ?? {}) as AuthLikeResponse;
  const data = (source.data ?? {}) as AuthLikeResponse;
  const user = ((data as any)?.user ?? (source as any)?.user ?? {}) as Record<string, unknown>;

  const token =
    typeof data.token === 'string'
      ? data.token
      : typeof source.token === 'string'
        ? source.token
        : null;

  const mfaTokenCandidate =
    data?.mfa_token ??
    (data as any)?.mfaToken ??
    source.mfa_token ??
    (source as any)?.mfaToken ??
    null;
  const mfaToken = typeof mfaTokenCandidate === 'string' ? mfaTokenCandidate : null;

  const sourceRecord = source as Record<string, unknown>;
  const dataRecord = data as Record<string, unknown>;
  const userRecord = user as Record<string, unknown>;
  const nestedUser = (sourceRecord['data'] as Record<string, unknown> | undefined)?.[
    'user'
  ] as Record<string, unknown> | undefined;

  const mfaEnabledRaw =
    dataRecord['mfaEnabled'] ??
    userRecord['mfaEnabled'] ??
    sourceRecord['mfaEnabled'] ??
    nestedUser?.['mfaEnabled'];
  const passwordExpiredRaw =
    dataRecord['passwordExpired'] ?? userRecord['passwordExpired'] ?? sourceRecord['passwordExpired'] ?? null;
  const daysRaw =
    dataRecord['daysUntilPasswordExpiry'] ??
    userRecord['daysUntilPasswordExpiry'] ??
    sourceRecord['daysUntilPasswordExpiry'] ??
    null;
  const technicianId =
    (userRecord['technicianId'] as string | number | null | undefined) ??
    (dataRecord['technicianId'] as string | number | null | undefined) ??
    (sourceRecord['technicianId'] as string | number | null | undefined) ??
    null;

  return {
    token,
    mfaToken,
    mfaEnabled: toBoolean(mfaEnabledRaw),
    passwordExpired:
      passwordExpiredRaw === null || passwordExpiredRaw === undefined
        ? null
        : toBoolean(passwordExpiredRaw),
    daysUntilPasswordExpiry: toNumber(daysRaw),
    technicianId: technicianId ?? null,
  };
}

export function storeAuthToken(token: string | null | undefined) {
  if (typeof localStorage === 'undefined') {
    return;
  }
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
}

export function storePasswordMetadata(passwordExpired: boolean | null, daysUntil: number | null) {
  if (typeof localStorage === 'undefined') {
    return;
  }
  if (passwordExpired !== null && passwordExpired !== undefined) {
    localStorage.setItem('passwordExpired', String(!!passwordExpired));
  } else {
    localStorage.removeItem('passwordExpired');
  }

  if (daysUntil !== null && daysUntil !== undefined) {
    localStorage.setItem('daysUntilPasswordExpiry', String(daysUntil));
  } else {
    localStorage.removeItem('daysUntilPasswordExpiry');
  }
}

export function storeMfaState(mfaEnabled: boolean, mfaToken: string | null) {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.setItem('mfaEnabled', mfaEnabled ? 'true' : 'false');

  if (mfaToken) {
    localStorage.setItem('mfa_token', mfaToken);
  } else {
    localStorage.removeItem('mfa_token');
  }
}

export function storeTechnicianId(value: string | number | null | undefined) {
  if (typeof localStorage === 'undefined') {
    return;
  }

  if (value === null || value === undefined || value === '') {
    localStorage.removeItem('technicianId');
    return;
  }

  localStorage.setItem('technicianId', String(value));
}

export function storeLoginEmail(email: string | null | undefined) {
  if (typeof localStorage === 'undefined') {
    return;
  }
  if (email) {
    localStorage.setItem('loginEmail', email);
  } else {
    localStorage.removeItem('loginEmail');
  }
}
