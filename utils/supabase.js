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

    // After successful adoption update, update ambassador wallet if referral code exists
    if (data[0].referral_code) {
        await updateAmbassadorWallet(data[0].referral_code);
    }

    return data[0];
}

async function insertGominiWallet(adoptionRecord) {
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

async function updateAmbassadorWallet(referralCode) {
    try {
        // Get ambassador id using referral code
        const { data: ambassador, error: ambassadorError } = await supabase
            .from('ambassador')
            .select('id')
            .eq('referral_code', referralCode)
            .single();

        if (ambassadorError) {
            console.error('Error finding ambassador:', ambassadorError);
            throw ambassadorError;
        }

        if (!ambassador) {
            console.log(`No ambassador found for referral code: ${referralCode}`);
            return null;
        }

        // Update the existing record in ambassador_wallet
        const { data: wallet, error: walletError } = await supabase
            .from('ambassador_wallet')
            .update({
                amount: 2500,
                status: 'credited'
            })
            .eq('ambassador_id', ambassador.id)
            .eq('status', 'pending')
            .select();

        if (walletError) {
            console.error('Error updating ambassador wallet:', walletError);
            throw walletError;
        }

        // console.log(`Successfully updated ambassador wallet for referral: ${referralCode}`);
        return wallet[0];

    } catch (error) {
        console.error('Error in updateAmbassadorWallet:', error);
        throw error;
    }
}

module.exports = {
    getPendingRequests,
    updateAdoptionRecord,
    insertGominiWallet
};