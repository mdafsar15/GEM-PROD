const { create } = require('ipfs-http-client');

const ipfs = create({
    host: '165.22.213.239',
    port: 5001,
    protocol: 'http'
});

/**
 * Upload metadata to IPFS
 * @param {Object} metadata - Metadata to upload
 * @returns {Promise<string>} IPFS hash
 */
async function uploadMetadata(metadata) {
    const result = await ipfs.add(JSON.stringify(metadata));
    return result.path;
}

module.exports = {
    uploadMetadata
};