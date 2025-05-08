const express = require('express');
const { exec } = require('child_process');

const app = express();
const PORT = 3001; // Changed to 3001

app.get('/generateFullfillment', (req, res) => {
  const cowId = req.query.COW_ID;
  if (!cowId) {
    return res.status(400).json({ error: 'COW_ID is required' });
  }

  const command = `COW_ID=${cowId} npx hardhat run scripts/processAdoption.js --network polygonMumbai`;

  exec(command, { env: { ...process.env, COW_ID: cowId } }, (error, stdout, stderr) => {
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

app.listen(PORT, () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});