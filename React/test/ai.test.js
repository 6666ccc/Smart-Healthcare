import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeChatEvent, resumeChat } from '../src/api/modules/ai.js'

test('normalizeChatEvent preserves the complete interrupt payload', () => {
  const interrupt = {
    type: 'interrupt',
    conversationId: 'conversation-1',
    interrupts: [{
      id: 'interrupt-1',
      title: 'Confirm registration',
      summary: 'Book a cardiology appointment',
      args: { departmentId: 12 },
      allowedDecisions: ['approve', 'reject', 'edit'],
    }],
  }

  assert.deepEqual(normalizeChatEvent(interrupt), interrupt)
})

test('resumeChat posts the conversation decision to the HITL resume endpoint', async () => {
  const calls = []
  const request = {
    post: async (url, body) => {
      calls.push({ url, body })
      return { reply: 'Registration confirmed', status: 'completed', conversationId: 'conversation-1', interrupts: [] }
    },
  }
  const decision = { action: 'approve', interruptId: 'interrupt-1' }

  const result = await resumeChat({ conversationId: 'conversation-1', decision }, request)

  assert.deepEqual(calls, [{
    url: '/api/ai/chat/resume',
    body: { conversationId: 'conversation-1', decision },
  }])
  assert.equal(result.status, 'completed')
})
