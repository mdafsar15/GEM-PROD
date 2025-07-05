const express = require('express');
const { exec } = require('child_process');

const app = express();
const PORT = 3000; // Changed back to 3000

app.get('/generateFullfillment', (req, res) => {
  const adoptionDetailsId = req.query.COW_ID;
  if (!adoptionDetailsId) {
    return res.status(400).json({ error: 'ADOPTION ID is required' });
  }

  const command = `ID=${adoptionDetailsId} npx hardhat run scripts/processAdoption.js --network polygonMumbai`;

  exec(command, { env: { ...process.env, COW_ID: adoptionDetailsId } }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return res.status(500).json({ error: error.message, stderr });
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
    }

    try {
      // Parse the JSON output
      const outputObj = JSON.parse(stdout);

      // Convert the response to string with proper formatting
      const response = JSON.stringify(outputObj, null, 2)
        .replace(/"blk_transaction_id":\s*"(0x[a-fA-F0-9]+)"/g, '"blk_transaction_id": $1');

      res.set('Content-Type', 'application/json');
      res.send(response);
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      return res.status(500).json({ error: 'Invalid JSON output' });
    }
  });
});