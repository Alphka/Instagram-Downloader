/** @param {Buffer} buffer  */
export default function SplitPNGFrames(buffer){
	const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
	const IEND_CHUNK = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82])

	const frames = []
	const total = buffer.length

	let offset = 0

	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	while(true){
		const start = buffer.indexOf(PNG_HEADER, offset)

		if(start === -1) break

		let headerPosition = start + PNG_HEADER.length
		let foundIEND = false

		/** @type {number | null} */
		let lastGoodEnd = null

		/** @type {number | null} */
		let consumed = null

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		while(true){
			if(headerPosition + 8 > total) break

			const typeOffset = headerPosition + 4
			const length = buffer.readUInt32BE(headerPosition)
			const type = buffer.toString("ascii", typeOffset, typeOffset + 4)
			const chunkEnd = headerPosition + 4 + 4 + length + 4

			if(chunkEnd > total) break

			lastGoodEnd = chunkEnd
			headerPosition = chunkEnd

			if(type === "IEND"){
				consumed = chunkEnd
				foundIEND = true
				break
			}
		}

		if(foundIEND){
			frames.push(buffer.subarray(start, /** @type {number} */ (consumed)))

			offset = /** @type {number} */ (consumed)
		}else if(lastGoodEnd){
			frames.push(Buffer.concat([
				buffer.subarray(start, lastGoodEnd),
				IEND_CHUNK
			]))

			offset = lastGoodEnd
		}else{
			offset = start + 1
		}
	}

	return frames
}
