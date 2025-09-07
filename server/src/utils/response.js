// Utility function for consistent API responses
const apiResponse = (res, success, data = null, message = "", status = 200) => {
  return res.status(status).json({
    success,
    data,
    message
  });
};

module.exports = {
  apiResponse
};
