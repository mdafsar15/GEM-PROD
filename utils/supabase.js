const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getPendingRequest(adoptionDetailId) {
    const { data, error } = await supabase
        .from('adoptions_details')
        .select('*')
        .eq('id', adoptionDetailId)
        .eq('order_status', 'pending')
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            return null;
        }
        throw error;
    }
    return data;
}

async function updateAdoptionDetailRecord(adoptionDetailId, transactionId, tokenId, ipfsUrl) {
    const { data, error } = await supabase
        .from('adoptions_details')
        .update({
            order_status: 'fulfilled',
            blk_transaction_id: transactionId,
            blk_nft_token: tokenId,
            ipfs_hash_metadata: ipfsUrl,
            updated_at: new Date().toISOString()
        })
        .eq('id', adoptionDetailId)
        .select();

    if (error) throw error;

    return data[0];
}

module.exports = {
    getPendingRequest,
    updateAdoptionDetailRecord
};