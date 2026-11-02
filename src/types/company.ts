export interface CompanyInfo {
  name: string;
  tagline: string;
  address: string;
  contactEmail: string;
  supportPhone: string;
  officialWhatsappGroupNote: string;
  cookingDay: {
    enabled: boolean;
    dayOfWeek: string;
    description: string;
    selectedEmployees: string[];
  };
}

export type HolidayType = 'NATIONAL' | 'FESTIVAL' | 'PUBLIC' | 'OPTIONAL';

export interface HolidayItem {
  id: string;
  name: string;
  date: string; // "YYYY-MM-DD"
  day: string; // "Monday"
  type: HolidayType | string;
  description?: string;
  isOfficeClosed?: boolean;
}

