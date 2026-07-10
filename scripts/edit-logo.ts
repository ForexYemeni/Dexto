import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'

async function editLogo() {
  console.log('Loading original logo...')
  const imageBuffer = fs.readFileSync('/home/z/my-project/scripts/original-logo.png')
  const base64Image = imageBuffer.toString('base64')
  const dataUrl = `data:image/png;base64,${base64Image}`

  console.log('Initializing ZAI...')
  const zai = await ZAI.create()

  console.log('Editing logo with platform colors...')
  const response = await zai.images.generations.edit({
    prompt: 'Redesign this logo icon to match a premium crypto mining platform color scheme. Use electric blue (#3B82F6) as the primary color, purple (#A855F7) as the secondary color, and gold (#F59E0B) as accent. Dark black background (#0a0a1a). Modern, luxurious, glassmorphism style with gradient effects. Keep the same shape and concept but make colors vibrant and professional. High quality, crisp edges, app icon style.',
    images: [{ url: dataUrl }],
    size: '1024x1024'
  })

  const imageBase64 = response.data[0].base64
  const buffer = Buffer.from(imageBase64, 'base64')
  
  fs.writeFileSync('/home/z/my-project/public/logo-new.png', buffer)
  console.log('✅ New logo saved to public/logo-new.png')
  console.log('Size:', buffer.length, 'bytes')
}

editLogo().catch(console.error)
