import csvtojson from 'csvtojson'
import { createReadStream } from 'node:fs'
import { createServer } from 'node:http'
import { Readable, Transform } from 'node:stream'
import { WritableStream } from 'node:stream/web'

import { setTimeout } from 'node:timers/promises'

const PORT = 3000

createServer(async (request, response) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': '*',
  }

  // curl -i -X OPTIONS -N localhost:3000
  if (request.method === 'OPTIONS') {
    response.writeHead(204, headers)
    response.end()
    return
  }

  request.once('close', _ => console.log('Request closed', items))

  let items = 0;
  
  // Transform stream of node in web stream
  Readable.toWeb(createReadStream('./animeflv.csv'))
    // pipeThrough é a etapa de transformação de cada item que vai trafegar
    .pipeThrough(Transform.toWeb(csvtojson()))
    .pipeThrough(new TransformStream({
      transform(chunk, controller) {
        // Buffer transforma o chunk (binario) em um objeto do tipo Buffer
        const data = JSON.parse(Buffer.from(chunk))
        
        const mappedData = {
          title: data.title,
          description: data.description,
          url_anime: data.url_anime
        }

        // Quebra de linha pois é um NDJSON
        controller.enqueue(JSON.stringify(mappedData).concat('\n'))
      }
    }))
    // pipeTo é a ultima etapa   
    .pipeTo(new WritableStream({
      async write(chunk) {
        await setTimeout(200)
        items ++
        response.write(chunk)
      },

      close() {
        response.end()
      }
    }))

  // curl -N localhost:3000
  response.writeHead(200, headers)
})
.listen(PORT)
.on('listening', _ => console.log(`Server listening on port ${PORT}`))