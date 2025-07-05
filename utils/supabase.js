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

    // After successful adoption update, handle ambassador commission if referral code exists
    if (data[0].referral_code && data[0].price) {
        await handleAmbassadorCommission(data[0]);
    }

    return data[0];
}

async function insertGominiWallet(adoptionRecord) {
    try {
        // First check if a record already exists for this cow_id
        const { data: existingData, error: existingError } = await supabase
            .from('gomini_ewallet')
            .select('id')
            .eq('cow_id', adoptionRecord.cow_id)
            .maybeSingle();

        if (existingError) {
            console.error("Error checking existing gomini_ewallet:", existingError);
            throw existingError;
        }

        let result;

        if (existingData) {
            // Update existing record
            const { data: updatedData, error: updateError } = await supabase
                .from('gomini_ewallet')
                .update({
                    ipfshashmetadata: adoptionRecord.ipfshashmetadata,
                    ipfsimages: adoptionRecord.ipfsimages,
                    blk_transaction_id: adoptionRecord.blk_transaction_id,
                    blk_nft_token: adoptionRecord.blk_nft_token
                })
                .eq('id', existingData.id)
                .select();

            if (updateError) {
                console.error("Error updating gomini_ewallet:", updateError);
                throw updateError;
            }
            
            result = updatedData[0];
        } else {
            // Insert new record
            const { data: newData, error: insertError } = await supabase
                .from('gomini_ewallet')
                .insert([{
                    cow_id: adoptionRecord.cow_id,
                    ipfshashmetadata: adoptionRecord.ipfshashmetadata,
                    ipfsimages: adoptionRecord.ipfsimages,
                    blk_transaction_id: adoptionRecord.blk_transaction_id,
                    blk_nft_token: adoptionRecord.blk_nft_token
                }])
                .select();

            if (insertError) {
                console.error("Error inserting into gomini_ewallet:", insertError);
                throw insertError;
            }
            
            result = newData[0];
        }

        return result;
    } catch (error) {
        console.error("Error in insertGominiWallet:", error);
        throw error;
    }
}

async function handleAmbassadorCommission(adoptionRecord) {
    try {
        if (!adoptionRecord.referral_code || !adoptionRecord.price) {
            return null;
        }

        // Get ambassador id using referral code
        const { data: ambassador, error: ambassadorError } = await supabase
            .from('ambassador')
            .select('id')
            .eq('referral_code', adoptionRecord.referral_code)
            .single();

        if (ambassadorError) {
            console.error('Error finding ambassador:', ambassadorError);
            throw ambassadorError;
        }

        if (!ambassador) {
            console.log(`No ambassador found for referral code: ${adoptionRecord.referral_code}`);
            return null;
        }

        // Calculate 5% commission
        const price = Number(adoptionRecord.price);
        const commission = price * 0.05;
        
        // Check if there's a pending record to update
        const { data: existingWallet, error: existingError } = await supabase
            .from('ambassador_wallet')
            .select('id')
            .eq('ambassador_id', ambassador.id)
            .eq('status', 'pending')
            .maybeSingle();

        if (existingError) {
            console.error('Error checking existing ambassador wallet:', existingError);
            throw existingError;
        }

        let result;
        
        if (existingWallet) {
            // Update existing record
            const { data: updatedWallet, error: updateError } = await supabase
                .from('ambassador_wallet')
                .update({
                    amount: commission,
                    status: 'credited',
                    description: `5% commission for adoption ${adoptionRecord.id}`
                })
                .eq('id', existingWallet.id)
                .select();

            if (updateError) {
                console.error('Error updating ambassador wallet:', updateError);
                throw updateError;
            }
            
            result = updatedWallet[0];
        } else {
            // Create new record
            const { data: newWallet, error: insertError } = await supabase
                .from('ambassador_wallet')
                .insert([{
                    ambassador_id: ambassador.id,
                    amount: commission,
                    status: 'credited',
                    description: `Referral by ${adoptionRecord.user_id}`
                }])
                .select();

            if (insertError) {
                console.error('Error inserting ambassador wallet:', insertError);
                throw insertError;
            }
            
            result = newWallet[0];
        }

        // console.log(`Successfully processed ${commission.toFixed(2)} INR commission for referral: ${adoptionRecord.referral_code}`);
        return result;

    } catch (error) {
        console.error('Error in handleAmbassadorCommission:', error);
        throw error;
    }
}

module.exports = {
    getPendingRequests,
    updateAdoptionRecord,
    insertGominiWallet
};