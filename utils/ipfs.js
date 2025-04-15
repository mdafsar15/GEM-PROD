const { create } = require('ipfs-http-client');

// Configure your IPFS connection
const ipfs = create({
  host: '165.22.213.239',
  port: 5001,
  protocol: 'http'
});

/**
 * Uploads metadata to IPFS and returns both hash and URL
 * @param {Object} metadata - The adoption metadata
 * @returns {Promise<{hash: string, url: string}>}
 */
async function uploadMetadata(metadata) {
  try {
    // Add metadata to IPFS
    const result = await ipfs.add(JSON.stringify(metadata));
    
    // Create both IPFS native and HTTP gateway URLs
    const ipfsNativeUrl = `ipfs://${result.path}`;
    const ipfsGatewayUrl = `http://165.22.213.239:8080/ipfs/${result.path}`;
    
    return {
      hash: result.path,
      ipfsUrl: ipfsNativeUrl,  // For blockchain storage
      httpUrl: ipfsGatewayUrl  // For Supabase storage
    };
  } catch (error) {
    console.error('IPFS upload error:', error);
    throw error;
  }
}

module.exports = {
  uploadMetadata
};