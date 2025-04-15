const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Get pending adoption requests for a specific cow
 * @param {string} cowId - UUID of the cow
 * @returns {Promise<Array>} Array of pending requests
 */
async function getPendingRequests(cowId) {
    const { data, error } = await supabase
        .from('adoption')
        .select('*')
        .eq('cow_id', cowId)
        .eq('status', 'pending');

    if (error) throw error;
    return data;
}

/**
 * Update adoption record with blockchain data
 * @param {string} id - UUID of the adoption record
 * @param {number} transactionId - Blockchain transaction ID
 * @param {number} tokenId - NFT token ID
 * @returns {Promise<Object>} Updated record
 */
async function updateAdoptionRecord(id, transactionId, tokenId) {
    const { data, error } = await supabase
        .from('adoption')
        .update({
            status: 'fulfilled',
            blk_transaction_id: transactionId,
            blk_nft_token: tokenId
        })
        .eq('id', id)
        .select();

    if (error) throw error;
    return data[0];
}

module.exports = {
    getPendingRequests,
    updateAdoptionRecord
};