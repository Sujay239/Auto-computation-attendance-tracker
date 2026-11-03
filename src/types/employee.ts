export type UserRole = 'EMPLOYEE' | 'ADMIN';

export interface Employee {
  id: string; // "EMP-024"
  firstName: string;
  lastName: string;
  email: string; // Work email
  phone: string;
  avatarUrl?: string;
  salary?: number;
  designation: string;
  joiningDate: string; // "YYYY-MM-DD"
  employmentType: 'Full-time' | 'Contract' | 'Part-time';
  workLocation: string; // "Salt Lake Sector V, Kolkata (In-Office)"
  role?: UserRole;
  department?: string;
  reportingManager?: string;
  bloodGroup?: string;
  emergencyContact?: {
    name: string;
    relation: string;
    phone: string;
  };
}

export interface AuthCredentials {
  employeeIdOrEmail: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthUser {
  employee: Employee;
  token: string;
}

