export interface User {
  email: string;
}

export interface Tenant {
  id: number;
  name: string;
  email: string;
  unit: string;
  phone: string;
  status: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  message?: string;
}

// Used in the form where id is optional (for "new" tenants)
export type TenantFormValues = Omit<Tenant, "id"> & { id?: number };
