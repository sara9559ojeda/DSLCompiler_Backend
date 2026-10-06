import { randomUUID } from "node:crypto";
import type { IProjectRepository } from "../../src/repositories/IProjectRepository.js";
import type { NewProject, Project, ProjectUpdate } from "../../src/domain/Project.js";

export class InMemoryProjectRepository implements IProjectRepository {
  private readonly projectsById = new Map<string, Project>();

  async listByOwner(ownerId: string): Promise<Project[]> {
    return [...this.projectsById.values()].filter((project) => project.ownerId === ownerId);
  }

  async findById(id: string): Promise<Project | null> {
    return this.projectsById.get(id) ?? null;
  }

  async create(input: NewProject): Promise<Project> {
    const now = new Date();
    const project: Project = { id: randomUUID(), ...input, createdAt: now, updatedAt: now };
    this.projectsById.set(project.id, project);
    return project;
  }

  async update(id: string, input: ProjectUpdate): Promise<Project | null> {
    const existing = this.projectsById.get(id);
    if (!existing) return null;
    const updated: Project = { ...existing, ...input, updatedAt: new Date() };
    this.projectsById.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.projectsById.delete(id);
  }
}
