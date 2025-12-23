import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Branch } from "../entities/Branch";
import { AppError } from "../middleware/errorHandler";

const branchRepository = AppDataSource.getRepository(Branch);

export const getAllBranches = async (req: Request, res: Response) => {
  const branches = await branchRepository.find({
    order: { createdAt: "DESC" },
  });
  // Преобразуем координаты из строк в числа
  const branchesWithNumericCoords = branches.map(branch => ({
    ...branch,
    latitude: branch.latitude ? parseFloat(branch.latitude.toString()) : null,
    longitude: branch.longitude ? parseFloat(branch.longitude.toString()) : null,
  }));
  res.json(branchesWithNumericCoords);
};

export const getBranchById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const branch = await branchRepository.findOne({
    where: { id: parseInt(id) },
  });

  if (!branch) {
    const error = new AppError("Филиал не найден");
    error.statusCode = 404;
    throw error;
  }

  // Преобразуем координаты из строк в числа
  const branchWithNumericCoords = {
    ...branch,
    latitude: branch.latitude ? parseFloat(branch.latitude.toString()) : null,
    longitude: branch.longitude ? parseFloat(branch.longitude.toString()) : null,
  };

  res.json(branchWithNumericCoords);
};

export const createBranch = async (req: Request, res: Response) => {
  const branchData = req.body;
  const branch = branchRepository.create(branchData);
  const savedBranch = await branchRepository.save(branch);
  res.status(201).json(savedBranch);
};

export const updateBranch = async (req: Request, res: Response) => {
  const { id } = req.params;
  const branch = await branchRepository.findOne({
    where: { id: parseInt(id) },
  });

  if (!branch) {
    const error = new AppError("Филиал не найден");
    error.statusCode = 404;
    throw error;
  }

  branchRepository.merge(branch, req.body);
  const updatedBranch = await branchRepository.save(branch);
  res.json(updatedBranch);
};

export const deleteBranch = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await branchRepository.delete(id);

  if (result.affected === 0) {
    const error = new AppError("Филиал не найден");
    error.statusCode = 404;
    throw error;
  }

  res.status(204).send();
};



