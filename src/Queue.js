/** @template {Promise<any>} T */
export default class Queue {
	/** @param {number} limit */
	constructor(limit){
		this.limit = limit
		this.running = false

		/** @type {Set<() => T>} */ this._queue = new Set
		/** @type {Set<T>} */ this._queuePromises = new Set
		/** @type {Map<() => T, (value: any) => void>} */ this._queueCallbacks = new Map
	}
	/** @param {() => T} item */
	add(item){
		const { size } = this._queuePromises

		if(size < this.limit){
			return this.HandleItem(item)
		}

		this._queue.add(item)

		return this.AwaitItem(item)
	}

	/** @param {() => T} item */
	async HandleItem(item){
		const promise = item()

		this._queuePromises.add(promise)

		try{
			const value = await promise
			if(this._queueCallbacks.has(item)) this._queueCallbacks.get(item)(value)
		}catch(error){
			if(this._queueCallbacks.has(item)) this._queueCallbacks.get(item)(error)
		}

		this._queuePromises.delete(promise)
		this.RunQueue()

		return promise
	}
	/**
	 * @param {() => T} item
	 * @returns {Promise<T>}
	 */
	async AwaitItem(item){
		/** @type {(value: any) => void} */
		let resolve
		/** @type {(reason?: any) => void} */
		let reject

		const promise = new Promise((res, rej) => {
			resolve = res
			reject = rej
		})

		this._queueCallbacks.set(item, value => (value instanceof Error ? reject : resolve)(value))

		const value = await promise

		return value
	}
	RunQueue(){
		if(this.running) return

		this.running = true

		const queue = Array.from(this._queue).splice(0, this.limit - this._queuePromises.size)

		for(const item of queue){
			this._queue.delete(item)
			this.HandleItem(item)
		}

		this.running = false
	}
}
