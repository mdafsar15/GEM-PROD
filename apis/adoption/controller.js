const service = require('./service');

async function processAdoption(req, res) {
  const { cow_id } = req.query;
  
  if (!cow_id) {
    return res.status(400).json({
      error: "Missing parameter",
      message: "cow_id is required",
      example: "http://165.22.213.239/adoption/process?cow_id=d9e5b8f0-6342-4e53-98d7-6a3273e4abf8"
    });
  }

  const result = await service.processAdoption(cow_id);
  res.status(result.status).json(result);
}

module.exports = {
  processAdoption
};