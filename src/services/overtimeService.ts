import overtimeData from '../data/overtime.json';
import { OvertimeRecord, OvertimeSummary } from '../types/overtime';

class OvertimeService {
  private summary: OvertimeSummary;
  private records: OvertimeRecord[] = [];

  constructor() {
    this.summary = { ...(overtimeData.summary as OvertimeSummary) };
    this.records = [...(overtimeData.records as OvertimeRecord[])];
  }

  getSummary(): OvertimeSummary {
    return { ...this.summary };
  }

  getRecords(): OvertimeRecord[] {
    return [...this.records];
  }

  getRecordById(id: string): OvertimeRecord | undefined {
    return this.records.find((r) => r.id === id);
  }
}

export const overtimeService = new OvertimeService();

