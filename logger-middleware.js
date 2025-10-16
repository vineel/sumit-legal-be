module.exports = function (req, res, next) {
  const now = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  console.log(`${now}  ${ip}  ${req.method} ${req.originalUrl}  UA="${req.get('user-agent')}"`);
  next();
}
