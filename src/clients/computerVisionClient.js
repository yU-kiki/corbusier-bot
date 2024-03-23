require("dotenv").config();
const ComputerVisionClient = require("@azure/cognitiveservices-computervision").ComputerVisionClient;
const ApiKeyCredentials = require("@azure/ms-rest-js").ApiKeyCredentials;

const computerVisionKey = process.env.COMPUTER_VISION_KEY;
const computerVisionEndpoint = process.env.COMPUTER_VISION_ENDPOINT;

const computerVisionClient = new ComputerVisionClient(
  new ApiKeyCredentials({
    inHeader: { "Ocp-Apim-Subscription-Key": computerVisionKey },
  }),
  computerVisionEndpoint
);

module.exports = { computerVisionClient };
