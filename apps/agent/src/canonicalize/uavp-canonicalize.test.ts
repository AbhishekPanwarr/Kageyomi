import test from 'node:test'
import assert from 'node:assert/strict'

import { canonicalizeSosoResponse } from './uavp-canonicalize.js'
import { sha256Hex } from '../uavp/receipt-manager.js'

test('canonicalizeSosoResponse strips wrapper fields and normalizes floats', () => {
  const input = {
    code: 0,
    message: 'success',
    data: {
      zeta: 1.23456789,
      alpha: '2.34567891',
      nested: {
        request_id: 'throwaway',
        beta: 8.76543219,
      },
    },
  }

  const actual = canonicalizeSosoResponse(input, 'json')
  assert.equal(actual, '{"alpha":2.345679,"nested":{"beta":8.765432},"zeta":1.234568}')
})

test('canonicalizeSosoResponse strips html and urls from text', () => {
  const input = {
    data: {
      list: [
        {
          title: 'Hello',
          content: '<p>Hello <strong>World</strong></p> https://example.com?a=1 &amp; more',
        },
      ],
    },
  }

  const actual = canonicalizeSosoResponse(input, 'text')
  assert.equal(actual, 'hello hello world & more')
})

test('canonicalization remains deterministic for hashing', () => {
  const left = canonicalizeSosoResponse(
    {
      data: {
        b: 2.11111119,
        a: 1.22222229,
      },
    },
    'json',
  )
  const right = canonicalizeSosoResponse(
    {
      data: {
        a: 1.222222291,
        b: 2.111111191,
      },
    },
    'json',
  )

  assert.equal(left, right)
  assert.equal(sha256Hex(left), sha256Hex(right))
})
