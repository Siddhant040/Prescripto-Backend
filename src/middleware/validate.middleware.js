export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    const message =
      error?.issues?.[0]?.message || error?.errors?.[0]?.message || error?.message || "Validation failed";
    return res.status(400).json({
      success: false,
      message,
    });
  }
};