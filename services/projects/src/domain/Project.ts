export interface Project {
  readonly id: string;
  readonly name: string;
  readonly dslSource: string;
  readonly ownerId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface NewProject {
  readonly name: string;
  readonly dslSource: string;
  readonly ownerId: string;
}

export interface ProjectUpdate {
  readonly name?: string;
  readonly dslSource?: string;
}
