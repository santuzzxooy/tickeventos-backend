const paqueteSchema = require('../validators/paqueteValidator');

module.exports = (req, res, next) => {
  const { error } = paqueteSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};