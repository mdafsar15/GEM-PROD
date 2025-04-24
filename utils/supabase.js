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

async function insertGominiWallet(adoptionRecord) {
    console.log("Inserting wallet with data:", {
        cow_id: adoptionRecord.cow_id,
        ipfshashmetadata: adoptionRecord.ipfshashmetadata,
        ipfsimages: adoptionRecord.ipfsimages,
        blk_transaction_id: adoptionRecord.blk_transaction_id,
        blk_nft_token: adoptionRecord.blk_nft_token
    });

    const { data, error } = await supabase
        .from('gomini_ewallet')
        .insert([{
            cow_id: adoptionRecord.cow_id,
            ipfshashmetadata: adoptionRecord.ipfshashmetadata,
            ipfsimages: adoptionRecord.ipfsimages,
            blk_transaction_id: adoptionRecord.blk_transaction_id,
            blk_nft_token: adoptionRecord.blk_nft_token
        }])
        .select();

    if (error) {
        console.error("Error inserting into gomini_ewallet:", error);
        throw error;
    }
    return data[0];
}

module.exports = {
    getPendingRequests,
    updateAdoptionRecord,
    insertGominiWallet
};