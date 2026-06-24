// TON transaction verification via toncenter API
const TONCENTER_API = 'https://toncenter.com/api/v2'
const TONCENTER_KEY = process.env.TONCENTER_API_KEY || ''

// Verify a TON transaction by hash.
// txHash    – the boc/hash string stored in donations.tx_hash
// expectedTo – the creator's wallet address for this specific mission
// expectedAmountNano – creator_amount_ton converted to nanoTON (90 % of total)
// donationCreatedAt – ISO timestamp of donations.created_at for time-window fallback
export async function verifyTransaction(txHash, expectedTo, expectedAmountNano, donationCreatedAt) {
  try {
    const res = await fetch(
      `${TONCENTER_API}/getTransactions?address=${expectedTo}&limit=20&archival=false`,
      {
        headers: TONCENTER_KEY ? { 'X-API-Key': TONCENTER_KEY } : {}
      }
    )
    const data = await res.json()

    if (!data.ok || !data.result) return null

    // 1️⃣ Primary match: by stored hash (raw base64 or hex-decoded)
    let tx = data.result.find(t => {
      const hashHex = Buffer.from(t.transaction_id.hash, 'base64').toString('hex')
      return hashHex === txHash || t.transaction_id.hash === txHash
    })

    // 2️⃣ Fallback match: find a tx within ±5 min of donation creation that
    //    carries the expected amount — handles cases where the stored tx_hash is
    //    a BOC cell hash that differs from the toncenter transaction_id.hash.
    if (!tx && donationCreatedAt) {
      const createdMs = new Date(donationCreatedAt).getTime()
      const WINDOW_MS = 5 * 60 * 1000 // ±5 minutes
      const tolerance = 0.02 * expectedAmountNano // 2% tolerance for fallback

      tx = data.result.find(t => {
        const inMsg = t.in_msg
        if (!inMsg) return false
        const actualAmount = parseInt(inMsg.value || '0')
        if (Math.abs(actualAmount - expectedAmountNano) > tolerance) return false
        // toncenter utime is Unix seconds
        const txMs = (t.utime || 0) * 1000
        return Math.abs(txMs - createdMs) <= WINDOW_MS
      })
    }

    if (!tx) return null

    const inMsg = tx.in_msg
    if (!inMsg) return null

    // Verify amount (allow 2 % variance for network fees)
    const actualAmount = parseInt(inMsg.value || '0')
    const tolerance = 0.02 * expectedAmountNano
    const amountMatch = Math.abs(actualAmount - expectedAmountNano) <= tolerance

    return {
      valid: amountMatch,
      actualAmount,
      from: inMsg.source,
      to: inMsg.destination,
      hash: txHash
    }
  } catch (err) {
    console.error('TON verify error:', err)
    return null
  }
}

// Convert TON to nanoTON
export function tonToNano(ton) {
  return Math.floor(parseFloat(ton) * 1_000_000_000)
}

// Convert nanoTON to TON
export function nanoToTon(nano) {
  return (parseInt(nano) / 1_000_000_000).toFixed(9)
}
