import employeesData from '../data/employees.json';
import { AuthCredentials, Employee } from '../types/employee';

class AuthService {
  private currentEmployee: Employee | null = null;

  constructor() {
    const defaultEmp = employeesData.employees.find(
      (e) => e.id === employeesData.currentEmployeeId
    );
    if (defaultEmp) {
      this.currentEmployee = defaultEmp as Employee;
    }
  }

  async login(credentials: AuthCredentials): Promise<{ success: boolean; employee?: Employee; error?: string }> {
    // Artificial latency for realistic UI state
    await new Promise((resolve) => setTimeout(resolve, 600));

    const trimmedInput = credentials.employeeIdOrEmail.trim().toLowerCase();
    const cred = employeesData.demoCredentials.find(
      (c) => c.identifier.toLowerCase() === trimmedInput && c.password === credentials.password
    );

    if (!cred) {
      return {
        success: false,
        error: 'Invalid Employee ID/Email or Password. Please check your credentials.',
      };
    }

    const employee = employeesData.employees.find((e) => e.id === cred.employeeId);
    if (!employee) {
      return { success: false, error: 'Employee account profile not found.' };
    }

    this.currentEmployee = employee as Employee;
    return { success: true, employee: this.currentEmployee };
  }

  async logout(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    this.currentEmployee = null;
  }

  getCurrentEmployee(): Employee | null {
    return this.currentEmployee;
  }
}

export const authService = new AuthService();

