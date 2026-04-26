export const uploadToCloudinary = async (file) => {
    const cloudName = 'dhynzvhl2'
    const apiKey = '912257721126974'
    const apiSecret = 'JwxmdSKx8OYBlzaQdd5bg7b6ARQ'
    
    // Cloudinary timestamp
    const timestamp = Math.round((new Date).getTime() / 1000)
    
    // For signed uploads, parameters must be in alphabetical order for signature
    const strToSign = `timestamp=${timestamp}${apiSecret}`
    
    // Generate SHA-1 Hash
    const encoder = new TextEncoder()
    const data = encoder.encode(strToSign)
    const hashBuffer = await crypto.subtle.digest('SHA-1', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('api_key', apiKey)
    formData.append('timestamp', timestamp)
    formData.append('signature', signature)

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body: formData
    })
    
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('Cloudinary Error:', errData);
        throw new Error(errData.error?.message || 'Cloudinary upload failed');
    }
    
    const result = await res.json()
    return result.secure_url
}

