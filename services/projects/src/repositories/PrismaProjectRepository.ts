import type { PrismaClient } from "@prisma/client";
import type { IProjectRepository } from "./IProjectRepository.js";
import type { NewProject, Project, ProjectUpdate } from "../domain/Project.js";

export class PrismaProjectRepository implements IProjectRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listByOwner(ownerId: string): Promise<Project[]> {
    return this.prisma.project.findMany({ where: { ownerId }, orderBy: { updatedAt: "desc" } });
  }

  async findById(id: string): Promise<Project | null> {
    return this.prisma.project.findUnique({ where: { id } });
  }

  async create(input: NewProject): Promise<Project> {
    return this.prisma.project.create({ data: input });
  }

  async update(id: string, input: ProjectUpdate): Promise<Project | null> {
    try {
      return await this.prisma.project.update({ where: { id }, data: input });
    } catch {
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.project.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
}
