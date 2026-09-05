import { describe, expect, it, vi } from 'vitest'

import { createSetlistBingoOperationGate } from './setlistBingoOperationGate'

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, resolve, reject }
}

describe('setlistBingoOperationGate', () => {
  it('suppresses simultaneous triggers and never runs more than one generator', async () => {
    const gate = createSetlistBingoOperationGate()
    const deferred = createDeferred<'saved'>()
    let activeGenerators = 0
    let maximumActiveGenerators = 0
    const generator = vi.fn(async () => {
      activeGenerators += 1
      maximumActiveGenerators = Math.max(maximumActiveGenerators, activeGenerators)

      try {
        return await deferred.promise
      } finally {
        activeGenerators -= 1
      }
    })

    const first = gate.run(generator)
    const second = gate.run(generator)
    const third = gate.run(generator)

    expect(first).toBeInstanceOf(Promise)
    expect(second).toBeUndefined()
    expect(third).toBeUndefined()
    expect(generator).toHaveBeenCalledOnce()
    expect(gate.isInFlight()).toBe(true)
    expect(maximumActiveGenerators).toBe(1)

    deferred.resolve('saved')

    await expect(first).resolves.toBe('saved')
    expect(gate.isInFlight()).toBe(false)
    expect(activeGenerators).toBe(0)
    expect(maximumActiveGenerators).toBe(1)
  })

  it('releases the gate after rejection and allows retry', async () => {
    const gate = createSetlistBingoOperationGate()
    const failedAttempt = createDeferred<never>()
    const failingGenerator = vi.fn(() => failedAttempt.promise)

    const first = gate.run(failingGenerator)

    expect(gate.run(failingGenerator)).toBeUndefined()
    expect(failingGenerator).toHaveBeenCalledOnce()
    expect(gate.isInFlight()).toBe(true)

    failedAttempt.reject(new Error('png generation failed'))

    await expect(first).rejects.toThrow('png generation failed')
    expect(gate.isInFlight()).toBe(false)

    const retryGenerator = vi.fn(async () => 'retried' as const)
    const retry = gate.run(retryGenerator)

    await expect(retry).resolves.toBe('retried')
    expect(retryGenerator).toHaveBeenCalledOnce()
    expect(gate.isInFlight()).toBe(false)
  })

  it('releases the gate after a cancellation result and allows retry', async () => {
    const gate = createSetlistBingoOperationGate()
    const cancelledAttempt = createDeferred<{ kind: 'cancelled' }>()
    const generator = vi.fn(() => cancelledAttempt.promise)

    const first = gate.run(generator)

    expect(gate.run(generator)).toBeUndefined()
    expect(gate.isInFlight()).toBe(true)

    cancelledAttempt.resolve({ kind: 'cancelled' })

    await expect(first).resolves.toEqual({ kind: 'cancelled' })
    expect(gate.isInFlight()).toBe(false)

    const retry = gate.run(async () => ({ kind: 'shared' }) as const)

    await expect(retry).resolves.toEqual({ kind: 'shared' })
    expect(gate.isInFlight()).toBe(false)
  })
})
