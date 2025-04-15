const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getPendingRequests(cowId) {
    const { data, error } = await supabase
        .from('adoption')
        .select('*')
        .eq('cow_id', cowId)
        .eq('status', 'pending');

    if (error) throw error;
    return data;
}

async function updateAdoptionRecord(id, transactionId, tokenId, ipfsUrl) {
    const { data, error } = await supabase
        .from('adoption')
        .update({
            status: 'fulfilled',
            blk_transaction_id: transactionId,
            blk_nft_token: tokenId,
            ipfshashmetadata: ipfsUrl
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