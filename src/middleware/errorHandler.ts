import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  statusCode?: number;
  status?: string;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode && statusCode >= 400 && statusCode < 500 ? "error" : "error";
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = (err as AppError).statusCode || 500;
  const status = (err as AppError).status || "error";

  console.error("Error:", {
    message: err.message,
    stack: err.stack,
    statusCode,
    path: req.path,
    method: req.method,
  });

  // Убеждаемся, что ответ еще не был отправлен
  if (!res.headersSent) {
    res.status(statusCode).json({
      status,
      message: err.message || "Internal server error",
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  }
};



