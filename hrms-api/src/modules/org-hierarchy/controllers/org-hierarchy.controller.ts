import type { NextFunction, Request, Response } from "express";
import {
  createDepartmentSchema,
  createDesignationSchema,
  createLevelSchema,
  createStructureSchema,
  createSubDepartmentSchema,
  idParamSchema,
  listQuerySchema,
  updateDepartmentSchema,
  updateDesignationSchema,
  updateLevelSchema,
  updateStructureSchema,
  updateSubDepartmentSchema,
} from "@/modules/org-hierarchy/schemas/org-hierarchy.schema";
import * as orgHierarchy from "@/modules/org-hierarchy/services/org-hierarchy.service";

function parseListQuery(req: Request) {
  return listQuerySchema.parse(req.query);
}

export async function listDepartments(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const q = parseListQuery(req);
    const data = await orgHierarchy.listDepartments(q);
    res.json({ data });
  } catch (e) {
    next(e);
  }
}

export async function getDepartment(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = idParamSchema.parse(req.params);
    const data = await orgHierarchy.getDepartment(id);
    res.json({ data });
  } catch (e) {
    next(e);
  }
}

export async function createDepartment(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const body = createDepartmentSchema.parse(req.body ?? {});
    const data = await orgHierarchy.createDepartment(body);
    res.status(201).json({ data });
  } catch (e) {
    next(e);
  }
}

export async function updateDepartment(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = idParamSchema.parse(req.params);
    const body = updateDepartmentSchema.parse(req.body ?? {});
    const data = await orgHierarchy.updateDepartment(id, body);
    res.json({ data });
  } catch (e) {
    next(e);
  }
}

export async function deleteDepartment(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = idParamSchema.parse(req.params);
    await orgHierarchy.deleteDepartment(id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function listSubDepartments(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const q = parseListQuery(req);
    const data = await orgHierarchy.listSubDepartments(q);
    res.json({ data });
  } catch (e) {
    next(e);
  }
}

export async function getSubDepartment(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = idParamSchema.parse(req.params);
    const data = await orgHierarchy.getSubDepartment(id);
    res.json({ data });
  } catch (e) {
    next(e);
  }
}

export async function createSubDepartment(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const body = createSubDepartmentSchema.parse(req.body ?? {});
    const data = await orgHierarchy.createSubDepartment(body);
    res.status(201).json({ data });
  } catch (e) {
    next(e);
  }
}

export async function updateSubDepartment(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = idParamSchema.parse(req.params);
    const body = updateSubDepartmentSchema.parse(req.body ?? {});
    const data = await orgHierarchy.updateSubDepartment(id, body);
    res.json({ data });
  } catch (e) {
    next(e);
  }
}

export async function deleteSubDepartment(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = idParamSchema.parse(req.params);
    await orgHierarchy.deleteSubDepartment(id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function listLevels(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const q = parseListQuery(req);
    const data = await orgHierarchy.listLevels(q);
    res.json({ data });
  } catch (e) {
    next(e);
  }
}

export async function getLevel(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = idParamSchema.parse(req.params);
    const data = await orgHierarchy.getLevel(id);
    res.json({ data });
  } catch (e) {
    next(e);
  }
}

export async function createLevel(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const body = createLevelSchema.parse(req.body ?? {});
    const data = await orgHierarchy.createLevel(body);
    res.status(201).json({ data });
  } catch (e) {
    next(e);
  }
}

export async function updateLevel(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = idParamSchema.parse(req.params);
    const body = updateLevelSchema.parse(req.body ?? {});
    const data = await orgHierarchy.updateLevel(id, body);
    res.json({ data });
  } catch (e) {
    next(e);
  }
}

export async function deleteLevel(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = idParamSchema.parse(req.params);
    await orgHierarchy.deleteLevel(id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function listDesignations(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const q = parseListQuery(req);
    const data = await orgHierarchy.listDesignations(q);
    res.json({ data });
  } catch (e) {
    next(e);
  }
}

export async function getDesignation(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = idParamSchema.parse(req.params);
    const data = await orgHierarchy.getDesignation(id);
    res.json({ data });
  } catch (e) {
    next(e);
  }
}

export async function createDesignation(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const body = createDesignationSchema.parse(req.body ?? {});
    const data = await orgHierarchy.createDesignation(body);
    res.status(201).json({ data });
  } catch (e) {
    next(e);
  }
}

export async function updateDesignation(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = idParamSchema.parse(req.params);
    const body = updateDesignationSchema.parse(req.body ?? {});
    const data = await orgHierarchy.updateDesignation(id, body);
    res.json({ data });
  } catch (e) {
    next(e);
  }
}

export async function deleteDesignation(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = idParamSchema.parse(req.params);
    await orgHierarchy.deleteDesignation(id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function listStructure(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const q = parseListQuery(req);
    const data = await orgHierarchy.listStructure(q);
    res.json({ data });
  } catch (e) {
    next(e);
  }
}

export async function getStructure(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = idParamSchema.parse(req.params);
    const data = await orgHierarchy.getStructure(id);
    res.json({ data });
  } catch (e) {
    next(e);
  }
}

export async function createStructure(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const body = createStructureSchema.parse(req.body ?? {});
    const data = await orgHierarchy.createStructure(body);
    res.status(201).json({ data });
  } catch (e) {
    next(e);
  }
}

export async function updateStructure(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = idParamSchema.parse(req.params);
    const body = updateStructureSchema.parse(req.body ?? {});
    const data = await orgHierarchy.updateStructure(id, body);
    res.json({ data });
  } catch (e) {
    next(e);
  }
}

export async function deleteStructure(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = idParamSchema.parse(req.params);
    await orgHierarchy.deleteStructure(id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function getHierarchyTree(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await orgHierarchy.getHierarchyTree();
    res.json({ data });
  } catch (e) {
    next(e);
  }
}

export async function getEmployeeReportingTree(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await orgHierarchy.getEmployeeReportingTree();
    res.json({ data });
  } catch (e) {
    next(e);
  }
}
