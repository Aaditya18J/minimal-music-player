import { type PlayHistory, type InsertPlayHistory } from "@shared/schema";

export interface IStorage {
  getHistory(): Promise<PlayHistory[]>;
  addHistory(history: InsertPlayHistory): Promise<PlayHistory>;
}

export class MemStorage implements IStorage {
  private history: Map<number, PlayHistory>;
  private currentId: number;

  constructor() {
    this.history = new Map();
    this.currentId = 1;
  }

  async getHistory(): Promise<PlayHistory[]> {
    return Array.from(this.history.values()).sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime());
  }

  async addHistory(insertHistory: InsertPlayHistory): Promise<PlayHistory> {
    const id = this.currentId++;
    const item: PlayHistory = { ...insertHistory, id, playedAt: new Date() };
    this.history.set(id, item);
    return item;
  }
}

export const storage = new MemStorage();
