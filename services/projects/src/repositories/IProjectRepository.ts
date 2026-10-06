import type { NewProject, Project, ProjectUpdate } from "../domain/Project.js";

export interface IProjectRepository {
  listByOwner(ownerId: string): Promise<Project[]>;
  findById(id: string): Promise<Project | null>;
  create(input: NewProject): Promise<Project>;
  update(id: string, input: ProjectUpdate): Promise<Project | null>;
  delete(id: string): Promise<boolean>;
}
