import dgram from 'dgram'

export const FRIENDLY_HOST = 'cmh-cleaning.local'

/** Office LAN ranges only. A public address is never treated as the office network. */
export function isPrivateLanAddress(address: string): boolean {
  const parts = address.split('.').map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false
  const [a, b] = parts
  if (a === 10) return true
  if (a === 192 && b === 168) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  return false
}

/**
 * Addresses the office server should accept.
 * The default follows the computer's current private addresses, so a DHCP change
 * is picked up the next time the server starts. A public address is not included
 * unless someone deliberately sets HOST to that address.
 */
export function officeListenAddresses(configuredHost: string, detectedAddresses: string[]): string[] {
  const host = configuredHost.trim() || '0.0.0.0'
  if (host === '127.0.0.1' || host === 'localhost') return ['127.0.0.1']
  if (host === '0.0.0.0' || host === '::') {
    const unique = new Set<string>()
    for (const address of detectedAddresses) {
      if (isPrivateLanAddress(address)) unique.add(address)
    }
    return ['127.0.0.1', ...unique]
  }
  return [host]
}

function encodeDnsName(name: string): Buffer {
  const parts = name.split('.').filter((part) => part.length > 0)
  const chunks = parts.map((part) => Buffer.concat([Buffer.from([part.length]), Buffer.from(part)]))
  return Buffer.concat([...chunks, Buffer.from([0])])
}

function decodeDnsName(message: Buffer, start: number): { name: string; offset: number } | null {
  const labels: string[] = []
  let offset = start
  let end = start
  let jumped = false
  for (let guard = 0; guard < 20; guard += 1) {
    if (offset >= message.length) return null
    const length = message[offset]
    if (length === 0) {
      offset += 1
      if (!jumped) end = offset
      return { name: labels.join('.'), offset: end }
    }
    if ((length & 0xc0) === 0xc0) {
      if (offset + 1 >= message.length) return null
      const pointer = ((length & 0x3f) << 8) | message[offset + 1]
      if (!jumped) end = offset + 2
      jumped = true
      offset = pointer
      continue
    }
    if (offset + 1 + length > message.length) return null
    labels.push(message.subarray(offset + 1, offset + 1 + length).toString('utf8'))
    offset += 1 + length
    if (!jumped) end = offset
  }
  return null
}

/** Build an mDNS A-record answer for cmh-cleaning.local, or null when the query is for something else. */
export function buildMdnsResponse(query: Buffer, addresses: string[]): Buffer | null {
  if (query.length < 12) return null
  const questions = query.readUInt16BE(4)
  if (questions < 1) return null
  let offset = 12
  let matched = false
  for (let index = 0; index < questions; index += 1) {
    const decoded = decodeDnsName(query, offset)
    if (!decoded) return null
    offset = decoded.offset
    if (offset + 4 > query.length) return null
    const type = query.readUInt16BE(offset)
    const klass = query.readUInt16BE(offset + 2) & 0x7fff
    offset += 4
    if (decoded.name.toLowerCase() === FRIENDLY_HOST && klass === 1 && (type === 1 || type === 255)) matched = true
  }
  const ips = addresses.filter(isPrivateLanAddress)
  if (!matched || ips.length === 0) return null

  const name = encodeDnsName(FRIENDLY_HOST)
  const answers = ips.map((ip) => {
    const rdata = Buffer.from(ip.split('.').map((part) => Number(part)))
    const suffix = Buffer.alloc(10)
    suffix.writeUInt16BE(1, 0)
    suffix.writeUInt16BE(0x8001, 2)
    suffix.writeUInt32BE(120, 4)
    suffix.writeUInt16BE(rdata.length, 8)
    return Buffer.concat([name, suffix, rdata])
  })
  const header = Buffer.alloc(12)
  header.writeUInt16BE(query.readUInt16BE(0), 0)
  header.writeUInt16BE(0x8400, 2)
  header.writeUInt16BE(ips.length, 6)
  return Buffer.concat([header, ...answers])
}

export function friendlyNameQuery(): Buffer {
  const name = encodeDnsName(FRIENDLY_HOST)
  const query = Buffer.alloc(12 + name.length + 4)
  query.writeUInt16BE(1, 4)
  name.copy(query, 12)
  query.writeUInt16BE(1, 12 + name.length)
  query.writeUInt16BE(1, 14 + name.length)
  return query
}

/**
 * Answer mDNS lookups for cmh-cleaning.local with the office computer's current private address.
 * If the network blocks this, the hosts-file steps in the README still work.
 */
export function advertiseFriendlyName(addresses: string[]): { close: () => void } {
  const ips = addresses.filter(isPrivateLanAddress)
  if (ips.length === 0) return { close() {} }

  const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })
  let closed = false
  let announced = false

  const announce = () => {
    if (closed) return
    const packet = buildMdnsResponse(friendlyNameQuery(), ips)
    if (!packet) return
    socket.send(packet, 5353, '224.0.0.251')
  }

  socket.on('error', (error: NodeJS.ErrnoException) => {
    if (announced) return
    announced = true
    const reason = error.code === 'EADDRINUSE' ? 'another program is already using the local name service' : error.message
    console.log(`The name ${FRIENDLY_HOST} could not be announced automatically (${reason}).`)
    console.log('Use the hosts-file steps in the README. The server itself is still running.')
  })

  socket.on('message', (message: Buffer, rinfo: dgram.RemoteInfo) => {
    if (closed) return
    const packet = buildMdnsResponse(message, ips)
    if (!packet) return
    socket.send(packet, 5353, '224.0.0.251')
    if (rinfo.address && rinfo.address !== '224.0.0.251' && rinfo.port) {
      socket.send(packet, rinfo.port, rinfo.address)
    }
  })

  socket.bind(5353, () => {
    if (closed) return
    try {
      socket.setMulticastTTL(255)
      socket.setMulticastLoopback(true)
      socket.addMembership('224.0.0.251')
    } catch {
      // The HTTP server still works. The hosts file is the fallback.
    }
    announce()
  })

  const timer = setInterval(announce, 60_000)
  timer.unref()

  return {
    close() {
      if (closed) return
      closed = true
      clearInterval(timer)
      socket.close()
    },
  }
}
