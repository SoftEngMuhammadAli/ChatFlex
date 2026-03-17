import { ZodError } from "zod";

const formatZodIssues = (issues = []) =>
  issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));

export const validateBody = (schema) => (req, res, next) => {
  try {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid request body",
        issues: formatZodIssues(parsed.error.issues),
      });
    }
    req.body = parsed.data;
    return next();
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: "Invalid request body",
        issues: formatZodIssues(error.issues),
      });
    }
    return next(error);
  }
};

