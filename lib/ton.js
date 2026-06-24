// TON transaction verification via toncenter API
const TONCENTER_API = 'https://toncenter.com/api/v2'
const TONCENTER_KEY = process.env.TONCENTER_API_KEY || ''

// Verify a TON transaction by hash
export async function verifyTransaction(txHash, expectedTo, expectedAmountNano) {
  try {
    const res = await fetch(
      `${TONCENTER_API}/getTransactions?address=${expectedTo}&limit=20&archival=false`,
      {
        headers: TONCENTER_KEY ? { 'X-API-Key': TONCENTER_KEY } : {}
      }
    )
    const data = await res.json()

    if (!data.ok || !data.result) return null

    // Find tx by hash
    const tx = data.result.find(t => {
      const hash = Buffer.from(t.transaction_id.hash, 'base64').toString('hex')
      return hash === txHash || t.transaction_id.hash === txHash
    })

    if (!tx) return null

    const inMsg = tx.in_msg
    if (!inMsg) return null

    // Verify amount (allow small variance for fees)
    const actualAmount = parseInt(inMsg.value || '0')
    const tolerance = 0.01 * expectedAmountNano  // 1% tolerance
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
